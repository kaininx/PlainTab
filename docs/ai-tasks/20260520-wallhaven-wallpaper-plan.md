# Wallhaven Wallpaper Source Implementation Plan

> For agentic workers: implement task by task and verify after each major section. Project rules place AI task docs under `docs/ai-tasks/`; do not create a root `ai/` directory. Do not introduce build tools, npm, frameworks, lint frameworks, or runtime dependencies.

**Goal:** Add a native Wallhaven wallpaper source that tests a configuration, caches up to 12 SFW images, rotates them in order, and fits the existing PlainTab settings model.

**Architecture:** Extend the existing wallpaper provider model with `providers.wallhaven`, add Wallhaven-specific fetch/cache helpers to `js/wallpaper/fetch.js`, wire runtime loading in `js/newtab.js`, and reuse the current settings drawer/gallery patterns in `js/settings-panel.js`. Store blobs in IndexedDB before writing local references and preserve old visible wallpaper on failures.

**Tech Stack:** Vanilla JavaScript, native CSS, localStorage, IndexedDB, existing `WallpaperData`, `WallpaperFetch`, `WallpaperShow`, and settings panel helpers.

---

## Files

- Modify `js/wallpaper/data.js`: Wallhaven defaults, normalization, ID/blob helpers, queue helpers, cache clearing, reset defaults, public exports.
- Modify `js/wallpaper/fetch.js`: Wallhaven URL builder, JSON test, result normalization, cache-download helper.
- Modify `js/newtab.js`: Wallhaven cached loading, due refresh, fallback behavior, gallery mode support.
- Modify `js/settings-panel.js`: Wallhaven drawer UI, validation/test/apply flow, queue delete/reorder.
- Modify `css/settings.css`: Wallhaven compact controls, color strip, queue styling reuse.
- Modify `js/i18n/*.js`: new user-facing strings for Wallhaven.
- Modify `.claude/rules/10-storage.md`, `.claude/rules/20-wallpaper.md`, `.claude/rules/60-settings.md`: document the new source and behavior.
- Add `docs/ai-tasks/20260520-wallhaven-wallpaper-design.md` and this plan.

## Task 1: Storage Model

- [ ] Add `DB.WALLHAVEN_PREFIX = "ptab_wallpaper_blob_wallhaven_"`.
- [ ] Add `providers.wallhaven.config/state` defaults with SFW-only config.
- [ ] Add `normalizeWallhavenConfig` and `normalizeWallhavenState`.
- [ ] Update `loadWallpaper()` and `saveWallpaper()` to normalize Wallhaven.
- [ ] Update `imgKey(id)` so `wallhaven_<id>` maps to the Wallhaven blob prefix.
- [ ] Add `isWallhavenId`, `activeWallhavenOrder`, `saveWallhavenOrder`, `loadWallhavenConfig`, `saveWallhavenConfig`, `loadWallhavenState`, and `saveWallhavenState`.
- [ ] Update `isUploadId` so Wallhaven IDs are not treated as uploads.
- [ ] Update `hasSourceCache("wallhaven")`, `clearWallpaperSourceCache("wallhaven")`, and `resetWallpaperDefaults()`.
- [ ] Export the new helpers from `window.WallpaperData`.
- [ ] Run `node --check js/wallpaper/data.js`.

## Task 2: Wallhaven Fetch And Cache

- [ ] Add Wallhaven constants: API URL, cache limit 12, official color list.
- [ ] Implement `wallhavenQuery(config)` and `wallhavenSearchUrl(config)`:
  - include `q`, `categories`, fixed `purity=100`, `sorting`;
  - include `topRange` only for `toplist`;
  - include either `atleast` or `resolutions` based on `resolutionMode`;
  - include `ratios` and `colors` only when selected.
- [ ] Implement `normalizeWallhavenItems(data)` to keep items with `id` and HTTPS image `path`.
- [ ] Implement `testWallhavenSource(config)` to fetch JSON and pass only when usable items exist.
- [ ] Implement `cacheWallhavenItems(config, items, options)`:
  - download first 12 usable images;
  - create thumbnails through `WallpaperShow.thumbnail`;
  - write each blob first;
  - write thumbs/meta/order/state after at least one image succeeds;
  - delete stale Wallhaven blobs after the new queue is saved.
