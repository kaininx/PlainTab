# PlainTab Memory And Storage Diagnostic Report

Date: 2026-05-19

Scope: wallpaper runtime, RSS/API/Bing refresh paths, settings modal lifecycle, `localStorage`, and IndexedDB storage bounds.

## Summary

This diagnostic did not find a repeatable memory leak trend or unbounded storage growth in the tested paths.

The main storage limits behaved as expected:

- RSS wallpaper images stayed capped at 12 IndexedDB records.
- API wallpaper stayed capped at one IndexedDB record.
- Bing wallpaper stayed capped at one IndexedDB record.
- Repeated `reloadWallpaper()` calls did not keep increasing storage or heap usage.
- Repeated settings modal open/close stabilized after the first lazy initialization.

Overall risk level for the tested user-facing paths: low.

There is one implementation note for future maintenance: `WallpaperData.setActiveSource('bing')` only changes the active source. It is not intended to be a complete cache-switch operation. The real settings-panel apply path already calls `clearWallpaperSourceCache(previousSource)` when leaving cached non-Bing sources.

## Test Environment

- Browser: Google Chrome headless
- Runtime mode: `file://` web mode
- Profile: temporary Chrome user data directory, removed after each run
- Network: mocked in page through `Page.addScriptToEvaluateOnNewDocument`
- Image payload: small valid PNG Blob, so Canvas thumbnail generation is exercised
- GC: forced through CDP `HeapProfiler.collectGarbage` and exposed `window.gc()`
- Measurement APIs:
  - CDP `Runtime.getHeapUsage`
  - CDP `Memory.getDOMCounters`
  - In-page `localStorage`
  - `WallpaperData.idbKeys()` and `WallpaperData.idbGet()`

## Test Scenarios

### Settings Modal Lifecycle

Actions:

- Open and close the full settings modal once.
- Then open and close it 30 more times.
- Then open and close it another 30 times.
- Force GC before each sample.

Result:

| Sample | JS heap used | DOM nodes | Event listeners | Element count |
|--------|--------------|-----------|-----------------|---------------|
| Cold start | 957,820 | 210 | 63 | 85 |
| After 1 cycle | 986,332 | 477 | 108 | 193 |
| After 31 cycles | 1,031,424 | 476 | 106 | 193 |
| After 61 cycles | 1,036,808 | 476 | 106 | 193 |

Interpretation:

- The first open performs expected lazy initialization.
- After the first initialized state, DOM nodes and event listeners stay stable.
- The final 30 cycles increased JS heap by about 5 KB after forced GC, which is within normal runtime noise for this test.

### Wallpaper Refresh Stress Test

Actions:

- Cold start.
- Open and close settings modal 30 times.
- Run 12 RSS refresh cycles, each with 12 feed images.
- Run 25 API refresh cycles.
- Run 15 Bing refresh cycles.
- Run 40 additional `reloadWallpaper()` calls.
- Force GC before each sample.

Result:

| Sample | JS heap used | Active source | Order length | Meta count | Thumbs count | IDB count | IDB categories |
|--------|--------------|---------------|--------------|------------|--------------|-----------|----------------|
| Initial | 972,048 | `bing` | 1 | 1 | 0 | 1 | `bing: 1` |
| Modal 30 | 1,019,252 | `bing` | 1 | 1 | 0 | 1 | `bing: 1` |
| RSS 12 | 1,397,308 | `rss` | 12 | 13 | 12 | 13 | `bing: 1`, `rss: 12` |
| API 25 | 1,479,972 | `api` | 12 | 14 | 13 | 14 | `bing: 1`, `rss: 12`, `api: 1` |
| Bing 15 | 1,558,584 | `bing` | 1 | 14 | 13 | 14 | `bing: 1`, `rss: 12`, `api: 1` |
| Reload 40 | 1,565,816 | `bing` | 1 | 14 | 13 | 14 | `bing: 1`, `rss: 12`, `api: 1` |

Runtime exceptions: 0

Interpretation:

