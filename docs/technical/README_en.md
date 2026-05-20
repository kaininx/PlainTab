<p align="center">
  <img src="../../icon/icon2048.png" alt="PlainTab Logo" width="88">
</p>

<h1 align="center">PlainTab Technical Notes</h1>

<p align="center">
  A maintainer-oriented map of PlainTab's runtime, storage, wallpaper, settings, and extension boundaries.
</p>

<p align="center">
  <a href="README_zh-CN.md">中文</a>
  ·
  <a href="../../README.md">Project README</a>
  ·
  <a href="../README_zh-CN.md">中文介绍</a>
  ·
  <a href="../RELEASE_NOTES.md">Release Notes</a>
  ·
  <a href="https://plaintab.kaininx.workers.dev">Live Demo</a>
</p>

<div align="center">
  <img src="../../imgs/chrome_01.png" width="45%" alt="PlainTab screenshot 1" />
  <img src="../../imgs/chrome_02.png" width="45%" alt="PlainTab screenshot 2" />
</div>

## Before Reading

This is not a store listing and not a complete API reference. It is the document I would hand to someone before letting them change PlainTab's startup, wallpaper, storage, settings, search, or command palette behavior.

It explains:

- how the new-tab opening path stays fast;
- which files own which responsibilities;
- where data is stored and how source switching stays safe;
- which project constraints are product constraints, not personal taste;
- how to verify common changes.

If you only want to try PlainTab, start with the [project README](../../README.md). If you want to modify or maintain PlainTab, start here.

## Change Map

| If you want to change... | Start with | Also read |
|--------------------------|------------|-----------|
| First paint / white flash | [index.html](../../index.html), [js/preload.js](../../js/preload.js), [js/wallpaper/show.js](../../js/wallpaper/show.js) | [.claude/rules/00-core.md](../../.claude/rules/00-core.md), [.claude/rules/20-wallpaper.md](../../.claude/rules/20-wallpaper.md) |
| Wallpaper display or transitions | [js/wallpaper/show.js](../../js/wallpaper/show.js), [css/wallpaper.css](../../css/wallpaper.css) | [.claude/rules/20-wallpaper.md](../../.claude/rules/20-wallpaper.md) |
| Wallpaper source setup | [js/settings-wallpaper.js](../../js/settings-wallpaper.js), [js/wallpaper/apply.js](../../js/wallpaper/apply.js), [js/wallpaper/data.js](../../js/wallpaper/data.js) | [.claude/rules/60-settings.md](../../.claude/rules/60-settings.md), [.claude/rules/20-wallpaper.md](../../.claude/rules/20-wallpaper.md) |
| Bing / RSS / API / Wallhaven fetching | [js/wallpaper/fetch.js](../../js/wallpaper/fetch.js) | [.claude/rules/20-wallpaper.md](../../.claude/rules/20-wallpaper.md) |
| Local folder wallpapers | [js/wallpaper/folder.js](../../js/wallpaper/folder.js) | [.claude/rules/20-wallpaper.md](../../.claude/rules/20-wallpaper.md) |
| Search behavior | [js/newtab.js](../../js/newtab.js), [css/search.css](../../css/search.css) | [.claude/rules/50-search.md](../../.claude/rules/50-search.md) |
| Settings UI | [js/settings-bootstrap.js](../../js/settings-bootstrap.js), [js/settings-panel.js](../../js/settings-panel.js), [css/settings.css](../../css/settings.css) | [.claude/rules/60-settings.md](../../.claude/rules/60-settings.md) |
| Command palette | [js/command-palette.js](../../js/command-palette.js), [css/command-palette.css](../../css/command-palette.css) | [.claude/rules/70-command-palette.md](../../.claude/rules/70-command-palette.md) |
| Runtime language | [js/languages.js](../../js/languages.js), [js/i18n/](../../js/i18n/) | [.claude/rules/30-language.md](../../.claude/rules/30-language.md) |
| Extension manifest text | [_locales/](../../_locales/), [manifest.json](../../manifest.json) | [.claude/rules/30-language.md](../../.claude/rules/30-language.md) |

## Project Shape

PlainTab is a Chrome / Edge Manifest V3 new-tab extension. The same page can also run as a standalone web page by opening [index.html](../../index.html) directly.

