---
name: bump-version
description: Use when preparing a PlainTab release or bumping the PlainTab version, triggered by phrases like "更新版本", "bump version", "upgrade to vX.Y.Z", "发布新版本". Updates manifest.json, runtime UI/version constants, localized changelogs, store listings, release notes, validation notes, and current project docs.
---

# Bump PlainTab Version

## Purpose

Prepare a PlainTab release using the current project structure. Keep the release surface split by audience:

- `docs/changelog-i18n/*.txt`: one-line localized changelog summaries.
- `docs/RELEASE_NOTES.md`: historical detailed release notes, maintained only in Chinese and English.
- `docs/GITHUB_RELEASE.md`: the body text for the current GitHub Release page only.
- `docs/store-listing/*.txt`: Chrome Web Store descriptions, one file per language.

Do not recreate removed files such as `docs/CHANGELOG.md`, `docs/release-note.md`, or `docs/requirements.md`. Do not add a version badge to the root `README.md`; it intentionally does not use one. Localized `docs/README_*.md` files that already have version badges should keep that style and have the existing badge version updated.

## Inputs

Ask for missing essentials only:

- Target version, for example `3.3.0`.
- Release summary in Chinese or English.
- Important changes, grouped as user-facing bullets. Conventional commit lines may be used as source material, but do not expose commit tags in user-facing docs unless the user explicitly asks.

If the user does not provide release notes, derive candidate changes from `git log` and local diffs, then write user-facing summaries.

## Style Rules

- Preserve the current document style. Before writing release copy, inspect the newest entry in each touched file and match its punctuation, bullet shape, heading level, language register, and sentence length.
- Keep product copy user-facing. Translate implementation work into outcomes; do not paste raw commit subjects, module names, storage keys, or test names unless the user asks for maintainer-facing wording.
- Keep Chinese release copy in the existing concise PlainTab tone. Do not add marketing hype, emoji, slogans, or unrelated feature explanation.
- Keep English release copy in the existing calm, compact product tone. Do not switch to a different launch-note style mid-file.
- Keep commit style aligned with the current history: Chinese Conventional Commit subject by default, for example `docs: 更新版本发布资料` or `chore: 准备 X.Y.Z 发布`. Do not switch to English, long titles, or a different body format unless the user asks.

## Step 1: Read Current State

Before editing:

- Read `manifest.json` and record the old version.
- Check `git status --short` and preserve unrelated user changes.
- Inspect existing entries in `docs/changelog-i18n/en.txt`, `docs/changelog-i18n/zh-CN.txt`, `docs/RELEASE_NOTES.md`, and `docs/GITHUB_RELEASE.md` for local tone and format.
- Inspect the latest 5 to 10 commits with `git log --oneline` before suggesting or creating a release commit, so the commit message keeps the current repository style.
- Search for the old version before replacing it. Classify every hit as current runtime/config/test/docs or historical release/task archive before editing.

## Step 2: Runtime Version Surfaces

Update every current runtime or data version surface:

```json
"version": "X.Y.Z"
```

Also update:

- `index.html`: first-level settings panel version text, currently `.l1-version`.
- `js/settings-panel.js`: About tab version text, currently `.about-version`.
- `js/wallpaper/data.js`: `BASELINE_APP_VERSION` when the release represents the current app/storage baseline.
- Current validation harnesses or task notes that assert the active baseline, for example `docs/ai-tasks/*test.js`.
- Current rule snapshots such as `.claude/rules/README.md`, `.claude/rules/10-storage.md`, and `.claude/rules/90-storage-history.md` when their baseline statements would otherwise become stale.

Do not update old version numbers in historical release entries, old changelog entries, or dated task-plan prose unless they are active validation files or current factual guidance.

Use semantic versioning language when helpful:

- Major version: breaking architecture or compatibility change.
- Minor version: substantial feature, UX, documentation, or capability update without breaking the core framework.
- Patch version: small fix or maintenance release.

## Step 3: Short Localized Changelogs

Update every file in `docs/changelog-i18n/*.txt`.

Format:

```text
• vX.Y.Z · One sentence covering the release.
```

Rules:

- Add the new entry directly below the title line.
- Keep it to one sentence or one compact line.
- Do not use sub-bullets or conventional commit tags.
- Maintain all 16 files unless the user explicitly narrows the release scope.

Language files:

`en`, `zh-CN`, `zh-TW`, `hi`, `es`, `ar`, `fr`, `pt_BR`, `ru`, `de`, `ja`, `it`, `tr`, `vi`, `ko`, `pl`.

## Step 4: Detailed Release Notes

Update `docs/RELEASE_NOTES.md`.

This file is the detailed historical release record and is maintained only in Chinese and English. Add the new version section at the top, below the introductory note.

Format:

```markdown
## vX.Y.Z

### 中文

**摘要**：中文摘要。

**更新内容**

- 中文详细条目。

### English

**Summary**: English summary.

**Details**

- English detailed item.
```

Rules:

