# PlainTab GitHub Release Body

---

**PlainTab v3.2.2**

- Install from the [Chrome Web Store](https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo) or [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/plaintab-%C2%B7-%E6%9E%81%E7%AE%80%E6%96%B0%E6%A0%87%E7%AD%BE%E9%A1%B5/liljpbjkhafejhcidneknjokfcaiebem) for automatic updates.
- Or download the `.crx` file below and drag it into `chrome://extensions`.

**Highlights**

- Tightened localStorage ownership across runtime modules.
- Moved the first-use hint acknowledgement into the unified UI model.
- Preserved the fast first-paint wallpaper preview path for direct 3.1.4 upgrades.
- Removed compatibility assumptions for unpublished intermediate keys.
- Updated release, commit, and storage-migration agent guidance to preserve existing project style.

**Summary**

v3.2.2 is a storage reliability and maintenance polish release. PlainTab now keeps shortcut icons, wallpaper previews, and first-use hint acknowledgement behind the shared storage layer, while preserving the lightweight preload path that makes the first wallpaper frame fast after upgrades. The release and agent workflow docs were also tightened so future updates keep the existing copy style, README badge style, and Chinese Conventional Commit rhythm.

---

**PlainTab v3.2.2**

- 前往 [Chrome 网上应用店](https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo) 或 [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/plaintab-%C2%B7-%E6%9E%81%E7%AE%80%E6%96%B0%E6%A0%87%E7%AD%BE%E9%A1%B5/liljpbjkhafejhcidneknjokfcaiebem) 安装，可自动更新。
- 或下载下方 `.crx` 文件，拖入 `chrome://extensions` 页面即可。

**更新重点**

- 收口运行时 localStorage 所有权。
- 将首次使用提示确认状态纳入统一 UI 模型。
- 保留 3.1.4 直接升级时的快速首屏壁纸预览兜底。
- 移除未发布中间 key 的兼容假设。
- 更新发布、提交和存储迁移相关 agent 指引，保持现有项目风格。

**总结**

v3.2.2 是一版围绕存储可靠性和维护流程的补丁更新。PlainTab 现在把快捷图标、壁纸预览和首次使用提示确认状态都收回共享存储层管理，同时继续保留升级后首屏壁纸快速显示所需的轻量 preload 路径。发布与 agent 协作流程文档也同步收紧，确保后续更新继续保持现有文案风格、README badge 风格和中文 Conventional Commit 队形。
