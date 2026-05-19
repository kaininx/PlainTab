/**
 * Settings — 设置面板系统
 * L1 一级面板（画廊 + 快速信息）+ L2 模态窗口（四页签完整设置）
 * 按需挂载到 window.SettingsPanelFull
 */
(function () {
    'use strict';

    // ================================================================
    // 依赖
    // ================================================================
    var D = window.WallpaperData;
    var S = window.WallpaperShow;
    var F = window.WallpaperFetch;
    var WF = window.WallpaperFolder;
    var I18N = window.I18N || {};
    var LanguageList = window.LanguageList || [];

    var log = window.log || function (tag, msg) { console.log('[' + tag + '] ' + msg); };
    var warn = window.warn || function (tag, msg) { console.warn('[' + tag + '] ' + msg); };

    // ================================================================
    // 常量
    // ================================================================
    var DEFAULT_SEARCH_MODE = 'always';
    var DEFAULT_OPACITY = 0.45;
    var DEFAULT_ENGINE = 'google';
    var DEFAULT_SEARCH_POSITION = 'center';
    var DEFAULT_OVERLAY_OPACITY = 0;
    var DEFAULT_PANEL_OPACITY = 0.88;
    var DEFAULT_SEARCH_RADIUS = 'capsule';
    var DEFAULT_SEARCH_ALIGN = 'center';
    var DEFAULT_SEARCH_ICON_POSITION = 'right';
    var DEFAULT_SEARCH_ICON_VISIBILITY = 'always';
    var DEFAULT_SEARCH_SURFACE = 'glass';
    var DEFAULT_SEARCH_SHADOW = 'standard';
    var DEFAULT_SEARCH_ENTER_BEHAVIOR = 'current';
    var DEFAULT_SEARCH_WIDTH = 560;
    var DEFAULT_SEARCH_BG_OPACITY = 0.1;
    var DEFAULT_SEARCH_BLUR = 24;
    var DEFAULT_SEARCH_HISTORY_LIMIT = 5;
    var DEFAULT_WALLPAPER_VIGNETTE = 'none';
    var DEFAULT_WALLPAPER_FIT = 'cover';
    var DEFAULT_WALLPAPER_POSITION = 'center';
    var DEFAULT_WALLPAPER_BLUR = 0;
    var DEFAULT_WALLPAPER_BLUR_MAX = 15;
    var DEFAULT_UI_RADIUS = 'soft';
    var DEFAULT_FONT_SCALE = 'standard';
    var DEFAULT_ACCENT_MODE = 'auto';
    var DEFAULT_ACCENT_COLOR = '#6366f1';
    var BACKUP_KDF_ITERATIONS = 150000;
    var HTTPS_ALL_ORIGIN = 'https://*/*';

    var IS_EXTENSION = typeof chrome !== 'undefined' && chrome.runtime && !!chrome.runtime.id;

    // ================================================================
    // 搜索引擎
    // ================================================================
    var ENGINES = ['google', 'bing', 'baidu', 'duckduckgo'];

    // ================================================================
    // i18n
    // ================================================================
    function t(key) {
        if (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getMessage) {
            var msg = chrome.i18n.getMessage(key);
            if (msg) return msg;
        }
        return (I18N[currentLang] && I18N[currentLang][key]) || (I18N['en'] && I18N['en'][key]) || key;
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
        Object.keys(I18N).some(function (k) { if (k.indexOf(main) === 0) { found = k; return true; } return false; });
        return found || 'en';
    }

    // ================================================================
    // DOM 元素
    // ================================================================
    var settingsBtn, langBtn, settingsPanel, langPanel, langOptions;
    var modeChipEl, galleryAnchorEl, uploadBtn, fileInput;
    var searchBar, engineIcon;
    // Modal
    var modalOverlay, modalWindow, modalContent;

    function cacheDom() {
        settingsBtn = document.getElementById('settingsBtn');
        langBtn = document.getElementById('langBtn');
        settingsPanel = document.getElementById('settingsPanel');
        langPanel = document.getElementById('langPanel');
        langOptions = document.getElementById('langOptions');
        modeChipEl = document.getElementById('wpModeChip');
        galleryAnchorEl = document.getElementById('galleryAnchor');
        uploadBtn = document.getElementById('uploadBtn');
        fileInput = document.getElementById('fileInput');
        searchBar = document.getElementById('searchBar');
        engineIcon = document.getElementById('searchEngineIcon');
        // Modal
        modalOverlay = document.getElementById('modalOverlay');
        modalContent = document.getElementById('modalContent');
        if (modalOverlay) modalWindow = modalOverlay.querySelector('.modal-window');
    }

    // ================================================================
    // 状态
    // ================================================================
    var currentMode = 'bing';
    var currentLang = 'en';
    var isMouseInCornerZone = false;
    var isOpen = false;
    var isLangPanelOpen = false;
    var isModalOpen = false;
    var cornerHideTimer = null;
    var searchMode = DEFAULT_SEARCH_MODE;
    var currentOpacity = DEFAULT_OPACITY;
    var currentEngine = DEFAULT_ENGINE;
    var searchPosition = DEFAULT_SEARCH_POSITION;
    var searchAlign = DEFAULT_SEARCH_ALIGN;
    var searchIconPosition = DEFAULT_SEARCH_ICON_POSITION;
    var searchIconVisibility = DEFAULT_SEARCH_ICON_VISIBILITY;
    var searchSurface = DEFAULT_SEARCH_SURFACE;
    var searchShadow = DEFAULT_SEARCH_SHADOW;
    var searchWidth = DEFAULT_SEARCH_WIDTH;
    var searchBackgroundOpacity = DEFAULT_SEARCH_BG_OPACITY;
    var searchBlur = DEFAULT_SEARCH_BLUR;
    var searchPlaceholder = '';
    var searchEnterBehavior = DEFAULT_SEARCH_ENTER_BEHAVIOR;
    var searchHistoryLimit = DEFAULT_SEARCH_HISTORY_LIMIT;
    var overlayOpacity = DEFAULT_OVERLAY_OPACITY;
    var searchRadius = DEFAULT_SEARCH_RADIUS;
    var panelOpacity = DEFAULT_PANEL_OPACITY;
    var wallpaperFit = DEFAULT_WALLPAPER_FIT;
    var wallpaperPosition = DEFAULT_WALLPAPER_POSITION;
    var wallpaperBlur = DEFAULT_WALLPAPER_BLUR;
    var wallpaperVignette = DEFAULT_WALLPAPER_VIGNETTE;
    var uiRadius = DEFAULT_UI_RADIUS;
    var fontScale = DEFAULT_FONT_SCALE;
    var accentMode = DEFAULT_ACCENT_MODE;
    var accentColor = DEFAULT_ACCENT_COLOR;
    var reducedMotion = false;
    var themeEnabled = false;
    var engineIndex = 0;
    var langBtns = null;
    var activeTab = 'appearance';
    var isRecording = null;
    var isHydratingSettings = false;
    var _keepGalleryOpen = false;
    var modalOpenFrame = 0;
    var wallpaperBlurSaveTimer = null;
    var wallpaperBlurPreviewToken = 0;
    var activeCustomSelect = null;
    var fullInitialized = false;
    var useBootstrapShell = false;
    var uploadGalleryWheelAt = 0;
    var wallpaperDraft = null;
    var wallpaperDraftOriginal = '';
    var wallpaperDraftApiTestResult = null;
    var wallpaperDraftRssTestResult = null;
    var wallpaperDraftFolderMount = null;
    var wallpaperDraftOpenSource = '';
    var wallpaperDraftApiOpenType = '';
    var wallpaperWorkOrder = null;
    var wallpaperWorkOrderStatus = { state: 'Clean', valid: false, reasonKey: 'wallpaperApplyNoChanges', message: '' };
    var rssNoticeTimer = null;
    var rssNoticeToken = 0;
    var apiNoticeTimer = null;
    var apiNoticeToken = 0;
    var FOLDER_GALLERY_LIMIT = 12;
    var FOLDER_THUMB_LOOKAHEAD = 12;
    var UPLOAD_IMAGE_LIMIT = 12;
    var UPLOAD_VIDEO_MAX_BYTES = 80 * 1024 * 1024;
    var UPLOAD_VIDEO_MAX_SECONDS = 60;

    // ================================================================
    // 语言面板
    // ================================================================
    function updateLangUI() {
        var nextTitle = t('extName');
        if (document.title !== nextTitle) document.title = nextTitle;
        var searchInput = document.getElementById('searchInput');
        if (searchInput) {
            var ui = D.loadUI();
            var placeholder = ui.search && ui.search.placeholder ? ui.search.placeholder : t('searchPlaceholder');
            searchInput.placeholder = placeholder;
        }
        if (engineIcon) engineIcon.setAttribute('title', t('engineTitle'));
        if (engineIcon) engineIcon.setAttribute('aria-label', t('engineTitle'));
        langBtn.setAttribute('title', t('langTitle'));
        langBtn.setAttribute('aria-label', t('langTitle'));
        settingsBtn.setAttribute('title', t('settingsTitle'));
        settingsBtn.setAttribute('aria-label', t('settingsTitle'));
        if (typeof refreshUploadControls === 'function') refreshUploadControls();
        refreshGallery();
        document.querySelectorAll('[data-i18n]').forEach(function (el) {
            var key = el.getAttribute('data-i18n');
            if (el.tagName === 'INPUT' && el.type === 'text') return;
            el.textContent = t(key);
        });
        if (!useBootstrapShell) renderLangPanel();
    }

    function renderLangPanel() {
        var titleEl = document.querySelector('.lang-title');
        if (titleEl) titleEl.textContent = t('langPanelTitle');
        if (!langBtns) {
            langBtns = {};
            LanguageList.forEach(function (lang) {
                var btn = document.createElement('button');
                btn.className = 'lang-option';
                btn.addEventListener('click', function () {
                    if (lang.code === currentLang) {
                        closeLangPanel();
                        return;
                    }
                    btn.disabled = true;
                    loadLocale(lang.code).then(function (loadedLang) {
                        D.saveLocale(loadedLang);
                        currentLang = loadedLang;
                        updateLangUI();
                        if (window.onLangChange) window.onLangChange(loadedLang);
                        closeLangPanel();
                    }).catch(function () {
                        D.saveLocale('en');
                        currentLang = 'en';
                        updateLangUI();
                        closeLangPanel();
                    }).then(function () {
                        btn.disabled = false;
                    });
                });
                langOptions.appendChild(btn);
                langBtns[lang.code] = btn;
            });
        }
        LanguageList.forEach(function (lang) {
            langBtns[lang.code].textContent = lang.name;
            langBtns[lang.code].classList.toggle('current', lang.code === currentLang);
        });
    }

    // ================================================================
    // L1 面板 开/关
    // ================================================================
    function openSettings() {
        if (isLangPanelOpen) closeLangPanel();
        if (isOpen) return;
        isOpen = true;
        settingsPanel.classList.add('active');
        settingsBtn.classList.add('panel-open');
        clearTimeout(cornerHideTimer);
        refreshGallery();
    }

    function hasLocalUploadWallpapers() {
        return D && D.loadOrder && (D.loadOrder().length > 0 || hasUploadVideo());
    }

    function uploadVideoId() {
        return D && D.uploadVideoId ? D.uploadVideoId() : 'upload_video';
    }

    function uploadConfig() {
        return D && D.loadUploadConfig ? D.loadUploadConfig() : { activeMedia: 'image', galleryView: 'image' };
    }

    function uploadGalleryView() {
        return uploadConfig().galleryView === 'video' ? 'video' : 'image';
    }

    function hasUploadVideo() {
        var state = D && D.loadUploadState ? D.loadUploadState() : {};
        return state.videoId === uploadVideoId();
    }

    function prepareUploadInput() {
        if (!fileInput) return;
        if (uploadGalleryView() === 'video') {
            fileInput.accept = 'video/mp4';
            fileInput.multiple = false;
            return;
        }
        fileInput.accept = 'image/*';
        fileInput.multiple = true;
    }

    function shouldPromptEmptyLocalUpload() {
        if (!D || !D.getActiveSource || !D.compatMode) return false;
        return currentMode === 'local' &&
            D.compatMode(D.getActiveSource()) === 'local' &&
            !hasLocalUploadWallpapers();
    }

    function maybePromptEmptyLocalUpload(options) {
        if (options && options.skipEmptyLocalPicker) return;
        if (!fileInput || !shouldPromptEmptyLocalUpload()) return;
        _keepGalleryOpen = false;
        prepareUploadInput();
        fileInput.click();
    }

    function closeSettings(options) {
        if (!isOpen) return;
        isOpen = false;
        settingsPanel.classList.remove('active');
        settingsBtn.classList.remove('panel-open');
        revokeGalleryUrls();
        maybePromptEmptyLocalUpload(options);
    }

    function toggleSettings() {
        isOpen ? closeSettings() : openSettings();
    }

    // ================================================================
    // 语言面板 开/关
    // ================================================================
    function openLangPanel() {
        if (isOpen) closeSettings({ skipEmptyLocalPicker: true });
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

    function closeAll() { closeSettings(); closeLangPanel(); closeModal(); }

    function pickUpload() {
        _keepGalleryOpen = false;
        prepareUploadInput();
        if (fileInput) fileInput.click();
    }

    // ================================================================
    // L2 模态窗口 开/关
    // ================================================================
    function animateModalOpen() {
        var token = ++modalOpenFrame;
        modalOverlay.classList.add('preparing');
        requestAnimationFrame(function () {
            if (!isModalOpen || token !== modalOpenFrame) return;
            modalOverlay.classList.add('active');
            modalOverlay.classList.remove('preparing');
        });
    }

    function openModal() {
        if (isModalOpen) return;
        if (isOpen) closeSettings({ skipEmptyLocalPicker: true });
        isModalOpen = true;
        renderTabContent();
        animateModalOpen();
    }

    function closeModal(options) {
        if (!isModalOpen) return;
        isModalOpen = false;
        closeCustomSelects();
        clearPermissionsStatus();
        modalOpenFrame++;
        modalOverlay.classList.remove('active', 'preparing');
        clearWallpaperDraft();
        if (_tabPages.wallpaper) {
            _tabPages.wallpaper.remove();
            delete _tabPages.wallpaper;
            _tabEventBound.wallpaper = false;
        }
        maybePromptEmptyLocalUpload(options);
    }

    // ================================================================
    // 模态窗口：分页渲染
    // ================================================================
    // Build only the visible tab first so the modal can animate immediately.
    var _tabPages = {};
    var _tabEventBound = {};
    var _tabScrollPositions = {};

    function tabScrollElement(tabName) {
        var page = _tabPages[tabName];
        if (!page) return null;
        return page.querySelector('.wallpaper-tab-body') ||
            page.querySelector('.modal-page-body') ||
            page.querySelector('[data-scroll-container]') ||
            page;
    }

    function saveTabScroll(tabName) {
        var el = tabScrollElement(tabName);
        if (el) _tabScrollPositions[tabName] = el.scrollTop || 0;
    }

    function restoreTabScroll(tabName) {
        var y = _tabScrollPositions[tabName];
        if (typeof y !== 'number') return;
        requestAnimationFrame(function () {
            var el = tabScrollElement(tabName);
            if (el) el.scrollTop = y;
        });
    }

    function renderTabContent() {
        ensureTabPage(activeTab);

        Object.keys(_tabPages).forEach(function (tabName) {
            var page = _tabPages[tabName];
            page.hidden = tabName !== activeTab;
            page.classList.toggle('active', tabName === activeTab);
        });

        if (activeTab === 'appearance' && !_tabEventBound.appearance) { bindAppearanceEvents(); _tabEventBound.appearance = true; }
        if (activeTab === 'search' && !_tabEventBound.search) { bindSearchEvents(); _tabEventBound.search = true; }
        if (activeTab === 'wallpaper' && !_tabEventBound.wallpaper) { bindWallpaperEvents(); _tabEventBound.wallpaper = true; }
        if (activeTab === 'shortcuts' && !_tabEventBound.shortcuts) { bindShortcutsEvents(); _tabEventBound.shortcuts = true; }
        if (activeTab === 'permissions' && !_tabEventBound.permissions) { bindPermissionsEvents(); _tabEventBound.permissions = true; }
        if (activeTab === 'data' && !_tabEventBound.data) { bindDataEvents(); _tabEventBound.data = true; }
        if (activeTab === 'restore' && !_tabEventBound.restore) { bindRestoreEvents(); _tabEventBound.restore = true; }
        restoreTabScroll(activeTab);
    }

    function ensureTabPage(tabName) {
        if (_tabPages[tabName]) return _tabPages[tabName];

        var builders = {
            appearance: buildAppearanceHTML,
            search: buildSearchHTML,
            wallpaper: buildWallpaperHTML,
            shortcuts: buildShortcutsHTML,
            permissions: buildPermissionsHTML,
            data: buildDataHTML,
            restore: buildRestoreHTML,
            about: buildAboutHTML
        };
        var builder = builders[tabName] || builders.appearance;
        var page = document.createElement('div');
        page.className = 'tab-page';
        page.dataset.tab = tabName;
        page.hidden = true;
        page.innerHTML = builder();
        enhanceModalSelects(page);
        modalContent.appendChild(page);
        _tabPages[tabName] = page;
        return page;
    }

    function refreshGeneratedTabPages() {
        if (!modalContent) return;
        closeCustomSelects();
        saveTabScroll(activeTab);
        Object.keys(_tabPages).forEach(function (tabName) {
            _tabPages[tabName].remove();
            delete _tabPages[tabName];
            _tabEventBound[tabName] = false;
        });
        if (isModalOpen) renderTabContent();
    }

    function getSourceLabel(source) {
        var map = {
            bing:tr('sourceBing'),
            upload:tr('sourceUpload'),
            folder:tr('sourceFolder'),
            rss:tr('sourceRss'),
            api:tr('sourceApi')};
        return map[source] || source;
    }

    function tr(key) {
        var value = t(key);
        return value && value !== key ? value : key;
    }

    function isHttpUrl(value) {
        return /^http:\/\//i.test(String(value || '').trim());
    }

    function httpsOnlyMessage(fallbackKey, value) {
        if (!isHttpUrl(value)) return tr(fallbackKey);
        if (/^zh/i.test(currentLang || '')) return '不支持 http:// 链接，只能使用 https://。';
        return 'http:// links are not supported. Use https:// only.';
    }

    function rssDisplayText(key) {
        var zh = /^zh/i.test(currentLang || '');
        var map = {
            displayMode: zh ? 'RSS 显示方式' : 'RSS Display',
            latest: zh ? '固定最新一张' : 'Fixed latest image',
            cycle: zh ? '循环显示' : 'Cycle cached images'
        };
        return map[key] || key;
    }

    function loadShortcutSettings() {
        return D.loadShortcutsModel().settings || {};
    }

    function updateShortcutSettings(mutator) {
        var model = D.loadShortcutsModel();
        if (!model.settings) model.settings = {};
        mutator(model.settings);
        D.saveShortcutsModel(model);
    }

    function loadPaletteHotkey() {
        return loadShortcutSettings().primaryHotkey || 'ctrl+k';
    }

    function savePaletteHotkey(key) {
        updateShortcutSettings(function (settings) { settings.primaryHotkey = key; });
    }

    function loadPaletteHiddenHotkey() {
        return loadShortcutSettings().hiddenHotkey || 'ctrl+shift+k';
    }

    function savePaletteHiddenHotkey(key) {
        updateShortcutSettings(function (settings) { settings.hiddenHotkey = key; });
    }

    function loadPaletteRecommend() {
        return loadShortcutSettings().recommendEnabled !== false;
    }

    function savePaletteRecommend(value) {
        updateShortcutSettings(function (settings) { settings.recommendEnabled = !!value; });
    }

    function loadPalettePlacement() {
        return loadShortcutSettings().palettePlacement === 'fixed' ? 'fixed' : 'follow';
    }

    function savePalettePlacement(value) {
        updateShortcutSettings(function (settings) {
            settings.palettePlacement = value === 'fixed' ? 'fixed' : 'follow';
        });
    }

    function loadPaletteSkin() {
        var skin = loadShortcutSettings().paletteSkin;
        return skin === 'terminal' || skin === 'shell' || skin === 'command-terminal' ? skin : 'default';
    }

    function savePaletteSkin(value) {
        updateShortcutSettings(function (settings) {
            settings.paletteSkin = value === 'terminal' || value === 'shell' || value === 'command-terminal' ? value : 'default';
        });
    }

    function buildPageShell(title, subtitle, body) {
        return '<div class="settings-page-shell">' +
            '<div class="settings-page-header">' +
            '<h2>' + title + '</h2>' +
            '<p>' + subtitle + '</p>' +
            '</div>' +
            '<div class="settings-page-body">' +
            body +
            '</div>' +
            '</div>';
    }

    function setControlValue(id, value) {
        var el = document.getElementById(id);
        if (!el) return;
        if (el.type === 'checkbox') el.checked = !!value;
        else el.value = value;
    }

    function syncSearchControls() {
        setControlValue('modalSearchMode', searchMode);
        setControlValue('modalSearchHistoryLimit', searchHistoryLimit);
        setControlValue('modalSearchPos', searchPosition);
        setControlValue('modalSearchIconPosition', searchIconPosition);
        setControlValue('modalSearchIconVisibility', searchIconVisibility);
        setControlValue('modalSearchSurface', searchSurface);
        setControlValue('modalSearchShadow', searchShadow);
        setControlValue('modalSearchRadius', searchRadius);
        setControlValue('modalSearchPlaceholder', searchPlaceholder);
        setControlValue('modalSearchEnterBehavior', searchEnterBehavior);
        setControlValue('modalSearchWidthRange', searchWidth);
        setControlValue('modalSearchWidthNum', searchWidth);
        setControlValue('modalSearchBgRange', searchBackgroundOpacity);
        setControlValue('modalSearchBgNum', searchBackgroundOpacity);
        setControlValue('modalSearchBlurRange', searchBlur);
        setControlValue('modalSearchBlurNum', searchBlur);
        setControlValue('modalEngineSel', currentEngine);
        syncCustomSelects(modalContent);
    }

    function syncAppearanceControls() {
        setControlValue('modalOpacityRange', currentOpacity);
        setControlValue('modalOpacityNum', currentOpacity);
        setControlValue('modalPanelOpacityRange', panelOpacity);
        setControlValue('modalPanelOpacityNum', panelOpacity);
        setControlValue('modalThemeEnabled', themeEnabled);
        setControlValue('modalUiRadius', uiRadius);
        setControlValue('modalFontScale', fontScale);
        setControlValue('modalAccentMode', accentMode);
        setControlValue('modalAccentColor', accentColor);
        var color = document.getElementById('modalAccentColor');
        if (color) color.hidden = accentMode !== 'custom';
        setControlValue('modalReducedMotion', reducedMotion);
        syncCustomSelects(modalContent);
    }

    function syncWallpaperControls() {
        setControlValue('modalWallpaperFit', wallpaperFit);
        setControlValue('modalWallpaperPosition', wallpaperPosition);
        setControlValue('modalWallpaperBlurRange', wallpaperBlur);
        setControlValue('modalWallpaperBlurNum', wallpaperBlur);
        setControlValue('modalWallpaperVignette', wallpaperVignette);
        setControlValue('modalOverlayRange', overlayOpacity);
        setControlValue('modalOverlayNum', overlayOpacity);
        syncCustomSelects(modalContent);
    }

    function syncShortcutsControls() {
        setControlValue('hkNormal', loadPaletteHotkey());
        setControlValue('hkHidden', loadPaletteHiddenHotkey());
        setControlValue('cpPlacement', loadPalettePlacement());
        setControlValue('cpSkin', loadPaletteSkin());
        setControlValue('cpRecommend', loadPaletteRecommend());
        syncCustomSelects(modalContent);
    }

    function modalCopy(key) {
        var lang = I18N[currentLang] || {};
        var en = I18N.en || {};
        return lang[key] || en[key] || key;
    }

    function settingItem(label, desc, control, extraClass, note) {
        return '<div class="setting-item' + (extraClass ? ' ' + extraClass : '') + '">' +
            '<div class="setting-copy">' +
            '<span class="setting-label">' + label + '</span>' +
            '<span class="setting-desc">' + desc + '</span>' +
            (note || '') +
            '</div>' +
            '<div class="setting-control">' + control + '</div>' +
            '</div>';
    }

    function settingGroup(title, body) {
        return '<section class="setting-group">' +
            '<h3 class="setting-group-title">' + title + '</h3>' +
            '<div class="setting-stack">' + body + '</div>' +
            '</section>';
    }

    function escapeHtml(value) {
        return String(value || '').replace(/[&<>"']/g, function (c) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
        });
    }

    function getSelectLabel(select) {
        var option = select.options[select.selectedIndex] || select.options[0];
        return option ? option.textContent : '';
    }

    function syncCustomSelect(custom) {
        if (!custom) return;
        var select = custom.querySelector('select');
        var value = custom.querySelector('.custom-select-value');
        var trigger = custom.querySelector('.custom-select-trigger');
        var disabled = !!(select && select.disabled);
        if (value && select) value.textContent = getSelectLabel(select);
        custom.classList.toggle('disabled', disabled);
        if (trigger) {
            trigger.disabled = disabled;
            trigger.setAttribute('aria-disabled', disabled ? 'true' : 'false');
        }
        if (disabled && custom.dataset.open === 'true') custom.dataset.open = 'false';
        custom.querySelectorAll('.custom-select-option').forEach(function (option) {
            var selected = select && option.dataset.value === select.value;
            option.classList.toggle('selected', selected);
            option.setAttribute('aria-selected', selected ? 'true' : 'false');
        });
    }

    function syncCustomSelects(root) {
        (root || modalContent).querySelectorAll('.custom-select').forEach(syncCustomSelect);
    }

    function closeCustomSelects(except) {
        if (!modalContent) return;
        modalContent.querySelectorAll('.custom-select[data-open="true"]').forEach(function (custom) {
            if (custom === except) return;
            custom.dataset.open = 'false';
            custom.querySelector('.custom-select-trigger').setAttribute('aria-expanded', 'false');
        });
        if (!except) activeCustomSelect = null;
    }

    function focusCustomSelectOption(custom, delta) {
        var options = Array.prototype.slice.call(custom.querySelectorAll('.custom-select-option:not([disabled])'));
        if (!options.length) return;
        var current = document.activeElement && document.activeElement.classList.contains('custom-select-option')
            ? options.indexOf(document.activeElement)
            : options.findIndex(function (option) { return option.classList.contains('selected'); });
        var next = current < 0 ? 0 : (current + delta + options.length) % options.length;
        options[next].focus();
    }

    function openCustomSelect(custom) {
        if (!custom) return;
        closeCustomSelects(custom);
        syncCustomSelect(custom);
        var menu = custom.querySelector('.custom-select-menu');
        custom.classList.remove('drop-up');
        custom.dataset.open = 'true';
        custom.querySelector('.custom-select-trigger').setAttribute('aria-expanded', 'true');
        activeCustomSelect = custom;
        if (menu) {
            var rect = menu.getBoundingClientRect();
            var customRect = custom.getBoundingClientRect();
            var roomBelow = window.innerHeight - customRect.bottom;
            var roomAbove = customRect.top;
            if (roomBelow < Math.min(rect.height, 220) && roomAbove > roomBelow) {
                custom.classList.add('drop-up');
            }
        }
    }

    function chooseCustomSelectOption(custom, option) {
        var select = custom.querySelector('select');
        if (!select || !option || option.disabled) return;
        if (select.value !== option.dataset.value) {
            select.value = option.dataset.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
        }
        syncCustomSelect(custom);
        closeCustomSelects();
        custom.querySelector('.custom-select-trigger').focus();
    }

    function enhanceModalSelects(root) {
        if (!root) return;
        root.querySelectorAll('.setting-item select:not([data-custom-select-ready])').forEach(function (select) {
            var wrapper = document.createElement('div');
            wrapper.className = 'custom-select';
            select.parentNode.insertBefore(wrapper, select);
            wrapper.appendChild(select);

            select.dataset.customSelectReady = 'true';
            select.classList.add('custom-select-native');
            select.setAttribute('tabindex', '-1');
            select.setAttribute('aria-hidden', 'true');

            var trigger = document.createElement('button');
            trigger.type = 'button';
            trigger.className = 'custom-select-trigger';
            trigger.setAttribute('aria-haspopup', 'listbox');
            trigger.setAttribute('aria-expanded', 'false');
            trigger.innerHTML = '<span class="custom-select-value"></span><span class="custom-select-chevron"></span>';

            var menu = document.createElement('div');
            menu.className = 'custom-select-menu';
            menu.setAttribute('role', 'listbox');

            Array.prototype.forEach.call(select.options, function (opt) {
                var option = document.createElement('button');
                option.type = 'button';
                option.className = 'custom-select-option';
                option.dataset.value = opt.value;
                option.textContent = opt.textContent;
                option.setAttribute('role', 'option');
                if (opt.disabled) option.disabled = true;
                option.addEventListener('click', function () {
                    chooseCustomSelectOption(wrapper, option);
                });
                option.addEventListener('keydown', function (e) {
                    if (e.key === 'ArrowDown') { e.preventDefault(); focusCustomSelectOption(wrapper, 1); }
                    if (e.key === 'ArrowUp') { e.preventDefault(); focusCustomSelectOption(wrapper, -1); }
                    if (e.key === 'Escape') { e.preventDefault(); closeCustomSelects(); trigger.focus(); }
                });
                menu.appendChild(option);
            });

            trigger.addEventListener('click', function () {
                if (select.disabled) return;
                if (wrapper.dataset.open === 'true') closeCustomSelects();
                else openCustomSelect(wrapper);
            });
            trigger.addEventListener('keydown', function (e) {
                if (select.disabled) return;
                if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    openCustomSelect(wrapper);
                    focusCustomSelectOption(wrapper, e.key === 'ArrowDown' ? 1 : 0);
                }
                if (e.key === 'Escape') {
                    e.preventDefault();
                    closeCustomSelects();
                }
            });
            select.addEventListener('change', function () { syncCustomSelect(wrapper); });

            wrapper.appendChild(trigger);
            wrapper.appendChild(menu);
            syncCustomSelect(wrapper);
        });
    }

    function clonePlain(value) {
        return JSON.parse(JSON.stringify(value || {}));
    }

    function openWallpaperDraft() {
        wallpaperDraft = clonePlain(D.loadWallpaper());
        wallpaperDraft.providers.rss.config = clonePlain(D.loadRssConfig());
        wallpaperDraft.providers.api.config = clonePlain(D.loadApiConfig());
        wallpaperDraftOriginal = JSON.stringify(wallpaperDraft);
        wallpaperDraftApiTestResult = null;
        wallpaperDraftRssTestResult = null;
        wallpaperDraftFolderMount = null;
        wallpaperDraftOpenSource = normalizeDraftSource(wallpaperDraft.activeSource);
        wallpaperDraftApiOpenType = wallpaperDraft.providers.api.config.apiType === 'json' ? 'json' : 'image';
        return wallpaperDraft;
    }

    function providerConfigForSource(model, source) {
        source = normalizeDraftSource(source);
        if (!model || !model.providers || !model.providers[source]) return {};
        return clonePlain(model.providers[source].config || {});
    }

    function createWallpaperWorkOrder(source) {
        var saved = D.loadWallpaper();
        var savedSource = normalizeDraftSource(saved.activeSource);
        var pendingSource = normalizeDraftSource(source || savedSource);
        var pendingConfig = providerConfigForSource(saved, pendingSource);
        var baselineConfig = providerConfigForSource(saved, savedSource);
        wallpaperWorkOrder = {
            pendingSource: pendingSource,
            pendingConfig: clonePlain(pendingConfig),
            baseline: {
                pendingSource: savedSource,
                pendingConfig: clonePlain(baselineConfig)
            },
            health: { state: 'Clean', reasonKey: 'wallpaperApplyNoChanges', message: '' }
        };
        return wallpaperWorkOrder;
    }

    function currentWallpaperWorkOrder() {
        if (!wallpaperWorkOrder) return createWallpaperWorkOrder(D.getActiveSource ? D.getActiveSource() : 'bing');
        return wallpaperWorkOrder;
    }

    function pendingConfigForSource(source) {
        var workOrder = currentWallpaperWorkOrder();
        source = normalizeDraftSource(source);
        if (normalizeDraftSource(workOrder.pendingSource) === source) return workOrder.pendingConfig;
        return providerConfigForSource(D.loadWallpaper(), source);
    }

    function pendingConfigReasonKey(source) {
        source = normalizeDraftSource(source);
        var keys = {
            rss: 'wallpaperStatusTestRss',
            api: 'wallpaperStatusTestApi',
            wallhaven: 'wallpaperStatusTestWallhaven',
            folder: 'wallpaperStatusFolderMissing'
        };
        return keys[source] || 'wallpaperApplyReady';
    }

    function updatePendingBaselineConfig(source, mutator) {
        var workOrder = currentWallpaperWorkOrder();
        source = normalizeDraftSource(source);
        if (normalizeDraftSource(workOrder.pendingSource) !== source) return false;
        if (!workOrder.baseline) return false;
        if (normalizeDraftSource(workOrder.baseline.pendingSource) !== source) return false;
        if (!workOrder.baseline.pendingConfig) workOrder.baseline.pendingConfig = {};
        mutator(workOrder.baseline.pendingConfig);
        refreshWallpaperApplyFooter();
        return true;
    }

    function updatePendingSourceConfig(source, mutator) {
        var workOrder = currentWallpaperWorkOrder();
        source = normalizeDraftSource(source);
        if (normalizeDraftSource(workOrder.pendingSource) !== source) return false;
        mutator(workOrder.pendingConfig);
        workOrder.health = { state: 'Dirty', reasonKey: pendingConfigReasonKey(source), message: '' };
        refreshWallpaperApplyFooter();
        return true;
    }

    function setPendingSourceHealth(source, health) {
        var workOrder = currentWallpaperWorkOrder();
        source = normalizeDraftSource(source);
        if (normalizeDraftSource(workOrder.pendingSource) !== source) return false;
        workOrder.health = {
            state: health.state || 'Dirty',
            reasonKey: health.reasonKey || pendingConfigReasonKey(source),
            message: health.message || ''
        };
        refreshWallpaperApplyFooter();
        return true;
    }

    function syncPendingRssSourceTest(sourceId, test) {
        var updated = updatePendingSourceConfig('rss', function (pending) {
            (pending.sources || []).forEach(function (item) {
                if (item && item.id === sourceId) item.test = clonePlain(test);
            });
        });
        if (updated) currentWallpaperDraft().providers.rss.config = clonePlain(currentWallpaperWorkOrder().pendingConfig);
        return updated;
    }

    function syncPendingApiSourceTest(apiType, sourceId, test) {
        var updated = updatePendingSourceConfig('api', function (pending) {
            var list = apiType === 'json' ? pending.jsonSources : pending.imageSources;
            (list || []).forEach(function (item) {
                if (item && item.id === sourceId) item.test = clonePlain(test);
            });
        });
        if (updated) currentWallpaperDraft().providers.api.config = clonePlain(currentWallpaperWorkOrder().pendingConfig);
        return updated;
    }

    function switchWallpaperWorkOrderSource(source) {
        return createWallpaperWorkOrder(normalizeDraftSource(source));
    }

    function refreshWallpaperWorkOrderBaselineOnly() {
        if (!wallpaperWorkOrder) return;
        var saved = D.loadWallpaper();
        var source = normalizeDraftSource(saved.activeSource);
        wallpaperWorkOrder.baseline = {
            pendingSource: source,
            pendingConfig: providerConfigForSource(saved, source)
        };
        validateWallpaperWorkOrder();
    }

    function validateWallpaperWorkOrder() {
        var Apply = window.WallpaperApply;
        var workOrder = currentWallpaperWorkOrder();
        wallpaperWorkOrderStatus = Apply && Apply.validateWorkOrder ?
            Apply.validateWorkOrder(workOrder) :
            { state: 'Blocked', valid: false, reasonKey: 'wallpaperApplyFailed', message: '' };
        if (workOrder.health && workOrder.health.state === 'Applying') {
            wallpaperWorkOrderStatus = {
                state: 'Applying',
                valid: false,
                reasonKey: workOrder.health.reasonKey || 'wallpaperApplyReady',
                message: workOrder.health.message || (tr('wallpaperApply') + '...')
            };
        }
        if (workOrder.health && workOrder.health.state === 'Error') {
            wallpaperWorkOrderStatus = {
                state: 'Blocked',
                valid: false,
                reasonKey: workOrder.health.reasonKey || 'wallpaperStatusTestFailed',
                message: workOrder.health.message || ''
            };
        }
        return wallpaperWorkOrderStatus;
    }

    function refreshWallpaperWorkOrderBaseline() {
        if (!wallpaperWorkOrder) return;
        var saved = D.loadWallpaper();
        var source = normalizeDraftSource(saved.activeSource);
        var config = providerConfigForSource(saved, source);
        wallpaperWorkOrder.pendingSource = source;
        wallpaperWorkOrder.pendingConfig = clonePlain(config);
        wallpaperWorkOrder.baseline = {
            pendingSource: source,
            pendingConfig: clonePlain(config)
        };
        wallpaperWorkOrder.health = { state: 'Clean', reasonKey: 'wallpaperApplyNoChanges', message: '' };
        validateWallpaperWorkOrder();
    }

    function clearWallpaperDraft() {
        wallpaperDraft = null;
        wallpaperDraftOriginal = '';
        wallpaperDraftApiTestResult = null;
        wallpaperDraftRssTestResult = null;
        wallpaperDraftFolderMount = null;
        wallpaperDraftOpenSource = '';
        wallpaperDraftApiOpenType = '';
        wallpaperWorkOrder = null;
        wallpaperWorkOrderStatus = { state: 'Clean', valid: false, reasonKey: 'wallpaperApplyNoChanges', message: '' };
    }

    function currentWallpaperDraft() {
        if (!wallpaperDraft) return openWallpaperDraft();
        return wallpaperDraft;
    }

    function draftActiveSource() {
        var source = currentWallpaperDraft().activeSource;
        return D.compatMode ? D.compatMode(source) : source;
    }

    function draftOpenSource() {
        var source = normalizeDraftSource(wallpaperDraftOpenSource || draftActiveSource());
        return source === 'local' ? 'upload' : source;
    }

    function sourceListHasId(sources, id) {
        if (!id) return false;
        return (sources || []).some(function (source) { return source && source.id === id; });
    }

    function activeRssSourceId(config) {
        config = config || {};
        if (sourceListHasId(config.sources, config.activeSourceId)) return config.activeSourceId;
        return config.sources && config.sources[0] ? config.sources[0].id : '';
    }

    function activeApiSourceIdentity(config) {
        config = config || {};
        var apiType = config.apiType === 'json' ? 'json' : 'image';
        var sources = apiType === 'json' ? config.jsonSources : config.imageSources;
        var activeId = apiType === 'json' ? config.activeJsonSourceId : config.activeImageSourceId;
        if (!sourceListHasId(sources, activeId) && sources && sources[0]) activeId = sources[0].id;
        return { apiType: apiType, sourceId: activeId || '' };
    }


    function wallpaperStatusText(status) {
        status = status || validateWallpaperWorkOrder();
        if (status.message) return status.message;
        return tr(status.reasonKey || 'wallpaperApplyNoChanges');
    }

    function wallpaperApplyFooterHTML() {
        var validation = validateWallpaperWorkOrder();
        return '<div class="wallpaper-apply-footer">' +
            '<div class="wallpaper-apply-status" id="wallpaperApplyStatus">' + escapeHtml(wallpaperStatusText(validation)) + '</div>' +
            '<button id="wallpaperApplyBtn" class="primary-action" type="button"' + (validation.valid ? '' : ' disabled') + '>' + tr('wallpaperApply') + '</button>' +
            '</div>';
    }

    function refreshWallpaperApplyFooter() {
        var status = document.getElementById('wallpaperApplyStatus');
        var button = document.getElementById('wallpaperApplyBtn');
        if (!status || !button) return;
        var validation = validateWallpaperWorkOrder();
        status.textContent = wallpaperStatusText(validation);
        button.disabled = !validation.valid;
    }

    function normalizeDraftSource(source) {
        return D.normalizeSource ? D.normalizeSource(source) : (source === 'local' ? 'upload' : (source || 'bing'));
    }

    function selectedWorkOrderApiSource(config) {
        config = config || {};
        var apiType = config.apiType === 'json' ? 'json' : 'image';
        var list = apiType === 'json' ? (config.jsonSources || []) : (config.imageSources || []);
        var activeId = apiType === 'json' ? config.activeJsonSourceId : config.activeImageSourceId;
        return list.filter(function (source) { return source && source.id === activeId; })[0] || list[0] || null;
    }

    function prepareFolderWorkOrder(workOrder) {
        var mount = wallpaperDraftFolderMount;
        if (!mount) return Promise.resolve(false);
        var folderId = mount.firstId;
        var initialBag = [mount.firstName].concat(mount.shuffleBag || []);
        var thumbLookahead = buildFolderPreviewWindow(mount.files, '', initialBag, FOLDER_THUMB_LOOKAHEAD);
        var previewWindow = mount.previewWindow || thumbLookahead.slice(0, FOLDER_GALLERY_LIMIT);
        return D.saveFolderHandle(mount.handle).then(function () {
            return D.saveFolderFiles(mount.files);
        }).then(function () {
            var thumbs = D.loadThumbs();
            var meta = D.loadMeta();
            thumbs[folderId] = mount.thumb;
            meta[folderId] = {
                source: 'folder',
                name: mount.firstName,
                size: mount.firstRecord && mount.firstRecord.size || 0,
                lastModified: mount.firstRecord && mount.firstRecord.lastModified || 0,
                pathLabel: mount.pathLabel || '',
                fetchedAt: Date.now()
            };
            D.saveThumbs(thumbs);
            D.saveMeta(meta);
            D.savePreview(mount.preview || mount.thumb);
            if (wallpaperBlur >= 5 && mount.preview && D.saveBlurThumb) D.saveBlurThumb(folderId, wallpaperBlur, mount.preview);
            pruneFolderThumbs(thumbLookahead);
            return prewarmFolderThumbs(mount.handle, thumbLookahead, wallpaperBlur);
        }).then(function () {
            return prewarmFolderLightCache(mount.handle, thumbLookahead);
        }).then(function () {
            var now = Date.now();
            var model = D.loadWallpaper();
            if (!model.providers) model.providers = {};
            if (!model.providers.folder) model.providers.folder = { config: {}, state: {} };
            pruneFolderThumbs(thumbLookahead);
            pruneFolderLightCache(thumbLookahead);
            model.providers.folder.config = D.normalizeFolderConfig({
                pathLabel: mount.pathLabel || '',
                strategy: 'shuffle'
            });
            model.providers.folder.state = D.normalizeFolderState({
                status: 'ready',
                indexedCount: mount.files.length,
                completed: mount.completed === true,
                lastScanAt: now,
                lastError: '',
                shuffleBag: initialBag,
                previewWindow: previewWindow,
                permissionStatus: 'granted',
                usingLightCache: false,
                lightCacheCount: previewWindow.length,
                lastPermissionCheckAt: now,
                currentName: ''
            });
            model.cache = model.cache || {};
            model.cache.order = ['bing', folderId];
            model.cache.index = 1;
            model.cache.meta = D.loadMeta();
            workOrder.pendingConfig = clonePlain(model.providers.folder.config);
            if (wallpaperDraft && wallpaperDraft.providers && wallpaperDraft.providers.folder) {
                wallpaperDraft.providers.folder.config = clonePlain(model.providers.folder.config);
                wallpaperDraft.providers.folder.state = clonePlain(model.providers.folder.state);
                wallpaperDraft.cache = clonePlain(model.cache);
            }
            D.saveWallpaper(model);
            return true;
        });
    }

    function prepareApiWorkOrder(workOrder) {
        if (!wallpaperDraftApiTestResult || !F || !F.cacheApiResult) return Promise.resolve(false);
        var config = workOrder.pendingConfig || {};
        var apiType = config.apiType === 'json' ? 'json' : 'image';
        var apiSource = selectedWorkOrderApiSource(config);
        if (!apiSource) return Promise.resolve(false);
        apiSource.test = {
            status: 'passed',
            fieldHash: D.apiFieldHash(apiSource, apiType),
            testedAt: Date.now(),
            imageUrl: wallpaperDraftApiTestResult.imageUrl || '',
            error: ''
        };
        return F.cacheApiResult(apiSource, apiType, wallpaperDraftApiTestResult).then(function () {
            if (wallpaperDraft && wallpaperDraft.providers && wallpaperDraft.providers.api) {
                wallpaperDraft.providers.api.config = clonePlain(workOrder.pendingConfig);
            }
            return true;
        });
    }

    function prepareWallpaperWorkOrder(workOrder) {
        var source = normalizeDraftSource(workOrder && workOrder.pendingSource);
        if (source === 'folder') return prepareFolderWorkOrder(workOrder);
        if (source === 'api') return prepareApiWorkOrder(workOrder);
        return Promise.resolve(false);
    }

    function applyWallpaperDraft() {
        var Apply = window.WallpaperApply;
        var workOrder = currentWallpaperWorkOrder();
        var validation = validateWallpaperWorkOrder();
        if (!Apply || !Apply.apply || !validation.valid) {
            refreshWallpaperApplyFooter();
            return;
        }

        var applyBtn = document.getElementById('wallpaperApplyBtn');
        if (applyBtn) applyBtn.disabled = true;
        workOrder.health = { state: 'Applying', reasonKey: 'wallpaperApplyReady', message: tr('wallpaperApply') + '...' };
        refreshWallpaperApplyFooter();

        return Apply.apply(workOrder, {
            prepare: function () {
                return prepareWallpaperWorkOrder(workOrder);
            }
        }).then(function (result) {
            if (result && result.state === 'Applied') {
                currentMode = D.compatMode ? D.compatMode(workOrder.pendingSource) : normalizeDraftSource(workOrder.pendingSource);
                openWallpaperDraft();
                refreshWallpaperWorkOrderBaseline();
                invalidateWallpaperTab();
                refreshGallery();
                return;
            }
            workOrder.health = {
                state: 'Error',
                reasonKey: result && result.reasonKey || 'wallpaperApplyFailed',
                message: result && result.message || ''
            };
            refreshWallpaperApplyFooter();
        }).catch(function (err) {
            workOrder.health = {
                state: 'Error',
                reasonKey: 'wallpaperApplyFailed',
                message: err && err.message ? err.message : String(err || '')
            };
            refreshWallpaperApplyFooter();
        });
    }

    function rssStatusText(config, state) {
        var count = D.activeRssOrder ? D.activeRssOrder(config.activeSourceId).length : 0;
        if (state.lastError) return tr('rssStatusError') + state.lastError;
        if (state.lastSuccessAt) return tr('rssStatusCached') + ' ' + count + '/12 · ' + new Date(state.lastSuccessAt).toLocaleString();
        return count ? (tr('rssStatusCached') + ' ' + count + '/12') : tr('rssStatusEmpty');
    }

    function buildRssConfigHTML() {
        var config = pendingConfigForSource('rss');
        var state = D.loadWallpaper().providers.rss.state || {};
        function selected(value, current) { return String(value) === String(current) ? ' selected' : ''; }
        var rows = config.sources.map(function (source) {
            var checked = source.id === config.activeSourceId ? ' checked' : '';
            var selectedClass = checked ? ' selected' : '';
            var passed = D.isTestPassed(source, D.rssFieldHash(source));
            var validUrl = F.isHttpsUrl(source.url);
            var testDisabled = validUrl ? '' : ' disabled title="' + escapeHtml(tr('rssInvalidUrl')) + '"';
            return '<div class="rss-source-row' + selectedClass + '" data-rss-source="' + escapeHtml(source.id) + '">' +
                '<span class="source-status-dot ' + (passed ? 'passed' : 'failed') + '"></span>' +
                '<label class="rss-source-main"><input type="radio" name="rssSource" value="' + escapeHtml(source.id) + '"' + checked + '><span><strong>' + escapeHtml(source.name) + '</strong><small>' + escapeHtml(source.url) + '</small></span></label>' +
                '<button class="rss-test-btn" type="button" data-action="test-rss"' + testDisabled + '>' + tr('rssTest') + '</button>' +
                '<button class="rss-delete-btn" type="button" data-action="delete-rss" aria-label="' + tr('deleteImage') + '">×</button>' +
                '</div>';
        }).join('');
        return '<div class="rss-config">' +
            '<div class="rss-source-list">' + rows + '</div>' +
            '<div class="rss-source-hint">' + escapeHtml(tr('rssNeedsTest')) + '</div>' +
            '<div class="rss-notice" id="rssNotice" hidden></div>' +
            '<div class="rss-add-row"><input id="rssNameInput" type="text" placeholder="' + tr('rssNamePlaceholder') + '"><input id="rssUrlInput" type="url" placeholder="https://example.com/feed.xml"><button id="rssAddBtn" type="button" disabled>' + tr('rssAdd') + '</button></div>' +
            '<div class="rss-options">' +
            settingItem(rssDisplayText('displayMode'), '', '<select id="rssDisplayMode"><option value="cycle"' + selected('cycle', config.displayMode || 'cycle') + '>' + rssDisplayText('cycle') + '</option><option value="latest"' + selected('latest', config.displayMode) + '>' + rssDisplayText('latest') + '</option></select>', 'setting-compact') +
            settingItem(tr('rssRefreshInterval'), '', '<select id="rssRefreshInterval"><option value="0"' + selected(0, config.refreshIntervalMs) + '>' + tr('rssRefreshOff') + '</option><option value="86400000"' + selected(86400000, config.refreshIntervalMs) + '>' + tr('rssRefreshOneDay') + '</option><option value="259200000"' + selected(259200000, config.refreshIntervalMs) + '>' + tr('rssRefreshThreeDays') + '</option><option value="604800000"' + selected(604800000, config.refreshIntervalMs) + '>' + tr('rssRefreshSevenDays') + '</option></select>', 'setting-compact') +
            settingItem(tr('rssSummaryPosition'), '', '<select id="rssSummaryPosition"><option value="bottom"' + selected('bottom', config.summaryPosition) + '>' + tr('bottom') + '</option><option value="top"' + selected('top', config.summaryPosition) + '>' + tr('top') + '</option></select>', 'setting-compact') +
            settingItem(tr('rssSummaryMode'), '', '<select id="rssSummaryMode"><option value="expanded"' + selected('expanded', config.summaryMode) + '>' + tr('rssExpanded') + '</option><option value="icon"' + selected('icon', config.summaryMode) + '>' + tr('rssIconOnly') + '</option></select>', 'setting-compact') +
            settingItem(tr('rssShowSummary'), '', '<label class="switch-control"><input type="checkbox" id="rssShowSummary"><span></span></label>', 'setting-compact') +
            settingItem(tr('rssShowLink'), '', '<label class="switch-control"><input type="checkbox" id="rssShowLink"><span></span></label>', 'setting-compact') +
            '</div>' +
            '<div class="rss-status" id="rssStatus">' + escapeHtml(rssStatusText(config, state)) + '</div>' +
            '</div>';
    }

    function apiSourceRowHTML(source, apiType, activeId) {
        var hash = D.apiFieldHash(source, apiType);
        var passed = D.isTestPassed(source, hash);
        var checked = source.id === activeId ? ' checked' : '';
        var validUrl = F.isHttpsUrl(source.url);
        var testDisabled = validUrl ? '' : ' disabled title="' + escapeHtml(tr('apiInvalidUrl')) + '"';
        return '<div class="api-source-row' + (checked ? ' selected' : '') + '" data-api-type="' + apiType + '" data-api-source="' + escapeHtml(source.id) + '">' +
            '<span class="source-status-dot ' + (passed ? 'passed' : 'failed') + '"></span>' +
            '<label class="api-source-main"><input type="radio" name="apiSource" value="' + escapeHtml(source.id) + '"' + checked + '><span><strong>' + escapeHtml(source.name) + '</strong><small>' + escapeHtml(source.url) + '</small></span></label>' +
            '<button type="button" data-action="test-api"' + testDisabled + '>' + tr('apiTest') + '</button>' +
            '<button type="button" data-action="delete-api" aria-label="' + tr('deleteImage') + '">×</button>' +
            '</div>';
    }

    function buildApiConfigHTML() {
        var config = pendingConfigForSource('api');
        var apiType = apiEditorOpenType(config);
        var sources = apiType === 'json' ? config.jsonSources : config.imageSources;
        var activeId = apiType === 'json' ? config.activeJsonSourceId : config.activeImageSourceId;
        var rows = sources.map(function (source) { return apiSourceRowHTML(source, apiType, activeId); }).join('');
        function segment(value, label) {
            var active = String(value) === String(config.refreshIntervalMs);
            return '<button type="button" data-api-refresh-interval="' + value + '" class="' + (active ? 'active' : '') + '">' + label + '</button>';
        }
        var refreshControl = '<div class="api-refresh-segments" role="group" aria-label="' + tr('rssRefreshInterval') + '">' +
            segment(0, tr('rssRefreshOff')) +
            segment(-1, tr('apiRefreshEveryTab')) +
            segment(86400000, tr('rssRefreshOneDay')) +
            segment(259200000, tr('rssRefreshThreeDays')) +
            segment(604800000, tr('rssRefreshSevenDays')) +
            '</div>';
        return '<div class="api-config" data-api-type="' + apiType + '">' +
            '<div class="api-type-tabs"><button type="button" data-api-type-tab="image" class="' + (apiType === 'image' ? 'active' : '') + '"><span></span>' + tr('apiTypeImage') + '</button><button type="button" data-api-type-tab="json" class="' + (apiType === 'json' ? 'active' : '') + '"><span></span>' + tr('apiTypeJson') + '</button></div>' +
            '<div class="api-source-list">' + rows + '</div>' +
            '<div class="api-notice" id="apiNotice" hidden></div>' +
            '<div class="api-add-row"><input id="apiNameInput" type="text" placeholder="' + tr('rssNamePlaceholder') + '"><input id="apiUrlInput" type="url" placeholder="https://example.com/wallpaper">' + (apiType === 'json' ? '<input id="apiJsonPathInput" type="text" placeholder="data.image.url">' : '') + '<button id="apiAddBtn" type="button" disabled>' + tr('rssAdd') + '</button></div>' +
            '<div class="api-options">' +
            settingItem(tr('rssRefreshInterval'), '', refreshControl, 'setting-compact') +
            '</div>' +
            '</div>';
    }

    function apiEditorOpenType(config) {
        if (wallpaperDraftApiOpenType === 'json' || wallpaperDraftApiOpenType === 'image') return wallpaperDraftApiOpenType;
        return config && config.apiType === 'json' ? 'json' : 'image';
    }

    function buildSearchHTML() {
        var searchModeControl = '<select id="modalSearchMode">' +
            '<option value="hover"' + (searchMode === 'hover' ? ' selected' : '') + '>' + tr('searchHover') + '</option>' +
            '<option value="always"' + (searchMode === 'always' ? ' selected' : '') + '>' + tr('searchAlways') + '</option>' +
            '<option value="never"' + (searchMode === 'never' ? ' selected' : '') + '>' + tr('searchNever') + '</option>' +
            '</select>';
        var searchHistoryControl = '<select id="modalSearchHistoryLimit">' +
            '<option value="0"' + (searchHistoryLimit === 0 ? ' selected' : '') + '>' + tr('searchHistoryOff') + '</option>' +
            '<option value="5"' + (searchHistoryLimit === 5 ? ' selected' : '') + '>5</option>' +
            '<option value="10"' + (searchHistoryLimit === 10 ? ' selected' : '') + '>10</option>' +
            '</select>';
        var searchPosControl = '<select id="modalSearchPos">' +
            '<option value="edge-top"' + (searchPosition === 'edge-top' ? ' selected' : '') + '>' + tr('posEdgeTop') + '</option>' +
            '<option value="top"' + (searchPosition === 'top' ? ' selected' : '') + '>' + tr('posHigh') + '</option>' +
            '<option value="upper"' + (searchPosition === 'upper' ? ' selected' : '') + '>' + tr('posUpper') + '</option>' +
            '<option value="center-upper"' + (searchPosition === 'center-upper' ? ' selected' : '') + '>' + tr('posCenterUpper') + '</option>' +
            '<option value="center"' + (searchPosition === 'center' ? ' selected' : '') + '>' + tr('posCenter') + '</option>' +
            '<option value="center-lower"' + (searchPosition === 'center-lower' ? ' selected' : '') + '>' + tr('posCenterLower') + '</option>' +
            '<option value="lower"' + (searchPosition === 'lower' ? ' selected' : '') + '>' + tr('posLower') + '</option>' +
            '<option value="bottom"' + (searchPosition === 'bottom' ? ' selected' : '') + '>' + tr('posLow') + '</option>' +
            '<option value="edge-bottom"' + (searchPosition === 'edge-bottom' ? ' selected' : '') + '>' + tr('posEdgeBottom') + '</option>' +
            '</select>';
        var searchIconPositionControl = '<select id="modalSearchIconPosition">' +
            '<option value="left"' + (searchIconPosition === 'left' ? ' selected' : '') + '>' + tr('iconLeft') + '</option>' +
            '<option value="right"' + (searchIconPosition === 'right' ? ' selected' : '') + '>' + tr('iconRight') + '</option>' +
            '</select>';
        var searchIconVisibilityControl = '<select id="modalSearchIconVisibility">' +
            '<option value="always"' + (searchIconVisibility === 'always' ? ' selected' : '') + '>' + tr('iconVisibilityAlways') + '</option>' +
            '<option value="hidden"' + (searchIconVisibility === 'hidden' ? ' selected' : '') + '>' + tr('iconVisibilityHidden') + '</option>' +
            '</select>';
        var searchSurfaceControl = '<select id="modalSearchSurface">' +
            '<option value="light"' + (searchSurface === 'light' ? ' selected' : '') + '>' + tr('surfaceLight') + '</option>' +
            '<option value="glass"' + (searchSurface === 'glass' ? ' selected' : '') + '>' + tr('surfaceGlass') + '</option>' +
            '<option value="theme"' + (searchSurface === 'theme' ? ' selected' : '') + '>' + tr('surfaceTheme') + '</option>' +
            '<option value="solid"' + (searchSurface === 'solid' ? ' selected' : '') + '>' + tr('surfaceSolid') + '</option>' +
            '<option value="outline"' + (searchSurface === 'outline' ? ' selected' : '') + '>' + tr('surfaceOutline') + '</option>' +
            '<option value="clean"' + (searchSurface === 'clean' ? ' selected' : '') + '>' + tr('surfaceClean') + '</option>' +
            '</select>';
        var searchShadowControl = '<select id="modalSearchShadow">' +
            '<option value="none"' + (searchShadow === 'none' ? ' selected' : '') + '>' + tr('shadowNone') + '</option>' +
            '<option value="soft"' + (searchShadow === 'soft' ? ' selected' : '') + '>' + tr('shadowSoft') + '</option>' +
            '<option value="standard"' + (searchShadow === 'standard' ? ' selected' : '') + '>' + tr('shadowStandard') + '</option>' +
            '</select>';
        var radiusControl = '<select id="modalSearchRadius">' +
            '<option value="capsule"' + (searchRadius === 'capsule' ? ' selected' : '') + '>' + tr('radiusCapsule') + '</option>' +
            '<option value="rounded"' + (searchRadius === 'rounded' ? ' selected' : '') + '>' + tr('radiusRounded') + '</option>' +
            '<option value="sharp"' + (searchRadius === 'sharp' ? ' selected' : '') + '>' + tr('radiusSharp') + '</option>' +
            '</select>';
        var placeholderControl = '<input type="text" id="modalSearchPlaceholder" value="' + escapeHtml(searchPlaceholder) + '" placeholder="' + tr('searchPlaceholder') + '">';
        var enterBehaviorControl = '<select id="modalSearchEnterBehavior">' +
            '<option value="current"' + (searchEnterBehavior === 'current' ? ' selected' : '') + '>' + tr('enterCurrentTab') + '</option>' +
            '<option value="newtab"' + (searchEnterBehavior === 'newtab' ? ' selected' : '') + '>' + tr('enterNewTab') + '</option>' +
            '</select>';
        var searchWidthControl = '<input type="range" id="modalSearchWidthRange" min="360" max="760" step="10" value="' + searchWidth + '">' +
            '<input type="number" id="modalSearchWidthNum" class="input-w-55" min="360" max="760" step="10" value="' + searchWidth + '">';
        var searchBgControl = '<input type="range" id="modalSearchBgRange" min="0.04" max="0.32" step="0.01" value="' + searchBackgroundOpacity + '">' +
            '<input type="number" id="modalSearchBgNum" class="input-w-55" min="0.04" max="0.32" step="0.01" value="' + searchBackgroundOpacity + '">';
        var searchBlurControl = '<input type="range" id="modalSearchBlurRange" min="0" max="40" step="1" value="' + searchBlur + '">' +
            '<input type="number" id="modalSearchBlurNum" class="input-w-55" min="0" max="40" step="1" value="' + searchBlur + '">';
        var engineControl = IS_EXTENSION ? '<select id="modalEngineSel" disabled>' +
            '<option value="browser" selected>' + tr('engineBrowserDefault') + '</option>' +
            '</select>' : '<select id="modalEngineSel">' +
            '<option value="google"' + (currentEngine === 'google' ? ' selected' : '') + '>Google</option>' +
            '<option value="bing"' + (currentEngine === 'bing' ? ' selected' : '') + '>Bing</option>' +
            '<option value="baidu"' + (currentEngine === 'baidu' ? ' selected' : '') + '>Baidu</option>' +
            '<option value="duckduckgo"' + (currentEngine === 'duckduckgo' ? ' selected' : '') + '>DuckDuckGo</option>' +
            '</select>';
        var engineDesc = IS_EXTENSION ? modalCopy('modalDescEngineExtension') : modalCopy('modalDescEngine');
        var body =
            settingGroup(tr('settingsGroupSearchVisibility'),
            settingItem(tr('searchLabel'), modalCopy('modalDescSearchMode'), searchModeControl) +
            settingItem(tr('searchHistory'), modalCopy('modalDescSearchHistory'), searchHistoryControl)) +
            settingGroup(tr('settingsGroupSearchLayout'),
            settingItem(tr('searchPosition'), modalCopy('modalDescSearchPosition'), searchPosControl) +
            settingItem(tr('searchWidth'), modalCopy('modalDescSearchWidth'), searchWidthControl) +
            settingItem(tr('searchIconPosition'), modalCopy('modalDescSearchIconPosition'), searchIconPositionControl) +
            settingItem(tr('searchIconVisibility'), modalCopy('modalDescSearchIconVisibility'), searchIconVisibilityControl)) +
            settingGroup(tr('settingsGroupSearchSurface'),
            settingItem(tr('searchSurface'), modalCopy('modalDescSearchSurface'), searchSurfaceControl) +
            settingItem(tr('searchShadow'), modalCopy('modalDescSearchShadow'), searchShadowControl) +
            settingItem(tr('searchRadius'), modalCopy('modalDescSearchRadius'), radiusControl) +
            settingItem(tr('searchBackground'), modalCopy('modalDescSearchBackground'), searchBgControl) +
            settingItem(tr('searchBlur'), modalCopy('modalDescSearchBlur'), searchBlurControl)) +
            settingGroup(tr('settingsGroupSearchBehavior'),
            settingItem(tr('searchPlaceholderCustom'), modalCopy('modalDescSearchPlaceholder'), placeholderControl) +
            settingItem(tr('searchEnterBehavior'), modalCopy('modalDescSearchEnterBehavior'), enterBehaviorControl)) +
            settingGroup(tr('settingsGroupSearchEngine'),
            settingItem(tr('engineLabel'), engineDesc, engineControl, IS_EXTENSION ? 'setting-disabled' : '')) +
            '<div class="settings-actions"><button class="reset-defaults-btn" id="searchResetBtn" type="button">' + tr('resetSearchDefaults') + '</button></div>';

        return buildPageShell(tr('tabSearch'), modalCopy('modalSubtitleSearch'), body);
    }

    function buildAppearanceHTML() {
        var opacityControl = '<input type="range" id="modalOpacityRange" min="0" max="1" step="0.01" value="' + currentOpacity + '">' +
            '<input type="number" id="modalOpacityNum" class="input-w-55" min="0" max="1" step="0.01" value="' + currentOpacity + '">';
        var themeControl = '<label class="switch-control"><input type="checkbox" id="modalThemeEnabled"' + (themeEnabled ? ' checked' : '') + '><span></span></label>';
        var panelOpacityControl = '<input type="range" id="modalPanelOpacityRange" min="0.3" max="1" step="0.01" value="' + panelOpacity + '">' +
            '<input type="number" id="modalPanelOpacityNum" class="input-w-55" min="0.3" max="1" step="0.01" value="' + panelOpacity + '">';
        var uiRadiusControl = '<select id="modalUiRadius">' +
            '<option value="compact"' + (uiRadius === 'compact' ? ' selected' : '') + '>' + tr('radiusCompact') + '</option>' +
            '<option value="soft"' + (uiRadius === 'soft' ? ' selected' : '') + '>' + tr('radiusSoft') + '</option>' +
            '<option value="round"' + (uiRadius === 'round' ? ' selected' : '') + '>' + tr('radiusRound') + '</option>' +
            '</select>';
        var fontScaleControl = '<select id="modalFontScale">' +
            '<option value="compact"' + (fontScale === 'compact' ? ' selected' : '') + '>' + tr('fontCompact') + '</option>' +
            '<option value="standard"' + (fontScale === 'standard' ? ' selected' : '') + '>' + tr('fontStandard') + '</option>' +
            '<option value="large"' + (fontScale === 'large' ? ' selected' : '') + '>' + tr('fontLarge') + '</option>' +
            '</select>';
        var accentControl = '<select id="modalAccentMode">' +
            '<option value="auto"' + (accentMode === 'auto' ? ' selected' : '') + '>' + tr('accentAuto') + '</option>' +
            '<option value="custom"' + (accentMode === 'custom' ? ' selected' : '') + '>' + tr('accentCustom') + '</option>' +
            '</select><input type="color" id="modalAccentColor" class="accent-color-input" value="' + escapeHtml(accentColor) + '"' + (accentMode === 'custom' ? '' : ' hidden') + '>';
        var reducedMotionControl = '<label class="switch-control"><input type="checkbox" id="modalReducedMotion"' + (reducedMotion ? ' checked' : '') + '><span></span></label>';

        var body =
            settingGroup(tr('settingsGroupTheme'),
            settingItem(tr('themeEnableLabel'), modalCopy('modalDescTheme'), themeControl, 'setting-compact') +
            settingItem(tr('accentColorLabel'), modalCopy('modalDescAccentColor'), accentControl)) +
            settingGroup(tr('settingsGroupSurface'),
            settingItem(tr('opacityLabel'), modalCopy('modalDescIconOpacity'), opacityControl) +
            settingItem(tr('panelOpacityLabel'), modalCopy('modalDescPanelOpacity'), panelOpacityControl) +
            settingItem(tr('uiRadiusLabel'), modalCopy('modalDescUiRadius'), uiRadiusControl) +
            settingItem(tr('fontScaleLabel'), modalCopy('modalDescFontScale'), fontScaleControl) +
            settingItem(tr('reducedMotionLabel'), modalCopy('modalDescReducedMotion'), reducedMotionControl, 'setting-compact')) +
            '<div class="settings-actions"><button class="reset-defaults-btn" id="appearanceResetBtn" type="button">' + tr('resetAppearanceDefaults') + '</button></div>';

        return buildPageShell(tr('tabAppearance'), modalCopy('modalSubtitleAppearance'), body);
    }

    function bindSearchEvents() {
        var selMode = document.getElementById('modalSearchMode');
        var selHistoryLimit = document.getElementById('modalSearchHistoryLimit');
        var selPos = document.getElementById('modalSearchPos');
        var selIconPosition = document.getElementById('modalSearchIconPosition');
        var selIconVisibility = document.getElementById('modalSearchIconVisibility');
        var selSurface = document.getElementById('modalSearchSurface');
        var selShadow = document.getElementById('modalSearchShadow');
        var selRadius = document.getElementById('modalSearchRadius');
        var placeholderInput = document.getElementById('modalSearchPlaceholder');
        var enterBehaviorSel = document.getElementById('modalSearchEnterBehavior');
        var searchWidthRange = document.getElementById('modalSearchWidthRange');
        var searchWidthNum = document.getElementById('modalSearchWidthNum');
        var searchBgRange = document.getElementById('modalSearchBgRange');
        var searchBgNum = document.getElementById('modalSearchBgNum');
        var searchBlurRange = document.getElementById('modalSearchBlurRange');
        var searchBlurNum = document.getElementById('modalSearchBlurNum');
        var engineSel = document.getElementById('modalEngineSel');
        var resetBtn = document.getElementById('searchResetBtn');

        if (selMode) selMode.addEventListener('change', function () { applySearchMode(this.value); });
        if (selHistoryLimit) selHistoryLimit.addEventListener('change', function () { applySearchHistoryLimit(this.value); });
        if (selPos) selPos.addEventListener('change', function () { applySearchPosition(this.value); });
        if (selIconPosition) selIconPosition.addEventListener('change', function () { applySearchIconPosition(this.value); });
        if (selIconVisibility) selIconVisibility.addEventListener('change', function () { applySearchIconVisibility(this.value); });
        if (selSurface) selSurface.addEventListener('change', function () { applySearchSurface(this.value); });
        if (selShadow) selShadow.addEventListener('change', function () { applySearchShadow(this.value); });
        if (selRadius) selRadius.addEventListener('change', function () { applySearchRadius(this.value); });
        if (placeholderInput) placeholderInput.addEventListener('change', function () { applySearchPlaceholder(this.value); this.value = searchPlaceholder; });
        if (enterBehaviorSel) enterBehaviorSel.addEventListener('change', function () { applySearchEnterBehavior(this.value); });
        if (searchWidthRange) searchWidthRange.addEventListener('input', function () { applySearchWidth(this.value); if (searchWidthNum) searchWidthNum.value = this.value; });
        if (searchWidthNum) searchWidthNum.addEventListener('change', function () { applySearchWidth(this.value); if (searchWidthRange) searchWidthRange.value = searchWidth; this.value = searchWidth; });
        if (searchBgRange) searchBgRange.addEventListener('input', function () { applySearchBackgroundOpacity(this.value); if (searchBgNum) searchBgNum.value = searchBackgroundOpacity; });
        if (searchBgNum) searchBgNum.addEventListener('change', function () { applySearchBackgroundOpacity(this.value); if (searchBgRange) searchBgRange.value = searchBackgroundOpacity; this.value = searchBackgroundOpacity; });
        if (searchBlurRange) searchBlurRange.addEventListener('input', function () { applySearchBlur(this.value); if (searchBlurNum) searchBlurNum.value = searchBlur; });
        if (searchBlurNum) searchBlurNum.addEventListener('change', function () { applySearchBlur(this.value); if (searchBlurRange) searchBlurRange.value = searchBlur; this.value = searchBlur; });
        if (engineSel) engineSel.addEventListener('change', function () { applyEngine(this.value); });
        if (resetBtn) resetBtn.addEventListener('click', function () {
            if (!confirm(tr('resetSearchConfirm'))) return;
            resetSearchDefaults();
        });
        syncCustomSelects(modalContent);
    }

    function bindAppearanceEvents() {
        var opacityRange = document.getElementById('modalOpacityRange');
        var opacityNum = document.getElementById('modalOpacityNum');
        var themeCheck = document.getElementById('modalThemeEnabled');
        var panelOpacityRange = document.getElementById('modalPanelOpacityRange');
        var panelOpacityNum = document.getElementById('modalPanelOpacityNum');
        var uiRadiusSel = document.getElementById('modalUiRadius');
        var fontScaleSel = document.getElementById('modalFontScale');
        var accentModeSel = document.getElementById('modalAccentMode');
        var accentColorInput = document.getElementById('modalAccentColor');
        var reducedMotionCheck = document.getElementById('modalReducedMotion');
        var resetBtn = document.getElementById('appearanceResetBtn');

        if (opacityRange) opacityRange.addEventListener('input', function () { applyOpacity(this.value); if (opacityNum) opacityNum.value = this.value; });
        if (opacityNum) opacityNum.addEventListener('change', function () { applyOpacity(this.value); if (opacityRange) opacityRange.value = this.value; });
        if (themeCheck) themeCheck.addEventListener('change', function () { applyThemeMode(this.checked); });
        if (panelOpacityRange) panelOpacityRange.addEventListener('input', function () { applyPanelOpacity(this.value); if (panelOpacityNum) panelOpacityNum.value = this.value; });
        if (panelOpacityNum) panelOpacityNum.addEventListener('change', function () { applyPanelOpacity(this.value); if (panelOpacityRange) panelOpacityRange.value = this.value; });
        if (uiRadiusSel) uiRadiusSel.addEventListener('change', function () { applyUiRadius(this.value); });
        if (fontScaleSel) fontScaleSel.addEventListener('change', function () { applyFontScale(this.value); });
        if (accentModeSel) accentModeSel.addEventListener('change', function () { applyAccentMode(this.value); });
        if (accentColorInput) accentColorInput.addEventListener('input', function () { applyAccentColor(this.value); });
        if (reducedMotionCheck) reducedMotionCheck.addEventListener('change', function () { applyReducedMotion(this.checked); });
        if (resetBtn) resetBtn.addEventListener('click', function () {
            if (!confirm(tr('resetAppearanceConfirm'))) return;
            resetAppearanceDefaults();
        });
        syncCustomSelects(modalContent);
    }

    function buildWallpaperDisplayHTML() {
        var wallpaperFitControl = '<select id="modalWallpaperFit">' +
            '<option value="cover"' + (wallpaperFit === 'cover' ? ' selected' : '') + '>' + tr('fitCover') + '</option>' +
            '<option value="contain"' + (wallpaperFit === 'contain' ? ' selected' : '') + '>' + tr('fitContain') + '</option>' +
            '<option value="100% 100%"' + (wallpaperFit === '100% 100%' ? ' selected' : '') + '>' + tr('fitStretch') + '</option>' +
            '</select>';
        var wallpaperPositionControl = '<select id="modalWallpaperPosition">' +
            '<option value="center"' + (wallpaperPosition === 'center' ? ' selected' : '') + '>' + tr('posCenter') + '</option>' +
            '<option value="top"' + (wallpaperPosition === 'top' ? ' selected' : '') + '>' + tr('posTop') + '</option>' +
            '<option value="bottom"' + (wallpaperPosition === 'bottom' ? ' selected' : '') + '>' + tr('posBottom') + '</option>' +
            '<option value="left"' + (wallpaperPosition === 'left' ? ' selected' : '') + '>' + tr('alignLeft') + '</option>' +
            '<option value="right"' + (wallpaperPosition === 'right' ? ' selected' : '') + '>' + tr('alignRight') + '</option>' +
            '</select>';
        var wallpaperBlurControl = '<input type="range" id="modalWallpaperBlurRange" min="0" max="15" step="1" value="' + wallpaperBlur + '">' +
            '<input type="number" id="modalWallpaperBlurNum" class="input-w-55" min="0" max="15" step="1" value="' + wallpaperBlur + '">';
        var wallpaperVignetteControl = '<select id="modalWallpaperVignette">' +
            '<option value="none"' + (wallpaperVignette === 'none' ? ' selected' : '') + '>' + tr('vignetteNone') + '</option>' +
            '<option value="soft"' + (wallpaperVignette === 'soft' ? ' selected' : '') + '>' + tr('vignetteSoft') + '</option>' +
            '<option value="medium"' + (wallpaperVignette === 'medium' ? ' selected' : '') + '>' + tr('vignetteMedium') + '</option>' +
            '</select>';
        var overlayControl = '<input type="range" id="modalOverlayRange" min="0" max="0.6" step="0.01" value="' + overlayOpacity + '">' +
            '<input type="number" id="modalOverlayNum" class="input-w-55" min="0" max="0.6" step="0.01" value="' + overlayOpacity + '">';

        return settingGroup(tr('settingsGroupWallpaperDisplay'),
            settingItem(tr('wallpaperFit'), modalCopy('modalDescWallpaperFit'), wallpaperFitControl) +
            settingItem(tr('wallpaperPosition'), modalCopy('modalDescWallpaperPosition'), wallpaperPositionControl) +
            settingItem(tr('wallpaperBlur'), modalCopy('modalDescWallpaperBlur'), wallpaperBlurControl) +
            settingItem(tr('wallpaperVignette'), modalCopy('modalDescWallpaperVignette'), wallpaperVignetteControl) +
            settingItem(tr('overlayLabel'), modalCopy('modalDescOverlay'), overlayControl));
    }

    function buildWallpaperHTML() {
        if (!wallpaperDraft) openWallpaperDraft();
        var workOrder = currentWallpaperWorkOrder();
        var activeSource = normalizeDraftSource(workOrder.pendingSource);
        var sources = [
            { id: 'bing',   name: getSourceLabel('bing'),   desc:tr('sourceBingDesc')},
            { id: 'upload', name: getSourceLabel('upload'), desc:tr('sourceUploadDesc')},
            { id: 'folder', name: getSourceLabel('folder'), desc:tr('sourceFolderDesc')},
            { id: 'rss',    name: getSourceLabel('rss'),    desc:tr('sourceRssDesc')},
            { id: 'api',    name: getSourceLabel('api'),    desc:tr('sourceApiDesc')}
        ];

        var runningSource = normalizeDraftSource(D.getActiveSource ? D.getActiveSource() : D.loadWallpaper().activeSource);
        var openSource = draftOpenSource();
        var configs = {
            bing:   '<p>' + tr('bingConfigHint') + '</p>',
            upload: '<ul class="source-hint-list">' +
                '<li>' + tr('uploadConfigHintAdd') + '</li>' +
                '<li>' + tr('uploadConfigHintImages') + '</li>' +
                '<li>' + tr('uploadConfigHintVideo') + '</li>' +
                '<li>' + tr('uploadConfigHintWheel') + '</li>' +
                '</ul>',
            folder: buildFolderConfigHTML(),
            rss:    buildRssConfigHTML(),
            api:    buildApiConfigHTML()
        };
        var selectedSourceLabel = getSourceLabel(activeSource);
        var selectedSourceHint = escapeHtml(tr('wallpaperCurrentSource')).replace('{source}', '<strong>' + escapeHtml(selectedSourceLabel) + '</strong>');

        var drawers = sources.map(function (s) {
            var expandedClass = s.id === openSource ? ' active' : '';
            var selectedClass = s.id === activeSource ? ' selected' : '';
            var runningClass = s.id === runningSource ? ' running' : '';
            return '<div class="source-drawer' + expandedClass + selectedClass + runningClass + '" data-source="' + s.id + '">' +
                '<div class="source-drawer-header">' +
                '<button class="source-selector ' + s.id + '" type="button" role="radio" aria-checked="' + (s.id === activeSource ? 'true' : 'false') + '" data-source-option="' + s.id + '" aria-label="' + escapeHtml(s.name) + '"><span></span></button>' +
                '<span class="source-drawer-dot ' + s.id + '"></span>' +
                '<div class="source-drawer-info"><div class="source-drawer-name">' + escapeHtml(s.name) + '</div><div class="source-drawer-desc">' + escapeHtml(s.desc) + '</div></div>' +
                '<svg class="source-drawer-chevron" viewBox="0 0 16 16" fill="currentColor"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
                '</div>' +
                '<div class="source-drawer-body"><div class="source-drawer-body-inner">' + configs[s.id] + '</div></div>' +
                '</div>';
        }).join('');

        return '<div class="wallpaper-tab-shell">' +
            '<div class="wallpaper-tab-header"><h2>' + tr('tabWallpaper') + '</h2><p>' + modalCopy('modalSubtitleWallpaper') + '</p></div>' +
            '<div class="wallpaper-tab-body">' + buildWallpaperDisplayHTML() + '<div class="wallpaper-current-source">' + selectedSourceHint + '</div><div class="source-accordion">' + drawers + '</div><div class="wallpaper-reset-row"><button class="danger-action" id="wallpaperResetBtn" type="button">' + tr('wallpaperResetDefaults') + '</button></div></div>' +
            wallpaperApplyFooterHTML() +
            '</div>';
    }

    function bindWallpaperEvents() {
        var wallpaperFitSel = document.getElementById('modalWallpaperFit');
        var wallpaperPositionSel = document.getElementById('modalWallpaperPosition');
        var wallpaperBlurRange = document.getElementById('modalWallpaperBlurRange');
        var wallpaperBlurNum = document.getElementById('modalWallpaperBlurNum');
        var wallpaperVignetteSel = document.getElementById('modalWallpaperVignette');
        var overlayRange = document.getElementById('modalOverlayRange');
        var overlayNum = document.getElementById('modalOverlayNum');

        if (wallpaperFitSel) wallpaperFitSel.addEventListener('change', function () { applyWallpaperFit(this.value); });
        if (wallpaperPositionSel) wallpaperPositionSel.addEventListener('change', function () { applyWallpaperPosition(this.value); });
        if (wallpaperBlurRange) wallpaperBlurRange.addEventListener('input', function () { applyWallpaperBlur(this.value, { preview: true }); this.value = wallpaperBlur; if (wallpaperBlurNum) wallpaperBlurNum.value = wallpaperBlur; });
        if (wallpaperBlurRange) wallpaperBlurRange.addEventListener('change', function () { applyWallpaperBlur(this.value); if (wallpaperBlurNum) wallpaperBlurNum.value = wallpaperBlur; this.value = wallpaperBlur; });
        if (wallpaperBlurNum) wallpaperBlurNum.addEventListener('change', function () { applyWallpaperBlur(this.value); if (wallpaperBlurRange) wallpaperBlurRange.value = wallpaperBlur; this.value = wallpaperBlur; });
        if (wallpaperVignetteSel) wallpaperVignetteSel.addEventListener('change', function () { applyWallpaperVignette(this.value); });
        if (overlayRange) overlayRange.addEventListener('input', function () { applyOverlayOpacity(this.value); if (overlayNum) overlayNum.value = this.value; });
        if (overlayNum) overlayNum.addEventListener('change', function () { applyOverlayOpacity(this.value); if (overlayRange) overlayRange.value = this.value; });

        function setDrawerOpen(drawer, open) {
            var body = drawer.querySelector('.source-drawer-body');
            var inner = drawer.querySelector('.source-drawer-body-inner');
            if (!body || !inner) {
                drawer.classList.toggle('active', open);
                return;
            }
            if (open) {
                drawer.classList.add('active');
                body.style.maxHeight = inner.scrollHeight + 'px';
                return;
            }
            body.style.maxHeight = body.scrollHeight + 'px';
            void body.offsetHeight;
            drawer.classList.remove('active');
            body.style.maxHeight = '0px';
        }

        modalContent.querySelectorAll('.source-drawer.active').forEach(function (drawer) {
            var body = drawer.querySelector('.source-drawer-body');
            var inner = drawer.querySelector('.source-drawer-body-inner');
            if (body && inner) body.style.maxHeight = inner.scrollHeight + 'px';
        });

        modalContent.querySelectorAll('.source-selector').forEach(function (button) {
            button.addEventListener('click', function (e) {
                e.stopPropagation();
                var source = normalizeDraftSource(button.dataset.sourceOption);
                var openDrawer = modalContent.querySelector('.source-drawer.active');
                switchWallpaperWorkOrderSource(source);
                wallpaperDraftOpenSource = openDrawer ? openDrawer.dataset.source : 'none';
                refreshWallpaperDraftTab();
            });
        });

        modalContent.querySelectorAll('.source-drawer-header').forEach(function (header) {
            header.addEventListener('click', function (e) {
                if (e.target.closest('button, input, label')) return;
                var drawer = header.parentElement;
                var clickedSource = drawer.dataset.source;
                var wasActive = drawer && drawer.classList.contains('active');
                wallpaperDraftOpenSource = wasActive ? '' : clickedSource;
                modalContent.querySelectorAll('.source-drawer').forEach(function (d) {
                    var open = !wasActive && d.dataset.source === clickedSource;
                    setDrawerOpen(d, open);
                });
            });
        });
        bindFolderConfigEvents();
        bindRssConfigEvents();
        bindApiConfigEvents();
        var applyBtn = modalContent.querySelector('#wallpaperApplyBtn');
        if (applyBtn) applyBtn.addEventListener('click', applyWallpaperDraft);
        var reset = modalContent.querySelector('#wallpaperResetBtn');
        if (reset) reset.addEventListener('click', function () {
            if (!confirm(tr('wallpaperResetConfirm'))) return;
            resetWallpaperDefaults();
        });
    }

    function setRssStatus(message) {
        var el = document.getElementById('rssStatus');
        if (el) el.textContent = message;
    }

    function showRssNotice(message, type) {
        var el = document.getElementById('rssNotice');
        if (!el) return;
        clearTimeout(rssNoticeTimer);
        rssNoticeTimer = null;
        rssNoticeToken += 1;
        el.textContent = message || '';
        el.dataset.type = type || 'info';
        delete el.dataset.validation;
        el.hidden = !message;
    }

    function showRssValidation(message) {
        setRssStatus(message);
        showRssNotice(message, 'error');
        var el = document.getElementById('rssNotice');
        var token = rssNoticeToken;
        if (el) el.dataset.validation = 'true';
        rssNoticeTimer = setTimeout(function () {
            if (token === rssNoticeToken) clearRssValidation();
        }, 4000);
    }

    function clearRssValidation() {
        var el = document.getElementById('rssNotice');
        if (!el || el.dataset.validation !== 'true') return;
        showRssNotice('', 'info');
        var config = pendingConfigForSource('rss');
        setRssStatus(rssStatusText(config, D.loadWallpaper().providers.rss.state || {}));
    }

    function setRssTestButtonState(button, testing) {
        if (!button) return;
        if (!button.dataset.idleLabel) button.dataset.idleLabel = button.textContent;
        button.disabled = !!testing;
        button.classList.toggle('testing', !!testing);
        button.textContent = testing ? tr('rssTesting') : button.dataset.idleLabel;
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
        if (!handle || !WF || !WF.readImageFile || !WF.preparePreviewFromFile || !names || !names.length) return Promise.resolve(false);
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
                }).catch(function () {
                    return changed;
                });
            });
        });
        return chain;
    }

    function prewarmFolderLightCache(handle, names) {
        if (!handle || !WF || !WF.readImageFile || !WF.prepareLightCacheFromFile || !D.saveFolderLightCache || !names || !names.length) {
            return Promise.resolve(false);
        }
        var chain = Promise.resolve(false);
        names.slice(0, FOLDER_THUMB_LOOKAHEAD).forEach(function (name) {
            chain = chain.then(function (changed) {
                var id = D.folderId(name);
                return WF.readImageFile(handle, name).then(function (file) {
                    return (D.loadFolderLightCache ? D.loadFolderLightCache(name) : Promise.resolve(null)).then(function (existing) {
                        if (existing && existing.blob && existing.size === file.size && existing.lastModified === file.lastModified) return changed;
                        return WF.prepareLightCacheFromFile(file, id).then(function (prepared) {
                            return D.saveFolderLightCache(name, prepared.record).then(function () {
                                return true;
                            });
                        });
                    });
                }).catch(function () {
                    return changed;
                });
            });
        });
        return chain;
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
        if (!D.idbKeys || !D.idbDeleteMany || !D.DB || !D.DB.FOLDER_LIGHT_PREFIX) return Promise.resolve(false);
        var keep = {};
        (names || []).forEach(function (name) {
            if (D.folderLightKey) keep[D.folderLightKey(name)] = true;
        });
        return D.idbKeys().then(function (keys) {
            var deletes = keys.filter(function (key) {
                return String(key).indexOf(D.DB.FOLDER_LIGHT_PREFIX) === 0 && !keep[key];
            });
            if (!deletes.length) return false;
            return D.idbDeleteMany(deletes).then(function () { return true; });
        }).catch(function () { return false; });
    }

    function reauthorizeSavedFolder() {
        if (!D.loadFolderHandle || !WF || !WF.requestReadPermission) return Promise.reject(new Error(tr('folderUnsupported')));
        return D.loadFolderHandle().then(function (handle) {
            if (!handle) throw new Error(tr('noFolderSelected'));
            return WF.requestReadPermission(handle).then(function (state) {
                if (state !== 'granted') throw new Error(tr('folderNeedsPermission'));
                var folderState = D.loadFolderState ? D.loadFolderState() : {};
                folderState.status = 'ready';
                folderState.lastError = '';
                folderState.lastPermissionCheckAt = Date.now();
                folderState.permissionStatus = 'granted';
                if (D.saveFolderState) D.saveFolderState(folderState);
                if (window.reloadWallpaper) return window.reloadWallpaper();
                return true;
            });
        });
    }

    function folderStatusText() {
        var draft = currentWallpaperDraft();
        var config = pendingConfigForSource('folder') || {};
        var state = draft.providers.folder.state || {};
        if (!WF || !WF.isSupported || !WF.isSupported()) return tr('folderUnsupported');
        if (wallpaperDraftFolderMount) {
            return tr('folderReady') + (wallpaperDraftFolderMount.pathLabel || tr('sourceFolder')) + ' · ' + wallpaperDraftFolderMount.files.length + ' ' + tr('folderImagesUnit');
        }
        if (state.usingLightCache) return tr('folderNeedsPermission') + ' · ' + tr('folderSaved') + (config.pathLabel || tr('sourceFolder'));
        if (state.status === 'needs-permission') return tr('folderNeedsPermission');
        if (state.status === 'ready' && config.pathLabel) return tr('folderSaved') + config.pathLabel + (state.indexedCount ? (' · ' + state.indexedCount + ' ' + tr('folderImagesUnit')) : '');
        if (state.status === 'empty') return tr('folderEmpty');
        if (state.status === 'error' && state.lastError) return state.lastError;
        return tr('noFolderSelected');
    }

    function folderPermissionStateClass(state) {
        state = state || {};
        if (state.status === 'needs-permission' || state.usingLightCache) return ' needs-permission';
        if (state.permissionStatus === 'granted' || state.status === 'ready') return ' is-authorized';
        return '';
    }

    function folderReauthLabel(state) {
        state = state || {};
        if (state.status === 'needs-permission' || state.usingLightCache) return tr('folderNeedsPermission');
        if (state.permissionStatus === 'granted' || state.status === 'ready') return tr('folderReady');
        return tr('folderNeedsPermission');
    }

    function showFolderNotice(message, type) {
        var el = document.getElementById('folderNotice');
        if (!el) return;
        el.textContent = message || '';
        el.dataset.type = type || 'info';
        el.hidden = !message;
    }

    function setFolderStatus(message) {
        var el = document.getElementById('folderStatus');
        if (el) el.textContent = message || folderStatusText();
    }

    function setFolderButtonState(button, busy) {
        if (!button) return;
        if (!button.dataset.idleLabel) button.dataset.idleLabel = button.textContent;
        button.disabled = !!busy;
        button.classList.toggle('testing', !!busy);
        button.textContent = busy ? tr('folderPreparing') : button.dataset.idleLabel;
    }

    function buildFolderConfigHTML() {
        var supported = !!(WF && WF.isSupported && WF.isSupported());
        var draft = currentWallpaperDraft();
        var config = pendingConfigForSource('folder') || {};
        var state = draft.providers.folder.state || {};
        var canReauth = supported && !!config.pathLabel;
        var label = wallpaperDraftFolderMount ? wallpaperDraftFolderMount.pathLabel : (config.pathLabel || tr('noFolderSelected'));
        return '<div class="folder-config">' +
            '<div class="folder-current' + folderPermissionStateClass(state) + '">' +
            '<div><span>' + tr('sourceFolder') + '</span><strong>' + escapeHtml(label) + '</strong></div>' +
            '<div class="folder-actions">' +
            '<button id="folderReauthBtn" class="secondary-action" type="button"' + (canReauth ? '' : ' disabled') + '>' + folderReauthLabel(state) + '</button>' +
            '<button id="folderChooseBtn" class="primary-action" type="button"' + (supported ? '' : ' disabled') + '>' + tr('chooseFolder') + '</button>' +
            '</div>' +
            '</div>' +
            '<div class="folder-strategy-readonly"><span>' + tr('folderRotation') + '</span><strong>' + tr('strategyRandom') + '</strong></div>' +
            '<div class="folder-notice" id="folderNotice" hidden></div>' +
            '<div class="folder-status" id="folderStatus">' + escapeHtml(folderStatusText()) + '</div>' +
            '</div>';
    }

    function folderErrorMessage(err) {
        var map = {
            FOLDER_UNSUPPORTED: tr('folderUnsupported'),
            FOLDER_PERMISSION_DENIED: tr('folderNeedsPermission'),
            FOLDER_NO_IMAGES: tr('folderEmpty'),
            FOLDER_NO_USABLE_IMAGES: tr('folderNoUsableImages'),
            FOLDER_THUMBNAIL_FAILED: tr('folderPreviewFailed')
        };
        return map[err && err.code] || (err && err.message ? err.message : String(err || tr('folderLoadFailed')));
    }

    function bindFolderConfigEvents() {
        var root = modalContent.querySelector('.folder-config');
        if (!root) return;
        var choose = root.querySelector('#folderChooseBtn');
        var reauth = root.querySelector('#folderReauthBtn');
        if (reauth) {
            reauth.addEventListener('click', function () {
                setFolderButtonState(reauth, true);
                showFolderNotice(tr('folderPreparing'), 'info');
                reauthorizeSavedFolder().then(function () {
                    showFolderNotice(tr('folderReady'), 'success');
                    setFolderStatus();
                    refreshGallery();
                }).catch(function (err) {
                    var message = folderErrorMessage(err);
                    showFolderNotice(message, 'error');
                    setFolderStatus(message);
                }).finally(function () {
                    setFolderButtonState(reauth, false);
                });
            });
        }
        if (!choose) return;
        choose.addEventListener('click', function () {
            if (!WF || !WF.pickDirectory || !WF.prepareMount) {
                showFolderNotice(tr('folderUnsupported'), 'error');
                refreshWallpaperApplyFooter();
                return;
            }
            setFolderButtonState(choose, true);
            showFolderNotice(tr('folderPreparing'), 'info');
            WF.pickDirectory().then(function (handle) {
                return WF.prepareMount(handle, { blur: wallpaperBlur });
            }).then(function (mount) {
                wallpaperDraftFolderMount = mount;
                var draft = currentWallpaperDraft();
                var initialBag = [mount.firstName].concat(mount.shuffleBag || []);
                var previewWindow = mount.previewWindow || buildFolderPreviewWindow(mount.files, '', initialBag, FOLDER_GALLERY_LIMIT);
                draft.activeSource = 'folder';
                draft.providers.folder.config = D.normalizeFolderConfig({
                    pathLabel: mount.pathLabel || '',
                    strategy: 'shuffle'
                });
                draft.providers.folder.state = D.normalizeFolderState({
                    status: 'ready',
                    indexedCount: mount.files.length,
                    completed: mount.completed === true,
                    lastScanAt: Date.now(),
                    lastError: '',
                    shuffleBag: initialBag,
                    previewWindow: previewWindow,
                    permissionStatus: 'granted',
                    usingLightCache: false,
                    lightCacheCount: previewWindow.length,
                    lastPermissionCheckAt: Date.now(),
                    currentName: ''
                });
                wallpaperWorkOrder = {
                    pendingSource: 'folder',
                    pendingConfig: clonePlain(draft.providers.folder.config),
                    baseline: currentWallpaperWorkOrder().baseline,
                    health: { state: 'Ready', reasonKey: 'wallpaperApplyReady', message: '' }
                };
                showFolderNotice(tr('folderReady') + (mount.pathLabel || tr('sourceFolder')), 'success');
                refreshWallpaperDraftTab();
            }).catch(function (err) {
                if (err && err.name === 'AbortError') {
                    showFolderNotice('', 'info');
                    return;
                }
                var message = folderErrorMessage(err);
                showFolderNotice(message, 'error');
                setFolderStatus(message);
                refreshWallpaperApplyFooter();
            }).finally(function () {
                setFolderButtonState(choose, false);
            });
        });
    }

    function rssErrorMessage(err) {
        var code = err && err.code;
        var message = err && err.message ? err.message : String(err || '');
        var map = {
            INVALID_RSS_URL: tr('rssInvalidUrl'),
            NO_RSS_IMAGES: tr('rssNoImages'),
            NO_USABLE_RSS_IMAGES: tr('rssNoUsableImages'),
            RSS_PERMISSION_DENIED: tr('rssPermissionDenied'),
            RSS_PARSE_FAILED: tr('rssParseFailed'),
            RSS_FETCH_FAILED: tr('rssFetchFailed'),
            RSS_TIMEOUT: tr('rssTimeout')
        };
        if (code && map[code]) return map[code];
        if (message === 'invalid url') return map.INVALID_RSS_URL;
        if (message === 'no image entries') return map.NO_RSS_IMAGES;
        if (message === 'no usable images') return map.NO_USABLE_RSS_IMAGES;
        if (message === 'permission denied') return map.RSS_PERMISSION_DENIED;
        if (message === 'feed parse failed') return map.RSS_PARSE_FAILED;
        if (message === 'signal timed out' || message === 'The operation was aborted.' || message === 'AbortError') return map.RSS_TIMEOUT;
        if (message === 'Failed to fetch' || /^HTTP\s+\d+/.test(message)) return map.RSS_FETCH_FAILED;
        return message || map.RSS_FETCH_FAILED;
    }

    function invalidateWallpaperTab() {
        saveTabScroll('wallpaper');
        if (_tabPages.wallpaper) {
            _tabPages.wallpaper.remove();
            delete _tabPages.wallpaper;
            _tabEventBound.wallpaper = false;
        }
        renderTabContent();
    }

    function refreshWallpaperDraftTab() {
        invalidateWallpaperTab();
        refreshWallpaperApplyFooter();
    }

    function saveRssListConfig(config) {
        var savedConfig = D.loadRssConfig ? clonePlain(D.loadRssConfig()) : providerConfigForSource(D.loadWallpaper(), 'rss');
        savedConfig.sources = clonePlain(config.sources || []);
        savedConfig.activeSourceId = config.activeSourceId || '';
        savedConfig = D.normalizeRssConfig ? D.normalizeRssConfig(savedConfig) : savedConfig;
        D.saveRssConfig(savedConfig);
        currentWallpaperDraft().providers.rss.config = clonePlain(config);
        updatePendingSourceConfig('rss', function (pending) {
            pending.sources = clonePlain(config.sources || []);
            pending.activeSourceId = config.activeSourceId || '';
        });
        updatePendingBaselineConfig('rss', function (baseline) {
            baseline.sources = clonePlain(config.sources || []);
            baseline.activeSourceId = config.activeSourceId || '';
        });
    }

    function saveApiListConfig(config) {
        var savedConfig = D.loadApiConfig ? clonePlain(D.loadApiConfig()) : providerConfigForSource(D.loadWallpaper(), 'api');
        savedConfig.imageSources = clonePlain(config.imageSources || []);
        savedConfig.jsonSources = clonePlain(config.jsonSources || []);
        savedConfig.activeImageSourceId = config.activeImageSourceId || '';
        savedConfig.activeJsonSourceId = config.activeJsonSourceId || '';
        savedConfig = D.normalizeApiConfig ? D.normalizeApiConfig(savedConfig) : savedConfig;
        D.saveApiConfig(savedConfig);
        currentWallpaperDraft().providers.api.config = clonePlain(config);
        updatePendingSourceConfig('api', function (pending) {
            pending.imageSources = clonePlain(config.imageSources || []);
            pending.jsonSources = clonePlain(config.jsonSources || []);
            pending.activeImageSourceId = config.activeImageSourceId || '';
            pending.activeJsonSourceId = config.activeJsonSourceId || '';
        });
        updatePendingBaselineConfig('api', function (baseline) {
            baseline.imageSources = clonePlain(config.imageSources || []);
            baseline.jsonSources = clonePlain(config.jsonSources || []);
            baseline.activeImageSourceId = config.activeImageSourceId || '';
            baseline.activeJsonSourceId = config.activeJsonSourceId || '';
        });
    }

    function deletedRunningRssSource(sourceId) {
        if (normalizeDraftSource(D.getActiveSource ? D.getActiveSource() : D.loadWallpaper().activeSource) !== 'rss') return false;
        return activeRssSourceId(D.loadRssConfig ? D.loadRssConfig() : pendingConfigForSource('rss')) === sourceId;
    }

    function deletedRunningApiSource(apiType, sourceId) {
        if (normalizeDraftSource(D.getActiveSource ? D.getActiveSource() : D.loadWallpaper().activeSource) !== 'api') return false;
        var active = activeApiSourceIdentity(D.loadApiConfig ? D.loadApiConfig() : pendingConfigForSource('api'));
        return active.apiType === apiType && active.sourceId === sourceId;
    }

    function switchRunningWallpaperToBing() {
        D.setActiveSource('bing');
        currentMode = 'bing';
        refreshWallpaperWorkOrderBaselineOnly();
        updateModeChip();
        if (window.reloadWallpaper) window.reloadWallpaper();
    }

    function bindRssConfigEvents() {
        var root = modalContent.querySelector('.rss-config');
        if (!root) return;
        var config = pendingConfigForSource('rss');
        var interval = root.querySelector('#rssRefreshInterval');
        var displayMode = root.querySelector('#rssDisplayMode');
        var position = root.querySelector('#rssSummaryPosition');
        var mode = root.querySelector('#rssSummaryMode');
        var showSummary = root.querySelector('#rssShowSummary');
        var showLink = root.querySelector('#rssShowLink');
        var urlInput = root.querySelector('#rssUrlInput');
        if (interval) interval.value = String(config.refreshIntervalMs);
        if (displayMode) displayMode.value = config.displayMode || 'cycle';
        if (position) position.value = config.summaryPosition;
        if (mode) mode.value = config.summaryMode;
        if (showSummary) showSummary.checked = config.showSummary !== false;
        if (showLink) showLink.checked = config.showLink !== false;
        if (urlInput) {
            urlInput.addEventListener('input', function () {
                clearRssValidation();
                syncRssAddButtonState(root);
            });
        }
        syncRssAddButtonState(root);

        root.querySelectorAll('input[name="rssSource"]').forEach(function (radio) {
            radio.addEventListener('change', function () {
                var next = pendingConfigForSource('rss');
                next.activeSourceId = radio.value;
                currentWallpaperDraft().providers.rss.config.activeSourceId = radio.value;
                updatePendingSourceConfig('rss', function (pending) { pending.activeSourceId = radio.value; });
                root.querySelectorAll('.rss-source-row').forEach(function (row) {
                    row.classList.toggle('selected', row.dataset.rssSource === radio.value);
                });
                setRssStatus(rssStatusText(next, D.loadWallpaper().providers.rss.state || {}));
                refreshWallpaperApplyFooter();
            });
        });

        [interval, displayMode, position, mode].forEach(function (el) {
            if (!el) return;
            el.addEventListener('change', function () {
                var next = pendingConfigForSource('rss');
                if (el === interval) next.refreshIntervalMs = parseInt(el.value, 10) || 0;
                if (el === displayMode) next.displayMode = el.value === 'latest' ? 'latest' : 'cycle';
                if (el === position) next.summaryPosition = el.value;
                if (el === mode) next.summaryMode = el.value;
                currentWallpaperDraft().providers.rss.config = clonePlain(next);
                updatePendingSourceConfig('rss', function (pending) {
                    pending.refreshIntervalMs = next.refreshIntervalMs;
                    pending.displayMode = next.displayMode;
                    pending.summaryPosition = next.summaryPosition;
                    pending.summaryMode = next.summaryMode;
                });
                refreshWallpaperApplyFooter();
            });
        });

        [showSummary, showLink].forEach(function (el) {
            if (!el) return;
            el.addEventListener('change', function () {
                var next = pendingConfigForSource('rss');
                if (el === showSummary) next.showSummary = el.checked;
                if (el === showLink) next.showLink = el.checked;
                currentWallpaperDraft().providers.rss.config = clonePlain(next);
                updatePendingSourceConfig('rss', function (pending) {
                    pending.showSummary = next.showSummary;
                    pending.showLink = next.showLink;
                });
                refreshWallpaperApplyFooter();
            });
        });
        syncCustomSelects(root);

        root.addEventListener('click', onRssConfigClick);
    }

    function syncRssAddButtonState(root) {
        var urlInput = root && root.querySelector('#rssUrlInput');
        var addBtn = root && root.querySelector('#rssAddBtn');
        if (!urlInput || !addBtn) return;
        addBtn.disabled = !F.isHttpsUrl(urlInput.value.trim());
    }

    function onRssConfigClick(e) {
        var target = e.target;
        var config = pendingConfigForSource('rss');
        if (target.id === 'rssAddBtn') {
            var name = document.getElementById('rssNameInput').value.trim();
            var url = document.getElementById('rssUrlInput').value.trim();
            if (config.sources.length >= 5) return showRssValidation(tr('rssLimit'));
            if (!F.isHttpsUrl(url)) return showRssValidation(httpsOnlyMessage('rssInvalidUrl', url));
            var id = 'custom-' + F.generateId();
            config.sources.push({
                id: id,
                name: name || url,
                url: url,
                builtIn: false,
                test: { status: 'untested', fieldHash: '', testedAt: 0, imageUrl: '', error: '' }
            });
            config.activeSourceId = id;
            saveRssListConfig(config);
            refreshWallpaperDraftTab();
            return;
        }
        var row = target.closest('.rss-source-row');
        if (!row) return;
        var source = config.sources.filter(function (item) { return item.id === row.dataset.rssSource; })[0];
        if (!source) return;
        if (target.dataset.action === 'delete-rss') {
            var wasRunningRssSource = deletedRunningRssSource(source.id);
            if (wasRunningRssSource && !confirm(tr('wallpaperActiveSourceDeletedConfirm'))) return;
            config.sources = config.sources.filter(function (item) { return item.id !== source.id; });
            if (!config.sources.some(function (item) { return item.id === config.activeSourceId; })) config.activeSourceId = config.sources[0] ? config.sources[0].id : '';
            saveRssListConfig(config);
            if (wasRunningRssSource) {
                switchRunningWallpaperToBing();
            }
            refreshWallpaperDraftTab();
            return;
        }
        if (target.dataset.action === 'test-rss') {
            if (!F.isHttpsUrl(source.url)) {
                showRssValidation(httpsOnlyMessage('rssInvalidUrl', source.url));
                return;
            }
            var testButton = target;
            setRssTestButtonState(testButton, true);
            setRssStatus(tr('rssTesting'));
            showRssNotice(tr('rssTesting'), 'info');
            setPendingSourceHealth('rss', { state: 'Testing', reasonKey: 'wallpaperStatusTesting', message: '' });
            F.testRssSource(source).then(function (result) {
                var test = {
                    status: 'passed',
                    fieldHash: D.rssFieldHash(source),
                    testedAt: Date.now(),
                    imageUrl: result.first && result.first.imageUrl || '',
                    error: ''
                };
                source.test = test;
                syncPendingRssSourceTest(source.id, test);
                setPendingSourceHealth('rss', { state: 'Ready', reasonKey: 'wallpaperApplyReady', message: '' });
                wallpaperDraftRssTestResult = result;
                var message = tr('rssTestOk') + result.count;
                setRssStatus(message);
                showRssNotice(message, 'success');
                refreshWallpaperApplyFooter();
                var passedDot = testButton.closest('.rss-source-row') && testButton.closest('.rss-source-row').querySelector('.source-status-dot');
                if (passedDot) passedDot.classList.add('passed');
            }).catch(function (err) {
                var message = rssErrorMessage(err);
                var test = {
                    status: 'failed',
                    fieldHash: D.rssFieldHash(source),
                    testedAt: Date.now(),
                    imageUrl: '',
                    error: message
                };
                source.test = test;
                syncPendingRssSourceTest(source.id, test);
                setPendingSourceHealth('rss', { state: 'Error', reasonKey: 'wallpaperStatusTestFailed', message: message });
                wallpaperDraftRssTestResult = null;
                setRssStatus(message);
                showRssNotice(message, 'error');
                refreshWallpaperApplyFooter();
                var failedDot = testButton.closest('.rss-source-row') && testButton.closest('.rss-source-row').querySelector('.source-status-dot');
                if (failedDot) failedDot.classList.remove('passed');
            }).finally(function () {
                setRssTestButtonState(testButton, false);
            });
        }
    }

    function bindApiConfigEvents() {
        var root = modalContent.querySelector('.api-config');
        if (!root) return;
        var urlInput = root.querySelector('#apiUrlInput');
        if (urlInput) {
            urlInput.addEventListener('input', function () {
                clearApiValidation();
                syncApiAddButtonState(root);
            });
        }
        syncApiAddButtonState(root);
        root.addEventListener('click', onApiConfigClick);
        root.addEventListener('change', onApiConfigChange);
    }

    function syncApiAddButtonState(root) {
        var urlInput = root && root.querySelector('#apiUrlInput');
        var addBtn = root && root.querySelector('#apiAddBtn');
        if (!urlInput || !addBtn) return;
        var valid = F.isHttpsUrl(urlInput.value.trim());
        addBtn.disabled = !valid;
    }

    function onApiConfigChange(e) {
        var config = pendingConfigForSource('api');
        if (e.target.id === 'apiRefreshInterval') {
            config.refreshIntervalMs = parseInt(e.target.value, 10);
            currentWallpaperDraft().providers.api.config.refreshIntervalMs = config.refreshIntervalMs;
            updatePendingSourceConfig('api', function (pending) { pending.refreshIntervalMs = config.refreshIntervalMs; });
            refreshWallpaperApplyFooter();
            return;
        }
        if (e.target.name === 'apiSource') {
            if (apiEditorOpenType(config) === 'json') config.activeJsonSourceId = e.target.value;
            else config.activeImageSourceId = e.target.value;
            currentWallpaperDraft().providers.api.config = clonePlain(config);
            updatePendingSourceConfig('api', function (pending) {
                pending.activeJsonSourceId = config.activeJsonSourceId;
                pending.activeImageSourceId = config.activeImageSourceId;
            });
            wallpaperDraftApiTestResult = null;
            refreshWallpaperDraftTab();
        }
    }

    function onApiConfigClick(e) {
        var target = e.target;
        var config = pendingConfigForSource('api');
        var apiType = apiEditorOpenType(config);
        var root = target.closest('.api-config');
        var typeTab = target.closest('[data-api-type-tab]');
        if (typeTab) {
            var nextType = typeTab.dataset.apiTypeTab === 'json' ? 'json' : 'image';
            wallpaperDraftApiOpenType = nextType;
            if (updatePendingSourceConfig('api', function (pending) { pending.apiType = nextType; })) {
                currentWallpaperDraft().providers.api.config = clonePlain(currentWallpaperWorkOrder().pendingConfig);
            }
            wallpaperDraftApiTestResult = null;
            refreshWallpaperDraftTab();
            return;
        }
        var refreshBtn = target.closest('[data-api-refresh-interval]');
        if (refreshBtn && root) {
            config.refreshIntervalMs = parseInt(refreshBtn.dataset.apiRefreshInterval, 10);
            currentWallpaperDraft().providers.api.config.refreshIntervalMs = config.refreshIntervalMs;
            updatePendingSourceConfig('api', function (pending) { pending.refreshIntervalMs = config.refreshIntervalMs; });
            root.querySelectorAll('[data-api-refresh-interval]').forEach(function (button) {
                button.classList.toggle('active', button === refreshBtn);
            });
            refreshWallpaperApplyFooter();
            return;
        }
        if (target.id === 'apiAddBtn') {
            var name = document.getElementById('apiNameInput').value.trim();
            var url = document.getElementById('apiUrlInput').value.trim();
            var pathEl = document.getElementById('apiJsonPathInput');
            var list = apiType === 'json' ? config.jsonSources : config.imageSources;
            if (list.length >= 5) return showApiValidation(tr('apiLimit'));
            if (!F.isHttpsUrl(url)) return showApiValidation(httpsOnlyMessage('apiInvalidUrl', url));
            var id = apiType + '-' + F.generateId();
            var source = {
                id: id,
                name: name || url,
                url: url,
                test: { status: 'untested', fieldHash: '', testedAt: 0, imageUrl: '', error: '' }
            };
            if (apiType === 'json') source.jsonPath = pathEl ? pathEl.value.trim() : '';
            list.push(source);
            if (apiType === 'json') config.activeJsonSourceId = id;
            else config.activeImageSourceId = id;
            saveApiListConfig(config);
            wallpaperDraftApiTestResult = null;
            refreshWallpaperDraftTab();
            return;
        }
        var row = target.closest('.api-source-row');
        if (!row) return;
        var listForRow = row.dataset.apiType === 'json' ? config.jsonSources : config.imageSources;
        var sourceForRow = listForRow.filter(function (item) { return item.id === row.dataset.apiSource; })[0];
        if (!sourceForRow) return;
        if (target.dataset.action === 'delete-api') {
            var wasRunningApiSource = deletedRunningApiSource(row.dataset.apiType, sourceForRow.id);
            if (wasRunningApiSource && !confirm(tr('wallpaperActiveSourceDeletedConfirm'))) return;
            listForRow.splice(listForRow.indexOf(sourceForRow), 1);
            if (row.dataset.apiType === 'json') config.activeJsonSourceId = listForRow[0] ? listForRow[0].id : '';
            else config.activeImageSourceId = listForRow[0] ? listForRow[0].id : '';
            saveApiListConfig(config);
            if (wasRunningApiSource) {
                switchRunningWallpaperToBing();
            }
            wallpaperDraftApiTestResult = null;
            refreshWallpaperDraftTab();
            return;
        }
        if (target.dataset.action === 'test-api') {
            runApiSourceTest(sourceForRow, row.dataset.apiType, target);
        }
    }

    function showApiNotice(message, type) {
        var el = document.getElementById('apiNotice');
        if (!el) return;
        clearTimeout(apiNoticeTimer);
        apiNoticeTimer = null;
        apiNoticeToken += 1;
        el.textContent = message || '';
        el.dataset.type = type || 'info';
        delete el.dataset.validation;
        el.hidden = !message;
    }

    function showApiValidation(message) {
        showApiNotice(message, 'error');
        var el = document.getElementById('apiNotice');
        var token = apiNoticeToken;
        if (el) el.dataset.validation = 'true';
        apiNoticeTimer = setTimeout(function () {
            if (token === apiNoticeToken) clearApiValidation();
        }, 4000);
    }

    function clearApiValidation() {
        var el = document.getElementById('apiNotice');
        if (!el || el.dataset.validation !== 'true') return;
        showApiNotice('', 'info');
    }

    function apiErrorMessage(err) {
        var map = {
            INVALID_API_URL: tr('apiInvalidUrl'),
            API_AUTH_REQUIRED: tr('apiAuthRequired'),
            API_CORS_OR_NETWORK: tr('apiCorsFailed'),
            API_TIMEOUT: tr('apiTimeout'),
            API_JSON_PARSE_FAILED: tr('apiJsonParseFailed'),
            API_JSON_PATH_FAILED: tr('apiJsonPathFailed'),
            API_NOT_IMAGE: tr('apiNotImage'),
            API_IMAGE_DOWNLOAD_FAILED: tr('apiImageDownloadFailed')
        };
        return map[err && err.code] || (err && err.message ? err.message : String(err || tr('apiLoadFailed')));
    }

    function runApiSourceTest(source, apiType, button) {
        button.disabled = true;
        button.classList.add('testing');
        showApiNotice(tr('rssTesting'), 'info');
        setPendingSourceHealth('api', { state: 'Testing', reasonKey: 'wallpaperStatusTesting', message: '' });
        F.testApiSource(source, apiType).then(function (result) {
            var test = {
                status: 'passed',
                fieldHash: D.apiFieldHash(source, apiType),
                testedAt: Date.now(),
                imageUrl: result.imageUrl || '',
                error: ''
            };
            source.test = test;
            syncPendingApiSourceTest(apiType, source.id, test);
            setPendingSourceHealth('api', { state: 'Ready', reasonKey: 'wallpaperApplyReady', message: '' });
            wallpaperDraftApiTestResult = result;
            showApiNotice(tr('apiTestOk'), 'success');
            refreshWallpaperApplyFooter();
            var passedDot = button.closest('.api-source-row') && button.closest('.api-source-row').querySelector('.source-status-dot');
            if (passedDot) passedDot.classList.add('passed');
        }).catch(function (err) {
            var message = apiErrorMessage(err);
            var test = {
                status: 'failed',
                fieldHash: D.apiFieldHash(source, apiType),
                testedAt: Date.now(),
                imageUrl: '',
                error: message
            };
            source.test = test;
            syncPendingApiSourceTest(apiType, source.id, test);
            setPendingSourceHealth('api', { state: 'Error', reasonKey: 'wallpaperStatusTestFailed', message: message });
            wallpaperDraftApiTestResult = null;
            showApiNotice(message, 'error');
            refreshWallpaperApplyFooter();
            var failedDot = button.closest('.api-source-row') && button.closest('.api-source-row').querySelector('.source-status-dot');
            if (failedDot) failedDot.classList.remove('passed');
        }).finally(function () {
            button.disabled = false;
            button.classList.remove('testing');
        });
    }

    function buildShortcutsHTML() {
        var hkNormal = loadPaletteHotkey();
        var hkHidden = loadPaletteHiddenHotkey();
        var checked = loadPaletteRecommend() ? ' checked' : '';
        var placement = loadPalettePlacement();
        var placementControl = '<select id="cpPlacement">' +
            '<option value="follow"' + (placement === 'follow' ? ' selected' : '') + '>' + tr('cpPlacementFollow') + '</option>' +
            '<option value="fixed"' + (placement === 'fixed' ? ' selected' : '') + '>' + tr('cpPlacementFixed') + '</option>' +
            '</select>';
        var skin = loadPaletteSkin();
        var skinControl = '<select id="cpSkin">' +
            '<option value="default"' + (skin === 'default' ? ' selected' : '') + '>' + tr('cpSkinDefault') + '</option>' +
            '<option value="terminal"' + (skin === 'terminal' ? ' selected' : '') + '>' + tr('cpSkinTerminal') + '</option>' +
            '<option value="shell"' + (skin === 'shell' ? ' selected' : '') + '>' + tr('cpSkinShell') + '</option>' +
            '<option value="command-terminal"' + (skin === 'command-terminal' ? ' selected' : '') + '>' + tr('cpSkinCommandTerminal') + '</option>' +
            '</select>';

        var body =
            settingGroup(tr('cpGroupAppearance'),
            settingItem(tr('cpSkinLabel'), modalCopy('modalDescPaletteSkin'), skinControl, 'setting-compact')) +
            settingGroup(tr('cpGroupOpen'),
            settingItem(tr('cpPlacementLabel'), modalCopy('modalDescPalettePlacement'), placementControl, 'setting-compact') +
            settingItem(tr('cpHotkeyLabel'), modalCopy('modalDescHotkey'), '<input type="text" class="hotkey-input" id="hkNormal" value="' + hkNormal + '" readonly>') +
            settingItem(tr('cpHiddenHotkeyLabel'), modalCopy('modalDescHiddenHotkey'), '<input type="text" class="hotkey-input" id="hkHidden" value="' + hkHidden + '" readonly>')) +
            settingGroup(tr('cpGroupContent'),
            settingItem(tr('cpRecommendLabel'), modalCopy('modalDescRecommend'), '<label class="switch-control"><input type="checkbox" id="cpRecommend"' + checked + '><span></span></label>', 'setting-compact')) +
            '<div class="settings-actions"><button class="reset-defaults-btn" id="shortcutsResetBtn" type="button">' + tr('resetShortcutsDefaults') + '</button></div>';

        return buildPageShell(tr('tabShortcuts'), modalCopy('modalSubtitleShortcuts'), body);
    }

    function bindShortcutsEvents() {
        var hkNormalEl = document.getElementById('hkNormal');
        var hkHiddenEl = document.getElementById('hkHidden');
        var cpRec = document.getElementById('cpRecommend');
        var cpPlacement = document.getElementById('cpPlacement');
        var cpSkin = document.getElementById('cpSkin');
        var resetBtn = document.getElementById('shortcutsResetBtn');

        if (hkNormalEl) hkNormalEl.addEventListener('click', function () { startRecording('normal', hkNormalEl); });
        if (hkHiddenEl) hkHiddenEl.addEventListener('click', function () { startRecording('hidden', hkHiddenEl); });
        if (cpPlacement) cpPlacement.addEventListener('change', function () {
            savePalettePlacement(cpPlacement.value);
            if (window.Palette && window.Palette.refresh) window.Palette.refresh();
        });
        if (cpSkin) cpSkin.addEventListener('change', function () {
            savePaletteSkin(cpSkin.value);
            if (window.Palette && window.Palette.refresh) window.Palette.refresh();
        });
        if (cpRec) cpRec.addEventListener('change', function () {
            savePaletteRecommend(cpRec.checked);
        });
        if (resetBtn) resetBtn.addEventListener('click', function () {
            if (!confirm(tr('resetShortcutsConfirm'))) return;
            resetShortcutsDefaults();
        });
    }

    function buildDataHTML() {
        var jsonControl = '<button class="primary-action" id="dataExportJsonBtn" type="button">' + tr('dataExportJson') + '</button>';
        var encryptedControl = '<div class="data-inline-control"><input id="dataExportPass" type="password" autocomplete="new-password" placeholder="' + tr('dataPassphrase') + '"><button class="primary-action" id="dataExportEncryptedBtn" type="button">' + tr('dataExportEncrypted') + '</button></div>';
        var importControl = '<button class="primary-action" id="dataImportChooseBtn" type="button">' + tr('dataChooseFile') + '</button><span class="data-file-name" id="dataImportFileName"></span>';
        var importPassControl = '<input id="dataImportPass" type="password" autocomplete="current-password" placeholder="' + tr('dataPassphrase') + '">';
        var body = settingGroup(tr('dataExport'),
            settingItem('JSON', modalCopy('modalDescDataJson'), jsonControl, 'setting-compact') +
            settingItem(tr('dataEncrypted'), modalCopy('modalDescDataEncrypted'), encryptedControl)) +
            settingGroup(tr('dataImport'),
            settingItem(tr('dataBackupFile'), modalCopy('modalDescDataImport'), importControl, 'setting-compact') +
            settingItem(tr('dataImportPass'), modalCopy('modalDescDataImportPass'), importPassControl, 'setting-compact')) +
            '<div class="data-status" id="dataStatus" hidden></div>';
        return buildPageShell(tr('tabData'), modalCopy('modalSubtitleData'), body);
    }

    function buildRestoreHTML() {
        var searchControl = '<button class="reset-defaults-btn" id="restoreSearchBtn" type="button">' + tr('resetSearchDefaults') + '</button>';
        var appearanceControl = '<button class="reset-defaults-btn" id="restoreAppearanceBtn" type="button">' + tr('resetAppearanceDefaults') + '</button>';
        var wallpaperControl = '<button class="danger-action" id="restoreWallpaperBtn" type="button">' + tr('wallpaperResetDefaults') + '</button>';
        var shortcutsControl = '<button class="reset-defaults-btn" id="restoreShortcutsBtn" type="button">' + tr('resetShortcutsDefaults') + '</button>';
        var allControl = '<button class="danger-action" id="restoreAllBtn" type="button">' + tr('resetAllDefaults') + '</button>';
        var body =
            settingGroup(tr('settingsGroupRestoreScoped'),
            settingItem(tr('tabAppearance'), modalCopy('modalDescResetAppearance'), appearanceControl, 'setting-compact') +
            settingItem(tr('tabSearch'), modalCopy('modalDescResetSearch'), searchControl, 'setting-compact') +
            settingItem(tr('tabWallpaper'), modalCopy('modalDescResetWallpaper'), wallpaperControl, 'setting-compact') +
            settingItem(tr('tabShortcuts'), modalCopy('modalDescResetShortcuts'), shortcutsControl, 'setting-compact')) +
            settingGroup(tr('settingsGroupRestoreGlobal'),
            settingItem(tr('resetAllDefaults'), modalCopy('modalDescResetAll'), allControl, 'setting-compact'));
        return buildPageShell(tr('tabRestore'), modalCopy('modalSubtitleRestore'), body);
    }

    function bindRestoreEvents() {
        var searchBtn = document.getElementById('restoreSearchBtn');
        var appearanceBtn = document.getElementById('restoreAppearanceBtn');
        var wallpaperBtn = document.getElementById('restoreWallpaperBtn');
        var shortcutsBtn = document.getElementById('restoreShortcutsBtn');
        var allBtn = document.getElementById('restoreAllBtn');

        if (appearanceBtn) appearanceBtn.addEventListener('click', function () {
            if (!confirm(tr('resetAppearanceConfirm'))) return;
            resetAppearanceDefaults();
        });
        if (searchBtn) searchBtn.addEventListener('click', function () {
            if (!confirm(tr('resetSearchConfirm'))) return;
            resetSearchDefaults();
        });
        if (wallpaperBtn) wallpaperBtn.addEventListener('click', function () {
            if (!confirm(tr('wallpaperResetConfirm'))) return;
            resetWallpaperDefaults();
        });
        if (shortcutsBtn) shortcutsBtn.addEventListener('click', function () {
            if (!confirm(tr('resetShortcutsConfirm'))) return;
            resetShortcutsDefaults();
        });
        if (allBtn) allBtn.addEventListener('click', function () {
            if (!confirm(tr('resetAllConfirm'))) return;
            resetAllDefaults();
        });
    }

    function buildPermissionsHTML() {
        var webAccessControl = '<section class="permission-card" id="webAccessCard" data-state="checking">' +
            '<div class="permission-card-header">' +
            '<div class="permission-card-copy">' +
            '<span class="permission-eyebrow">' + tr('permissionGroupWebAccess') + '</span>' +
            '<h3>' + tr('webAccessTitle') + '</h3>' +
            '<p>' + modalCopy('modalDescWebAccess') + '</p>' +
            '</div>' +
            '<span class="permission-state" id="webAccessState" data-type="info">' + tr('webAccessChecking') + '</span>' +
            '</div>' +
            '<div class="permission-uses" aria-label="' + tr('permissionUsesLabel') + '">' +
            '<span>' + tr('permissionUseShortcut') + '</span>' +
            '<span>' + tr('permissionUseRss') + '</span>' +
            '<span>' + tr('permissionUseApi') + '</span>' +
            '</div>' +
            '<div class="permission-note">' + tr('webAccessHint') + '</div>' +
            '<div class="permission-control">' +
            '<button class="primary-action" id="webAccessGrantBtn" type="button">' + tr('webAccessGrant') + '</button>' +
            '<button class="permission-revoke-action" id="webAccessRevokeBtn" type="button">' + tr('webAccessRevoke') + '</button>' +
            '</div>' +
            '</section>';
        var body = webAccessControl +
            '<div class="permission-status" id="permissionsStatus" hidden></div>';
        return buildPageShell(tr('tabPermissions'), modalCopy('modalSubtitlePermissions'), body);
    }

    function bindDataEvents() {
        var jsonBtn = document.getElementById('dataExportJsonBtn');
        var encryptedBtn = document.getElementById('dataExportEncryptedBtn');
        var chooseBtn = document.getElementById('dataImportChooseBtn');
        var fileName = document.getElementById('dataImportFileName');
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,.ptab,application/json';
        if (_tabPages.data) _tabPages.data.appendChild(input);

        if (jsonBtn) jsonBtn.addEventListener('click', exportPlainDataBackup);
        if (encryptedBtn) encryptedBtn.addEventListener('click', exportEncryptedDataBackup);
        if (chooseBtn) chooseBtn.addEventListener('click', function () { input.click(); });
        input.addEventListener('change', function () {
            var file = input.files && input.files[0];
            input.value = '';
            if (!file) return;
            if (fileName) fileName.textContent = file.name;
            importDataBackup(file);
        });
    }

    function bindPermissionsEvents() {
        var grantBtn = document.getElementById('webAccessGrantBtn');
        var revokeBtn = document.getElementById('webAccessRevokeBtn');
        if (grantBtn) grantBtn.addEventListener('click', grantAllHttpsAccess);
        if (revokeBtn) revokeBtn.addEventListener('click', revokeAllHttpsAccess);
        refreshAllHttpsAccessState();
    }

    function hasPermissionApi() {
        return !!(IS_EXTENSION && chrome.permissions && chrome.permissions.contains);
    }

    function setWebAccessStatus(message, type) {
        var stateEl = document.getElementById('webAccessState');
        if (!stateEl) return;
        stateEl.textContent = message || '';
        stateEl.dataset.type = type || 'info';
    }

    function updateWebAccessControls(granted, disabled) {
        var card = document.getElementById('webAccessCard');
        var grantBtn = document.getElementById('webAccessGrantBtn');
        var revokeBtn = document.getElementById('webAccessRevokeBtn');
        if (grantBtn) grantBtn.disabled = !!disabled || !!granted;
        if (grantBtn) grantBtn.hidden = !!granted;
        if (revokeBtn) revokeBtn.disabled = !!disabled || !granted;
        if (revokeBtn) revokeBtn.hidden = !granted;
        if (card) card.dataset.state = disabled ? 'checking' : (granted ? 'granted' : 'ondemand');
        if (granted) setWebAccessStatus(tr('webAccessEnabled'), 'success');
        else setWebAccessStatus(tr('webAccessDisabled'), 'info');
    }

    function refreshAllHttpsAccessState() {
        if (!hasPermissionApi()) {
            updateWebAccessControls(false, true);
            setWebAccessStatus(tr('webAccessUnsupported'), 'info');
            return;
        }
        chrome.permissions.contains({ origins: [HTTPS_ALL_ORIGIN] }, function (granted) {
            updateWebAccessControls(!!granted, false);
        });
    }

    function grantAllHttpsAccess() {
        if (!hasPermissionApi() || !chrome.permissions.request) {
            refreshAllHttpsAccessState();
            return;
        }
        updateWebAccessControls(false, true);
        setWebAccessStatus(tr('webAccessRequesting'), 'info');
        chrome.permissions.request({ origins: [HTTPS_ALL_ORIGIN] }, function (granted) {
            updateWebAccessControls(!!granted, false);
            setPermissionsStatus(granted ? tr('webAccessGrantOk') : tr('webAccessGrantCanceled'), granted ? 'success' : 'info');
        });
    }

    function revokeAllHttpsAccess() {
        if (!hasPermissionApi() || !chrome.permissions.remove) {
            refreshAllHttpsAccessState();
            return;
        }
        updateWebAccessControls(true, true);
        chrome.permissions.remove({ origins: [HTTPS_ALL_ORIGIN] }, function (removed) {
            updateWebAccessControls(!removed, false);
            setPermissionsStatus(removed ? tr('webAccessRevokeOk') : tr('webAccessRevokeFailed'), removed ? 'success' : 'info');
        });
    }

    function clearPermissionsStatus() {
        setPermissionsStatus('', 'info');
    }

    function setPermissionsStatus(message, type) {
        var el = document.getElementById('permissionsStatus');
        if (!el) return;
        el.textContent = message || '';
        el.dataset.type = type || 'info';
        el.hidden = !message;
    }

    function setDataStatus(message, type) {
        var el = document.getElementById('dataStatus');
        if (!el) return;
        el.textContent = message || '';
        el.dataset.type = type || 'info';
        el.hidden = !message;
    }

    function backupDateStamp() {
        return new Date().toISOString().slice(0, 10);
    }

    function downloadText(filename, text, type) {
        var blob = new Blob([text], { type: type || 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        setTimeout(function () { URL.revokeObjectURL(url); }, 0);
    }

    function readFileAsText(file) {
        return new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onload = function () { resolve(String(reader.result || '')); };
            reader.onerror = function () { reject(reader.error || new Error('file read failed')); };
            reader.readAsText(file);
        });
    }

    function bytesToBase64(bytes) {
        var binary = '';
        var chunk = 0x8000;
        for (var i = 0; i < bytes.length; i += chunk) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
        }
        return btoa(binary);
    }

    function base64ToBytes(value) {
        var binary = atob(String(value || ''));
        var bytes = new Uint8Array(binary.length);
        for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return bytes;
    }

    function compressBackupBytes(bytes) {
        if (!window.CompressionStream) return Promise.resolve({ bytes: bytes, compression: 'none' });
        try {
            var stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
            return new Response(stream).arrayBuffer().then(function (buffer) {
                return { bytes: new Uint8Array(buffer), compression: 'gzip' };
            }).catch(function () {
                return { bytes: bytes, compression: 'none' };
            });
        } catch (e) {
            return Promise.resolve({ bytes: bytes, compression: 'none' });
        }
    }

    function decompressBackupBytes(bytes, compression) {
        if (!compression || compression === 'none') return Promise.resolve(bytes);
        if (compression !== 'gzip' || !window.DecompressionStream) return Promise.reject(new Error('unsupported compression'));
        try {
            var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
            return new Response(stream).arrayBuffer().then(function (buffer) {
                return new Uint8Array(buffer);
            });
        } catch (e) {
            return Promise.reject(e);
        }
    }

    function deriveBackupKey(passphrase, salt, iterations) {
        var encoded = new TextEncoder().encode(passphrase);
        return crypto.subtle.importKey('raw', encoded, 'PBKDF2', false, ['deriveKey']).then(function (baseKey) {
            return crypto.subtle.deriveKey({
                name: 'PBKDF2',
                salt: salt,
                iterations: iterations,
                hash: 'SHA-256'
            }, baseKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
        });
    }

    function exportPlainDataBackup() {
        try {
            var payload = D.exportUserData();
            downloadText('plaintab-config-' + backupDateStamp() + '.json', JSON.stringify(payload, null, 2), 'application/json');
            setDataStatus(tr('dataExportOk'), 'success');
        } catch (e) {
            setDataStatus(tr('dataExportFailed') + (e && e.message ? e.message : String(e)), 'error');
        }
    }

    function exportEncryptedDataBackup() {
        var pass = (document.getElementById('dataExportPass') || {}).value || '';
        if (!pass) {
            setDataStatus(tr('dataPassRequired'), 'error');
            return;
        }
        if (!window.crypto || !crypto.subtle || !window.TextEncoder) {
            setDataStatus(tr('dataCryptoUnsupported'), 'error');
            return;
        }
        setDataStatus(tr('dataExporting'), 'info');
        var payload = D.exportUserData();
        var json = JSON.stringify(payload);
        var bytes = new TextEncoder().encode(json);
        var salt = crypto.getRandomValues(new Uint8Array(16));
        var iv = crypto.getRandomValues(new Uint8Array(12));
        var iterations = BACKUP_KDF_ITERATIONS;
        compressBackupBytes(bytes).then(function (compressed) {
            return deriveBackupKey(pass, salt, iterations).then(function (key) {
                return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, compressed.bytes).then(function (cipherBuffer) {
                    var wrapper = {
                        app: 'PlainTab',
                        format: 'plaintab-user-config',
                        formatVersion: 1,
                        encrypted: true,
                        algorithm: 'AES-GCM',
                        kdf: 'PBKDF2-SHA256',
                        iterations: iterations,
                        compression: compressed.compression,
                        exportedAt: payload.exportedAt,
                        salt: bytesToBase64(salt),
                        iv: bytesToBase64(iv),
                        data: bytesToBase64(new Uint8Array(cipherBuffer))
                    };
                    downloadText('plaintab-config-' + backupDateStamp() + '.ptab', JSON.stringify(wrapper), 'application/octet-stream');
                    setDataStatus(tr('dataExportOk'), 'success');
                });
            });
        }).catch(function (e) {
            setDataStatus(tr('dataExportFailed') + (e && e.message ? e.message : String(e)), 'error');
        });
    }

    function decryptDataBackup(wrapper, passphrase) {
        if (!passphrase) return Promise.reject(new Error(tr('dataPassRequired')));
        if (!window.crypto || !crypto.subtle || !window.TextDecoder) return Promise.reject(new Error(tr('dataCryptoUnsupported')));
        var salt = base64ToBytes(wrapper.salt);
        var iv = base64ToBytes(wrapper.iv);
        var cipher = base64ToBytes(wrapper.data);
        var iterations = parseInt(wrapper.iterations, 10) || BACKUP_KDF_ITERATIONS;
        return deriveBackupKey(passphrase, salt, iterations).then(function (key) {
            return crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, cipher);
        }).then(function (plainBuffer) {
            return decompressBackupBytes(new Uint8Array(plainBuffer), wrapper.compression);
        }).then(function (plainBytes) {
            return JSON.parse(new TextDecoder().decode(plainBytes));
        });
    }

    function validateBackupPayload(payload) {
        if (!payload || typeof payload !== 'object') throw new Error(tr('dataInvalidBackup'));
        if (payload.app && payload.app !== 'PlainTab') throw new Error(tr('dataInvalidBackup'));
        if (!payload.data || typeof payload.data !== 'object') throw new Error(tr('dataInvalidBackup'));
        return payload;
    }

    function refreshAfterDataImport() {
        currentMode = D.compatMode ? D.compatMode(D.getActiveSource()) : D.getActiveSource();
        currentLang = D.loadLocale() || currentLang;
        if (!I18N[currentLang]) currentLang = 'en';
        loadSettings();
        updateLangUI();
        refreshGallery();
        refreshGeneratedTabPages();
        if (window.Palette && window.Palette.refresh) window.Palette.refresh();
        if (window.reloadWallpaper) window.reloadWallpaper();
    }

    function importDataBackup(file) {
        setDataStatus(tr('dataImporting'), 'info');
        readFileAsText(file).then(function (text) {
            var parsed = JSON.parse(text);
            if (parsed && parsed.encrypted === true) {
                var pass = (document.getElementById('dataImportPass') || {}).value || '';
                return decryptDataBackup(parsed, pass);
            }
            return parsed;
        }).then(function (payload) {
            validateBackupPayload(payload);
            D.importUserData(payload);
            refreshAfterDataImport();
            setDataStatus(tr('dataImportOk'), 'success');
        }).catch(function (e) {
            setDataStatus(tr('dataImportFailed') + (e && e.message ? e.message : String(e)), 'error');
        });
    }

    function buildAboutHTML() {
        return buildPageShell(tr('tabAbout'), modalCopy('modalSubtitleAbout'),
            '<div class="about-section">' +
            '<div class="about-name">PlainTab</div>' +
            '<div class="about-version">v3.2.0</div>' +
            '<p class="about-desc">' + tr('aboutDesc') + '</p>' +
            '<a class="about-link" href="https://github.com/kaininx/PlainTab" target="_blank">github.com/kaininx/PlainTab</a>' +
            '<div class="about-footer">' + tr('aboutFooter') + '</div>' +
            '</div>');
    }

    // ================================================================
    // Tab switching
    // ================================================================
    function switchTab(tabName) {
        closeCustomSelects();
        if (activeTab === 'permissions' && tabName !== 'permissions') clearPermissionsStatus();
        activeTab = tabName;
        var tabs = modalWindow.querySelectorAll('.modal-tab');
        tabs.forEach(function (t) { t.classList.toggle('active', t.dataset.tab === tabName); });
        renderTabContent();
    }

    // ================================================================
    // 搜索 & 界面设置
    // ================================================================
    function clampNumber(value, min, max, fallback) {
        var parsed = parseFloat(value);
        if (!isFinite(parsed)) parsed = fallback;
        return Math.min(max, Math.max(min, parsed));
    }

    function clampInteger(value, min, max, fallback) {
        return Math.round(clampNumber(value, min, max, fallback));
    }

    function validValue(value, allowed, fallback) {
        return allowed.indexOf(value) !== -1 ? value : fallback;
    }

    function normalizeHexColor(value, fallback) {
        var raw = String(value || '').trim();
        var match = raw.match(/^#?([0-9a-f]{6})$/i);
        return match ? '#' + match[1].toLowerCase() : fallback;
    }

    function hexToRgb(value) {
        var normalized = normalizeHexColor(value, '');
        if (!normalized) return null;
        var hex = normalized.slice(1);
        return [
            parseInt(hex.slice(0, 2), 16),
            parseInt(hex.slice(2, 4), 16),
            parseInt(hex.slice(4, 6), 16)
        ].join(', ');
    }

    function searchPositionParts(value, fallbackAlign) {
        var allowed = {
            'edge-top': ['edge-top', 'center'],
            top: ['top', 'center'],
            upper: ['upper', 'center'],
            'center-upper': ['center-upper', 'center'],
            center: ['center', 'center'],
            'center-lower': ['center-lower', 'center'],
            lower: ['lower', 'center'],
            bottom: ['bottom', 'center'],
            'edge-bottom': ['edge-bottom', 'center']
        };
        if (allowed[value]) return { value: value, row: allowed[value][0], align: allowed[value][1] };

        var legacyRows = {
            top: 'top',
            'top-left': 'top',
            'top-center': 'top',
            'top-right': 'top',
            upper: 'upper',
            'center-left': 'center',
            center: 'center',
            'center-right': 'center',
            lower: 'lower',
            bottom: 'bottom',
            'bottom-left': 'bottom',
            'bottom-center': 'bottom',
            'bottom-right': 'bottom',
            'edge-bottom': 'edge-bottom'
        };
        var row = legacyRows[value] || 'center';
        return { value: row, row: row, align: DEFAULT_SEARCH_ALIGN };
    }

    function applySearchMode(mode) {
        searchMode = validValue(mode, ['hover', 'always', 'never'], DEFAULT_SEARCH_MODE);
        searchBar.classList.toggle('visible', searchMode === 'always');
        searchBar.setAttribute('data-visibility', searchMode);
        saveAllSettings();
    }

    function applySearchHistoryLimit(value) {
        searchHistoryLimit = D.normalizeSearchHistoryLimit ? D.normalizeSearchHistoryLimit(value) : (parseInt(value, 10) === 10 ? 10 : (parseInt(value, 10) === 0 ? 0 : 5));
        if (isHydratingSettings) return;
        var ui = D.loadUI();
        if (!ui.search) ui.search = {};
        ui.search.historyLimit = searchHistoryLimit;
        if (searchHistoryLimit === 0) ui.search.historyItems = [];
        else if (D.normalizeSearchHistory) ui.search.historyItems = D.normalizeSearchHistory(ui.search.historyItems, searchHistoryLimit);
        D.saveUI(ui);
        saveAllSettings();
    }

    function applySearchPosition(pos) {
        var parts = searchPositionParts(pos, searchAlign);
        searchPosition = parts.value;
        searchAlign = parts.align;
        searchBar.setAttribute('data-position', searchPosition);
        searchBar.setAttribute('data-align', searchAlign);
        saveAllSettings();
    }

    function applySearchIconPosition(value) {
        searchIconPosition = validValue(value, ['left', 'right'], DEFAULT_SEARCH_ICON_POSITION);
        searchBar.setAttribute('data-icon-position', searchIconPosition);
        saveAllSettings();
    }

    function applySearchIconVisibility(value) {
        searchIconVisibility = validValue(value, ['always', 'hidden'], DEFAULT_SEARCH_ICON_VISIBILITY);
        searchBar.setAttribute('data-icon-visibility', searchIconVisibility);
        saveAllSettings();
    }

    function applySearchSurface(value) {
        searchSurface = validValue(value, ['glass', 'solid', 'outline', 'clean', 'theme', 'light'], DEFAULT_SEARCH_SURFACE);
        searchBar.setAttribute('data-surface', searchSurface);
        saveAllSettings();
    }

    function applySearchShadow(value) {
        searchShadow = validValue(value, ['none', 'soft', 'standard'], DEFAULT_SEARCH_SHADOW);
        searchBar.setAttribute('data-shadow', searchShadow);
        saveAllSettings();
    }

    function applySearchPlaceholder(value) {
        searchPlaceholder = String(value || '').trim().slice(0, 80);
        var input = document.getElementById('searchInput');
        if (input) input.placeholder = searchPlaceholder || t('searchPlaceholder');
        saveAllSettings();
    }

    function applySearchEnterBehavior(value) {
        searchEnterBehavior = validValue(value, ['current', 'newtab'], DEFAULT_SEARCH_ENTER_BEHAVIOR);
        saveAllSettings();
    }

    function applySearchWidth(value) {
        searchWidth = clampInteger(value, 360, 760, DEFAULT_SEARCH_WIDTH);
        document.documentElement.style.setProperty('--search-width', searchWidth + 'px');
        saveAllSettings();
    }

    function applySearchBackgroundOpacity(value) {
        searchBackgroundOpacity = clampNumber(value, 0.04, 0.32, DEFAULT_SEARCH_BG_OPACITY);
        searchBackgroundOpacity = parseFloat(searchBackgroundOpacity.toFixed(2));
        document.documentElement.style.setProperty('--search-bg-opacity', searchBackgroundOpacity);
        document.documentElement.style.setProperty('--search-solid-bg-opacity', (0.48 + searchBackgroundOpacity).toFixed(2));
        document.documentElement.style.setProperty('--search-outline-bg-opacity', (searchBackgroundOpacity * 0.45).toFixed(2));
        saveAllSettings();
    }

    function applySearchBlur(value) {
        searchBlur = clampInteger(value, 0, 40, DEFAULT_SEARCH_BLUR);
        document.documentElement.style.setProperty('--search-blur', searchBlur + 'px');
        saveAllSettings();
    }

    function applySearchRadius(radius) {
        searchRadius = validValue(radius, ['capsule', 'rounded', 'sharp'], DEFAULT_SEARCH_RADIUS);
        var radii = { capsule: '28px', rounded: '12px', sharp: '4px' };
        searchBar.style.borderRadius = radii[searchRadius] || radii[DEFAULT_SEARCH_RADIUS];
        saveAllSettings();
    }

    function applyWallpaperFit(value) {
        wallpaperFit = validValue(value, ['cover', 'contain', '100% 100%'], DEFAULT_WALLPAPER_FIT);
        document.documentElement.style.setProperty('--wallpaper-fit', wallpaperFit);
        saveAllSettings();
    }

    function applyWallpaperPosition(value) {
        wallpaperPosition = validValue(value, ['center', 'top', 'bottom', 'left', 'right'], DEFAULT_WALLPAPER_POSITION);
        document.documentElement.style.setProperty('--wallpaper-position', wallpaperPosition);
        saveAllSettings();
    }

    function normalizeWallpaperBlur(value) {
        var normalized = clampInteger(value, 0, DEFAULT_WALLPAPER_BLUR_MAX, DEFAULT_WALLPAPER_BLUR);
        if (normalized > 0 && normalized < 5) return 5;
        return normalized;
    }

    function setWallpaperBlurCss(value) {
        document.documentElement.style.setProperty('--wallpaper-blur', value + 'px');
    }

    function syncWallpaperBlurPerformanceMode() {
        var active = wallpaperBlur >= 5;
        if (document.documentElement && document.documentElement.classList) {
            document.documentElement.classList.toggle('wallpaper-blur-active', active);
        }
    }

    function queueWallpaperBlurSave() {
        clearTimeout(wallpaperBlurSaveTimer);
        wallpaperBlurSaveTimer = setTimeout(function () {
            saveAllSettings();
            wallpaperBlurSaveTimer = null;
        }, 260);
    }

    function applyWallpaperBlur(value, options) {
        wallpaperBlur = normalizeWallpaperBlur(value);
        if (options && options.preview) {
            setWallpaperBlurCss(wallpaperBlur);
            syncWallpaperBlurPerformanceMode();
            if (!isHydratingSettings) {
                refreshVisibleBlurPreview();
                saveNextPreviewFromOrder(D.loadOrder(), D.loadThumbs());
                scheduleNextBlurPreviewFromOrder(D.loadOrder());
            }
            queueWallpaperBlurSave();
            return;
        }
        clearTimeout(wallpaperBlurSaveTimer);
        wallpaperBlurSaveTimer = null;
        setWallpaperBlurCss(wallpaperBlur);
        syncWallpaperBlurPerformanceMode();
        if (!isHydratingSettings) {
            refreshVisibleBlurPreview();
            saveNextPreviewFromOrder(D.loadOrder(), D.loadThumbs());
            scheduleNextBlurPreviewFromOrder(D.loadOrder());
        }
        saveAllSettings();
    }

    function applyOverlayOpacity(val) {
        overlayOpacity = clampNumber(val, 0, 0.6, DEFAULT_OVERLAY_OPACITY);
        overlayOpacity = parseFloat(overlayOpacity.toFixed(2));
        var overlayEl = document.getElementById('wallpaperOverlay');
        if (!overlayEl) {
            overlayEl = document.createElement('div');
            overlayEl.id = 'wallpaperOverlay';
            overlayEl.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,' + overlayOpacity + ');pointer-events:none;z-index:1;transition:background 0.3s;';
            document.body.appendChild(overlayEl);
        }
        overlayEl.style.background = 'rgba(0,0,0,' + overlayOpacity + ')';
        saveAllSettings();
    }

    function applyWallpaperVignette(value) {
        wallpaperVignette = validValue(value, ['none', 'soft', 'medium'], DEFAULT_WALLPAPER_VIGNETTE);
        var old = document.getElementById('wallpaperVignette');
        if (wallpaperVignette === 'none') {
            if (old) old.remove();
            saveAllSettings();
            return;
        }
        var opacity = wallpaperVignette === 'medium' ? 0.36 : 0.22;
        var vignetteEl = old;
        if (!vignetteEl) {
            vignetteEl = document.createElement('div');
            vignetteEl.id = 'wallpaperVignette';
            vignetteEl.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2;transition:opacity var(--transition);';
            document.body.appendChild(vignetteEl);
        }
        vignetteEl.style.opacity = opacity;
        vignetteEl.style.background = 'radial-gradient(circle at center, rgba(0,0,0,0) 42%, rgba(0,0,0,0.55) 100%)';
        saveAllSettings();
    }

    function applyOpacity(val) {
        currentOpacity = clampNumber(val, 0, 1, DEFAULT_OPACITY);
        currentOpacity = parseFloat(currentOpacity.toFixed(2));
        document.documentElement.style.setProperty('--icon-opacity', currentOpacity);
        saveAllSettings();
    }

    function applyEngine(engine) {
        currentEngine = engine;
        engineIndex = ENGINES.indexOf(engine);
        if (engineIndex === -1) engineIndex = 0;
        var svgMap = window.ENGINE_SVG || {};
        if (engineIcon) engineIcon.innerHTML = svgMap[engine] || svgMap.google || '';
        saveAllSettings();
    }

    function nextEngine() {
        engineIndex = (engineIndex + 1) % ENGINES.length;
        applyEngine(ENGINES[engineIndex]);
    }

    function applyPanelOpacity(val) {
        panelOpacity = clampNumber(val, 0.3, 1, DEFAULT_PANEL_OPACITY);
        panelOpacity = parseFloat(panelOpacity.toFixed(2));
        document.documentElement.style.setProperty('--panel-opacity', panelOpacity);
        saveAllSettings();
    }

    function applyUiRadius(value) {
        uiRadius = validValue(value, ['compact', 'soft', 'round'], DEFAULT_UI_RADIUS);
        var presets = {
            compact: { sm: '6px', md: '8px', lg: '12px' },
            soft: { sm: '8px', md: '12px', lg: '16px' },
            round: { sm: '12px', md: '16px', lg: '22px' }
        };
        var preset = presets[uiRadius] || presets[DEFAULT_UI_RADIUS];
        var root = document.documentElement.style;
        root.setProperty('--radius-sm', preset.sm);
        root.setProperty('--radius-md', preset.md);
        root.setProperty('--radius-lg', preset.lg);
        saveAllSettings();
    }

    function applyFontScale(value) {
        fontScale = validValue(value, ['compact', 'standard', 'large'], DEFAULT_FONT_SCALE);
        var fontSizeMap = { compact: '15px', standard: '16px', large: '17px' };
        var fontScaleMap = { compact: '0.94', standard: '1', large: '1.08' };
        document.documentElement.style.setProperty('--app-font-size', fontSizeMap[fontScale]);
        document.documentElement.style.setProperty('--app-font-scale', fontScaleMap[fontScale]);
        document.documentElement.setAttribute('data-font-scale', fontScale);
        saveAllSettings();
    }

    function applyAccentPreference() {
        if (accentMode !== 'custom') return;
        var rgb = hexToRgb(accentColor);
        if (!rgb) return;
        var root = document.documentElement.style;
        root.setProperty('--accent-rgb', rgb);
        root.setProperty('--accent-contrast-rgb', '255, 255, 255');
    }

    function applyAccentMode(value) {
        accentMode = validValue(value, ['auto', 'custom'], DEFAULT_ACCENT_MODE);
        var colorInput = document.getElementById('modalAccentColor');
        if (colorInput) colorInput.hidden = accentMode !== 'custom';
        if (accentMode === 'custom') {
            applyAccentPreference();
        } else {
            applyThemeMode(themeEnabled);
        }
        saveAllSettings();
    }

    function applyAccentColor(value) {
        accentColor = normalizeHexColor(value, DEFAULT_ACCENT_COLOR);
        if (accentMode === 'custom') applyAccentPreference();
        saveAllSettings();
    }

    function applyReducedMotion(value) {
        reducedMotion = value === true;
        document.documentElement.setAttribute('data-reduced-motion', reducedMotion ? 'true' : 'false');
        saveAllSettings();
    }

    function applyThemeMode(on) {
        themeEnabled = on;
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
            root.setProperty('--surface-rgb', 'var(--surface-base-rgb)');
            root.setProperty('--surface-soft-rgb', 'var(--surface-elevated-rgb)');
            root.setProperty('--surface-strong-rgb', 'var(--surface-base-rgb)');
            root.setProperty('--border-rgb', 'var(--stroke-rgb)');
            root.setProperty('--text-primary-rgb', 'var(--on-surface-rgb)');
            root.setProperty('--text-secondary-rgb', 'var(--on-surface-muted-rgb)');
            root.setProperty('--text-muted-rgb', 'var(--on-surface-muted-rgb)');
            root.setProperty('--glass-bg', 'rgba(var(--surface-base-rgb), var(--panel-opacity))');
            root.setProperty('--glass-tint', 'linear-gradient(180deg, rgba(var(--tint-rgb), 0.24), rgba(var(--surface-elevated-rgb), 0.10))');
            root.setProperty('--glass-border', '1px solid rgba(var(--stroke-rgb), 0.78)');
            if (window.WallpaperTheme && window.WallpaperTheme.hasCurrent()) {
                window.WallpaperTheme.applyCurrent();
            } else if (window.WallpaperShow && window.WallpaperShow.refreshTheme) {
                window.WallpaperShow.refreshTheme(true);
            }
        } else {
            root.removeProperty('--surface-base-rgb');
            root.removeProperty('--surface-elevated-rgb');
            root.removeProperty('--tint-rgb');
            root.removeProperty('--stroke-rgb');
            root.removeProperty('--on-surface-rgb');
            root.removeProperty('--on-surface-muted-rgb');
            root.removeProperty('--surface-rgb');
            root.removeProperty('--surface-soft-rgb');
            root.removeProperty('--surface-strong-rgb');
            root.removeProperty('--border-rgb');
            root.removeProperty('--text-primary-rgb');
            root.removeProperty('--text-secondary-rgb');
            root.removeProperty('--text-muted-rgb');
            root.removeProperty('--theme-surface-base-rgb');
            root.removeProperty('--theme-surface-elevated-rgb');
            root.removeProperty('--theme-tint-rgb');
            root.removeProperty('--theme-stroke-rgb');
            root.removeProperty('--theme-on-surface-rgb');
            root.removeProperty('--theme-on-surface-muted-rgb');
            root.removeProperty('--theme-accent-rgb');
            root.removeProperty('--theme-accent-contrast-rgb');
            root.removeProperty('--accent-rgb');
            root.removeProperty('--accent-contrast-rgb');
            root.setProperty('--glass-bg', 'rgba(var(--surface-base-rgb), var(--panel-opacity))');
            root.setProperty('--glass-tint', 'linear-gradient(180deg, rgba(var(--tint-rgb), 0.20), rgba(var(--surface-elevated-rgb), 0.08))');
            root.setProperty('--glass-border', '1px solid rgba(var(--stroke-rgb), 0.72)');
        }
        applyAccentPreference();
        saveAllSettings();
    }

    function saveAllSettings() {
        if (isHydratingSettings) return true;
        var ui = D.loadUI();
        if (!ui.search) ui.search = {};
        if (!ui.wallpaper) ui.wallpaper = {};
        if (!ui.icon) ui.icon = {};
        if (!ui.panel) ui.panel = {};
        if (!ui.appearance) ui.appearance = {};
        ui.search.visibility = searchMode;
        ui.search.engine = currentEngine;
        ui.search.position = searchPosition;
        ui.search.align = searchAlign;
        ui.search.iconPosition = searchIconPosition;
        ui.search.iconVisibility = searchIconVisibility;
        ui.search.surface = searchSurface;
        ui.search.shadow = searchShadow;
        ui.search.radius = searchRadius;
        ui.search.width = searchWidth;
        ui.search.backgroundOpacity = searchBackgroundOpacity;
        ui.search.blur = searchBlur;
        ui.search.placeholder = searchPlaceholder;
        ui.search.enterBehavior = searchEnterBehavior;
        ui.search.historyLimit = searchHistoryLimit;
        ui.wallpaper.overlayOpacity = overlayOpacity;
        ui.wallpaper.themeEnabled = themeEnabled;
        ui.wallpaper.fit = wallpaperFit;
        ui.wallpaper.position = wallpaperPosition;
        ui.wallpaper.blur = wallpaperBlur;
        ui.wallpaper.vignette = wallpaperVignette;
        ui.icon.opacity = currentOpacity;
        ui.panel.opacity = panelOpacity;
        ui.appearance.radius = uiRadius;
        ui.appearance.fontScale = fontScale;
        ui.appearance.accentMode = accentMode;
        ui.appearance.accentColor = accentColor;
        ui.appearance.reducedMotion = reducedMotion;
        D.saveUI(ui);
    }

    function loadSettings() {
        var ui = D.loadUI();
        var search = ui.search || {};
        var wallpaper = ui.wallpaper || {};
        var icon = ui.icon || {};
        var panel = ui.panel || {};
        var appearance = ui.appearance || {};
        searchMode = search.visibility || DEFAULT_SEARCH_MODE;
        searchPosition = search.position || DEFAULT_SEARCH_POSITION;
        searchAlign = search.align || DEFAULT_SEARCH_ALIGN;
        searchPosition = searchPositionParts(searchPosition, searchAlign).value;
        searchAlign = searchPositionParts(searchPosition, searchAlign).align;
        searchIconPosition = search.iconPosition || DEFAULT_SEARCH_ICON_POSITION;
        searchIconVisibility = search.iconVisibility || DEFAULT_SEARCH_ICON_VISIBILITY;
        searchSurface = search.surface || DEFAULT_SEARCH_SURFACE;
        searchShadow = search.shadow || DEFAULT_SEARCH_SHADOW;
        searchRadius = search.radius || DEFAULT_SEARCH_RADIUS;
        searchWidth = search.width !== undefined ? search.width : DEFAULT_SEARCH_WIDTH;
        searchBackgroundOpacity = search.backgroundOpacity !== undefined ? search.backgroundOpacity : DEFAULT_SEARCH_BG_OPACITY;
        searchBlur = search.blur !== undefined ? search.blur : DEFAULT_SEARCH_BLUR;
        searchPlaceholder = search.placeholder || '';
        searchEnterBehavior = search.enterBehavior || DEFAULT_SEARCH_ENTER_BEHAVIOR;
        searchHistoryLimit = D.normalizeSearchHistoryLimit ? D.normalizeSearchHistoryLimit(search.historyLimit) : DEFAULT_SEARCH_HISTORY_LIMIT;
        currentOpacity = icon.opacity !== undefined ? parseFloat(icon.opacity) : DEFAULT_OPACITY;
        overlayOpacity = wallpaper.overlayOpacity !== undefined ? parseFloat(wallpaper.overlayOpacity) : DEFAULT_OVERLAY_OPACITY;
        panelOpacity = panel.opacity !== undefined ? parseFloat(panel.opacity) : DEFAULT_PANEL_OPACITY;
        wallpaperFit = wallpaper.fit || DEFAULT_WALLPAPER_FIT;
        wallpaperPosition = wallpaper.position || DEFAULT_WALLPAPER_POSITION;
        wallpaperBlur = wallpaper.blur !== undefined ? wallpaper.blur : DEFAULT_WALLPAPER_BLUR;
        wallpaperVignette = wallpaper.vignette || DEFAULT_WALLPAPER_VIGNETTE;
        uiRadius = appearance.radius || DEFAULT_UI_RADIUS;
        fontScale = appearance.fontScale || DEFAULT_FONT_SCALE;
        accentMode = appearance.accentMode || DEFAULT_ACCENT_MODE;
        accentColor = normalizeHexColor(appearance.accentColor, DEFAULT_ACCENT_COLOR);
        reducedMotion = appearance.reducedMotion === true;
        themeEnabled = wallpaper.themeEnabled === true;
        currentEngine = search.engine || DEFAULT_ENGINE;

        isHydratingSettings = true;
        try {
            applySearchMode(searchMode);
            applySearchPosition(searchPosition);
            applySearchIconPosition(searchIconPosition);
            applySearchIconVisibility(searchIconVisibility);
            applySearchSurface(searchSurface);
            applySearchShadow(searchShadow);
            applySearchWidth(searchWidth);
            applySearchBackgroundOpacity(searchBackgroundOpacity);
            applySearchBlur(searchBlur);
            applySearchPlaceholder(searchPlaceholder);
            applySearchEnterBehavior(searchEnterBehavior);
            applySearchHistoryLimit(searchHistoryLimit);
            applySearchRadius(searchRadius);
            applyOpacity(currentOpacity);
            applyWallpaperFit(wallpaperFit);
            applyWallpaperPosition(wallpaperPosition);
            applyWallpaperBlur(wallpaperBlur);
            applyWallpaperVignette(wallpaperVignette);
            applyOverlayOpacity(overlayOpacity);
            applyPanelOpacity(panelOpacity);
            applyUiRadius(uiRadius);
            applyFontScale(fontScale);
            applyThemeMode(themeEnabled);
            applyAccentMode(accentMode);
            applyAccentColor(accentColor);
            applyReducedMotion(reducedMotion);
            if (!IS_EXTENSION) applyEngine(currentEngine);
        } finally {
            isHydratingSettings = false;
        }
    }

    function resetSearchDefaults() {
        applySearchMode(DEFAULT_SEARCH_MODE);
        applySearchPosition(DEFAULT_SEARCH_POSITION);
        applySearchIconPosition(DEFAULT_SEARCH_ICON_POSITION);
        applySearchIconVisibility(DEFAULT_SEARCH_ICON_VISIBILITY);
        applySearchSurface(DEFAULT_SEARCH_SURFACE);
        applySearchShadow(DEFAULT_SEARCH_SHADOW);
        applySearchWidth(DEFAULT_SEARCH_WIDTH);
        applySearchBackgroundOpacity(DEFAULT_SEARCH_BG_OPACITY);
        applySearchBlur(DEFAULT_SEARCH_BLUR);
        applySearchPlaceholder('');
        applySearchEnterBehavior(DEFAULT_SEARCH_ENTER_BEHAVIOR);
        applySearchHistoryLimit(DEFAULT_SEARCH_HISTORY_LIMIT);
        applySearchRadius(DEFAULT_SEARCH_RADIUS);
        if (!IS_EXTENSION) applyEngine(DEFAULT_ENGINE);
        saveAllSettings();
        if (D.clearSearchHistory) D.clearSearchHistory();
        syncSearchControls();
    }

    function resetAppearanceDefaults() {
        applyOpacity(DEFAULT_OPACITY);
        applyPanelOpacity(DEFAULT_PANEL_OPACITY);
        applyUiRadius(DEFAULT_UI_RADIUS);
        applyFontScale(DEFAULT_FONT_SCALE);
        applyAccentMode(DEFAULT_ACCENT_MODE);
        applyAccentColor(DEFAULT_ACCENT_COLOR);
        applyReducedMotion(false);
        applyThemeMode(false);
        saveAllSettings();
        syncAppearanceControls();
    }

    function resetWallpaperDefaults() {
        applyWallpaperFit(DEFAULT_WALLPAPER_FIT);
        applyWallpaperPosition(DEFAULT_WALLPAPER_POSITION);
        applyWallpaperBlur(DEFAULT_WALLPAPER_BLUR);
        applyWallpaperVignette(DEFAULT_WALLPAPER_VIGNETTE);
        applyOverlayOpacity(DEFAULT_OVERLAY_OPACITY);
        saveAllSettings();
        syncWallpaperControls();
        return D.resetWallpaperDefaults().then(function () {
            currentMode = 'bing';
            clearWallpaperDraft();
            invalidateWallpaperTab();
            refreshGallery();
            if (window.reloadWallpaper) window.reloadWallpaper();
        });
    }

    function resetShortcutsDefaults() {
        cancelRecording();
        if (D.resetShortcutSettings) {
            D.resetShortcutSettings();
        } else {
            var model = D.loadShortcutsModel();
            model.settings = {
                primaryHotkey: 'ctrl+k',
                hiddenHotkey: 'ctrl+shift+k',
                recommendEnabled: true,
                viewMode: 'list',
                commandsCollapsed: true,
                palettePlacement: 'follow',
                palettePosition: null,
                paletteSkin: 'default',
                builtinGithubAdded: true
            };
            D.saveShortcutsModel(model);
        }
        syncShortcutsControls();
        if (window.Palette && window.Palette.refresh) window.Palette.refresh();
    }

    function resetAllDefaults() {
        resetSearchDefaults();
        resetAppearanceDefaults();
        resetShortcutsDefaults();
        return resetWallpaperDefaults();
    }

    // ================================================================
    // 快捷键录制
    // ================================================================
    function startRecording(which, inputEl) {
        if (isRecording) {
            cancelRecording();
        }
        isRecording = which;
        inputEl.classList.add('recording');
        inputEl.value =tr('pressCombo');
    }

    function cancelRecording() {
        if (!isRecording) return;
        var id = isRecording === 'normal' ? 'hkNormal' : 'hkHidden';
        var el = document.getElementById(id);
        if (el) {
            el.classList.remove('recording');
            el.value = isRecording === 'normal'
                ? loadPaletteHotkey()
                : loadPaletteHiddenHotkey();
        }
        isRecording = null;
    }

    function handleRecording(e) {
        if (!isRecording) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.key === 'Escape') { cancelRecording(); return; }

        var id = isRecording === 'normal' ? 'hkNormal' : 'hkHidden';
        var el = document.getElementById(id);
        if (!el) { cancelRecording(); return; }

        if (!e.ctrlKey || e.altKey) {
            el.value =tr('needCtrl');
            setTimeout(function () { if (isRecording) el.value =tr('pressCombo'); }, 800);
            return;
        }

        var key = e.key.toUpperCase();
        if (key.length === 1 && key >= 'A' && key <= 'Z') {
            var parts = ['Ctrl'];
            if (e.shiftKey) parts.push('Shift');
            parts.push(key);
            var combo = parts.join('+');

            var otherId = isRecording === 'normal' ? 'hkHidden' : 'hkNormal';
            var otherEl = document.getElementById(otherId);
            if (otherEl && combo.toLowerCase() === otherEl.value.toLowerCase()) {
                el.value =tr('hotkeyConflict');
                setTimeout(function () { if (isRecording) el.value =tr('pressCombo'); }, 1000);
                return;
            }

            el.value = combo;
            el.classList.remove('recording');

            if (isRecording === 'normal') savePaletteHotkey(combo);
            else savePaletteHiddenHotkey(combo);

            isRecording = null;
        } else {
            el.value =tr('needLetter');
            setTimeout(function () { if (isRecording) el.value =tr('pressCombo'); }, 800);
        }
    }

    // ================================================================
    // 一级面板统一画廊
    // ================================================================
    var _galleryBlobUrls = [];

    function revokeGalleryUrls() {
        _galleryBlobUrls.forEach(function (url) { URL.revokeObjectURL(url); });
        _galleryBlobUrls = [];
    }

    function galleryColumnCount(count) {
        if (count <= 1) return 1;
        if (count === 2) return 2;
        if (count === 4) return 2;
        return 3;
    }

    function nextGalleryIndexAfterDisplayed(displayedIndex, count) {
        if (count <= 1) return 0;
        return (displayedIndex + 1) % count;
    }

    function nextGalleryIndexAfterDisplayedId(order, displayedId) {
        if (!order || order.length <= 1) return 0;
        var displayedIndex = order.indexOf(displayedId);
        if (displayedIndex < 0) displayedIndex = 0;
        return nextGalleryIndexAfterDisplayed(displayedIndex, order.length);
    }

    function saveNextPreviewFromOrder(order, thumbs) {
        if (!order || !order.length) {
            return;
        }
        var nextId = order[D.getActiveIndex() % order.length];
        var preview = wallpaperBlur >= 5 && D.blurThumbFor ? D.blurThumbFor(nextId, wallpaperBlur) : null;
        if (!preview) preview = thumbs[nextId] || null;
        D.savePreview(preview);
    }

    function saveBlurThumbFromImage(id, img, blur) {
        if (!id || !img || !S.blurredThumbnail || !D.saveBlurThumb) return Promise.resolve(null);
        blur = D.normalizeWallpaperBlur ? D.normalizeWallpaperBlur(blur) : normalizeWallpaperBlur(blur);
        if (blur < 5) return Promise.resolve(null);
        return S.blurredThumbnail(img, blur).then(function (thumb) {
            if (thumb) D.saveBlurThumb(id, blur, thumb);
            return thumb;
        }).catch(function () { return null; });
    }

    function scheduleBlurThumbForId(id, blur) {
        if (!id || !S.blurredThumbnail || !D.saveBlurThumb) return;
        blur = D.normalizeWallpaperBlur ? D.normalizeWallpaperBlur(blur) : normalizeWallpaperBlur(blur);
        if (blur < 5) return;
        if (D.blurThumbFor && D.blurThumbFor(id, blur)) return;

        var run = function () {
            D.idbGet(D.imgKey(id)).then(function (record) {
                if (!record || !record.blob) return;
                var blob = record.blob;
                if ((!blob.type || blob.type === '') && record.mime) {
                    try { blob = new Blob([blob], { type: record.mime }); } catch (e) { }
                }
                var url = URL.createObjectURL(blob);
                return S.blurredThumbnail(url, blur).then(function (thumb) {
                    URL.revokeObjectURL(url);
                    if (thumb) D.saveBlurThumb(id, blur, thumb);
                    return thumb;
                }, function () {
                    URL.revokeObjectURL(url);
                    return null;
                });
            }).then(function () {
                saveNextPreviewFromOrder(D.loadOrder(), D.loadThumbs());
            }).catch(function () { });
        };

        if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 1600 });
        else setTimeout(run, 300);
    }

    function scheduleNextBlurPreviewFromOrder(order) {
        if (!order || !order.length || wallpaperBlur < 5) return;
        var nextId = order[D.getActiveIndex() % order.length];
        scheduleBlurThumbForId(nextId, wallpaperBlur);
    }

    function isLocalWallpaperMode() {
        var source = D.compatMode ? D.compatMode(D.getActiveSource()) : currentMode;
        return source === 'local' || currentMode === 'local' || currentMode === 'upload';
    }

    function isRssWallpaperMode() {
        var source = D.compatMode ? D.compatMode(D.getActiveSource()) : currentMode;
        return source === 'rss' || currentMode === 'rss';
    }

    function activeRssOrder() {
        if (D.activeRssOrder) return D.activeRssOrder();
        var meta = D.loadMeta();
        var config = D.loadRssConfig ? D.loadRssConfig() : null;
        var sourceId = config && config.activeSourceId;
        return (D.loadWallpaper().cache.order || []).filter(function (id) {
            return id && id.indexOf('rss_') === 0 && (!sourceId || !meta[id] || meta[id].sourceId === sourceId);
        });
    }

    function currentWallpaperId() {
        var source = D.compatMode ? D.compatMode(D.getActiveSource()) : currentMode;
        if (source === 'bing' || source === 'api') return source;
        if (source === 'local' && uploadConfig().activeMedia === 'video' && hasUploadVideo()) return uploadVideoId();
        var order = isRssWallpaperMode() ? activeRssOrder() : D.loadOrder();
        if (!order.length) return null;
        if (isRssWallpaperMode() && D.loadRssConfig && D.loadRssConfig().displayMode === 'latest') return order[0];
        var index = D.getActiveIndex();
        var currentIndex = isLocalWallpaperMode() || isRssWallpaperMode() ? (index - 1 + order.length) % order.length : index % order.length;
        return order[currentIndex];
    }

    function updateStoredPreviewAfterBlurChange(id, preview) {
        if (isLocalWallpaperMode()) {
            saveNextPreviewFromOrder(D.loadOrder(), D.loadThumbs());
            scheduleNextBlurPreviewFromOrder(D.loadOrder());
            return;
        }
        if (preview && D.savePreview) D.savePreview(preview);
    }

    function showBlurThumb(id, blur, thumb, token, saveBlurThumb) {
        if (token !== wallpaperBlurPreviewToken || !thumb || !S.showPreparedPreview) return;
        if (saveBlurThumb && D.saveBlurThumb) D.saveBlurThumb(id, blur, thumb);
        S.showPreparedPreview(thumb, { keepCurrentUrl: true });
        updateStoredPreviewAfterBlurChange(id, thumb);
    }

    function showBlurFromSource(id, blur, source, token, saveBlurThumb) {
        if (!source || !S.blurredThumbnail) return Promise.resolve(false);
        return S.blurredThumbnail(source, blur).then(function (thumb) {
            if (token !== wallpaperBlurPreviewToken || !thumb) return false;
            showBlurThumb(id, blur, thumb, token, saveBlurThumb);
            return true;
        }).catch(function () { return false; });
    }

    function refreshVisibleBlurPreview() {
        var id = currentWallpaperId();
        if (!id) return;
        var token = ++wallpaperBlurPreviewToken;
        if (wallpaperBlur >= 5) {
            showCurrentWallpaperBlur(id, wallpaperBlur, token);
            return;
        }
        showCurrentWallpaperOriginal(id, token);
    }

    function showCurrentWallpaperBlur(id, blur, token) {
        if (D.isUploadVideoId && D.isUploadVideoId(id)) return;
        if (D.blurThumbFor && S.showPreparedPreview) {
            var cached = D.blurThumbFor(id, blur);
            if (cached) {
                showBlurThumb(id, blur, cached, token, false);
                return;
            }
        }

        var quickThumb = D.loadThumbs()[id] || null;
        var originalReady = S.currentOriginalUrl && S.currentOriginalId === id;
        if (quickThumb) {
            showBlurFromSource(id, blur, quickThumb, token, false);
            if (originalReady) {
                showBlurFromSource(id, blur, S.currentOriginalUrl, token, true);
                return;
            }
        } else if (originalReady) {
            showBlurFromSource(id, blur, S.currentOriginalUrl, token, true);
            return;
        }

        if (S.currentDisplaySource) {
            var currentSource = S.currentDisplaySource();
            if (currentSource) {
                showBlurFromSource(id, blur, currentSource, token, true);
                return;
            }
        }

        D.idbGet(D.imgKey(id)).then(function (record) {
            if (token !== wallpaperBlurPreviewToken || !record || !record.blob || !S.blurredThumbnail) return;
            var blob = record.blob;
            if ((!blob.type || blob.type === '') && record.mime) {
                try { blob = new Blob([blob], { type: record.mime }); } catch (e) { }
            }
            var url = URL.createObjectURL(blob);
            return S.blurredThumbnail(url, blur).then(function (thumb) {
                URL.revokeObjectURL(url);
                showBlurThumb(id, blur, thumb, token, true);
            }, function () {
                URL.revokeObjectURL(url);
            });
        }).catch(function () { });
    }

    function showCurrentWallpaperOriginal(id, token) {
        if (D.isUploadVideoId && D.isUploadVideoId(id)) {
            if (S.currentOriginalUrl && S.currentOriginalId === id && S.showPreparedVideoUrl) {
                S.showPreparedVideoUrl(S.currentOriginalUrl, id);
            }
            return;
        }
        if (S.currentOriginalUrl && S.currentOriginalId === id && S.showPreparedUrl) {
            S.showPreparedUrl(S.currentOriginalUrl, id);
            if (isLocalWallpaperMode()) saveNextPreviewFromOrder(D.loadOrder(), D.loadThumbs());
            return;
        }

        var quickThumb = D.loadThumbs()[id] || null;
        if (quickThumb && S.showPreparedPreview) {
            S.showPreparedPreview(quickThumb);
        }

        D.idbGet(D.imgKey(id)).then(function (record) {
            if (token !== wallpaperBlurPreviewToken || !record || !record.blob || !S.showPreparedUrl) return;
            var blob = record.blob;
            if ((!blob.type || blob.type === '') && record.mime) {
                try { blob = new Blob([blob], { type: record.mime }); } catch (e) { }
            }
            var url = URL.createObjectURL(blob);
            S.showPreparedUrl(url, id);
            if (isLocalWallpaperMode()) {
                saveNextPreviewFromOrder(D.loadOrder(), D.loadThumbs());
            } else if (S.thumbnail && D.savePreview) {
                S.thumbnail(url).then(function (thumb) {
                    if (token === wallpaperBlurPreviewToken && thumb) D.savePreview(thumb);
                }).catch(function () { });
            }
        }).catch(function () {
            if (token !== wallpaperBlurPreviewToken) return;
            var preview = D.loadThumbs()[id] || null;
            if (preview && S.showPreparedPreview) S.showPreparedPreview(preview);
        });
    }

    function syncNextUploadPosition(displayedId) {
        var order = D.loadOrder();
        if (!displayedId || !order.length) return;

        currentMode = 'local';
        D.saveActiveIndex(nextGalleryIndexAfterDisplayedId(order, displayedId));
        saveNextPreviewFromOrder(order, D.loadThumbs());
        scheduleNextBlurPreviewFromOrder(order);
    }

    function displayMode() {
        return currentMode === 'local' ? 'upload' : currentMode;
    }

    function updateModeChip() {
        if (!modeChipEl) return;
        var source = displayMode();
        modeChipEl.textContent = getSourceLabel(source);
        modeChipEl.className = 'wp-mode-chip ' + source;
    }

    function removeGallery() {
        revokeGalleryUrls();
        var gallery = document.getElementById('wallpaperGallery');
        if (gallery) gallery.style.display = 'none';
        if (uploadBtn) uploadBtn.style.display = 'none';
    }

    function currentWallpaperThumb(source) {
        var thumbs = D.loadThumbs();
        if (source === 'bing') return thumbs.bing || D.loadPreview();
        if (source === 'api') return thumbs.api || D.loadPreview();
        return D.loadPreview();
    }

    function singleGalleryItems(source) {
        var thumb = currentWallpaperThumb(source);
        return [{
            id: source,
            source: source,
            title: getSourceLabel(source),
            bg: thumb || '',
            deletable: false,
            draggable: false
        }];
    }

    function visibleFolderNames() {
        var state = D.loadFolderState ? D.loadFolderState() : {};
        var names = [];
        (state.previewWindow || []).forEach(function (name) {
            if (names.length >= FOLDER_GALLERY_LIMIT) return;
            if (names.indexOf(name) === -1) names.push(name);
        });
        if (state.currentName && names.indexOf(state.currentName) === -1) names.unshift(state.currentName);
        (state.shuffleBag || []).forEach(function (name) {
            if (names.length >= FOLDER_GALLERY_LIMIT) return;
            if (names.indexOf(name) === -1) names.push(name);
        });
        if (!names.length) {
            (D.loadWallpaper().cache.order || []).filter(function (id) { return D.isFolderId && D.isFolderId(id); }).forEach(function (id) {
                var name = D.folderNameFromId ? D.folderNameFromId(id) : id;
                if (names.indexOf(name) === -1) names.push(name);
            });
        }
        return names.slice(0, FOLDER_GALLERY_LIMIT);
    }

    function scheduleVisibleFolderThumbs(names) {
        if (!WF || !WF.readImageFile || !WF.preparePreviewFromFile || !names || !names.length) return;
        var thumbs = D.loadThumbs();
        var missing = names.filter(function (name) {
            return !thumbs[D.folderId(name)];
        }).slice(0, FOLDER_GALLERY_LIMIT);
        if (!missing.length) return;

        var run = function () {
            D.loadFolderHandle().then(function (handle) {
                var chain = Promise.resolve(false);
                missing.forEach(function (name) {
                    chain = chain.then(function (changed) {
                        var id = D.folderId(name);
                        if (D.loadThumbs()[id]) return changed;
                        return WF.readImageFile(handle, name).then(function (file) {
                            return WF.preparePreviewFromFile(file, id, 0);
                        }).then(function (prepared) {
                            var nextThumbs = D.loadThumbs();
                            if (prepared.thumb) {
                                nextThumbs[id] = prepared.thumb;
                                D.saveThumbs(nextThumbs);
                                return true;
                            }
                            return changed;
                        }).catch(function () { return changed; });
                    });
                });
                return chain;
            }).then(function (changed) {
                if (changed && isOpen && currentMode === 'folder') refreshGallery();
            }).catch(function () { });
        };

        if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 1600 });
        else setTimeout(run, 300);
    }

    function folderGalleryItems() {
        var names = visibleFolderNames();
        var thumbs = D.loadThumbs();
        if (!names.length) return singleGalleryItems('folder');
        scheduleVisibleFolderThumbs(names);
        return names.map(function (name) {
            var id = D.folderId(name);
            return {
                id: id,
                source: 'folder',
                title: name,
                bg: thumbs[id] || '',
                deletable: false,
                draggable: false
            };
        });
    }

    function rssGalleryItems() {
        var order = activeRssOrder();
        var thumbs = D.loadThumbs();
        var meta = D.loadMeta();
        var currentId = currentWallpaperId();
        var visible = order.slice(0, 12);
        if (currentId && visible.indexOf(currentId) > 0) {
            visible = [currentId].concat(visible.filter(function (id) { return id !== currentId; }));
        }
        if (!visible.length) return singleGalleryItems('rss');
        return visible.map(function (id) {
            return {
                id: id,
                source: 'rss',
                title: (meta[id] && meta[id].title) || id,
                bg: thumbs[id] || '',
                deletable: false,
                draggable: false
            };
        });
    }

    function refreshGallery() {
        updateModeChip();

        if (!isOpen) return;
        if (currentMode === 'local' || currentMode === 'upload') return refreshUploadGallery();

        if (uploadBtn) uploadBtn.style.display = 'none';

        if (currentMode === 'folder') return renderGallery(folderGalleryItems(), { source: 'folder' });
        if (currentMode === 'rss') return renderGallery(rssGalleryItems(), { source: 'rss' });
        if (currentMode === 'api') return renderGallery(singleGalleryItems('api'), { source: 'api' });
        return renderGallery(singleGalleryItems('bing'), { source: 'bing' });
    }

    function refreshUploadGallery() {
        var order = D.loadOrder();
        var thumbs = D.loadThumbs();
        var meta = D.loadMeta();
        var videoId = uploadVideoId();
        var videoExists = hasUploadVideo();

        if (!order.length && !videoExists) {
            renderUploadGallery(order, [], thumbs, null);
            return;
        }

        var allCached = order.every(function (id) { return meta[id] && thumbs[id]; }) &&
            (!videoExists || (meta[videoId] && thumbs[videoId]));
        if (allCached) {
            renderUploadGallery(order, order.map(function (id) { return meta[id]; }), thumbs, meta[videoId] || null);
            return;
        }

        var reads = order.map(function (id) { return D.idbGet(D.imgKey(id)); });
        if (videoExists) reads.push(D.idbGet(D.imgKey(videoId)));
        Promise.all(reads).then(function (records) {
            if (!isOpen) return;
            var images = records.slice(0, order.length);
            var videoRecord = videoExists ? records[records.length - 1] : null;
            var m = D.loadMeta();
            var changed = false;
            images.forEach(function (img, i) {
                if (img && !m[order[i]]) {
                    m[order[i]] = { name: img.name || '', size: img.size || 0, mediaType: 'image' };
                    changed = true;
                }
            });
            if (videoRecord && !m[videoId]) {
                m[videoId] = { name: videoRecord.name || '', size: videoRecord.size || 0, mediaType: 'video' };
                changed = true;
            }
            if (changed) D.saveMeta(m);
            renderUploadGallery(order, images, thumbs, videoRecord || m[videoId] || null);
        }).catch(function (err) {
            console.error('PlainTab: IDB read failed in refreshUploadGallery, falling back to localStorage', err);
            if (!isOpen) return;
            renderUploadGallery(order, order.map(function (id) { return meta[id] || { name: '', size: 0 }; }), thumbs, meta[videoId] || null);
        });
    }

    function ensureGalleryContainer() {
        var gallery = document.getElementById('wallpaperGallery');
        if (!gallery) {
            gallery = document.createElement('div');
            gallery.id = 'wallpaperGallery';
            gallery.className = 'wallpaper-gallery';
            var anchor = galleryAnchorEl || uploadBtn;
            anchor.parentNode.insertBefore(gallery, anchor);
        }
        gallery.replaceChildren();
        gallery.style.display = 'block';
        return gallery;
    }

    function buildUploadItems(order, images, thumbs) {
        return order.slice(0, UPLOAD_IMAGE_LIMIT).map(function (id, i) {
            var imgMeta = images[i];
            var bg = thumbs[id];
            if (!bg && imgMeta && imgMeta.blob && imgMeta.blob.size > 0) {
                var url = URL.createObjectURL(imgMeta.blob);
                _galleryBlobUrls.push(url);
                bg = 'url(' + url + ')';
            }
            return {
                id: id,
                source: 'upload',
                title: imgMeta && imgMeta.name ? imgMeta.name : id,
                bg: bg || '',
                mediaType: 'image',
                deletable: true,
                draggable: true
            };
        });
    }

    function buildUploadVideoItems(videoMeta, thumbs) {
        var id = uploadVideoId();
        if (!hasUploadVideo()) {
            return [{
                id: 'upload_video_empty',
                source: 'upload-video',
                title: tr('uploadVideoEmpty'),
                bg: '',
                fallback: 'MP4',
                mediaType: 'video-empty',
                deletable: false,
                draggable: false
            }];
        }
        return [{
            id: id,
            source: 'upload-video',
            title: videoMeta && videoMeta.name ? videoMeta.name : tr('uploadGalleryVideo'),
            bg: thumbs[id] || '',
            mediaType: 'video',
            deletable: true,
            draggable: false
        }];
    }

    function buildGalleryGrid(items, options) {
        options = options || {};
        var grid = document.createElement('div');
        grid.className = 'wallpaper-gallery-grid';
        grid.style.setProperty('--gallery-cols', galleryColumnCount(items.length));

        items.forEach(function (item) {
            var card = document.createElement('div');
            card.className = 'wallpaper-thumb';
            card.setAttribute('data-id', item.id);
            card.setAttribute('data-source', item.source || options.source || '');
            card.setAttribute('draggable', 'false');
            if (item.mediaType) card.setAttribute('data-media-type', item.mediaType);
            if (item.title) card.title = item.title;

            if (item.bg) {
                card.style.backgroundImage = item.bg;
            } else {
                card.classList.add('is-empty');
                var fallback = document.createElement('span');
                fallback.className = 'wallpaper-thumb-fallback';
                fallback.textContent = item.fallback || (item.title || item.id || '?').charAt(0).toUpperCase();
                card.appendChild(fallback);
            }

            if (item.deletable) {
                var delBtn = document.createElement('button');
                delBtn.className = 'wallpaper-thumb-del';
                delBtn.title = (item.mediaType === 'video' ? t('deleteVideo') : t('deleteImage')) + (item.title ? ': ' + item.title : '');
                delBtn.setAttribute('data-id', item.id);
                delBtn.setAttribute('data-media-type', item.mediaType || 'image');
                delBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    if (this.dataset.mediaType === 'video') deleteUploadVideo();
                    else deleteLocalImage(this.dataset.id);
                });
                card.appendChild(delBtn);
            }

            grid.appendChild(card);
        });

        return grid;
    }

    function setupGalleryDrag(grid) {
        if (!grid || grid.children.length < 2) return;
        var pressTimer = null;
        grid.style.touchAction = 'none';

        function getCard(e) {
            var el = e.target;
            while (el && el !== grid) {
                if (el.classList && el.classList.contains('wallpaper-thumb')) return el;
                el = el.parentNode;
            }
            return null;
        }

        function onPointerDown(e) {
            if (e.button !== 0) return;
            var card = getCard(e);
            if (!card || e.target.classList.contains('wallpaper-thumb-del')) return;

            var startX = e.clientX, startY = e.clientY;

            pressTimer = setTimeout(function () {
                pressTimer = null;

                try { card.setPointerCapture(e.pointerId); } catch (ex) {}

                var placeholder = document.createElement('div');
                placeholder.className = 'wallpaper-thumb drag-placeholder';
                placeholder.style.height = card.offsetHeight + 'px';
                card.parentNode.insertBefore(placeholder, card);

                var rect = card.getBoundingClientRect();
                card.classList.add('dragging');
                document.body.appendChild(card);
                card.style.position = 'fixed';
                card.style.width = rect.width + 'px';
                card.style.height = rect.height + 'px';
                card.style.left = rect.left + 'px';
                card.style.top = rect.top + 'px';
                card.style.margin = '0';

                var dragState = {
                    card: card,
                    placeholder: placeholder,
                    lastX: startX,
                    lastTime: Date.now(),
                    animating: false
                };

                function onMove(ev) {
                    ev.preventDefault();
                    var now = Date.now();
                    var dt = Math.max(now - dragState.lastTime, 1);
                    var vx = (ev.clientX - dragState.lastX) / dt;
                    dragState.lastX = ev.clientX;
                    dragState.lastTime = now;

                    dragState.card.style.left = (ev.clientX - rect.width / 2) + 'px';
                    dragState.card.style.top = (ev.clientY - rect.height / 2) + 'px';

                    var targetTilt = Math.max(-3, Math.min(3, vx * 8));
                    var prevTilt = parseFloat(dragState.card.dataset.tilt) || 0;
                    var tilt = prevTilt + (targetTilt - prevTilt) * 0.3;
                    dragState.card.dataset.tilt = tilt;
                    dragState.card.style.transform = 'scale(1.08) rotate(' + tilt + 'deg)';

                    var children = Array.prototype.slice.call(grid.children);
                    var phIdx = children.indexOf(dragState.placeholder);
                    for (var i = 0; i < children.length; i++) {
                        if (children[i] === dragState.placeholder) continue;
                        var r = children[i].getBoundingClientRect();
                        if (ev.clientX >= r.left && ev.clientX <= r.right &&
                            ev.clientY >= r.top && ev.clientY <= r.bottom) {
                            var targetIdx = i;
                            if (dragState.animating) break;
                            dragState.animating = true;
                            var cards = Array.prototype.filter.call(grid.children, function (c) {
                                return c !== dragState.placeholder && c !== dragState.card;
                            });
                            var oldPos = {};
                            for (var ci = 0; ci < cards.length; ci++) {
                                var cr = cards[ci].getBoundingClientRect();
                                oldPos[cards[ci].dataset.id] = { left: cr.left, top: cr.top };
                            }
                            if (targetIdx < phIdx) {
                                grid.insertBefore(dragState.placeholder, children[targetIdx]);
                            } else {
                                grid.insertBefore(dragState.placeholder, children[targetIdx + 1] || null);
                            }
                            for (var ci = 0; ci < cards.length; ci++) {
                                var c = cards[ci];
                                var old = oldPos[c.dataset.id];
                                if (!old) continue;
                                var nr = c.getBoundingClientRect();
                                var dx = old.left - nr.left;
                                var dy = old.top - nr.top;
                                if (dx === 0 && dy === 0) continue;
                                c.style.transition = 'none';
                                c.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
                            }
                            void grid.offsetHeight;
                            for (var ci = 0; ci < cards.length; ci++) {
                                cards[ci].style.transition = 'transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)';
                                cards[ci].style.transform = '';
                            }
                            setTimeout(function () { dragState.animating = false; }, 260);
                            break;
                        }
                    }
                }

                function onUp() {
                    var phRect = dragState.placeholder.getBoundingClientRect();
                    var spring = 'left 0.24s cubic-bezier(0.2, 0.8, 0.2, 1), ' +
                        'top 0.24s cubic-bezier(0.2, 0.8, 0.2, 1), ' +
                        'opacity 0.2s, transform 0.24s cubic-bezier(0.2, 0.8, 0.2, 1), ' +
                        'box-shadow 0.25s';
                    dragState.card.style.transition = spring;
                    dragState.card.style.left = phRect.left + 'px';
                    dragState.card.style.top = phRect.top + 'px';
                    dragState.card.style.opacity = '1';
                    dragState.card.style.transform = '';
                    dragState.card.style.boxShadow = '';

                    setTimeout(function () {
                        dragState.card.classList.remove('dragging');
                        var s = dragState.card.style;
                        s.position = ''; s.width = ''; s.height = '';
                        s.left = ''; s.top = ''; s.margin = '';
                        s.transition = ''; s.opacity = ''; s.transform = '';
                        s.zIndex = ''; s.pointerEvents = ''; s.boxShadow = '';
                        grid.insertBefore(dragState.card, dragState.placeholder);
                        grid.removeChild(dragState.placeholder);

                        var allCards = grid.querySelectorAll('.wallpaper-thumb');
                        for (var ci = 0; ci < allCards.length; ci++) {
                            allCards[ci].style.transition = '';
                            allCards[ci].style.transform = '';
                        }

                        var newOrder = [];
                        Array.prototype.forEach.call(grid.querySelectorAll('.wallpaper-thumb[data-id]'), function (c) {
                            newOrder.push(c.dataset.id);
                        });
                        var oldOrder = D.loadOrder();
                        if (newOrder.length === oldOrder.length &&
                            newOrder.some(function (id, i) { return id !== oldOrder[i]; })) {
                            D.saveOrder(newOrder);
                            var idx = D.getActiveIndex();
                            var thumbs = D.loadThumbs();
                            var nextId = newOrder[idx % newOrder.length];
                            saveNextPreviewFromOrder(newOrder, thumbs);
                            scheduleBlurThumbForId(nextId, wallpaperBlur);
                        }
                    }, 240);

                    document.removeEventListener('pointermove', onMove);
                    document.removeEventListener('pointerup', onUp);
                }

                document.addEventListener('pointermove', onMove);
                document.addEventListener('pointerup', onUp);
            }, 300);

            function onCancelMove(ev) {
                if (pressTimer && (Math.abs(ev.clientX - startX) > 8 || Math.abs(ev.clientY - startY) > 8)) {
                    clearTimeout(pressTimer);
                    pressTimer = null;
                    document.removeEventListener('pointermove', onCancelMove);
                }
            }

            function onCancelUp() {
                clearTimeout(pressTimer);
                pressTimer = null;
                document.removeEventListener('pointermove', onCancelMove);
                document.removeEventListener('pointerup', onCancelUp);
            }

            document.addEventListener('pointermove', onCancelMove);
            document.addEventListener('pointerup', onCancelUp);
        }

        grid.addEventListener('pointerdown', onPointerDown);
    }

    function renderGallery(items, options) {
        options = options || {};
        revokeGalleryUrls();
        var gallery = ensureGalleryContainer();

        var grid = buildGalleryGrid(items, options);
        gallery.appendChild(grid);

        if (options.draggable) setupGalleryDrag(grid);
        if (uploadBtn) uploadBtn.style.display = options.canAdd ? '' : 'none';
    }

    function refreshUploadControls(view, orderLength) {
        if (!uploadBtn) return;
        view = view || uploadGalleryView();
        if (typeof orderLength !== 'number') orderLength = D && D.loadOrder ? D.loadOrder().length : 0;
        var isVideo = view === 'video';
        uploadBtn.style.display = isVideo || orderLength < UPLOAD_IMAGE_LIMIT ? '' : 'none';
        uploadBtn.setAttribute('title', isVideo ? t('addVideo') : t('addImage'));
        uploadBtn.setAttribute('aria-label', isVideo ? t('addVideo') : t('addImage'));
    }

    function updateUploadSwitchState(shell, view) {
        if (!shell) return;
        shell.setAttribute('data-view', view);
        Array.prototype.forEach.call(shell.querySelectorAll('[data-upload-gallery-view]'), function (btn) {
            var active = btn.getAttribute('data-upload-gallery-view') === view;
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
    }

    function switchUploadGalleryView(view) {
        view = view === 'video' ? 'video' : 'image';
        if (D.setUploadGalleryView) D.setUploadGalleryView(view);
        var shell = document.querySelector('.upload-gallery-shell');
        updateUploadSwitchState(shell, view);
        refreshUploadControls(view);
        prepareUploadInput();

        var canActivate = view === 'video' ? hasUploadVideo() : D.loadOrder().length > 0;
        if (!canActivate) return;

        if (D.setUploadActiveMedia) D.setUploadActiveMedia(view);
        currentMode = 'local';
        if (view === 'image') {
            saveNextPreviewFromOrder(D.loadOrder(), D.loadThumbs());
            scheduleNextBlurPreviewFromOrder(D.loadOrder());
        } else {
            var videoThumb = D.loadThumbs()[uploadVideoId()] || D.loadPreview();
            if (videoThumb) D.savePreview(videoThumb);
        }
        if (window.reloadWallpaper) window.reloadWallpaper();
    }

    function onUploadGalleryWheel(e) {
        var dy = e.deltaY || 0;
        if (Math.abs(dy) < 8) return;
        var now = Date.now();
        if (now - uploadGalleryWheelAt < 260) {
            e.preventDefault();
            return;
        }
        uploadGalleryWheelAt = now;
        e.preventDefault();
        switchUploadGalleryView(dy > 0 ? 'video' : 'image');
    }

    function buildUploadGallerySwitch(view) {
        var rail = document.createElement('div');
        rail.className = 'upload-gallery-switch';
        rail.setAttribute('role', 'group');
        rail.setAttribute('aria-label', tr('uploadGallerySwitch'));

        [
            { view: 'image', label: tr('uploadGalleryImages') },
            { view: 'video', label: tr('uploadGalleryVideo') }
        ].forEach(function (item) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'upload-gallery-switch-btn';
            btn.setAttribute('data-upload-gallery-view', item.view);
            btn.setAttribute('title', item.label);
            btn.setAttribute('aria-label', item.label);
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                switchUploadGalleryView(item.view);
            });
            rail.appendChild(btn);
        });

        return rail;
    }

    function renderUploadGallery(order, images, thumbs, videoMeta) {
        revokeGalleryUrls();
        var gallery = ensureGalleryContainer();
        var view = uploadGalleryView();

        var shell = document.createElement('div');
        shell.className = 'upload-gallery-shell';
        shell.setAttribute('data-view', view);
        shell.addEventListener('wheel', onUploadGalleryWheel, { passive: false });

        var viewport = document.createElement('div');
        viewport.className = 'upload-gallery-viewport';

        var panes = document.createElement('div');
        panes.className = 'upload-gallery-panes';

        var imagePane = document.createElement('div');
        imagePane.className = 'upload-gallery-pane upload-gallery-pane-image';
        var imageGrid = buildGalleryGrid(buildUploadItems(order, images, thumbs), { source: 'upload' });
        imagePane.appendChild(imageGrid);

        var videoPane = document.createElement('div');
        videoPane.className = 'upload-gallery-pane upload-gallery-pane-video';
        videoPane.appendChild(buildGalleryGrid(buildUploadVideoItems(videoMeta, thumbs), { source: 'upload-video' }));

        panes.appendChild(imagePane);
        panes.appendChild(videoPane);
        viewport.appendChild(panes);
        shell.appendChild(viewport);
        shell.appendChild(buildUploadGallerySwitch(view));
        gallery.appendChild(shell);

        updateUploadSwitchState(shell, view);
        if (order.length > 1) setupGalleryDrag(imageGrid);
        refreshUploadControls(view, order.length);
    }

    // ================================================================
    // 数据操作：上传 / 删除 / 重置
    // ================================================================
    function isImageFile(file) {
        var type = file && file.type || '';
        var name = String(file && file.name || '').toLowerCase();
        return type.indexOf('image/') === 0 || /\.(jpe?g|png|webp|avif|gif|bmp)$/.test(name);
    }

    function isVideoFile(file) {
        var type = file && file.type || '';
        var name = String(file && file.name || '').toLowerCase();
        return type === 'video/mp4' || (!type && /\.mp4$/.test(name)) || /\.mp4$/.test(name);
    }

    function validateVideoFile(file) {
        if (!file || !isVideoFile(file)) return Promise.reject(new Error(tr('uploadVideoUnsupported')));
        if (file.size > UPLOAD_VIDEO_MAX_BYTES) return Promise.reject(new Error(tr('uploadVideoTooLarge')));
        var probe = document.createElement('video');
        if (probe.canPlayType && !probe.canPlayType('video/mp4')) {
            return Promise.reject(new Error(tr('uploadVideoUnsupported')));
        }

        return new Promise(function (resolve, reject) {
            var url = URL.createObjectURL(file);
            var video = document.createElement('video');
            var done = false;
            video.preload = 'metadata';
            video.muted = true;

            function cleanup(err, info) {
                if (done) return;
                done = true;
                video.removeEventListener('loadedmetadata', onLoaded);
                video.removeEventListener('error', onError);
                try { video.pause(); } catch (e) { }
                video.removeAttribute('src');
                try { video.load(); } catch (e) { }
                URL.revokeObjectURL(url);
                if (err) reject(err);
                else resolve(info);
            }

            function onLoaded() {
                var duration = video.duration || 0;
                if (!duration || !isFinite(duration)) {
                    cleanup(new Error(tr('uploadVideoUnsupported')));
                    return;
                }
                if (duration > UPLOAD_VIDEO_MAX_SECONDS) {
                    cleanup(new Error(tr('uploadVideoTooLong')));
                    return;
                }
                cleanup(null, {
                    duration: duration,
                    width: video.videoWidth || 0,
                    height: video.videoHeight || 0
                });
            }

            function onError() {
                cleanup(new Error(tr('uploadVideoUnsupported')));
            }

            video.addEventListener('loadedmetadata', onLoaded);
            video.addEventListener('error', onError);
            video.src = url;
            video.load();
            setTimeout(function () {
                if (!done) cleanup(new Error(tr('uploadVideoUnsupported')));
            }, 5000);
        });
    }

    function saveLocalImage(file, show) {
        var id = 'upload_' + F.generateId();
        var blobUrl = URL.createObjectURL(file);

        var start = show
            ? S.apply(blobUrl, 'local').then(function (img) {
                if (!img) return null;
                return Promise.all([
                    S.thumbnail(img),
                    saveBlurThumbFromImage(id, img, wallpaperBlur)
                ]).then(function (results) { return results[0]; });
              })
            : S.thumbnail(blobUrl).then(function (thumb) {
                return thumb;
              }).then(function (thumb) {
                if (wallpaperBlur < 5) {
                    URL.revokeObjectURL(blobUrl);
                    return thumb;
                }
                return S.blurredThumbnail(blobUrl, wallpaperBlur).then(function (blurThumb) {
                    URL.revokeObjectURL(blobUrl);
                    if (blurThumb) D.saveBlurThumb(id, wallpaperBlur, blurThumb);
                    return thumb;
                }, function () {
                    URL.revokeObjectURL(blobUrl);
                    return thumb;
                });
              });

        return start.then(function (thumb) {
            if (!thumb) { warn('Local', 'thumbnail failed for ' + file.name); return false; }

            return D.idbPut(D.imgKey(id), { blob: file, mime: file.type || '', name: file.name || '', mediaType: 'image' }).then(function () {
                var order = D.loadOrder();
                var thumbs = D.loadThumbs();
                order.push(id);
                thumbs[id] = thumb;
                D.saveOrder(order);
                D.saveThumbs(thumbs);

                var meta = D.loadMeta();
                meta[id] = { name: file.name || '', size: file.size || 0, mediaType: 'image' };
                D.saveMeta(meta);

                return { id: id, shown: show };
            });
        }).catch(function (e) { warn('Local', 'save failed: ' + e.message); return null; });
    }

    function saveUploadVideo(file, show) {
        var id = uploadVideoId();
        return validateVideoFile(file).then(function (info) {
            return (S.videoThumbnail ? S.videoThumbnail(file) : Promise.resolve(null)).then(function (thumb) {
                if (!thumb) throw new Error(tr('uploadVideoPreviewFailed'));
                return D.idbPut(D.imgKey(id), {
                    blob: file,
                    mime: file.type || 'video/mp4',
                    name: file.name || '',
                    size: file.size || 0,
                    mediaType: 'video',
                    duration: info.duration || 0,
                    width: info.width || 0,
                    height: info.height || 0
                }).then(function () {
                    var thumbs = D.loadThumbs();
                    thumbs[id] = thumb;
                    D.saveThumbs(thumbs);
                    if (D.deleteBlurThumb) D.deleteBlurThumb(id);

                    var meta = D.loadMeta();
                    meta[id] = {
                        name: file.name || '',
                        size: file.size || 0,
                        mediaType: 'video',
                        duration: info.duration || 0,
                        width: info.width || 0,
                        height: info.height || 0
                    };
                    D.saveMeta(meta);
                    if (D.setUploadVideoId) D.setUploadVideoId(id);
                    if (D.setUploadActiveMedia) D.setUploadActiveMedia('video');
                    D.savePreview(thumb);

                    if (!show || !S.applyVideoAndSavePreview) return { id: id, shown: false, replaced: hasUploadVideo() };
                    var videoUrl = URL.createObjectURL(file);
                    return S.applyVideoAndSavePreview(videoUrl, id, thumb).then(function () {
                        return { id: id, shown: true };
                    }, function (err) {
                        try { URL.revokeObjectURL(videoUrl); } catch (e) { }
                        throw err;
                    });
                });
            });
        }).catch(function (e) {
            warn('Local', 'video save failed: ' + (e && e.message ? e.message : e));
            alert(e && e.message ? e.message : tr('uploadVideoUnsupported'));
            return null;
        });
    }

    function deleteLocalImage(id) {
        var order = D.loadOrder();
        if (!order.length) return;

        var newOrder = order.filter(function (oid) { return oid !== id; });
        D.saveOrder(newOrder);

        var thumbs = D.loadThumbs();
        delete thumbs[id];
        D.saveThumbs(thumbs);
        if (D.deleteBlurThumb) D.deleteBlurThumb(id);

        var meta = D.loadMeta();
        delete meta[id];
        D.saveMeta(meta);

        if (newOrder.length === 0) {
            D.saveActiveIndex(0);
            if (hasUploadVideo()) {
                if (D.setUploadActiveMedia) D.setUploadActiveMedia('video');
                var videoThumb = D.loadThumbs()[uploadVideoId()] || null;
                D.savePreview(videoThumb);
                currentMode = 'local';
            } else {
                D.savePreview(null);
                D.setActiveSource('bing');
                currentMode = 'bing';
            }
            updateModeChip();
            return D.idbDelete(D.imgKey(id)).then(function () {
                refreshGallery();
                if (window.reloadWallpaper) window.reloadWallpaper();
            }).catch(function () {});
        }

        var nextId = newOrder[D.getActiveIndex() % newOrder.length];
        saveNextPreviewFromOrder(newOrder, thumbs);
        scheduleBlurThumbForId(nextId, wallpaperBlur);

        return D.idbDelete(D.imgKey(id)).then(function () {
            refreshGallery();
        }).catch(function (e) { warn('Local', 'delete blob failed: ' + (e && e.message)); });
    }

    function deleteUploadVideo() {
        var id = uploadVideoId();
        var thumbs = D.loadThumbs();
        delete thumbs[id];
        D.saveThumbs(thumbs);
        if (D.deleteBlurThumb) D.deleteBlurThumb(id);

        var meta = D.loadMeta();
        delete meta[id];
        D.saveMeta(meta);
        if (D.setUploadVideoId) D.setUploadVideoId('');

        var order = D.loadOrder();
        if (uploadConfig().activeMedia === 'video') {
            if (order.length) {
                if (D.setUploadActiveMedia) D.setUploadActiveMedia('image');
                saveNextPreviewFromOrder(order, thumbs);
                currentMode = 'local';
            } else {
                D.savePreview(null);
                D.setActiveSource('bing');
                currentMode = 'bing';
            }
        }

        return D.idbDelete(D.imgKey(id)).then(function () {
            refreshGallery();
            updateModeChip();
            if (window.reloadWallpaper) window.reloadWallpaper();
        }).catch(function (e) { warn('Local', 'delete video failed: ' + (e && e.message)); });
    }

    // ================================================================
    // 角落按钮显隐
    // ================================================================
    function showCorners() {
        if (settingsBtn.classList.contains('visible')) return;
        settingsBtn.classList.add('visible');
        langBtn.classList.add('visible');
    }

    function hideCorners() {
        if (isOpen || isLangPanelOpen) return;
        clearTimeout(cornerHideTimer);
        cornerHideTimer = setTimeout(function () {
            if (!isMouseInCornerZone && !isOpen && !isLangPanelOpen) {
                settingsBtn.classList.remove('visible');
                langBtn.classList.remove('visible');
            }
        }, 400);
    }

    function isNearTopRight(x, y) { return x > window.innerWidth - 180 && y < 130; }

    // ================================================================
    // 扩展模式
    // ================================================================
    function setupExtensionMode() {
        if (engineIcon) {
            engineIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 16 16"><g clip-path="url(#a)"><path d="M14 12.94 10.16 9.1c1.25-1.76 1.1-4.2-.48-5.78a4.49 4.49 0 0 0-6.36 0 4.49 4.49 0 0 0 0 6.36 4.486 4.486 0 0 0 5.78.48L12.94 14 14 12.94ZM4.38 8.62a3 3 0 0 1 0-4.24 3 3 0 0 1 4.24 0 3 3 0 0 1 0 4.24 3 3 0 0 1-4.24 0Z"/></g><defs><clipPath id="a"><path d="M0 0h16v16H0z"/></clipPath></defs></svg>';
            engineIcon.style.opacity = String(DEFAULT_OPACITY);
            engineIcon.style.pointerEvents = 'none';
        }
    }

    // ================================================================
    // 事件绑定
    // ================================================================
    function bindEvents() {
        if (!useBootstrapShell) {
            // L1 面板 — 齿轮按钮
            settingsBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                toggleSettings();
            });
            settingsBtn.addEventListener('mouseenter', function () { isMouseInCornerZone = true; showCorners(); });
            settingsBtn.addEventListener('mouseleave', function () { isMouseInCornerZone = false; if (!isOpen && !isLangPanelOpen) hideCorners(); });

            // 语言按钮
            langBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                isLangPanelOpen ? closeLangPanel() : openLangPanel();
            });
            langBtn.addEventListener('mouseenter', function () { isMouseInCornerZone = true; showCorners(); });
            langBtn.addEventListener('mouseleave', function () { isMouseInCornerZone = false; if (!isOpen && !isLangPanelOpen) hideCorners(); });
        }

        // L1 面板鼠标事件
        settingsPanel.addEventListener('mouseenter', function () { clearTimeout(cornerHideTimer); isMouseInCornerZone = true; });
        settingsPanel.addEventListener('mouseleave', function () { isMouseInCornerZone = false; cornerHideTimer = setTimeout(function () { closeSettings({ skipEmptyLocalPicker: true }); hideCorners(); }, 500); });
        settingsPanel.addEventListener('click', function (e) { e.stopPropagation(); });

        // 语言面板鼠标事件
        if (!useBootstrapShell) {
            langPanel.addEventListener('mouseenter', function () { clearTimeout(cornerHideTimer); isMouseInCornerZone = true; });
            langPanel.addEventListener('mouseleave', function () { isMouseInCornerZone = false; cornerHideTimer = setTimeout(function () { closeLangPanel(); hideCorners(); }, 500); });
            langPanel.addEventListener('click', function (e) { e.stopPropagation(); });
        }

        // L1 上传按钮
        if (!useBootstrapShell) {
            uploadBtn.addEventListener('click', function (e) { e.stopPropagation(); pickUpload(); });
        }

        // 文件选择
        fileInput.addEventListener('change', function () {
            var all = Array.from(fileInput.files || []);
            var view = uploadGalleryView();
            fileInput.value = '';

            if (view === 'video') {
                var video = all.filter(isVideoFile)[0];
                if (!video) return;
                return saveUploadVideo(video, true).then(function (result) {
                    if (!result) return;
                    currentMode = 'local';
                    if (D.setUploadGalleryView) D.setUploadGalleryView('video');
                    log('Local', 'saved video wallpaper: ' + (video.name || 'video'));
                    if (_keepGalleryOpen) refreshGallery(); else closeSettings();
                });
            }

            var files = all.filter(isImageFile);
            if (!files.length) return;

            var order = D.loadOrder();
            var slots = Math.max(0, UPLOAD_IMAGE_LIMIT - order.length);
            if (!slots) return;

            var reads = order.map(function (id) { return D.idbGet(D.imgKey(id)); });
            return Promise.all(reads).then(function (existingImages) {
                var known = {};
                existingImages.forEach(function (img) { if (img && img.name) known[img.name] = true; });

                var seen = {};
                var deduped = files.filter(function (f) {
                    if (seen[f.name] || known[f.name]) return false;
                    seen[f.name] = true;
                    return true;
                });

                deduped = deduped.slice(0, slots);

                if (!deduped.length) {
                    log('Local', 'all ' + files.length + ' file(s) were duplicates, nothing to add');
                    if (_keepGalleryOpen) refreshGallery(); else closeSettings();
                    return;
                }

                var saved = 0;
                var displayedUploadId = null;
                var chain = Promise.resolve();
                if (D.setUploadActiveMedia) D.setUploadActiveMedia('image');
                deduped.forEach(function (file) {
                    chain = chain.then(function () {
                        var show = saved === 0;
                        return saveLocalImage(file, show).then(function (result) {
                            if (!result) return;
                            saved++;
                            if (result.shown) displayedUploadId = result.id;
                            syncNextUploadPosition(displayedUploadId);
                        });
                    });
                });
                return chain.then(function () {
                    log('Local', 'saved ' + saved + ' of ' + files.length + ' selected (' + (files.length - deduped.length) + ' duplicates skipped)');
                    if (D.setUploadGalleryView) D.setUploadGalleryView('image');
                    if (_keepGalleryOpen) refreshGallery(); else closeSettings();
                });
            });
        });

        // L1 高级设置按钮 → 打开模态窗口
        var advSettingsBtn = document.getElementById('advSettingsBtn');
        if (advSettingsBtn) {
            advSettingsBtn.addEventListener('click', function (e) { e.stopPropagation(); openModal(); });
        }

        // 模态窗口 — tab 切换
        if (modalWindow) {
            modalWindow.addEventListener('click', function (e) {
                e.stopPropagation();
                var tab = e.target.closest('.modal-tab');
                if (tab) { switchTab(tab.dataset.tab); return; }
                if (!e.target.closest('.custom-select')) closeCustomSelects();
            });
        }

        // 模态窗口 — 点击遮罩关闭
        if (modalOverlay) {
            modalOverlay.addEventListener('click', function (e) {
                if (e.target === modalOverlay) closeModal();
            });
        }

        // 搜索引擎图标切换（网页模式）
        if (engineIcon && !IS_EXTENSION && !useBootstrapShell) {
            engineIcon.addEventListener('click', function (e) { e.stopPropagation(); nextEngine(); });
        }

        document.addEventListener('keydown', handleRecording, true);
    }

    // ================================================================
    // 初始化
    // ================================================================
    function init(options) {
        if (fullInitialized) return;
        options = options || {};
        useBootstrapShell = options.bootstrapShell === true;
        cacheDom();
        currentMode = options.currentMode || D.compatMode(D.getActiveSource());
        currentLang = options.currentLang || D.loadLocale() || detectLang();
        if (!I18N[currentLang]) currentLang = 'en';
        if (options.currentEngine) currentEngine = options.currentEngine;
        if (typeof options.engineIndex === 'number') engineIndex = options.engineIndex;
        if (options.searchMode) searchMode = options.searchMode;
        bindEvents();
        loadSettings();
        updateLangUI();

        if (IS_EXTENSION) setupExtensionMode();
        fullInitialized = true;
    }

    // ================================================================
    // 公开 API
    // ================================================================
    window.SettingsPanelFull = {
        init: init,
        isOpen: function () { return isOpen; },
        isLangPanelOpen: function () { return isLangPanelOpen; },
        isModalOpen: function () { return isModalOpen; },
        open: openSettings,
        close: closeSettings,
        toggle: toggleSettings,
        closeAll: closeAll,
        openModal: openModal,
        closeModal: closeModal,
        updateLangUI: updateLangUI,
        getSearchMode: function () { return searchMode; },
        getSearchEnterBehavior: function () { return searchEnterBehavior; },
        getOpacity: function () { return currentOpacity; },
        getEngine: function () { return currentEngine; },
        getCurrentMode: function () { return currentMode; },
        setCurrentMode: function (m) { currentMode = m; },
        getCurrentLang: function () { return currentLang; },
        setCurrentLang: function (lang) {
            return loadLocale(lang).then(function (loadedLang) {
                currentLang = loadedLang;
                updateLangUI();
                refreshGeneratedTabPages();
                return currentLang;
            });
        },
        setWallpaperInfo: refreshGallery,
        getEngineIndex: function () { return engineIndex; },
        setEngineIndex: function (i) { engineIndex = i; },
        isNearTopRight: isNearTopRight,
        showCorners: showCorners,
        hideCorners: hideCorners,
        isExtension: IS_EXTENSION,
        refresh: function () {
            loadSettings();
            updateLangUI();
            refreshGallery();
        },
        pickUpload: pickUpload
    };

    // 导出 t() 给全局
    window.t = t;

})();
