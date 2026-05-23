# Release Notes · 详细更新说明

> 本文件用于维护 PlainTab 的详细版本说明，仅维护中文和英文。多语言一句话摘要请查看 `docs/changelog-i18n/`。
>
> This file contains the detailed release notes for PlainTab, maintained in Chinese and English only. For one-line localized changelog summaries, see `docs/changelog-i18n/`.

## v3.2.2

### 中文

**摘要**：这是一版围绕存储治理、壁纸配置、升级可靠性和维护流程的小型补丁更新。PlainTab 收口了 localStorage 的读写边界，把首次使用提示确认状态纳入统一 UI 模型，并为 Bing 每日壁纸补充可选 4K UHD 拉取，同时默认仍保持 1080p。

**更新内容**

- 收口 localStorage 所有权，运行时模块通过 `WallpaperData` 读写快捷图标、壁纸预览和体验确认状态，减少游离的顶层存储 key。
- 将左下角首次使用提示的确认状态放入 `ptab_ui.experience.acknowledged`，为后续体验提示保留统一的版本化记录方式。
- 保留 `preload.js` 的轻量首屏预览路径，在 `ptab_wallpaper_preview` 缺失时仍可读取 3.1.4 legacy 缩略图兜底，不引入 IDB、网络或异步工作。
- 移除未发布中间 key 的兼容假设，让 schema 3 只承载真实发布升级需要的迁移范围。
- Bing 每日壁纸新增 4K UHD 开关，默认继续拉取 1080p；切换到 4K 后会使用上游 `UHD` 分辨率请求。
- Bing 缓存会记录当前分辨率，同一天缓存也必须同时匹配日期和分辨率才会复用，避免配置切换后沿用旧图。
- 4K 配置保存在既有壁纸模型里，不新增 localStorage key，不提升 `LS_VERSION` 或 IndexedDB 版本；导入导出会保留合法的 4K 设置，缺失或非法值回到默认 1080p。
- 统一数据备份导入的文件状态、口令输入和可见性按钮逻辑，让 JSON 与 `.ptab` 备份的导入体验更一致。
- 设置页自定义下拉菜单改为通用浮层处理，避免被滚动容器裁切，同时继续复用现有设置控件视觉。
- 更新版本发布、提交流程和存储迁移相关 agent skill，明确保持现有文案风格、README badge 风格和中文 Conventional Commit 队形。

### English

**Summary**: This patch release focuses on storage governance, wallpaper configuration, upgrade reliability, and maintenance workflow. PlainTab tightens localStorage ownership, moves the first-use hint acknowledgement into the unified UI model, and adds optional 4K UHD fetching for Bing daily wallpapers while keeping 1080p as the default.

**Details**

- Centralized localStorage ownership so runtime modules use `WallpaperData` for shortcut icons, wallpaper previews, and experience acknowledgements instead of scattered top-level keys.
- Moved the bottom-left first-use hint acknowledgement into `ptab_ui.experience.acknowledged`, giving future experience prompts one versioned model.
- Preserved the lightweight `preload.js` first-paint path: when `ptab_wallpaper_preview` is missing, direct 3.1.4 upgrades can still use legacy thumbnails without IDB, network, or async work.
- Removed compatibility assumptions for unpublished intermediate keys, keeping schema 3 focused on real published-version upgrades.
- Added a 4K UHD toggle for Bing daily wallpapers while keeping 1080p as the default; enabling 4K uses the upstream `UHD` resolution request.
- Made Bing cache freshness resolution-aware, so same-day cache reuse requires both the date and selected resolution to match.
- Stored the 4K choice inside the existing wallpaper model without adding a new localStorage key, bumping `LS_VERSION`, or changing the IndexedDB version; import/export preserves valid 4K settings and normalizes missing or invalid values back to 1080p.
- Unified backup import file state, passphrase input, and visibility-button behavior so JSON and `.ptab` backup flows feel more consistent.
- Moved custom select menus to a shared floating menu path in settings, preventing clipped dropdowns inside scroll containers while preserving the existing control style.
- Updated release, commit, and storage-migration agent skills so future maintenance keeps the existing release-copy style, README badge style, and Chinese Conventional Commit rhythm.

## v3.2.1

