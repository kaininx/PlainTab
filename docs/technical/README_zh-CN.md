<p align="center">
  <img src="../../icon/icon2048.png" alt="PlainTab Logo" width="88">
</p>

<h1 align="center">PlainTab 技术说明</h1>

<p align="center">
  面向维护者的 PlainTab 运行时、存储、壁纸、设置和扩展边界说明。
</p>

<p align="center">
  <a href="README_en.md">English</a>
  ·
  <a href="../README_zh-CN.md">中文介绍</a>
  ·
  <a href="../../README.md">项目 README</a>
  ·
  <a href="../RELEASE_NOTES.md">详细更新说明</a>
  ·
  <a href="https://plaintab.kaininx.workers.dev">在线体验</a>
</p>

<div align="center">
  <img src="../../imgs/chrome_01.jpg" width="45%" alt="PlainTab 截图 1" />
  <img src="../../imgs/chrome_02.jpg" width="45%" alt="PlainTab 截图 2" />
</div>

## 读这份文档前

这不是商店介绍，也不是完整 API 手册。它更像维护者入口：在你修改 PlainTab 的启动、壁纸、存储、设置、搜索或命令面板之前，应该先看这份文档。

它主要说明：

- 新标签页打开时为什么能尽量快地显示壁纸；
- 哪些文件负责哪些事情；
- 数据存在哪里，切换壁纸来源时如何避免破坏稳定状态；
- 哪些项目约束是产品体验的一部分，而不是个人偏好；
- 常见改动应该如何验证。

如果你只是想试用 PlainTab，先看 [项目 README](../../README.md) 就够了。如果你想学习、二次开发或参与维护，从这里开始更合适。

## 改动地图

| 你想改... | 先看 | 同时阅读 |
|-----------|------|----------|
| 首屏显示 / 白屏闪烁 | [index.html](../../index.html)、[js/preload.js](../../js/preload.js)、[js/wallpaper/show.js](../../js/wallpaper/show.js) | [.claude/rules/00-core.md](../../.claude/rules/00-core.md)、[.claude/rules/20-wallpaper.md](../../.claude/rules/20-wallpaper.md) |
| 壁纸显示或切换动画 | [js/wallpaper/show.js](../../js/wallpaper/show.js)、[css/wallpaper.css](../../css/wallpaper.css) | [.claude/rules/20-wallpaper.md](../../.claude/rules/20-wallpaper.md) |
| 壁纸来源配置 | [js/settings-wallpaper.js](../../js/settings-wallpaper.js)、[js/wallpaper/apply.js](../../js/wallpaper/apply.js)、[js/wallpaper/data.js](../../js/wallpaper/data.js) | [.claude/rules/60-settings.md](../../.claude/rules/60-settings.md)、[.claude/rules/20-wallpaper.md](../../.claude/rules/20-wallpaper.md) |
| Bing / RSS / API / Wallhaven 拉取 | [js/wallpaper/fetch.js](../../js/wallpaper/fetch.js) | [.claude/rules/20-wallpaper.md](../../.claude/rules/20-wallpaper.md) |
| 本地文件夹壁纸 | [js/wallpaper/folder.js](../../js/wallpaper/folder.js) | [.claude/rules/20-wallpaper.md](../../.claude/rules/20-wallpaper.md) |
| 搜索行为 | [js/newtab.js](../../js/newtab.js)、[css/search.css](../../css/search.css) | [.claude/rules/50-search.md](../../.claude/rules/50-search.md) |
| 设置界面 | [js/settings-bootstrap.js](../../js/settings-bootstrap.js)、[js/settings-panel.js](../../js/settings-panel.js)、[css/settings.css](../../css/settings.css) | [.claude/rules/60-settings.md](../../.claude/rules/60-settings.md) |
| 命令面板 | [js/command-palette.js](../../js/command-palette.js)、[css/command-palette.css](../../css/command-palette.css) | [.claude/rules/70-command-palette.md](../../.claude/rules/70-command-palette.md) |
| 运行时语言 | [js/languages.js](../../js/languages.js)、[js/i18n/](../../js/i18n/) | [.claude/rules/30-language.md](../../.claude/rules/30-language.md) |
| 扩展清单文案 | [_locales/](../../_locales/)、[manifest.json](../../manifest.json) | [.claude/rules/30-language.md](../../.claude/rules/30-language.md) |

## 项目形态

PlainTab 是一个 Chrome / Edge Manifest V3 新标签页扩展，也可以直接打开 [index.html](../../index.html) 作为独立网页运行。

这些约束都是有意保留的：

