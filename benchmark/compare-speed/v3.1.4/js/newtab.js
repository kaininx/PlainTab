(function () {
    'use strict';

    /* ================================================================
       1. 常量
       ================================================================ */

    var BING_PRIMARY = function (mkt) { return 'https://bing.kaininx.workers.dev/?resolution=1920x1080&format=json&index=0&mkt=' + mkt; };
    var BING_FALLBACK = function (mkt) { return 'https://bing.biturl.top/?resolution=1920x1080&format=json&index=0&mkt=' + mkt; };

    // *** localStorage / IndexedDB 的 key 名
    // LS_* = localStorage, DB_* = IndexedDB
    var LS_VERSION = 2;
    var DB_VERSION = 1;

    var LS_KEY_VERSION = 'ptab_version';
    var LS_KEY_BING_THUMB = 'ptab_bing_thumb';
    var LS_KEY_LANG = 'ptab_lang';
    var LS_KEY_MODE = 'ptab_mode';
    var LS_KEY_SEARCH_MODE = 'ptab_search_mode';
    var LS_KEY_ICON_OPACITY = 'ptab_icon_opacity';
    var LS_KEY_SEARCH_ENGINE = 'ptab_search_engine';
    var LS_KEY_BING_META = 'ptab_bing_meta';
    var DB_KEY_BING_BLOB = 'ptab_bing_blob';
    var DB_KEY_IMG_PREFIX = 'ptab_img_';
    var LS_KEY_IMG_ORDER = 'ptab_img_order';
    var LS_KEY_IMG_THUMBS = 'ptab_img_thumbs';
    var LS_KEY_LOCAL_INDEX = 'ptab_local_index';

    var DB_NAME = 'PlainTab';
    var DB_STORE_NAME = 'wallpaper';

    var TRANSITION_MS = 500; // 壁纸淡入过渡时长（ms），必须与 CSS 中的 transition-duration 保持一致
    var THUMB_MAX_W = 640;   // 生成缩略图的最大宽度（px）

    var log = function (tag, msg) { console.log('[' + tag + '] ' + msg); };
    var warn = function (tag, msg) { console.warn('[' + tag + '] ' + msg); };

    /* ================================================================
       2. 运行环境
       ================================================================ */

    var IS_EXTENSION = typeof chrome !== 'undefined' && chrome.runtime && !!chrome.runtime.id;

    /* ================================================================
       3. DOM 元素
       ================================================================ */

    var wallpaperBackEl = document.getElementById('wallpaperBack');
    var wallpaperFrontEl = document.getElementById('wallpaperFront');
    var searchBar = document.getElementById('searchBar');
    var searchInput = document.getElementById('searchInput');
    var engineIcon = document.getElementById('searchEngineIcon');
    var settingsBtn = document.getElementById('settingsBtn');
    var langBtn = document.getElementById('langBtn');
    var settingsPanel = document.getElementById('settingsPanel');
    var langPanel = document.getElementById('langPanel');
    var langOptions = document.getElementById('langOptions');
    var wallpaperInfoEl = document.getElementById('wpInfo');
    var uploadBtn = document.getElementById('uploadBtn');
    var fileInput = document.getElementById('fileInput');
    var resetBtn = document.getElementById('resetBtn');
    var advancedToggleEl = document.getElementById('advToggle');
    var advancedSectionEl = document.getElementById('advSection');
    var searchModeSelect = document.getElementById('searchModeSel');
    var opacityRange = document.getElementById('opacityRange');
    var opacityNumInput = document.getElementById('opacityNum');
    var engineSelect = document.getElementById('engineSel');
    var resetAdvancedBtn = document.getElementById('resetAdvBtn');

    /* ================================================================
       4. 状态变量
       ================================================================ */

    var currentMode = 'bing';             // 'bing' | 'local'
    var currentLang = 'en';
    var I18N = window.I18N || {};
    var LanguageList = window.LanguageList || [];

    // 鼠标/面板交互状态
    var isMouseInCornerZone = false;
    var isMouseInSearchZone = false;
    var isSettingsPanelOpen = false;
    var isLangPanelOpen = false;
    var cornerHideTimer = null;
    var searchHideTimer = null;

    // 搜索设置（持久化到 localStorage）
    var searchMode = 'always';            // 'hover' | 'always' | 'never'
    var currentOpacity = 0.45;
    var currentEngine = 'google';
    var engineIndex = 0;

    /* ================================================================
       5. 国际化 (i18n)
       ================================================================ */

    /**
     * 查找翻译文本的优先级链：
     *   chrome.i18n（扩展模式）→ I18N 表当前语言 → I18N 表英语 → 原始 key
     */
    function t(key) {
        if (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getMessage) {
            var msg = chrome.i18n.getMessage(key);
            if (msg) return msg;
        }
        return (I18N[currentLang] && I18N[currentLang][key]) || (I18N['en'] && I18N['en'][key]) || key;
    }

    /** 探测浏览器语言，找 I18N 表中最佳匹配 */
    function detectLang() {
        var browserLang = 'en';
        if (typeof chrome !== 'undefined' && chrome.i18n) browserLang = chrome.i18n.getUILanguage();
        else browserLang = navigator.language || 'en';
        if (I18N[browserLang]) return browserLang;
        var main = browserLang.split('-')[0];
        var found = null;
        Object.keys(I18N).some(function (k) { if (k.indexOf(main) === 0) { found = k; return true; } return false; });
        return found || 'en';
    }

    /** 用当前语言刷新页面上所有可见文本 */
    function updateLangUI() {
        document.title = t('extName');
        searchInput.placeholder = t('searchPlaceholder');
        engineIcon.setAttribute('title', t('engineTitle'));
        langBtn.setAttribute('title', t('langTitle'));
        settingsBtn.setAttribute('title', t('settingsTitle'));
        document.querySelector('.settings-panel h3').textContent = t('panelTitle');
        if (currentMode === 'local') refreshLocalGallery();
        else wallpaperInfoEl.textContent = t('wpBing');
        uploadBtn.textContent = t('uploadBtn');
        resetBtn.textContent = t('resetBtn');
        advancedToggleEl.textContent = t('advToggle');
        var labels = document.querySelectorAll('.setting-row label');
        if (labels.length >= 3) {
            labels[0].textContent = t('searchLabel');
            labels[1].textContent = t('opacityLabel');
            labels[2].textContent = t('engineLabel');
        }
        var opts = searchModeSelect.options;
        if (opts.length >= 3) { opts[0].textContent = t('searchHover'); opts[1].textContent = t('searchAlways'); opts[2].textContent = t('searchNever'); }
        resetAdvancedBtn.textContent = t('resetAdv');
        renderLangPanel();
    }

    /** 渲染语言选择面板的按钮列表 */
    function renderLangPanel() {
        document.querySelector('.lang-title').textContent = t('langPanelTitle');
        langOptions.innerHTML = '';
        LanguageList.forEach(function (lang) {
            var btn = document.createElement('button');
            btn.className = 'lang-option' + (lang.code === currentLang ? ' current' : '');
            btn.textContent = lang.name;
            btn.addEventListener('click', function () {
                if (lang.code !== currentLang) {
                    localStorage.setItem(LS_KEY_LANG, lang.code);
                    currentLang = lang.code;
                    updateLangUI();
                }
                closeLangPanel();
            });
            langOptions.appendChild(btn);
        });
    }

    /* ================================================================
       6. IndexedDB 存储层
       ================================================================ */

    var _dbConnection;

    /** 获取（或创建并缓存）数据库连接 */
    function openDB() {
        if (_dbConnection) return Promise.resolve(_dbConnection);
        return new Promise(function (resolve, reject) {
            var req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = function (e) {
                if (!e.target.result.objectStoreNames.contains(DB_STORE_NAME)) e.target.result.createObjectStore(DB_STORE_NAME);
            };
            req.onsuccess = function (e) {
                _dbConnection = e.target.result;
                // WHY: 连接意外关闭时清除缓存，下次调用会重新建立连接
                _dbConnection.onclose = function () { _dbConnection = null; };
                resolve(_dbConnection);
            };
            req.onerror = function (e) { reject(e.target.error); };
        });
    }

    function idbPut(key, value) {
        return openDB().then(function (db) {
            return new Promise(function (resolve, reject) {
                var tx = db.transaction(DB_STORE_NAME, 'readwrite');
                tx.objectStore(DB_STORE_NAME).put(value, key);
                tx.oncomplete = resolve;
                tx.onerror = function (e) { reject(e.target.error); };
            });
        });
    }

    function idbGet(key) {
        return openDB().then(function (db) {
            return new Promise(function (resolve, reject) {
                var tx = db.transaction(DB_STORE_NAME, 'readonly');
                var req = tx.objectStore(DB_STORE_NAME).get(key);
                req.onsuccess = function () { resolve(req.result); };
                req.onerror = function (e) { reject(e.target.error); };
            });
        });
    }

    function idbDelete(key) {
        return openDB().then(function (db) {
            return new Promise(function (resolve, reject) {
                var tx = db.transaction(DB_STORE_NAME, 'readwrite');
                tx.objectStore(DB_STORE_NAME).delete(key);
                tx.oncomplete = resolve;
                tx.onerror = function (e) { reject(e.target.error); };
            });
        });
    }

    /* ================================================================
       7. 壁纸核心 — 双图层零白屏系统

       WHY 需要两个图层：
         #wallpaperBack (z-index:0) — 始终持有可见图像。
         preload.js 在浏览器首帧绘制前同步写入缩略图，
         用户永远不会看到空白背景。
         #wallpaperFront (z-index:1, opacity:0) — 用于淡入过渡。
         新图在内存中预加载 → 设到 front 层 → CSS opacity
         transition 淡入 → 过渡完成后 "稳定" 到 back 层
         （直接 back.style.backgroundImage 赋值），front 复位透明。
         这样每个时刻至少有一层持有已渲染图像 —— 零白屏。
       ================================================================ */

    /** 将图片预加载到浏览器缓存 */
    function preloadImage(url) {
        return new Promise(function (resolve) {
            var img = new Image();
            img.onload = function () {
                // WHY: decode() 确保图片已解码，避免首次绘制时的解码延迟闪烁
                img.decode().then(function () { resolve(true); }, function () { resolve(true); });
            };
            img.onerror = function () { resolve(false); };
            img.src = url;
        });
    }

    /**
     * 完整展示管线：预加载 → front 层淡入 → 稳定到 back 层 → 生成缩略图
     *
     * WHY 使用两次 requestAnimationFrame：
     *   第一次 rAF 确保 DOM 在设置 backgroundImage 后才开始计算样式；
     *   第二次 rAF 确保浏览器已应用 backgroundImage，再添加 CSS transition 类
     *   才能触发淡入动画。跳过其中任意一步都会导致过渡不生效。
     */
    function applyWallpaper(url, mode) {
        return preloadImage(url).then(function () {
            wallpaperFrontEl.style.backgroundImage = 'url(' + url + ')';
            return new Promise(function (resolve) {
                requestAnimationFrame(function () {
                    requestAnimationFrame(function () {
                        wallpaperFrontEl.classList.add('active');
                        setTimeout(function () {
                            wallpaperBackEl.style.backgroundImage = 'url(' + url + ')';
                            wallpaperFrontEl.classList.remove('active');
                            wallpaperFrontEl.style.backgroundImage = '';
                            resolve();
                        }, TRANSITION_MS + 50);
                    });
                });
            });
        }).then(function () {
            currentMode = mode;
            wallpaperInfoEl.textContent = mode === 'local' ? t('wpLocal') : t('wpBing');
            return generateThumbnail(url).then(function (thumb) {
                if (mode === 'bing' && thumb) {
                    try { localStorage.setItem(LS_KEY_BING_THUMB, thumb); } catch (e) { /* quota */ }
                }
                return thumb;
            });
        });
    }

    /**
     * 生成缩略图（纯计算，不写 localStorage）。
     * 调用方根据 mode 决定是否持久化到 ptab_bing_thumb。
     *
     * WHY 640px 宽 JPEG 0.55 质量：
     *   缩略图以 CSS url(data:...) 格式存入 localStorage，需要控制在 quota 内。
     *   640px 在 1920 屏幕上也足够锐利。JPEG 0.55 是体积与画质的平衡点。
     */
    function generateThumbnail(url) {
        return new Promise(function (resolve) {
            var img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function () {
                var canvas = document.createElement('canvas');
                var scale = THUMB_MAX_W / img.width;
                canvas.width = THUMB_MAX_W;
                canvas.height = Math.floor(img.height * scale);
                var ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                var thumb = 'url(' + canvas.toDataURL('image/jpeg', 0.55) + ')';
                resolve(thumb);
            };
            img.onerror = function () { resolve(null); };
            img.src = url;
        });
    }

    // 本地图片 order 与缩略图（id 做钥匙）
    function imgKey(id) { return DB_KEY_IMG_PREFIX + id; }

    function loadOrder() {
        try { return JSON.parse(localStorage.getItem(LS_KEY_IMG_ORDER) || '[]'); }
        catch (e) { return []; }
    }
    function saveOrder(order) {
        try { localStorage.setItem(LS_KEY_IMG_ORDER, JSON.stringify(order)); }
        catch (e) { /* quota */ }
    }

    function loadThumbs() {
        try { return JSON.parse(localStorage.getItem(LS_KEY_IMG_THUMBS) || '{}'); }
        catch (e) { return {}; }
    }
    function saveThumbs(thumbs) {
        try { localStorage.setItem(LS_KEY_IMG_THUMBS, JSON.stringify(thumbs)); }
        catch (e) { /* quota */ }
    }

    /* ================================================================
       8. 壁纸 — Bing 每日壁纸获取与缓存
       ================================================================ */

    /** 语言代码 → Bing 市场代码（部分语言无 Bing 直营市场，回退 en-US） */
    function bingMkt(lang) {
        var map = { 'zh-CN': 'zh-CN', 'zh-TW': 'zh-TW', 'en': 'en-US', 'ja': 'ja-JP', 'ko': 'ko-KR', 'fr': 'fr-FR', 'de': 'de-DE', 'es': 'es-ES', 'it': 'it-IT', 'pt': 'pt-BR', 'ru': 'ru-RU', 'ar': 'ar-SA', 'hi': 'hi-IN', 'tr': 'tr-TR', 'pl': 'pl-PL', 'vi': 'vi-VN' };
        return map[lang] || 'en-US';
    }

    /** 获取 Bing JSON API → 返回图像直链。双端点并发竞速，取先响应的结果。返回 {url, api} */
    function fetchBingUrl() {
        var mkt = bingMkt(currentLang);
        function tryFetch(url, api, timeout) {
            var ctrl = new AbortController();
            var timer = setTimeout(function () { ctrl.abort(); }, timeout);
            return fetch(url, { signal: ctrl.signal }).then(function (r) {
                clearTimeout(timer);
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.json();
            }).then(function (data) {
                if (data && data.url) return { url: data.url, api: api };
                throw new Error('no url in response');
            });
        }
        // WHY: 同时并发请求两个端点，Promise.any 取最先响应的结果。
        // kaininx（Cloudflare Workers）海外更快，biturl 国内可直连——不论在哪，总是先到先用。
        var t = '&t=' + Date.now();
        return Promise.any([
            tryFetch(BING_PRIMARY(mkt) + t, 'primary', 8000),
            tryFetch(BING_FALLBACK(mkt) + t, 'fallback', 8000)
        ]);
    }

    /** CORS 方式下载图片 Blob（用于存入 IDB） */
    function downloadBingBlob(url) {
        return fetch(url, { mode: 'cors' }).then(function (r) {
            if (!r.ok) throw new Error('fetch failed');
            return r.blob();
        });
    }

    function loadBingMeta() {
        try { var raw = localStorage.getItem(LS_KEY_BING_META); return raw ? JSON.parse(raw) : {}; }
        catch (e) { return {}; }
    }

    function saveBingMeta(meta) {
        try { localStorage.setItem(LS_KEY_BING_META, JSON.stringify(meta)); }
        catch (e) { /* quota 满了 */ }
    }

    /**
     * 下载 Blob 并存入 IDB，同时更新 meta。
     *
     * WHY 用 src（图像直链 URL）作为去重 key：
     *   Bing 每天只换一次图。如果 URL 没变，说明还是同一张，跳过下载。
     *   但 IDB 中的旧 blob 可能已被浏览器清理 —— 所以即使 URL 相同，
     *   也要检查 blob 是否真的存在，丢了就回退下载。
     */
    function cacheBingBlob(url, provider, today) {
        var meta = loadBingMeta();
        var isNew = meta.src !== url;

        if (!isNew) {
            return idbGet(DB_KEY_BING_BLOB).then(function (blob) {
                if (blob) {
                    var kb = (blob.size / 1024).toFixed(0);
                    log('Bing', 'wallpaper unchanged, skipped  ·  ' + provider + '  ·  ' + kb + ' KB');
                    return blob;
                }
                log('Bing', 'blob missing, re-downloading...');
                return downloadAndStore();
            });
        }

        return downloadAndStore();

        function downloadAndStore() {
            return downloadBingBlob(url).then(function (blob) {
                meta.src = url;
                meta.date = today;
                meta.provider = provider;
                saveBingMeta(meta);
                var kb = (blob.size / 1024).toFixed(0);
                log('Bing', 'fetched new wallpaper from ' + provider + '  ·  ' + kb + ' KB');
                return idbPut(DB_KEY_BING_BLOB, blob).then(function () { return blob; });
            }).catch(function () { warn('Bing', 'got the URL but failed to download image, kept last image'); });
        }
    }

    /**
     * 后台静默缓存最新 Bing 壁纸。
     *
     * WHY 在本地壁纸模式下也需要它：
     *   用户可能随时切回 Bing 模式。在后台提前缓存好今天的 Bing 图，
     *   切换时无需等待网络请求。同时 meta.date 防重复请求，
     *   每个新标签页只跑一次。
     */
    function cacheBingInBackground() {
        var today = new Date().toDateString();
        var meta = loadBingMeta();
        if (meta.date === today && meta.src) return;
        fetchBingUrl().then(function (r) {
            return cacheBingBlob(r.url, r.api, today).then(function (blob) {
                if (blob && currentMode === 'bing') {
                    applyWallpaper(URL.createObjectURL(blob), 'bing');
                }
            });
        }).catch(function () { warn('Bing', 'background: failed, will retry later'); });
    }

    /* ================================================================
       9. 壁纸 — 主加载流程

       优先级：本地壁纸轮播 > 今日 Bing 缓存 > Bing 网络获取
       ================================================================ */

    /** 尝试加载本地壁纸（轮播）。成功返回 true，否则返回 false */
    function tryLoadLocalWallpaper(order) {
        if (!order || !order.length) return Promise.resolve(false);

        var idx = (parseInt(localStorage.getItem(LS_KEY_LOCAL_INDEX)) || 0) % order.length;
        var id = order[idx];

        return idbGet(imgKey(id)).then(function (img) {
            if (!img || !img.blob) { warn('Local', 'image ' + id + ' missing, skipping'); return false; }

            var blob = img.blob;
            if ((!blob.type || blob.type === '') && img.mime) {
                try { blob = new Blob([blob], { type: img.mime }); } catch (e) { }
            }

            localStorage.setItem(LS_KEY_LOCAL_INDEX, (idx + 1) % order.length);
            log('Local', 'image ' + (idx + 1) + '/' + order.length + (img.name ? '  ·  ' + img.name : ''));

            return applyWallpaper(URL.createObjectURL(blob), 'local').then(function (thumb) {
                if (thumb) {
                    var thumbs = loadThumbs();
                    if (!thumbs[id]) {
                        thumbs[id] = thumb;
                        saveThumbs(thumbs);
                    }
                }
                cacheBingInBackground();
                return true;
            });
        });
    }

    /** 尝试用已缓存的 Bing blob 展示。成功返回 true，否则返回 false */
    function tryLoadCachedBing(bingBlob, meta, today) {
        if (!bingBlob || meta.date !== today) return Promise.resolve(false);

        log('Bing', 'wallpaper is fresh  ·  date: ' + meta.date + ', nothing to do');
        return applyWallpaper(URL.createObjectURL(bingBlob), 'bing').then(function () { return true; });
    }

    /** 从网络获取 Bing 壁纸（无可用缓存时的最终回退） */
    function loadBingFromNetwork(meta, today) {
        currentMode = 'bing';
        wallpaperInfoEl.textContent = t('wpBing');
        log('Bing', meta.date ? 'wallpaper is old (cache: ' + meta.date + ', today: ' + today + '), fetching...' : 'no wallpaper cached, fetching...');

        // 路径 A：meta 里有今天的 src 但没 blob —— 先用 src 展示，异步下载 blob
        if (meta.src && meta.date === today) {
            return applyWallpaper(meta.src, 'bing').then(function () {
                return cacheBingBlob(meta.src, meta.provider || 'primary', today);
            });
        }

        // WHY: 在等待网络请求时，把旧 URL 先垫到 back 层防止白屏。
        // 仅当 back 层没有背景图时才写 —— preload.js 可能已经写入了。
        if (meta.src && !wallpaperBackEl.style.backgroundImage) {
            wallpaperBackEl.style.backgroundImage = 'url(' + meta.src + ')';
        }

        // 路径 B：完全无缓存，从头获取 URL → 展示 → 下载 blob
        return fetchBingUrl().then(function (r) {
            return applyWallpaper(r.url, 'bing').then(function () {
                return cacheBingBlob(r.url, r.api, today);
            });
        }).catch(function () {
            // 网络全挂了：回退到旧 URL（如果 back 层还没有图的话）
            if (!wallpaperBackEl.style.backgroundImage && meta.src) {
                wallpaperBackEl.style.backgroundImage = 'url(' + meta.src + ')';
            }
        });
    }

    /**
     * 主加载流程 —— 按优先级尝试三个来源。
     * 并行读取 IDB（本地图片 + Bing blob），根据模式和历史决定用哪个。
     */
    function loadWallpaper() {
        var lastMode = localStorage.getItem(LS_KEY_MODE) || 'bing';
        var meta = loadBingMeta();
        var today = new Date().toDateString();
        var order = loadOrder();

        return idbGet(DB_KEY_BING_BLOB).then(function (bingBlob) {
            // 优先级 1：本地模式且有图片 → 轮播
            if (lastMode === 'local') {
                return tryLoadLocalWallpaper(order).then(function (loaded) {
                    if (loaded) return;
                    return tryLoadCachedBing(bingBlob, meta, today).then(function (loaded) {
                        if (!loaded) return loadBingFromNetwork(meta, today);
                    });
                });
            }

            // 优先级 2：今日 Bing 缓存可用 → 直接用
            return tryLoadCachedBing(bingBlob, meta, today).then(function (loaded) {
                if (loaded) return;
                // 优先级 3：缓存不可用 → 走网络
                return loadBingFromNetwork(meta, today);
            });
        });
    }

    /* ================================================================
       10. 壁纸 — 本地上传、删除与画廊
       ================================================================ */

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }

    /**
     * 保存单张本地壁纸。
     *
     * @param {File} file - 用户选择的图片文件
     * @param {boolean} show - true: 同时展示为当前壁纸并切到本地模式；false: 只存库
     * @returns {Promise<boolean>} 是否保存成功
     */
    /**
     * 保存单张本地壁纸。先落 blob（IDB），再关联 order + thumb。
     * 任何一步崩溃：blob 是孤儿，不参与轮播，下次会被忽略。
     */
    function saveLocalImage(file, show) {
        var id = generateId();
        var blobUrl = URL.createObjectURL(file);

        var start = show
            ? (localStorage.setItem(LS_KEY_MODE, 'local'), applyWallpaper(blobUrl, 'local'))
            : generateThumbnail(blobUrl).then(function (thumb) {
                URL.revokeObjectURL(blobUrl);
                return thumb;
            });

        return start.then(function (thumb) {
            if (!thumb) { warn('Local', 'thumbnail failed for ' + file.name); return false; }

            return idbPut(imgKey(id), { blob: file, mime: file.type || '', name: file.name || '' }).then(function () {
                var order = loadOrder();
                var thumbs = loadThumbs();
                order.push(id);
                thumbs[id] = thumb;
                saveOrder(order);
                saveThumbs(thumbs);
                return true;
            });
        }).catch(function (e) { warn('Local', 'save failed: ' + e.message); return false; });
    }

    /** 删除单张本地壁纸。先切 order 引用，再删 thumb，最后删 IDB blob。 */
    function deleteLocalImage(id) {
        var order = loadOrder();
        if (!order.length) return;

        var newOrder = order.filter(function (oid) { return oid !== id; });
        saveOrder(newOrder);

        var thumbs = loadThumbs();
        delete thumbs[id];
        saveThumbs(thumbs);

        if (newOrder.length === 0) {
            localStorage.removeItem(LS_KEY_LOCAL_INDEX);
            localStorage.setItem(LS_KEY_MODE, 'bing');
            currentMode = 'bing';
            wallpaperInfoEl.textContent = t('wpBing');
            removeLocalGallery();
            return idbDelete(imgKey(id)).then(function () { loadWallpaper(); }).catch(function () { });
        }

        return idbDelete(imgKey(id)).then(function () {
            refreshLocalGallery();
        }).catch(function (e) { warn('Local', 'delete blob failed: ' + (e && e.message)); });
    }

    /** 重置为 Bing 模式。逐条删 IDB blob，再清 localStorage。 */
    function resetToBing() {
        var order = loadOrder();
        var count = order.length;
        if (count > 1 && !confirm(t('resetConfirm'))) return;

        currentMode = 'bing';
        removeLocalGallery();
        localStorage.removeItem(LS_KEY_BING_THUMB);
        localStorage.removeItem(LS_KEY_IMG_THUMBS);
        localStorage.removeItem(LS_KEY_IMG_ORDER);
        localStorage.removeItem(LS_KEY_LOCAL_INDEX);
        localStorage.setItem(LS_KEY_MODE, 'bing');

        var chain = Promise.resolve();
        order.forEach(function (id) {
            chain = chain.then(function () { return idbDelete(imgKey(id)); });
        });
        return chain.then(function () {
            return loadWallpaper();
        }).then(function () {
            wallpaperInfoEl.textContent = t('wpBing');
            closeSettings();
        }).catch(function () { closeSettings(); });
    }

    /* ================================================================
       11. UI — 设置面板与语言面板
       ================================================================ */

    function openSettings() {
        if (isLangPanelOpen) closeLangPanel();
        if (isSettingsPanelOpen) return;
        isSettingsPanelOpen = true;
        settingsPanel.classList.add('active');
        settingsBtn.classList.add('panel-open');
        clearTimeout(cornerHideTimer);
        if (currentMode === 'local') refreshLocalGallery();
        else { uploadBtn.style.display = ''; resetBtn.style.display = ''; }
    }

    function closeSettings() {
        if (!isSettingsPanelOpen) return;
        isSettingsPanelOpen = false;
        settingsPanel.classList.remove('active');
        settingsBtn.classList.remove('panel-open');
        revokeGalleryUrls();
    }

    function openLangPanel() {
        if (isSettingsPanelOpen) closeSettings();
        if (isLangPanelOpen) return;
        isLangPanelOpen = true;
        langPanel.classList.add('active');
        clearTimeout(cornerHideTimer);
    }

    function closeLangPanel() {
        if (!isLangPanelOpen) return;
        isLangPanelOpen = false;
        langPanel.classList.remove('active');
    }

    function closeAll() { closeSettings(); closeLangPanel(); }

    /* ================================================================
       12. UI — 本地壁纸画廊
       ================================================================ */

    // 追踪画廊中创建的 blob URL，关闭画廊时必须清理，防止内存泄漏
    var _galleryBlobUrls = [];

    function revokeGalleryUrls() {
        _galleryBlobUrls.forEach(function (url) { URL.revokeObjectURL(url); });
        _galleryBlobUrls = [];
    }

    function removeLocalGallery() {
        revokeGalleryUrls();
        var gallery = document.getElementById('localGallery');
        if (gallery) gallery.style.display = 'none';
        uploadBtn.style.display = '';
        resetBtn.style.display = '';
    }

    function refreshLocalGallery() {
        if (currentMode !== 'local') return;
        var order = loadOrder();
        if (!order.length) return;
        // 并行读取所有图片元数据（用于名称 tooltip + blob URL 回退）
        var reads = order.map(function (id) { return idbGet(imgKey(id)); });
        Promise.all(reads).then(function (images) {
            renderLocalGallery(order, images, loadThumbs());
        }).catch(function () { });
    }

    /** 获取或创建画廊容器 DOM 元素 */
    function ensureGalleryContainer() {
        var gallery = document.getElementById('localGallery');
        if (!gallery) {
            gallery = document.createElement('div');
            gallery.id = 'localGallery';
            gallery.className = 'local-gallery';
            wallpaperInfoEl.parentNode.insertBefore(gallery, uploadBtn);
        }
        // 清空旧内容
        while (gallery.firstChild) gallery.removeChild(gallery.firstChild);
        gallery.style.display = 'block';
        return gallery;
    }

    /** 构建缩略图网格，每张卡片含删除按钮 */
    function buildGalleryGrid(order, images, thumbs) {
        var grid = document.createElement('div');
        grid.className = 'local-gallery-grid';

        order.forEach(function (id, i) {
            var card = document.createElement('div');
            card.className = 'local-thumb';

            // 优先用预生成的 base64 缩略图（localStorage），缺失时回退到 blob URL
            var bg = thumbs[id];
            var img = images[i];
            if (!bg && img && img.blob && img.blob.size > 0) {
                var url = URL.createObjectURL(img.blob);
                _galleryBlobUrls.push(url);
                bg = 'url(' + url + ')';
            }
            if (bg) card.style.backgroundImage = bg;

            var delBtn = document.createElement('button');
            delBtn.className = 'local-thumb-del';
            delBtn.title = t('deleteImage') + (img && img.name ? ': ' + img.name : '');
            delBtn.setAttribute('data-id', id);
            delBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                deleteLocalImage(this.dataset.id);
            });
            card.appendChild(delBtn);
            grid.appendChild(card);
        });

        return grid;
    }

    function renderLocalGallery(order, images, thumbs) {
        revokeGalleryUrls();
        var gallery = ensureGalleryContainer();

        wallpaperInfoEl.textContent = t('wpLocal') + ' · ' + order.length + ' ' + t('imageCount');

        var grid = buildGalleryGrid(order, images, thumbs);
        gallery.appendChild(grid);

        // WHY: 上限 12 张 —— localStorage 缩略图占用空间，12 张已足够轮播多样性
        if (order.length < 12) {
            var addBtn = document.createElement('button');
            addBtn.className = 'panel-btn primary';
            addBtn.textContent = '+ ' + t('addImage');
            addBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                _keepGalleryOpen = true;
                fileInput.click();
            });
            gallery.appendChild(addBtn);
        }

        uploadBtn.style.display = 'none';
    }

    /* ================================================================
       13. UI — 角落按钮与搜索栏显隐逻辑

       WHY 角落按钮默认隐藏：
         保持壁纸的干净视觉效果。按钮仅在鼠标移到右上角时淡入。
         面板打开时始终保持可见，避免用户找不到关闭按钮。
       ================================================================ */

    function showCorners() {
        settingsBtn.classList.add('visible');
        langBtn.classList.add('visible');
    }

    /**
     * 延迟隐藏角落按钮。
     *
     * WHY 400ms 延迟：
     *   防止用户鼠标稍微移出触发区域就立即隐藏。
     *   但如果面板正在打开状态，隐藏会被跳过 —— 面板需要这些按钮。
     */
    function hideCorners() {
        if (isSettingsPanelOpen || isLangPanelOpen) return;
        clearTimeout(cornerHideTimer);
        cornerHideTimer = setTimeout(function () {
            if (!isMouseInCornerZone && !isSettingsPanelOpen && !isLangPanelOpen) {
                settingsBtn.classList.remove('visible');
                langBtn.classList.remove('visible');
            }
        }, 400);
    }

    /** 鼠标是否在右上角触发区域（宽 180px × 高 130px） */
    function isNearTopRight(x, y) { return x > window.innerWidth - 180 && y < 130; }

    /**
     * 鼠标是否在屏幕中心区域。
     *
     * WHY 只在中心区域触发搜索栏：
     *   用户移到角落操作按钮时不应弹出搜索栏。
     *   30%-70% 的宽高范围覆盖了用户的自然视线焦点。
     */
    function isInCenter(x, y) {
        var w = window.innerWidth, h = window.innerHeight;
        return x > w * 0.3 && x < w * 0.7 && y > h * 0.42 && y < h * 0.58;
    }

    function showSearch() {
        if (searchMode === 'never') return;
        if (searchMode === 'always') { searchBar.classList.add('visible'); return; }
        clearTimeout(searchHideTimer);
        searchBar.classList.add('visible');
    }

    /**
     * 延迟隐藏搜索栏。
     *
     * WHY 150ms 延迟 + 聚焦保护：
     *   用户可能在搜索栏和页面其他区域之间移动鼠标。
     *   输入框聚焦时绝不隐藏 —— 用户在打字。
     */
    function hideSearch() {
        if (searchMode === 'always') return;
        if (document.activeElement === searchInput) return;
        clearTimeout(searchHideTimer);
        searchHideTimer = setTimeout(function () {
            if (!isMouseInSearchZone && document.activeElement !== searchInput) searchBar.classList.remove('visible');
        }, 150);
    }

    /* ================================================================
       14. UI — 搜索设置控件
       ================================================================ */

    function applySearchMode(mode) {
        searchMode = mode;
        searchBar.classList.toggle('visible', mode === 'always');
    }

    /**
     * 应用图标透明度。
     *
     * WHY 用 CSS 自定义属性 --icon-opacity：
     *   所有角落图标和面板元素的透明度由一个值统一控制。
     *   修改 CSS 变量一次即可刷新所有元素，无需逐个操作 DOM。
     */
    function applyOpacity(val) {
        currentOpacity = parseFloat(val);
        document.documentElement.style.setProperty('--icon-opacity', currentOpacity);
        opacityRange.value = currentOpacity;
        opacityNumInput.value = currentOpacity;
    }

    function applyEngine(engine) {
        currentEngine = engine;
        engineIndex = ENGINES.indexOf(engine);
        engineIcon.innerHTML = ENGINE_SVG[engine] || ENGINE_SVG.google;
        engineSelect.value = engine;
        saveSettings();
    }

    function nextEngine() {
        engineIndex = (engineIndex + 1) % ENGINES.length;
        applyEngine(ENGINES[engineIndex]);
    }

    function saveSettings() {
        localStorage.setItem(LS_KEY_SEARCH_MODE, searchMode);
        localStorage.setItem(LS_KEY_ICON_OPACITY, currentOpacity);
        localStorage.setItem(LS_KEY_SEARCH_ENGINE, currentEngine);
    }

    function loadSettings() {
        var mode = localStorage.getItem(LS_KEY_SEARCH_MODE) || 'always';
        var opacity = parseFloat(localStorage.getItem(LS_KEY_ICON_OPACITY)) || 0.45;
        var engine = localStorage.getItem(LS_KEY_SEARCH_ENGINE) || 'google';
        searchModeSelect.value = mode;
        applySearchMode(mode);
        applyOpacity(opacity);
        applyEngine(engine);
    }

    /* ================================================================
       15. 搜索引擎配置

       WHY 内联 SVG：
         无需外部图标字体或图片文件。SVG 体积小、可缩放、支持 CSS 着色。
         直接嵌入 JS 避免了额外的 HTTP 请求。
       ================================================================ */

    var ENGINES = ['google', 'bing', 'baidu', 'duckduckgo'];

    var ENGINE_SVG = {
        google: '<svg height="1em" viewBox="0 0 24 24" width="1em"><path d="M23 12.245c0-.905-.075-1.565-.236-2.25h-10.54v4.083h6.186c-.124 1.014-.797 2.542-2.294 3.569l-.021.136 3.332 2.53.23.022C21.779 18.417 23 15.593 23 12.245z" fill="#4285F4"/><path d="M12.225 23c3.03 0 5.574-.978 7.433-2.665l-3.542-2.688c-.948.648-2.22 1.1-3.891 1.1a6.745 6.745 0 01-6.386-4.572l-.132.011-3.465 2.628-.045.124C4.043 20.531 7.835 23 12.225 23z" fill="#34A853"/><path d="M5.84 14.175A6.65 6.65 0 015.463 12c0-.758.138-1.491.361-2.175l-.006-.147-3.508-2.67-.115.054A10.831 10.831 0 001 12c0 1.772.436 3.447 1.197 4.938l3.642-2.763z" fill="#FBBC05"/><path d="M12.225 5.253c2.108 0 3.529.892 4.34 1.638l3.167-3.031C17.787 2.088 15.255 1 12.225 1 7.834 1 4.043 3.469 2.197 7.062l3.63 2.763a6.77 6.77 0 016.398-4.572z" fill="#EB4335"/></svg>',
        bing: '<svg height="1em" viewBox="0 0 24 24" width="1em"><defs><radialGradient cx="93.7%" cy="77.8%" r="143.7%" id="b0"><stop offset="0%" stop-color="#00CACC"/><stop offset="100%" stop-color="#048FCE"/></radialGradient><radialGradient cx="13.9%" cy="71.4%" r="149.2%" id="b1"><stop offset="0%" stop-color="#00BBEC"/><stop offset="100%" stop-color="#2756A9"/></radialGradient><linearGradient id="b2" x1="50%" x2="50%" y1="0%" y2="100%"><stop offset="0%" stop-color="#00BBEC"/><stop offset="100%" stop-color="#2756A9"/></linearGradient></defs><path d="M11.97 7.57a.92.92 0 00-.805.863c-.013.195-.01.209.43 1.347 1 2.59 1.242 3.214 1.283 3.302.099.213.237.413.41.592.134.138.222.212.37.311.26.176.39.224 1.405.527.989.295 1.529.49 1.994.723.603.302 1.024.644 1.29 1.051.191.292.36.815.434 1.342.029.206.029.661 0 .847a2.491 2.491 0 01-.376 1.026c-.1.151-.065.126.081-.058.415-.52.838-1.408 1.054-2.213a6.728 6.728 0 00.102-3.012 6.626 6.626 0 00-3.291-4.53l-1.322-.698-.254-.133-1.575-.827c-.548-.29-.78-.406-.846-.426a1.376 1.376 0 00-.29-.045l-.093.01z" fill="url(#b0)"/><path d="M13.164 17.24l-.202.125-1.795 1.115-.989.614-.463.288-1.502.941c-.326.2-.704.334-1.09.387-.18.024-.52.024-.7 0a2.807 2.807 0 01-1.318-.538 3.665 3.665 0 01-.543-.545 2.837 2.837 0 01-.506-1.141l-.041-.182c-.008-.008.006.138.032.33.027.199.085.487.147.733.482 1.907 1.85 3.457 3.705 4.195a6.31 6.31 0 001.658.412c.22.025.844.035 1.074.017 1.054-.08 1.972-.393 2.913-.992l.937-.596.384-.244.684-.435.234-.149.009-.005.025-.017.013-.007.172-.11.597-.38c.76-.481.987-.65 1.34-.998.148-.146.37-.394.381-.425l.088-.136a2.49 2.49 0 00.373-1.023 4.181 4.181 0 000-.847 4.336 4.336 0 00-.318-1.137c-.224-.472-.7-.9-1.383-1.245l-.406-.181c-.01 0-.646.392-1.413.87l-1.658 1.031-.439.274z" fill="url(#b1)"/><path d="M4.003 14.946l.004 3.33.042.193c.134.604.366 1.04.77 1.445a2.701 2.701 0 001.955.814c.536 0 1-.135 1.479-.43l.703-.435.556-.346V8.003c0-2.306-.004-3.675-.012-3.782a2.734 2.734 0 00-.797-1.765c-.145-.144-.268-.24-.637-.496L5.762.362C5.406.115 5.38.098 5.271.059a.943.943 0 00-1.254.696C4.003.818 4 1.659 4 6.223v5.394H4l.003 3.329z" fill="url(#b2)"/></svg>',
        duckduckgo: '<svg viewBox="0 0 122.88 122.88"><defs><style>.a{fill:#d53}.b{fill:#fff}.c{fill:#ddd}.d{fill:#fc0}.e{fill:#6b5}.f{fill:#4a4}.g{fill:#148}</style></defs><path class="a" d="M122.88 61.44a61.44 61.44 0 10-61.44 61.44 61.44 61.44 0 0061.44-61.44z"/><path class="b" d="M114.37 61.44a52.92 52.92 0 10-15.5 37.43 52.76 52.76 0 0015.5-37.43zm-13.12-39.8A56.29 56.29 0 1161.44 5.15a56.12 56.12 0 0139.81 16.49z"/><path class="c" d="M43.24 30.15C26.17 34.13 32.43 58 32.43 58l10.81 52.9 4 1.71-4-82.49zm-4-10.24H34.7L41 22.19s-6.26 0-6.26 4C48.36 25.6 54.61 29 54.61 29l-15.36-9.1z"/><path class="b" d="M75.66 115.48S62 93.87 62 79.64c0-26.73 17.63-4 17.63-25S62 28.44 62 28.44c-8.53-10.8-25-8.53-25-8.53l4 2.28s-4 1.13-5.12 2.27 10.81-1.7 15.93 2.85C30.72 29 34.13 46.08 34.13 46.08l11.95 68.27 29.58 1.13z"/><path class="d" d="M75.66 60.87l21.62-5.69C116.62 58 80.78 68.84 78.51 68.27c-17.07-2.85-12 11.37 8.53 6.82s5.12 11.38-13.65 5.12c-26.74-7.39-12.52-20.48 2.27-19.34z"/><path class="e" d="M70 105.81l1.14-1.7c12.52 4.55 13.09 6.25 12.52-5.12s0-11.38-13.09-1.71c0-2.84-7.39-1.71-8.53 0-11.95-5.12-13.09-6.83-12.52 1.14 1.14 16.5.57 13.65 11.95 8l8.53-.57z"/><path class="f" d="M60.87 99.56v6.82c.57 1.14 9.67 1.14 9.67-1.14s-4.55 1.71-7.39.57S62 98.42 62 98.42l-1.14 1.14z"/><path class="g" d="M48.36 43.24c-2.85-3.42-10.24-.57-8.54 4 .57-2.28 4.55-5.69 8.54-4zm18.2 0c.57-3.42 6.26-4 8-.57a8 8 0 00-8 .57zm-18.77 9.1a1.14 1.14 0 110 .57v-.57zm-4.55 2.27a4 4 0 100-.57v.57zm29.58-4a1.14 1.14 0 110 .57v-.57zM69.4 52.91a3.42 3.42 0 100-.57v.57z"/></svg>',
        baidu: '<svg height="1em" viewBox="0 0 24 24" width="1em"><path d="M8.859 11.735c1.017-1.71 4.059-3.083 6.202.286 1.579 2.284 4.284 4.397 4.284 4.397s2.027 1.601.73 4.684c-1.24 2.956-5.64 1.607-6.005 1.49l-.024-.009s-1.746-.568-3.776-.112c-2.026.458-3.773.286-3.773.286l-.045-.001c-.328-.01-2.38-.187-3.001-2.968-.675-3.028 2.365-4.687 2.592-4.968.226-.288 1.802-1.37 2.816-3.085zm.986 1.738v2.032h-1.64s-1.64.138-2.213 2.014c-.2 1.252.177 1.99.242 2.148.067.157.596 1.073 1.927 1.342h3.078v-7.514l-1.394-.022zm3.588 2.191l-1.44.024v3.956s.064.985 1.44 1.344h3.541v-5.3h-1.528v3.979h-1.46s-.466-.068-.553-.447v-3.556zM9.82 16.715v3.06H8.58s-.863-.045-1.126-1.049c-.136-.445.02-.959.088-1.16.063-.203.353-.671.951-.85H9.82zm9.525-9.036c2.086 0 2.646 2.06 2.646 2.742 0 .688.284 3.597-2.309 3.655-2.595.057-2.704-1.77-2.704-3.08 0-1.374.277-3.317 2.367-3.317zM4.24 6.08c1.523-.135 2.645 1.55 2.762 2.513.07.625.393 3.486-1.975 4-2.364.515-3.244-2.249-2.984-3.544 0 0 .28-2.797 2.197-2.969zm8.847-1.483c.14-1.31 1.69-3.316 2.931-3.028 1.236.285 2.367 1.944 2.137 3.37-.224 1.428-1.345 3.313-3.095 3.082-1.748-.226-2.143-1.823-1.973-3.424zM9.425 1c1.307 0 2.364 1.519 2.364 3.398 0 1.879-1.057 3.4-2.364 3.4s-2.367-1.521-2.367-3.4C7.058 2.518 8.118 1 9.425 1z" fill="#2932E1"/></svg>'
    };

    /** Web 模式的搜索行为 —— 在新标签页打开对应引擎的搜索结果 */
    var doSearch = function (query) {
        if (!query.trim()) return;
        var urls = { google: 'https://www.google.com/search?q=', bing: 'https://www.bing.com/search?q=', baidu: 'https://www.baidu.com/s?wd=', duckduckgo: 'https://duckduckgo.com/?q=' };
        window.open(urls[currentEngine] + encodeURIComponent(query), '_self');
    };

    /* ================================================================
       16. 扩展模式

       WHY 使用 chrome.search.query() 替代多引擎：
         Chrome Web Store 单一用途政策要求扩展只能做一件事。
         用浏览器的默认搜索引擎执行搜索（chrome.search.query），
         而不是让用户在多个引擎间选择，满足 CWS 合规要求。
         permission manifest 中的 "search" 权限也是为此 API 必需的。
       ================================================================ */

    function setupExtensionMode() {
        doSearch = function (query) {
            if (!query.trim()) return;
            try {
                chrome.search.query({ text: query, disposition: 'CURRENT_TAB' });
            } catch (e) {
                window.open('https://www.google.com/search?q=' + encodeURIComponent(query), '_self');
            }
        };
        // 扩展模式下搜索引擎图标变为静态放大镜，不可点击切换
        engineIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 16 16"><g clip-path="url(#a)"><path d="M14 12.94 10.16 9.1c1.25-1.76 1.1-4.2-.48-5.78a4.49 4.49 0 0 0-6.36 0 4.49 4.49 0 0 0 0 6.36 4.486 4.486 0 0 0 5.78.48L12.94 14 14 12.94ZM4.38 8.62a3 3 0 0 1 0-4.24 3 3 0 0 1 4.24 0 3 3 0 0 1 0 4.24 3 3 0 0 1-4.24 0Z"/></g><defs><clipPath id="a"><path d="M0 0h16v16H0z"/></clipPath></defs></svg>';
        engineIcon.style.opacity = '0.45';
        engineIcon.style.pointerEvents = 'none';
        // 隐藏搜索引擎选择行 —— 扩展模式下不适用
        engineSelect.closest('.setting-row').style.display = 'none';
    }

    /* ================================================================
       17. 事件绑定

       WHY 所有事件绑定集中管理：
         方便一目了然地看到整个页面的交互逻辑，
         避免绑定代码散落在各功能函数中难以追踪。
       ================================================================ */

    // 标记画廊 "+" 按钮触发的上传（保持面板打开）
    var _keepGalleryOpen = false;

    function bindEvents() {
        // --- 角落按钮：点击与悬停 ---

        settingsBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            isSettingsPanelOpen ? closeSettings() : openSettings();
        });
        settingsBtn.addEventListener('mouseenter', function () { isMouseInCornerZone = true; showCorners(); });
        settingsBtn.addEventListener('mouseleave', function () { isMouseInCornerZone = false; if (!isSettingsPanelOpen && !isLangPanelOpen) hideCorners(); });

        langBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            isLangPanelOpen ? closeLangPanel() : openLangPanel();
        });
        langBtn.addEventListener('mouseenter', function () { isMouseInCornerZone = true; showCorners(); });
        langBtn.addEventListener('mouseleave', function () { isMouseInCornerZone = false; if (!isSettingsPanelOpen && !isLangPanelOpen) hideCorners(); });

        // --- 全局鼠标跟踪 ---

        document.addEventListener('mousemove', function (e) {
            if (isNearTopRight(e.clientX, e.clientY)) showCorners();
            else if (!isMouseInCornerZone && !isSettingsPanelOpen && !isLangPanelOpen) hideCorners();
            if (isInCenter(e.clientX, e.clientY)) showSearch();
            else hideSearch();
        });

        // --- 搜索栏 ---

        searchBar.addEventListener('mouseenter', function () { isMouseInSearchZone = true; clearTimeout(searchHideTimer); });
        searchBar.addEventListener('mouseleave', function () { isMouseInSearchZone = false; hideSearch(); });
        searchInput.addEventListener('focus', function () { searchBar.classList.add('visible'); clearTimeout(searchHideTimer); });
        searchInput.addEventListener('blur', function () { hideSearch(); });

        // --- 键盘快捷键 ---

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') { closeAll(); hideCorners(); }
            // WHY: Ctrl+Shift+W (Cmd+Shift+W on Mac) 作为设置面板的键盘快捷键
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'W') { e.preventDefault(); isSettingsPanelOpen ? closeSettings() : openSettings(); }
            if (e.key === 'Enter' && document.activeElement === searchInput) doSearch(searchInput.value);
        });

        // --- 全局点击关闭 ---

        document.addEventListener('click', function (e) {
            if (isSettingsPanelOpen && !settingsPanel.contains(e.target) && e.target !== settingsBtn && !settingsBtn.contains(e.target)) closeSettings();
            if (isLangPanelOpen && !langPanel.contains(e.target) && e.target !== langBtn && !langBtn.contains(e.target)) closeLangPanel();
            hideCorners();
        });

        // --- 面板鼠标交互 ---

        settingsPanel.addEventListener('mouseenter', function () { clearTimeout(cornerHideTimer); isMouseInCornerZone = true; });
        settingsPanel.addEventListener('mouseleave', function () { isMouseInCornerZone = false; cornerHideTimer = setTimeout(function () { closeSettings(); hideCorners(); }, 500); });
        settingsPanel.addEventListener('click', function (e) { e.stopPropagation(); });

        langPanel.addEventListener('mouseenter', function () { clearTimeout(cornerHideTimer); isMouseInCornerZone = true; });
        langPanel.addEventListener('mouseleave', function () { isMouseInCornerZone = false; cornerHideTimer = setTimeout(function () { closeLangPanel(); hideCorners(); }, 500); });
        langPanel.addEventListener('click', function (e) { e.stopPropagation(); });

        // --- 设置面板内控件 ---

        uploadBtn.addEventListener('click', function (e) { e.stopPropagation(); _keepGalleryOpen = false; fileInput.click(); });

        fileInput.addEventListener('change', function () {
            var all = Array.from(fileInput.files || []);
            var files = all.filter(function (f) { return f.type && f.type.match(/^image\//); });
            fileInput.value = '';

            if (!files.length) return;

            var order = loadOrder();
            var slots = Math.max(0, 12 - order.length);
            if (!slots) return;

            // 加载现有图片名称，用于跨批次去重
            var reads = order.map(function (id) { return idbGet(imgKey(id)); });
            return Promise.all(reads).then(function (existingImages) {
                var known = {};
                existingImages.forEach(function (img) { if (img && img.name) known[img.name] = true; });

                // 同批次内去重 + 去掉已在库中的
                var seen = {};
                var deduped = files.filter(function (f) {
                    if (seen[f.name] || known[f.name]) return false;
                    seen[f.name] = true;
                    return true;
                });

                // 截断超出 12 张的部分
                deduped = deduped.slice(0, slots);

                if (!deduped.length) {
                    log('Local', 'all ' + files.length + ' file(s) were duplicates, nothing to add');
                    if (_keepGalleryOpen) refreshLocalGallery(); else closeSettings();
                    return;
                }

                var saved = 0;
                var chain = Promise.resolve();
                deduped.forEach(function (file) {
                    chain = chain.then(function () {
                        var show = saved === 0;
                        return saveLocalImage(file, show).then(function (ok) { if (ok) saved++; });
                    });
                });
                return chain.then(function () {
                    log('Local', 'saved ' + saved + ' of ' + files.length + ' selected (' + (files.length - deduped.length) + ' duplicates skipped)');
                    if (_keepGalleryOpen) refreshLocalGallery(); else closeSettings();
                });
            });
        });

        resetBtn.addEventListener('click', function (e) { e.stopPropagation(); resetToBing(); });
        advancedToggleEl.addEventListener('click', function (e) { e.stopPropagation(); advancedSectionEl.classList.toggle('show'); });
        searchModeSelect.addEventListener('change', function () { applySearchMode(searchModeSelect.value); saveSettings(); });
        opacityRange.addEventListener('input', function () { applyOpacity(opacityRange.value); saveSettings(); });
        opacityNumInput.addEventListener('change', function () {
            var val = parseFloat(opacityNumInput.value);
            if (isNaN(val)) val = 0.45;
            val = Math.min(1, Math.max(0, val));
            applyOpacity(val);
            saveSettings();
        });
        engineSelect.addEventListener('change', function () { applyEngine(engineSelect.value); });
        resetAdvancedBtn.addEventListener('click', function () { applySearchMode('always'); searchModeSelect.value = 'always'; applyEngine('google'); applyOpacity(0.45); saveSettings(); });

        /**
         * WHY 点击搜索引擎图标会轮换引擎：
         *   Web 模式下的趣味功能。用户无需打开设置面板即可切换。
         *   扩展模式下此行为被禁用（图标不可点击），改用 chrome.search.query。
         */
        engineIcon.addEventListener('click', function (e) { e.stopPropagation(); nextEngine(); });
    }

    /* ================================================================
       18. 存储迁移

       WHY 链式迁移：
         每次改键名只需在 MIGRATIONS 加一个版本号对应的函数即可。
         新用户（stored===0）直接写版本号，不走迁移。
         老用户从旧版本号依次执行到 LS_VERSION。
       ================================================================ */

    var MIGRATIONS = {
        1: migrate_1_to_2
    };

    /** v1→v2: 统一 ptab_ 前缀 + 数组存储拆为单条 IDB key */
    function migrate_1_to_2() {
        // WHY: v1 旧键名在迁移前缓存，重命名后仍可用
        var oldThumbs = [];
        try { oldThumbs = JSON.parse(localStorage.getItem('local_thumbs') || '[]'); } catch (e) { }

        // localStorage 键名迁移（目标键名硬编码——迁移是固定时刻的快照，不随常量变化）
        // WHY: 重命名是幂等的（旧键已删则跳过），放在最前面，无论后面几步失败多少次都能安全重试
        var lsRenames = [
            ['bing_thumb', 'ptab_bing_thumb'],
            ['ptab_wallpaper_source', 'ptab_mode'],
            ['ptab_search_visibility', 'ptab_search_mode']
        ];
        lsRenames.forEach(function (pair) {
            var val = localStorage.getItem(pair[0]);
            if (val !== null) {
                localStorage.setItem(pair[1], val);
                localStorage.removeItem(pair[0]);
            }
        });

        // 事务 1：非破坏性操作——put 新 key，不删旧 key
        // WHY: 此时不删 local_images。若后续 LS 写入失败，重试时 local_images 还在，能重建 order。
        return openDB().then(function (db) {
            return new Promise(function (resolve, reject) {
                var tx = db.transaction(DB_STORE_NAME, 'readwrite');
                var store = tx.objectStore(DB_STORE_NAME);
                var result = { order: [] };

                var bingReq = store.get('bing');
                bingReq.onsuccess = function () {
                    if (bingReq.result !== undefined) {
                        store.put(bingReq.result, 'ptab_bing_blob');
                        store.delete('bing');
                    }
                };

                var liReq = store.get('local_images');
                liReq.onsuccess = function () {
                    var images = liReq.result;
                    if (images && images.length) {
                        images.forEach(function (img) {
                            var id = img.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
                            result.order.push(id);
                            store.put(
                                { blob: img.blob, mime: img.mime, name: img.name },
                                'ptab_img_' + id
                            );
                        });
                        // 不在这里 delete local_images
                    }
                };

                tx.oncomplete = function () { resolve(result); };
                tx.onerror = function (e) { reject(e.target.error); };
            });
        }).then(function (result) {
            // 先写 LS，确保 order/thumbs 落地后再清理旧数据
            if (result.order.length) {
                localStorage.setItem('ptab_img_order', JSON.stringify(result.order));
                var thumbs = {};
                for (var i = 0; i < oldThumbs.length && i < result.order.length; i++) {
                    thumbs[result.order[i]] = oldThumbs[i];
                }
                localStorage.setItem('ptab_img_thumbs', JSON.stringify(thumbs));
            }

            // 事务 2：LS 已落地，现在安全删除旧 IDB key
            return openDB().then(function (db) {
                return new Promise(function (resolve, reject) {
                    var tx = db.transaction(DB_STORE_NAME, 'readwrite');
                    var store = tx.objectStore(DB_STORE_NAME);
                    var liReq = store.get('local_images');
                    liReq.onsuccess = function () {
                        if (liReq.result !== undefined) store.delete('local_images');
                    };
                    tx.oncomplete = resolve;
                    tx.onerror = function (e) { reject(e.target.error); };
                });
            }).then(function () {
                localStorage.removeItem('local_thumbs');
            });
        });
    }

    function migrateStorage() {
        var stored = parseInt(localStorage.getItem(LS_KEY_VERSION)) || 0;
        if (stored >= LS_VERSION) return Promise.resolve();

        // 新用户：直接写版本号，不跑迁移
        if (stored === 0) {
            localStorage.setItem(LS_KEY_VERSION, LS_VERSION);
            return Promise.resolve();
        }

        log('Migrate', 'v' + stored + ' → v' + LS_VERSION + ' ...');
        var chain = Promise.resolve();
        for (var v = stored; v < LS_VERSION; v++) {
            if (!MIGRATIONS[v]) continue;
            (function (ver) {
                chain = chain.then(function () { return MIGRATIONS[ver](); });
            })(v);
        }
        return chain.then(function () {
            localStorage.setItem(LS_KEY_VERSION, LS_VERSION);
            log('Migrate', 'done, now at v' + LS_VERSION);
        }).catch(function (e) {
            warn('Migrate', 'failed: ' + e.message);
            throw e;
        });
    }

    /* ================================================================
       19. 启动引导
       ================================================================ */

    function init() {
        migrateStorage().catch(function (e) {
            warn('Init', 'migration failed, continuing: ' + e.message);
        }).then(function () {
            currentLang = localStorage.getItem(LS_KEY_LANG) || detectLang();
            if (!I18N[currentLang]) currentLang = 'en';
            log('PlainTab', 'PlainTab started  ·  ' + (IS_EXTENSION ? 'extension' : 'web') + '  ·  ' + currentLang);
            loadSettings();
            updateLangUI();
            loadWallpaper();
            if (IS_EXTENSION) setupExtensionMode();
            bindEvents();
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