- [ ] Implement `refreshWallhavenSource(config, options)` as test/search plus cache.
- [ ] Export Wallhaven helpers from `window.WallpaperFetch`.
- [ ] Run `node --check js/wallpaper/fetch.js`.

## Task 3: Runtime Loading

- [ ] Add a `wallhavenRefreshKeys` guard only if needed to prevent duplicate in-flight refreshes.
- [ ] Add `isWallhavenRefreshDue(config, state)`.
- [ ] Add `tryLoadWallhavenWallpaper(order)` that mirrors upload/RSS safe Blob handling and advances `cache.index` sequentially.
- [ ] Add `refreshWallhavenInBackground(force)`:
  - respect Off/1d/3d/7d;
  - show existing download notice copy using `wallhaven` kind;
  - keep old queue on failure.
- [ ] Insert the `lastMode === "wallhaven"` branch before default Bing fallback.
- [ ] Update gallery mode and current wallpaper detection where mode-specific code currently handles upload/RSS/API.
- [ ] Run `node --check js/newtab.js`.

## Task 4: Settings Panel UI And Apply Flow

- [ ] Add Wallhaven source label/description and source drawer entry.
- [ ] Add draft state `wallpaperDraftWallhavenTestResult`.
- [ ] Add `selectedDraftWallhavenConfig`/hash logic so changed config requires a fresh test.
- [ ] Add `validateWallpaperDraft()` branch requiring passed Wallhaven test before apply.
- [ ] Add Wallhaven config HTML:
  - preset/custom search;
  - category toggles;
  - sorting and conditional top range;
  - resolution select;
  - ratio select;
  - compact expandable color strip;
  - refresh interval segments;
  - generated URL row;
  - Test action;
  - compact notice area for test result/error.
- [ ] Add Wallhaven event binding and handlers.
- [ ] Add `runWallhavenTest()` and error message mapping.
- [ ] Update `applyWallpaperDraft()` so applying Wallhaven caches images before switching source.
- [ ] Keep Wallhaven refresh in apply and scheduled runtime flows without exposing a separate manual fetch button.
- [ ] Run `node --check js/settings-panel.js`.

## Task 5: Queue Management And Styles

- [ ] Add `wallhavenGalleryItems()` and show Wallhaven queue in the existing corner gallery.
- [ ] Generalize gallery drag/delete callbacks so upload and Wallhaven can share layout without sharing storage mutations.
- [ ] Add `deleteWallhavenImage(id)`:
  - remove reference/thumb/meta first;
  - save next preview;
  - delete blob after references are gone;
  - if queue becomes empty, return to Bing or keep visible fallback.
- [ ] Add `saveWallhavenOrder(newOrder)` use after drag reorder.
- [ ] Add CSS for `.wallhaven-config` and color strip controls while reusing existing source visual tokens.
- [ ] Keep text and controls stable on narrow settings widths.

## Task 6: I18n And Rules

- [ ] Add English and Chinese copy carefully.
- [ ] Add localized values for all other `js/i18n/*.js` packs, keeping key completeness.
- [ ] Update rules:
  - `10-storage.md`: new provider and IDB prefix.
  - `20-wallpaper.md`: Wallhaven source, SFW-only, first-12 cache, no blank fallback.
  - `60-settings.md`: Wallhaven draft/test/apply and compact UI.
- [ ] Run:
  - `Get-ChildItem js\i18n\*.js | ForEach-Object { node --check $_.FullName }`
  - `node --check js\languages.js`
  - the project i18n validation snippet from `update-i18n`.

## Task 7: Final Verification

- [ ] Run `Get-ChildItem -Recurse js -Include *.js | ForEach-Object { node --check $_.FullName }`.
- [ ] Run `git diff --check`.
- [ ] Inspect generated URLs for default, custom, toplist, exact resolution, and color-selected configs.
- [ ] Confirm reset defaults clears Wallhaven references and blobs while preserving Bing preview.
- [ ] Summarize changed files, verification results, and any residual risks.
