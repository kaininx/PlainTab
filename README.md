<p align="center">
  <img src="icon/icon2048.png" alt="PlainTab Logo" width="92">
</p>

<h1 align="center">PlainTab</h1>

<p align="center">
  A fast, quiet, wallpaper-first new tab page for Chrome and Edge.
</p>

<p align="center">
  <a href="https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo">Chrome Web Store</a>
  ·
  <a href="https://microsoftedge.microsoft.com/addons/detail/plaintab-%C2%B7-%E6%9E%81%E7%AE%80%E6%96%B0%E6%A0%87%E7%AD%BE%E9%A1%B5/liljpbjkhafejhcidneknjokfcaiebem">Microsoft Edge Add-ons</a>
  ·
  <a href="https://plaintab.kaininx.workers.dev">Live Demo</a>
  ·
  <a href="docs/technical/README_en.md">Technical Notes</a>
  ·
  <a href="docs/changelog-i18n/en.txt">Changelog</a>
</p>

<p align="center">
  English
  ·
  <a href="docs/README_zh-CN.md">简体中文</a>
  ·
  <a href="docs/README_zh-TW.md">繁體中文</a>
  ·
  <a href="docs/README_hi.md">हिन्दी</a>
  ·
  <a href="docs/README_es.md">Español</a>
  ·
  <a href="docs/README_ar.md">العربية</a>
  ·
  <a href="docs/README_fr.md">Français</a>
  ·
  <a href="docs/README_pt_BR.md">Português</a>
  ·
  <a href="docs/README_ru.md">Русский</a>
  ·
  <a href="docs/README_de.md">Deutsch</a>
  ·
  <a href="docs/README_ja.md">日本語</a>
  ·
  <a href="docs/README_it.md">Italiano</a>
  ·
  <a href="docs/README_tr.md">Türkçe</a>
  ·
  <a href="docs/README_vi.md">Tiếng Việt</a>
  ·
  <a href="docs/README_ko.md">한국어</a>
  ·
  <a href="docs/README_pl.md">Polski</a>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-yellow?style=flat-square" alt="MIT License"></a>
  <a href="https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo"><img src="https://img.shields.io/badge/Chrome-Web_Store-4285f4?style=flat-square&logo=googlechrome&logoColor=white" alt="Chrome Web Store"></a>
  <a href="https://microsoftedge.microsoft.com/addons/detail/plaintab-%C2%B7-%E6%9E%81%E7%AE%80%E6%96%B0%E6%A0%87%E7%AD%BE%E9%A1%B5/liljpbjkhafejhcidneknjokfcaiebem"><img src="https://img.shields.io/badge/Edge-Add--ons-0078d7?style=flat-square&logo=microsoftedge&logoColor=white" alt="Microsoft Edge Add-ons"></a>
  <img src="https://img.shields.io/badge/Manifest-V3-4285f4?style=flat-square&logo=googlechrome" alt="Manifest V3">
  <img src="https://img.shields.io/badge/No_Build_Step-00a884?style=flat-square" alt="No Build Step">
  <img src="https://img.shields.io/badge/Vanilla-JS-f7df1e?style=flat-square&logo=javascript&logoColor=111827" alt="Vanilla JavaScript">
</p>

<div align="center">
  <img src="imgs/chrome_01.png" width="45%" alt="PlainTab screenshot 1" />
  <img src="imgs/chrome_02.png" width="45%" alt="PlainTab screenshot 2" />
  <br>
  <img src="imgs/chrome_03.png" width="45%" alt="PlainTab screenshot 3" />
  <img src="imgs/chrome_04.png" width="45%" alt="PlainTab screenshot 4" />
</div>

## What is PlainTab

PlainTab is a Manifest V3 new-tab extension for Chrome and Edge. It replaces the default new tab page with a clean wallpaper, a configurable search bar, and shortcuts that stay tucked away until you need them.

It is built for people who want a browser start page that feels calm and immediate: no news feed, no promoted cards, no account system, no dashboard full of widgets. Open a tab, enjoy the wallpaper, search or type a URL, and move on.

