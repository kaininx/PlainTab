<p align="center">
  <img src="../icon/icon2048.png" alt="PlainTab Logo" width="92">
</p>

<h1 align="center">PlainTab</h1>

<p align="center">
  一个快速、安静、以壁纸为中心的 Chrome / Edge 新标签页。
</p>

<p align="center">
  <a href="../README.md">English</a>
  ·
  <a href="https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo">Chrome 网上应用店</a>
  ·
  <a href="https://plaintab.kaininx.workers.dev">在线体验</a>
  ·
  <a href="technical/README_zh-CN.md">技术说明</a>
  ·
  <a href="changelog-i18n/zh-CN.txt">更新日志</a>
</p>

<p align="center">
  <a href="../LICENSE"><img src="https://img.shields.io/badge/license-MIT-yellow?style=flat-square" alt="MIT License"></a>
  <img src="https://img.shields.io/badge/version-3.2.1-111827?style=flat-square" alt="Version 3.2.1">
  <img src="https://img.shields.io/badge/Manifest-V3-4285f4?style=flat-square&logo=googlechrome" alt="Manifest V3">
  <img src="https://img.shields.io/badge/No_Build_Step-00a884?style=flat-square" alt="无需构建">
  <img src="https://img.shields.io/badge/Vanilla-JS-f7df1e?style=flat-square&logo=javascript&logoColor=111827" alt="原生 JavaScript">
</p>

<div align="center">
  <img src="../imgs/chrome_01.png" width="45%" alt="PlainTab 截图 1" />
  <img src="../imgs/chrome_02.png" width="45%" alt="PlainTab 截图 2" />
  <br>
  <img src="../imgs/chrome_03.png" width="45%" alt="PlainTab 截图 3" />
  <img src="../imgs/chrome_04.png" width="45%" alt="PlainTab 截图 4" />
</div>

## PlainTab 是什么

PlainTab 是一个基于 Manifest V3 的 Chrome / Edge 新标签页扩展。安装后，它会把默认新标签页替换成一张干净的壁纸、一个可调整的搜索栏，以及一套需要时才出现的快捷链接。

它适合想要一个清爽浏览器起始页的人：没有新闻流，没有推广卡片，没有账号系统，也没有满屏小组件。打开新标签页，看一眼壁纸，搜索或输入网址，然后继续做自己的事。

同一套页面也可以直接作为网页运行：用浏览器打开 `index.html` 就能体验。因此它也很适合阅读、修改和学习。

## 先试试看

### 安装扩展

[在 Chrome 网上应用店安装 PlainTab](https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo)

### 打开在线演示