- 没有 `npm`，没有 `package.json`，没有打包工具；
- 不使用 React、Vue、Tailwind 或其他前端框架；
- 使用原生 JavaScript、CSS 和浏览器 API；
- 扩展模式和网页模式共用同一套代码；
- 新标签页打开的体感优先于形式上的架构优雅；
- 可见界面应该保持安静，以壁纸为中心。

所以 PlainTab 的代码会比现代框架项目更直接：HTML 控制脚本顺序，CSS 按功能拆分，运行时模块通过 `window` 命名空间协作。这不是历史包袱，而是为了让项目不用构建系统也能被直接阅读、运行和发布。

## 启动链路

PlainTab 最重要的路径，是新标签页打开时第一眼看到的壁纸。[index.html](../../index.html) 里的顺序属于产品行为：

1. `#wallpaperBack` 先进入 DOM。
2. [js/preload.js](../../js/preload.js) 同步执行。
3. `#wallpaperFront` 再进入 DOM。
4. 其余页面 DOM 随后出现。
5. [js/languages.js](../../js/languages.js) 加载。
6. 壁纸、设置 bootstrap、notice、theme、命令面板和主运行时脚本随后加载。

[js/preload.js](../../js/preload.js) 只做一件事：同步读取 `localStorage` 中的 `ptab_wallpaper_preview`，如果可用，就写入 `#wallpaperBack.style.backgroundImage`。

它不能：

- 访问 IndexedDB；
- 请求网络；
- 加载 i18n；
- 生成缩略图；
- 扫描文件夹；
- 使用 Canvas；
- 等待异步回调；
- 依赖主运行时模块。

只要这个文件变重，用户打开新标签页时就更容易看到空白等待。把它当成热路径，而不是工具函数仓库。

## 壁纸渲染

壁纸显示由 [js/wallpaper/show.js](../../js/wallpaper/show.js) 负责。页面使用两层壁纸：

| 层 | 作用 |
|----|------|
| `#wallpaperBack` | 稳定显示当前画面，也接收启动预览 |
| `#wallpaperFront` | 新图准备好后淡入，过渡完成后把画面交回 back 层（稳定层） |

核心不变量很简单：至少有一层应该保持可见内容。图片加载失败、解码失败、来源刷新失败或过渡失败，都不应该清空当前稳定壁纸。

`WallpaperShow` 暴露的主要能力：

- `apply(url, transitionMs, sourceId)`：加载并淡入新图。
- `applyAndSavePreview(url, sourceId)`：应用新图并生成下次启动预览。
- `thumbnail(source)`：生成普通缩略图。
- `blurredThumbnail(source, blur)`：生成模糊缩略图。
- `showPreparedPreview(preview)`：直接显示已准备好的预览图。
- `showPreparedUrl(url, id)`：直接显示已准备好的图片 URL。

其他模块应该把准备好的 URL 或来源结果交给 `WallpaperShow`，不要直接管理两层 DOM 的生命周期。

## 壁纸来源

当前壁纸来源类型：

| 来源 | 主要文件 | 说明 |
|------|----------|------|
| Bing | [js/wallpaper/fetch.js](../../js/wallpaper/fetch.js)、[js/wallpaper/data.js](../../js/wallpaper/data.js) | 默认网络来源，按日期缓存 |
| 上传 | 设置模块、[js/wallpaper/data.js](../../js/wallpaper/data.js) | 用户图片保存为 Blob 和缩略图 |
| 文件夹 | [js/wallpaper/folder.js](../../js/wallpaper/folder.js) | File System Access API，依赖用户授权的 handle |
| RSS | [js/wallpaper/fetch.js](../../js/wallpaper/fetch.js)、[js/wallpaper/data.js](../../js/wallpaper/data.js) | 解析 feed，缓存可用图片 |
| API | [js/wallpaper/fetch.js](../../js/wallpaper/fetch.js)、[js/wallpaper/data.js](../../js/wallpaper/data.js) | 支持图片直链和 JSON 图片字段 |
| Wallhaven | [js/wallpaper/fetch.js](../../js/wallpaper/fetch.js)、[js/wallpaper/data.js](../../js/wallpaper/data.js) | 搜索 Wallhaven，并缓存有限数量的图片 |
| 视频 | 设置和运行时模块 | 用户选择的视频壁纸路径；要继续遵守启动和兜底规则 |

所有图片类来源最终都应该走同一套显示层。无论图片来自网络、上传、文件夹、RSS、API 还是 Wallhaven，最终都应该进入 `WallpaperShow`。

失败策略：

- 当前来源失败时，不清空当前壁纸；
- 能用旧缓存就继续用旧缓存；
- 新来源应用失败时，保留旧的稳定状态；
- 切换来源或清理缓存可能有破坏性时，让用户确认；
- 只有新来源提交并重载稳定后，才清理旧来源数据。

