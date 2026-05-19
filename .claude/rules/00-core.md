# 核心规则

## 项目形态

- PlainTab 是静态 Manifest V3 新标签页扩展，也能通过 `index.html` 直接作为网页运行。
- 使用原生 JavaScript 和 CSS。不要添加包管理器、构建步骤、前端框架、lint/test 框架或大型运行时依赖。
- 交互应保持安静、快速、内容优先。避免重度毛玻璃、大面积缩放动画、过冲动效，以及会抢走壁纸注意力的装饰复杂度。

## 启动不变量

零白屏启动顺序是产品行为的一部分：

1. DOM 中先有 `#wallpaperBack`。
2. `js/preload.js` 同步执行。
3. DOM 中再有 `#wallpaperFront`。
4. 其余页面 DOM 随后出现。
5. `js/languages.js` 加载。
6. 壁纸 data/show/folder/fetch、settings bootstrap、`js/newtab.js` 加载。

不要移动 `preload.js`，不要把它改成 async，也不要把网络、IndexedDB、canvas、i18n 加载、文件夹扫描或昂贵 JSON 工作放进首屏路径。

## 存储和数据安全

- `js/wallpaper/data.js` 是 `localStorage` 和 IndexedDB 的所有者。其他模块应使用 `window.WallpaperData` API。
- 先写入大 Blob 数据，再写引用。
- 先移除引用，再删除大数据。
- Blob URL 不再需要时必须释放。
- 失败时保留可见壁纸。任何时候至少应有一个壁纸层可用。

## 范围控制

- 用能解决问题的最小改动。
- 不要为了风格或架构洁癖重写稳定模块。
- 除非需求明确要求，不要重做存储、来源选择或启动流程。
- 工作区里可能有用户改动；不要回退无关修改。
- 共享视觉 token 集中放在 CSS 变量里，优先用 class/attribute 切换，减少 JS 动态写样式。

## 验证

改 JavaScript 后，检查触及文件或整个 JS 树：

```powershell
Get-ChildItem -Recurse js -Include *.js | ForEach-Object { node --check $_.FullName }
```

只改 rules/docs 时，至少运行：

```powershell
git diff --check -- .claude/rules
```

如果改动 i18n key 或语言包，按 `30-language.md` 和 `update-i18n` skill 执行。
