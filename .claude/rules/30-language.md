# 语言系统需求规格

## 行为概述

PlainTab 当前运行时提供 16 种界面语言。语言资源仍集中在 `js/languages.js`，以 `window.I18N` 和 `window.LanguageList` 对外提供，并且必须早于运行时代码加载。

`js/languages.js` 保持单文件、同步、无构建依赖。文件内部按模块分区维护文案：通用、搜索、设置与界面、壁纸、命令面板、权限、数据、关于。最终导出的 `window.I18N[locale]` 仍是扁平 key-value 对象，以兼容现有 `t(key)` 调用。

用户切换语言后，可见 UI 文案即时刷新；设置完整面板若已懒加载，也同步刷新。语言选择还会影响后续 Bing 壁纸请求使用的市场参数，但不会立即清空或强制刷新已缓存的当天 Bing 图片。

### 支持语言与排序

`LanguageList` 固定将中文（简体）和 English 放在最上方，其余语言按语言代码 A-Z 排序：

| # | 语言 | 代码 |
|---|------|------|
| 1 | 中文（简体） | `zh-CN` |
| 2 | English | `en` |
| 3 | العربية | `ar` |
| 4 | Deutsch | `de` |
| 5 | Español | `es` |
| 6 | Français | `fr` |
| 7 | हिन्दी | `hi` |
| 8 | Italiano | `it` |
| 9 | 日本語 | `ja` |
| 10 | 한국어 | `ko` |
| 11 | Polski | `pl` |
| 12 | Português | `pt` |
| 13 | Русский | `ru` |
| 14 | Türkçe | `tr` |
| 15 | Tiếng Việt | `vi` |
| 16 | 中文（繁體） | `zh-TW` |

`zh-CN` 和 `en` 是完整人工维护基线。其他语言目前必须保持 key 完整，但可以对尚未人工校对的新增文案使用英文兜底，避免显示 raw key。

### 语言检测

首次使用且 `ptab_locale` 不存在时：

1. 扩展模式优先使用 `chrome.i18n.getUILanguage()`。
2. 网页模式使用 `navigator.language`。
3. 精确匹配 `I18N[language]`。
4. 精确失败后按语言前缀匹配 `I18N` 的第一个同前缀 key。
5. 仍失败则回退 `en`。

用户手动选择语言后保存到 `ptab_locale`，之后不再自动检测。损坏或不在 `I18N` 中的存储值应回退 `en`。

### 翻译回退链

`t(key)` 查找顺序：

1. 扩展模式下的 `chrome.i18n.getMessage(key)`。
2. `I18N[currentLang][key]`。
3. `I18N.en[key]`。
4. key 本身。

显示 key 本身是开发调试信号。新增 UI 文案时必须补齐所有语言 key；不能立即翻译的非中英语言可以先使用英文兜底，但 `zh-CN` 和 `en` 必须提供对应文案。

### 语言切换

点击右上角语言按钮打开语言面板。面板首次打开时创建按钮，之后只更新高亮。点击非当前语言：

1. 写入 `ptab_locale`。
2. 更新当前语言变量。
3. 刷新页面标题、搜索框 placeholder、角落按钮 title、壁纸来源标签、一级面板文字、设置模态文字和命令面板相关文案。
4. 调用 `window.onLangChange`（如果未来实现）。
5. 关闭语言面板。

点击当前语言不做任何事。

### 轻校验

`js/languages.js` 暴露 `window.validatePlainTabI18N()` 作为开发期检查入口。它应检查：

- `zh-CN` 和 `en` key 是否一致。
- 是否有重复 key。
- 是否有空值。
- 其他传入语言相对英文缺了哪些 key。
- 是否存在明显 mojibake 字符串。

该函数仅供开发排查使用，不应影响首屏同步路径。

### Bing 市场映射

`WallpaperFetch.bingMkt(lang)` 当前映射：

| 语言代码 | Bing mkt | 语言代码 | Bing mkt |
|----------|----------|----------|----------|
| `zh-CN` | `zh-CN` | `zh-TW` | `zh-TW` |
| `en` | `en-US` | `ja` | `ja-JP` |
| `ko` | `ko-KR` | `fr` | `fr-FR` |
| `de` | `de-DE` | `es` | `es-ES` |
| `it` | `it-IT` | `pt` | `pt-BR` |
| `ru` | `ru-RU` | `ar` | `ar-SA` |
| `hi` | `hi-IN` | `tr` | `tr-TR` |
| `pl` | `pl-PL` | `vi` | `vi-VN` |

未知语言回退 `en-US`。

## 约束清单

- `js/languages.js` 必须早于 `js/wallpaper/data.js`、`settings-bootstrap.js` 和 `newtab.js` 加载。
- `js/languages.js` 不引入网络请求、异步加载、构建工具或第三方 i18n 依赖。
- 对外保持 `window.I18N`、`window.LanguageList` 和现有扁平 key 查询兼容。
- 语言值损坏或不在 `I18N` 中时，运行时回退英文。
- 新增文案 key 时必须同时提供所有语言 key；非中英语言可以暂用英文兜底。
- 不要依赖浏览器原生翻译覆盖项目 UI。
- 切换语言不应阻塞首屏，也不应同步请求 Bing 网络图。