The constraints are deliberate:

- no `npm`, no `package.json`, no bundler;
- no React, Vue, Tailwind, or frontend framework;
- vanilla JavaScript, CSS, and browser APIs;
- one shared codebase for extension mode and web mode;
- startup feel is more important than architectural purity;
- visible UI should stay quiet and wallpaper-first.

The code is intentionally direct. HTML controls script order, CSS is split by feature, and runtime modules cooperate through `window` namespaces. That is not accidental. It keeps the project inspectable and avoids a build system on the path between source and extension.

## Startup Path

The most important path is the wallpaper shown when a new tab opens. The order in [index.html](../../index.html) is part of the product behavior:

1. `#wallpaperBack` enters the DOM.
2. [js/preload.js](../../js/preload.js) runs synchronously.
3. `#wallpaperFront` enters the DOM.
4. The rest of the page DOM follows.
5. [js/languages.js](../../js/languages.js) loads.
6. Wallpaper, settings bootstrap, notice, theme, command palette, and main runtime scripts load after that.

[js/preload.js](../../js/preload.js) has one job: synchronously read `ptab_wallpaper_preview` from `localStorage` and write it into `#wallpaperBack.style.backgroundImage` if it is usable.

It must not:

- access IndexedDB;
- fetch from the network;
- load i18n;
- generate thumbnails;
- scan folders;
- touch Canvas;
- wait for async callbacks;
- depend on main runtime modules.

If this file becomes heavy, users see a blank wait before the wallpaper appears. Treat it as a hot path, not a convenience module.

## Wallpaper Rendering

Wallpaper display is owned by [js/wallpaper/show.js](../../js/wallpaper/show.js). The page uses two wallpaper layers:

| Layer | Role |
|------|------|
| `#wallpaperBack` | Holds the stable current image and receives the startup preview |
| `#wallpaperFront` | Fades in the next image, then hands the final image back to the back layer |

The invariant is simple: at least one layer should keep visible content. A failed image load, decode, source refresh, or transition must not clear the current stable wallpaper.

The public runtime surface is `WallpaperShow`:

- `apply(url, transitionMs, sourceId)`: load and fade in a new image.
- `applyAndSavePreview(url, sourceId)`: apply an image and generate the next startup preview.
- `thumbnail(source)`: generate a normal thumbnail.
- `blurredThumbnail(source, blur)`: generate a blurred thumbnail.
- `showPreparedPreview(preview)`: directly display a prepared preview.
- `showPreparedUrl(url, id)`: directly display a prepared image URL.

Other modules should send prepared URLs or source results into `WallpaperShow`; they should not manage the two DOM layers directly.

## Wallpaper Sources

Current wallpaper source families:

| Source | Main files | Notes |
|--------|------------|-------|
| Bing | [js/wallpaper/fetch.js](../../js/wallpaper/fetch.js), [js/wallpaper/data.js](../../js/wallpaper/data.js) | Default network source, cached by date |
| Upload | settings modules, [js/wallpaper/data.js](../../js/wallpaper/data.js) | User images stored as blobs and thumbnails |
| Folder | [js/wallpaper/folder.js](../../js/wallpaper/folder.js) | File System Access API, user-granted handles |
| RSS | [js/wallpaper/fetch.js](../../js/wallpaper/fetch.js), [js/wallpaper/data.js](../../js/wallpaper/data.js) | Parses feeds, caches usable image entries |
| API | [js/wallpaper/fetch.js](../../js/wallpaper/fetch.js), [js/wallpaper/data.js](../../js/wallpaper/data.js) | Supports direct images and JSON image fields |
| Wallhaven | [js/wallpaper/fetch.js](../../js/wallpaper/fetch.js), [js/wallpaper/data.js](../../js/wallpaper/data.js) | Searches Wallhaven, caches a bounded image set |
| Video | settings/runtime modules | User-selected video wallpaper path; keep startup and fallback rules in mind |

All image-based sources eventually converge on the same display layer. Whether an image comes from the network, upload, folder, RSS, API, or Wallhaven, it should end up going through `WallpaperShow`.

Failure policy:

- do not clear the current wallpaper just because the active source failed;
- reuse existing cache when possible;
- keep previous stable state if a new source cannot be applied;
- ask before destructive source switches or cache cleanup;
- clean up only after the new source is committed and reloaded.

