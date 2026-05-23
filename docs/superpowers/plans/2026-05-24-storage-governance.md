# LocalStorage Governance Implementation Plan

**Goal:** finalize PlainTab schema 3 localStorage ownership so every persistent key has a clear domain, while preserving the first-paint wallpaper preview path.

**Scope:** this change governs localStorage only. IndexedDB record ownership and DB versioning stay unchanged.

**Release baseline:** the last published storage baseline is PlainTab 3.1.4 with legacy storage v2. Schema 3 is the current unreleased target, so this work must keep `LS_VERSION = 3` and must not preserve unpublished intermediate keys as compatibility requirements.

## Target LocalStorage Model

Current schema 3 keys:

- `ptab_schema_version`: application-level storage semantics marker.
- `ptab_locale`: boot language preference read by `js/languages.js` before the data layer loads.
- `ptab_wallpaper_preview`: first-paint preview cache read synchronously by `js/preload.js`.
- `ptab_ui`: UI, search, appearance, panel, wallpaper UI settings, and experience acknowledgements.
- `ptab_wallpaper`: wallpaper source model, provider config/state, cache order, cache index, and metadata.
- `ptab_wallpaper_thumbs`: ordinary wallpaper thumbnail cache by local wallpaper id.
- `ptab_wallpaper_blur_thumbs`: derived blur thumbnail cache by local wallpaper id.
- `ptab_shortcuts`: shortcut items, hidden items, recents, and command palette settings.
- `ptab_shortcut_icons`: shortcut icon cache, separate from `ptab_shortcuts` to avoid parsing icon payloads with the core shortcut model.

Legacy v2 keys from the published 3.1.4 line:

- `ptab_version`
- `ptab_lang`
- `ptab_mode`
- `ptab_bing_thumb`
- `ptab_bing_meta`
- `ptab_img_order`
- `ptab_img_thumbs`
- `ptab_local_index`
- `bing_thumb`
- `ptab_wallpaper_source`
- `ptab_search_visibility`
- `ptab_search_mode`
- `ptab_icon_opacity`
- `ptab_search_engine`
- `local_thumbs`

Legacy v2 keys are not current schema keys. `js/wallpaper/migrate.js` may read and delete them for migration. `js/preload.js` may keep a read-only first-paint fallback for `ptab_bing_thumb`, `ptab_mode`, `ptab_local_index`, `ptab_img_order`, and `ptab_img_thumbs` only when `ptab_wallpaper_preview` is absent, so a direct 3.1.4 upgrade can still show a preview before migration runs.

Unpublished intermediate keys are not release compatibility. They must not appear in the final schema, runtime model, migration contract, test fixtures, or rules.

## Ownership Rules

- `js/wallpaper/data.js` owns ordinary localStorage and IndexedDB access.
- `js/preload.js` may directly read `ptab_wallpaper_preview` and the minimal legacy v2 thumbnail fallback needed for first paint. It must not use IDB, network, canvas, async work, i18n, or the full data model.
- `js/languages.js` may directly read `ptab_locale` because language bootstraps before the storage owner exists.
- `js/wallpaper/migrate.js` may read and clean published legacy v2 keys.
- Runtime modules such as `newtab.js`, `command-palette.js`, and `wallpaper/show.js` must go through `window.WallpaperData` APIs.

## Implemented Shape

- `ptab_ui.experience.acknowledged` stores versioned product-experience acknowledgements, keyed by experience id. The first-use hint uses `firstUseHint: 1` through the generic API, not a top-level localStorage key.
- `WallpaperData.hasAcknowledgedExperience(id, version)` and `WallpaperData.acknowledgeExperience(id, version)` are the only runtime API for experience acknowledgement state.
- `WallpaperData.loadShortcutIcons()` and `WallpaperData.saveShortcutIcons()` own `ptab_shortcut_icons` reads and writes.
- `WallpaperData.savePreview()` owns `ptab_wallpaper_preview` writes outside the preload exception.
- `WallpaperData.migrate()` finalizes schema 3 defaults and writes `ptab_schema_version = 3` without bumping to 4.
- `js/wallpaper/migrate.js` performs the published legacy v2 bridge from persisted facts, not from a permanent top-level marker.

## First-Paint Safety

The wallpaper preview hot path remains deliberately special:

1. `#wallpaperBack` exists before script execution.
2. `js/preload.js` reads `ptab_wallpaper_preview` synchronously.
3. Only if that preview is absent does it read the minimal legacy v2 thumbnail fallback.
4. It does not touch IndexedDB, fetch, canvas, async scheduling, or the storage owner.
5. The full migration and schema finalization run later through the normal data layer.

This preserves the product goal: refactoring storage ownership must not slow or destabilize the first visible wallpaper frame.

## Validation Plan

Run:

```powershell
node docs\ai-tasks\20260517-hotpath-performance-test.js
node docs\ai-tasks\20260523-legacy-storage-migration-test.js
node docs\ai-tasks\20260524-storage-governance-test.js
node docs\ai-tasks\20260517-storage-v3-migration-test.js
Get-ChildItem -Recurse js -Include *.js | ForEach-Object { node --check $_.FullName }
git diff --check -- js docs/ai-tasks docs/superpowers/plans .claude/rules
rg -n "localStorage\.(getItem|setItem|removeItem)" js
```

Expected direct localStorage usage only in:

- `js/preload.js`
- `js/languages.js`
- `js/wallpaper/data.js`
- `js/wallpaper/migrate.js`
