# 存储规则

## 所有权

`js/wallpaper/data.js` 拥有存储层。运行时模块、设置 UI、壁纸 fetch/show 和命令面板都应通过 `window.WallpaperData` 访问存储，不要直接操作 IndexedDB，不要直接读写普通 localStorage key，也不要在外部复制一套模型归一化逻辑。

允许的直接 localStorage 例外只有：

- `js/preload.js`：首屏路径可同步读取 `ptab_wallpaper_preview`，并可删除超大/坏掉的 preview。为了 3.1.4 直接跳升后的第一帧兜底，在 preview 缺失时可读取 legacy v2 缩略图 key，但不能加入异步工作、IDB、网络、canvas 或完整模型解析。
- `js/languages.js`：语言数据层加载前可同步读取 `ptab_locale`。
- `js/wallpaper/migrate.js`：legacy v2 -> schema 3 桥接时可读取和清理旧 key。
- `js/wallpaper/data.js`：存储层 owner。

## 基线

- `LS_VERSION = 3`
- `BASELINE_APP_VERSION = 3.2.1`
- IndexedDB：`PlainTab`，版本 `1`，object store 为 `wallpaper`
- `js/wallpaper/migrate.js` 是一次性 legacy storage v2 -> schema 3 桥接模块，只迁移上传壁纸和缩略图；运行时模块仍只读 schema 3 模型。
- schema 3 是当前未发布的最终存储基线。发布前的内部清理不要为了开发期脏 key 升到 `LS_VERSION = 4`。

除这次 legacy v2 升级桥接外，PlainTab 3.2.1 不承诺兼容更早的实验性布局。除非任务明确要求，否则不要新增迁移代码。

## 版本与迁移职责

- IndexedDB `DB_VERSION` 只表示数据库结构版本。只有新增/删除 object store、index、keyPath 或 autoIncrement 等结构变化时才升级。
- `ptab_schema_version` 表示 PlainTab 应用持久化语义。只要 localStorage 或 IndexedDB 的数据解释方式、key 命名、记录格式、引用关系、迁移或清理策略发生变化，就应升级 `LS_VERSION` 并通过 `WallpaperData.migrate()` 处理。
- 即使只改 IndexedDB，不改 localStorage，只要改动会影响用户数据解释、旧 key 清理或从旧版本跳级升级，也必须走 `ptab_schema_version` 迁移；不要依赖 IndexedDB version 做应用级迁移判断。
- 纯缓存实现细节不要求升级 `LS_VERSION`，前提是缺失或残留旧缓存不会影响用户数据、不会误读，也不需要迁移或清理。
- 不要为一次性迁移补丁新增永久顶级 marker key。schema 3 的 legacy v2 桥接应通过遗留 key 是否存在、当前模型是否仍是默认/Bing、以及幂等清理来判断。

## 持久化 Key

当前 `localStorage` key：

- `ptab_schema_version`
- `ptab_locale`：启动语言偏好，供 `js/languages.js` 在数据层加载前读取。
- `ptab_wallpaper_preview`：首屏轻量预览缓存，供 `js/preload.js` 同步应用第一帧。
- `ptab_ui`：UI、搜索、外观、面板、壁纸 UI 设置和体验确认状态。
- `ptab_wallpaper`：壁纸来源、配置、运行状态、缓存顺序和元数据模型。
- `ptab_wallpaper_thumbs`：普通壁纸缩略图缓存。
- `ptab_wallpaper_blur_thumbs`：派生模糊缩略图缓存。
- `ptab_shortcuts`：快捷链接、隐藏空间、最近项和命令面板设置。
- `ptab_shortcut_icons`：快捷链接图标缓存；物理 key 保留，但读写必须走数据层 API。

legacy v2 key 只允许迁移桥接或 preload 首帧兜底读取，不属于当前 schema：

- `ptab_version`
- `ptab_lang`
- `ptab_mode`
- `ptab_bing_thumb`
- `ptab_bing_meta`
- `ptab_img_order`
- `ptab_img_thumbs`
- `ptab_local_index`
- `bing_thumb`
- `ptab_wallpaper_source`
- `ptab_search_visibility`
- `ptab_search_mode`
- `ptab_icon_opacity`
- `ptab_search_engine`
- `local_thumbs`

当前 IndexedDB key / 前缀：

