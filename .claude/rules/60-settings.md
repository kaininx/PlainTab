# 设置规则

## 所有权

- `js/settings-bootstrap.js` 提供轻量启动外壳。
- `js/settings-panel.js` 提供完整设置实现，并暴露 `window.SettingsPanelFull`。
- 设置 UI 应通过 `WallpaperData` API 访问存储，通过 `WallpaperFetch` / `WallpaperFolder` helper 做来源测试和文件夹处理。

## 表面

PlainTab 有：

- L1 角落设置面板：快速壁纸、画廊和上传入口。
- L2 设置模态窗口，包含：
  - 界面
  - 搜索
  - 壁纸
  - 命令面板
  - 权限
  - 数据
  - 恢复
  - 关于

Tab 是懒构建的。由于 `index.html` 里存在恢复 tab，`buildRestoreHTML` 是必需 builder。

## 页内排序

- 顶层 tab 顺序保持稳定，避免打断已有用户习惯。
- 页内设置按用户任务流排序：核心视觉/主题项优先，同类视觉项保持相邻，再进入布局、行为、数据或危险操作。
- 界面页保留壁纸主题色和强调色在前，随后是面板/图标/圆角等视觉表面，再放字体大小和减少动效。
- 搜索页优先展示搜索框样式及相关表面项，再展示显示、位置、宽度和图标，最后是提示语、回车行为、历史和搜索引擎。
- 壁纸页来源顺序为 Bing、上传、文件夹、Wallhaven、RSS、API；展示设置中适配和位置在前，遮罩/暗角在模糊前。
- 命令面板页打开方式和快捷键在前，推荐内容其次，皮肤在后。
- 恢复页优先放壁纸和搜索恢复，再放界面、命令面板和全局恢复。

## 分区恢复默认

独立恢复默认动作包括：

- 界面
- 搜索
- 壁纸
- 命令面板

恢复 tab 还提供分区恢复和全局恢复。恢复动作如果有破坏性应确认，更新实时 UI，写入存储，并清掉过期草稿状态。

壁纸恢复默认必须：

- 重置 UI 壁纸控件；
- 调用 `D.resetWallpaperDefaults()`；
- 当前模式切到 Bing；
- 清理壁纸草稿；
- invalidate/re-render 壁纸 tab，让内置 RSS/API 默认值立即出现；
- reload 可见壁纸。

## 壁纸来源 Work Order

壁纸 tab 的来源切换使用当前来源 work order，而不是全局大草稿：

- 打开壁纸 tab 时建立 `pendingSource`、`pendingConfig`、`baseline`、`health`。
- 来源选择器只改变 `pendingSource` 和对应 `pendingConfig`，不立即写入 `activeSource`。
- 展示类设置即时保存；来源切换和当前来源配置通过应用按钮提交。
- RSS/API 应用必须有当前字段 hash 对应的成功测试记录；测试失败或字段过期时不能应用。
- 应用按钮只在 work order 通过 health gate 且相对 baseline 有真实变更时可用。
- 关闭模态窗口或恢复壁纸默认时清理 work order。
- Upload work order 是“必须已有缓存”规则的例外：选择图片/视频模式只是准备一次文件选择型应用动作，文件选择器只在点击应用后打开。
- 如果上传文件选择被取消，保持当前 work order 选中且 Ready，保持已保存的 `activeSource` 不变，并显示取消状态，便于用户再次应用。

## 来源抽屉

壁纸来源以抽屉展示。当前交互契约：

- 打开壁纸 tab 时所有来源抽屉默认收起。
- 点击抽屉 header 只展开/收起。
- 每个抽屉最前面有选择器，用于改变 `pendingSource`。
- 被选中的抽屉/选择器使用对应来源色，并显示当前选择提示。
- 不要增加和抽屉 header 抢职责的独立下拉按钮。

## RSS/API Source 编辑

- 内置 RSS 源可以删除。
- 删除的内置源只通过壁纸恢复默认找回。
- RSS/API source 列表最多 5 个。
- 缺 URL 或 URL 无效的 source 行，应在合适位置禁用测试/应用相关操作。
- HTTP URL 无效；只接受 HTTPS source URL。
- JSON API source 的 JSON 图片路径是可选高级项；为空时自动探测常见字段，UI 需要明确说明这一点。
- RSS/API source 列表新增、删除、选择行等 CRUD 即时保存列表配置，并同步当前 work order 的 list baseline，避免产生幽灵 dirty。
- 删除非当前运行的 RSS/API source 只保存配置，不 reload 壁纸，不要求确认。
- 删除当前运行的 RSS/API source 需要确认；确认后立即切回 Bing。
- 如果当前 app 在其他壁纸模式，RSS/API 删除只保存配置，不影响可见壁纸。
- 是否“当前运行”必须以 `D.getActiveSource()`/已保存 `activeSource` 和运行配置判断，不能以当前打开抽屉或 `pendingSource` 判断。

## Wallhaven

- Wallhaven 是独立壁纸来源，不应塞进通用 API source 列表。
- UI 沿用壁纸来源抽屉和草稿/应用模型，保持紧凑，不展示完整 API 参数表。
- 配置修改后需要重新测试。测试只拉取 JSON 并检查是否存在可用 HTTPS 图片，不下载整批图片。
- 应用 Wallhaven 时下载前 12 张可用图片并成功缓存至少 1 张，才切换当前来源。
- Wallhaven 不展示独立拉取按钮或缓存数量；应用配置和到期自动刷新会整体替换 Wallhaven 队列。
- Wallhaven 本地队列支持删除和拖拽移位，这些操作只影响本地缓存。
- 颜色选择使用有限色值的紧凑色带，默认 Any，第一版单选。

## 界面和搜索设置

- 强调色模式为 `auto` 时隐藏颜色输入；只有自定义强调色模式显示并应用色块。
- 字体大小必须通过 CSS 变量和 `html[data-font-scale]` 影响全局。
- 减少动效设置 `html[data-reduced-motion="true"]`，并应全局减少动画。
- 搜索回车行为默认是当前页搜索。

## 模态事件规则

- 设置模态窗口内部点击应被自身消费。
- 自定义 select 在点击外部时关闭，内部交互不应误关闭。
- 设置/语言/模态表面打开时，全局双击/中键命令面板快捷方式由运行时谓词阻止。
