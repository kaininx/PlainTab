# 存储规则

## 所有权

`js/wallpaper/data.js` 拥有存储层。运行时模块、设置 UI、壁纸 fetch/show 和命令面板都应通过 `window.WallpaperData` 访问存储，不要直接操作 IndexedDB，也不要在外部复制一套模型归一化逻辑。

## 基线

- `LS_VERSION = 3`
- `BASELINE_APP_VERSION = 3.2.1`
- IndexedDB：`PlainTab`，版本 `1`，object store 为 `wallpaper`
- 当前 schema 迁移很轻：`migrate()` 只确保 `ptab_schema_version` 至少为 `3`。

PlainTab 3.2.1 不承诺兼容更早的实验性布局。除非任务明确要求，否则不要新增迁移代码。

## 持久化 Key

当前 `localStorage` key：

- `ptab_schema_version`
- `ptab_locale`
- `ptab_wallpaper`
- `ptab_wallpaper_thumbs`
- `ptab_wallpaper_blur_thumbs`
- `ptab_wallpaper_preview`
- `ptab_ui`
- `ptab_shortcuts`
- `ptab_shortcut_icons`

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
- `resetShortcutSettings()` 只恢复命令面板设置，不删除快捷链接。
- `exportUserData()` 导出 PlainTab 备份外壳，包含语言、壁纸模型、缩略图、预览、UI、快捷链接和快捷图标。
- `importUserData()` 接受备份外壳或原始 data 对象，只写入提供的分区，然后清理内存缓存。

## 安全规则

- 不要写入指向缺失 Blob 的引用。
- 仍有引用时不要删除 Blob。
- 设置 UI 不要直接修改 IndexedDB。
- 如果改变了存储模型形状，同步更新本文件以及相关设置/壁纸规则。