### 中文

**摘要**：这是一版围绕壁纸来源、设置体验和运行稳定性的补丁更新。PlainTab 新增 Wallhaven 与视频壁纸支持，并把壁纸来源的编辑、预览和应用流程整理得更安全、更清晰；同时继续打磨命令面板、主题取色、多语言加载和设置页懒加载体验。

**更新内容**

- 新增 Wallhaven 壁纸源，并适配设置流程，让用户可以通过更清晰的入口配置外部壁纸来源。
- 支持上传视频壁纸，扩展本地壁纸素材类型，同时继续保持现有壁纸加载与回退路径。
- 重设计上传壁纸的应用流程，引入更稳妥的待应用状态和回滚逻辑，避免失败的壁纸准备过程污染已保存配置。
- 统一壁纸设置基础布局，清理旧的来源抽屉，让壁纸来源、状态提示和应用动作更容易理解。
- 优化壁纸主题引擎与全局主题视觉层级，收敛主题色提取强度，减少颜色过度干扰界面的情况。
- 改进命令面板、权限设置、快捷链接和 API 设置体验，让常用管理入口更顺手。
- 拆分运行时语言包，并修复设置页语言刷新、缓存和懒加载竞态，提升多语言环境下的稳定性。
- 增加构建最新 tag 版本 zip 包的脚本，方便后续发布打包。
- 补充 AI 协作、i18n 维护、提交流程和壁纸设置改造相关文档，方便后续维护。

### English

**Summary**: This patch release focuses on wallpaper sources, settings polish, and runtime stability. PlainTab adds Wallhaven and video wallpaper support, makes wallpaper editing, previewing, and applying safer and clearer, and continues refining the command palette, theme colors, i18n loading, and settings lazy-loading behavior.

**Details**

- Added the Wallhaven wallpaper source and connected it to the settings flow for clearer external wallpaper configuration.
- Added video wallpaper upload support, expanding local wallpaper material options while preserving the existing wallpaper load and fallback path.
- Redesigned the uploaded wallpaper apply flow with safer pending state and rollback behavior, so failed wallpaper preparation does not pollute saved settings.
- Unified the base wallpaper settings layout and removed the older source drawer, making wallpaper sources, status messages, and apply actions easier to follow.
- Refined the wallpaper theme engine and global theme visual hierarchy, reducing overly strong extracted colors in the interface.
- Improved the command palette, permission settings, shortcut management, and API settings experience.
- Split runtime language packs and fixed settings language refresh, cache, and lazy-loading races for better i18n stability.
- Added a release packaging helper for building a zip from the latest tag.
- Added maintenance documentation for AI collaboration, i18n updates, commit flow, and the wallpaper settings redesign.

## v3.2.0

### 中文

**摘要**：这是一次大幅度的项目呈现与文档体系更新。PlainTab 的底层技术框架、Manifest V3 架构和核心运行链路没有发生破坏性变化，因此版本号提升的是次版本号（minor version），而不是主版本号；但从 README、技术说明、多语言文档到项目定位，整体已经完成了一轮明显的重整。

**更新内容**

- 全面重写主 README，将项目介绍从偏技术实现的说明，调整为更面向普通用户和新读者的表达。
- 重新梳理 PlainTab 的产品定位：一个好看、很快、很安静的新标签页，强调壁纸、搜索和快捷入口的克制体验。
- 精简首页文档结构，突出安装入口、在线体验、技术文档、更新日志和 Chrome Web Store 链接。
- 重写功能介绍，按用户实际感受说明打开速度、壁纸来源、搜索栏、快捷链接、设置面板和数据能力。
- 新增“不会做什么”和“以后可能会做什么”等说明，让项目边界、取舍和后续方向更清楚。
- 将大量底层实现细节从主 README 中拆出，沉淀为独立技术文档，避免普通用户被实现细节淹没。
- 新增中英文技术文档，系统说明启动链路、壁纸渲染、WASM 主题色引擎、壁纸数据、设置系统、搜索栏、命令面板、数据备份、国际化和运行模式。
- 重新组织 AI 协作相关说明，把 PlainTab 明确整理为一个适合学习浏览器扩展、前端工程和 AI 辅助开发的真实项目样本。
- 同步整理 16 种语言 README，让多语言文档的结构、语气和入口更一致。
- 新增独立简体中文 README 入口，改善中文读者从仓库首页进入文档的路径。
- 保留无构建、无依赖、原生 JavaScript 与 CSS 的项目约束，确保这次更新不改变 PlainTab 轻量、可直接运行的技术基础。