## Source Apply Safety

Wallpaper source changes are coordinated by [js/wallpaper/apply.js](../../js/wallpaper/apply.js). This file is the transaction-like boundary between settings drafts and stored wallpaper state.

Its responsibilities:

- validate the requested work order;
- prepare data required by the next source;
- commit the provider model only after preparation succeeds;
- reload the wallpaper after commit;
- restore the previous model if reload fails;
- clean up data from the previous source only after the new state is stable.

This is why wallpaper settings should not write provider state directly. A source switch may involve network tests, local permissions, blob writes, preview generation, and cache deletion. Those steps need ordering.

## Wallpaper Data

Wallpaper data helpers live in [js/wallpaper/data.js](../../js/wallpaper/data.js). This module owns `localStorage` and IndexedDB access for wallpaper data.

| Storage | Main use |
|---------|----------|
| `localStorage` | small settings, previews, thumbnails, UI state, current provider model |
| IndexedDB | large image blobs for Bing / API / uploads / RSS / Wallhaven, plus folder handles |

The startup preview must stay in `localStorage` because `preload.js` needs synchronous access. Full images are too large for the startup path and belong in IndexedDB.

Common keys:

- `ptab_wallpaper_preview`: startup preview.
- `ptab_wallpaper`: wallpaper provider model.
- `ptab_wallpaper_thumbs`: thumbnail cache.
- `ptab_wallpaper_blur_thumbs`: blurred thumbnail cache.
- `ptab_ui`: search, appearance, and wallpaper display preferences.
- `ptab_shortcuts`: command palette links and settings.
- `ptab_shortcut_icons`: shortcut icon cache.

Storage safety rule:

- when writing, store large data before writing references;
- when deleting, remove references before deleting large data;
- revoke Blob URLs when they are no longer needed.

## Settings System

The settings system is split across three main modules:

| Layer | File | Role |
|-------|------|------|
| Lightweight entry | [js/settings-bootstrap.js](../../js/settings-bootstrap.js) | quick panel entry, active source, upload entry, GitHub/about surface |
| Full settings shell | [js/settings-panel.js](../../js/settings-panel.js) | tabs, layout, UI/search/data/about flows, shared settings coordination |
| Wallpaper workspace | [js/settings-wallpaper.js](../../js/settings-wallpaper.js) | source navigation, runtime status, draft workspace, apply/reset wiring |

The lightweight panel must stay light. It is frequently available from the page and should not eagerly pull every settings behavior into the startup experience.

Full settings use two save models:

- UI preferences save immediately, such as search position, opacity, radius, and wallpaper fit.
- Wallpaper source settings use drafts and only become real after "Apply configuration".

The draft model is intentional. Wallpaper changes may require network checks, folder permissions, blob writes, source cleanup, or recovery from failed reloads.

## Notice and Theme UI

[js/app-notice.js](../../js/app-notice.js) owns app-level confirm, alert, and toast surfaces through `window.PlainTabNotice`. Prefer these shared surfaces over ad hoc dialogs when a flow needs confirmation or a short user-facing message.

[js/theme.js](../../js/theme.js) owns CSS theme token aliases and custom accent behavior through `window.PlainTabTheme`. Wallpaper-derived color extraction lives in [js/wallpaper/theme.js](../../js/wallpaper/theme.js); global token application and aliasing live in `js/theme.js`.

Keep shared visual tokens centralized in CSS variables. Prefer class or attribute changes over repeated dynamic style writes.

## Search Bar

The search bar is defined in [index.html](../../index.html), styled by [css/search.css](../../css/search.css), and controlled mainly by [js/newtab.js](../../js/newtab.js) plus the settings modules.

Supported behavior:

- visibility modes: always, hover, hidden;
- configurable position, width, radius, background opacity, and blur;
- optional search history;
- multiple search engines in web mode;
- extension mode hides engine switching where it does not fit the extension environment.

Search settings are stored under `ptab_ui.search`.

## Command Palette

The command palette is implemented in [js/command-palette.js](../../js/command-palette.js), with styles in [css/command-palette.css](../../css/command-palette.css).

It is lazy-loaded. If the user never opens the palette, the full palette logic should not enter the startup path.