- `ptab_wallpaper_blob_bing`
- `ptab_wallpaper_blob_api`
- `ptab_wallpaper_blob_upload_*`
- `ptab_wallpaper_blob_rss_*`
- `ptab_wallpaper_blob_wallhaven_*`
- `ptab_wallpaper_folder_handle`
- `ptab_wallpaper_folder_files`
- `ptab_wallpaper_folder_light_*`

## 主要模型

`ptab_wallpaper` 是按来源组织的模型：

- `activeSource`：`bing`、`upload`、`folder`、`rss`、`wallhaven` 或 `api`
- `providers.bing.config/state`
- `providers.upload.config/state`：上传图片队列配置，以及互斥的 `activeMedia` / `galleryView`；上传视频固定记录在 `state.videoId`
- `providers.folder.config/state`
- `providers.rss.config/state`
- `providers.wallhaven.config/state`：Wallhaven 搜索配置、SFW-only 纯净度、测试状态、刷新时间戳和本地缓存数量
- `providers.api.config/state`
- `cache.order`、`cache.index`、`cache.meta`

`ptab_ui` 按 UI 域分组，但仍是一个扁平存储 key：

- `search`：显示模式、搜索引擎、位置、对齐、图标位置、图标显示、表面样式、阴影、圆角、宽度、背景透明度、模糊、placeholder、回车行为、历史数量、历史项
- `wallpaper`：遮罩透明度、壁纸取色开关、适配、位置、模糊、暗角
- `appearance`：界面圆角、字体大小、强调色模式、强调色、减少动效
- `icon`：角落图标透明度
- `panel`：设置面板透明度
- `experience.acknowledged`：体验提示确认记录，key 为提示 ID，value 为已确认版本号，例如 `firstUseHint: 1`。不要为 onboarding 或其它提示新增顶级 localStorage key。

`ptab_shortcuts` 包含：

- `items`
- `recents`
- `hidden`
- `settings`：普通/隐藏快捷键、推荐开关、视图模式、命令折叠状态、面板定位/位置、面板皮肤、内置 GitHub 标记

## 归一化规则

- 使用 `loadWallpaper()` / `saveWallpaper()` 归一化壁纸模型。
- `local` 是 `upload` 的兼容别名；通过 `normalizeSource()` / `compatMode()` 处理。
- `upload` 下图片和视频是互斥媒体模式。图片顺序只保存在 `cache.order`；唯一视频使用固定 ID `upload_video`，不进入图片轮播队列。
- RSS source 最多 5 个。显式空 source 列表应保持为空；默认内置源只在恢复默认时回来，不要在普通归一化里偷偷补回。
- 内置 RSS 源允许用户删除。`resetWallpaperDefaults()` 会恢复它们。
- API 分为 image 和 JSON 两套 source 列表，每套最多 5 个，并有各自 active id。
- API 自动拉取间隔允许 `-1`、`0`、`1d`、`3d`、`7d`。RSS 允许 `0`、`1d`、`3d`、`7d`。
- Wallhaven 固定 `purity=100`，缓存 ID 使用 `wallhaven_<id>`，自动刷新只允许 `0`、`1d`、`3d`、`7d`。
- 搜索历史数量归一化为 `0`、`5` 或 `10`；历史项大小写不敏感去重，并裁剪到上限。

## 恢复默认和导入导出

- `resetWallpaperDefaults()` 回到 Bing，尽量保留 Bing 缓存/预览，并删除 upload/folder/RSS/Wallhaven/API 的数据和引用。
- `defaultUISection(section)` 返回界面、搜索、壁纸等默认分区。
- `resetShortcutSettings()` 恢复命令面板设置，并补回可见的内置 GitHub 快捷链接及图标；不要删除其他用户快捷链接。
- `exportUserData()` 导出 PlainTab 备份外壳，包含语言、壁纸模型、缩略图、预览、UI（含体验确认状态）、快捷链接和快捷图标。
- `importUserData()` 接受备份外壳或原始 data 对象，只写入提供的分区，然后清理内存缓存。

## 安全规则

- 不要写入指向缺失 Blob 的引用。
- 仍有引用时不要删除 Blob。
- 设置 UI 不要直接修改 IndexedDB。
- 如果改变了存储模型形状，同步更新本文件以及相关设置/壁纸规则。