[plaintab.kaininx.workers.dev](https://plaintab.kaininx.workers.dev)

### 本地运行

```bash
git clone https://github.com/kaininx/PlainTab.git
```

扩展模式：

1. 打开 `chrome://extensions`。
2. 启用“开发者模式”。
3. 选择“加载已解压的扩展程序”。
4. 选择 PlainTab 项目目录。

网页模式：

直接用浏览器打开 `index.html`。

不需要安装依赖，不需要包管理器，也不需要构建。

## 为什么选择 PlainTab

### 壁纸优先，尽量少等空白

PlainTab 很在意“打开新标签页时马上有画面”的体验。它会在 `localStorage` 中保存一个轻量的启动预览，让页面先把壁纸显示出来，再把更完整的壁纸加载、缓存和主题色计算交给运行时慢慢处理。

也就是说，这个项目把“体感速度”当成产品体验的一部分，而不是只看跑分数字。

### 默认安静

主页只保留壁纸、搜索、少量控制入口，不主动抢你的注意力。快捷链接、隐藏空间、设置、备份和更深入的壁纸选项都在，但它们不会默认摊开在页面上。

### 壁纸来源灵活

你可以使用 Bing 每日壁纸、Wallhaven、上传图片、本地文件夹、RSS 图片源、自定义图片 API，或者视频壁纸。只想每天换一张图时，它可以很简单；想慢慢折腾自己的壁纸系统时，也有足够空间。

### 搜索和快捷链接不占地方

搜索栏支持位置、大小、圆角、透明度、显示方式、搜索历史和搜索引擎行为调整。快捷链接放在命令面板里，可以搜索、添加、编辑、导入和隐藏，不会把新标签页变成一整屏图标。

## 功能

| 功能 | 说明 |
|------|------|
| 新标签页替换 | 安装后接管浏览器的新标签页 |
| 独立网页模式 | 不打包扩展也能直接从 `index.html` 运行 |
| 快速壁纸启动 | 通过早期预览路径减少新标签页空白闪烁 |
| Bing 壁纸 | 支持 Bing 每日壁纸 |
| Wallhaven 壁纸 | 支持基于 Wallhaven 的壁纸浏览和设置 |
| 本地壁纸 | 支持上传图片、图库管理和本地文件夹选择 |
| RSS / API 壁纸 | 支持接入自定义图片源和图片 API |
| 视频壁纸 | 支持选择视频作为壁纸 |
| 搜索栏 | 可调整位置、大小、样式、透明度和显示方式 |
| 搜索历史 | 可保存最近搜索，也可以关闭 |
| 命令面板 | 用可搜索、可编辑的方式管理快捷链接，不占主页 |
| 隐藏空间 | 保存想要随时访问、但不想展示出来的链接 |
| 设置面板 | 管理界面、壁纸、快捷键、数据和语言 |
| 备份与恢复 | 支持导入、导出和加密备份流程 |
| 多语言界面 | 内置 16 种界面语言 |
| AI 协作记录 | 保留 AI 辅助开发过程中的文档和任务记录 |

<div align="center">
  <img src="../imgs/chrome_05.png" width="45%" alt="PlainTab 设置截图 1" />
  <img src="../imgs/chrome_06.png" width="45%" alt="PlainTab 设置截图 2" />
</div>

## 给开发者

PlainTab 有意保持技术栈朴素：

- 原生 JavaScript、CSS 和浏览器 API。
- 没有 `npm`，没有 `package.json`，没有前端框架，也没有打包工具。
- 扩展模式和独立网页模式共用同一套代码。
- `manifest.json` 管理 Manifest V3 扩展配置。
- 运行时脚本由 `index.html` 直接按顺序加载。

建议从这些地方开始看：

- [中文技术说明](technical/README_zh-CN.md)：架构、启动路径和模块职责。
- [详细更新说明](RELEASE_NOTES.md)：功能演进记录。
- [内存与存储诊断](ai-tasks/20260519-memory-storage-diagnostic-report.md)：壁纸缓存和存储增长边界。
- [AI Agent 协作说明](../AGENTS.md)：项目约束和维护规则。

这些区域改动时要格外小心：

- 启动路径经过专门设计，用来减少新标签页白屏闪烁。
- 壁纸渲染使用稳定的 back 层和过渡用的 front 层。
- 大体积壁纸数据需要通过存储模块和 IndexedDB 管理。
- 除非有迁移逻辑，否则要保持 localStorage key 兼容。
- 扩展权限需要继续符合 Chrome 网上应用店的审核预期。

## 项目结构

```text
PlainTab/
├── index.html              # 新标签页和独立网页入口
├── manifest.json           # Chrome / Edge 扩展清单
├── css/                    # 按功能拆分的页面样式
├── js/                     # 运行时模块
├── js/wallpaper/           # 壁纸渲染、来源和主题色提取
├── wasm/                   # 壁纸主题引擎的源码和构建脚本
├── _locales/               # Chrome 扩展 i18n 文案
├── docs/                   # 用户文档、发布说明、技术说明和任务记录
├── icon/                   # 扩展图标
└── imgs/                   # 截图和商店素材
```

## PlainTab 不打算做什么

PlainTab 会继续保持克制。下面这些功能不在当前方向里：

- 新闻流、热榜或推荐内容。
- 开屏广告、赞助卡片或推广位。
- 大面积天气、日历或待办面板。
- 账号系统、社交功能或云端内容流。
- 把几十个快捷方式固定铺满主页。
- 自动播放的推广内容。

Safari 版本目前也没有计划。对个人项目来说，它需要额外的发布和维护成本，现阶段不太现实。

## AI 协作与学习

PlainTab 在编码、文档、重构、发布准备和诊断过程中大量使用了 AI 协作。它不是一个只做给人看的演示项目，而是一个完整的新标签页扩展：有真实界面、持久化设置、导入导出、壁纸存储、多语言界面，也同时支持扩展环境和网页环境。

如果你想学习这些内容，它会是一个不错的样本：

- 浏览器新标签页扩展是怎么做出来的；
- 不用前端框架的小型项目如何组织；
- AI 辅助开发如何留下可回顾、可审查的记录；
- 产品上的克制如何影响技术决策。

## 路线图

PlainTab 后续可能继续往这些方向完善：

- 更稳定的壁纸来源。
- 更顺手的设置和壁纸配置流程。
- 更清晰的技术文档和代码说明。
- 更完整的 AI 辅助开发记录。
- 如果扩展 API 和维护成本允许，未来可能支持 Firefox。

## 参与贡献

欢迎提交 Issue 和 Pull Request，尤其是浏览器兼容性、壁纸来源、文档和小范围界面优化相关的改进。

在修改启动、壁纸、存储、搜索、设置或命令面板行为前，请先阅读 [AGENTS.md](../AGENTS.md) 和 `.claude/rules/` 下的相关规则。PlainTab 的打开体验比较敏感，建议优先做小而聚焦的改动。

## 语言

<details>
<summary>README 翻译</summary>

- [English](../README.md)
- 简体中文
- [繁體中文](README_zh-TW.md)
- [हिन्दी](README_hi.md)
- [Español](README_es.md)
- [العربية](README_ar.md)
- [Français](README_fr.md)
- [Português](README_pt_BR.md)
- [Русский](README_ru.md)
- [Deutsch](README_de.md)
- [日本語](README_ja.md)
- [Italiano](README_it.md)
- [Türkçe](README_tr.md)
- [Tiếng Việt](README_vi.md)
- [한국어](README_ko.md)
- [Polski](README_pl.md)

</details>

## 相关链接

- [更新日志](changelog-i18n/zh-CN.txt)
- [详细更新说明](RELEASE_NOTES.md)
- [中文技术说明](technical/README_zh-CN.md)
- [内存与存储诊断](ai-tasks/20260519-memory-storage-diagnostic-report.md)
- [在线体验](https://plaintab.kaininx.workers.dev)
- [Chrome 网上应用店](https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo)
- [GitHub 项目主页](https://github.com/kaininx/PlainTab)

## 许可

PlainTab 基于 [MIT License](../LICENSE) 开源。

由 [Kaelri](https://github.com/kaininx) 创建和维护。
