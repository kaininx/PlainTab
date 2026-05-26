# PlainTab 规则索引

本目录是 PlainTab 的当前规则源。AI agent 修改代码前，应先阅读根目录 `AGENTS.md`，再按任务类型阅读这里的规则文件。

这些规则描述的是**当前实现**，不是早期设计稿。若规则和代码不一致，当前任务先以代码为准，然后把规则同步回来，避免错误继续传下去。

## 优先级地图

1. `00-core.md`  
   全局约束、范围控制、首屏启动不变量和验证要求。
2. `10-storage.md`  
   `localStorage`、IndexedDB、schema 基线、配置模型、导入导出和恢复默认。
3. `20-wallpaper.md`  
   壁纸渲染、来源生命周期、Bing/RSS/API/文件夹/上传、网络超时和图片缓存安全。
4. `30-language.md`  
   运行时 i18n 包、语言检测、fallback 边界和验证流程。
5. `40-runtime.md`  
   启动顺序、懒加载、全局键鼠交互和面板协调。
6. `50-search.md`  
   搜索栏配置、搜索引擎、历史记录、图标显示，以及扩展/网页模式差异。
7. `60-settings.md`  
   设置面板分页、壁纸草稿/应用模型、分区恢复默认和来源抽屉交互。
8. `70-command-palette.md`  
   命令面板数据模型、快捷键、皮肤、快捷链接管理、导入导出和标题抓取。
9. `90-storage-history.md`  
   历史说明，只作参考。当前存储行为以 `10-storage.md` 和代码为准。

## 当前快照

- PlainTab 是 Chrome/Edge Manifest V3 新标签页扩展，也可以直接打开 `index.html` 作为网页运行。
- 项目使用原生 JavaScript、CSS、静态资源、`localStorage` 和 IndexedDB。不要引入 npm、构建工具、前端框架、lint/test 框架或大型运行时依赖。
- 当前存储基线是 `LS_VERSION = 3`、`BASELINE_APP_VERSION = 3.2.3`、IndexedDB `PlainTab` v1。
- 当前设置页包含：界面、搜索、壁纸、命令面板、权限、数据、恢复、关于。
- 主要持久化模型仍是扁平 key：`ptab_ui`、`ptab_wallpaper`、`ptab_shortcuts`，以及缩略图/缓存相关 key。除非任务明确要求重做存储结构，否则不要发明新的分层总配置对象。
- 首屏路径固定：`#wallpaperBack`、同步 `js/preload.js`、`#wallpaperFront`，再加载其余 DOM 和运行时脚本。不要把网络、IndexedDB、canvas 或文件夹扫描放进这条路径。

## 维护规则

当任务改动了某个规则覆盖的行为，请在同一次改动里更新对应规则。规则应保持简短、事实化，并贴近当前代码。
