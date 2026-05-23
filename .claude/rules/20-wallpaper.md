# 壁纸规则

## 渲染契约

壁纸渲染使用稳定 back 层和过渡 front 层：

- `#wallpaperBack` 在 `preload.js` 之前就存在。
- `#wallpaperFront` 是过渡层。
- `js/preload.js` 可以同步恢复已保存预览。`ptab_wallpaper_preview` 是刻意独立的 first-paint cache key，不要为了存储整齐把它合并进 `ptab_wallpaper`、`ptab_ui` 或 IndexedDB。
- `js/wallpaper/show.js` 拥有 DOM 应用、缩略图、模糊缩略图、主题色提取和 Blob URL 生命周期。
- `js/newtab.js` 负责编排来源选择和刷新时机。

来源切换、缓存缺失、网络错误或恢复默认时，不能让两个壁纸层同时空白。

`preload.js` 首屏路径不可为重构付费：不能依赖数据层、i18n、网络、IndexedDB、canvas 或异步任务；已有 `ptab_wallpaper_preview` 时必须优先直接应用。为了 3.1.4 直接跳升后的第一帧兜底，preview 缺失时可以保留极轻 legacy v2 缩略图 fallback。

## 来源切换事务

- 切换来源时先验证 work order，再准备新来源缓存/预览，最后才写入 `activeSource`。
- RSS/API 应用必须使用当前 source 字段 hash 对应的通过测试结果；旧测试不能跨 URL、JSON path 或关键字段复用。
- folder/API 等 prepare 阶段如果写入了临时缓存，失败时要回滚这些 prepare 变更。
- 保存配置或 reload 可见壁纸失败时，必须恢复旧 `activeSource`，保留旧来源缓存和当前可见壁纸。
- 成功切换并 reload 后再清理旧来源缓存；清理失败是非致命错误，不能让壁纸空白。

## 来源

当前来源：

- `bing`：Bing 每日壁纸。
- `upload`：用户上传的本地图片和唯一视频壁纸，作为 Blob 保存。图片和视频是互斥媒体模式，视频不进入图片轮播队列。
- `folder`：File System Access API 文件夹来源，保存 handle、索引和轻量缓存状态。
- `rss`：RSS 图片源，带图片提取、RSS Blob 缓存，以及可选摘要/链接浮层。
- `wallhaven`：Wallhaven 搜索源，SFW-only，测试配置后下载前 12 张可用结果并按本地队列顺序轮换。
- `api`：图片直链 API 或 JSON API，通过 JSON path 提取图片地址。

`local` 只是 `upload` 的兼容标签。

## Bing

`js/wallpaper/fetch.js` 使用 `Promise.any` 竞速两个 Bing 元数据端点：

- `https://bing.kaininx.workers.dev/?resolution=1920x1080&format=json&index=0&mkt=...`
- `https://bing.biturl.top/?resolution=1920x1080&format=json&index=0&mkt=...`

元数据请求使用 `REQUEST_TIMEOUT_MS = 8000`。图片 Blob 下载使用 `IMAGE_DOWNLOAD_TIMEOUT_MS = 30000`。

`bingMkt(lang)` 将支持的 UI 语言映射到 16 个市场代码：`zh-CN`、`zh-TW`、`en-US`、`ja-JP`、`ko-KR`、`fr-FR`、`de-DE`、`es-ES`、`it-IT`、`pt-BR`、`ru-RU`、`ar-SA`、`hi-IN`、`tr-TR`、`pl-PL`、`vi-VN`。上游接口有时可能返回 ROW/全球图；只要请求成功并返回可用图片 URL，就可以接受。

## RSS

