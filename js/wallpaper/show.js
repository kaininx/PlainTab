/**
 * WallpaperShow —— 壁纸渲染层
 * 双图层交叉淡入 + 缩略图生成。所有 5 个壁纸源共用。
 * 挂载到 window.WallpaperShow。
 */
(function () {
    'use strict';

    var TRANSITION_MS = 500; // 壁纸淡入过渡时长（ms），必须与 CSS 中的 transition-duration 保持一致
    var THUMB_MAX_W = 640;   // 生成缩略图的最大宽度（px）

    // 追踪当前壁纸的 blob URL，用于在切换壁纸时 revoke 旧 URL 释放内存
    var _currentWallpaperBlobUrl = null;
    var _currentWallpaperSourceUrl = null;
    var _currentWallpaperSourceId = null;
    var _themeLoadPromise = null;
    var BLUR_THUMB_MAX_W = 960;

    // DOM 元素（在脚本加载时获取一次）
    var wallpaperBackEl = document.getElementById('wallpaperBack');
    var wallpaperFrontEl = document.getElementById('wallpaperFront');
    var wallpaperVideoBackEl = null;
    var wallpaperVideoFrontEl = null;

    function imageSourceFromCssValue(value) {
        if (typeof value !== 'string') return value;
        var match = value.match(/^url\(["']?(.*?)["']?\)$/);
        return match && match[1] ? match[1] : value;
    }

    function trackCurrentWallpaperUrl(url, id) {
        var oldUrl = _currentWallpaperBlobUrl;
        _currentWallpaperSourceUrl = url || null;
        _currentWallpaperSourceId = id || null;
        _currentWallpaperBlobUrl = url && url.indexOf('blob:') === 0 ? url : null;
        if (oldUrl && oldUrl !== url) {
            try { URL.revokeObjectURL(oldUrl); } catch (e) { }
        }
    }

    function clearTrackedWallpaperUrl() {
        if (_currentWallpaperBlobUrl) {
            try { URL.revokeObjectURL(_currentWallpaperBlobUrl); } catch (e) { }
        }
        _currentWallpaperBlobUrl = null;
        _currentWallpaperSourceUrl = null;
        _currentWallpaperSourceId = null;
    }

    function currentDisplaySource() {
        var background = (wallpaperFrontEl && wallpaperFrontEl.style.backgroundImage) ||
            (wallpaperBackEl && wallpaperBackEl.style.backgroundImage);
        return imageSourceFromCssValue(background);
    }

    function ensureVideoLayers() {
        if (wallpaperVideoBackEl && wallpaperVideoFrontEl) return;

        function createLayer(className) {
            var video = document.createElement('video');
            video.className = className;
            video.muted = true;
            video.loop = true;
            video.autoplay = true;
            video.playsInline = true;
            video.setAttribute('muted', '');
            video.setAttribute('loop', '');
            video.setAttribute('autoplay', '');
            video.setAttribute('playsinline', '');
            video.setAttribute('aria-hidden', 'true');
            video.preload = 'auto';
            return video;
        }

        wallpaperVideoBackEl = createLayer('wallpaper-video-layer wallpaper-video-back');
        wallpaperVideoFrontEl = createLayer('wallpaper-video-layer wallpaper-video-front');
        document.body.insertBefore(wallpaperVideoBackEl, wallpaperFrontEl ? wallpaperFrontEl.nextSibling : document.body.firstChild);
        document.body.insertBefore(wallpaperVideoFrontEl, wallpaperVideoBackEl.nextSibling);
    }

    function stopVideo(video) {
        if (!video) return;
        try { video.pause(); } catch (e) { }
        video.removeAttribute('src');
        try { video.load(); } catch (e) { }
        video.classList.remove('active');
    }

    function clearVideoLayers() {
        stopVideo(wallpaperVideoBackEl);
        stopVideo(wallpaperVideoFrontEl);
    }

    function shouldReduceMotion() {
        return !!(window.WallpaperData &&
            window.WallpaperData.loadUI &&
            window.WallpaperData.loadUI().appearance &&
            window.WallpaperData.loadUI().appearance.reducedMotion === true);
    }

    function playVideo(video) {
        if (!video) return Promise.resolve(false);
        if (shouldReduceMotion()) {
            try { video.pause(); } catch (e) { }
            return Promise.resolve(true);
        }
        var result;
        try { result = video.play(); } catch (e) { return Promise.resolve(false); }
        if (result && typeof result.then === 'function') {
            return result.then(function () { return true; }, function () { return false; });
        }
        return Promise.resolve(true);
    }

    function waitForVideoReady(video) {
        return new Promise(function (resolve) {
            if (!video) { resolve(false); return; }
            if (video.readyState >= 2) { resolve(true); return; }
            var done = false;
            function finish(ok) {
                if (done) return;
                done = true;
                video.removeEventListener('loadeddata', onReady);
                video.removeEventListener('canplay', onReady);
                video.removeEventListener('error', onError);
                resolve(ok);
            }
            function onReady() { finish(true); }
            function onError() { finish(false); }
            video.addEventListener('loadeddata', onReady);
            video.addEventListener('canplay', onReady);
            video.addEventListener('error', onError);
            setTimeout(function () { finish(video.readyState >= 2); }, 5000);
        });
    }

    // ================================================================
    // 壁纸核心 — 双图层零白屏系统
    // ================================================================

    /**
     * 将图片预加载到浏览器缓存，返回已解码的 Image 对象。
     */
    function preloadImage(url) {
        return new Promise(function (resolve) {
            var img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function () {
                img.decode().then(function () { resolve(img); }, function () { resolve(img); });
            };
            img.onerror = function () { resolve(null); };
            img.src = imageSourceFromCssValue(url);
        });
    }

    function ensureThemeModule() {
        if (window.WallpaperTheme) return Promise.resolve(window.WallpaperTheme);
        if (!_themeLoadPromise) {
            _themeLoadPromise = new Promise(function (resolve, reject) {
                var existing = document.querySelector('script[src="js/wallpaper/theme.js"]');
                if (existing) {
                    existing.addEventListener('load', function () { resolve(window.WallpaperTheme); }, { once: true });
                    existing.addEventListener('error', function () { reject(new Error('failed to load wallpaper theme')); }, { once: true });
                    return;
                }
                var script = document.createElement('script');
                script.src = 'js/wallpaper/theme.js';
                script.onload = function () { resolve(window.WallpaperTheme); };
                script.onerror = function () { reject(new Error('failed to load wallpaper theme')); };
                document.body.appendChild(script);
            });
        }
        return _themeLoadPromise;
    }

    function afterAnimationFrame(callback) {
        requestAnimationFrame(function () {
            requestAnimationFrame(callback);
        });
    }

    function scheduleIdle(callback) {
        if (window.requestIdleCallback) {
            requestIdleCallback(callback, { timeout: 1200 });
            return;
        }
        setTimeout(callback, 0);
    }

    function applyExtractedTheme(img) {
        if (!img) return Promise.resolve(false);
        return ensureThemeModule().then(function (theme) {
            if (!theme) return false;
            return Promise.resolve(theme.extract(img)).then(function () {
                if (theme.hasCurrent()) theme.applyCurrent();
                return true;
            });
        }).catch(function () { return false; });
    }

    function scheduleThemeExtraction(img) {
        afterAnimationFrame(function () {
            scheduleIdle(function () {
                applyExtractedTheme(img);
            });
        });
    }

    function refreshThemeFromCurrentWallpaper(force) {
        if (!(window.WallpaperData && window.WallpaperData.loadUI)) return Promise.resolve(false);
        if (force !== true && window.WallpaperData.loadUI().wallpaper.themeEnabled !== true) return Promise.resolve(false);

        var background = wallpaperBackEl && wallpaperBackEl.style.backgroundImage;
        var match = background && background.match(/^url\(["']?(.*?)["']?\)$/);
        if (!match || !match[1]) return Promise.resolve(false);

        return preloadImage(match[1]).then(function (img) {
            if (!img) return false;
            return new Promise(function (resolve) {
                afterAnimationFrame(function () {
                    scheduleIdle(function () {
                        applyExtractedTheme(img).then(resolve);
                    });
                });
            });
        }).catch(function () { return false; });
    }

    /**
     * 应用壁纸并执行双层交叉淡入过渡。
     */
    function applyWallpaper(url, transitionMs, sourceId) {
        if (typeof transitionMs !== 'number' || !isFinite(transitionMs)) transitionMs = 200;

        return preloadImage(url).then(function (img) {
            var themeEnabled = false;
            if (window.WallpaperData && window.WallpaperData.loadUI) {
                themeEnabled = window.WallpaperData.loadUI().wallpaper.themeEnabled === true;
            }
            if (img && themeEnabled) {
                scheduleThemeExtraction(img);
            }
            wallpaperFrontEl.style.backgroundImage = 'url(' + url + ')';
            void wallpaperFrontEl.offsetWidth;
            wallpaperFrontEl.style.transition = 'opacity ' + transitionMs + 'ms ease-out';
            wallpaperFrontEl.classList.add('active');

            return new Promise(function (resolve) {
                var done = false;
                function onTransitionEnd(e) {
                    if (e.propertyName !== 'opacity') return;
                    finishTransition();
                }
                function finishTransition() {
                    if (done) return;
                    done = true;
                    wallpaperBackEl.style.backgroundImage = wallpaperFrontEl.style.backgroundImage;
                    wallpaperFrontEl.classList.remove('active');
                    wallpaperFrontEl.style.backgroundImage = '';
                    wallpaperFrontEl.removeEventListener('transitionend', onTransitionEnd);
                    clearVideoLayers();
                    resolve(img);
                }
                wallpaperFrontEl.addEventListener('transitionend', onTransitionEnd);
                window.setTimeout(finishTransition, transitionMs + 100);
            });
        }).then(function (img) {
            trackCurrentWallpaperUrl(url, sourceId);
            return img;
        });
    }

    function applyVideoWallpaper(url, transitionMs, sourceId) {
        if (typeof transitionMs !== 'number' || !isFinite(transitionMs)) transitionMs = TRANSITION_MS;
        ensureVideoLayers();

        wallpaperVideoFrontEl.classList.remove('active');
        wallpaperVideoFrontEl.src = imageSourceFromCssValue(url);
        try { wallpaperVideoFrontEl.currentTime = 0; } catch (e) { }
        wallpaperVideoFrontEl.load();

        return waitForVideoReady(wallpaperVideoFrontEl).then(function (ready) {
            if (!ready) return false;
            return playVideo(wallpaperVideoFrontEl).then(function () {
                wallpaperVideoFrontEl.style.transition = 'opacity ' + transitionMs + 'ms ease-out';
                void wallpaperVideoFrontEl.offsetWidth;
                wallpaperVideoFrontEl.classList.add('active');

                return new Promise(function (resolve) {
                    var done = false;
                    function onTransitionEnd(e) {
                        if (e.propertyName !== 'opacity') return;
                        finishTransition();
                    }
                    function finishTransition() {
                        if (done) return;
                        done = true;
                        wallpaperVideoBackEl.src = imageSourceFromCssValue(url);
                        try { wallpaperVideoBackEl.currentTime = wallpaperVideoFrontEl.currentTime || 0; } catch (e) { }
                        wallpaperVideoBackEl.load();
                        waitForVideoReady(wallpaperVideoBackEl).then(function () {
                            wallpaperVideoBackEl.classList.add('active');
                            playVideo(wallpaperVideoBackEl);
                            stopVideo(wallpaperVideoFrontEl);
                            wallpaperVideoFrontEl.removeEventListener('transitionend', onTransitionEnd);
                            wallpaperBackEl.style.backgroundImage = '';
                            wallpaperFrontEl.classList.remove('active');
                            wallpaperFrontEl.style.backgroundImage = '';
                            trackCurrentWallpaperUrl(url, sourceId);
                            resolve(true);
                        });
                    }
                    wallpaperVideoFrontEl.addEventListener('transitionend', onTransitionEnd);
                    window.setTimeout(finishTransition, transitionMs + 120);
                });
            });
        }).then(function (ok) {
            if (!ok) return Promise.reject(new Error('video wallpaper failed'));
            return true;
        });
    }

    /**
     * 生成缩略图（纯计算，不写 localStorage）。
     */
    function generateThumbnail(source) {
        function processImage(img) {
            var canvas = document.createElement('canvas');
            var scale = THUMB_MAX_W / img.width;
            canvas.width = THUMB_MAX_W;
            canvas.height = Math.floor(img.height * scale);
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            var thumb = 'url(' + canvas.toDataURL('image/jpeg', 0.55) + ')';
            canvas.width = 0;
            canvas.height = 0;
            return thumb;
        }

        if (source && typeof source !== 'string') {
            return Promise.resolve(processImage(source));
        }

        return new Promise(function (resolve) {
            var img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function () { var r = processImage(img); img.src = ''; resolve(r); };
            img.onerror = function () { resolve(null); };
            img.src = imageSourceFromCssValue(source);
        });
    }

    function generateVideoThumbnail(source) {
        var ownsUrl = false;
        var url = source;
        if (source && typeof source !== 'string') {
            url = URL.createObjectURL(source);
            ownsUrl = true;
        }
        url = imageSourceFromCssValue(url);

        return new Promise(function (resolve) {
            var video = document.createElement('video');
            var done = false;
            video.muted = true;
            video.playsInline = true;
            video.preload = 'metadata';

            function cleanup(result) {
                if (done) return;
                done = true;
                video.removeEventListener('loadeddata', onReady);
                video.removeEventListener('seeked', onSeeked);
                video.removeEventListener('error', onError);
                try { video.pause(); } catch (e) { }
                video.removeAttribute('src');
                try { video.load(); } catch (e) { }
                if (ownsUrl) {
                    try { URL.revokeObjectURL(url); } catch (e) { }
                }
                resolve(result || null);
            }

            function drawFrame() {
                if (!video.videoWidth || !video.videoHeight) {
                    cleanup(null);
                    return;
                }
                var canvas = document.createElement('canvas');
                var scale = THUMB_MAX_W / video.videoWidth;
                canvas.width = THUMB_MAX_W;
                canvas.height = Math.max(1, Math.floor(video.videoHeight * scale));
                var ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                var thumb = 'url(' + canvas.toDataURL('image/jpeg', 0.58) + ')';
                canvas.width = 0;
                canvas.height = 0;
                cleanup(thumb);
            }

            function onSeeked() { drawFrame(); }
            function onReady() {
                if (video.duration && isFinite(video.duration) && video.duration > 0.2) {
                    try {
                        video.currentTime = Math.min(0.1, video.duration / 2);
                        return;
                    } catch (e) { }
                }
                drawFrame();
            }
            function onError() { cleanup(null); }

            video.addEventListener('loadeddata', onReady);
            video.addEventListener('seeked', onSeeked);
            video.addEventListener('error', onError);
            video.src = url;
            video.load();
            setTimeout(function () {
                if (!done && video.readyState >= 2) drawFrame();
                else cleanup(null);
            }, 5000);
        });
    }

    function normalizeBlur(value) {
        if (window.WallpaperData && window.WallpaperData.normalizeWallpaperBlur) {
            return window.WallpaperData.normalizeWallpaperBlur(value);
        }
        var n = parseInt(value, 10);
        if (isNaN(n) || n <= 0) return 0;
        if (n < 5) return 5;
        return Math.max(5, Math.min(15, n));
    }

    function drawImageCover(ctx, img, width, height, overscan) {
        var scale = Math.max((width + overscan * 2) / img.width, (height + overscan * 2) / img.height);
        var drawW = img.width * scale;
        var drawH = img.height * scale;
        var x = (width - drawW) / 2;
        var y = (height - drawH) / 2;
        ctx.drawImage(img, x, y, drawW, drawH);
    }

    function generateBlurredThumbnail(source, blur) {
        blur = normalizeBlur(blur);
        if (!blur) return generateThumbnail(source);

        function processImage(img) {
            var scale = Math.min(1, BLUR_THUMB_MAX_W / img.width);
            var width = Math.max(1, Math.round(img.width * scale));
            var height = Math.max(1, Math.round(img.height * scale));
            var pad = Math.ceil(blur * 3);
            var canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            var ctx = canvas.getContext('2d');
            ctx.save();
            ctx.filter = 'blur(' + blur + 'px)';
            drawImageCover(ctx, img, width, height, pad);
            ctx.restore();
            var thumb = 'url(' + canvas.toDataURL('image/jpeg', 0.62) + ')';
            canvas.width = 0;
            canvas.height = 0;
            return thumb;
        }

        if (source && typeof source !== 'string') {
            return Promise.resolve(processImage(source));
        }

        return new Promise(function (resolve) {
            var img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function () { var r = processImage(img); img.src = ''; resolve(r); };
            img.onerror = function () { resolve(null); };
            img.src = imageSourceFromCssValue(source);
        });
    }

    // ================================================================
    // 公开 API
    // ================================================================

    function applyAndSavePreview(url, sourceId) {
        return applyWallpaper(url, undefined, sourceId).then(function (img) {
            if (!img) return;
            return generateThumbnail(img).then(function (thumb) {
                if (thumb) {
                    if (window.WallpaperData && window.WallpaperData.savePreview) {
                        window.WallpaperData.savePreview(thumb);
                    } else {
                        try { localStorage.setItem('ptab_wallpaper_preview', thumb); } catch (e) { }
                    }
                }
            });
        });
    }

    function applyVideoAndSavePreview(url, sourceId, preparedThumb) {
        return applyVideoWallpaper(url, undefined, sourceId).then(function () {
            if (preparedThumb) {
                if (window.WallpaperData && window.WallpaperData.savePreview) {
                    window.WallpaperData.savePreview(preparedThumb);
                }
                return preparedThumb;
            }
            return generateVideoThumbnail(url).then(function (thumb) {
                if (thumb && window.WallpaperData && window.WallpaperData.savePreview) {
                    window.WallpaperData.savePreview(thumb);
                }
                return thumb;
            });
        });
    }

    function showPreparedPreview(preview, options) {
        if (!preview || !wallpaperBackEl) return;
        clearVideoLayers();
        wallpaperBackEl.style.backgroundImage = preview;
        wallpaperFrontEl.classList.remove('active');
        wallpaperFrontEl.style.backgroundImage = '';
        if (!(options && options.keepCurrentUrl)) {
            clearTrackedWallpaperUrl();
        }
    }

    function showPreparedUrl(url, id) {
        if (!url || !wallpaperBackEl) return;
        clearVideoLayers();
        wallpaperBackEl.style.backgroundImage = 'url(' + url + ')';
        wallpaperFrontEl.classList.remove('active');
        wallpaperFrontEl.style.backgroundImage = '';
        trackCurrentWallpaperUrl(url, id);
    }

    function showPreparedVideoUrl(url, id) {
        if (!url) return Promise.resolve(false);
        ensureVideoLayers();
        wallpaperBackEl.style.backgroundImage = '';
        wallpaperFrontEl.classList.remove('active');
        wallpaperFrontEl.style.backgroundImage = '';
        wallpaperVideoBackEl.src = imageSourceFromCssValue(url);
        try { wallpaperVideoBackEl.currentTime = 0; } catch (e) { }
        wallpaperVideoBackEl.load();
        return waitForVideoReady(wallpaperVideoBackEl).then(function (ready) {
            if (!ready) return false;
            wallpaperVideoBackEl.classList.add('active');
            trackCurrentWallpaperUrl(url, id);
            return playVideo(wallpaperVideoBackEl);
        });
    }

    window.WallpaperShow = {
        TRANSITION_MS: TRANSITION_MS,
        THUMB_MAX_W: THUMB_MAX_W,
        BLUR_THUMB_MAX_W: BLUR_THUMB_MAX_W,

        apply: applyWallpaper,
        applyAndSavePreview: applyAndSavePreview,
        applyVideo: applyVideoWallpaper,
        applyVideoAndSavePreview: applyVideoAndSavePreview,
        thumbnail: generateThumbnail,
        videoThumbnail: generateVideoThumbnail,
        blurredThumbnail: generateBlurredThumbnail,
        showPreparedPreview: showPreparedPreview,
        showPreparedUrl: showPreparedUrl,
        showPreparedVideoUrl: showPreparedVideoUrl,
        currentDisplaySource: currentDisplaySource,
        keepCurrentUrl: trackCurrentWallpaperUrl,
        preloadImage: preloadImage,
        ensureTheme: ensureThemeModule,
        refreshTheme: refreshThemeFromCurrentWallpaper,

        get currentBlobUrl() { return _currentWallpaperBlobUrl; },
        set currentBlobUrl(v) { _currentWallpaperBlobUrl = v; },
        get currentOriginalUrl() { return _currentWallpaperSourceUrl || _currentWallpaperBlobUrl; },
        get currentOriginalId() { return _currentWallpaperSourceId; },

        revokeBlobUrls: function () {
            clearVideoLayers();
            clearTrackedWallpaperUrl();
        }
    };

})();
