# Wallhaven Wallpaper Source Design

## Goal

Add Wallhaven as a first-class wallpaper source in PlainTab. It should feel native to the existing settings panel, cache up to 12 wallpapers locally, and never risk a blank wallpaper during network or download failures.

## Product Scope

Wallhaven is added as the sixth source beside Bing, upload, folder, RSS, and generic API. The first version is SFW-only and always sends `purity=100`, so it does not expose an API key field.

The settings UI stays quiet and compact:

- Search preset selector, defaulting to `nature`.
- Presets: `nature`, `anime`, `landscape`, `city`, `space`, `forest`, `ocean`, `mountain`, `minimalism`, `abstract`, `cars`, `flowers`, and `custom`.
- Custom search shows one text input.
- Categories are three compact toggles: general, anime, people. At least one stays enabled.
- Sorting supports `random`, `date_added`, `relevance`, `views`, `favorites`, and `toplist`.
- Top range is shown only for `toplist`.
- Resolution supports `Any`, `At least 1920x1080`, `At least 2K`, `At least 4K`, `Exact 1920x1080`, `Exact 2K`, and `Exact 4K`.
- Ratio supports `Any`, `16x9`, `16x10`, `21x9`, and `4x3`.
- Color is a compact expandable color strip using Wallhaven's finite color set. Selection is single color or Any.
- Refresh supports Off, 1 day, 3 days, and 7 days. There is no every-open or immediate auto-refresh mode.
- The generated Wallhaven URL is shown in the panel.
- Test checks JSON search results only. Apply is enabled only after the current config tests successfully.
- Applying the configuration downloads the first 12 usable results and replaces the local Wallhaven queue only after a successful cache pass.

Local queue behavior follows upload wallpapers where possible: ordered rotation, delete, and drag reorder. Delete and reorder only affect the local Wallhaven cache. A future manual or scheduled fetch replaces the Wallhaven queue.

## Data Model

`ptab_wallpaper.providers.wallhaven` stores config and state:

```js
{
  config: {
    queryPreset: "nature",
    customQuery: "",
    categories: "111",
    sorting: "random",
    topRange: "1M",
    resolutionMode: "atleast-1920x1080",
    ratio: "",
    color: "",
    refreshIntervalMs: 86400000
  },
  state: {
    lastCheckedAt: 0,
    lastSuccessAt: 0,
    lastError: "",
    lastTestAt: 0,
    lastTestMessage: "",
    lastQueryUrl: "",
    lastWallpaperId: "",
    lastImageUrl: "",
    cachedCount: 0
  }
}
```

Wallpaper IDs use `wallhaven_<id>`, for example `wallhaven_94x38z`. IndexedDB blobs use `ptab_wallpaper_blob_wallhaven_<id>`. Thumbnails, blur thumbnails, and metadata use the same local ID.

Wallhaven entries in `cache.meta` include the Wallhaven id, page URL, image URL, thumbnail URLs, purity, category, resolution, dimensions, colors, and fetch time.

## Fetch And Cache Flow

The URL builder maps config into Wallhaven API parameters:

- `q` from preset or custom query.
- `categories`.
- fixed `purity=100`.
- `sorting`.
- `topRange` only when sorting is `toplist`.
- `atleast` or `resolutions`, never both.
- `ratios` when selected.
- `colors` when selected.

Test performs a JSON request and passes only when `data` contains at least one item with an HTTPS `path`.

Wallhaven cache refresh reuses shared network helpers where possible. It requests JSON, takes the first 12 usable items, downloads their `path` images, creates local thumbnails, writes blobs first, then writes metadata and order. Old Wallhaven blobs are deleted only after the new queue is safely stored.

If fewer than 12 images are usable, the source still succeeds with the images that did cache. Zero images is a failure and must not change the active wallpaper.

## Runtime Flow

When `activeSource` is `wallhaven`, startup first attempts to load the current Wallhaven queue from IndexedDB and apply the next item by `cache.index`.

If cached images exist, the current wallpaper displays immediately and any due refresh runs in the background. If the background refresh succeeds and Wallhaven is still active, the runtime reloads the wallpaper. If it fails, the existing local queue remains visible.

If no Wallhaven cache exists, runtime attempts a fetch. If that fails, it falls back to cached Bing or network Bing using the existing non-blank fallback flow.

## Settings Flow

Wallhaven follows the existing wallpaper draft/apply model:

- Draft config changes mark the wallpaper tab dirty.
- Test stores a passed test stamp/hash on the draft.
- Apply requires a passed test for the current config and at least one cached image after downloading.
- Apply saves config, caches images, sets active source to `wallhaven`, and reloads wallpaper.
- Due automatic refresh uses the saved tested config to replace the local queue without exposing a separate manual fetch action in settings.

The UI must reuse the existing source drawer language and visual tokens. It should not introduce a separate modal, landing page, or dense API parameter table.

## Error Handling

Wallhaven errors are classified for user-facing messages:

- Invalid or empty query/config.
- Request timeout.
- Network/CORS/permission failure.
- JSON parse failure.
- No search results.
- Results exist but no usable HTTPS image path.
- Image download or thumbnail generation failure.

Failures never clear the previous visible wallpaper. Source switching from another cached source should follow the existing discard-cache prompt behavior.

## Validation

Before completion:

- Run `node --check` on changed JavaScript files.
- Run the project i18n validation after adding keys.
- Run `git diff --check` on touched files.
- Manually inspect generated URL examples for `atleast` versus `resolutions`.
- Confirm reset defaults clears Wallhaven cache and returns to Bing while preserving Bing preview.