- 默认内置源是 NASA Earth Observatory 和阮一峰的网络日志。
- 内置源可被用户删除，只通过壁纸恢复默认找回。
- Source URL 必须是 HTTPS。
- Source 测试记录状态和字段 hash；URL 变更后旧的通过状态不能继续算通过。
- `refreshIntervalMs` 支持关闭、1 天、3 天、7 天。
- 运行时是否刷新由 `providers.rss.state.lastCheckedAt` / `lastSuccessAt` 和配置间隔决定。
- 删除非当前运行来源的 RSS source 只保存配置，不 reload 壁纸。删除当前运行的 RSS source 需要确认，应用后回退到 Bing。

## API

- API 模式支持 `image` 和 `json`。
- 图片 source 和 JSON source 是两套独立列表，各自最多 5 个。
- JSON source 需要 URL 和 JSON path。
- Source URL 必须是 HTTPS。
- API source 测试记录状态和字段 hash；URL 或 JSON path 变更后旧的通过状态不能继续算通过。
- `refreshIntervalMs` 支持每次打开新标签页（`-1`）、关闭（`0`）、1 天、3 天、7 天。
- 运行时是否刷新由 API state 时间戳和配置间隔决定。`-1` 表示每次打开检查，但实现必须避免一次打开期间反复下载和切换。
- 删除非当前运行来源的 API source 只保存配置，不 reload 壁纸。删除当前运行的 API source 需要确认，应用后回退到 Bing。

## Wallhaven

- Wallhaven 使用 `https://wallhaven.cc/api/v1/search`，第一版固定 `purity=100`，不保存 API key。
- 设置项包括搜索预设/自定义搜索、分类、排序、topRange、分辨率模式、比例、颜色和刷新间隔。
- 测试只验证 JSON 结果里至少有一张带 HTTPS `path` 的图片；测试通过后才允许应用配置。
- 应用或刷新时下载返回结果前 12 张可用图片。至少成功缓存 1 张才算成功。
- 成功写入新 Blob、缩略图和引用后，才能删除旧 Wallhaven Blob。
- 本地展示按 `cache.order` 顺序轮换。删除和拖拽移位只影响本地 Wallhaven 队列。
- 自动刷新只支持关闭、1 天、3 天、7 天，不支持每次打开新标签页。

## 上传和文件夹

- 上传图片保存在 `ptab_wallpaper_blob_upload_*`；顺序保存在 `cache.order`。
- 上传视频固定保存在 `upload_video` / `ptab_wallpaper_blob_upload_video`，并由 `providers.upload.config.activeMedia` 与图片画廊互斥切换。
- 删除上传图时，必须先移除 order/meta/thumb/blur-thumb 引用，再删除 Blob。
- 文件夹模式在 IndexedDB 保存目录 handle 和文件索引。缺失权限、空目录、文件被移除、轻量缓存过期时，都不能让壁纸空白。
- 文件夹扫描和缩略图准备应离开启动热路径，通常使用 `requestIdleCallback`。

## 网络和 Blob Helper

- 网络超时常量集中在 `js/wallpaper/fetch.js`。
- 使用 `fetchJson`、`fetchBlob`、`fetchApiBlob`、RSS/API 错误分类等共享 helper，不要每处手写一套 fetch 逻辑。
- 调用方要求图片时，尽量在共享 helper 里验证 Blob/content type。

## 缓存安全

- 先保存大 Blob，再写指向它的元数据。
- 恢复默认时，尽量保留 Bing 缓存/预览，并删除 upload/folder/RSS/Wallhaven/API 数据。
- 运行时写入首屏预览必须通过存储层 API（如 `WallpaperData.savePreview()`）；除 `preload.js` 的首屏读取/坏值清理外，不要在壁纸运行时模块里直接读写 `ptab_wallpaper_preview`。
- 图片加载完成或放弃后释放 object URL。
- 模糊缩略图是派生缓存，可以重新生成；不要把它当作来源真相。
- 设置页上传来源在 apply 的 prepare 阶段打开系统文件选择器。取消选择不能改变 `activeSource`，不能清空可见壁纸，也不能回退到 Bing。
- 设置页上传图片应用需要事务式替换图片组：先写入新 Blob，再写引用；替换引用存在后，才能删除旧上传图片引用和 Blob。