## 来源应用安全

壁纸来源切换由 [js/wallpaper/apply.js](../../js/wallpaper/apply.js) 协调。它是设置草稿和真实壁纸状态之间的“事务边界”。

它负责：

- 验证本次 work order；
- 准备新来源需要的数据；
- 准备成功后才提交来源模型；
- 提交后重载壁纸；
- 重载失败时恢复旧 model；
- 新状态稳定后才清理旧来源数据。

因此，壁纸设置不要直接写 provider 状态。一次来源切换可能涉及网络测试、本地权限、Blob 写入、预览生成和缓存删除，这些步骤必须按顺序发生。

## 壁纸数据

壁纸数据入口在 [js/wallpaper/data.js](../../js/wallpaper/data.js)。这个模块拥有壁纸相关的 `localStorage` 和 IndexedDB 访问。

| 存储 | 主要用途 |
|------|----------|
| `localStorage` | 小配置、预览图、缩略图、UI 状态、当前来源模型 |
| IndexedDB | Bing / API / 上传 / RSS / Wallhaven 等大图 Blob，以及文件夹 handle |

启动预览必须留在 `localStorage`，因为 `preload.js` 需要同步读取。完整大图太大，不应该进入首屏路径，应放在 IndexedDB。

常见 key：

- `ptab_wallpaper_preview`：启动预览。
- `ptab_wallpaper`：壁纸来源模型。
- `ptab_wallpaper_thumbs`：缩略图缓存。
- `ptab_wallpaper_blur_thumbs`：模糊缩略图缓存。
- `ptab_ui`：搜索、外观和壁纸显示偏好。
- `ptab_shortcuts`：命令面板链接和设置。
- `ptab_shortcut_icons`：快捷链接图标缓存。

存储安全规则：

- 写入时，先写大数据，再写引用；
- 删除时，先移除引用，再删大数据；
- Blob URL 不再需要时要释放。

## 设置系统

设置系统主要分三层：

| 层 | 文件 | 作用 |
|----|------|------|
| 轻量入口 | [js/settings-bootstrap.js](../../js/settings-bootstrap.js) | 快速面板入口、当前来源、上传入口、GitHub/about 信息 |
| 完整设置外壳 | [js/settings-panel.js](../../js/settings-panel.js) | 分页、布局、界面/搜索/数据/about 流程、共享设置协调 |
| 壁纸工作区 | [js/settings-wallpaper.js](../../js/settings-wallpaper.js) | 来源导航、运行状态、草稿工作区、应用/恢复默认事件绑定 |

轻量入口必须保持轻。它在页面中经常可用，不应该把完整设置逻辑提前塞进启动体验。

完整设置里有两种保存模型：

- UI 偏好即时保存，例如搜索栏位置、透明度、圆角、壁纸适配。
- 壁纸来源使用草稿，只有点击“应用配置”后才变成真实状态。

草稿模型是有意设计的。壁纸改动可能需要网络检查、文件夹权限、Blob 写入、来源清理或失败恢复。

## Notice 和主题 UI

[js/app-notice.js](../../js/app-notice.js) 通过 `window.PlainTabNotice` 提供全局 confirm、alert 和 toast。需要确认或短提示的流程，优先使用这些共享表面，不要各自写一套临时对话框。

[js/theme.js](../../js/theme.js) 通过 `window.PlainTabTheme` 管理 CSS 主题变量别名和自定义强调色。壁纸取色在 [js/wallpaper/theme.js](../../js/wallpaper/theme.js)，全局主题变量写入和别名管理在 `js/theme.js`。

共享视觉 token 应集中在 CSS 变量里。优先通过 class 或 attribute 切换状态，减少 JS 动态写样式。

## 搜索栏

搜索栏结构在 [index.html](../../index.html)，样式在 [css/search.css](../../css/search.css)，运行时主要由 [js/newtab.js](../../js/newtab.js) 和设置模块控制。

支持能力：

- 显示模式：始终显示、悬停显示、隐藏；
- 位置、宽度、圆角、背景透明度和模糊可调；
- 搜索历史可选；
- 网页模式支持多个搜索引擎；
- 扩展模式下隐藏不适合扩展环境的引擎切换入口。

搜索设置保存在 `ptab_ui.search`。

## 命令面板

命令面板由 [js/command-palette.js](../../js/command-palette.js) 实现，样式在 [css/command-palette.css](../../css/command-palette.css)。

它是懒加载模块。用户不打开命令面板时，完整逻辑不应该进入首屏路径。