Main capabilities:

- add, edit, and delete shortcuts;
- separate normal and hidden spaces;
- recent visits;
- bookmark HTML import;
- shortcut export;
- list and icon views;
- configurable hotkeys.

The command palette owns shortcuts only. Full configuration import/export belongs to the data tab in settings.

## Data Backup

The data tab supports:

- plain JSON export;
- encrypted backup export;
- configuration import.

Backups mainly include user configuration: UI preferences, wallpaper configuration, shortcuts, hotkeys, and search settings.

They do not fully include:

- large image blobs in IndexedDB;
- local folder permissions;
- original files on the user's disk.

That boundary is intentional. Local resources should be re-selected after cross-device restore; otherwise backups become heavy and fragile.

## Internationalization

PlainTab has two i18n systems:

| Location | Use |
|----------|-----|
| [_locales/](../../_locales/) | Chrome / Edge extension manifest strings |
| [js/languages.js](../../js/languages.js) and [js/i18n/](../../js/i18n/) | runtime page UI strings |

When adding runtime UI text, do not update only one language. Keep `en` and `zh-CN` carefully maintained, and keep every published runtime pack key-complete.

## Runtime Modes

PlainTab runs in two modes:

| Mode | Entry | Notes |
|------|-------|-------|
| Extension mode | Chrome / Edge new tab | `manifest.json` overrides the new tab page |
| Web mode | open `index.html` directly | usable as an online start page or local page |

Code should account for environment differences:

- `chrome.runtime` may not exist;
- extension APIs are unavailable in normal pages;
- folder access depends on browser support;
- optional host permissions only matter in extension mode;
- web mode and `file://` may reject local WASM fetches, so JS fallback must remain usable.

## Theme Engine

Wallpaper theme colors are extracted by [js/wallpaper/theme.js](../../js/wallpaper/theme.js). This work is not on the startup hot path. [js/wallpaper/show.js](../../js/wallpaper/show.js) schedules extraction after the wallpaper is shown, using animation frames and idle time where practical.

Theme extraction has two paths:

| Path | File | Role |
|------|------|------|
| WASM | [js/wallpaper/theme_engine.wasm](../../js/wallpaper/theme_engine.wasm) | preferred pixel analysis path |
| JS fallback | [js/wallpaper/theme.js](../../js/wallpaper/theme.js) | keeps web mode and failure cases usable |

The C++ source lives in [wasm/theme_engine.cpp](../../wasm/theme_engine.cpp). Build scripts live in [wasm/build.bat](../../wasm/build.bat) and [wasm/build.sh](../../wasm/build.sh). On Windows:

```powershell
.\wasm\build.bat
```

This generates `js/wallpaper/theme_engine.wasm`, the runtime asset loaded by the extension.

In extension mode, [manifest.json](../../manifest.json) must keep:

```text
script-src 'self' 'wasm-unsafe-eval'
```

Chrome MV3 extension pages need that directive for WebAssembly.

## Directory Structure

```text
PlainTab/
├── index.html              # page entry; script order matters
├── manifest.json           # Manifest V3 extension config
├── 404.html                # static deployment fallback
├── css/
│   ├── base.css            # global base styles and variables
│   ├── wallpaper.css       # wallpaper layers, gallery, RSS captions
│   ├── search.css          # search bar and history suggestions
│   ├── settings.css        # settings panel
│   └── command-palette.css # command palette
├── js/
│   ├── preload.js          # startup preview hot path
│   ├── languages.js        # UI i18n bootstrap
│   ├── app-notice.js       # shared confirm, alert, toast surfaces
│   ├── theme.js            # global CSS theme aliases
│   ├── newtab.js           # main runtime
│   ├── settings-bootstrap.js
│   ├── settings-panel.js
│   ├── settings-wallpaper.js
│   ├── command-palette.js
│   └── wallpaper/
│       ├── apply.js        # source apply transaction boundary
│       ├── data.js         # storage and data model
│       ├── show.js         # wallpaper display and thumbnails
│       ├── fetch.js        # network wallpaper sources
│       ├── folder.js       # local folder source
│       ├── theme.js        # wallpaper theme extraction
│       └── theme_engine.wasm
├── wasm/
│   ├── theme_engine.cpp
│   ├── build.bat
│   └── build.sh
├── _locales/               # extension manifest i18n
├── docs/                   # docs, release notes, AI task notes
├── icon/                   # icons
└── imgs/                   # screenshots and store assets
```