- Write for users and maintainers, not as raw commit logs.
- Do not include conventional commit tags such as `fix`, `docs`, or `refactor`.
- Keep Chinese and English sections equivalent in meaning, not necessarily word-for-word identical.

## Step 5: GitHub Release Body

Replace `docs/GITHUB_RELEASE.md` with only the current version's GitHub Release page body. Historical details belong in `docs/RELEASE_NOTES.md`.

Recommended structure:

```markdown
# PlainTab GitHub Release Body

---

**PlainTab vX.Y.Z**

- Install from the [Chrome Web Store](https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo) for automatic updates.
- Or download the `.crx` file below and drag it into `chrome://extensions`.

**Highlights**

- User-facing English bullet.

**Summary**

One polished English paragraph explaining what changed and why it matters.

---

**PlainTab vX.Y.Z**

- 前往 [Chrome 网上应用店](https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo) 安装，可自动更新。
- 或下载下方 `.crx` 文件，拖入 `chrome://extensions` 页面即可。

**更新重点**

- 面向用户的中文条目。

**总结**

一段中文总结，说明这次更新改了什么、为什么重要。
```

Rules:

- This file is meant to be pasted into a GitHub Release page.
- Keep only the current release.
- Use user-facing bullets, not conventional commit tags.
- Keep the installation boilerplate stable unless the install process changes.

## Step 6: Store Listing Files

Update every file in `docs/store-listing/*.txt` when preparing a public release.

Rules:

- Add the `vX.Y.Z` entry at the top of the changelog/update block.
- Use compact one-line localized summaries, matching `docs/changelog-i18n/*.txt`.
- Preserve each file's existing language and formatting.

## Step 7: README And Project Docs

Update these only when the release changes their content:

- `README.md`: English project README.
- `docs/README_zh-CN.md`: Simplified Chinese README.
- `docs/README_*.md`: localized README files.
- `docs/technical/README_en.md` and `docs/technical/README_zh-CN.md`: technical docs.
- `AGENTS.md` and `.claude/rules/`: project guidance, only when durable agent instructions change.
- `.agents/skills/bump-version/SKILL.md`: this skill, only when release workflow or project structure changes.
- `.agents/README.md`: shared skill index, when skill ownership or release coverage changes.

README link rules:

- The root `README.md` currently has no version badge; do not add one during a bump.
- Localized `docs/README_*.md` files currently include version badges; update existing badge URLs and alt text when bumping the public version, but do not redesign the badge block.
- Keep the short changelog link in every README pointing to the matching `docs/changelog-i18n/*.txt` file.
- Keep a detailed release notes link in every README pointing to `docs/RELEASE_NOTES.md`.
- The detailed release notes file is bilingual only, but every localized README should still link to it so readers can discover the full history.
- Use a localized label for the link when practical; the target stays `RELEASE_NOTES.md` from files inside `docs/`, and `docs/RELEASE_NOTES.md` from root README files.

Do not update removed files. In the current structure, `docs/requirements.md` is not part of the release workflow.

## Step 8: Verify

Run checks before declaring the release prep done:

```powershell
Select-String -Path manifest.json,README.md,docs\*.md,docs\technical\*.md,docs\changelog-i18n\*.txt,docs\store-listing\*.txt -Pattern "OLD_VERSION" -SimpleMatch
git grep -n "OLD_VERSION" -- index.html js .claude .agents docs/ai-tasks
```

Expected result: no stale old-version references except intentionally historical text. Explain any remaining old-version hits and why they are historical.

Also verify:

- `manifest.json`, `index.html`, `js/settings-panel.js`, and `js/wallpaper/data.js` use the target version where they expose the current app version.
- Root `README.md` still has no version badge, and existing localized README version badges use the target version without changing their surrounding badge style.
- `docs/CHANGELOG.md` does not exist.
- `docs/release-note.md` does not exist.
- `docs/RELEASE_NOTES.md` exists.
- `docs/GITHUB_RELEASE.md` exists.
- At least `en` and `zh-CN` changelog/store-listing entries are correct; spot-check a few other languages when all 16 are updated.
- JavaScript touched by the version bump parses, for example `node --check js\settings-panel.js` and `node --check js\wallpaper\data.js`.

## Current File Map

| Purpose | Files |
|---------|-------|
| Extension version | `manifest.json` |
| Runtime version display | `index.html`, `js/settings-panel.js` |
| Storage/app baseline | `js/wallpaper/data.js`, `.claude/rules/10-storage.md`, `.claude/rules/README.md`, `.claude/rules/90-storage-history.md`, active `docs/ai-tasks/*test.js` assertions |
| Root README | `README.md` without a version badge |
| Localized READMEs | `docs/README_*.md`, including existing version badges |
| Short changelogs | `docs/changelog-i18n/*.txt` |
| Detailed release history | `docs/RELEASE_NOTES.md` |
| GitHub Release body | `docs/GITHUB_RELEASE.md` |
| Chrome Web Store copy | `docs/store-listing/*.txt` |
| Technical docs | `docs/technical/README_en.md`, `docs/technical/README_zh-CN.md` |
