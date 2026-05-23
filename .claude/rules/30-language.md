# 语言和 i18n 规则

## 运行时结构

- `js/languages.js` 拥有语言加载/解析 helper，并暴露设置和命令面板需要的语言列表与运行时 i18n 对象。
- 语言包位于 `js/i18n/*.js`。
- UI 文案通过 `t(key)`、运行时 helper 或 `data-i18n` 读取；Chrome 环境下可优先使用 `i18n.getMessage`。
- `ptab_locale` 保存用户选择的语言。它是刻意独立的 boot preference key，因为 `js/languages.js` 在完整数据层加载前就需要同步决定语言包；不要把它合并进 `ptab_ui` 或其它大 JSON。

## Fallback 策略

- 英文是最终运行时兜底，避免失败时界面直接显示 raw key。
- 普通非英文语言包不要依赖英文兜底。新增 UI 文案时，应补齐所有已发布语言包，除非明确记录为有意延期。
- UI 出现 raw key 默认是 bug，除非该 key 明确用于诊断。

## 语言和 Bing 市场

- 运行时语言检测顺序：保存语言、浏览器语言、可支持语言、英文。
- `js/languages.js` 只允许直接读取 `ptab_locale`，运行时语言切换和导入导出应通过存储层 API 保存语言。
- Bing 市场映射在 `js/wallpaper/fetch.js`。新增语言时，只有在 Bing 市场确实支持时才同步 `bingMkt(lang)`。

## 新增或修改文案

UI 文案变更使用 `update-i18n` skill。检查：

- `js/i18n/*.js`
- `js/languages.js`
- HTML 里的 `data-i18n`
- JavaScript 里的 `t(key)` 调用
- 设置、命令面板、onboarding、导入导出、权限、壁纸通知里的硬编码文案

## 验证

至少运行：

```powershell
Get-ChildItem js\i18n\*.js | ForEach-Object { node --check $_.FullName }
node --check js\languages.js
```

如果新增或重命名 key，运行项目 i18n 验证脚本；没有脚本时，手动比对各语言包 key 集合。
