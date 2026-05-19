# 搜索规则

## 所有权

- `js/newtab.js` 拥有搜索执行和搜索历史交互。
- `js/settings-panel.js` 拥有搜索设置 UI，并应用样式/配置变化。
- `js/wallpaper/data.js` 在 `ptab_ui.search` 下持久化搜索配置，并归一化搜索历史。

## 当前配置

`ptab_ui.search` 当前包含：

- `visibility`：`always`、`hover` 或 `never`；默认 `always`。
- `engine`：`google`、`bing`、`baidu` 或 `duckduckgo`；默认 `google`。
- `position`：垂直位置预设，如 `edge-top`、`top`、`upper`、`center-upper`、`center`、`center-lower`、`lower`、`bottom`、`edge-bottom`。
- `align`：`left`、`center` 或 `right`。
- `iconPosition`：`left` 或 `right`；默认 `right`。
- `iconVisibility`：`always` 或 `hidden`；默认 `always`。
- `surface`：`light`、`glass`、`theme`、`solid`、`outline` 或 `clean`；默认 `glass`。
- `shadow`：`none`、`soft` 或 `standard`；默认 `standard`。
- `radius`：`capsule`、`rounded` 或 `sharp`；默认 `capsule`。
- `width`、`backgroundOpacity`、`blur`。
- `placeholder`：用户自定义 placeholder；为空时使用本地化默认文案。
- `enterBehavior`：`current` 或 `newtab`；默认 `current`。
- `historyLimit`：`0`、`5` 或 `10`；默认 `5`。
- `historyItems`：去重后的搜索历史。

## 搜索图标

- 搜索图标显示只有两种模式：显示和隐藏。
- 不要重新引入“仅聚焦时显示”。
- 网页模式下，图标可以点击切换搜索引擎。如果图标隐藏，不能留下不可见但可点击的命中区域。
- 扩展模式下，图标是静态搜索提示，不应切换引擎。

## 搜索执行

- 空 query 不做任何事。
- 成功搜索前先写入搜索历史。
- 扩展模式可用时使用 `chrome.search.query({ text, disposition })`。
- 网页模式根据回车行为用 `_self` 当前页打开，或 `_blank` 新标签页打开。
- 当前页搜索是默认行为。

## 搜索历史

- 历史面板懒创建在 `#searchBar` 下。
- 支持按输入过滤、方向键选择、Enter 搜索选中项、Escape 关闭、blur 延迟关闭，以及根据视口自动选择上方/下方位置。
- `historyLimit = 0` 时禁用展示和保存。

## 视觉规则

- 搜索样式应由 attribute/class 和 CSS 变量驱动，不要到处写 inline style。
- 字体缩放使用 `--app-font-size`、`--app-font-scale` 和 `html[data-font-scale]`。
- placeholder 自定义必须立即更新当前输入框，并持久化到 `ptab_ui.search.placeholder`。