The same page can also run as a standalone website by opening `index.html` directly, so the project is easy to inspect, modify, and learn from.

## Try it

### Install

[Install PlainTab from the Chrome Web Store](https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo)

[Install PlainTab from Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/plaintab-%C2%B7-%E6%9E%81%E7%AE%80%E6%96%B0%E6%A0%87%E7%AD%BE%E9%A1%B5/liljpbjkhafejhcidneknjokfcaiebem)

### Open the live demo

[plaintab.kaininx.workers.dev](https://plaintab.kaininx.workers.dev)

### Run locally

```bash
git clone https://github.com/kaininx/PlainTab.git
```

Extension mode:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Choose "Load unpacked".
4. Select the PlainTab project directory.

Web mode:

Open `index.html` directly in a browser.

No dependencies to install, no package manager, no build step.

## Why PlainTab

### Wallpaper first, without the blank wait

PlainTab is designed around the feeling of opening a new tab and seeing the wallpaper immediately. It keeps a lightweight startup preview in `localStorage`, then hands richer wallpaper work to the runtime after the first paint.

That means the project treats perceived speed as a product feature, not just a benchmark number.

### Quiet by default

The homepage stays visually restrained: wallpaper, search, a few controls, and nothing competing for attention. Shortcuts, hidden links, settings, backups, and deeper wallpaper controls are available when you ask for them, not spread across the page by default.

### Flexible wallpapers

Use Bing's daily wallpaper, Wallhaven, uploaded images, a local folder, RSS feeds, a custom image API, or video wallpapers. PlainTab can stay simple if you only want a daily image, and it has room for more personal setups when you want to tinker.

### Search and shortcuts that stay out of the way

The search bar supports position, size, radius, transparency, visibility mode, search history, and search engine behavior. Shortcuts live in a command palette, so you can search, add, edit, import, and hide links without turning the new tab page into a grid.

## Features

| Feature | What it does |
|---------|--------------|
| New tab replacement | Replaces the browser new tab page after installation |
| Standalone web mode | Runs from `index.html` without extension packaging |
| Fast wallpaper startup | Uses an early preview path to reduce blank new-tab flashes |
| Bing wallpaper | Supports daily Bing wallpapers |
| Wallhaven wallpaper | Supports Wallhaven-based wallpaper browsing and setup |
| Local wallpapers | Supports uploads, galleries, and local folder selection |
| RSS / API wallpapers | Connects to custom image feeds and image APIs |
| Video wallpapers | Supports video wallpaper choices |
| Search bar | Adjustable position, size, style, transparency, and visibility |
| Search history | Saves recent searches, with an option to turn history off |
| Command palette | Keeps shortcuts searchable and editable without homepage clutter |
| Hidden space | Stores links you want available but not visible |
| Settings panel | Manages interface, wallpaper, hotkeys, data, and language |
| Backup and restore | Supports import, export, and encrypted backup flows |
| Multi-language UI | Includes 16 localized interface packs |
| AI collaboration trail | Includes notes and docs from AI-assisted development work |

<div align="center">
  <img src="imgs/chrome_05.png" width="45%" alt="PlainTab screenshot 5" />
  <img src="imgs/chrome_06.png" width="45%" alt="PlainTab screenshot 6" />
</div>

## For Developers

PlainTab is intentionally plain technology:

- Vanilla JavaScript, CSS, and browser APIs.
- No `npm`, no `package.json`, no frontend framework, no bundler.
- One codebase for extension mode and standalone web mode.
- Manifest V3 extension configuration in `manifest.json`.
- Runtime scripts loaded directly from `index.html`.

Good starting points:

- [Technical notes](docs/technical/README_en.md) for architecture and module ownership.
- [Release notes](docs/RELEASE_NOTES.md) for feature history.
- [Memory and storage diagnostic](docs/ai-tasks/20260519-memory-storage-diagnostic-report.md) for wallpaper cache behavior.
- [AI agent instructions](AGENTS.md) for project constraints and maintenance rules.

Areas that need extra care:

- The startup path is tuned to avoid a white flash on new tabs.
- Wallpaper rendering uses stable back and transition front layers.
- Large wallpaper data is stored through the storage module and IndexedDB.
- LocalStorage key compatibility matters unless a migration exists.
- Extension permissions must stay aligned with Chrome Web Store review expectations.

## Project Structure

```text
PlainTab/
├── index.html              # New tab page and standalone web entry point
├── manifest.json           # Chrome / Edge extension manifest
├── css/                    # Page styles split by feature
├── js/                     # Runtime modules
├── js/wallpaper/           # Wallpaper rendering, sources, and theme extraction
├── wasm/                   # Source and scripts for the wallpaper theme engine
├── _locales/               # Chrome extension i18n messages
├── docs/                   # User docs, release notes, technical notes, task records
├── icon/                   # Extension icons
└── imgs/                   # Screenshots and store assets
```

## What PlainTab Avoids

PlainTab will keep its restraint. These features are intentionally outside the current direction:

- News feeds, trending lists, or recommended content.
- Splash ads, sponsored cards, or promoted slots.
- Large weather, calendar, or to-do dashboards.
- Account systems, social features, or cloud content streams.
- Dozens of shortcuts pinned across the homepage.
- Auto-playing promotional content.

Safari support is also not planned for now because the publishing and maintenance costs are not realistic for a personal project.

## AI Collaboration and Learning

PlainTab was built with heavy AI collaboration across coding, documentation, refactoring, release preparation, and diagnostics. It is not a toy demo: it includes a real extension UI, persistent settings, import/export flows, wallpaper storage, multilingual UI, and both extension and web runtime paths.

That makes it useful as a learning project if you want to study:

- how a browser new-tab extension is built;
- how a small frontend project works without a framework;
- how AI-assisted development can be documented and reviewed;
- how product restraint shapes technical decisions.

## Roadmap

PlainTab may continue growing in these directions:

- More stable wallpaper sources.
- Smoother settings and wallpaper setup flows.
- Clearer technical documentation and code annotations.
- A more complete record of AI-assisted development.
- Possible Firefox support, if extension APIs and maintenance costs are practical.

## Contributing

Issues and pull requests are welcome, especially around browser compatibility, wallpaper sources, documentation, and small UI refinements.

Before changing startup, wallpaper, storage, search, settings, or command palette behavior, please read [AGENTS.md](AGENTS.md) and the relevant files under `.claude/rules/`. PlainTab's opening experience is sensitive, so small, focused changes are preferred.

## Languages

<details>
<summary>README translations</summary>

- [简体中文](docs/README_zh-CN.md)
- [繁體中文](docs/README_zh-TW.md)
- [हिन्दी](docs/README_hi.md)
- [Español](docs/README_es.md)
- [العربية](docs/README_ar.md)
- [Français](docs/README_fr.md)
- [Português](docs/README_pt_BR.md)
- [Русский](docs/README_ru.md)
- [Deutsch](docs/README_de.md)
- [日本語](docs/README_ja.md)
- [Italiano](docs/README_it.md)
- [Türkçe](docs/README_tr.md)
- [Tiếng Việt](docs/README_vi.md)
- [한국어](docs/README_ko.md)
- [Polski](docs/README_pl.md)

</details>

## Related Links

- [Changelog](docs/changelog-i18n/en.txt)
- [Detailed release notes](docs/RELEASE_NOTES.md)
- [Technical notes](docs/technical/README_en.md)
- [Memory and storage diagnostic](docs/ai-tasks/20260519-memory-storage-diagnostic-report.md)
- [Live demo](https://plaintab.kaininx.workers.dev)
- [Chrome Web Store](https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo)
- [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/plaintab-%C2%B7-%E6%9E%81%E7%AE%80%E6%96%B0%E6%A0%87%E7%AD%BE%E9%A1%B5/liljpbjkhafejhcidneknjokfcaiebem)
- [GitHub](https://github.com/kaininx/PlainTab)

## License

PlainTab is open source under the [MIT License](LICENSE).

Created and maintained by [Kaelri](https://github.com/kaininx).
