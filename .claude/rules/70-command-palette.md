# 命令面板规则

## 所有权

`js/command-palette.js` 拥有命令面板 UI、快捷链接增删改查、隐藏空间、命令终端行为、快捷链接导入导出和页面标题抓取。命令面板偏好的设置控件位于 `js/settings-panel.js`，并通过 `ptab_shortcuts.settings` 持久化。

## 数据模型

`ptab_shortcuts` 包含：

- `items`：可见快捷链接。
- `hidden`：隐藏快捷链接。
- `recents`：最近使用。
- `settings`：
  - `primaryHotkey`，默认 `ctrl+k`
  - `hiddenHotkey`，默认 `ctrl+shift+k`
  - `recommendEnabled`，默认 `true`
  - `viewMode`
  - `commandsCollapsed`，默认 `true`
  - `palettePlacement`，`follow` 或 `fixed`
  - `palettePosition`，保存的固定坐标或 `null`
  - `paletteSkin`，`default`、`terminal`、`shell` 或 `command-terminal`
  - `builtinGithubAdded`

快捷键/命令面板设置恢复默认时，恢复 settings，并补回可见的内置 GitHub 快捷链接及图标；不要删除其他用户快捷链接，除非用户明确执行快捷链接数据操作。

## 打开和定位

- 普通命令面板使用配置的普通快捷键打开。
- 隐藏空间使用配置的隐藏快捷键打开。
- document 双击和中键可用指针位置作为锚点打开面板。
- 设置面板、语言面板或设置模态窗口活动时，必须阻止这些鼠标快捷方式。
- `palettePlacement = follow` 跟随打开锚点；`fixed` 使用保存位置。

## 命令

普通命令条包含 add、edit、delete、hide、recent、import、export、reset、clear、restore、help。隐藏模式使用 unhide 替代 hide。

`commandsCollapsed` 控制命令条只显示 help，还是显示完整命令集。

## 皮肤

支持皮肤：

- `default`
- `terminal`
- `shell`
- `command-terminal`

CSS class 同步属于 `syncPaletteSkin()`。除非皮肤确实改变交互（例如 command-terminal），否则不要为皮肤分叉行为。

## 标题抓取

页面标题抓取使用共享超时常量：

- `TITLE_FETCH_TIMEOUT_MS = 8000`
- `COMMAND_TERMINAL_TITLE_TIMEOUT_MS = 2500`
- `TITLE_READ_DELAY_MS = 120`

使用共享 helper：

- `timeoutSignal`
- `withPageTitlePermission`
- `fetchPageTitleAuto`
- `fetchTitleForCommandTerminal`

扩展模式可以请求 origin permission，并使用临时 inactive tab + scripting 读取标题。网页模式使用带 CORS 和超时的 HTML fetch。命令终端标题抓取必须快速 settle，并优雅 fallback。

## 导入导出

快捷链接导出类型是 `plaintab-command-shortcuts`。导入导出应保持快捷链接数据边界，不要触碰无关的壁纸/UI 设置。

## UI 安全

- 命令面板键盘导航不应把 Enter/Escape 处理泄漏到搜索栏或设置模态窗口。
- 面板行和命令按钮应根据模型状态重新生成，避免零散 patch 后状态不一致。
- 页面标题抓取失败不致命；标题查询失败不能阻塞添加有效 URL 快捷链接。
