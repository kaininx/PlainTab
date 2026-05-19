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

## 壁纸草稿模型

壁纸 tab 使用草稿/应用模型：

- 打开壁纸 tab 时克隆 `D.loadWallpaper()`，并使用归一化后的 RSS/API 配置。
- `wallpaperDraftOriginal` 是 JSON 基线，用于判断是否变更。
- 任何有效真实草稿变更都应点亮应用按钮。
- 无效 URL 或测试失败如果没有改变草稿，不应点亮应用按钮。
- 关闭模态窗口或恢复壁纸默认时清理草稿。

除非任务明确重做模型，不要把来源选择改成即时持久化。

## 来源抽屉

壁纸来源以抽屉展示。当前交互契约：

- 点击抽屉 header 只展开/收起。
- 每个抽屉最前面有选择器，用于改变 `draft.activeSource`。
- 被选中的抽屉/选择器使用对应来源色，并显示当前选择提示。
- 不要增加和抽屉 header 抢职责的独立下拉按钮。

## RSS/API Source 编辑

- 内置 RSS 源可以删除。
- 删除的内置源只通过壁纸恢复默认找回。
- RSS/API source 列表最多 5 个。
- 缺 URL 或 URL 无效的 source 行，应在合适位置禁用测试/应用相关操作。
- HTTP URL 无效；只接受 HTTPS source URL。
- JSON API source 的 JSON 图片路径是可选高级项；为空时自动探测常见字段，UI 需要明确说明这一点。
- 删除非当前运行的 RSS/API source 只保存配置，不 reload 壁纸。
- 删除当前运行的 RSS/API source 需要确认；应用后切回 Bing。
- 如果当前 app 在其他壁纸模式，RSS/API 删除只保存配置，不影响可见壁纸。

## 界面和搜索设置

- 强调色模式为 `auto` 时隐藏颜色输入；只有自定义强调色模式显示并应用色块。
- 字体大小必须通过 CSS 变量和 `html[data-font-scale]` 影响全局。
- 减少动效设置 `html[data-reduced-motion="true"]`，并应全局减少动画。
- 搜索回车行为默认是当前页搜索。

## 模态事件规则

- 设置模态窗口内部点击应被自身消费。
- 自定义 select 在点击外部时关闭，内部交互不应误关闭。
- 设置/语言/模态表面打开时，全局双击/中键命令面板快捷方式由运行时谓词阻止。