### English

**Summary**: This is a major documentation and project-presentation update. PlainTab still keeps the same underlying technical framework, Manifest V3 architecture, and core runtime path, so the version moves as a minor version rather than a major version. Even without a framework rewrite, the project now feels substantially refreshed across the README, technical docs, localized documentation, and overall positioning.

**Details**

- Rewrote the main README so the project introduction is easier for users and new readers to understand.
- Clarified PlainTab's positioning as a beautiful, fast, and quiet new tab page centered on wallpaper, search, and uncluttered shortcuts.
- Simplified the documentation entry points for installation, live demo, technical docs, release notes, and Chrome Web Store.
- Reworked the feature descriptions around real user experience: startup feel, wallpaper sources, search bar, shortcuts, settings, and data capabilities.
- Added clearer project boundaries through "what it won't do" and "what might come next" sections.
- Moved many low-level implementation details out of the main README into dedicated technical documentation.
- Added Chinese and English technical documentation covering startup flow, wallpaper rendering, the WASM theme-color engine, wallpaper data, settings, search, command palette, backup, internationalization, and runtime modes.
- Reorganized the AI collaboration explanation so PlainTab is easier to understand as a real learning project for browser extensions, frontend development, and AI-assisted engineering.
- Synchronized the structure and tone of the 16 localized README files.
- Added a standalone Simplified Chinese README entry to improve the reading path for Chinese users.
- Preserved the no-build, no-dependency, vanilla JavaScript and CSS foundation, so this update does not change PlainTab's lightweight runtime model.

## v3.1.4

### 中文

**摘要**：增强存储迁移安全性，并改善本地壁纸批量上传体验。

**更新内容**

- 重新梳理 localStorage 与 IndexedDB 键名，降低不同存储区域混用的风险。
- 将 IndexedDB 迁移调整为更稳妥的两阶段流程，提升异常中断后的可恢复性。
- 新安装用户会跳过不必要的历史迁移，减少首次运行时的额外工作。
- 本地壁纸批量上传支持按文件名去重，并在超过 12 张上限时自动截断。

### English

**Summary**: Improved storage migration safety and refined local wallpaper batch uploads.

**Details**

- Clarified localStorage and IndexedDB key naming to reduce cross-storage confusion.
- Reworked IndexedDB migration into a safer two-phase process for better recovery after interrupted writes.
- New installations skip unnecessary historical migrations to reduce startup work.
- Local wallpaper batch upload now deduplicates by file name and caps uploads at 12 images.

## v3.1.3

### 中文

**摘要**：引入存储版本迁移机制，统一数据键名，并修正缩略图持久化逻辑。

**更新内容**

- 为 localStorage 与 IndexedDB 增加 schema 版本化迁移能力。
- 统一项目中的存储键名风格，方便后续维护与兼容。
- 缩略图会根据当前壁纸模式决定是否持久化，避免本地模式下产生不必要的数据。
- 简化 Chrome Web Store 与手动安装说明。

### English

**Summary**: Added versioned storage migration, unified data keys, and fixed thumbnail persistence behavior.

**Details**

- Added schema-versioned migration for localStorage and IndexedDB.
- Unified storage key naming across the project for maintainability and compatibility.
- Thumbnail persistence now depends on the current wallpaper mode, avoiding unnecessary local-mode data.
- Simplified Chrome Web Store and manual installation instructions.

## v3.1.2

### 中文

**摘要**：修正葡萄牙语区域标识，并统一多语言文档命名与更新日志格式。

**更新内容**

- 将 `_locales/pt` 调整为 Chrome Web Store 识别的 `pt_BR`。
- 同步更新葡萄牙语 README 与 changelog 文件名，保持语言目录一致。
- 统一 16 种语言的 changelog 展示格式，让多语言文档更易维护。

### English

**Summary**: Fixed the Portuguese locale identifier and aligned localized documentation naming.

