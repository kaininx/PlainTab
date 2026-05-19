# 运行时规则

## 入口流程

`index.html` 加载顺序：

1. CSS 和图标资源。
2. `#wallpaperBack`。
3. 同步 `js/preload.js`。
4. `#wallpaperFront` 和可见 UI DOM。
5. `js/languages.js`。
6. `js/wallpaper/data.js`、`show.js`、`folder.js`、`fetch.js`。
7. `js/settings-bootstrap.js`。
8. `js/newtab.js`。

`js/newtab.js` 是启动、壁纸加载、搜索执行、全局事件、设置 bootstrap 和命令面板加载的主编排者。

## 启动工作

- 首屏保持轻。
- 立即加载并应用当前最好的缓存壁纸。
- 网络刷新、文件夹扫描、面板预热、onboarding 提示、命令面板预热都放到启动之后，通常用 `requestIdleCallback` 加 timeout fallback。
- 初始壁纸可见前，不要加入阻塞性的 i18n、网络、存储工作。

## 设置协调

设置有两个表面：

- L1 角落面板，用于快速壁纸/上传入口。
- L2 完整设置模态窗口。

设置面板、语言面板或设置模态窗口打开时，全局交互不应误触其他表面。尤其：

- 设置/语言/模态表面活动时，双击和中键不应打开命令面板。
- document click 应关闭合适的表面，但不能破坏表面内部控件。
- `Escape` 根据当前上下文关闭设置/命令面板表面。

## 搜索运行时

- `newtab.js` 拥有搜索历史 UI、键盘导航和实际搜索执行。
- 扩展模式优先使用 `chrome.search.query`。
- 网页模式使用显式搜索引擎 URL。
- 回车行为从设置读取：默认当前页，配置后可新标签页。

## 壁纸运行时

- `newtab.js` 根据 `WallpaperData.getActiveSource()` 决定加载哪个来源。
- 即使当前不是 Bing，也可以后台刷新 Bing；但除非当前来源就是 Bing，否则不能切换可见模式。
- RSS/API 刷新检查必须遵守配置间隔和 state 时间戳。
- 来源失败时应使用缓存内容或回退 Bing，不能让两个壁纸层都空白。

## 命令面板运行时

- 命令面板在启动后懒预热。
- 普通快捷键默认 `ctrl+k`；隐藏空间快捷键默认 `ctrl+shift+k`。
- 鼠标快捷方式是 document 双击和中键，但设置表面活动时必须被阻止。

## 全局事件边界

- 避免无视 modal/panel/input 状态的宽泛全局 handler。
- 文本输入、自定义 select、按钮、设置模态内容、语言面板和命令面板内容应消费自己的交互。
- 优先用小 helper 判断表面状态，避免条件散落在各处。
