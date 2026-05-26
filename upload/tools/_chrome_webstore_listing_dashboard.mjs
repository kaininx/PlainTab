#!/usr/bin/env node

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const fs = require("node:fs");
const { chromium } = require("playwright");

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--payload") {
      args.payload = argv[i + 1];
      i += 1;
    }
  }
  if (!args.payload) {
    throw new Error("Missing --payload");
  }
  return args;
}

function sortLocales(locales) {
  return Object.keys(locales).sort((a, b) => {
    if (a === "en") return -1;
    if (b === "en") return 1;
    return a.localeCompare(b);
  });
}

async function waitForDashboard(page) {
  if (/accounts\.google\.com/.test(page.url())) {
    console.log("Google login is required. Finish login in the opened browser window.");
  }

  await page.waitForURL(/webstore\/devconsole/, { timeout: 10 * 60 * 1000 });
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1500);
}

async function selectLocaleAndFill(page, locale, description) {
  return page.evaluate(
    async ({ locale: targetLocale, description: targetDescription }) => {
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const normalized = (text) => String(text || "").replace(/\s+/g, " ").trim();
      const lower = (text) => normalized(text).toLowerCase();
      const xpathFirst = (expression) => {
        const result = document.evaluate(expression, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        return result.singleNodeValue;
      };
      const click = (element) => {
        element.scrollIntoView({ block: "center", inline: "center" });
        element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        element.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
        element.click();
      };
      const setTextAreaValue = (textArea, value) => {
        textArea.scrollIntoView({ block: "center", inline: "nearest" });
        textArea.focus();
        textArea.value = value;
        textArea.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
        textArea.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
      };
      const languageHeading =
        xpathFirst("//h3[contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'current editing language')]") ||
        xpathFirst("//h3[contains(normalize-space(.), '当前') and contains(normalize-space(.), '语言')]") ||
        xpathFirst("//h3[contains(normalize-space(.), '目前') and contains(normalize-space(.), '語言')]");
      const languageDropdown =
        (languageHeading && xpathFirst("//h3[contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'current editing language')]/../../div[2]//div[@jsshadow]/div/div")) ||
        document.querySelector("[aria-label='Current editing language']") ||
        document.querySelector("[aria-label='Language']") ||
        document.querySelector("[role='combobox'][aria-haspopup='listbox']");

      if (!languageDropdown) {
        return { ok: false, step: "select-locale", reason: "language dropdown not found" };
      }

      click(languageDropdown);
      await sleep(800);

      const options = Array.from(document.querySelectorAll("ul[aria-label='Language'] li, [role='listbox'] [role='option'], li[role='option']"));
      const option = options.find((item) => {
        const dataValue = item.getAttribute("data-value") || item.getAttribute("value") || "";
        const ariaLabel = item.getAttribute("aria-label") || "";
        const text = item.textContent || "";
        return [dataValue, ariaLabel, text].some((value) => lower(value) === lower(targetLocale));
      });

      if (!option) {
        return {
          ok: false,
          step: "select-locale",
          reason: `locale option not found: ${targetLocale}`,
          available: options.map((item) => ({
            dataValue: item.getAttribute("data-value") || "",
            ariaLabel: item.getAttribute("aria-label") || "",
            text: normalized(item.textContent),
          })),
        };
      }

      click(option);
      await sleep(1200);

      const textAreas = Array.from(document.querySelectorAll("textarea"));
      const detailTextArea =
        document.querySelector("textarea[maxlength='16000']") ||
        textAreas.find((area) => {
          const label = area.getAttribute("aria-label") || area.getAttribute("placeholder") || "";
          return /detailed description|product details|产品详情|詳細說明|商品詳情/i.test(label);
        }) ||
        textAreas.sort((a, b) => Number(b.getAttribute("maxlength") || 0) - Number(a.getAttribute("maxlength") || 0))[0];

      if (!detailTextArea) {
        return { ok: false, step: "fill-description", reason: "description textarea not found" };
      }

      setTextAreaValue(detailTextArea, targetDescription);
      await sleep(500);

      return {
        ok: detailTextArea.value === targetDescription,
        step: "fill-description",
        reason: detailTextArea.value === targetDescription ? "filled" : "textarea value did not match after fill",
        textareaMaxLength: detailTextArea.getAttribute("maxlength") || "",
      };
    },
    { locale, description },
  );
}

async function saveDraftAndWait(page, locale, timeoutMs) {
  const result = await page.evaluate(
    async ({ timeoutMs: maxWait }) => {
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const normalized = (text) => String(text || "").replace(/\s+/g, " ").trim();
      const isDisabled = (element) =>
        element.disabled ||
        element.getAttribute("aria-disabled") === "true" ||
        element.classList.contains("is-disabled") ||
        element.classList.contains("mat-button-disabled");
      const labels = ["save draft", "保存草稿", "儲存草稿"];
      const successPatterns = [
        /draft saved/i,
        /changes saved/i,
        /saved successfully/i,
        /保存成功/,
        /已保存/,
        /已儲存/,
        /儲存成功/,
      ];
      const findSaveButton = () =>
        Array.from(document.querySelectorAll("button, [role='button']")).find((button) => {
          const text = `${button.getAttribute("aria-label") || ""} ${button.textContent || ""}`;
          const value = normalized(text).toLowerCase();
          return labels.some((label) => value.includes(label));
        });

      const button = findSaveButton();
      if (!button) {
        return { ok: false, reason: "save draft button not found" };
      }

      button.scrollIntoView({ block: "center", inline: "center" });
      button.click();

      const startedAt = Date.now();
      let sawSaving = false;
      while (Date.now() - startedAt < maxWait) {
        const bodyText = document.body ? document.body.innerText || "" : "";
        if (successPatterns.some((pattern) => pattern.test(bodyText))) {
          return { ok: true, reason: "success message found" };
        }

        const currentButton = findSaveButton();
        const buttonText = normalized(currentButton ? currentButton.textContent : "");
        if (/saving|保存中|儲存中/i.test(bodyText) || /saving|保存中|儲存中/i.test(buttonText)) {
          sawSaving = true;
        }

        if (sawSaving && currentButton && !/saving|保存中|儲存中/i.test(buttonText) && !isDisabled(currentButton)) {
          return { ok: true, reason: "save button returned from saving state" };
        }

        if (currentButton && isDisabled(currentButton)) {
          return { ok: true, reason: "save button disabled after click" };
        }

        await sleep(500);
      }

      return { ok: false, reason: `save did not confirm within ${maxWait}ms` };
    },
    { timeoutMs },
  );

  if (!result.ok) {
    throw new Error(`Save draft failed for ${locale}: ${result.reason}`);
  }
  console.log(`[${locale}] saved: ${result.reason}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const payload = JSON.parse(fs.readFileSync(args.payload, "utf8"));
  const locales = sortLocales(payload.locales);

  const browser = await chromium.connectOverCDP(payload.cdpEndpoint);
  const context = browser.contexts()[0] || (await browser.newContext({ viewport: null }));

  const page = context.pages()[0] || (await context.newPage());
  try {
    console.log(`Opening ${payload.url}`);
    await page.goto(payload.url, { waitUntil: "domcontentloaded", timeout: 120000 });
    await waitForDashboard(page);

    for (const locale of locales) {
      console.log(`[${locale}] selecting language and filling description`);
      const fillResult = await selectLocaleAndFill(page, locale, payload.locales[locale]);
      if (!fillResult.ok) {
        console.log(`[${locale}] fill debug: ${JSON.stringify(fillResult, null, 2)}`);
        throw new Error(`Could not fill ${locale}: ${fillResult.reason}`);
      }
      console.log(`[${locale}] filled: ${fillResult.reason}`);
      await saveDraftAndWait(page, locale, payload.saveTimeoutMs || 30000);
      await page.waitForTimeout(1200);
    }

    console.log("All listing descriptions were filled and saved as draft.");
    console.log("The browser will stay open for manual inspection. Close it when finished.");
    await page.waitForTimeout(24 * 60 * 60 * 1000);
  } finally {
    // Keep the regular Chrome window available for manual review.
  }
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