主要能力：

- 添加、编辑、删除快捷链接；
- 普通空间和隐藏空间分离；
- 最近访问；
- 书签 HTML 导入；
- 快捷链接导出；
- 列表视图和图标视图；
- 自定义快捷键。

命令面板只拥有快捷链接。完整配置导入/导出属于设置面板的数据页。

## 数据备份

数据页支持：

- 明文 JSON 导出；
- 加密备份导出；
- 配置导入。

备份主要包含用户配置：界面偏好、壁纸配置、快捷链接、快捷键和搜索设置。

它不会完整带走：

- IndexedDB 里的大图 Blob；
- 本地文件夹授权；
- 用户磁盘上的原始文件。

这是刻意边界。跨设备恢复时，本地资源应该由用户重新选择；否则备份会变重，也更脆弱。

## 国际化

PlainTab 有两套 i18n：

| 位置 | 用途 |
|------|------|
| [_locales/](../../_locales/) | Chrome / Edge 扩展清单文案 |
| [js/languages.js](../../js/languages.js) 和 [js/i18n/](../../js/i18n/) | 页面运行时 UI 文案 |

新增运行时 UI 文案时，不要只改一个语言。`en` 和 `zh-CN` 要重点维护，已经发布的每个运行时语言包都应保持 key 完整。

## 运行模式

PlainTab 有两种运行方式：

| 模式 | 入口 | 说明 |
|------|------|------|
| 扩展模式 | Chrome / Edge 新标签页 | `manifest.json` 接管浏览器新标签页 |
| 网页模式 | 直接打开 `index.html` | 可作为在线起始页或本地网页使用 |

代码需要处理环境差异：

- `chrome.runtime` 不一定存在；
- 扩展 API 不能在普通网页里使用；
- 文件夹访问取决于浏览器支持；
- 可选主机权限只在扩展模式有意义；
- web 模式和 `file://` 可能拒绝本地 WASM fetch，所以 JS 回退路径必须可用。

## 主题色引擎

壁纸主题色由 [js/wallpaper/theme.js](../../js/wallpaper/theme.js) 提取。这不在启动热路径上。[js/wallpaper/show.js](../../js/wallpaper/show.js) 会在壁纸显示后，尽量放到动画帧和空闲阶段执行。

主题色提取有两条路径：

| 路径 | 文件 | 作用 |
|------|------|------|
| WASM | [js/wallpaper/theme_engine.wasm](../../js/wallpaper/theme_engine.wasm) | 默认优先的像素分析路径 |
| JS 回退 | [js/wallpaper/theme.js](../../js/wallpaper/theme.js) | 保证网页模式和异常环境可用 |

C++ 源码在 [wasm/theme_engine.cpp](../../wasm/theme_engine.cpp)，构建脚本在 [wasm/build.bat](../../wasm/build.bat) 和 [wasm/build.sh](../../wasm/build.sh)。Windows 下运行：

```powershell
.\wasm\build.bat
```

会生成扩展运行时加载的 `js/wallpaper/theme_engine.wasm`。

扩展模式下，[manifest.json](../../manifest.json) 必须保留：

```text
script-src 'self' 'wasm-unsafe-eval'
```

这是 Chrome MV3 扩展页加载 WebAssembly 的要求。

## 目录结构

```text
PlainTab/
├── index.html              # 页面入口，脚本顺序很重要
├── manifest.json           # Manifest V3 扩展配置
├── 404.html                # 静态部署回退
├── css/
│   ├── base.css            # 全局基础样式和变量
│   ├── wallpaper.css       # 壁纸层、画廊、RSS 摘要
│   ├── search.css          # 搜索栏和历史候选
│   ├── settings.css        # 设置面板
│   └── command-palette.css # 命令面板
├── js/
│   ├── preload.js          # 启动预览热路径
│   ├── languages.js        # UI i18n bootstrap
│   ├── app-notice.js       # 共享 confirm、alert、toast
│   ├── theme.js            # 全局 CSS 主题 alias
│   ├── newtab.js           # 主运行时
│   ├── settings-bootstrap.js
│   ├── settings-panel.js
│   ├── settings-wallpaper.js
│   ├── command-palette.js
│   └── wallpaper/
│       ├── apply.js        # 来源应用事务边界
│       ├── data.js         # 存储和数据模型
│       ├── show.js         # 壁纸显示和缩略图
│       ├── fetch.js        # 网络壁纸来源
│       ├── folder.js       # 本地文件夹来源
│       ├── theme.js        # 壁纸主题色提取
│       └── theme_engine.wasm
├── wasm/
│   ├── theme_engine.cpp
│   ├── build.bat
│   └── build.sh
├── _locales/               # 扩展清单 i18n
├── docs/                   # 文档、发布说明、AI 任务记录
├── icon/                   # 图标
└── imgs/                   # 截图和商店素材
```

