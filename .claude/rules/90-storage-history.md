# 存储历史说明

本文件有意不作为权威规则。它只提醒 agent：PlainTab 在开发过程中曾经有过旧的存储布局。

当前工作请使用：

- `10-storage.md`：当前存储模型。
- `20-wallpaper.md`：壁纸和来源缓存行为。
- `js/wallpaper/data.js`：实现层事实来源。

PlainTab 3.2.2 使用 `LS_VERSION = 3`，除非任务明确新增此要求，否则不承诺兼容更早的实验性 schema。

不要把历史存储假设复制到新代码里。
