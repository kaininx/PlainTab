/**
 * Settings bootstrap —— startup-only settings surface.
 * Keeps first-load UI cheap, then loads settings-panel.js on demand.
 */
(function () {
    'use strict';

    var D = window.WallpaperData;
    var I18N = window.I18N || {};
    var LanguageList = window.LanguageList || [];

    var DEFAULT_SEARCH_MODE = 'always';
    var DEFAULT_OPACITY = 0.45;
    var DEFAULT_ENGINE = 'google';
    var DEFAULT_SEARCH_POSITION = 'center';
    var DEFAULT_SEARCH_ALIGN = 'center';
    var DEFAULT_SEARCH_ICON_POSITION = 'right';
    var DEFAULT_SEARCH_ICON_VISIBILITY = 'always';
    var DEFAULT_SEARCH_SURFACE = 'glass';
    var DEFAULT_SEARCH_SHADOW = 'standard';
    var DEFAULT_SEARCH_ENTER_BEHAVIOR = 'current';
    var DEFAULT_SEARCH_WIDTH = 560;
    var DEFAULT_SEARCH_BG_OPACITY = 0.1;
    var DEFAULT_SEARCH_BLUR = 24;
    var DEFAULT_OVERLAY_OPACITY = 0;
    var DEFAULT_PANEL_OPACITY = 0.88;
    var DEFAULT_SEARCH_RADIUS = 'capsule';
    var DEFAULT_WALLPAPER_VIGNETTE = 'none';
    var DEFAULT_WALLPAPER_FIT = 'cover';
    var DEFAULT_WALLPAPER_POSITION = 'center';
    var DEFAULT_WALLPAPER_BLUR = 0;
    var DEFAULT_UI_RADIUS = 'soft';
    var DEFAULT_FONT_SCALE = 'standard';
    var DEFAULT_ACCENT_MODE = 'auto';
    var DEFAULT_ACCENT_COLOR = '#6366f1';

    var IS_EXTENSION = typeof chrome !== 'undefined' && chrome.runtime && !!chrome.runtime.id;
    var ENGINES = ['google', 'bing', 'baidu', 'duckduckgo'];

    var settingsBtn, langBtn, settingsPanel, langPanel, langOptions;
    var modeChipEl, uploadBtn, searchBar, engineIcon;
    var currentMode = 'bing';
    var currentLang = 'en';
    var searchMode = DEFAULT_SEARCH_MODE;
    var currentEngine = DEFAULT_ENGINE;
    var engineIndex = 0;
    var langBtns = null;
    var isOpen = false;
    var isLangPanelOpen = false;
    var isMouseInCornerZone = false;
    var cornerHideTimer = null;
    var fullLoadPromise = null;

    function t(key) {
        if (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getMessage) {
            var msg = chrome.i18n.getMessage(key);
            if (msg) return msg;
        }
        return (I18N[currentLang] && I18N[currentLang][key]) || (I18N.en && I18N.en[key]) || key;
    }

    function loadLocale(lang) {
        if (window.PlainTabI18N && window.PlainTabI18N.loadLocale) {
            return window.PlainTabI18N.loadLocale(lang);
        }
        return Promise.resolve(I18N[lang] ? lang : 'en');
    }

    function detectLang() {
        var browserLang = 'en';
        if (typeof chrome !== 'undefined' && chrome.i18n) browserLang = chrome.i18n.getUILanguage();
        else browserLang = navigator.language || 'en';
        if (window.PlainTabI18N && window.PlainTabI18N.resolveLocale) return window.PlainTabI18N.resolveLocale(browserLang);
        if (I18N[browserLang]) return browserLang;
        var main = browserLang.split('-')[0];
        var found = null;
        Object.keys(I18N).some(function (k) {
            if (k.indexOf(main) === 0) { found = k; return true; }
            return false;
        });
        return found || 'en';
    }

    function cacheDom() {
        settingsBtn = document.getElementById('settingsBtn');
        langBtn = document.getElementById('langBtn');
        settingsPanel = document.getElementById('settingsPanel');
        langPanel = document.getElementById('langPanel');
        langOptions = document.getElementById('langOptions');
        modeChipEl = document.getElementById('wpModeChip');
        uploadBtn = document.getElementById('uploadBtn');
        searchBar = document.getElementById('searchBar');
        engineIcon = document.getElementById('searchEngineIcon');
    }

    function clampNumber(value, min, max, fallback) {
        var n = parseFloat(value);
        if (isNaN(n)) n = fallback;
        return Math.max(min, Math.min(max, n));
    }

    function clampInteger(value, min, max, fallback) {
        return Math.round(clampNumber(value, min, max, fallback));
    }

    function validValue(value, allowed, fallback) {
        return allowed.indexOf(value) !== -1 ? value : fallback;
    }

    function hexToRgb(value) {
        var raw = String(value || '').trim();
        var match = raw.match(/^#?([0-9a-f]{6})$/i);
        if (!match) return null;
        var hex = match[1];
        return [
            parseInt(hex.slice(0, 2), 16),
            parseInt(hex.slice(2, 4), 16),
            parseInt(hex.slice(4, 6), 16)
        ].join(', ');
    }

    function searchPositionParts(value, fallbackAlign) {
        var align = validValue(fallbackAlign || DEFAULT_SEARCH_ALIGN, ['left', 'center', 'right'], DEFAULT_SEARCH_ALIGN);
        var rowMap = {
            'edge-top': 'edge-top',
            top: 'top',
            upper: 'upper',
            'center-upper': 'center-upper',
            center: 'center',
            'center-lower': 'center-lower',
            lower: 'lower',
            bottom: 'bottom',
            'edge-bottom': 'edge-bottom'
        };
        var row = rowMap[value] || DEFAULT_SEARCH_POSITION;
        return { value: row, align: align };
    }

    function applyOverlayOpacity(value) {
        var opacity = clampNumber(value, 0, 0.6, DEFAULT_OVERLAY_OPACITY);
        if (opacity <= 0) {
            var old = document.getElementById('wallpaperOverlay');
            if (old) old.remove();
            return;
        }
        var overlayEl = document.getElementById('wallpaperOverlay');
        if (!overlayEl) {
            overlayEl = document.createElement('div');
            overlayEl.id = 'wallpaperOverlay';
            overlayEl.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,' + opacity + ');pointer-events:none;z-index:1;transition:background 0.3s;';
            document.body.appendChild(overlayEl);
        }
        overlayEl.style.background = 'rgba(0,0,0,' + opacity + ')';
    }

    function applyWallpaperVignette(value) {
        var level = validValue(value || DEFAULT_WALLPAPER_VIGNETTE, ['none', 'soft', 'medium'], DEFAULT_WALLPAPER_VIGNETTE);
        var old = document.getElementById('wallpaperVignette');
        if (level === 'none') {
            if (old) old.remove();
            return;
        }
        var opacity = level === 'medium' ? 0.36 : 0.22;
        var vignetteEl = old;
        if (!vignetteEl) {
            vignetteEl = document.createElement('div');
            vignetteEl.id = 'wallpaperVignette';
            vignetteEl.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2;transition:opacity var(--transition);';
            document.body.appendChild(vignetteEl);
        }
        vignetteEl.style.opacity = opacity;
        vignetteEl.style.background = 'radial-gradient(circle at center, rgba(0,0,0,0) 42%, rgba(0,0,0,0.55) 100%)';
    }

    function applyCustomAccentTheme(value) {
        if (window.PlainTabTheme && window.PlainTabTheme.applyCustomAccentTheme) {
            return window.PlainTabTheme.applyCustomAccentTheme(value);
        }
        return false;
    }

    function applyDefaultSurfaceTheme() {
        if (window.PlainTabTheme && window.PlainTabTheme.applyDefaultSurfaceTheme) {
            window.PlainTabTheme.applyDefaultSurfaceTheme();
        }
    }

    function applyAccentPreference(appearance) {
        var mode = validValue(appearance.accentMode || DEFAULT_ACCENT_MODE, ['auto', 'custom'], DEFAULT_ACCENT_MODE);
        var rgb = hexToRgb(appearance.accentColor || DEFAULT_ACCENT_COLOR);
        if (mode === 'custom' && rgb) {
            applyCustomAccentTheme(rgb);
        }
    }

    function applyGlobalAppearance(appearance) {
        var rootEl = document.documentElement;
        var root = rootEl.style;
        var fontScale = validValue(appearance.fontScale || DEFAULT_FONT_SCALE, ['compact', 'standard', 'large'], DEFAULT_FONT_SCALE);
        var fontSizeMap = { compact: '15px', standard: '16px', large: '17px' };
        var fontScaleMap = { compact: '0.94', standard: '1', large: '1.08' };
        root.setProperty('--app-font-size', fontSizeMap[fontScale]);
        root.setProperty('--app-font-scale', fontScaleMap[fontScale]);
        rootEl.setAttribute('data-font-scale', fontScale);
        rootEl.setAttribute('data-reduced-motion', appearance.reducedMotion === true ? 'true' : 'false');
        applyAccentPreference(appearance);
    }

    function applyThemeMode(on) {
        if (on) {
            if (window.PlainTabTheme && window.PlainTabTheme.applyWallpaperTheme) {
                window.PlainTabTheme.applyWallpaperTheme();
            }
            if (window.WallpaperShow && window.WallpaperShow.refreshTheme) {
                window.WallpaperShow.refreshTheme(true);
            }
        } else {
            applyDefaultSurfaceTheme();
        }
    }

    function applyEngine(engine) {
        currentEngine = engine;
        engineIndex = ENGINES.indexOf(engine);
        if (engineIndex === -1) engineIndex = 0;
        var svgMap = window.ENGINE_SVG || {};
        if (engineIcon) engineIcon.innerHTML = svgMap[engine] || svgMap.google || '';
    }

    function applyUi(ui) {
        var search = ui.search || {};
        var wallpaper = ui.wallpaper || {};
        var icon = ui.icon || {};
        var panel = ui.panel || {};
        var appearance = ui.appearance || {};
        var root = document.documentElement.style;
        var parts = searchPositionParts(search.position || DEFAULT_SEARCH_POSITION, search.align || DEFAULT_SEARCH_ALIGN);
        var radii = { capsule: '28px', rounded: '12px', sharp: '4px' };
        var radius = validValue(search.radius || DEFAULT_SEARCH_RADIUS, ['capsule', 'rounded', 'sharp'], DEFAULT_SEARCH_RADIUS);
        var uiRadius = validValue(appearance.radius || DEFAULT_UI_RADIUS, ['compact', 'soft', 'round'], DEFAULT_UI_RADIUS);
        var radiusPresets = {
            compact: { sm: '6px', md: '8px', lg: '12px' },
            soft: { sm: '8px', md: '12px', lg: '16px' },
            round: { sm: '12px', md: '16px', lg: '22px' }
        };
        var preset = radiusPresets[uiRadius];

        searchMode = search.visibility || DEFAULT_SEARCH_MODE;
        currentEngine = search.engine || DEFAULT_ENGINE;
        searchBar.classList.toggle('visible', searchMode === 'always');
        searchBar.setAttribute('data-visibility', searchMode);
        searchBar.setAttribute('data-position', parts.value);
        searchBar.setAttribute('data-align', parts.align);
        searchBar.setAttribute('data-icon-position', search.iconPosition || DEFAULT_SEARCH_ICON_POSITION);
        searchBar.setAttribute('data-icon-visibility', validValue(search.iconVisibility || DEFAULT_SEARCH_ICON_VISIBILITY, ['always', 'hidden'], DEFAULT_SEARCH_ICON_VISIBILITY));
        searchBar.setAttribute('data-surface', validValue(search.surface || DEFAULT_SEARCH_SURFACE, ['glass', 'solid', 'outline', 'clean', 'theme', 'light'], DEFAULT_SEARCH_SURFACE));
        searchBar.setAttribute('data-shadow', validValue(search.shadow || DEFAULT_SEARCH_SHADOW, ['none', 'soft', 'standard'], DEFAULT_SEARCH_SHADOW));
        searchBar.style.borderRadius = radii[radius] || radii[DEFAULT_SEARCH_RADIUS];
        root.setProperty('--search-width', clampInteger(search.width, 360, 760, DEFAULT_SEARCH_WIDTH) + 'px');
        var searchBgOpacity = clampNumber(search.backgroundOpacity, 0.04, 0.32, DEFAULT_SEARCH_BG_OPACITY);
        root.setProperty('--search-bg-opacity', searchBgOpacity.toFixed(2));
        root.setProperty('--search-solid-bg-opacity', (0.48 + searchBgOpacity).toFixed(2));
        root.setProperty('--search-outline-bg-opacity', (searchBgOpacity * 0.45).toFixed(2));
        root.setProperty('--search-blur', clampInteger(search.blur, 0, 40, DEFAULT_SEARCH_BLUR) + 'px');
        root.setProperty('--icon-opacity', clampNumber(icon.opacity, 0, 1, DEFAULT_OPACITY).toFixed(2));
        root.setProperty('--panel-opacity', clampNumber(panel.opacity, 0.3, 1, DEFAULT_PANEL_OPACITY).toFixed(2));
        root.setProperty('--wallpaper-fit', validValue(wallpaper.fit || DEFAULT_WALLPAPER_FIT, ['cover', 'contain', '100% 100%'], DEFAULT_WALLPAPER_FIT));
        root.setProperty('--wallpaper-position', validValue(wallpaper.position || DEFAULT_WALLPAPER_POSITION, ['center', 'top', 'bottom', 'left', 'right'], DEFAULT_WALLPAPER_POSITION));
        var wallpaperBlur = clampInteger(wallpaper.blur, 0, 5, DEFAULT_WALLPAPER_BLUR);
        if (wallpaperBlur > 0) wallpaperBlur = 5;
        root.setProperty('--wallpaper-blur', wallpaperBlur + 'px');
        root.setProperty('--radius-sm', preset.sm);
        root.setProperty('--radius-md', preset.md);
        root.setProperty('--radius-lg', preset.lg);
        document.documentElement.classList.toggle('wallpaper-blur-active', wallpaperBlur >= 5);
        applyOverlayOpacity(wallpaper.overlayOpacity);
        applyThemeMode(wallpaper.themeEnabled === true);
        applyWallpaperVignette(wallpaper.vignette);
        applyGlobalAppearance(appearance);
        if (!IS_EXTENSION) applyEngine(currentEngine);
    }

    function updateLangUI() {
        var nextTitle = t('extName');
        if (document.title !== nextTitle) document.title = nextTitle;
        var searchInput = document.getElementById('searchInput');
        if (searchInput) {
            var ui = D.loadUI();
            var placeholder = ui.search && ui.search.placeholder ? ui.search.placeholder : t('searchPlaceholder');
            searchInput.placeholder = placeholder;
        }
        if (settingsBtn) settingsBtn.title = t('settingsTitle');
        if (settingsBtn) settingsBtn.setAttribute('aria-label', t('settingsTitle'));
        if (langBtn) langBtn.title = t('langTitle');
        if (langBtn) langBtn.setAttribute('aria-label', t('langTitle'));
        if (engineIcon) engineIcon.title = t('engineTitle');
        if (engineIcon) engineIcon.setAttribute('aria-label', t('engineTitle'));
        if (uploadBtn) uploadBtn.title = t('addImage');
        if (uploadBtn) uploadBtn.setAttribute('aria-label', t('addImage'));
        if (modeChipEl) {
            var source = currentMode === 'local' ? 'upload' : currentMode;
            var labels = {
                bing: t('sourceBing') || t('wpBing'),
                upload: t('sourceUpload') || t('wpLocal'),
                folder: t('sourceFolder'),
                rss: t('sourceRss'),
                api: t('sourceApi')
            };
            modeChipEl.textContent = labels[source] || source;
            modeChipEl.className = 'wp-mode-chip ' + source;
        }
        document.querySelectorAll('[data-i18n]').forEach(function (el) {
            var key = el.getAttribute('data-i18n');
            if (key) el.textContent = t(key);
        });
        if (langBtns) refreshLangButtons();
    }

    function refreshLangButtons() {
        if (!langBtns) return;
        langBtns.forEach(function (btn) {
            btn.classList.toggle('current', btn.dataset.lang === currentLang);
        });
    }

    function renderLangPanel() {
        if (!langOptions || langBtns) {
            refreshLangButtons();
            return;
        }
        langBtns = [];
        LanguageList.forEach(function (lang) {
            var btn = document.createElement('button');
            btn.className = 'lang-option';
            btn.dataset.lang = lang.code;
            btn.textContent = lang.name;
            btn.addEventListener('click', function () {
                if (currentLang === lang.code) return;
                btn.disabled = true;
                loadLocale(lang.code).then(function (loadedLang) {
                    currentLang = loadedLang;
                    D.saveLocale(currentLang);
                    if (window.SettingsPanelFull && window.SettingsPanelFull.setCurrentLang) {
                        window.SettingsPanelFull.setCurrentLang(currentLang);
                    }
                    updateLangUI();
                    if (window.onLangChange) window.onLangChange(currentLang);
                    closeLangPanel();
                }).catch(function () {
                    currentLang = 'en';
                    D.saveLocale(currentLang);
                    updateLangUI();
                    closeLangPanel();
                }).then(function () {
                    btn.disabled = false;
                });
            });
            langOptions.appendChild(btn);
            langBtns.push(btn);
        });
        refreshLangButtons();
    }

    function loadScript(src) {
        return new Promise(function (resolve, reject) {
            var existing = document.querySelector('script[src="' + src + '"]');
            if (existing) {
                if (existing.dataset.loaded === 'true') {
                    resolve();
                    return;
                }
                existing.addEventListener('load', function () { resolve(); }, { once: true });
                existing.addEventListener('error', function () { reject(new Error('failed to load ' + src)); }, { once: true });
                return;
            }
            var script = document.createElement('script');
            script.src = src;
            script.onload = function () {
                script.dataset.loaded = 'true';
                resolve();
            };
            script.onerror = function () { reject(new Error('failed to load ' + src)); };
            document.body.appendChild(script);
        });
    }

    function ensureFullSettings() {
        if (window.SettingsPanelFull && window.SettingsWallpaper) return Promise.resolve(window.SettingsPanelFull);
        if (!fullLoadPromise) {
            fullLoadPromise = loadScript('js/settings-panel.js').then(function () {
                return loadScript('js/settings-wallpaper.js');
            }).then(function () {
                var full = window.SettingsPanelFull;
                if (full && full.init) full.init({
                    bootstrapShell: true,
                    currentLang: currentLang,
                    currentMode: currentMode,
                    searchMode: searchMode,
                    currentEngine: currentEngine,
                    engineIndex: engineIndex
                });
                return full;
            });
        }
        return fullLoadPromise;
    }

    function openSettings() {
        closeLangPanel();
        ensureFullSettings().then(function (full) {
            if (full && full.open) full.open();
        }).catch(function () { });
    }

    function closeSettings() {
        if (window.SettingsPanelFull && window.SettingsPanelFull.close) window.SettingsPanelFull.close();
        isOpen = false;
    }

    function toggleSettings() {
        if (window.SettingsPanelFull && window.SettingsPanelFull.isOpen && window.SettingsPanelFull.isOpen()) {
            window.SettingsPanelFull.close();
            return;
        }
        openSettings();
    }

    function openModal() {
        ensureFullSettings().then(function (full) {
            if (full && full.openModal) full.openModal();
        }).catch(function () { });
    }

    function closeModal() {
        if (window.SettingsPanelFull && window.SettingsPanelFull.closeModal) window.SettingsPanelFull.closeModal();
    }

    function closeSearchPreview() {
        if (window.SettingsPanelFull && window.SettingsPanelFull.closeSearchPreview) window.SettingsPanelFull.closeSearchPreview();
    }

    function openLangPanel() {
        if (window.SettingsPanelFull && window.SettingsPanelFull.isOpen && window.SettingsPanelFull.isOpen()) window.SettingsPanelFull.close();
        isLangPanelOpen = true;
        renderLangPanel();
        langPanel.classList.add('active');
        showCorners();
    }

    function closeLangPanel() {
        isLangPanelOpen = false;
        langPanel.classList.remove('active');
    }

    function closeAll() {
        closeSettings();
        closeLangPanel();
        closeSearchPreview();
        closeModal();
    }

    function showCorners() {
        if (settingsBtn.classList.contains('visible')) return;
        settingsBtn.classList.add('visible');
        langBtn.classList.add('visible');
    }

    function hideCorners() {
        if (isOpen || isLangPanelOpen || (window.SettingsPanelFull && window.SettingsPanelFull.isOpen && window.SettingsPanelFull.isOpen())) return;
        clearTimeout(cornerHideTimer);
        cornerHideTimer = setTimeout(function () {
            if (!isMouseInCornerZone && !isLangPanelOpen) {
                settingsBtn.classList.remove('visible');
                langBtn.classList.remove('visible');
            }
        }, 400);
    }

    function isNearTopRight(x, y) {
        return x > window.innerWidth - 180 && y < 130;
    }

    function setupExtensionMode() {
        if (engineIcon) {
            engineIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 16 16"><g clip-path="url(#a)"><path d="M14 12.94 10.16 9.1c1.25-1.76 1.1-4.2-.48-5.78a4.49 4.49 0 0 0-6.36 0 4.49 4.49 0 0 0 0 6.36 4.486 4.486 0 0 0 5.78.48L12.94 14 14 12.94ZM4.38 8.62a3 3 0 0 1 0-4.24 3 3 0 0 1 4.24 0 3 3 0 0 1 0 4.24 3 3 0 0 1-4.24 0Z"/></g><defs><clipPath id="a"><path d="M0 0h16v16H0z"/></clipPath></defs></svg>';
            engineIcon.style.opacity = String(DEFAULT_OPACITY);
            engineIcon.style.pointerEvents = 'none';
        }
    }

    function bindEvents() {
        settingsBtn.addEventListener('click', function (e) { e.stopPropagation(); toggleSettings(); });
        settingsBtn.addEventListener('mouseenter', function () { isMouseInCornerZone = true; showCorners(); });
        settingsBtn.addEventListener('mouseleave', function () { isMouseInCornerZone = false; hideCorners(); });
        langBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (isLangPanelOpen) closeLangPanel();
            else openLangPanel();
        });
        langBtn.addEventListener('mouseenter', function () { isMouseInCornerZone = true; showCorners(); });
        langBtn.addEventListener('mouseleave', function () { isMouseInCornerZone = false; hideCorners(); });
        langPanel.addEventListener('mouseenter', function () { isMouseInCornerZone = true; clearTimeout(cornerHideTimer); });
        langPanel.addEventListener('mouseleave', function () { isMouseInCornerZone = false; hideCorners(); });
        langPanel.addEventListener('click', function (e) { e.stopPropagation(); });
        if (uploadBtn) uploadBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            ensureFullSettings().then(function (full) {
                if (full && full.open) full.open();
                if (full && full.pickUpload) full.pickUpload();
            });
        });
        if (engineIcon && !IS_EXTENSION) engineIcon.addEventListener('click', function (e) {
            e.stopPropagation();
            currentEngine = ENGINES[(engineIndex + 1) % ENGINES.length];
            var ui = D.loadUI();
            if (!ui.search) ui.search = {};
            ui.search.engine = currentEngine;
            D.saveUI(ui);
            applyEngine(currentEngine);
        });
    }

    function init() {
        cacheDom();
        var ui = D.loadUI();
        currentMode = D.compatMode(D.getActiveSource());
        currentLang = D.loadLocale() || detectLang();
        if (!I18N[currentLang]) currentLang = 'en';
        currentEngine = (ui.search && ui.search.engine) || DEFAULT_ENGINE;
        applyUi(ui);
        updateLangUI();
        bindEvents();
        if (IS_EXTENSION) setupExtensionMode();
    }

    window.SettingsPanel = {
        init: init,
        isOpen: function () { return (window.SettingsPanelFull && window.SettingsPanelFull.isOpen && window.SettingsPanelFull.isOpen()) || isOpen; },
        isLangPanelOpen: function () { return isLangPanelOpen; },
        isModalOpen: function () { return window.SettingsPanelFull && window.SettingsPanelFull.isModalOpen && window.SettingsPanelFull.isModalOpen(); },
        isSearchPreviewOpen: function () { return window.SettingsPanelFull && window.SettingsPanelFull.isSearchPreviewOpen && window.SettingsPanelFull.isSearchPreviewOpen(); },
        open: openSettings,
        close: closeSettings,
        toggle: toggleSettings,
        closeAll: closeAll,
        openModal: openModal,
        closeModal: closeModal,
        closeSearchPreview: closeSearchPreview,
        updateLangUI: updateLangUI,
        getSearchMode: function () { return searchMode; },
        getOpacity: function () { return parseFloat((D.loadUI().icon || {}).opacity) || DEFAULT_OPACITY; },
        getEngine: function () { return currentEngine; },
        getSearchEnterBehavior: function () {
            var search = D.loadUI().search || {};
            return validValue(search.enterBehavior || DEFAULT_SEARCH_ENTER_BEHAVIOR, ['current', 'newtab'], DEFAULT_SEARCH_ENTER_BEHAVIOR);
        },
        getCurrentMode: function () { return currentMode; },
        setCurrentMode: function (m) { currentMode = m; if (window.SettingsPanelFull && window.SettingsPanelFull.setCurrentMode) window.SettingsPanelFull.setCurrentMode(m); },
        getCurrentLang: function () { return currentLang; },
        setWallpaperInfo: function () {
            updateLangUI();
            if (window.SettingsPanelFull && window.SettingsPanelFull.isReady && window.SettingsPanelFull.isReady() && window.SettingsPanelFull.refresh) window.SettingsPanelFull.refresh();
        },
        getEngineIndex: function () { return engineIndex; },
        setEngineIndex: function (i) { engineIndex = i; },
        isNearTopRight: isNearTopRight,
        showCorners: showCorners,
        hideCorners: hideCorners,
        isExtension: IS_EXTENSION,
        refresh: function () {
            applyUi(D.loadUI());
            updateLangUI();
            if (window.SettingsPanelFull && window.SettingsPanelFull.isReady && window.SettingsPanelFull.isReady() && window.SettingsPanelFull.refresh) window.SettingsPanelFull.refresh();
        },
        ensureFull: ensureFullSettings
    };

    window.t = t;
})();