## Development Constraints

When changing the project, keep these constraints in mind:

- do not add npm, `package.json`, build tooling, or frontend frameworks;
- do not expand extension permissions casually;
- do not put network, IndexedDB, Canvas, i18n, or folder scanning work into `preload.js`;
- do not change the critical order of wallpaper layers and `preload.js` in `index.html`;
- do not clear both wallpaper layers during a transition;
- use `WallpaperData` for wallpaper storage access;
- use `WallpaperApply` for source switches that can affect stored state;
- write large data and references in the correct order;
- new settings should consider defaults, import/export, reset, and i18n;
- command palette logic should stay out of the synchronous startup path;
- keep the visible page quiet; do not turn it into a feed or widget dashboard.

If you are unsure about a module, read the matching file under [.claude/rules/](../../.claude/rules/). Those files document the current implementation constraints.

## Verification

For documentation-only changes:

```powershell
git diff --check -- docs/technical
```

For JavaScript changes:

```powershell
Get-ChildItem -Recurse js -Include *.js | ForEach-Object { node --check $_.FullName }
```

For runtime i18n changes:

```powershell
Get-ChildItem js\i18n\*.js | ForEach-Object { node --check $_.FullName }
node --check js\languages.js
```

For wallpaper or settings behavior, also verify manually or with Playwright:

- first open shows a wallpaper, not a blank page;
- switching sources does not clear the current stable wallpaper on failure;
- settings drafts do not persist until applied;
- extension mode and web mode both still open.

## AI Collaboration

PlainTab has been developed with heavy AI collaboration. The interesting part is the workflow, not just the code:

- documentation constrains AI changes;
- rule files preserve module invariants;
- task notes capture design and verification for complex work;
- AI participates in implementation, refactoring, documentation, test scripts, and release preparation.

Related files:

- [AGENTS.md](../../AGENTS.md): shared AI entry point.
- [.claude/rules/](../../.claude/rules/): module rules.
- [docs/ai-tasks/](../ai-tasks/): AI task notes and verification scripts.

If you want to study AI-assisted development on a real project rather than a one-off demo, PlainTab is a good project to inspect.

## Appendix: Theme Engine Benchmarks

The following numbers came from extension mode, local wallpaper `少女-绿感.png`, and 50 benchmark rounds. The current WASM/JS comparison uses the same `96x96` sample, or 9216 pixels.

| Item | Time |
|------|------|
| Canvas `getImageData`, 96x96 | 0.638 ms |
| First WASM analysis / initialization | 0.600 ms |
| WASM analysis, 96x96 | 0.210 ms |
| WASM total, pixel read + analysis | 0.848 ms |
| JS analysis, 96x96 | 0.376 ms |
| JS total, pixel read + analysis | 1.014 ms |
| Legacy JS 36x36 total | 0.138 ms |

Takeaways:

- For the same `96x96` input, WASM analysis is about `1.79x` faster than JS.
- Including Canvas pixel read, the total path is about `1.20x` faster.
- The legacy `36x36` path is still faster because it only processes 1296 pixels.
- The current design spends less than 1 ms total to get a higher-resolution and more stable palette.

## Quick Start

Extension mode:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Choose "Load unpacked".
4. Select the PlainTab project directory.

Web mode:

Open [index.html](../../index.html) directly in a browser.

Live demo:

[plaintab.kaininx.workers.dev](https://plaintab.kaininx.workers.dev)

## Related Links

- [中文技术说明](README_zh-CN.md)
- [Project README](../../README.md)
- [中文介绍](../README_zh-CN.md)
- [Release Notes](../RELEASE_NOTES.md)
- [Chrome Web Store](https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo)
- [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/plaintab-%C2%B7-%E6%9E%81%E7%AE%80%E6%96%B0%E6%A0%87%E7%AD%BE%E9%A1%B5/liljpbjkhafejhcidneknjokfcaiebem)
- [GitHub repository](https://github.com/kaininx/PlainTab)

## License

PlainTab is open source under the [MIT License](../../LICENSE).