**Details**

- Changed `_locales/pt` to `pt_BR`, which is recognized by Chrome Web Store.
- Renamed Portuguese README and changelog files to keep locale naming consistent.
- Unified the changelog presentation across 16 languages for easier maintenance.

## v3.1.1

### 中文

**摘要**：提升 Bing 壁纸接口响应速度，并补充相关多语言说明。

**更新内容**

- 同时请求多个 Bing 壁纸端点，使用最快返回结果加载壁纸。
- 为壁纸请求加入 8 秒超时控制，避免连接长时间挂起。
- 更新 16 种语言 README，说明新的并发请求与超时优化策略。

### English

**Summary**: Improved Bing wallpaper request latency and updated localized documentation.

**Details**

- Requests multiple Bing wallpaper endpoints concurrently and uses the fastest successful response.
- Added an 8-second timeout to avoid long-hanging wallpaper requests.
- Updated all 16 README files to describe the concurrent request and timeout strategy.

## v3.1.0

### 中文

**摘要**：上线本地壁纸画廊，扩展多图管理能力，并继续优化设置体验。

**更新内容**

- 支持上传、删除、轮播多张本地壁纸。
- 支持批量选择本地图片，方便一次性导入壁纸集合。
- 优化设置面板与语言面板标题样式。
- 完善多语言本地化文本。
- 移除不再需要的 JSON API 域名配置，收紧扩展安全策略。

### English

**Summary**: Added the local wallpaper gallery and improved multi-image management.

**Details**

- Supports uploading, deleting, and rotating multiple local wallpapers.
- Supports batch image selection for easier wallpaper import.
- Improved title styling for settings and language panels.
- Expanded localized UI text.
- Removed unnecessary JSON API origins to tighten the extension security policy.

## v3.0.5

### 中文

**摘要**：升级 Bing API 代理与壁纸缓存策略，并补齐多语言更新日志。

**更新内容**

- Bing 壁纸请求支持区域化，并减少重复图片结果。
- 下载壁纸前会优先检查 IndexedDB 缓存，减少重复下载。
- 统一 localStorage 键名。
- 新增 16 种语言的 changelog 文件。
- 改进运行日志与代码语义，方便后续排查问题。

### English

**Summary**: Upgraded the Bing API proxy and wallpaper caching strategy, then filled in localized changelogs.

**Details**

- Bing wallpaper requests now support regional behavior and reduce duplicate images.
- IndexedDB cache is checked before downloading wallpapers again.
- Unified localStorage key names.
- Added changelog files for 16 languages.
- Improved logs and code semantics for easier debugging.

## v3.0.4

### 中文

**摘要**：修复部分环境中 Bing 壁纸无法显示的问题。

**更新内容**

- 补充 Bing CDN 图片域名到 CSP `img-src` 白名单。
- 修复代理 API 重定向后的壁纸图片被浏览器拦截的问题。

### English

**Summary**: Fixed Bing wallpaper loading failures in some environments.

**Details**

- Added Bing CDN image origins to the CSP `img-src` allowlist.
- Fixed cases where images redirected from proxy APIs were blocked by the browser.

## v3.0.3

### 中文

**摘要**：优化首帧渲染路径，同时加强安全策略并整理静态素材。

**更新内容**

- 关键预加载路径绕开 CSSOM，减少新标签页首帧等待。
- 加固内容安全策略。
- 清理不再使用的代码。
- 新增 SVG 图标与扩展推广素材。

### English

**Summary**: Optimized the first-frame rendering path, tightened security, and organized static assets.

**Details**

- Bypassed CSSOM on the critical preload path to reduce first-frame delay.
- Hardened the content security policy.
- Removed unused code.
- Added SVG icons and promotional extension assets.

## v3.0.2

### 中文

**摘要**：完善深色模式视觉表现，并调整页面结构与底部说明。

**更新内容**

- 深色模式背景会根据当前界面自适应。
- 重构页面代码结构，让模块边界更清晰。
- 新增底部多语言说明栏。

### English

**Summary**: Improved dark-mode visuals and adjusted page structure.

**Details**

- Dark-mode background now adapts to the current interface.
- Refactored page structure for clearer module boundaries.
- Added a multilingual footer note.