- RSS did not grow past 12 original images in IndexedDB.
- API repeatedly overwrote `ptab_wallpaper_blob_api`.
- Bing repeatedly overwrote `ptab_wallpaper_blob_bing`.
- The last 40 `reloadWallpaper()` calls only changed JS heap from 1,558,584 to 1,565,816 bytes after forced GC.
- The retained RSS/API records after switching to Bing in this test were caused by the test directly mutating `activeSource`. The settings UI apply path clears old non-Bing source caches when the user confirms switching away from them.

## Storage Bound Review

### `localStorage`

Observed keys during the strict refresh run:

- `ptab_wallpaper`
- `ptab_wallpaper_thumbs`
- `ptab_wallpaper_preview`
- `ptab_schema_version`

Expected bounded values:

- `ptab_wallpaper_preview`: one preview string.
- `ptab_wallpaper_thumbs`: current cached thumbnails. RSS is bounded by active cached order; upload is bounded to 12 images; API uses `api`; Bing uses `bing`.
- `ptab_wallpaper`: model state, provider config, runtime state, cache order, and meta.

Conclusion:

- Low risk for normal UI paths.
- No unbounded `localStorage` key growth was observed.
- Future code should keep using the existing cleanup helpers instead of directly mutating cache state.

### IndexedDB

Expected bounded records:

| Source | Key pattern | Expected bound |
|--------|-------------|----------------|
| Bing | `ptab_wallpaper_blob_bing` | 1 |
| API | `ptab_wallpaper_blob_api` | 1 |
| RSS | `ptab_wallpaper_blob_rss_<id>` | 12 active RSS images |
| Upload | `ptab_wallpaper_blob_upload_<id>` | 12 uploaded images |
| Folder | `ptab_wallpaper_folder_handle`, `ptab_wallpaper_folder_files`, light-cache keys | bounded by folder preview/light-cache pruning |

The tested RSS/API/Bing paths stayed within these bounds.

## Code Path Review

Relevant cleanup and lifecycle points:

- `js/wallpaper/show.js`
  - Tracks the current Blob URL.
  - Revokes the previous Blob URL when a new one replaces it.
  - Provides `revokeBlobUrls()` for explicit cleanup.

- `js/newtab.js`
  - `cleanupOldRssBlobs(activeOrder)` removes stale RSS meta, thumbs, blur thumbs, and IDB records.
  - RSS refresh writes the active RSS order and then cleans old RSS blobs.
  - API refresh routes through `cacheApiResult()`, which overwrites the fixed API Blob key.

- `js/wallpaper/fetch.js`
  - RSS item thumbnail Object URLs are revoked after thumbnail generation succeeds or fails.
  - API thumbnail Object URLs are revoked after thumbnail generation succeeds or fails.

- `js/wallpaper/data.js`
  - `clearWallpaperSourceCache(source)` removes old non-Bing source caches.
  - `resetWallpaperDefaults()` preserves Bing fallback and removes other source records.
  - RSS/API source lists are normalized and capped.

- `js/settings-panel.js`
  - Upload count is capped by available slots up to 12.
  - Gallery Object URLs are tracked in `_galleryBlobUrls` and revoked when the gallery is refreshed or closed.
  - The settings apply path prompts before leaving cached non-Bing sources and then calls `clearWallpaperSourceCache(previousSource)`.

## Maintenance Notes

These are not current leak findings. They are guardrails for future changes:

- Do not treat `D.setActiveSource()` as a full source-switch cleanup API.
- If future RSS logic stores multiple source caches at the same time, rerun the RSS storage-bound test.
- If folder light-cache limits change, rerun folder storage tests because that path depends on pruning helpers.
- This test used web mode with mocked network. Extension mode uses the same page modules, but host permissions should still get a release smoke test.

## Regression Guardrails

- Keep source switching centralized through the settings apply path.
- If a future feature needs programmatic source switching, add a wrapper that combines source change and `clearWallpaperSourceCache()`.
- Keep using fixed IDB keys for single-image providers like Bing and API.
- Keep RSS refresh reporting cached/total counts, because skipped images are expected under real feeds.
- Rerun this diagnostic after changes to:
  - `js/wallpaper/data.js`
  - `js/wallpaper/fetch.js`
  - `js/wallpaper/show.js`
  - `js/newtab.js`
  - settings-panel wallpaper apply or gallery code
