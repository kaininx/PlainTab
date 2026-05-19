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
    var DEFAULT_SEARCH_WIDTH = 560;
    var DEFAULT_SEARCH_BG_OPACITY = 0.1;
    var DEFAULT_SEARCH_BLUR = 24;
    var DEFAULT_OVERLAY_OPACITY = 0;
    var DEFAULT_PANEL_OPACITY = 0.88;
    var DEFAULT_SEARCH_RADIUS = 'capsule';
    var DEFAULT_WALLPAPER_FIT = 'cover';
    var DEFAULT_WALLPAPER_POSITION = 'center';
    var DEFAULT_WALLPAPER_BLUR = 0;
    var DEFAULT_UI_RADIUS = 'soft';

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

    function detectLang() {
        var browserLang = 'en';
        if (typeof chrome !== 'undefined' && chrome.i18n) browserLang = chrome.i18n.getUILanguage();
        else browserLang = navigator.language || 'en';
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

    function applyThemeMode(on) {
        var root = document.documentElement.style;
        document.documentElement.setAttribute('data-wallpaper-theme', on ? 'on' : 'off');
        if (on) {
            root.setProperty('--surface-base-rgb', 'var(--theme-surface-base-rgb)');
            root.setProperty('--surface-elevated-rgb', 'var(--theme-surface-elevated-rgb)');
            root.setProperty('--tint-rgb', 'var(--theme-tint-rgb)');
            root.setProperty('--stroke-rgb', 'var(--theme-stroke-rgb)');
            root.setProperty('--on-surface-rgb', 'var(--theme-on-surface-rgb)');
            root.setProperty('--on-surface-muted-rgb', 'var(--theme-on-surface-muted-rgb)');
            root.setProperty('--accent-rgb', 'var(--theme-accent-rgb)');
            root.setProperty('--accent-contrast-rgb', 'var(--theme-accent-contrast-rgb)');
            root.setProperty('--glass-bg', 'rgba(var(--surface-base-rgb), var(--panel-opacity))');
            root.setProperty('--glass-tint', 'linear-gradient(180deg, rgba(var(--tint-rgb), 0.24), rgba(var(--surface-elevated-rgb), 0.10))');
            if (window.WallpaperShow && window.WallpaperShow.refreshTheme) {
                window.WallpaperShow.refreshTheme(true);
            }
        } else {
            [
                '--surface-base-rgb', '--surface-elevated-rgb', '--tint-rgb', '--stroke-rgb',
                '--on-surface-rgb', '--on-surface-muted-rgb', '--theme-surface-base-rgb',
                '--theme-surface-elevated-rgb', '--theme-tint-rgb', '--theme-stroke-rgb',
                '--theme-on-surface-rgb', '--theme-on-surface-muted-rgb', '--theme-accent-rgb',
                '--theme-accent-contrast-rgb', '--accent-rgb', '--accent-contrast-rgb'
            ].forEach(function (name) { root.removeProperty(name); });
            root.setProperty('--glass-bg', 'rgba(var(--surface-base-rgb), var(--panel-opacity))');
            root.setProperty('--glass-tint', 'linear-gradient(180deg, rgba(var(--tint-rgb), 0.20), rgba(var(--surface-elevated-rgb), 0.08))');
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
        searchBar.style.borderRadius = radii[radius] || radii[DEFAULT_SEARCH_RADIUS];
        root.setProperty('--search-width', clampInteger(search.width, 360, 760, DEFAULT_SEARCH_WIDTH) + 'px');
        root.setProperty('--search-bg-opacity', clampNumber(search.backgroundOpacity, 0.04, 0.32, DEFAULT_SEARCH_BG_OPACITY).toFixed(2));
        root.setProperty('--search-blur', clampInteger(search.blur, 0, 40, DEFAULT_SEARCH_BLUR) + 'px');
        root.setProperty('--icon-opacity', clampNumber(icon.opacity, 0, 1, DEFAULT_OPACITY).toFixed(2));
        root.setProperty('--panel-opacity', clampNumber(panel.opacity, 0.3, 1, DEFAULT_PANEL_OPACITY).toFixed(2));
        root.setProperty('--wallpaper-fit', validValue(wallpaper.fit || DEFAULT_WALLPAPER_FIT, ['cover', 'contain', '100% 100%'], DEFAULT_WALLPAPER_FIT));
        root.setProperty('--wallpaper-position', validValue(wallpaper.position || DEFAULT_WALLPAPER_POSITION, ['center', 'top', 'bottom', 'left', 'right'], DEFAULT_WALLPAPER_POSITION));
        var wallpaperBlur = clampInteger(wallpaper.blur, 0, 15, DEFAULT_WALLPAPER_BLUR);
        if (wallpaperBlur > 0 && wallpaperBlur < 5) wallpaperBlur = 5;
        root.setProperty('--wallpaper-blur', wallpaperBlur + 'px');
        root.setProperty('--radius-sm', preset.sm);
        root.setProperty('--radius-md', preset.md);
        root.setProperty('--radius-lg', preset.lg);
        document.documentElement.classList.toggle('wallpaper-blur-active', wallpaperBlur >= 5);
        applyOverlayOpacity(wallpaper.overlayOpacity);
        applyThemeMode(wallpaper.themeEnabled === true);
        if (!IS_EXTENSION) applyEngine(currentEngine);
    }

    function updateLangUI() {
        var nextTitle = t('extName');
        if (document.title !== nextTitle) document.title = nextTitle;
        var searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.placeholder = t('searchPlaceholder');
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
                currentLang = lang.code;
                D.saveLocale(currentLang);
                if (window.SettingsPanelFull && window.SettingsPanelFull.setCurrentLang) {
                    window.SettingsPanelFull.setCurrentLang(currentLang);
                }
                updateLangUI();
                if (window.onLangChange) window.onLangChange(currentLang);
                closeLangPanel();
            });
            langOptions.appendChild(btn);
            langBtns.push(btn);
        });
        refreshLangButtons();
    }

    function ensureFullSettings() {
        if (window.SettingsPanelFull) return Promise.resolve(window.SettingsPanelFull);
        if (!fullLoadPromise) {
            fullLoadPromise = new Promise(function (resolve, reject) {
                var script = document.createElement('script');
                script.src = 'js/settings-panel.js';
                script.onload = function () { resolve(window.SettingsPanelFull); };
                script.onerror = function () { reject(new Error('failed to load settings-panel.js')); };
                document.body.appendChild(script);
            }).then(function (full) {
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
        open: openSettings,
        close: closeSettings,
        toggle: toggleSettings,
        closeAll: closeAll,
        openModal: openModal,
        closeModal: closeModal,
        updateLangUI: updateLangUI,
        getSearchMode: function () { return searchMode; },
        getOpacity: function () { return parseFloat((D.loadUI().icon || {}).opacity) || DEFAULT_OPACITY; },
        getEngine: function () { return currentEngine; },
        getCurrentMode: function () { return currentMode; },
        setCurrentMode: function (m) { currentMode = m; if (window.SettingsPanelFull && window.SettingsPanelFull.setCurrentMode) window.SettingsPanelFull.setCurrentMode(m); },
        getCurrentLang: function () { return currentLang; },
        setWallpaperInfo: function () {
            updateLangUI();
            if (window.SettingsPanelFull && window.SettingsPanelFull.refresh) window.SettingsPanelFull.refresh();
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
            if (window.SettingsPanelFull && window.SettingsPanelFull.refresh) window.SettingsPanelFull.refresh();
        },
        ensureFull: ensureFullSettings
    };

    window.t = t;
})();