## v3.0.1

### 中文

**摘要**：接入 Chrome Search API，满足 Chrome Web Store 单一用途审核要求。

**更新内容**

- 使用 Chrome Search API 处理搜索行为。
- 调整搜索实现以符合 Chrome Web Store 审核规范。

### English

**Summary**: Integrated Chrome Search API for Chrome Web Store single-purpose compliance.

**Details**

- Search behavior now uses Chrome Search API in extension mode.
- Adjusted search implementation to align with Chrome Web Store review requirements.

## v3.0.0

### 中文

**摘要**：完成核心重写，建立零闪烁壁纸渲染基础。

**更新内容**

- 引入双图层壁纸架构，减少新标签页打开时的闪烁。
- 增加保底背景，在壁纸未就绪时保持页面可见。
- 为后续壁纸加载、缓存与切换能力打下基础。

### English

**Summary**: Completed a core rewrite and established the zero-flicker wallpaper foundation.

**Details**

- Introduced a dual-layer wallpaper architecture to reduce new-tab flicker.
- Added a fallback background so the page remains visible before wallpaper readiness.
- Built the foundation for later wallpaper loading, caching, and switching features.

## v2.2.7

### 中文

**摘要**：扩展多语言 README，并调整默认搜索栏显示方式。

**更新内容**

- 新增英语、日语、韩语、俄语、简体中文 README。
- 默认搜索模式改为「始终显示」。

### English

**Summary**: Expanded localized README files and changed the default search-bar visibility.

**Details**

- Added English, Japanese, Korean, Russian, and Simplified Chinese README files.
- Changed the default search mode to always visible.

## v2.2.6

### 中文

**摘要**：优化壁纸加载与缩略图缓存，整理 Bing API 配置。

**更新内容**

- 改善壁纸加载流程。
- 优化缩略图缓存逻辑。
- 整理 Bing API 相关常量。

### English

**Summary**: Optimized wallpaper loading, thumbnail caching, and Bing API configuration.

**Details**

- Improved the wallpaper loading flow.
- Optimized thumbnail caching logic.
- Cleaned up Bing API constants.

## v2.2.5

### 中文

**摘要**：加入壁纸预加载与首帧优化，减少新标签页白屏闪烁。

**更新内容**

- 壁纸加载前增加预加载处理。
- 优化首次渲染时机，让打开新标签页时更快看到背景。

### English

**Summary**: Added wallpaper preloading and first-frame optimization to reduce blank-screen flashes.

**Details**

- Added wallpaper preloading before display.
- Optimized first-render timing so the background appears faster when opening a new tab.

## v2.2.4

### 中文

**摘要**：将壁纸存储从 localStorage 迁移到 IndexedDB。

**更新内容**

- 使用 IndexedDB 保存壁纸数据，降低大图数据占用 localStorage 的风险。
- 为后续更稳定的壁纸缓存打下基础。

### English

**Summary**: Migrated wallpaper storage from localStorage to IndexedDB.

**Details**

- Stores wallpaper data in IndexedDB to avoid large images occupying localStorage.
- Built a more stable foundation for wallpaper caching.

## v2.2.3

### 中文

**摘要**：支持本地壁纸上传，并优化搜索引擎切换体验。

**更新内容**

- 用户可以上传本地图片作为新标签页壁纸。
- 改善搜索引擎切换流程，让设置体验更顺手。

### English

**Summary**: Added local wallpaper upload and improved search-engine switching.

**Details**

- Users can upload local images as new-tab wallpapers.
- Improved the search-engine switching flow for a smoother settings experience.

## v1.2.0

### 中文

**摘要**：PlainTab 首次成型，从单页原型演进为完整浏览器扩展。

**更新内容**

- 引入壁纸系统与新标签页基础交互。
- 提供 16 种语言界面与 Chrome i18n 本地化支持。
- 添加 MIT 许可证，明确项目开源使用方式。

### English

**Summary**: PlainTab's first complete release, evolving from a single-page prototype into a full browser extension.

**Details**

- Added the wallpaper system and basic new-tab interactions.
- Provided a 16-language interface with Chrome i18n localization support.
- Added the MIT license to clarify open-source usage.