## 开发约束

改代码时请遵守这些约束：

- 不引入 npm、`package.json`、构建工具或前端框架；
- 不随意扩大扩展权限；
- 不把网络、IndexedDB、Canvas、i18n 或文件夹扫描放进 `preload.js`；
- 不改变 `index.html` 中壁纸层和 `preload.js` 的关键顺序；
- 壁纸切换时不要同时清空 back/front 两层；
- 壁纸存储访问使用 `WallpaperData`；
- 可能影响存储状态的来源切换使用 `WallpaperApply`；
- 大数据和引用写入要按正确顺序；
- 新增设置要考虑默认值、导入导出、恢复默认和 i18n；
- 命令面板逻辑不要进入首屏同步路径；
- 可见页面保持安静，不要变成信息流或组件墙。

如果你不确定某个模块的规则，先读 [.claude/rules/](../../.claude/rules/) 下的对应文件。那里记录的是当前实现约束。

## 验证

只改文档时：

```powershell
git diff --check -- docs/technical
```

改 JavaScript 时：

```powershell
Get-ChildItem -Recurse js -Include *.js | ForEach-Object { node --check $_.FullName }
```

改运行时 i18n 时：

```powershell
Get-ChildItem js\i18n\*.js | ForEach-Object { node --check $_.FullName }
node --check js\languages.js
```

改壁纸或设置行为时，还要手动或用 Playwright 验证：

- 首次打开能看到壁纸，不是空白页；
- 来源切换失败时不会清空当前稳定壁纸；
- 设置草稿在应用前不会持久化；
- 扩展模式和网页模式都能打开。

## AI 协作说明

PlainTab 是一个大量使用 AI 协作推进的项目。值得学习的不只是代码，还有工作方式：

- 用文档约束 AI 修改边界；
- 用规则文件保存模块不变量；
- 用任务记录保存复杂改动的设计和验证；
- 让 AI 参与实现、重构、文档、测试脚本和发布准备。

相关文件：

- [AGENTS.md](../../AGENTS.md)：共享 AI 工作入口。
- [.claude/rules/](../../.claude/rules/)：模块规则。
- [docs/ai-tasks/](../ai-tasks/)：AI 任务记录和验证脚本。

如果你想看 AI 如何参与真实项目，而不是一次性 demo，PlainTab 值得拆开研究。

## 附录：主题色引擎性能数据

以下数据来自扩展模式、本地壁纸 `少女-绿感.png`、50 轮 benchmark。当前 WASM/JS 对比使用同样的 `96x96` 采样，也就是 9216 个像素。

| 项目 | 耗时 |
|------|------|
| Canvas `getImageData`，96x96 | 0.638 ms |
| WASM 首次分析/初始化 | 0.600 ms |
| WASM 分析，96x96 | 0.210 ms |
| WASM 总耗时，取像素 + 分析 | 0.848 ms |
| JS 分析，96x96 | 0.376 ms |
| JS 总耗时，取像素 + 分析 | 1.014 ms |
| 旧版 JS 36x36 总耗时 | 0.138 ms |

结论：

- 同样 `96x96` 输入下，WASM 分析约为 JS 的 `1.79x`。
- 算上 Canvas 取像素后，整体约为 `1.20x`。
- 旧版 `36x36` 仍然更快，因为只处理 1296 个像素。
- 当前设计用不到 1 ms 的总成本，换来更高分辨率、更稳定的调色板。

## 快速开始

扩展模式：

1. 打开 `chrome://extensions`。
2. 启用开发者模式。
3. 选择“加载已解压的扩展程序”。
4. 选择 PlainTab 项目目录。

网页模式：

直接用浏览器打开 [index.html](../../index.html)。

在线体验：

[plaintab.kaininx.workers.dev](https://plaintab.kaininx.workers.dev)

## 相关链接

- [英文技术说明](README_en.md)
- [项目 README](../../README.md)
- [中文介绍](../README_zh-CN.md)
- [详细更新说明](../RELEASE_NOTES.md)
- [Chrome Web Store](https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo)
- [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/plaintab-%C2%B7-%E6%9E%81%E7%AE%80%E6%96%B0%E6%A0%87%E7%AD%BE%E9%A1%B5/liljpbjkhafejhcidneknjokfcaiebem)
- [GitHub 项目主页](https://github.com/kaininx/PlainTab)

## 许可

PlainTab 使用 [MIT License](../../LICENSE) 开源。
