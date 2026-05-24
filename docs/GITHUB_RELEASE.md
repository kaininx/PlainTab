# PlainTab GitHub Release Body

---

**PlainTab v3.2.2**

- Install from the [Chrome Web Store](https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo) or [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/liljpbjkhafejhcidneknjokfcaiebem) for automatic updates.
- Or download the `.crx` file below and drag it into `chrome://extensions`.

**Highlights**

- Tightened localStorage ownership across runtime modules.
- Added an optional 4K UHD mode for Bing daily wallpapers while keeping 1080p as the default.
- Made Bing cache reuse aware of both date and selected resolution.
- Preserved Bing 4K settings through PlainTab backup import and export.
- Improved backup passphrase controls and settings dropdown behavior.
- Moved the first-use hint acknowledgement into the unified UI model.
- Preserved the fast first-paint wallpaper preview path for direct 3.1.4 upgrades.
- Removed compatibility assumptions for unpublished intermediate keys.
- Updated release, commit, and storage-migration agent guidance to preserve existing project style.

**Summary**

v3.2.2 is a storage reliability, wallpaper configuration, and maintenance polish release. PlainTab now keeps shortcut icons, wallpaper previews, and first-use hint acknowledgement behind the shared storage layer, while adding an optional 4K UHD path for Bing daily wallpapers without changing the default 1080p behavior. Backup import/export keeps the Bing resolution setting intact, cache reuse now respects the selected resolution, and a few settings interactions were tightened to keep the configuration flow calm and predictable.

---

**PlainTab v3.2.2**

- 前往 [Chrome 网上应用店](https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo) 或 [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/liljpbjkhafejhcidneknjokfcaiebem) 安装，可自动更新。
- 或下载下方 `.crx` 文件，拖入 `chrome://extensions` 页面即可。

**更新重点**

- 收口运行时 localStorage 所有权。
- Bing 每日壁纸新增可选 4K UHD 模式，默认仍保持 1080p。
- Bing 缓存复用同时区分日期和当前分辨率。
- PlainTab 备份导入导出会保留 Bing 4K 设置。
- 优化备份口令控件和设置页下拉菜单行为。
- 将首次使用提示确认状态纳入统一 UI 模型。
- 保留 3.1.4 直接升级时的快速首屏壁纸预览兜底。
- 移除未发布中间 key 的兼容假设。
- 更新发布、提交和存储迁移相关 agent 指引，保持现有项目风格。

**总结**

v3.2.2 是一版围绕存储可靠性、壁纸配置和维护流程的补丁更新。PlainTab 现在把快捷图标、壁纸预览和首次使用提示确认状态都收回共享存储层管理，同时为 Bing 每日壁纸加入可选 4K UHD 拉取，并继续保持默认 1080p 体验。备份导入导出会保留 Bing 分辨率设置，缓存复用也会区分当前分辨率；设置页和备份口令交互同步打磨，让配置过程更稳定、更自然。
