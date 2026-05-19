/**
 * Newtab —— 新标签页核心
 * 壁纸加载编排、搜索执行、全局键盘/鼠标事件、启动引导。
 * 设置面板与语言功能由 window.SettingsPanel 托管；
 * 命令面板由 window.Palette 托管。
 */
(function () {
    'use strict';

    // ================================================================
    // 命名空间别名
    // ================================================================
    var D = window.WallpaperData;
    var S = window.WallpaperShow;
    var F = window.WallpaperFetch;
    var WF = window.WallpaperFolder;
    var SP = null; // window.SettingsPanel — 在 init() 中可用

    // ================================================================
    // 工具函数
    // ================================================================

    var log = function (tag, msg) { console.log('[' + tag + '] ' + msg); };
    var warn = function (tag, msg) { console.warn('[' + tag + '] ' + msg); };
    window.log = log;
    window.warn = warn;

    function t() { return window.t.apply(window, arguments); }

    // ================================================================
    // 搜索引擎图标 SVG（settings.js 通过 window.ENGINE_SVG 引用）
    // ================================================================

    window.ENGINE_SVG = {
        google: '<svg height="1em" viewBox="0 0 24 24" width="1em"><path d="M23 12.245c0-.905-.075-1.565-.236-2.25h-10.54v4.083h6.186c-.124 1.014-.797 2.542-2.294 3.569l-.021.136 3.332 2.53.23.022C21.779 18.417 23 15.593 23 12.245z" fill="#4285F4"/><path d="M12.225 23c3.03 0 5.574-.978 7.433-2.665l-3.542-2.688c-.948.648-2.22 1.1-3.891 1.1a6.745 6.745 0 01-6.386-4.572l-.132.011-3.465 2.628-.045.124C4.043 20.531 7.835 23 12.225 23z" fill="#34A853"/><path d="M5.84 14.175A6.65 6.65 0 015.463 12c0-.758.138-1.491.361-2.175l-.006-.147-3.508-2.67-.115.054A10.831 10.831 0 001 12c0 1.772.436 3.447 1.197 4.938l3.642-2.763z" fill="#FBBC05"/><path d="M12.225 5.253c2.108 0 3.529.892 4.34 1.638l3.167-3.031C17.787 2.088 15.255 1 12.225 1 7.834 1 4.043 3.469 2.197 7.062l3.63 2.763a6.77 6.77 0 016.398-4.572z" fill="#EB4335"/></svg>',
        bing: '<svg height="1em" viewBox="0 0 24 24" width="1em"><defs><radialGradient cx="93.7%" cy="77.8%" r="143.7%" id="b0"><stop offset="0%" stop-color="#00CACC"/><stop offset="100%" stop-color="#048FCE"/></radialGradient><radialGradient cx="13.9%" cy="71.4%" r="149.2%" id="b1"><stop offset="0%" stop-color="#00BBEC"/><stop offset="100%" stop-color="#2756A9"/></radialGradient><linearGradient id="b2" x1="50%" x2="50%" y1="0%" y2="100%"><stop offset="0%" stop-color="#00BBEC"/><stop offset="100%" stop-color="#2756A9"/></linearGradient></defs><path d="M11.97 7.57a.92.92 0 00-.805.863c-.013.195-.01.209.43 1.347 1 2.59 1.242 3.214 1.283 3.302.099.213.237.413.41.592.134.138.222.212.37.311.26.176.39.224 1.405.527.989.295 1.529.49 1.994.723.603.302 1.024.644 1.29 1.051.191.292.36.815.434 1.342.029.206.029.661 0 .847a2.491 2.491 0 01-.376 1.026c-.1.151-.065.126.081-.058.415-.52.838-1.408 1.054-2.213a6.728 6.728 0 00.102-3.012 6.626 6.626 0 00-3.291-4.53l-1.322-.698-.254-.133-1.575-.827c-.548-.29-.78-.406-.846-.426a1.376 1.376 0 00-.29-.045l-.093.01z" fill="url(#b0)"/><path d="M13.164 17.24l-.202.125-1.795 1.115-.989.614-.463.288-1.502.941c-.326.2-.704.334-1.09.387-.18.024-.52.024-.7 0a2.807 2.807 0 01-1.318-.538 3.665 3.665 0 01-.543-.545 2.837 2.837 0 01-.506-1.141l-.041-.182c-.008-.008.006.138.032.33.027.199.085.487.147.733.482 1.907 1.85 3.457 3.705 4.195a6.31 6.31 0 001.658.412c.22.025.844.035 1.074.017 1.054-.08 1.972-.393 2.913-.992l.937-.596.384-.244.684-.435.234-.149.009-.005.025-.017.013-.007.172-.11.597-.38c.76-.481.987-.65 1.34-.998.148-.146.37-.394.381-.425l.088-.136a2.49 2.49 0 00.373-1.023 4.181 4.181 0 000-.847 4.336 4.336 0 00-.318-1.137c-.224-.472-.7-.9-1.383-1.245l-.406-.181c-.01 0-.646.392-1.413.87l-1.658 1.031-.439.274z" fill="url(#b1)"/><path d="M4.003 14.946l.004 3.33.042.193c.134.604.366 1.04.77 1.445a2.701 2.701 0 001.955.814c.536 0 1-.135 1.479-.43l.703-.435.556-.346V8.003c0-2.306-.004-3.675-.012-3.782a2.734 2.734 0 00-.797-1.765c-.145-.144-.268-.24-.637-.496L5.762.362C5.406.115 5.38.098 5.271.059a.943.943 0 00-1.254.696C4.003.818 4 1.659 4 6.223v5.394H4l.003 3.329z" fill="url(#b2)"/></svg>',
        duckduckgo: '<svg viewBox="0 0 122.88 122.88"><defs><style>.a{fill:#d53}.b{fill:#fff}.c{fill:#ddd}.d{fill:#fc0}.e{fill:#6b5}.f{fill:#4a4}.g{fill:#148}</style></defs><path class="a" d="M122.88 61.44a61.44 61.44 0 10-61.44 61.44 61.44 61.44 0 0061.44-61.44z"/><path class="b" d="M114.37 61.44a52.92 52.92 0 10-15.5 37.43 52.76 52.76 0 0015.5-37.43zm-13.12-39.8A56.29 56.29 0 1161.44 5.15a56.12 56.12 0 0139.81 16.49z"/><path class="c" d="M43.24 30.15C26.17 34.13 32.43 58 32.43 58l10.81 52.9 4 1.71-4-82.49zm-4-10.24H34.7L41 22.19s-6.26 0-6.26 4C48.36 25.6 54.61 29 54.61 29l-15.36-9.1z"/><path class="b" d="M75.66 115.48S62 93.87 62 79.64c0-26.73 17.63-4 17.63-25S62 28.44 62 28.44c-8.53-10.8-25-8.53-25-8.53l4 2.28s-4 1.13-5.12 2.27 10.81-1.7 15.93 2.85C30.72 29 34.13 46.08 34.13 46.08l11.95 68.27 29.58 1.13z"/><path class="d" d="M75.66 60.87l21.62-5.69C116.62 58 80.78 68.84 78.51 68.27c-17.07-2.85-12 11.37 8.53 6.82s5.12 11.38-13.65 5.12c-26.74-7.39-12.52-20.48 2.27-19.34z"/><path class="e" d="M70 105.81l1.14-1.7c12.52 4.55 13.09 6.25 12.52-5.12s0-11.38-13.09-1.71c0-2.84-7.39-1.71-8.53 0-11.95-5.12-13.09-6.83-12.52 1.14 1.14 16.5.57 13.65 11.95 8l8.53-.57z"/><path class="f" d="M60.87 99.56v6.82c.57 1.14 9.67 1.14 9.67-1.14s-4.55 1.71-7.39.57S62 98.42 62 98.42l-1.14 1.14z"/><path class="g" d="M48.36 43.24c-2.85-3.42-10.24-.57-8.54 4 .57-2.28 4.55-5.69 8.54-4zm18.2 0c.57-3.42 6.26-4 8-.57a8 8 0 00-8 .57zm-18.77 9.1a1.14 1.14 0 110 .57v-.57zm-4.55 2.27a4 4 0 100-.57v.57zm29.58-4a1.14 1.14 0 110 .57v-.57zM69.4 52.91a3.42 3.42 0 100-.57v.57z"/></svg>',
        baidu: '<svg height="1em" viewBox="0 0 24 24" width="1em"><path d="M8.859 11.735c1.017-1.71 4.059-3.083 6.202.286 1.579 2.284 4.284 4.397 4.284 4.397s2.027 1.601.73 4.684c-1.24 2.956-5.64 1.607-6.005 1.49l-.024-.009s-1.746-.568-3.776-.112c-2.026.458-3.773.286-3.773.286l-.045-.001c-.328-.01-2.38-.187-3.001-2.968-.675-3.028 2.365-4.687 2.592-4.968.226-.288 1.802-1.37 2.816-3.085zm.986 1.738v2.032h-1.64s-1.64.138-2.213 2.014c-.2 1.252.177 1.99.242 2.148.067.157.596 1.073 1.927 1.342h3.078v-7.514l-1.394-.022zm3.588 2.191l-1.44.024v3.956s.064.985 1.44 1.344h3.541v-5.3h-1.528v3.979h-1.46s-.466-.068-.553-.447v-3.556zM9.82 16.715v3.06H8.58s-.863-.045-1.126-1.049c-.136-.445.02-.959.088-1.16.063-.203.353-.671.951-.85H9.82zm9.525-9.036c2.086 0 2.646 2.06 2.646 2.742 0 .688.284 3.597-2.309 3.655-2.595.057-2.704-1.77-2.704-3.08 0-1.374.277-3.317 2.367-3.317zM4.24 6.08c1.523-.135 2.645 1.55 2.762 2.513.07.625.393 3.486-1.975 4-2.364.515-3.244-2.249-2.984-3.544 0 0 .28-2.797 2.197-2.969zm8.847-1.483c.14-1.31 1.69-3.316 2.931-3.028 1.236.285 2.367 1.944 2.137 3.37-.224 1.428-1.345 3.313-3.095 3.082-1.748-.226-2.143-1.823-1.973-3.424zM9.425 1c1.307 0 2.364 1.519 2.364 3.398 0 1.879-1.057 3.4-2.364 3.4s-2.367-1.521-2.367-3.4C7.058 2.518 8.118 1 9.425 1z" fill="#2932E1"/></svg>'
    };

    // ================================================================
    // 运行环境
    // ================================================================

    var IS_EXTENSION = typeof chrome !== 'undefined' && chrome.runtime && !!chrome.runtime.id;
    var SEARCH_URLS = {
        google: 'https://www.google.com/search?q=',
        bing: 'https://www.bing.com/search?q=',
        baidu: 'https://www.baidu.com/s?wd=',
        duckduckgo: 'https://duckduckgo.com/?q='
    };

    // ================================================================
    // DOM 元素
    // ================================================================

    var wallpaperBackEl = document.getElementById('wallpaperBack');
    var wallpaperFrontEl = document.getElementById('wallpaperFront');
    var rssInfoEl = document.getElementById('rssWallpaperInfo');
    var searchBar = document.getElementById('searchBar');
    var searchInput = document.getElementById('searchInput');

    // ================================================================
    // 状态
    // ================================================================

    var isMouseInSearchZone = false;
    var searchHideTimer = null;
    var searchHistoryPanel = null;
    var searchHistoryVisible = false;
    var searchHistoryMatches = [];
    var searchHistoryIndex = -1;
    var searchHistoryHideTimer = null;
    var suppressSearchHistoryOnFocus = false;
    var SEARCH_HISTORY_GAP = 8;
    var SEARCH_HISTORY_VIEWPORT_PADDING = 12;
    var FOLDER_GALLERY_LIMIT = 12;
    var FOLDER_THUMB_LOOKAHEAD = 12;
    var paletteLoadPromise = null;
    var folderRescannedThisSession = false;
    var folderPermissionNoticeDismissed = false;

    // ================================================================
    // 壁纸 — 主加载流程（编排层）
    // ================================================================

    function cacheBingInBackground() {
        var today = new Date().toDateString();
        var meta = D.loadBingMeta();
        if (meta.date === today && meta.src) return;
        F.fetchBingUrl(SP.getCurrentLang()).then(function (r) {
            return F.cacheBingBlob(r.url, r.api, today).then(function (blob) {
                if (blob && SP.getCurrentMode() === 'bing') {
                    applyWallpaperRespectingBlur(URL.createObjectURL(blob), 'bing');
                }
            });
        }).catch(function () { warn('Bing', 'background: failed, will retry later'); });
    }

    function getWallpaperBlur() {
        var ui = D.loadUI ? D.loadUI() : null;
        var blur = ui && ui.wallpaper ? ui.wallpaper.blur : 0;
        return D.normalizeWallpaperBlur ? D.normalizeWallpaperBlur(blur) : 0;
    }

    function saveNextPreview(nextId, blur) {
        var thumbs = D.loadThumbs();
        var preview = blur >= 5 && D.blurThumbFor ? D.blurThumbFor(nextId, blur) : null;
        if (!preview) preview = thumbs[nextId] || null;
        D.savePreview(preview);
    }

    function scheduleNextBlurPreview(nextId, blur) {
        if (!nextId || blur < 5 || !S.blurredThumbnail || !D.saveBlurThumb) return;
        if (D.blurThumbFor && D.blurThumbFor(nextId, blur)) return;

        var run = function () {
            D.idbGet(D.imgKey(nextId)).then(function (record) {
                if (!record || !record.blob) return;
                var blob = record.blob;
                if ((!blob.type || blob.type === '') && record.mime) {
                    try { blob = new Blob([blob], { type: record.mime }); } catch (e) { }
                }
                var url = URL.createObjectURL(blob);
                return S.blurredThumbnail(url, blur).then(function (thumb) {
                    URL.revokeObjectURL(url);
                    if (thumb) {
                        D.saveBlurThumb(nextId, blur, thumb);
                        saveNextPreview(nextId, blur);
                    }
                }, function () {
                    URL.revokeObjectURL(url);
                });
            }).catch(function () { });
        };

        if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 1600 });
        else setTimeout(run, 300);
    }

    function escapeText(value) {
        return String(value || '').replace(/[&<>"']/g, function (c) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
        });
    }

    function hideRssOverlay() {
        if (!rssInfoEl) return;
        rssInfoEl.hidden = true;
        rssInfoEl.innerHTML = '';
    }

    function renderRssOverlay(id) {
        if (!rssInfoEl) return;
        var config = D.loadRssConfig();
        var meta = id ? D.loadMeta()[id] : null;
        if (!config.showSummary || !meta) {
            hideRssOverlay();
            return;
        }

        rssInfoEl.className = 'rss-wallpaper-info ' + config.summaryPosition + ' ' + config.summaryMode;
        var title = escapeText(meta.title || meta.sourceName || 'RSS');
        var desc = escapeText(meta.description || '');
        var openLabel = t('rssOpenArticle');
        if (!openLabel || openLabel === 'rssOpenArticle') openLabel = 'Open article';
        var link = config.showLink && meta.link ? '<a href="' + escapeText(meta.link) + '" target="_blank" rel="noopener">' + escapeText(openLabel) + '</a>' : '';

        if (config.summaryMode === 'icon') {
            rssInfoEl.innerHTML = '<button class="rss-info-toggle" aria-label="RSS info">i</button><div class="rss-info-popover"><div class="rss-info-title">' + title + '</div><div class="rss-info-desc">' + desc + '</div>' + link + '</div>';
        } else {
            rssInfoEl.innerHTML = '<div class="rss-info-title">' + title + '</div><div class="rss-info-desc">' + desc + '</div>' + link;
        }
        rssInfoEl.hidden = false;
    }

    function activeRssSource() {
        var config = D.loadRssConfig();
        return config.sources.filter(function (source) { return source.id === config.activeSourceId; })[0] || config.sources[0] || null;
    }

    function activeApiSource() {
        var config = D.loadApiConfig();
        return D.activeApiSource ? D.activeApiSource(config) : null;
    }

    function updateFolderState(mutator) {
        D.updateWallpaper(function (next) {
            var state = next.providers.folder.state || {};
            mutator(state);
            next.providers.folder.state = state;
        });
    }

    function isRssRefreshDue(config, state) {
        if (!config.refreshIntervalMs) return false;
        if (!state.lastSuccessAt) return true;
        return Date.now() - state.lastSuccessAt >= config.refreshIntervalMs;
    }

    function isApiRefreshDue(config, state) {
        var interval = parseInt(config.refreshIntervalMs, 10);
        if (interval === 0) return false;
        if (interval === -1) return true;
        return !state.lastSuccessAt || Date.now() - state.lastSuccessAt >= interval;
    }

    function cleanupOldRssBlobs(activeOrder) {
        var active = {};
        (activeOrder || []).forEach(function (id) { active[id] = true; });
        var meta = D.loadMeta();
        var stale = Object.keys(meta).filter(function (id) { return D.isRssId && D.isRssId(id) && !active[id]; });
        stale.forEach(function (id) { delete meta[id]; });
        D.saveMeta(meta);

        var thumbs = D.loadThumbs();
        stale.forEach(function (id) {
            delete thumbs[id];
            if (D.deleteBlurThumb) D.deleteBlurThumb(id);
        });
        D.saveThumbs(thumbs);
        D.idbDeleteMany(stale.map(function (id) { return D.imgKey(id); })).catch(function () { });
    }

    function refreshRssInBackground(force) {
        var config = D.loadRssConfig();
        var model = D.loadWallpaper();
        var state = model.providers.rss.state || {};
        if (!force && !isRssRefreshDue(config, state)) return Promise.resolve(false);

        var source = activeRssSource();
        if (!source) return Promise.resolve(false);

        state.lastCheckedAt = Date.now();
        state.lastError = '';
        D.updateWallpaper(function (next) { next.providers.rss.state = state; });

        return F.refreshRssSource(source).then(function (result) {
            D.updateWallpaper(function (next) {
                next.activeSource = 'rss';
                next.cache.order = result.order;
                next.cache.index = 0;
                next.cache.meta = result.meta;
                next.providers.rss.state.lastSuccessAt = Date.now();
                next.providers.rss.state.lastImageUrl = result.items[0] ? result.items[0].imageUrl : '';
                next.providers.rss.state.lastError = '';
            });
            var first = result.order[0];
            if (result.thumbs[first]) D.savePreview(result.thumbs[first]);
            cleanupOldRssBlobs(result.order);
            return true;
        }).catch(function (err) {
            D.updateWallpaper(function (next) {
                next.providers.rss.state.lastError = err && err.message ? err.message : String(err || 'RSS refresh failed');
            });
            warn('RSS', 'refresh failed: ' + (err && err.message ? err.message : err));
            return false;
        });
    }

    function isCurrentOriginalId(id) {
        var source = D.compatMode(D.getActiveSource());
        if (source === 'bing' || source === 'api') return id === source;
        var order = D.loadOrder();
        if (!order.length) return false;
        var currentIndex = (D.getActiveIndex() - 1 + order.length) % order.length;
        return order[currentIndex] === id;
    }

    function prepareCurrentOriginalUrl(id) {
        if (!id || !S.keepCurrentUrl) return;
        D.idbGet(D.imgKey(id)).then(function (record) {
            if (!record || !record.blob) return;
            var blob = record.blob;
            if ((!blob.type || blob.type === '') && record.mime) {
                try { blob = new Blob([blob], { type: record.mime }); } catch (e) { }
            }
            var url = URL.createObjectURL(blob);
            if (!isCurrentOriginalId(id)) {
                URL.revokeObjectURL(url);
                return;
            }
            S.keepCurrentUrl(url, id);
        }).catch(function () { });
    }

    function applyWallpaperRespectingBlur(url, sourceId) {
        var blur = getWallpaperBlur();
        if (blur < 5 || !S.blurredThumbnail || !S.showPreparedPreview) {
            return S.applyAndSavePreview(url, sourceId);
        }

        return S.preloadImage(url).then(function (img) {
            if (!img) return S.applyAndSavePreview(url, sourceId);
            return Promise.all([
                S.thumbnail(img),
                S.blurredThumbnail(img, blur)
            ]).then(function (results) {
                var thumb = results[0];
                var blurThumb = results[1];
                if (sourceId && blurThumb && D.saveBlurThumb) D.saveBlurThumb(sourceId, blur, blurThumb);
                if (blurThumb) {
                    D.savePreview(blurThumb);
                    if (S.keepCurrentUrl) S.keepCurrentUrl(url, sourceId);
                    S.showPreparedPreview(blurThumb, { keepCurrentUrl: true });
                } else if (thumb) {
                    D.savePreview(thumb);
                    if (S.keepCurrentUrl) S.keepCurrentUrl(url, sourceId);
                    S.showPreparedPreview(thumb, { keepCurrentUrl: true });
                }
                return img;
            });
        });
    }

    function folderPreviewForName(name, blur) {
        var id = D.folderId(name);
        return blur >= 5 && D.blurThumbFor ? D.blurThumbFor(id, blur) : D.loadThumbs()[id];
    }

    function saveFolderNextPreview(name, blur) {
        if (!name) return;
        var preview = folderPreviewForName(name, blur);
        if (preview) D.savePreview(preview);
    }

    function scheduleFolderNextPreview(handle, name, blur) {
        if (!handle || !name || !WF || !WF.readImageFile || !WF.preparePreviewFromFile) return;
        var id = D.folderId(name);
        var existing = folderPreviewForName(name, blur);
        if (existing) {
            D.savePreview(existing);
            return;
        }

        var run = function () {
            WF.readImageFile(handle, name).then(function (file) {
                return WF.preparePreviewFromFile(file, id, blur);
            }).then(function (prepared) {
                var thumbs = D.loadThumbs();
                if (prepared.thumb) thumbs[id] = prepared.thumb;
                D.saveThumbs(thumbs);
                if (blur >= 5 && prepared.preview && D.saveBlurThumb) D.saveBlurThumb(id, blur, prepared.preview);
                if (prepared.preview) D.savePreview(prepared.preview);
            }).catch(function () { });
        };

        if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 1800 });
        else setTimeout(run, 300);
    }

    function normalizeFolderFiles(files) {
        var seen = {};
        return (Array.isArray(files) ? files : []).filter(function (file) {
            if (!file || !file.name || seen[file.name]) return false;
            seen[file.name] = true;
            return true;
        });
    }

    function buildFolderPreviewWindow(files, currentName, shuffleBag, limit) {
        limit = parseInt(limit, 10) || FOLDER_GALLERY_LIMIT;
        if (WF && WF.buildPreviewWindow) return WF.buildPreviewWindow(files, currentName, shuffleBag, limit);
        var names = [];
        function add(name) {
            name = String(name || '').trim();
            if (name && names.indexOf(name) === -1 && names.length < limit) names.push(name);
        }
        add(currentName);
        (Array.isArray(shuffleBag) ? shuffleBag : []).forEach(add);
        (Array.isArray(files) ? files : []).forEach(function (file) { add(file && file.name); });
        return names;
    }

    function prewarmFolderThumbs(handle, names, blur) {
        if (!handle || !names || !names.length || !WF || !WF.readImageFile || !WF.preparePreviewFromFile) return;
        var run = function () {
            var chain = Promise.resolve(false);
            names.slice(0, FOLDER_THUMB_LOOKAHEAD).forEach(function (name) {
                chain = chain.then(function (changed) {
                    var id = D.folderId(name);
                    var hasThumb = !!D.loadThumbs()[id];
                    var hasBlur = blur < 5 || !D.blurThumbFor || !!D.blurThumbFor(id, blur);
                    if (hasThumb && hasBlur) return changed;
                    return WF.readImageFile(handle, name).then(function (file) {
                        return WF.preparePreviewFromFile(file, id, blur);
                    }).then(function (prepared) {
                        var thumbs = D.loadThumbs();
                        if (prepared.thumb) thumbs[id] = prepared.thumb;
                        D.saveThumbs(thumbs);
                        if (blur >= 5 && prepared.preview && D.saveBlurThumb) D.saveBlurThumb(id, blur, prepared.preview);
                        return true;
                    }).catch(function () { return changed; });
                });
            });
            return chain.then(function (changed) {
                if (changed) {
                    var state = D.loadFolderState ? D.loadFolderState() : {};
                    var nextName = (state.shuffleBag || [])[0];
                    saveFolderNextPreview(nextName, blur);
                }
            }).catch(function () { });
        };

        if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 1800 });
        else setTimeout(run, 300);
    }

    function prewarmFolderLightCache(handle, names) {
        if (!handle || !names || !names.length || !WF || !WF.readImageFile || !WF.prepareLightCacheFromFile || !D.saveFolderLightCache) return;
        var run = function () {
            var chain = Promise.resolve(false);
            names.slice(0, FOLDER_THUMB_LOOKAHEAD).forEach(function (name) {
                chain = chain.then(function (changed) {
                    var id = D.folderId(name);
                    return WF.readImageFile(handle, name).then(function (file) {
                        return (D.loadFolderLightCache ? D.loadFolderLightCache(name) : Promise.resolve(null)).then(function (existing) {
                            if (existing && existing.blob && existing.size === file.size && existing.lastModified === file.lastModified) return changed;
                            return WF.prepareLightCacheFromFile(file, id).then(function (prepared) {
                                return D.saveFolderLightCache(name, prepared.record).then(function () { return true; });
                            });
                        });
                    }).catch(function () { return changed; });
                });
            });
            return chain.catch(function () { });
        };

        if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 2200 });
        else setTimeout(run, 500);
    }

    function pruneFolderThumbs(names) {
        var keep = {};
        (names || []).forEach(function (name) { keep[D.folderId(name)] = true; });
        var thumbs = D.loadThumbs();
        var changed = false;
        Object.keys(thumbs).forEach(function (id) {
            if (D.isFolderId && D.isFolderId(id) && !keep[id]) {
                delete thumbs[id];
                if (D.deleteBlurThumb) D.deleteBlurThumb(id);
                changed = true;
            }
        });
        if (changed) D.saveThumbs(thumbs);
    }

    function pruneFolderLightCache(names) {
        if (!D.idbKeys || !D.idbDeleteMany || !D.DB || !D.DB.FOLDER_LIGHT_PREFIX) return;
        var keep = {};
        (names || []).forEach(function (name) {
            if (D.folderLightKey) keep[D.folderLightKey(name)] = true;
        });
        D.idbKeys().then(function (keys) {
            var deletes = keys.filter(function (key) {
                return String(key).indexOf(D.DB.FOLDER_LIGHT_PREFIX) === 0 && !keep[key];
            });
            if (deletes.length) return D.idbDeleteMany(deletes);
        }).catch(function () { });
    }

    function hideFolderPermissionNotice() {
        var notice = document.getElementById('folderPermissionNotice');
        if (notice) notice.hidden = true;
    }

    function showFolderPermissionNotice() {
        if (folderPermissionNoticeDismissed) return;
        var notice = document.getElementById('folderPermissionNotice');
        if (!notice) {
            notice = document.createElement('div');
            notice.id = 'folderPermissionNotice';
            notice.className = 'folder-permission-notice';
            notice.innerHTML = '<button type="button" class="folder-permission-pill">' +
                '<span class="folder-permission-dot"></span>' +
                '<span>' + t('folderNeedsPermission') + '</span>' +
                '</button>' +
                '<div class="folder-permission-expanded">' +
                '<div class="folder-permission-copy">' +
                '<strong>' + t('folderNeedsPermission') + '</strong>' +
                '<span>' + t('folderPendingHint') + '</span>' +
                '</div>' +
                '<div class="folder-permission-actions">' +
                '<button type="button" class="folder-permission-primary">' + t('folderNeedsPermission') + '</button>' +
                '<button type="button" class="folder-permission-dismiss" aria-label="Dismiss">x</button>' +
                '</div>' +
                '</div>';
            document.body.appendChild(notice);
            notice.querySelector('.folder-permission-pill').addEventListener('click', function () {
                notice.classList.toggle('expanded');
            });
            notice.querySelector('.folder-permission-primary').addEventListener('click', function () {
                reauthorizeFolderFromNotice();
            });
            notice.querySelector('.folder-permission-dismiss').addEventListener('click', function () {
                folderPermissionNoticeDismissed = true;
                hideFolderPermissionNotice();
            });
        }
        notice.hidden = false;
    }

    function reauthorizeFolderFromNotice() {
        if (!D.loadFolderHandle || !WF || !WF.requestReadPermission) return;
        D.loadFolderHandle().then(function (handle) {
            if (!handle) return false;
            return WF.requestReadPermission(handle).then(function (state) {
                if (state !== 'granted') return false;
                folderPermissionNoticeDismissed = false;
                hideFolderPermissionNotice();
                updateFolderState(function (next) {
                    next.status = 'ready';
                    next.lastError = '';
                    next.permissionStatus = 'granted';
                    next.usingLightCache = false;
                    next.lastPermissionCheckAt = Date.now();
                });
                return loadWallpaper();
            });
        }).catch(function () { });
    }

    function removeFolderName(files, name) {
        var id = D.folderId(name);
        var thumbs = D.loadThumbs();
        var meta = D.loadMeta();
        delete thumbs[id];
        delete meta[id];
        if (D.deleteBlurThumb) D.deleteBlurThumb(id);
        D.saveThumbs(thumbs);
        D.saveMeta(meta);
        if (D.deleteFolderLightCache) D.deleteFolderLightCache(name).catch(function () { });
        return files.filter(function (file) { return file && file.name !== name; });
    }

    function folderNextCandidate(files, state) {
        files = normalizeFolderFiles(files);
        state = D.normalizeFolderState ? D.normalizeFolderState(state) : (state || {});
        var bag = (state.shuffleBag || []).filter(function (name) {
            return files.some(function (file) { return file.name === name; });
        });
        if (!bag.length && WF && WF.buildShuffleBag) bag = WF.buildShuffleBag(files, state.currentName);
        if (!bag.length && files.length) bag = [files[0].name];
        return { name: bag[0] || '', remaining: bag.slice(1), files: files };
    }

    function tryLoadFolderLightCacheWallpaper(files, state, attempt) {
        files = normalizeFolderFiles(files);
        if (!files.length || attempt > Math.min(files.length + 1, FOLDER_GALLERY_LIMIT)) return Promise.resolve(false);
        if (!D.loadFolderLightCache) return Promise.resolve(false);
        var candidate = folderNextCandidate(files, state);
        var name = candidate.name;
        if (!name) return Promise.resolve(false);
        var record = files.filter(function (file) { return file.name === name; })[0] || { name: name };
        var id = D.folderId(name);
        return D.loadFolderLightCache(name).then(function (cached) {
            if (!cached || !cached.blob) {
                state.shuffleBag = candidate.remaining;
                return tryLoadFolderLightCacheWallpaper(files, state, attempt + 1);
            }
            var blob = cached.blob;
            if ((!blob.type || blob.type === '') && cached.mime) {
                try { blob = new Blob([blob], { type: cached.mime }); } catch (e) { }
            }
            var nextBag = candidate.remaining;
            if (!nextBag.length && WF && WF.buildShuffleBag) nextBag = WF.buildShuffleBag(files, name);
            var previewWindow = buildFolderPreviewWindow(files, name, nextBag, FOLDER_GALLERY_LIMIT);
            var nextName = nextBag[0] || '';
            var pathLabel = D.loadFolderConfig ? D.loadFolderConfig().pathLabel : '';
            return applyWallpaperRespectingBlur(URL.createObjectURL(blob), id).then(function () {
                updateFolderState(function (next) {
                    next.status = 'needs-permission';
                    next.indexedCount = files.length;
                    next.lastError = 'folder permission required';
                    next.currentName = name;
                    next.shuffleBag = nextBag;
                    next.previewWindow = previewWindow;
                    next.permissionStatus = 'prompt';
                    next.usingLightCache = true;
                    next.lightCacheCount = previewWindow.length;
                    next.lastPermissionCheckAt = Date.now();
                });
                D.updateWallpaper(function (model) {
                    model.cache.order = ['bing', id];
                    model.cache.index = 1;
                    if (!model.cache.meta) model.cache.meta = {};
                    model.cache.meta[id] = {
                        source: 'folder',
                        name: cached.name || record.name,
                        size: cached.size || record.size || 0,
                        lastModified: cached.lastModified || record.lastModified || 0,
                        pathLabel: pathLabel || '',
                        fetchedAt: Date.now(),
                        lightCache: true
                    };
                });
                saveFolderNextPreview(nextName, getWallpaperBlur());
                showFolderPermissionNotice();
                log('Folder', 'light cache ' + name);
                return true;
            });
        }).catch(function () {
            state.shuffleBag = candidate.remaining;
            return tryLoadFolderLightCacheWallpaper(files, state, attempt + 1);
        });
    }

    function updateFolderMeta(id, file, pathLabel) {
        var meta = D.loadMeta();
        meta[id] = {
            source: 'folder',
            name: file.name,
            size: file.size || 0,
            lastModified: file.lastModified || 0,
            pathLabel: pathLabel || '',
            fetchedAt: Date.now()
        };
        D.saveMeta(meta);
    }

    function refreshFolderIndexInBackground(handle, force) {
        if (!WF || !WF.scanDirectory || !handle) return;
        var state = D.loadFolderState ? D.loadFolderState() : {};
        var now = Date.now();
        if (!force) {
            if (folderRescannedThisSession) return;
            if (state.lastScanAt && now - state.lastScanAt < 86400000) return;
        }
        folderRescannedThisSession = true;

        var run = function () {
            WF.scanDirectory(handle, { requestPermission: false }).then(function (scan) {
                return D.saveFolderFiles(scan.files).then(function () {
                    updateFolderState(function (next) {
                        next.status = scan.files.length ? 'ready' : 'empty';
                        next.indexedCount = scan.files.length;
                        next.completed = scan.completed !== false;
                        next.lastScanAt = Date.now();
                        next.lastError = '';
                        next.shuffleBag = (next.shuffleBag || []).filter(function (name) {
                            return scan.files.some(function (file) { return file.name === name; });
                        });
                        next.previewWindow = buildFolderPreviewWindow(scan.files, next.currentName, next.shuffleBag, FOLDER_GALLERY_LIMIT);
                    });
                });
            }).catch(function (err) {
                updateFolderState(function (next) {
                    next.status = err && err.code === 'FOLDER_PERMISSION_DENIED' ? 'needs-permission' : 'error';
                    next.lastError = err && err.message ? err.message : String(err || 'folder scan failed');
                });
            });
        };

        if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 3000 });
        else setTimeout(run, 1200);
    }

    function tryLoadFolderCandidate(handle, files, state, attempt) {
        if (!files.length || attempt > Math.min(files.length + 1, 12)) return Promise.resolve(false);
        var blur = getWallpaperBlur();
        var candidate = folderNextCandidate(files, state);
        var name = candidate.name;
        if (!name) return Promise.resolve(false);

        return WF.readImageFile(handle, name).then(function (file) {
            var record = WF.fileRecord ? WF.fileRecord(file) : { name: name, size: file.size || 0, lastModified: file.lastModified || 0 };
            if (!record) throw WF.error ? WF.error('FOLDER_UNSUPPORTED_IMAGE', 'unsupported image file') : new Error('unsupported image file');
            var id = D.folderId(record.name);
            var pathLabel = D.loadFolderConfig ? D.loadFolderConfig().pathLabel : '';
            var url = URL.createObjectURL(file);
            return applyWallpaperRespectingBlur(url, id).then(function () {
                var nextFiles = candidate.files.map(function (item) {
                    return item.name === record.name ? record : item;
                });
                var nextBag = candidate.remaining;
                if (!nextBag.length && WF && WF.buildShuffleBag) nextBag = WF.buildShuffleBag(nextFiles, record.name);
                var previewWindow = buildFolderPreviewWindow(nextFiles, record.name, nextBag, FOLDER_GALLERY_LIMIT);
                var thumbLookahead = buildFolderPreviewWindow(nextFiles, record.name, nextBag, FOLDER_THUMB_LOOKAHEAD);
                D.saveFolderFiles(nextFiles).catch(function () { });
                updateFolderMeta(id, record, pathLabel);
                updateFolderState(function (next) {
                    next.status = 'ready';
                    next.indexedCount = nextFiles.length;
                    next.completed = next.completed === true;
                    next.lastError = '';
                    next.currentName = record.name;
                    next.shuffleBag = nextBag;
                    next.previewWindow = previewWindow;
                });
                D.updateWallpaper(function (model) {
                    model.cache.order = ['bing', id];
                    model.cache.index = 1;
                    if (!model.cache.meta) model.cache.meta = {};
                    model.cache.meta[id] = {
                        source: 'folder',
                        name: record.name,
                        size: record.size || 0,
                        lastModified: record.lastModified || 0,
                        pathLabel: pathLabel || '',
                        fetchedAt: Date.now()
                    };
                });
                var nextName = nextBag[0] || '';
                saveFolderNextPreview(nextName, blur);
                scheduleFolderNextPreview(handle, nextName, blur);
                prewarmFolderThumbs(handle, thumbLookahead, blur);
                prewarmFolderLightCache(handle, thumbLookahead);
                pruneFolderThumbs(thumbLookahead);
                pruneFolderLightCache(thumbLookahead);
                hideFolderPermissionNotice();
                cacheBingInBackground();
                log('Folder', 'image ' + record.name);
                return true;
            });
        }).catch(function (err) {
            if (err && err.code === 'FOLDER_PERMISSION_DENIED') {
                updateFolderState(function (next) {
                    next.status = 'needs-permission';
                    next.lastError = err.message || 'folder permission denied';
                    next.permissionStatus = 'prompt';
                    next.usingLightCache = false;
                    next.lastPermissionCheckAt = Date.now();
                });
                return tryLoadFolderLightCacheWallpaper(candidate.files, state, 0).then(function (loaded) {
                    if (!loaded) showFolderPermissionNotice();
                    return loaded || !!D.loadPreview();
                });
            }
            var remainingFiles = removeFolderName(candidate.files, name);
            state.shuffleBag = candidate.remaining.filter(function (item) { return item !== name; });
            D.saveFolderFiles(remainingFiles).catch(function () { });
            updateFolderState(function (next) {
                next.indexedCount = remainingFiles.length;
                next.shuffleBag = state.shuffleBag;
                next.previewWindow = buildFolderPreviewWindow(remainingFiles, next.currentName, state.shuffleBag, FOLDER_GALLERY_LIMIT);
                next.lastError = err && err.message ? err.message : String(err || '');
                if (!remainingFiles.length) next.status = 'empty';
            });
            return tryLoadFolderCandidate(handle, remainingFiles, state, attempt + 1);
        });
    }

    function tryLoadFolderWallpaper() {
        if (!WF || !WF.ensureReadPermission) return Promise.resolve(false);
        hideRssOverlay();
        SP.setCurrentMode('folder');

        return D.loadFolderHandle().then(function (handle) {
            if (!handle) return false;
            return WF.ensureReadPermission(handle, false).then(function () {
                return D.loadFolderFiles().then(function (files) {
                    if (files && files.length) return files;
                    return WF.scanFirstBatch(handle).then(function (scan) {
                        return D.saveFolderFiles(scan.files).then(function () {
                            updateFolderState(function (state) {
                                state.status = scan.files.length ? 'ready' : 'empty';
                                state.indexedCount = scan.files.length;
                                state.completed = scan.completed !== false;
                                state.lastScanAt = Date.now();
                            });
                            return scan.files;
                        });
                    });
                }).then(function (files) {
                    refreshFolderIndexInBackground(handle, false);
                    return tryLoadFolderCandidate(handle, normalizeFolderFiles(files), D.loadFolderState(), 0);
                });
            }, function (err) {
                updateFolderState(function (state) {
                    state.status = 'needs-permission';
                    state.lastError = err && err.message ? err.message : String(err || 'folder permission denied');
                    state.permissionStatus = 'prompt';
                    state.usingLightCache = false;
                    state.lastPermissionCheckAt = Date.now();
                });
                return D.loadFolderFiles().then(function (files) {
                    return tryLoadFolderLightCacheWallpaper(files, D.loadFolderState(), 0);
                }).then(function (loaded) {
                    if (!loaded) showFolderPermissionNotice();
                    return loaded || !!D.loadPreview();
                }).catch(function () {
                    showFolderPermissionNotice();
                    return !!D.loadPreview();
                });
            });
        }).catch(function (err) {
            warn('Folder', 'load failed: ' + (err && err.message ? err.message : err));
            updateFolderState(function (state) {
                state.status = err && err.code === 'FOLDER_PERMISSION_DENIED' ? 'needs-permission' : 'error';
                state.lastError = err && err.message ? err.message : String(err || 'folder load failed');
            });
            return !!D.loadPreview();
        });
    }

    function tryLoadLocalWallpaper(order) {
        if (!order || !order.length) return Promise.resolve(false);

        hideRssOverlay();
        SP.setCurrentMode('local');

        var idx = D.getActiveIndex() % order.length;
        var id = order[idx];
        var blur = getWallpaperBlur();
        var nextIdx = (idx + 1) % order.length;
        var nextId = order[nextIdx];
        var blurPreview = blur >= 5 && D.blurThumbFor ? D.blurThumbFor(id, blur) : null;

        if (blurPreview && S.showPreparedPreview) {
            D.saveActiveIndex((idx + 1) % order.length);
            saveNextPreview(nextId, blur);
            scheduleNextBlurPreview(nextId, blur);
            log('Local', 'blur preview ' + (idx + 1) + '/' + order.length);
            S.showPreparedPreview(blurPreview, { keepCurrentUrl: true });
            prepareCurrentOriginalUrl(id);
            cacheBingInBackground();
            return Promise.resolve(true);
        }

        return D.idbGet(D.imgKey(id)).then(function (img) {
            if (!img || !img.blob) { warn('Local', 'image ' + id + ' missing, skipping'); return false; }

            var blob = img.blob;
            if ((!blob.type || blob.type === '') && img.mime) {
                try { blob = new Blob([blob], { type: img.mime }); } catch (e) { }
            }

            D.saveActiveIndex((idx + 1) % order.length);

            saveNextPreview(nextId, blur);
            scheduleNextBlurPreview(nextId, blur);

            log('Local', 'image ' + (idx + 1) + '/' + order.length + (img.name ? '  ·  ' + img.name : ''));

            if (blur >= 5 && S.blurredThumbnail && D.saveBlurThumb && S.showPreparedPreview) {
                var currentUrl = URL.createObjectURL(blob);
                return S.blurredThumbnail(currentUrl, blur).then(function (thumb) {
                    if (thumb) {
                        D.saveBlurThumb(id, blur, thumb);
                        if (S.keepCurrentUrl) S.keepCurrentUrl(currentUrl, id);
                        S.showPreparedPreview(thumb, { keepCurrentUrl: true });
                        cacheBingInBackground();
                        return true;
                    }
                    return S.apply(currentUrl, 'local').then(function () {
                        cacheBingInBackground();
                        return true;
                    });
                }, function () {
                    return S.apply(currentUrl, 'local').then(function () {
                        cacheBingInBackground();
                        return true;
                    });
                });
            }

            return S.apply(URL.createObjectURL(blob), 'local').then(function () {
                cacheBingInBackground();
                return true;
            });
        });
    }

    function tryLoadRssWallpaper(order) {
        if (!order || !order.length) return Promise.resolve(false);

        SP.setCurrentMode('rss');
        var config = D.loadRssConfig();
        order = order.filter(function (id) {
            var meta = D.loadMeta()[id];
            return !meta || meta.sourceId === config.activeSourceId;
        });
        if (!order.length) return Promise.resolve(false);

        var fixedLatest = config.displayMode === 'latest';
        var idx = fixedLatest ? 0 : D.getActiveIndex() % order.length;
        var id = order[idx];
        var nextId = fixedLatest ? id : order[(idx + 1) % order.length];
        var thumbs = D.loadThumbs();
        if (thumbs[nextId]) D.savePreview(thumbs[nextId]);

        return D.idbGet(D.imgKey(id)).then(function (record) {
            if (!record || !record.blob) return false;
            var blob = record.blob;
            if ((!blob.type || blob.type === '') && record.mime) {
                try { blob = new Blob([blob], { type: record.mime }); } catch (e) { }
            }
            if (!fixedLatest) D.saveActiveIndex((idx + 1) % order.length);
            renderRssOverlay(id);
            log('RSS', 'image ' + (idx + 1) + '/' + order.length);
            return applyWallpaperRespectingBlur(URL.createObjectURL(blob), id).then(function () {
                if (thumbs[nextId]) D.savePreview(thumbs[nextId]);
                cacheBingInBackground();
                return true;
            });
        });
    }

    function tryLoadApiWallpaper() {
        hideRssOverlay();
        SP.setCurrentMode('api');
        var thumbs = D.loadThumbs();
        if (thumbs.api) D.savePreview(thumbs.api);
        return D.idbGet(D.DB.API_BLOB).then(function (record) {
            if (!record || !record.blob) return false;
            var blob = record.blob;
            if ((!blob.type || blob.type === '') && record.mime) {
                try { blob = new Blob([blob], { type: record.mime }); } catch (e) { }
            }
            return applyWallpaperRespectingBlur(URL.createObjectURL(blob), 'api').then(function () {
                if (thumbs.api) D.savePreview(thumbs.api);
                cacheBingInBackground();
                return true;
            });
        });
    }

    function refreshApiInBackground(force) {
        var config = D.loadApiConfig();
        var state = D.loadWallpaper().providers.api.state || {};
        if (!force && !isApiRefreshDue(config, state)) return Promise.resolve(false);
        var source = activeApiSource();
        if (!source) return Promise.resolve(false);
        return F.refreshApiSource(source, config.apiType).then(function () {
            return true;
        }).catch(function (err) {
            warn('API', 'refresh failed: ' + (err && err.message ? err.message : err));
            return false;
        });
    }

    function tryLoadCachedBing(bingBlob, meta, today) {
        if (!bingBlob || meta.date !== today) return Promise.resolve(false);

        log('Bing', 'wallpaper is fresh  ·  date: ' + meta.date + ', nothing to do');
        return applyWallpaperRespectingBlur(URL.createObjectURL(bingBlob), 'bing').then(function () { return true; });
    }

    function loadBingFromNetwork(meta, today) {
        hideRssOverlay();
        SP.setCurrentMode('bing');
        D.setActiveSource('bing');
        SP.setWallpaperInfo(t('wpBing'));
        log('Bing', meta.date ? 'wallpaper is old (cache: ' + meta.date + ', today: ' + today + '), fetching...' : 'no wallpaper cached, fetching...');

        if (meta.src && meta.date === today) {
            return applyWallpaperRespectingBlur(meta.src, 'bing').then(function () {
                return F.cacheBingBlob(meta.src, meta.provider || 'primary', today);
            });
        }

        if (meta.src && !wallpaperBackEl.style.backgroundImage) {
            wallpaperBackEl.style.backgroundImage = 'url(' + meta.src + ')';
        }

        return F.fetchBingUrl(SP.getCurrentLang()).then(function (r) {
            return applyWallpaperRespectingBlur(r.url, 'bing').then(function () {
                return F.cacheBingBlob(r.url, r.api, today);
            });
        }).catch(function () {
            if (!wallpaperBackEl.style.backgroundImage && meta.src) {
                wallpaperBackEl.style.backgroundImage = 'url(' + meta.src + ')';
            }
        });
    }

    function loadWallpaper() {
        var lastMode = D.compatMode(D.getActiveSource());
        var meta = D.loadBingMeta();
        var today = new Date().toDateString();
        var order = D.loadOrder();
        var rssOrder = D.activeRssOrder ? D.activeRssOrder() : [];

        return D.idbGet(D.DB.BING_BLOB).then(function (bingRecord) {
            var bingBlob = D.imageBlob(bingRecord);
            if (lastMode === 'local') {
                return tryLoadLocalWallpaper(order).then(function (loaded) {
                    if (loaded) return;
                    return tryLoadCachedBing(bingBlob, meta, today).then(function (loaded) {
                        if (!loaded) return loadBingFromNetwork(meta, today);
                    });
                });
            }

            if (lastMode === 'folder') {
                return tryLoadFolderWallpaper().then(function (loaded) {
                    if (loaded) return;
                    return tryLoadCachedBing(bingBlob, meta, today).then(function (loadedBing) {
                        if (!loadedBing) return loadBingFromNetwork(meta, today);
                    });
                });
            }

            if (lastMode === 'rss') {
                return tryLoadRssWallpaper(rssOrder).then(function (loaded) {
                    refreshRssInBackground(!loaded).then(function (updated) {
                        if (updated && D.compatMode(D.getActiveSource()) === 'rss') loadWallpaper();
                    });
                    if (loaded) return;
                    hideRssOverlay();
                    return tryLoadCachedBing(bingBlob, meta, today).then(function (loadedBing) {
                        if (!loadedBing) return loadBingFromNetwork(meta, today);
                    });
                });
            }

            if (lastMode === 'api') {
                return tryLoadApiWallpaper().then(function (loaded) {
                    refreshApiInBackground(!loaded).then(function (updated) {
                        if (updated && D.compatMode(D.getActiveSource()) === 'api') loadWallpaper();
                    });
                    if (loaded) return;
                    return tryLoadCachedBing(bingBlob, meta, today).then(function (loadedBing) {
                        if (!loadedBing) return loadBingFromNetwork(meta, today);
                    });
                });
            }

            hideRssOverlay();
            return tryLoadCachedBing(bingBlob, meta, today).then(function (loaded) {
                if (loaded) return;
                return loadBingFromNetwork(meta, today);
            });
        });
    }

    // 暴露给 SettingsPanel（删除最后一张 / 重置到 Bing 后触发）
    window.reloadWallpaper = loadWallpaper;

    // ================================================================
    // 搜索执行
    // ================================================================

    function ensureSearchHistoryPanel() {
        if (searchHistoryPanel || !searchBar) return searchHistoryPanel;
        searchHistoryPanel = document.createElement('div');
        searchHistoryPanel.id = 'searchHistoryPanel';
        searchHistoryPanel.className = 'search-history-panel';
        searchHistoryPanel.hidden = true;
        searchHistoryPanel.addEventListener('mousedown', function (e) {
            var item = e.target.closest('[data-search-history]');
            if (!item) return;
            e.preventDefault();
            doSearch(item.dataset.searchHistory || item.textContent);
        });
        searchBar.appendChild(searchHistoryPanel);
        return searchHistoryPanel;
    }

    function hideSearchHistory() {
        clearTimeout(searchHistoryHideTimer);
        if (!searchHistoryPanel) return;
        searchHistoryVisible = false;
        searchHistoryMatches = [];
        searchHistoryIndex = -1;
        searchHistoryPanel.hidden = true;
        searchHistoryPanel.innerHTML = '';
        searchHistoryPanel.style.removeProperty('--search-history-max-height');
        searchBar.removeAttribute('data-history-placement');
    }

    function updateSearchHistoryPlacement() {
        if (!searchBar || !searchHistoryPanel || searchHistoryPanel.hidden) return;

        searchHistoryPanel.style.removeProperty('--search-history-max-height');

        var barRect = searchBar.getBoundingClientRect();
        var panelHeight = searchHistoryPanel.scrollHeight;
        var viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
        var availableBelow = viewportHeight - barRect.bottom - SEARCH_HISTORY_GAP - SEARCH_HISTORY_VIEWPORT_PADDING;
        var availableAbove = barRect.top - SEARCH_HISTORY_GAP - SEARCH_HISTORY_VIEWPORT_PADDING;
        var shouldOpenAbove = panelHeight > availableBelow && availableAbove > availableBelow;
        var available = Math.max(0, shouldOpenAbove ? availableAbove : availableBelow);

        searchBar.setAttribute('data-history-placement', shouldOpenAbove ? 'above' : 'below');
        if (available > 0 && panelHeight > available) {
            searchHistoryPanel.style.setProperty('--search-history-max-height', available + 'px');
        }
    }

    function renderSearchHistory() {
        var panel = ensureSearchHistoryPanel();
        if (!panel || !D || !D.loadSearchHistory || !D.loadSearchHistoryLimit) return;
        clearTimeout(searchHistoryHideTimer);
        if (D.loadSearchHistoryLimit() <= 0) {
            hideSearchHistory();
            return;
        }
        var query = (searchInput.value || '').trim().toLowerCase();
        var items = D.loadSearchHistory().filter(function (item) {
            return !query || item.toLowerCase().indexOf(query) !== -1;
        });
        searchHistoryMatches = items;
        searchHistoryIndex = items.length ? Math.min(Math.max(searchHistoryIndex, -1), items.length - 1) : -1;
        if (!items.length || document.activeElement !== searchInput) {
            hideSearchHistory();
            return;
        }
        panel.innerHTML = items.map(function (item, index) {
            return '<button type="button" class="search-history-item' + (index === searchHistoryIndex ? ' active' : '') + '" data-search-history="' + escapeAttr(item) + '">' + escapeHtml(item) + '</button>';
        }).join('');
        panel.hidden = false;
        searchHistoryVisible = true;
        updateSearchHistoryPlacement();
    }

    function moveSearchHistory(delta) {
        if (!searchHistoryVisible || !searchHistoryMatches.length) {
            renderSearchHistory();
            if (!searchHistoryMatches.length) return;
        }
        searchHistoryIndex = (searchHistoryIndex + delta + searchHistoryMatches.length) % searchHistoryMatches.length;
        renderSearchHistory();
    }

    function handleSearchInputKeydown(e) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            e.stopPropagation();
            moveSearchHistory(1);
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            e.stopPropagation();
            moveSearchHistory(-1);
            return;
        }
        if (e.key === 'Escape' && searchHistoryVisible) {
            e.preventDefault();
            e.stopPropagation();
            hideSearchHistory();
            return;
        }
        if (e.key === 'Enter' && searchHistoryVisible && searchHistoryIndex >= 0 && searchHistoryMatches[searchHistoryIndex]) {
            e.preventDefault();
            e.stopPropagation();
            doSearch(searchHistoryMatches[searchHistoryIndex]);
        }
    }

    function escapeHtml(value) {
        return String(value || '').replace(/[&<>"']/g, function (c) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
        });
    }

    function escapeAttr(value) {
        return escapeHtml(value).replace(/`/g, '&#96;');
    }

    var doSearch = function (query) {
        var term = String(query || '').trim();
        if (!term) return;
        if (D && D.addSearchHistory) D.addSearchHistory(term);
        hideSearchHistory();
        if (IS_EXTENSION && typeof chrome !== 'undefined' && chrome.search && typeof chrome.search.query === 'function') {
            try {
                var result = chrome.search.query({
                    text: term,
                    disposition: 'CURRENT_TAB'
                });
                if (result && typeof result.catch === 'function') {
                    result.catch(function (e) {
                        warn('Search', 'default search failed: ' + (e && e.message ? e.message : e));
                    });
                }
                return;
            } catch (e) {
                warn('Search', 'default search unavailable: ' + (e && e.message ? e.message : e));
                return;
            }
        }
        window.open((SEARCH_URLS[SP.getEngine()] || SEARCH_URLS.google) + encodeURIComponent(term), '_self');
    };

    // ================================================================
    // 搜索栏显隐
    // ================================================================

    function canRevealSearch() {
        return SP.getSearchMode() !== 'never';
    }

    function canFocusSearchFromWallpaper() {
        return SP.getSearchMode() === 'always';
    }

    function showSearch() {
        var mode = SP.getSearchMode();
        if (mode === 'never') return;
        if (searchBar.classList.contains('visible')) return;
        if (mode === 'always') { searchBar.classList.add('visible'); return; }
        clearTimeout(searchHideTimer);
        searchBar.classList.add('visible');
    }

    function hideSearch() {
        var mode = SP.getSearchMode();
        if (mode === 'always') return;
        if (document.activeElement === searchInput) return;
        clearTimeout(searchHideTimer);
        searchHideTimer = setTimeout(function () {
            if (!isMouseInSearchZone && document.activeElement !== searchInput) searchBar.classList.remove('visible');
        }, 150);
    }

    // ================================================================
    // 全局事件绑定
    // ================================================================

    function eventMatchesHotkey(e, combo) {
        if (!combo) return false;
        var parts = String(combo).toLowerCase().split('+').map(function (part) { return part.trim(); }).filter(Boolean);
        var key = parts[parts.length - 1];
        var wantsCtrl = parts.indexOf('ctrl') !== -1 || parts.indexOf('cmd') !== -1 || parts.indexOf('meta') !== -1;
        var wantsShift = parts.indexOf('shift') !== -1;
        if (!key || !wantsCtrl) return false;
        return !!(e.ctrlKey || e.metaKey) === wantsCtrl &&
            !!e.shiftKey === wantsShift &&
            !e.altKey &&
            String(e.key || '').toLowerCase() === key;
    }

    function loadShortcutSettings() {
        if (D && D.loadShortcutsModel) return D.loadShortcutsModel().settings || {};
        return {};
    }

    function loadPaletteHotkey() {
        return loadShortcutSettings().primaryHotkey || 'ctrl+k';
    }

    function loadPaletteHiddenHotkey() {
        return loadShortcutSettings().hiddenHotkey || 'ctrl+shift+k';
    }

    function ensureStylesheet(href) {
        var existing = document.querySelector('link[href="' + href + '"]');
        if (existing) return Promise.resolve();
        return new Promise(function (resolve) {
            var link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.onload = function () { resolve(); };
            link.onerror = function () { resolve(); };
            document.head.appendChild(link);
        });
    }

    function ensureScript(src) {
        var existing = document.querySelector('script[src="' + src + '"]');
        if (existing) return Promise.resolve();
        return new Promise(function (resolve, reject) {
            var script = document.createElement('script');
            script.src = src;
            script.onload = function () { resolve(); };
            script.onerror = function () { reject(new Error('failed to load ' + src)); };
            document.body.appendChild(script);
        });
    }

    function ensurePalette() {
        if (window.Palette) return Promise.resolve(window.Palette);
        if (!paletteLoadPromise) {
            paletteLoadPromise = Promise.all([
                ensureStylesheet('css/command-palette.css'),
                ensureScript('js/command-palette.js')
            ]).then(function () { return window.Palette; });
        }
        return paletteLoadPromise;
    }

    var lastPointerAnchor = null;

    function pointerAnchorFromEvent(e) {
        if (!e || typeof e.clientX !== 'number' || typeof e.clientY !== 'number') return null;
        return { x: e.clientX, y: e.clientY };
    }

    function rememberPointerAnchor(e) {
        var anchor = pointerAnchorFromEvent(e);
        if (anchor) lastPointerAnchor = anchor;
    }

    function openPalette(hidden, anchor) {
        ensurePalette().then(function (palette) {
            if (!palette) return;
            var resolvedAnchor = anchor || lastPointerAnchor;
            if (hidden) palette.openHidden(resolvedAnchor);
            else palette.open(resolvedAnchor);
        }).catch(function (e) {
            warn('Palette', e.message || 'failed to load command palette');
        });
    }

    function schedulePanelWarmup() {
        var warm = function () {
            if (SP && SP.ensureFull) SP.ensureFull().catch(function () { });
            ensurePalette().catch(function () { });
        };
        if ('requestIdleCallback' in window) {
            requestIdleCallback(warm, { timeout: 2500 });
        } else {
            setTimeout(warm, 1200);
        }
    }

    function bindGlobalEvents() {
        // --- 全局鼠标跟踪 ---

        var _lastMouseX = 0, _lastMouseY = 0, _mouseRafPending = false, _wasInCorner = false;
        document.addEventListener('mousemove', function (e) {
            _lastMouseX = e.clientX;
            _lastMouseY = e.clientY;
            if (_mouseRafPending) return;
            _mouseRafPending = true;
            requestAnimationFrame(function () {
                _mouseRafPending = false;
                var inCorner = SP.isNearTopRight(_lastMouseX, _lastMouseY);
                if (inCorner && !_wasInCorner) SP.showCorners();
                else if (!inCorner && _wasInCorner && !SP.isOpen() && !SP.isLangPanelOpen()) SP.hideCorners();
                _wasInCorner = inCorner;
            });
        });

        // --- 搜索栏 ---

        searchBar.addEventListener('mouseenter', function () { isMouseInSearchZone = true; clearTimeout(searchHideTimer); showSearch(); });
        searchBar.addEventListener('mouseleave', function () { isMouseInSearchZone = false; hideSearch(); });
        searchInput.addEventListener('focus', function () {
            if (!canRevealSearch()) {
                searchInput.blur();
                return;
            }
            searchBar.classList.add('visible');
            clearTimeout(searchHideTimer);
            if (suppressSearchHistoryOnFocus) {
                suppressSearchHistoryOnFocus = false;
                hideSearchHistory();
                return;
            }
        });
        searchInput.addEventListener('click', renderSearchHistory);
        searchInput.addEventListener('input', function () {
            searchHistoryIndex = -1;
            renderSearchHistory();
        });
        searchInput.addEventListener('keydown', handleSearchInputKeydown);
        searchInput.addEventListener('blur', function () {
            clearTimeout(searchHistoryHideTimer);
            searchHistoryHideTimer = setTimeout(hideSearchHistory, 120);
            hideSearch();
        });
        window.addEventListener('resize', updateSearchHistoryPlacement);

        // --- 键盘快捷键 ---

        document.addEventListener('pointermove', rememberPointerAnchor, { passive: true });
        document.addEventListener('pointerdown', rememberPointerAnchor, { passive: true });

        document.addEventListener('keydown', function (e) {
            if (window.Palette && window.Palette.isOpen) {
                var isFormInput = document.activeElement && document.activeElement.closest('#cpFormName, #cpFormURL');
                if (!(e.key === 'Enter' && isFormInput)) {
                    window.Palette.handleKeyNav(e);
                }
                var cpSearchInputEl = document.getElementById('cpSearchInput');
                if (e.key === 'Enter' && document.activeElement === cpSearchInputEl) { e.preventDefault(); return; }
                if (e.key !== 'Escape') return;
            }
            if (e.key === 'Escape') { SP.closeAll(); SP.hideCorners(); }
            if (eventMatchesHotkey(e, window.Palette ? window.Palette.loadHotkey() : loadPaletteHotkey())) { e.preventDefault(); openPalette(false); return; }
            if (eventMatchesHotkey(e, window.Palette ? window.Palette.loadHiddenHotkey() : loadPaletteHiddenHotkey())) { e.preventDefault(); openPalette(true); return; }
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'W') { e.preventDefault(); if (SP.isModalOpen && SP.isModalOpen()) SP.closeModal(); else SP.openModal(); return; }
            if (e.key === 'Enter' && document.activeElement === searchInput) { doSearch(searchInput.value); return; }
        });

        // --- 鼠标快捷方式 ---

        document.addEventListener('dblclick', function (e) {
            if (window.Palette && window.Palette.isOpen) return;
            if (e.target.closest('button, input, select, .settings-panel, .language-panel')) return;
            openPalette(false, pointerAnchorFromEvent(e));
        });

        document.addEventListener('auxclick', function (e) {
            if (e.button !== 1) return;
            if (window.Palette && window.Palette.isOpen) return;
            e.preventDefault();
            openPalette(true, pointerAnchorFromEvent(e));
        });

        // --- 全局点击关闭 / 搜索聚焦 ---

        document.addEventListener('click', function (e) {
            if (window.Palette && window.Palette.isOpen && window.Palette.el && !window.Palette.el.contains(e.target)) window.Palette.close();

            if (searchHistoryVisible && !e.target.closest('#searchBar')) {
                hideSearchHistory();
            }

            if (SP.isOpen() || SP.isLangPanelOpen()) {
                var sp = document.getElementById('settingsPanel');
                var lp = document.getElementById('langPanel');
                var sb = document.getElementById('settingsBtn');
                var lb = document.getElementById('langBtn');
                if (SP.isOpen() && !sp.contains(e.target) && e.target !== sb && !sb.contains(e.target)) SP.close();
                if (SP.isLangPanelOpen() && !lp.contains(e.target) && e.target !== lb && !lb.contains(e.target)) SP.closeAll(); // closeLangPanel
                if (!SP.isOpen() && !SP.isLangPanelOpen()) SP.hideCorners();
            }

            var paletteOpen = window.Palette && window.Palette.isOpen;
            if (!paletteOpen && !SP.isOpen() && !SP.isLangPanelOpen() && document.activeElement !== searchInput) {
                if (e.target === document.body || e.target === wallpaperBackEl || e.target === wallpaperFrontEl || !e.target.closest('button, input, select, .settings-panel, .language-panel, .cmd-palette-overlay')) {
                    if (canFocusSearchFromWallpaper()) {
                        suppressSearchHistoryOnFocus = true;
                        searchInput.focus();
                    }
                }
            }

            if (!SP.isOpen() && !SP.isLangPanelOpen()) SP.hideCorners();
        });
    }

    // ================================================================
    // 启动引导
    // ================================================================

    function init() {
        SP = window.SettingsPanel;

        // 数据迁移必须先于设置面板读取配置。
        D.migrate().catch(function (e) {
            warn('Init', 'migration failed, continuing: ' + e.message);
        }).then(function () {
            SP.init();
            log('PlainTab', 'PlainTab started  ·  ' + (IS_EXTENSION ? 'extension' : 'web') + '  ·  ' + SP.getCurrentLang());
            loadWallpaper();
            bindGlobalEvents();
            schedulePanelWarmup();
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

})();
