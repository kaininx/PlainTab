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
    var DEFAULT_WALLPAPER_BLUR_MAX = 5;
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
    var isSearchPreviewOpen = false;
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
    var searchPreviewPanel = null;
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
    var wallpaperDraftWallhavenTestResult = null;
    var wallpaperDraftFolderMount = null;
    var wallpaperDraftApiOpenType = '';
    var wallpaperWorkOrder = null;
    var wallpaperWorkOrderStatus = { state: 'Clean', valid: false, reasonKey: 'wallpaperApplyNoChanges', message: '' };
    var wallpaperSettingsModule = null;
    var rssNoticeTimer = null;
    var rssNoticeToken = 0;
    var apiNoticeTimer = null;
    var apiNoticeToken = 0;
    var wallhavenNoticeTimer = null;
    var wallhavenNoticeToken = 0;
    var uploadFilePickerSession = null;
    var FOLDER_GALLERY_LIMIT = 12;
    var FOLDER_THUMB_LOOKAHEAD = 12;
    var UPLOAD_IMAGE_LIMIT = 12;
    var UPLOAD_VIDEO_MAX_BYTES = 80 * 1024 * 1024;
    var UPLOAD_VIDEO_MAX_SECONDS = 60;
    var UPLOAD_VIDEO_OPTIMIZE_FPS = 30;
    var UPLOAD_VIDEO_FPS_SAMPLE_SECONDS = 1.2;

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

    function uploadModeFromConfig(config) {
        return config && config.activeMedia === 'video' ? 'video' : 'image';
    }

    function prepareUploadInput(mode) {
        if (!fileInput) return;
        mode = mode === 'video' ? 'video' : (mode === 'image' ? 'image' : uploadGalleryView());
        if (mode === 'video') {
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

    function closeAll() { closeSettings(); closeLangPanel(); closeSearchPreview(); closeModal(); }

    function pickUpload() {
        _keepGalleryOpen = false;
        prepareUploadInput();
        if (fileInput) fileInput.click();
    }

    function finishUploadFilePicker(files, cancelled) {
        var session = uploadFilePickerSession;
        if (!session || session.done) return;
        session.done = true;
        uploadFilePickerSession = null;
        if (session.onFocus) window.removeEventListener('focus', session.onFocus, true);
        session.resolve({
            cancelled: cancelled === true,
            files: files || []
        });
    }

    function resolveUploadFilePickerChange() {
        if (!uploadFilePickerSession || !fileInput) return false;
        var files = Array.from(fileInput.files || []);
        fileInput.value = '';
        finishUploadFilePicker(files, files.length === 0);
        return true;
    }

    function pickUploadFiles(mode) {
        if (!fileInput) return Promise.resolve({ cancelled: true, files: [] });
        if (uploadFilePickerSession) finishUploadFilePicker([], true);
        mode = mode === 'video' ? 'video' : 'image';
        return new Promise(function (resolve) {
            var session = {
                mode: mode,
                resolve: resolve,
                done: false,
                onFocus: function () {
                    setTimeout(function () {
                        if (uploadFilePickerSession === session && !session.done) {
                            var selected = Array.from(fileInput.files || []);
                            fileInput.value = '';
                            finishUploadFilePicker(selected, selected.length === 0);
                        }
                    }, 600);
                }
            };
            uploadFilePickerSession = session;
            fileInput.value = '';
            prepareUploadInput(mode);
            setTimeout(function () {
                if (uploadFilePickerSession === session && !session.done) {
                    window.addEventListener('focus', session.onFocus, true);
                }
            }, 0);
            fileInput.click();
        });
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

    function buildSearchPreviewPanelHTML() {
        return '<aside class="search-preview-panel" id="searchPreviewPanel" role="dialog" aria-modal="false" aria-labelledby="searchPreviewTitle">' +
            '<div class="search-preview-head">' +
            '<div>' +
            '<h2 id="searchPreviewTitle">' + tr('searchPreviewTitle') + '</h2>' +
            '<p>' + modalCopy('searchPreviewDesc') + '</p>' +
            '</div>' +
            '<button class="search-preview-close" id="searchPreviewCloseBtn" type="button" aria-label="' + tr('searchPreviewClose') + '">×</button>' +
            '</div>' +
            '<div class="search-preview-actions">' +
            '<button class="primary-action" id="searchPreviewBackBtn" type="button">' + tr('searchPreviewBack') + '</button>' +
            '</div>' +
            '<div class="search-preview-body">' +
            settingItem(tr('searchSurface'), modalCopy('modalDescSearchSurface'), '<select id="previewSearchSurface">' +
            '<option value="light">' + tr('surfaceLight') + '</option>' +
            '<option value="glass">' + tr('surfaceGlass') + '</option>' +
            '<option value="theme">' + tr('surfaceTheme') + '</option>' +
            '<option value="solid">' + tr('surfaceSolid') + '</option>' +
            '<option value="outline">' + tr('surfaceOutline') + '</option>' +
            '<option value="clean">' + tr('surfaceClean') + '</option>' +
            '</select>') +
            settingItem(tr('searchBackground'), modalCopy('modalDescSearchBackground'), '<input type="range" id="previewSearchBgRange" min="0.04" max="0.32" step="0.01"><input type="number" id="previewSearchBgNum" class="input-w-55" min="0.04" max="0.32" step="0.01">') +
            settingItem(tr('searchBlur'), modalCopy('modalDescSearchBlur'), '<input type="range" id="previewSearchBlurRange" min="0" max="40" step="1"><input type="number" id="previewSearchBlurNum" class="input-w-55" min="0" max="40" step="1">') +
            settingItem(tr('searchRadius'), modalCopy('modalDescSearchRadius'), '<select id="previewSearchRadius"><option value="capsule">' + tr('radiusCapsule') + '</option><option value="rounded">' + tr('radiusRounded') + '</option><option value="sharp">' + tr('radiusSharp') + '</option></select>') +
            settingItem(tr('searchShadow'), modalCopy('modalDescSearchShadow'), '<select id="previewSearchShadow"><option value="none">' + tr('shadowNone') + '</option><option value="soft">' + tr('shadowSoft') + '</option><option value="standard">' + tr('shadowStandard') + '</option></select>') +
            settingItem(tr('searchLabel'), modalCopy('modalDescSearchMode'), '<select id="previewSearchMode"><option value="hover">' + tr('searchHover') + '</option><option value="always">' + tr('searchAlways') + '</option><option value="never">' + tr('searchNever') + '</option></select>') +
            settingItem(tr('searchPosition'), modalCopy('modalDescSearchPosition'), '<select id="previewSearchPos">' +
            '<option value="edge-top">' + tr('posEdgeTop') + '</option>' +
            '<option value="top">' + tr('posHigh') + '</option>' +
            '<option value="upper">' + tr('posUpper') + '</option>' +
            '<option value="center-upper">' + tr('posCenterUpper') + '</option>' +
            '<option value="center">' + tr('posCenter') + '</option>' +
            '<option value="center-lower">' + tr('posCenterLower') + '</option>' +
            '<option value="lower">' + tr('posLower') + '</option>' +
            '<option value="bottom">' + tr('posLow') + '</option>' +
            '<option value="edge-bottom">' + tr('posEdgeBottom') + '</option>' +
            '</select>') +
            settingItem(tr('searchWidth'), modalCopy('modalDescSearchWidth'), '<input type="range" id="previewSearchWidthRange" min="360" max="760" step="10"><input type="number" id="previewSearchWidthNum" class="input-w-55" min="360" max="760" step="10">') +
            settingItem(tr('searchIconVisibility'), modalCopy('modalDescSearchIconVisibility'), '<select id="previewSearchIconVisibility"><option value="always">' + tr('iconVisibilityAlways') + '</option><option value="hidden">' + tr('iconVisibilityHidden') + '</option></select>') +
            settingItem(tr('searchIconPosition'), modalCopy('modalDescSearchIconPosition'), '<select id="previewSearchIconPosition"><option value="left">' + tr('iconLeft') + '</option><option value="right">' + tr('iconRight') + '</option></select>') +
            '</div>' +
            '</aside>';
    }

    function ensureSearchPreviewPanel() {
        if (searchPreviewPanel) return searchPreviewPanel;
        var wrap = document.createElement('div');
        wrap.innerHTML = buildSearchPreviewPanelHTML();
        searchPreviewPanel = wrap.firstChild;
        document.body.appendChild(searchPreviewPanel);
        bindSearchPreviewEvents();
        return searchPreviewPanel;
    }

    function openSearchPreview() {
        ensureSearchPreviewPanel();
        closeCustomSelects();
        closeSettings({ skipEmptyLocalPicker: true });
        closeLangPanel();
        if (isModalOpen) {
            saveTabScroll(activeTab);
            isModalOpen = false;
            modalOpenFrame++;
            modalOverlay.classList.remove('active', 'preparing');
        }
        activeTab = 'search';
        isSearchPreviewOpen = true;
        document.documentElement.setAttribute('data-search-preview', 'true');
        searchPreviewPanel.classList.add('active');
        syncSearchControls();
    }

    function closeSearchPreview(options) {
        if (!isSearchPreviewOpen) return;
        options = options || {};
        isSearchPreviewOpen = false;
        document.documentElement.removeAttribute('data-search-preview');
        if (searchPreviewPanel) searchPreviewPanel.classList.remove('active');
        closeCustomSelects();
        if (options.reopenSearch) {
            activeTab = 'search';
            openModal();
            switchTab('search');
        }
    }

    function returnToSearchSettings() {
        closeSearchPreview({ reopenSearch: true });
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
            api:tr('sourceApi'),
            wallhaven:tr('sourceWallhaven')};
        return map[source] || source;
    }

    function tr(key) {
        var value = t(key);
        return value && value !== key ? value : key;
    }

    function formatLocalizedText(key, values) {
        return String(tr(key)).replace(/\{([a-zA-Z0-9_]+)\}/g, function (_, name) {
            return values && Object.prototype.hasOwnProperty.call(values, name) ? values[name] : '';
        });
    }

    function appConfirm(message, options) {
        options = options || {};
        options.message = message;
        if (window.PlainTabNotice && window.PlainTabNotice.confirm) return window.PlainTabNotice['confirm'](options);
        return Promise.resolve(false);
    }

    function appAlert(message, options) {
        options = options || {};
        options.message = message;
        if (window.PlainTabNotice && window.PlainTabNotice.alert) return window.PlainTabNotice['alert'](options);
        warn('Notice', message);
        return Promise.resolve(true);
    }

    function isHttpUrl(value) {
        return /^http:\/\//i.test(String(value || '').trim());
    }

    function httpsOnlyMessage(fallbackKey, value) {
        if (!isHttpUrl(value)) return tr(fallbackKey);
        return tr('httpsOnlyUrl');
    }

    function rssDisplayText(key) {
        var map = {
            displayMode: 'rssDisplayMode',
            latest: 'rssDisplayLatest',
            cycle: 'rssDisplayCycle'
        };
        return map[key] ? tr(map[key]) : key;
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
        setControlValue('previewSearchMode', searchMode);
        setControlValue('previewSearchPos', searchPosition);
        setControlValue('previewSearchIconPosition', searchIconPosition);
        setControlValue('previewSearchIconVisibility', searchIconVisibility);
        setControlValue('previewSearchSurface', searchSurface);
        setControlValue('previewSearchShadow', searchShadow);
        setControlValue('previewSearchRadius', searchRadius);
        setControlValue('previewSearchWidthRange', searchWidth);
        setControlValue('previewSearchWidthNum', searchWidth);
        setControlValue('previewSearchBgRange', searchBackgroundOpacity);
        setControlValue('previewSearchBgNum', searchBackgroundOpacity);
        setControlValue('previewSearchBlurRange', searchBlur);
        setControlValue('previewSearchBlurNum', searchBlur);
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
        setControlValue('modalWallpaperBlur', wallpaperBlur >= 5);
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
        if (D.loadWallhavenConfig) wallpaperDraft.providers.wallhaven.config = clonePlain(D.loadWallhavenConfig());
        wallpaperDraftOriginal = JSON.stringify(wallpaperDraft);
        wallpaperDraftApiTestResult = null;
        wallpaperDraftRssTestResult = null;
        wallpaperDraftWallhavenTestResult = null;
        wallpaperDraftFolderMount = null;
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
                reasonKey: workOrder.health.reasonKey || 'wallpaperStatusApplying',
                message: workOrder.health.message || ''
            };
        }
        if (workOrder.health && workOrder.health.state === 'Error') {
            wallpaperWorkOrderStatus = {
                state: 'Error',
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
        wallpaperDraftWallhavenTestResult = null;
        wallpaperDraftFolderMount = null;
        wallpaperDraftApiOpenType = '';
        wallpaperWorkOrder = null;
        wallpaperWorkOrderStatus = { state: 'Clean', valid: false, reasonKey: 'wallpaperApplyNoChanges', message: '' };
    }

    function currentWallpaperDraft() {
        if (!wallpaperDraft) return openWallpaperDraft();
        return wallpaperDraft;
    }

    function setWallpaperDraftOpenSource(source) {
        if (source) normalizeDraftSource(source);
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

    function wallpaperStatusState(status) {
        status = status || validateWallpaperWorkOrder();
        var state = status.state || 'Clean';
        if (state === 'Dirty' || state === 'Applied') return 'Clean';
        if (['Clean', 'Blocked', 'Testing', 'Ready', 'Applying', 'Error'].indexOf(state) === -1) return 'Blocked';
        return state;
    }

    function selectedDraftWallhavenConfig() {
        var config = pendingConfigForSource('wallhaven');
        return D.normalizeWallhavenConfig ? D.normalizeWallhavenConfig(config) : config;
    }

    function wallpaperApplyFooterHTML() {
        var validation = validateWallpaperWorkOrder();
        return '<div class="wallpaper-apply-footer">' +
            '<div class="wallpaper-apply-status" id="wallpaperApplyStatus" data-state="' + wallpaperStatusState(validation) + '">' + escapeHtml(wallpaperStatusText(validation)) + '</div>' +
            '<button id="wallpaperApplyBtn" class="primary-action" type="button"' + (validation.valid ? '' : ' disabled') + '>' + tr('wallpaperApply') + '</button>' +
            '</div>';
    }

    function refreshWallpaperApplyFooter() {
        var status = document.getElementById('wallpaperApplyStatus');
        var button = document.getElementById('wallpaperApplyBtn');
        if (!status || !button) return;
        var validation = validateWallpaperWorkOrder();
        status.textContent = wallpaperStatusText(validation);
        status.dataset.state = wallpaperStatusState(validation);
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

    function snapshotWallpaperStorage() {
        return {
            wallpaper: clonePlain(D.loadWallpaper()),
            thumbs: clonePlain(D.loadThumbs()),
            blurThumbs: D.loadBlurThumbs ? clonePlain(D.loadBlurThumbs()) : {},
            preview: D.loadPreview ? D.loadPreview() : null
        };
    }

    function restoreWallpaperStorage(snapshot) {
        snapshot = snapshot || {};
        if (snapshot.wallpaper) D.saveWallpaper(clonePlain(snapshot.wallpaper));
        if (snapshot.thumbs) D.saveThumbs(clonePlain(snapshot.thumbs));
        if (D.saveBlurThumbs && snapshot.blurThumbs) D.saveBlurThumbs(clonePlain(snapshot.blurThumbs));
        if (D.savePreview) D.savePreview(snapshot.preview || null);
    }

    function restoreIdbValue(key, value) {
        if (typeof value === 'undefined') return D.idbDelete(key);
        return D.idbPut(key, value);
    }

    function snapshotFolderPrepareStorage(names) {
        var snapshot = snapshotWallpaperStorage();
        snapshot.lightCache = {};
        return Promise.all([
            D.idbGet(D.DB.FOLDER_HANDLE),
            D.idbGet(D.DB.FOLDER_FILES),
            Promise.all((names || []).map(function (name) {
                return D.loadFolderLightCache(name).then(function (record) {
                    snapshot.lightCache[name] = record;
                });
            }))
        ]).then(function (values) {
            snapshot.folderHandle = values[0];
            snapshot.folderFiles = values[1];
            return snapshot;
        });
    }

    function restoreFolderPrepareStorage(snapshot) {
        var lightCache = snapshot.lightCache || {};
        var lightRestores = Object.keys(lightCache).map(function (name) {
            if (typeof lightCache[name] === 'undefined') return D.deleteFolderLightCache(name);
            return D.saveFolderLightCache(name, lightCache[name]);
        });
        var restoreFolderData = restoreIdbValue(D.DB.FOLDER_HANDLE, snapshot.folderHandle).then(function () {
            return restoreIdbValue(D.DB.FOLDER_FILES, snapshot.folderFiles);
        }).then(function () {
            return Promise.all(lightRestores);
        });
        if (typeof snapshot.folderHandle !== 'undefined' || typeof snapshot.folderFiles !== 'undefined') {
            return restoreFolderData.then(function () {
                restoreWallpaperStorage(snapshot);
                return true;
            });
        }
        restoreWallpaperStorage(snapshot);
        return restoreFolderData;
    }

    function snapshotApiPrepareStorage() {
        var snapshot = snapshotWallpaperStorage();
        return D.idbGet(D.DB.API_BLOB).then(function (record) {
            snapshot.apiBlob = record;
            return snapshot;
        });
    }

    function restoreApiPrepareStorage(snapshot) {
        if (typeof snapshot.apiBlob !== 'undefined') {
            return D.idbPut(D.DB.API_BLOB, snapshot.apiBlob).then(function () {
                restoreWallpaperStorage(snapshot);
                return true;
            });
        }
        restoreWallpaperStorage(snapshot);
        return D.idbDelete(D.DB.API_BLOB);
    }

    function prepareFolderWorkOrder(workOrder) {
        var mount = wallpaperDraftFolderMount;
        if (!mount) return Promise.reject(new Error(tr('folderNeedsPermission')));
        var folderId = mount.firstId;
        var initialBag = [mount.firstName].concat(mount.shuffleBag || []);
        var thumbLookahead = WF.buildPreviewWindow(mount.files, '', initialBag, FOLDER_THUMB_LOOKAHEAD);
        var previewWindow = mount.previewWindow || thumbLookahead.slice(0, FOLDER_GALLERY_LIMIT);
        var prepareSnapshot = null;
        return snapshotFolderPrepareStorage(thumbLookahead).then(function (snapshot) {
            prepareSnapshot = snapshot;
            return D.saveFolderHandle(mount.handle);
        }).then(function () {
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
            if (WF.pruneThumbs) WF.pruneThumbs(thumbLookahead);
            return WF.prewarmThumbs ? WF.prewarmThumbs(mount.handle, thumbLookahead, wallpaperBlur, FOLDER_THUMB_LOOKAHEAD) : Promise.resolve(false);
        }).then(function () {
            return WF.prewarmLightCache ? WF.prewarmLightCache(mount.handle, thumbLookahead, FOLDER_THUMB_LOOKAHEAD) : Promise.resolve(false);
        }).then(function () {
            var now = Date.now();
            var model = D.loadWallpaper();
            if (!model.providers) model.providers = {};
            if (!model.providers.folder) model.providers.folder = { config: {}, state: {} };
            if (WF.pruneThumbs) WF.pruneThumbs(thumbLookahead);
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
            return {
                prepared: true,
                rollback: function () {
                    return restoreFolderPrepareStorage(prepareSnapshot);
                }
            };
        }).catch(function (err) {
            if (!prepareSnapshot) throw err;
            return restoreFolderPrepareStorage(prepareSnapshot).then(function () {
                throw err;
            }, function () {
                throw err;
            });
        });
    }

    function snapshotWallhavenPrepareStorage() {
        var snapshot = snapshotWallpaperStorage();
        snapshot.wallhavenBlobs = {};
        if (!D.idbKeys || !D.idbGet || !D.DB || !D.DB.WALLHAVEN_PREFIX) return Promise.resolve(snapshot);
        return D.idbKeys().then(function (keys) {
            var wallhavenKeys = (keys || []).filter(function (key) {
                return String(key).indexOf(D.DB.WALLHAVEN_PREFIX) === 0;
            });
            return Promise.all(wallhavenKeys.map(function (key) {
                return D.idbGet(key).then(function (record) {
                    snapshot.wallhavenBlobs[key] = record;
                });
            })).then(function () {
                return snapshot;
            });
        });
    }

    function restoreWallhavenPrepareStorage(snapshot) {
        snapshot = snapshot || {};
        var savedBlobs = snapshot.wallhavenBlobs || {};
        if (!D.idbKeys || !D.idbDelete || !D.idbPut || !D.DB || !D.DB.WALLHAVEN_PREFIX) {
            restoreWallpaperStorage(snapshot);
            return Promise.resolve(true);
        }
        return D.idbKeys().then(function (keys) {
            var deletes = (keys || []).filter(function (key) {
                return String(key).indexOf(D.DB.WALLHAVEN_PREFIX) === 0 &&
                    !Object.prototype.hasOwnProperty.call(savedBlobs, key);
            }).map(function (key) {
                return D.idbDelete(key);
            });
            var restores = Object.keys(savedBlobs).map(function (key) {
                return restoreIdbValue(key, savedBlobs[key]);
            });
            return Promise.all(deletes.concat(restores));
        }).then(function () {
            restoreWallpaperStorage(snapshot);
            return true;
        });
    }

    function snapshotUploadPrepareStorage() {
        var snapshot = snapshotWallpaperStorage();
        snapshot.uploadBlobs = {};
        if (!D.idbKeys || !D.idbGet || !D.DB || !D.DB.UPLOAD_PREFIX) return Promise.resolve(snapshot);
        return D.idbKeys().then(function (keys) {
            var uploadKeys = (keys || []).filter(function (key) {
                return String(key).indexOf(D.DB.UPLOAD_PREFIX) === 0;
            });
            return Promise.all(uploadKeys.map(function (key) {
                return D.idbGet(key).then(function (record) {
                    snapshot.uploadBlobs[key] = record;
                });
            })).then(function () {
                return snapshot;
            });
        });
    }

    function restoreUploadPrepareStorage(snapshot) {
        snapshot = snapshot || {};
        var savedBlobs = snapshot.uploadBlobs || {};
        if (!D.idbKeys || !D.idbDelete || !D.idbPut || !D.DB || !D.DB.UPLOAD_PREFIX) {
            restoreWallpaperStorage(snapshot);
            return Promise.resolve(true);
        }
        return D.idbKeys().then(function (keys) {
            var deletes = (keys || []).filter(function (key) {
                return String(key).indexOf(D.DB.UPLOAD_PREFIX) === 0 &&
                    !Object.prototype.hasOwnProperty.call(savedBlobs, key);
            }).map(function (key) {
                return D.idbDelete(key);
            });
            var restores = Object.keys(savedBlobs).map(function (key) {
                return restoreIdbValue(key, savedBlobs[key]);
            });
            return Promise.all(deletes.concat(restores));
        }).then(function () {
            restoreWallpaperStorage(snapshot);
            return true;
        });
    }

    function createUploadImageRecord(file) {
        var id = 'upload_' + (F && F.generateId ? F.generateId() : String(Date.now()) + '_' + Math.random().toString(36).slice(2));
        var blobUrl = URL.createObjectURL(file);
        return S.thumbnail(blobUrl).then(function (thumb) {
            if (!thumb) throw new Error(tr('wallhavenThumbnailFailed'));
            if (wallpaperBlur < 5 || !S.blurredThumbnail) {
                URL.revokeObjectURL(blobUrl);
                return { id: id, file: file, thumb: thumb, blurThumb: null };
            }
            return S.blurredThumbnail(blobUrl, wallpaperBlur).then(function (blurThumb) {
                URL.revokeObjectURL(blobUrl);
                return { id: id, file: file, thumb: thumb, blurThumb: blurThumb || null };
            }, function () {
                URL.revokeObjectURL(blobUrl);
                return { id: id, file: file, thumb: thumb, blurThumb: null };
            });
        }, function (err) {
            URL.revokeObjectURL(blobUrl);
            throw err;
        });
    }

    function pruneUploadImageRecords(records) {
        var keep = {};
        (records || []).forEach(function (record) { keep[record.id] = true; });
        if (!D.idbKeys || !D.idbDelete) return Promise.resolve(false);
        return D.idbKeys().then(function (keys) {
            var deletes = (keys || []).filter(function (key) {
                if (String(key).indexOf(D.DB.UPLOAD_PREFIX) !== 0) return false;
                var id = 'upload_' + String(key).slice(String(D.DB.UPLOAD_PREFIX).length);
                return D.isUploadImageId ? (D.isUploadImageId(id) && !keep[id]) : (id !== uploadVideoId() && !keep[id]);
            }).map(function (key) {
                return D.idbDelete(key);
            });
            return Promise.all(deletes);
        });
    }

    function writeUploadImagePrepare(records, workOrder) {
        var puts = records.map(function (record) {
            return D.idbPut(D.imgKey(record.id), {
                blob: record.file,
                mime: record.file.type || '',
                name: record.file.name || '',
                size: record.file.size || 0,
                mediaType: 'image'
            });
        });
        return Promise.all(puts).then(function () {
            var order = records.map(function (record) { return record.id; });
            var thumbs = D.loadThumbs();
            var blurThumbs = D.loadBlurThumbs ? D.loadBlurThumbs() : {};
            var model = D.loadWallpaper();
            var meta = model.cache && model.cache.meta ? model.cache.meta : {};

            Object.keys(thumbs).forEach(function (id) { if (D.isUploadImageId && D.isUploadImageId(id)) delete thumbs[id]; });
            Object.keys(blurThumbs).forEach(function (id) { if (D.isUploadImageId && D.isUploadImageId(id)) delete blurThumbs[id]; });
            Object.keys(meta).forEach(function (id) { if (D.isUploadImageId && D.isUploadImageId(id)) delete meta[id]; });

            records.forEach(function (record) {
                thumbs[record.id] = record.thumb;
                if (record.blurThumb && wallpaperBlur >= 5) blurThumbs[record.id] = { blur: wallpaperBlur, thumb: record.blurThumb };
                meta[record.id] = {
                    name: record.file.name || '',
                    size: record.file.size || 0,
                    mediaType: 'image'
                };
            });

            if (!model.providers) model.providers = {};
            if (!model.providers.upload) model.providers.upload = { config: {}, state: {} };
            model.providers.upload.config = {
                rotation: 'sequential',
                activeMedia: 'image',
                galleryView: 'image'
            };
            model.cache = model.cache || {};
            model.cache.order = order;
            model.cache.index = 0;
            model.cache.meta = meta;

            D.saveWallpaper(model);
            D.saveThumbs(thumbs);
            if (D.saveBlurThumbs) D.saveBlurThumbs(blurThumbs);
            D.savePreview((records[0] && records[0].blurThumb && wallpaperBlur >= 5 ? records[0].blurThumb : records[0] && records[0].thumb) || null);
            workOrder.pendingConfig = clonePlain(model.providers.upload.config);
            if (wallpaperDraft && wallpaperDraft.providers && wallpaperDraft.providers.upload) {
                wallpaperDraft.providers.upload.config = clonePlain(model.providers.upload.config);
                wallpaperDraft.cache = clonePlain(model.cache);
            }
            return pruneUploadImageRecords(records);
        });
    }

    function writeUploadVideoPrepare(file, info, thumb, workOrder) {
        var id = uploadVideoId();
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
            var model = D.loadWallpaper();
            var thumbs = D.loadThumbs();
            var blurThumbs = D.loadBlurThumbs ? D.loadBlurThumbs() : {};
            var meta = model.cache && model.cache.meta ? model.cache.meta : {};
            if (!model.providers) model.providers = {};
            if (!model.providers.upload) model.providers.upload = { config: {}, state: {} };
            if (!model.providers.upload.state) model.providers.upload.state = {};

            thumbs[id] = thumb;
            delete blurThumbs[id];
            meta[id] = {
                name: file.name || '',
                size: file.size || 0,
                mediaType: 'video',
                duration: info.duration || 0,
                width: info.width || 0,
                height: info.height || 0
            };
            model.providers.upload.config = {
                rotation: 'sequential',
                activeMedia: 'video',
                galleryView: 'video'
            };
            model.providers.upload.state.videoId = id;
            model.cache = model.cache || {};
            model.cache.meta = meta;

            D.saveWallpaper(model);
            D.saveThumbs(thumbs);
            if (D.saveBlurThumbs) D.saveBlurThumbs(blurThumbs);
            D.savePreview(thumb);
            workOrder.pendingConfig = clonePlain(model.providers.upload.config);
            if (wallpaperDraft && wallpaperDraft.providers && wallpaperDraft.providers.upload) {
                wallpaperDraft.providers.upload.config = clonePlain(model.providers.upload.config);
                wallpaperDraft.providers.upload.state = clonePlain(model.providers.upload.state);
                wallpaperDraft.cache = clonePlain(model.cache);
            }
            return true;
        });
    }

    function prepareUploadWorkOrder(workOrder) {
        var mode = uploadModeFromConfig(workOrder && workOrder.pendingConfig);
        setPendingSourceHealth('upload', { state: 'Applying', reasonKey: 'wallpaperStatusUploadPicking', message: '' });
        return pickUploadFiles(mode).then(function (selection) {
            if (!selection || selection.cancelled) {
                return { cancelled: true, reasonKey: 'wallpaperStatusUploadCancelled', message: '' };
            }
            var files = selection.files || [];
            if (mode === 'video') {
                var video = files.filter(isVideoFile)[0];
                if (!video) throw new Error(tr('uploadVideoUnsupported'));
                setPendingSourceHealth('upload', { state: 'Applying', reasonKey: 'wallpaperStatusUploadPreparing', message: '' });
                return prepareUploadVideoFile(video).then(function (preparedVideo) {
                    return (S.videoThumbnail ? S.videoThumbnail(preparedVideo.file) : Promise.resolve(null)).then(function (thumb) {
                        if (!thumb) throw new Error(tr('uploadVideoPreviewFailed'));
                        var prepareSnapshot = null;
                        return snapshotUploadPrepareStorage().then(function (snapshot) {
                            prepareSnapshot = snapshot;
                            return writeUploadVideoPrepare(preparedVideo.file, preparedVideo.info, thumb, workOrder);
                        }).then(function () {
                            return {
                                prepared: true,
                                rollback: function () {
                                    return restoreUploadPrepareStorage(prepareSnapshot);
                                }
                            };
                        }).catch(function (err) {
                            if (!prepareSnapshot) throw err;
                            return restoreUploadPrepareStorage(prepareSnapshot).then(function () {
                                throw err;
                            }, function () {
                                throw err;
                            });
                        });
                    });
                });
            }

            var images = files.filter(isImageFile).slice(0, UPLOAD_IMAGE_LIMIT);
            if (!images.length) throw new Error(tr('uploadImageUnsupported'));
            setPendingSourceHealth('upload', { state: 'Applying', reasonKey: 'wallpaperStatusUploadPreparing', message: '' });
            return Promise.all(images.map(createUploadImageRecord)).then(function (records) {
                var prepareSnapshot = null;
                return snapshotUploadPrepareStorage().then(function (snapshot) {
                    prepareSnapshot = snapshot;
                    return writeUploadImagePrepare(records, workOrder);
                }).then(function () {
                    return {
                        prepared: true,
                        rollback: function () {
                            return restoreUploadPrepareStorage(prepareSnapshot);
                        }
                    };
                }).catch(function (err) {
                    if (!prepareSnapshot) throw err;
                    return restoreUploadPrepareStorage(prepareSnapshot).then(function () {
                        throw err;
                    }, function () {
                        throw err;
                    });
                });
            });
        });
    }

    function prepareWallhavenWorkOrder(workOrder) {
        if (!wallpaperDraftWallhavenTestResult || !F || !F.cacheWallhavenItems || !D.wallhavenFieldHash) return Promise.resolve(false);
        var config = D.normalizeWallhavenConfig ? D.normalizeWallhavenConfig(workOrder.pendingConfig || {}) : clonePlain(workOrder.pendingConfig || {});
        config.test = {
            status: 'passed',
            fieldHash: D.wallhavenFieldHash(config),
            testedAt: Date.now(),
            imageUrl: wallpaperDraftWallhavenTestResult.first && wallpaperDraftWallhavenTestResult.first.imageUrl || '',
            error: ''
        };
        workOrder.pendingConfig = clonePlain(config);
        if (wallpaperDraft && wallpaperDraft.providers && wallpaperDraft.providers.wallhaven) {
            wallpaperDraft.providers.wallhaven.config = clonePlain(config);
        }
        var prepareSnapshot = null;
        showRuntimeDownloadNotice('wallhaven', 'loading');
        return snapshotWallhavenPrepareStorage().then(function (snapshot) {
            prepareSnapshot = snapshot;
            return F.cacheWallhavenItems(config, wallpaperDraftWallhavenTestResult.items, {
                activate: false,
                queryUrl: wallpaperDraftWallhavenTestResult.queryUrl,
                onProgress: function (progress) {
                    showRuntimeDownloadNotice('wallhaven', 'loading', progress);
                }
            });
        }).then(function (result) {
            showRuntimeDownloadNotice('wallhaven', 'done', {
                cached: result.cached || 0,
                total: result.total || 0
            });
            return {
                prepared: true,
                rollback: function () {
                    return restoreWallhavenPrepareStorage(prepareSnapshot);
                }
            };
        }).catch(function (err) {
            showRuntimeDownloadNotice('wallhaven', 'error');
            if (!prepareSnapshot) throw err;
            return restoreWallhavenPrepareStorage(prepareSnapshot).then(function () {
                throw err;
            }, function () {
                throw err;
            });
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
        var prepareSnapshot = null;
        return snapshotApiPrepareStorage().then(function (snapshot) {
            prepareSnapshot = snapshot;
            return F.cacheApiResult(apiSource, apiType, wallpaperDraftApiTestResult);
        }).then(function () {
            if (wallpaperDraft && wallpaperDraft.providers && wallpaperDraft.providers.api) {
                wallpaperDraft.providers.api.config = clonePlain(workOrder.pendingConfig);
            }
            return {
                prepared: true,
                rollback: function () {
                    return restoreApiPrepareStorage(prepareSnapshot);
                }
            };
        }).catch(function (err) {
            if (!prepareSnapshot) throw err;
            return restoreApiPrepareStorage(prepareSnapshot).then(function () {
                throw err;
            }, function () {
                throw err;
            });
        });
    }

    function prepareWallpaperWorkOrder(workOrder) {
        var source = normalizeDraftSource(workOrder && workOrder.pendingSource);
        if (source === 'upload') return prepareUploadWorkOrder(workOrder);
        if (source === 'folder') return prepareFolderWorkOrder(workOrder);
        if (source === 'api') return prepareApiWorkOrder(workOrder);
        if (source === 'wallhaven') return prepareWallhavenWorkOrder(workOrder);
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
        workOrder.health = { state: 'Applying', reasonKey: 'wallpaperStatusApplying', message: '' };
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
            if (result && result.state === 'Cancelled') {
                workOrder.health = {
                    state: 'Ready',
                    reasonKey: result.reasonKey || 'wallpaperStatusUploadCancelled',
                    message: result.message || ''
                };
                refreshWallpaperApplyFooter();
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

    function buildUploadConfigHTML() {
        var config = pendingConfigForSource('upload') || {};
        var mode = uploadModeFromConfig(config);
        return '<div class="upload-apply-config" role="radiogroup" aria-label="' + escapeHtml(getSourceLabel('upload')) + '">' +
            '<button class="upload-mode-card' + (mode === 'image' ? ' active' : '') + '" type="button" role="radio" aria-checked="' + (mode === 'image' ? 'true' : 'false') + '" data-upload-mode="image">' +
                '<span class="upload-mode-icon" aria-hidden="true">IMG</span>' +
                '<span class="upload-mode-copy"><strong>' + escapeHtml(tr('uploadApplyImageTitle')) + '</strong><small>' + escapeHtml(tr('uploadApplyImageDesc')) + '</small></span>' +
            '</button>' +
            '<button class="upload-mode-card' + (mode === 'video' ? ' active' : '') + '" type="button" role="radio" aria-checked="' + (mode === 'video' ? 'true' : 'false') + '" data-upload-mode="video">' +
                '<span class="upload-mode-icon" aria-hidden="true">MP4</span>' +
                '<span class="upload-mode-copy"><strong>' + escapeHtml(tr('uploadApplyVideoTitle')) + '</strong><small>' + escapeHtml(tr('uploadApplyVideoDesc')) + '</small></span>' +
            '</button>' +
            '<p class="upload-apply-hint">' + escapeHtml(tr('uploadApplyModeHint')) + '</p>' +
            '<p class="wallpaper-source-help">' + escapeHtml(tr('uploadApplyPrivacyHint')) + '</p>' +
            '</div>';
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
            return '<button type="button" data-api-refresh-interval="' + value + '" class="' + (active ? 'active' : '') + '" aria-pressed="' + (active ? 'true' : 'false') + '">' + label + '</button>';
        }
        var refreshControl = '<div class="api-refresh-segments" role="group" aria-label="' + tr('rssRefreshInterval') + '">' +
            segment(0, tr('rssRefreshOff')) +
            segment(-1, tr('apiRefreshEveryTab')) +
            segment(86400000, tr('rssRefreshOneDay')) +
            segment(259200000, tr('rssRefreshThreeDays')) +
            segment(604800000, tr('rssRefreshSevenDays')) +
            '</div>';
        return '<div class="api-config" data-api-type="' + apiType + '">' +
            '<div class="api-type-tabs"><button type="button" data-api-type-tab="image" class="' + (apiType === 'image' ? 'active' : '') + '">' + tr('apiTypeImage') + '</button><button type="button" data-api-type-tab="json" class="' + (apiType === 'json' ? 'active' : '') + '">' + tr('apiTypeJson') + '</button></div>' +
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

    function wallhavenOption(value, label, current) {
        return '<option value="' + escapeHtml(value) + '"' + (String(value) === String(current) ? ' selected' : '') + '>' + escapeHtml(label) + '</option>';
    }

    function wallhavenCategoryToggle(bit, glyph, index, categories) {
        var active = categories.charAt(index) === '1';
        return '<button type="button" class="wallhaven-category-card' + (active ? ' active' : '') + '" data-wallhaven-category="' + bit + '" aria-label="Wallhaven ' + escapeHtml(glyph) + '" aria-pressed="' + (active ? 'true' : 'false') + '">' +
            '<span class="wallhaven-category-icon" aria-hidden="true">' + escapeHtml(glyph) + '</span>' +
            '</button>';
    }

    function wallhavenColorClass(color) {
        color = String(color || '').replace(/[^a-fA-F0-9]/g, '').toLowerCase();
        if (!/^[a-f0-9]{6}$/.test(color)) return '';
        if ((F.WALLHAVEN_COLORS || []).indexOf(color) === -1) return '';
        return 'wallhaven-color-' + color;
    }

    function buildWallhavenColorStrip(config) {
        var colors = F.WALLHAVEN_COLORS || [];
        var buttons = [];
        colors.forEach(function (color) {
            var active = config.color === color;
            buttons.push('<button type="button" class="wallhaven-color-swatch' + (active ? ' active' : '') + '" data-wallhaven-color="' + color + '" title="#' + color + '" aria-label="#' + color + '" aria-pressed="' + (active ? 'true' : 'false') + '"></button>');
        });
        return '<div class="wallhaven-color-picker">' +
            '<button type="button" class="wallhaven-color-any' + (!config.color ? ' active' : '') + '" data-wallhaven-color="" aria-pressed="' + (!config.color ? 'true' : 'false') + '">' + tr('wallhavenColorAny') + '</button>' +
            '<div class="wallhaven-color-strip" role="group" aria-label="' + tr('wallhavenColor') + '">' + buttons.join('') + '</div>' +
            '</div>';
    }

    function wallhavenCustomQueryHTML(config) {
        return '<div class="wallhaven-custom-query"><input id="wallhavenCustomQuery" type="text" value="' + escapeHtml(config.customQuery || '') + '" placeholder="+nature -city, type:jpg"></div>';
    }

    function wallhavenTopRangeHTML(config) {
        return settingItem(tr('wallhavenTopRange'), tr('wallhavenTopRangeHint'), '<select id="wallhavenTopRange">' +
            wallhavenOption('1d', '1d', config.topRange) +
            wallhavenOption('3d', '3d', config.topRange) +
            wallhavenOption('1w', '1w', config.topRange) +
            wallhavenOption('1M', '1M', config.topRange) +
            wallhavenOption('3M', '3M', config.topRange) +
            wallhavenOption('6M', '6M', config.topRange) +
            wallhavenOption('1y', '1y', config.topRange) +
            '</select>', 'setting-compact wallhaven-toprange-item');
    }

    function wallhavenSeedHTML(config) {
        return settingItem(tr('wallhavenSeed'), tr('wallhavenSeedHint'), '<input id="wallhavenSeed" type="text" value="' + escapeHtml(config.seed || '0') + '" placeholder="0">', 'setting-compact wallhaven-seed-item');
    }

    function wallhavenColorCurrentHTML(color) {
        color = String(color || '').replace(/[^a-fA-F0-9]/g, '').toLowerCase();
        var colorClass = wallhavenColorClass(color);
        if (!colorClass) {
            return '<span class="wallhaven-color-current"><span class="wallhaven-color-chip any"></span><strong>' + tr('wallhavenColorAny') + '</strong></span>';
        }
        return '<span class="wallhaven-color-current"><span class="wallhaven-color-chip ' + colorClass + '"></span><strong>#' + escapeHtml(color) + '</strong></span>';
    }

    function buildWallhavenConfigHTML() {
        var config = selectedDraftWallhavenConfig();
        var url = F.wallhavenSearchUrl ? F.wallhavenSearchUrl(config) : 'https://wallhaven.cc/api/v1/search';
        var presetOptions = ['nature', 'anime', 'landscape', 'city', 'space', 'forest', 'ocean', 'mountain', 'minimalism', 'abstract', 'cars', 'flowers']
            .map(function (value) { return wallhavenOption(value, value, config.queryPreset); }).join('') +
            wallhavenOption('custom', tr('wallhavenPresetCustom'), config.queryPreset);
        var customRow = config.queryPreset === 'custom' ? wallhavenCustomQueryHTML(config) : '';
        var sortingOptions =
            wallhavenOption('random', tr('wallhavenSortRandom'), config.sorting) +
            wallhavenOption('date_added', tr('wallhavenSortDateAdded'), config.sorting) +
            wallhavenOption('relevance', tr('wallhavenSortRelevance'), config.sorting) +
            wallhavenOption('views', tr('wallhavenSortViews'), config.sorting) +
            wallhavenOption('favorites', tr('wallhavenSortFavorites'), config.sorting) +
            wallhavenOption('toplist', tr('wallhavenSortToplist'), config.sorting);
        var topRange = config.sorting === 'toplist' ? wallhavenTopRangeHTML(config) : '';
        var seedRow = config.sorting === 'random' ? wallhavenSeedHTML(config) : '';
        var resolutionOptions =
            wallhavenOption('any', tr('wallhavenResolutionAny'), config.resolutionMode) +
            wallhavenOption('atleast-1920x1080', tr('wallhavenAtleast1080'), config.resolutionMode) +
            wallhavenOption('atleast-2560x1440', tr('wallhavenAtleast2k'), config.resolutionMode) +
            wallhavenOption('atleast-3840x2160', tr('wallhavenAtleast4k'), config.resolutionMode) +
            wallhavenOption('exact-1920x1080', tr('wallhavenExact1080'), config.resolutionMode) +
            wallhavenOption('exact-2560x1440', tr('wallhavenExact2k'), config.resolutionMode) +
            wallhavenOption('exact-3840x2160', tr('wallhavenExact4k'), config.resolutionMode);
        var ratioOptions =
            wallhavenOption('', tr('wallhavenAny'), config.ratio) +
            wallhavenOption('16x9', '16:9', config.ratio) +
            wallhavenOption('16x10', '16:10', config.ratio) +
            wallhavenOption('21x9', '21:9', config.ratio) +
            wallhavenOption('4x3', '4:3', config.ratio);
        var refreshControl = '<div class="wallhaven-refresh-segments" role="group" aria-label="' + tr('rssRefreshInterval') + '">' +
            '<button type="button" data-wallhaven-refresh-interval="0" class="' + (String(config.refreshIntervalMs) === '0' ? 'active' : '') + '" aria-pressed="' + (String(config.refreshIntervalMs) === '0' ? 'true' : 'false') + '">' + tr('rssRefreshOff') + '</button>' +
            '<button type="button" data-wallhaven-refresh-interval="86400000" class="' + (String(config.refreshIntervalMs) === '86400000' ? 'active' : '') + '" aria-pressed="' + (String(config.refreshIntervalMs) === '86400000' ? 'true' : 'false') + '">' + tr('rssRefreshOneDay') + '</button>' +
            '<button type="button" data-wallhaven-refresh-interval="259200000" class="' + (String(config.refreshIntervalMs) === '259200000' ? 'active' : '') + '" aria-pressed="' + (String(config.refreshIntervalMs) === '259200000' ? 'true' : 'false') + '">' + tr('rssRefreshThreeDays') + '</button>' +
            '<button type="button" data-wallhaven-refresh-interval="604800000" class="' + (String(config.refreshIntervalMs) === '604800000' ? 'active' : '') + '" aria-pressed="' + (String(config.refreshIntervalMs) === '604800000' ? 'true' : 'false') + '">' + tr('rssRefreshSevenDays') + '</button>' +
            '</div>';
        return '<div class="wallhaven-config">' +
            '<div class="wallhaven-controls">' +
            settingItem(tr('wallhavenSearch'), tr('wallhavenSearchHint'), '<select id="wallhavenPreset">' + presetOptions + '</select>' + customRow, 'setting-compact') +
            settingItem(tr('wallhavenCategories'), tr('wallhavenCategoriesHint'), '<div class="wallhaven-category-grid" role="group" aria-label="' + tr('wallhavenCategories') + '">' +
            wallhavenCategoryToggle('general', 'G', 0, config.categories) +
            wallhavenCategoryToggle('anime', 'A', 1, config.categories) +
            wallhavenCategoryToggle('people', 'P', 2, config.categories) +
            '</div>', 'setting-compact wallhaven-category-item') +
            settingItem(tr('wallhavenSorting'), tr('wallhavenSortingHint'), '<select id="wallhavenSorting">' + sortingOptions + '</select>', 'setting-compact') +
            topRange +
            seedRow +
            settingItem(tr('wallhavenResolution'), tr('wallhavenResolutionHint'), '<select id="wallhavenResolution">' + resolutionOptions + '</select>', 'setting-compact') +
            settingItem(tr('wallhavenRatio'), tr('wallhavenRatioHint'), '<select id="wallhavenRatio">' + ratioOptions + '</select>', 'setting-compact') +
            settingItem(tr('wallhavenColor'), tr('wallhavenColorHint'), '<details class="wallhaven-color-details"' + (config.color ? ' open' : '') + '><summary>' + wallhavenColorCurrentHTML(config.color) + '<span class="wallhaven-color-chevron"></span></summary>' + buildWallhavenColorStrip(config) + '</details>', 'setting-compact wallhaven-color-item') +
            settingItem(tr('rssRefreshInterval'), tr('wallhavenRefreshHint'), refreshControl, 'setting-compact wallhaven-refresh-item') +
            '</div>' +
            '<div class="wallhaven-url-row"><span>' + escapeHtml(url) + '</span><button id="wallhavenTestBtn" type="button">' + tr('apiTest') + '</button><a class="wallhaven-url-open" href="' + escapeHtml(url) + '" target="_blank" rel="noopener" aria-label="Wallhaven" title="' + escapeHtml(url) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 7H7a5 5 0 0 0 0 10h3m4-10h3a5 5 0 0 1 0 10h-3m-5-5h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></a></div>' +
            '<div class="wallhaven-notice" id="wallhavenNotice" hidden></div>' +
            '</div>';
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
        var previewAction = '<section class="search-preview-entry">' +
            '<div class="search-preview-entry-copy">' +
            '<h3>' + tr('searchPreviewAction') + '</h3>' +
            '<p>' + modalCopy('searchPreviewDesc') + '</p>' +
            '</div>' +
            '<button class="primary-action" id="searchPreviewOpenBtn" type="button">' + tr('searchPreviewAction') + '</button>' +
            '</section>';
        var body =
            previewAction +
            settingGroup(tr('settingsGroupSearchSurface'),
            settingItem(tr('searchSurface'), modalCopy('modalDescSearchSurface'), searchSurfaceControl) +
            settingItem(tr('searchBackground'), modalCopy('modalDescSearchBackground'), searchBgControl) +
            settingItem(tr('searchBlur'), modalCopy('modalDescSearchBlur'), searchBlurControl) +
            settingItem(tr('searchRadius'), modalCopy('modalDescSearchRadius'), radiusControl) +
            settingItem(tr('searchShadow'), modalCopy('modalDescSearchShadow'), searchShadowControl)) +
            settingGroup(tr('settingsGroupSearchLayout'),
            settingItem(tr('searchLabel'), modalCopy('modalDescSearchMode'), searchModeControl) +
            settingItem(tr('searchPosition'), modalCopy('modalDescSearchPosition'), searchPosControl) +
            settingItem(tr('searchWidth'), modalCopy('modalDescSearchWidth'), searchWidthControl) +
            settingItem(tr('searchIconVisibility'), modalCopy('modalDescSearchIconVisibility'), searchIconVisibilityControl) +
            settingItem(tr('searchIconPosition'), modalCopy('modalDescSearchIconPosition'), searchIconPositionControl)) +
            settingGroup(tr('settingsGroupSearchBehavior'),
            settingItem(tr('searchPlaceholderCustom'), modalCopy('modalDescSearchPlaceholder'), placeholderControl) +
            settingItem(tr('searchEnterBehavior'), modalCopy('modalDescSearchEnterBehavior'), enterBehaviorControl) +
            settingItem(tr('searchHistory'), modalCopy('modalDescSearchHistory'), searchHistoryControl)) +
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
            settingItem(tr('panelOpacityLabel'), modalCopy('modalDescPanelOpacity'), panelOpacityControl) +
            settingItem(tr('opacityLabel'), modalCopy('modalDescIconOpacity'), opacityControl) +
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
        var previewBtn = document.getElementById('searchPreviewOpenBtn');

        if (previewBtn) previewBtn.addEventListener('click', openSearchPreview);
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
            appConfirm(tr('resetSearchConfirm'), { variant: 'warning' }).then(function (ok) {
                if (ok) resetSearchDefaults();
            });
        });
        syncCustomSelects(modalContent);
    }

    function bindSearchPreviewEvents() {
        var panel = searchPreviewPanel;
        if (!panel) return;
        var closeBtn = panel.querySelector('#searchPreviewCloseBtn');
        var backBtn = panel.querySelector('#searchPreviewBackBtn');
        var selMode = panel.querySelector('#previewSearchMode');
        var selPos = panel.querySelector('#previewSearchPos');
        var selIconPosition = panel.querySelector('#previewSearchIconPosition');
        var selIconVisibility = panel.querySelector('#previewSearchIconVisibility');
        var selSurface = panel.querySelector('#previewSearchSurface');
        var selShadow = panel.querySelector('#previewSearchShadow');
        var selRadius = panel.querySelector('#previewSearchRadius');
        var searchWidthRange = panel.querySelector('#previewSearchWidthRange');
        var searchWidthNum = panel.querySelector('#previewSearchWidthNum');
        var searchBgRange = panel.querySelector('#previewSearchBgRange');
        var searchBgNum = panel.querySelector('#previewSearchBgNum');
        var searchBlurRange = panel.querySelector('#previewSearchBlurRange');
        var searchBlurNum = panel.querySelector('#previewSearchBlurNum');

        panel.addEventListener('click', function (e) { e.stopPropagation(); });
        if (closeBtn) closeBtn.addEventListener('click', function () { closeSearchPreview(); });
        if (backBtn) backBtn.addEventListener('click', returnToSearchSettings);
        if (selMode) selMode.addEventListener('change', function () { applySearchMode(this.value); syncSearchControls(); });
        if (selPos) selPos.addEventListener('change', function () { applySearchPosition(this.value); syncSearchControls(); });
        if (selIconPosition) selIconPosition.addEventListener('change', function () { applySearchIconPosition(this.value); syncSearchControls(); });
        if (selIconVisibility) selIconVisibility.addEventListener('change', function () { applySearchIconVisibility(this.value); syncSearchControls(); });
        if (selSurface) selSurface.addEventListener('change', function () { applySearchSurface(this.value); syncSearchControls(); });
        if (selShadow) selShadow.addEventListener('change', function () { applySearchShadow(this.value); syncSearchControls(); });
        if (selRadius) selRadius.addEventListener('change', function () { applySearchRadius(this.value); syncSearchControls(); });
        if (searchWidthRange) searchWidthRange.addEventListener('input', function () { applySearchWidth(this.value); if (searchWidthNum) searchWidthNum.value = searchWidth; });
        if (searchWidthNum) searchWidthNum.addEventListener('change', function () { applySearchWidth(this.value); if (searchWidthRange) searchWidthRange.value = searchWidth; this.value = searchWidth; });
        if (searchBgRange) searchBgRange.addEventListener('input', function () { applySearchBackgroundOpacity(this.value); if (searchBgNum) searchBgNum.value = searchBackgroundOpacity; });
        if (searchBgNum) searchBgNum.addEventListener('change', function () { applySearchBackgroundOpacity(this.value); if (searchBgRange) searchBgRange.value = searchBackgroundOpacity; this.value = searchBackgroundOpacity; });
        if (searchBlurRange) searchBlurRange.addEventListener('input', function () { applySearchBlur(this.value); if (searchBlurNum) searchBlurNum.value = searchBlur; });
        if (searchBlurNum) searchBlurNum.addEventListener('change', function () { applySearchBlur(this.value); if (searchBlurRange) searchBlurRange.value = searchBlur; this.value = searchBlur; });
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
        if (accentColorInput) {
            accentColorInput.addEventListener('input', function () { applyAccentColor(this.value); });
            accentColorInput.addEventListener('change', function () { applyAccentColor(this.value); });
        }
        if (reducedMotionCheck) reducedMotionCheck.addEventListener('change', function () { applyReducedMotion(this.checked); });
        if (resetBtn) resetBtn.addEventListener('click', function () {
            appConfirm(tr('resetAppearanceConfirm'), { variant: 'warning' }).then(function (ok) {
                if (ok) resetAppearanceDefaults();
            });
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
        var wallpaperBlurControl = '<label class="switch-control"><input type="checkbox" id="modalWallpaperBlur"' + (wallpaperBlur >= 5 ? ' checked' : '') + '><span></span></label>';
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
            settingItem(tr('overlayLabel'), modalCopy('modalDescOverlay'), overlayControl) +
            settingItem(tr('wallpaperVignette'), modalCopy('modalDescWallpaperVignette'), wallpaperVignetteControl) +
            settingItem(tr('wallpaperBlur'), modalCopy('modalDescWallpaperBlur'), wallpaperBlurControl));
    }

    function buildWallpaperSourceDetailHTML(source) {
        source = normalizeDraftSource(source);
        var detailMap = {
            bing: {
                title: getSourceLabel('bing'),
                desc: tr('sourceBingDesc'),
                body: '<p class="wallpaper-detail-note">' + escapeHtml(tr('bingConfigHint')) + '</p>'
            },
            upload: {
                title: getSourceLabel('upload'),
                desc: tr('sourceUploadDesc'),
                body: buildUploadConfigHTML()
            },
            folder: {
                title: getSourceLabel('folder'),
                desc: tr('sourceFolderDesc'),
                body: buildFolderConfigHTML()
            },
            rss: {
                title: getSourceLabel('rss'),
                desc: tr('sourceRssDesc'),
                body: buildRssConfigHTML()
            },
            wallhaven: {
                title: getSourceLabel('wallhaven'),
                desc: tr('sourceWallhavenDesc'),
                body: buildWallhavenConfigHTML()
            },
            api: {
                title: getSourceLabel('api'),
                desc: tr('sourceApiDesc'),
                body: buildApiConfigHTML()
            }
        };
        var detail = detailMap[source] || detailMap.bing;
        var status = validateWallpaperWorkOrder();
        var state = wallpaperStatusState(status);
        return '<div class="wallpaper-detail-card" data-source-detail-card="' + escapeHtml(source) + '">' +
            '<div class="wallpaper-detail-heading">' +
                '<div class="wallpaper-detail-summary">' +
                    '<span class="wallpaper-detail-source-dot ' + escapeHtml(source) + '" aria-hidden="true"></span>' +
                    '<div class="wallpaper-detail-title-stack">' +
                        '<span class="wallpaper-detail-kicker">' + escapeHtml(tr('settingsGroupWallpaperSource')) + '</span>' +
                        '<h3 class="wallpaper-detail-title">' + escapeHtml(detail.title) + '</h3>' +
                    '</div>' +
                    '<span class="wallpaper-detail-status" data-state="' + escapeHtml(state) + '">' + escapeHtml(wallpaperStatusText(status)) + '</span>' +
                '</div>' +
                '<p class="wallpaper-detail-explainer">' + escapeHtml(detail.desc) + '</p>' +
            '</div>' +
            '<div class="wallpaper-detail-body">' + detail.body + '</div>' +
            '</div>';
    }

    function bindWallpaperSourceDetailEvents() {
        bindUploadConfigEvents();
        bindFolderConfigEvents();
        bindRssConfigEvents();
        bindWallhavenConfigEvents();
        bindApiConfigEvents();
    }

    function wallpaperSettingsContext() {
        return {
            D: D,
            tr: tr,
            escapeHtml: escapeHtml,
            modalCopy: modalCopy,
            modalContent: modalContent,
            normalizeDraftSource: normalizeDraftSource,
            getSourceLabel: getSourceLabel,
            currentWallpaperWorkOrder: currentWallpaperWorkOrder,
            validateWallpaperWorkOrder: validateWallpaperWorkOrder,
            wallpaperStatusText: wallpaperStatusText,
            wallpaperStatusState: wallpaperStatusState,
            wallpaperApplyFooterHTML: wallpaperApplyFooterHTML,
            buildWallpaperDisplayHTML: buildWallpaperDisplayHTML,
            buildWallpaperSourceDetailHTML: buildWallpaperSourceDetailHTML,
            bindWallpaperSourceDetailEvents: bindWallpaperSourceDetailEvents,
            switchWallpaperWorkOrderSource: switchWallpaperWorkOrderSource,
            setWallpaperDraftOpenSource: setWallpaperDraftOpenSource,
            refreshWallpaperDraftTab: refreshWallpaperDraftTab,
            applyWallpaperDraft: applyWallpaperDraft,
            resetWallpaperDefaults: resetWallpaperDefaults,
            confirmAction: appConfirm
        };
    }

    function buildWallpaperHTML() {
        if (!wallpaperDraft) openWallpaperDraft();
        if (window.SettingsWallpaper && window.SettingsWallpaper.create) {
            wallpaperSettingsModule = window.SettingsWallpaper.create(wallpaperSettingsContext());
            return wallpaperSettingsModule.buildHTML();
        }
        return '<div class="wallpaper-tab-shell">' +
            '<div class="wallpaper-tab-header"><h2>' + tr('tabWallpaper') + '</h2><p>' + modalCopy('modalSubtitleWallpaper') + '</p></div>' +
            '<div class="wallpaper-tab-body">' + buildWallpaperSourceDetailHTML(normalizeDraftSource(currentWallpaperWorkOrder().pendingSource)) + buildWallpaperDisplayHTML() + '</div>' +
            wallpaperApplyFooterHTML() +
            '</div>';
    }

    function bindWallpaperEvents() {
        var wallpaperFitSel = document.getElementById('modalWallpaperFit');
        var wallpaperPositionSel = document.getElementById('modalWallpaperPosition');
        var wallpaperBlurSwitch = document.getElementById('modalWallpaperBlur');
        var wallpaperVignetteSel = document.getElementById('modalWallpaperVignette');
        var overlayRange = document.getElementById('modalOverlayRange');
        var overlayNum = document.getElementById('modalOverlayNum');

        if (wallpaperFitSel) wallpaperFitSel.addEventListener('change', function () { applyWallpaperFit(this.value); });
        if (wallpaperPositionSel) wallpaperPositionSel.addEventListener('change', function () { applyWallpaperPosition(this.value); });
        if (wallpaperBlurSwitch) wallpaperBlurSwitch.addEventListener('change', function () { applyWallpaperBlur(this.checked ? 5 : 0); });
        if (wallpaperVignetteSel) wallpaperVignetteSel.addEventListener('change', function () { applyWallpaperVignette(this.value); });
        if (overlayRange) overlayRange.addEventListener('input', function () { applyOverlayOpacity(this.value); if (overlayNum) overlayNum.value = this.value; });
        if (overlayNum) overlayNum.addEventListener('change', function () { applyOverlayOpacity(this.value); if (overlayRange) overlayRange.value = this.value; });

        if (wallpaperSettingsModule && wallpaperSettingsModule.bindEvents) {
            wallpaperSettingsModule.bindEvents(modalContent);
            return;
        }
        bindWallpaperSourceDetailEvents();
        var applyBtn = modalContent.querySelector('#wallpaperApplyBtn');
        if (applyBtn) applyBtn.addEventListener('click', applyWallpaperDraft);
        var reset = modalContent.querySelector('#wallpaperResetBtn');
        if (reset) reset.addEventListener('click', function () {
            appConfirm(tr('wallpaperResetConfirm'), { variant: 'danger' }).then(function (ok) {
                if (ok) resetWallpaperDefaults();
            });
        });
    }

    function bindUploadConfigEvents() {
        modalContent.querySelectorAll('[data-upload-mode]').forEach(function (button) {
            button.addEventListener('click', function (e) {
                e.stopPropagation();
                var mode = button.dataset.uploadMode === 'video' ? 'video' : 'image';
                switchWallpaperWorkOrderSource('upload');
                updatePendingSourceConfig('upload', function (pending) {
                    pending.rotation = pending.rotation || 'sequential';
                    pending.activeMedia = mode;
                    pending.galleryView = mode;
                });
                setPendingSourceHealth('upload', {
                    state: 'Ready',
                    reasonKey: 'wallpaperApplyReady',
                    message: ''
                });
                if (wallpaperDraft && wallpaperDraft.providers && wallpaperDraft.providers.upload) {
                    wallpaperDraft.providers.upload.config = clonePlain(currentWallpaperWorkOrder().pendingConfig);
                }
                refreshWallpaperDraftTab();
            });
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
                folderState.usingLightCache = false;
                if (D.saveFolderState) D.saveFolderState(folderState);
                if (window.reloadWallpaper) {
                    return Promise.resolve(window.reloadWallpaper()).then(function () { return folderState; });
                }
                return folderState;
            });
        });
    }

    function folderStatusText() {
        var draft = currentWallpaperDraft();
        var config = pendingConfigForSource('folder') || {};
        var state = draft.providers.folder.state || {};
        function labeled(key, label) {
            label = String(label || '').trim();
            return label ? tr(key) + ': ' + label : tr(key);
        }
        if (!WF || !WF.isSupported || !WF.isSupported()) return tr('folderUnsupported');
        if (wallpaperDraftFolderMount) {
            return labeled('folderReady', wallpaperDraftFolderMount.pathLabel || tr('sourceFolder')) + ' · ' + wallpaperDraftFolderMount.files.length + ' ' + tr('folderImagesUnit');
        }
        if (state.usingLightCache) return tr('folderNeedsPermission') + ' · ' + labeled('folderSaved', config.pathLabel || tr('sourceFolder'));
        if (state.status === 'needs-permission') return tr('folderNeedsPermission');
        if (state.status === 'ready' && config.pathLabel) return labeled('folderSaved', config.pathLabel) + (state.indexedCount ? (' · ' + state.indexedCount + ' ' + tr('folderImagesUnit')) : '');
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

    function folderNeedsReauth(state) {
        state = state || {};
        return state.status === 'needs-permission' || state.usingLightCache;
    }

    function folderStatusToneClass(message) {
        var draft = currentWallpaperDraft();
        var state = draft.providers.folder.state || {};
        if (!WF || !WF.isSupported || !WF.isSupported()) return ' is-error';
        if (message) {
            if (message === tr('folderNeedsPermission') || message === tr('folderEmpty')) return ' needs-attention';
            if (message === tr('folderReady') || message.indexOf(tr('folderReady') + ':') === 0 || message.indexOf(tr('folderSaved') + ':') === 0) return ' is-ready';
            return ' is-error';
        }
        if (wallpaperDraftFolderMount) return ' is-ready';
        if (state.usingLightCache || state.status === 'needs-permission' || state.status === 'empty') return ' needs-attention';
        if (state.status === 'ready') return ' is-ready';
        if (state.status === 'error') return ' is-error';
        return '';
    }

    function folderReauthLabel(state) {
        state = state || {};
        if (state.status === 'needs-permission' || state.usingLightCache) return tr('folderNeedsPermission');
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
        if (!el) return;
        el.classList.remove('is-ready', 'needs-attention', 'is-error');
        var tone = folderStatusToneClass(message);
        if (tone) tone.trim().split(/\s+/).forEach(function (className) { if (className) el.classList.add(className); });
        el.textContent = message || folderStatusText();
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
        var showReauth = supported && !!config.pathLabel && folderNeedsReauth(state);
        var label = wallpaperDraftFolderMount ? wallpaperDraftFolderMount.pathLabel : (config.pathLabel || tr('noFolderSelected'));
        return '<div class="folder-config">' +
            '<div class="folder-current' + folderPermissionStateClass(state) + '">' +
            '<div><span>' + tr('sourceFolder') + '</span><strong>' + escapeHtml(label) + '</strong></div>' +
            '<div class="folder-actions">' +
            (showReauth ? '<button id="folderReauthBtn" class="secondary-action" type="button">' + folderReauthLabel(state) + '</button>' : '') +
            '<button id="folderChooseBtn" class="primary-action" type="button"' + (supported ? '' : ' disabled') + '>' + tr('chooseFolder') + '</button>' +
            '</div>' +
            '</div>' +
            '<div class="folder-strategy-readonly"><span>' + tr('folderRotation') + '</span><strong>' + tr('strategyRandom') + '</strong></div>' +
            '<div class="wallpaper-source-help">' + escapeHtml(tr('folderPermissionHint')) + '</div>' +
            '<div class="folder-notice" id="folderNotice" hidden></div>' +
            '<div class="folder-status' + folderStatusToneClass() + '" id="folderStatus">' + escapeHtml(folderStatusText()) + '</div>' +
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
                reauthorizeSavedFolder().then(function (state) {
                    var draft = currentWallpaperDraft();
                    draft.providers.folder.state = D.normalizeFolderState ? D.normalizeFolderState(state || (D.loadFolderState ? D.loadFolderState() : {})) : (state || {});
                    refreshWallpaperDraftTab();
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
                var previewWindow = mount.previewWindow || WF.buildPreviewWindow(mount.files, '', initialBag, FOLDER_GALLERY_LIMIT);
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
                saveRssListConfig(next);
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
            function deleteRssSource() {
                config.sources = config.sources.filter(function (item) { return item.id !== source.id; });
                if (!config.sources.some(function (item) { return item.id === config.activeSourceId; })) config.activeSourceId = config.sources[0] ? config.sources[0].id : '';
                saveRssListConfig(config);
                if (wasRunningRssSource) {
                    switchRunningWallpaperToBing();
                }
                refreshWallpaperDraftTab();
            }
            if (wasRunningRssSource) {
                appConfirm(tr('wallpaperActiveSourceDeletedConfirm'), { variant: 'danger' }).then(function (ok) {
                    if (ok) deleteRssSource();
                });
                return;
            }
            deleteRssSource();
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

    function bindWallhavenConfigEvents() {
        var root = modalContent.querySelector('.wallhaven-config');
        if (!root) return;
        root.addEventListener('click', onWallhavenConfigClick);
        root.addEventListener('change', onWallhavenConfigChange);
        root.addEventListener('input', function (e) {
            if (e.target && e.target.id === 'wallhavenCustomQuery') {
                var config = currentWallpaperDraft().providers.wallhaven.config;
                config.customQuery = e.target.value.trim();
                touchWallhavenConfig(root, config);
            } else if (e.target && e.target.id === 'wallhavenSeed') {
                var seedConfig = currentWallpaperDraft().providers.wallhaven.config;
                seedConfig.seed = e.target.value.trim() || '0';
                touchWallhavenConfig(root, seedConfig);
            }
        });
        var colorDetails = root.querySelector('.wallhaven-color-details');
        if (colorDetails) {
            colorDetails.addEventListener('toggle', function () {
                syncWallpaperDetailLayout(root);
            });
        }
    }

    function resetWallhavenTest(config) {
        wallpaperDraftWallhavenTestResult = null;
        if (!config) return;
        config.test = { status: 'untested', fieldHash: '', testedAt: 0, imageUrl: '', error: '' };
    }

    function replacePlainObject(target, source) {
        target = target || {};
        Object.keys(target).forEach(function (key) { delete target[key]; });
        Object.keys(source || {}).forEach(function (key) {
            var value = source[key];
            target[key] = value && typeof value === 'object' ? clonePlain(value) : value;
        });
        return target;
    }

    function syncWallhavenConfig(config) {
        var normalized = D.normalizeWallhavenConfig ? D.normalizeWallhavenConfig(config || {}) : clonePlain(config || {});
        if (config) replacePlainObject(config, normalized);
        if (wallpaperDraft && wallpaperDraft.providers && wallpaperDraft.providers.wallhaven) {
            wallpaperDraft.providers.wallhaven.config = clonePlain(normalized);
        }
        updatePendingSourceConfig('wallhaven', function (pending) {
            replacePlainObject(pending, normalized);
        });
        return normalized;
    }

    function showRuntimeDownloadNotice(kind, phase, progress) {
        if (window.showWallpaperDownloadNotice) window.showWallpaperDownloadNotice(kind, phase, progress);
    }

    function syncWallpaperDetailLayout(root) {
        if (!root) return;
        requestAnimationFrame(function () { });
    }

    function updateWallhavenUrl(root, config) {
        if (!root || !F.wallhavenSearchUrl) return;
        var sourceConfig = config ? (D.normalizeWallhavenConfig ? D.normalizeWallhavenConfig(config) : config) : selectedDraftWallhavenConfig();
        var url = F.wallhavenSearchUrl(sourceConfig);
        var row = root.querySelector('.wallhaven-url-row span');
        if (row) row.textContent = url;
        var link = root.querySelector('.wallhaven-url-row a');
        if (link) link.href = url;
    }

    function touchWallhavenConfig(root, config) {
        resetWallhavenTest(config);
        syncWallhavenConfig(config);
        updateWallhavenUrl(root, config);
        refreshWallpaperApplyFooter();
    }

    function updateWallhavenCategoryUI(root, categories) {
        if (!root) return;
        var indexMap = { general: 0, anime: 1, people: 2 };
        root.querySelectorAll('[data-wallhaven-category]').forEach(function (button) {
            var index = indexMap[button.dataset.wallhavenCategory];
            var active = categories.charAt(index) === '1';
            button.classList.toggle('active', active);
            button.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
    }

    function updateWallhavenColorUI(root, color) {
        if (!root) return;
        root.querySelectorAll('[data-wallhaven-color]').forEach(function (button) {
            var active = (button.dataset.wallhavenColor || '') === (color || '');
            button.classList.toggle('active', active);
            button.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        var current = root.querySelector('.wallhaven-color-current');
        if (current) current.outerHTML = wallhavenColorCurrentHTML(color);
    }

    function closeWallhavenColorPicker(root) {
        if (!root) return;
        var details = root.querySelector('.wallhaven-color-details');
        if (!details || !details.open) return;
        details.open = false;
        syncWallpaperDetailLayout(root);
    }

    function updateWallhavenCustomQueryUI(root, config) {
        if (!root) return;
        var row = root.querySelector('.wallhaven-custom-query');
        if (config.queryPreset === 'custom') {
            if (!row) {
                var preset = root.querySelector('#wallhavenPreset');
                var anchor = preset && (preset.closest('.custom-select') || preset);
                if (anchor) anchor.insertAdjacentHTML('afterend', wallhavenCustomQueryHTML(config));
                syncWallpaperDetailLayout(root);
            }
        } else if (row) {
            row.remove();
            syncWallpaperDetailLayout(root);
        }
    }

    function updateWallhavenTopRangeUI(root, config) {
        if (!root) return;
        var row = root.querySelector('.wallhaven-toprange-item');
        if (config.sorting === 'toplist') {
            if (!row) {
                var sorting = root.querySelector('#wallhavenSorting');
                var sortingItem = sorting && sorting.closest('.setting-item');
                if (sortingItem) {
                    sortingItem.insertAdjacentHTML('afterend', wallhavenTopRangeHTML(config));
                    enhanceModalSelects(root);
                    syncWallpaperDetailLayout(root);
                }
            }
        } else if (row) {
            row.remove();
            syncWallpaperDetailLayout(root);
        }
    }

    function updateWallhavenSeedUI(root, config) {
        if (!root) return;
        var row = root.querySelector('.wallhaven-seed-item');
        if (config.sorting === 'random') {
            if (!row) {
                var sorting = root.querySelector('#wallhavenSorting');
                var sortingItem = sorting && sorting.closest('.setting-item');
                if (sortingItem) {
                    sortingItem.insertAdjacentHTML('afterend', wallhavenSeedHTML(config));
                    syncWallpaperDetailLayout(root);
                }
            }
        } else if (row) {
            row.remove();
            syncWallpaperDetailLayout(root);
        }
    }

    function onWallhavenConfigChange(e) {
        var config = currentWallpaperDraft().providers.wallhaven.config;
        var root = e.currentTarget;
        if (e.target.id === 'wallhavenPreset') {
            config.queryPreset = e.target.value;
            updateWallhavenCustomQueryUI(root, config);
            touchWallhavenConfig(root, config);
            return;
        }
        if (e.target.id === 'wallhavenSorting') {
            config.sorting = e.target.value;
            updateWallhavenTopRangeUI(root, config);
            updateWallhavenSeedUI(root, config);
            touchWallhavenConfig(root, config);
            return;
        }
        if (e.target.id === 'wallhavenTopRange') config.topRange = e.target.value;
        if (e.target.id === 'wallhavenSeed') config.seed = e.target.value.trim() || '0';
        if (e.target.id === 'wallhavenResolution') config.resolutionMode = e.target.value;
        if (e.target.id === 'wallhavenRatio') config.ratio = e.target.value;
        touchWallhavenConfig(root, config);
    }

    function onWallhavenConfigClick(e) {
        var target = e.target;
        var config = currentWallpaperDraft().providers.wallhaven.config;
        var category = target.closest('[data-wallhaven-category]');
        if (category) {
            e.preventDefault();
            e.stopPropagation();
            var indexMap = { general: 0, anime: 1, people: 2 };
            var index = indexMap[category.dataset.wallhavenCategory];
            var bits = (config.categories || '111').split('');
            bits[index] = bits[index] === '1' ? '0' : '1';
            if (bits.join('') === '000') bits[index] = '1';
            config.categories = bits.join('');
            updateWallhavenCategoryUI(category.closest('.wallhaven-config'), config.categories);
            touchWallhavenConfig(category.closest('.wallhaven-config'), config);
            return;
        }
        var color = target.closest('[data-wallhaven-color]');
        if (color) {
            e.preventDefault();
            e.stopPropagation();
            var colorRoot = color.closest('.wallhaven-config');
            var nextColor = color.dataset.wallhavenColor || '';
            if (config.color !== nextColor) {
                config.color = nextColor;
                updateWallhavenColorUI(colorRoot, config.color);
                touchWallhavenConfig(colorRoot, config);
            }
            closeWallhavenColorPicker(colorRoot);
            return;
        }
        var refreshBtn = target.closest('[data-wallhaven-refresh-interval]');
        if (refreshBtn) {
            e.preventDefault();
            e.stopPropagation();
            config.refreshIntervalMs = parseInt(refreshBtn.dataset.wallhavenRefreshInterval, 10);
            refreshBtn.parentNode.querySelectorAll('[data-wallhaven-refresh-interval]').forEach(function (button) {
                button.classList.toggle('active', button === refreshBtn);
                button.setAttribute('aria-pressed', button === refreshBtn ? 'true' : 'false');
            });
            touchWallhavenConfig(refreshBtn.closest('.wallhaven-config'), config);
            return;
        }
        if (target.id === 'wallhavenTestBtn') {
            runWallhavenTest(config, target);
            return;
        }
    }

    function showWallhavenNotice(message, type) {
        var el = document.getElementById('wallhavenNotice');
        if (!el) return;
        clearTimeout(wallhavenNoticeTimer);
        wallhavenNoticeTimer = null;
        wallhavenNoticeToken += 1;
        el.textContent = message || '';
        el.dataset.type = type || 'info';
        el.hidden = !message;
        syncWallpaperDetailLayout(el.closest('.wallhaven-config'));
    }

    function wallhavenErrorMessage(err) {
        var map = {
            NO_WALLHAVEN_IMAGES: tr('wallhavenNoImages'),
            NO_USABLE_WALLHAVEN_IMAGES: tr('wallhavenNoUsableImages'),
            WALLHAVEN_JSON_PARSE_FAILED: tr('apiJsonParseFailed'),
            WALLHAVEN_THUMBNAIL_FAILED: tr('wallhavenThumbnailFailed'),
            API_CORS_OR_NETWORK: tr('apiCorsFailed'),
            API_TIMEOUT: tr('apiTimeout'),
            API_FETCH_FAILED: tr('apiLoadFailed'),
            API_NOT_IMAGE: tr('apiNotImage'),
            API_IMAGE_DOWNLOAD_FAILED: tr('apiImageDownloadFailed')
        };
        return map[err && err.code] || (err && err.message ? err.message : String(err || tr('wallhavenLoadFailed')));
    }

    function runWallhavenTest(config, button) {
        if (!F.testWallhavenSource || !D.wallhavenFieldHash) return;
        var testConfig = syncWallhavenConfig(config);
        setPendingSourceHealth('wallhaven', { state: 'Testing', reasonKey: 'wallpaperStatusTesting', message: '' });
        button.disabled = true;
        button.classList.add('testing');
        showWallhavenNotice(tr('rssTesting'), 'info');
        F.testWallhavenSource(testConfig).then(function (result) {
            var normalized = D.normalizeWallhavenConfig ? D.normalizeWallhavenConfig(config || {}) : clonePlain(config || {});
            config.test = {
                status: 'passed',
                fieldHash: D.wallhavenFieldHash(normalized),
                testedAt: Date.now(),
                imageUrl: result.first && result.first.imageUrl || '',
                error: ''
            };
            wallpaperDraftWallhavenTestResult = result;
            syncWallhavenConfig(config);
            setPendingSourceHealth('wallhaven', { state: 'Ready', reasonKey: 'wallpaperApplyReady', message: '' });
            showWallhavenNotice(tr('wallhavenTestOk') + ' ' + result.count, 'success');
            refreshWallpaperApplyFooter();
        }).catch(function (err) {
            var message = wallhavenErrorMessage(err);
            config.test = {
                status: 'failed',
                fieldHash: D.wallhavenFieldHash(selectedDraftWallhavenConfig()),
                testedAt: Date.now(),
                imageUrl: '',
                error: message
            };
            wallpaperDraftWallhavenTestResult = null;
            syncWallhavenConfig(config);
            setPendingSourceHealth('wallhaven', { state: 'Error', reasonKey: 'wallpaperStatusTestFailed', message: message });
            showWallhavenNotice(message, 'error');
            refreshWallpaperApplyFooter();
        }).finally(function () {
            button.disabled = false;
            button.classList.remove('testing');
        });
    }

    function syncApiAddButtonState(root) {
        var urlInput = root && root.querySelector('#apiUrlInput');
        var addBtn = root && root.querySelector('#apiAddBtn');
        if (!urlInput || !addBtn) return;
        var valid = F.isHttpsUrl(urlInput.value.trim());
        addBtn.disabled = !valid;
    }

    function touchApiConfig(root, config) {
        refreshWallpaperApplyFooter();
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
            saveApiListConfig(config);
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
            e.preventDefault();
            e.stopPropagation();
            config.refreshIntervalMs = parseInt(refreshBtn.dataset.apiRefreshInterval, 10);
            currentWallpaperDraft().providers.api.config.refreshIntervalMs = config.refreshIntervalMs;
            updatePendingSourceConfig('api', function (pending) { pending.refreshIntervalMs = config.refreshIntervalMs; });
            root.querySelectorAll('[data-api-refresh-interval]').forEach(function (button) {
                button.classList.toggle('active', button === refreshBtn);
                button.setAttribute('aria-pressed', button === refreshBtn ? 'true' : 'false');
            });
            touchApiConfig(root, config);
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
            function deleteApiSource() {
                listForRow.splice(listForRow.indexOf(sourceForRow), 1);
                if (row.dataset.apiType === 'json') config.activeJsonSourceId = listForRow[0] ? listForRow[0].id : '';
                else config.activeImageSourceId = listForRow[0] ? listForRow[0].id : '';
                saveApiListConfig(config);
                if (wasRunningApiSource) {
                    switchRunningWallpaperToBing();
                }
                wallpaperDraftApiTestResult = null;
                refreshWallpaperDraftTab();
            }
            if (wasRunningApiSource) {
                appConfirm(tr('wallpaperActiveSourceDeletedConfirm'), { variant: 'danger' }).then(function (ok) {
                    if (ok) deleteApiSource();
                });
                return;
            }
            deleteApiSource();
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
            settingGroup(tr('cpGroupOpen'),
            settingItem(tr('cpPlacementLabel'), modalCopy('modalDescPalettePlacement'), placementControl, 'setting-compact') +
            settingItem(tr('cpHotkeyLabel'), modalCopy('modalDescHotkey'), '<input type="text" class="hotkey-input" id="hkNormal" value="' + hkNormal + '" readonly>') +
            settingItem(tr('cpHiddenHotkeyLabel'), modalCopy('modalDescHiddenHotkey'), '<input type="text" class="hotkey-input" id="hkHidden" value="' + hkHidden + '" readonly>')) +
            settingGroup(tr('cpGroupContent'),
            settingItem(tr('cpRecommendLabel'), modalCopy('modalDescRecommend'), '<label class="switch-control"><input type="checkbox" id="cpRecommend"' + checked + '><span></span></label>', 'setting-compact')) +
            settingGroup(tr('cpGroupAppearance'),
            settingItem(tr('cpSkinLabel'), modalCopy('modalDescPaletteSkin'), skinControl, 'setting-compact')) +
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
            appConfirm(tr('resetShortcutsConfirm'), { variant: 'warning' }).then(function (ok) {
                if (ok) resetShortcutsDefaults();
            });
        });
    }

    function buildDataHTML() {
        var jsonControl = '<div class="data-inline-control data-single-control"><button class="primary-action" id="dataExportJsonBtn" type="button">' + tr('dataExportJson') + '</button></div>';
        var encryptedControl = '<div class="data-inline-control"><input id="dataExportPass" type="password" autocomplete="new-password" placeholder="' + tr('dataPassphrase') + '"><button class="primary-action" id="dataExportEncryptedBtn" type="button">' + tr('dataExportEncrypted') + '</button></div>';
        var importControl = '<div class="data-inline-control"><span class="data-file-name" id="dataImportFileName"></span><button class="primary-action" id="dataImportChooseBtn" type="button">' + tr('dataChooseFile') + '</button></div>';
        var importPassControl = '<div class="data-inline-control"><input id="dataImportPass" type="password" autocomplete="current-password" placeholder="' + tr('dataPassphrase') + '"><button class="primary-action" id="dataImportRunBtn" type="button" disabled>' + tr('dataImport') + '</button></div>';
        var body = settingGroup(tr('dataExport'),
            settingItem(tr('dataEncrypted'), modalCopy('modalDescDataEncrypted'), encryptedControl) +
            settingItem('JSON', modalCopy('modalDescDataJson'), jsonControl, 'setting-compact')) +
            settingGroup(tr('dataImport'),
            settingItem(tr('dataBackupFile'), modalCopy('modalDescDataImport'), importControl, 'setting-compact') +
            settingItem(tr('dataImportPass'), modalCopy('modalDescDataImportPass'), importPassControl, 'setting-compact')) +
            '<div class="data-status" id="dataStatus" hidden></div>';
        return buildPageShell(tr('tabData'), modalCopy('modalSubtitleData'), body);
    }

    function buildRestoreHTML() {
        var searchControl = '<button class="restore-action" id="restoreSearchBtn" type="button">' + tr('resetSearchDefaults') + '</button>';
        var appearanceControl = '<button class="restore-action" id="restoreAppearanceBtn" type="button">' + tr('resetAppearanceDefaults') + '</button>';
        var wallpaperControl = '<button class="restore-action danger" id="restoreWallpaperBtn" type="button">' + tr('wallpaperResetDefaults') + '</button>';
        var shortcutsControl = '<button class="restore-action" id="restoreShortcutsBtn" type="button">' + tr('resetShortcutsDefaults') + '</button>';
        var allControl = '<button class="restore-action danger" id="restoreAllBtn" type="button">' + tr('resetAllDefaults') + '</button>';
        var body =
            settingGroup(tr('settingsGroupRestoreScoped'),
            settingItem(tr('tabWallpaper'), modalCopy('modalDescResetWallpaper'), wallpaperControl, 'setting-compact') +
            settingItem(tr('tabSearch'), modalCopy('modalDescResetSearch'), searchControl, 'setting-compact') +
            settingItem(tr('tabAppearance'), modalCopy('modalDescResetAppearance'), appearanceControl, 'setting-compact') +
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
            appConfirm(tr('resetAppearanceConfirm'), { variant: 'warning' }).then(function (ok) {
                if (ok) resetAppearanceDefaults();
            });
        });
        if (searchBtn) searchBtn.addEventListener('click', function () {
            appConfirm(tr('resetSearchConfirm'), { variant: 'warning' }).then(function (ok) {
                if (ok) resetSearchDefaults();
            });
        });
        if (wallpaperBtn) wallpaperBtn.addEventListener('click', function () {
            appConfirm(tr('wallpaperResetConfirm'), { variant: 'danger' }).then(function (ok) {
                if (ok) resetWallpaperDefaults();
            });
        });
        if (shortcutsBtn) shortcutsBtn.addEventListener('click', function () {
            appConfirm(tr('resetShortcutsConfirm'), { variant: 'warning' }).then(function (ok) {
                if (ok) resetShortcutsDefaults();
            });
        });
        if (allBtn) allBtn.addEventListener('click', function () {
            appConfirm(tr('resetAllConfirm'), { variant: 'danger' }).then(function (ok) {
                if (ok) resetAllDefaults();
            });
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
        var importBtn = document.getElementById('dataImportRunBtn');
        var fileName = document.getElementById('dataImportFileName');
        var selectedImportFile = null;
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,.ptab,application/json';
        if (_tabPages.data) _tabPages.data.appendChild(input);

        if (jsonBtn) jsonBtn.addEventListener('click', exportPlainDataBackup);
        if (encryptedBtn) encryptedBtn.addEventListener('click', exportEncryptedDataBackup);
        if (chooseBtn) chooseBtn.addEventListener('click', function () { input.click(); });
        if (importBtn) importBtn.addEventListener('click', function () {
            if (!selectedImportFile) {
                setDataStatus(tr('dataChooseBackupFirst'), 'error');
                return;
            }
            importDataBackup(selectedImportFile);
        });
        input.addEventListener('change', function () {
            var file = input.files && input.files[0];
            input.value = '';
            if (!file) return;
            selectedImportFile = file;
            if (fileName) fileName.textContent = file.name;
            if (importBtn) importBtn.disabled = false;
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
            '<div class="about-version">v3.2.2</div>' +
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

    function defaultSearchPosition() {
        if (window.matchMedia && window.matchMedia('(max-width: 480px)').matches) return 'upper';
        return DEFAULT_SEARCH_POSITION;
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
        return normalized > 0 ? 5 : 0;
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

    function applyAccentPreference() {
        if (accentMode !== 'custom') return;
        var rgb = hexToRgb(accentColor);
        if (!rgb) return;
        applyCustomAccentTheme(rgb);
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
        if (on) {
            if (window.PlainTabTheme && window.PlainTabTheme.applyWallpaperTheme) {
                window.PlainTabTheme.applyWallpaperTheme();
            }
            if (window.WallpaperTheme && window.WallpaperTheme.hasCurrent()) {
                window.WallpaperTheme.applyCurrent();
            } else if (window.WallpaperShow && window.WallpaperShow.refreshTheme) {
                window.WallpaperShow.refreshTheme(true);
            }
        } else {
            applyDefaultSurfaceTheme();
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
        wallpaperBlur = normalizeWallpaperBlur(wallpaper.blur !== undefined ? wallpaper.blur : DEFAULT_WALLPAPER_BLUR);
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
        applySearchPosition(defaultSearchPosition());
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
        applyThemeMode(false);
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
                var order = isWallhavenWallpaperMode() && D.activeWallhavenOrder ? D.activeWallhavenOrder() : D.loadOrder();
                saveNextPreviewFromOrder(order, D.loadThumbs());
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

    function isWallhavenWallpaperMode() {
        var source = D.compatMode ? D.compatMode(D.getActiveSource()) : currentMode;
        return source === 'wallhaven' || currentMode === 'wallhaven';
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
        var order = isRssWallpaperMode() ? activeRssOrder() : (isWallhavenWallpaperMode() && D.activeWallhavenOrder ? D.activeWallhavenOrder() : D.loadOrder());
        if (!order.length) return null;
        if (isRssWallpaperMode() && D.loadRssConfig && D.loadRssConfig().displayMode === 'latest') return order[0];
        var index = D.getActiveIndex();
        var currentIndex = isLocalWallpaperMode() || isRssWallpaperMode() || isWallhavenWallpaperMode() ? (index - 1 + order.length) % order.length : index % order.length;
        return order[currentIndex];
    }

    function updateStoredPreviewAfterBlurChange(id, preview) {
        if (isLocalWallpaperMode() || isWallhavenWallpaperMode()) {
            var order = isWallhavenWallpaperMode() && D.activeWallhavenOrder ? D.activeWallhavenOrder() : D.loadOrder();
            saveNextPreviewFromOrder(order, D.loadThumbs());
            scheduleNextBlurPreviewFromOrder(order);
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

    function wallhavenGalleryItems() {
        var order = D.activeWallhavenOrder ? D.activeWallhavenOrder() : [];
        var thumbs = D.loadThumbs();
        var meta = D.loadMeta();
        if (!order.length) return singleGalleryItems('wallhaven');
        return order.slice(0, 12).map(function (id) {
            var item = meta[id] || {};
            return {
                id: id,
                source: 'wallhaven',
                title: item.wallhavenId || id,
                bg: thumbs[id] || '',
                deletable: true,
                draggable: true
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
        if (currentMode === 'wallhaven') return renderGallery(wallhavenGalleryItems(), {
            source: 'wallhaven',
            draggable: true,
            deleteItem: function (id) { deleteWallhavenImage(id); },
            loadOrder: function () { return D.activeWallhavenOrder ? D.activeWallhavenOrder() : []; },
            saveOrder: function (order) { if (D.saveWallhavenOrder) D.saveWallhavenOrder(order); }
        });
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
            return ensureUploadVideoThumbnail(videoId, videoRecord, thumbs).then(function () {
                renderUploadGallery(order, images, thumbs, videoRecord || m[videoId] || null);
            });
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
        if (!order.length) {
            return [{
                id: 'upload_image_empty',
                source: 'upload',
                title: tr('addImage'),
                bg: '',
                fallback: 'IMG',
                mediaType: 'image-empty',
                deletable: false,
                draggable: false
            }];
        }
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

    function ensureUploadVideoThumbnail(id, record, thumbs) {
        if (!id || (thumbs && thumbs[id]) || !record || !record.blob || !S.videoThumbnail) {
            return Promise.resolve(thumbs && thumbs[id] || '');
        }
        return S.videoThumbnail(record.blob).then(function (thumb) {
            if (!thumb) return '';
            thumbs[id] = thumb;
            D.saveThumbs(thumbs);
            if (uploadModeFromConfig(uploadConfig()) === 'video' && D.savePreview) D.savePreview(thumb);
            return thumb;
        }).catch(function () {
            return '';
        });
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
                    if (typeof options.deleteItem === 'function') options.deleteItem(this.dataset.id, this.dataset.mediaType || 'image');
                    else if (this.dataset.mediaType === 'video') deleteUploadVideo();
                    else deleteLocalImage(this.dataset.id);
                });
                card.appendChild(delBtn);
            }

            grid.appendChild(card);
        });

        return grid;
    }

    function setupGalleryDrag(grid, options) {
        options = options || {};
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
                        var loadOrder = options.loadOrder || D.loadOrder;
                        var saveOrder = options.saveOrder || D.saveOrder;
                        var oldOrder = loadOrder();
                        if (newOrder.length === oldOrder.length &&
                            newOrder.some(function (id, i) { return id !== oldOrder[i]; })) {
                            saveOrder(newOrder);
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

        if (options.draggable) setupGalleryDrag(grid, options);
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
        return type === 'video/mp4' || type === 'video/webm' ||
            (!type && /\.(mp4|webm)$/.test(name)) || /\.(mp4|webm)$/.test(name);
    }

    function validateVideoFile(file) {
        if (!file || !isVideoFile(file)) return Promise.reject(new Error(tr('uploadVideoUnsupported')));
        if (file.size > UPLOAD_VIDEO_MAX_BYTES) return Promise.reject(new Error(tr('uploadVideoTooLarge')));
        var probe = document.createElement('video');
        var mime = file.type || (/\.webm$/i.test(file.name || '') ? 'video/webm' : 'video/mp4');
        if (probe.canPlayType && mime && !probe.canPlayType(mime)) {
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

    function videoRecorderMimeType() {
        if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return '';
        var types = [
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8',
            'video/webm'
        ];
        for (var i = 0; i < types.length; i++) {
            if (MediaRecorder.isTypeSupported(types[i])) return types[i];
        }
        return '';
    }

    function optimizedVideoName(file) {
        var base = String(file && file.name || 'wallpaper-video').replace(/\.[^.]+$/, '');
        return base + '-' + UPLOAD_VIDEO_OPTIMIZE_FPS + 'fps.webm';
    }

    function fileFromVideoBlob(blob, sourceFile, mime) {
        var name = optimizedVideoName(sourceFile);
        if (typeof File === 'function') {
            return new File([blob], name, { type: mime || blob.type || 'video/webm' });
        }
        blob.name = name;
        return blob;
    }

    function estimateVideoFrameRate(file, info) {
        if (!HTMLVideoElement.prototype.requestVideoFrameCallback) return Promise.resolve(0);
        return new Promise(function (resolve) {
            var url = URL.createObjectURL(file);
            var video = document.createElement('video');
            var done = false;
            var timeout = null;
            video.muted = true;
            video.playsInline = true;
            video.preload = 'auto';

            function cleanup(fps) {
                if (done) return;
                done = true;
                clearTimeout(timeout);
                try { video.pause(); } catch (e) { }
                video.removeAttribute('src');
                try { video.load(); } catch (e) { }
                URL.revokeObjectURL(url);
                resolve(fps || 0);
            }

            function onReady() {
                var startFrames = null;
                var startTime = null;
                var latestFps = 0;
                var sampleSeconds = Math.min(UPLOAD_VIDEO_FPS_SAMPLE_SECONDS, Math.max(0.35, ((info && info.duration) || video.duration || 1) / 2));
                function onFrame(now, metadata) {
                    if (done) return;
                    var frames = metadata.presentedFrames || 0;
                    var mediaTime = metadata.mediaTime || video.currentTime || 0;
                    if (startFrames === null) {
                        startFrames = frames;
                        startTime = mediaTime;
                    }
                    var elapsed = mediaTime - startTime;
                    var frameCount = frames - startFrames;
                    latestFps = frameCount / Math.max(elapsed, 0.001);
                    if (elapsed >= sampleSeconds || frameCount >= 90) {
                        cleanup(latestFps);
                        return;
                    }
                    video.requestVideoFrameCallback(onFrame);
                }
                video.addEventListener('ended', function () { cleanup(latestFps); }, { once: true });
                video.requestVideoFrameCallback(onFrame);
                var playResult;
                try { playResult = video.play(); } catch (e) { cleanup(0); return; }
                if (playResult && typeof playResult.catch === 'function') playResult.catch(function () { cleanup(0); });
            }

            video.addEventListener('loadeddata', onReady, { once: true });
            video.addEventListener('error', function () { cleanup(0); }, { once: true });
            timeout = setTimeout(function () { cleanup(0); }, 4500);
            video.src = url;
            video.load();
        });
    }

    function optimizeVideoFrameRate(file, info) {
        var mimeType = videoRecorderMimeType();
        if (!mimeType || !HTMLCanvasElement.prototype.captureStream) {
            return Promise.reject(new Error('video optimization unsupported'));
        }

        return new Promise(function (resolve, reject) {
            var url = URL.createObjectURL(file);
            var video = document.createElement('video');
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            var chunks = [];
            var recorder = null;
            var stream = null;
            var drawTimer = null;
            var progressTimer = null;
            var startTimer = null;
            var recordingStarted = false;
            var done = false;

            video.muted = true;
            video.playsInline = true;
            video.preload = 'auto';

            function progressPercent() {
                var duration = (info && info.duration) || video.duration || 0;
                if (!duration) return 0;
                return Math.max(0, Math.min(99, Math.round((video.currentTime / duration) * 100)));
            }

            function notifyProgress() {
                showRuntimeDownloadNotice('uploadVideo', 'loading', { percent: progressPercent() });
            }

            function cleanup() {
                clearInterval(drawTimer);
                clearInterval(progressTimer);
                clearTimeout(startTimer);
                try { video.pause(); } catch (e) { }
                video.removeAttribute('src');
                try { video.load(); } catch (e) { }
                URL.revokeObjectURL(url);
                if (stream) {
                    try { stream.getTracks().forEach(function (track) { track.stop(); }); } catch (e) { }
                }
                if (canvas) {
                    canvas.width = 0;
                    canvas.height = 0;
                }
            }

            function fail(err) {
                if (done) return;
                done = true;
                cleanup();
                reject(err);
            }

            function drawFrame() {
                if (!video.videoWidth || !video.videoHeight) return;
                try { ctx.drawImage(video, 0, 0, canvas.width, canvas.height); } catch (e) { }
            }

            function startOptimizedVideoRecording() {
                if (done || recordingStarted) return;
                recordingStarted = true;
                clearTimeout(startTimer);

                drawFrame();
                try {
                    recorder.start(1000);
                } catch (e) {
                    fail(e);
                    return;
                }
                drawTimer = setInterval(drawFrame, 1000 / UPLOAD_VIDEO_OPTIMIZE_FPS);
                progressTimer = setInterval(notifyProgress, 500);
                notifyProgress();

                var playResult;
                try { playResult = video.play(); } catch (e) { fail(e); return; }
                if (playResult && typeof playResult.catch === 'function') playResult.catch(fail);
            }

            function waitForOptimizedVideoFrame() {
                function onFirstFrame() {
                    video.removeEventListener('loadeddata', onFirstFrame);
                    startOptimizedVideoRecording();
                }

                if (video.readyState >= 2) {
                    startOptimizedVideoRecording();
                    return;
                }

                video.addEventListener('loadeddata', onFirstFrame, { once: true });
                startTimer = setTimeout(function () {
                    video.removeEventListener('loadeddata', onFirstFrame);
                    if (video.readyState >= 2) startOptimizedVideoRecording();
                    else fail(new Error('video optimization failed'));
                }, 5000);
            }

            video.addEventListener('loadedmetadata', function () {
                canvas.width = video.videoWidth || (info && info.width) || 1;
                canvas.height = video.videoHeight || (info && info.height) || 1;
                stream = canvas.captureStream(UPLOAD_VIDEO_OPTIMIZE_FPS);
                var sourceBitrate = info && info.duration ? (file.size * 8 / info.duration) : 4000000;
                var bitsPerSecond = Math.max(2500000, Math.min(12000000, Math.round(sourceBitrate * 0.65)));

                try {
                    recorder = new MediaRecorder(stream, { mimeType: mimeType, videoBitsPerSecond: bitsPerSecond });
                } catch (e) {
                    fail(e);
                    return;
                }

                recorder.ondataavailable = function (e) {
                    if (e.data && e.data.size) chunks.push(e.data);
                };
                recorder.onerror = function (e) {
                    fail(e.error || new Error('video optimization failed'));
                };
                recorder.onstop = function () {
                    if (done) return;
                    done = true;
                    cleanup();
                    var blob = new Blob(chunks, { type: mimeType.split(';')[0] || 'video/webm' });
                    resolve(fileFromVideoBlob(blob, file, blob.type));
                };

                waitForOptimizedVideoFrame();
            }, { once: true });

            video.addEventListener('ended', function () {
                drawFrame();
                showRuntimeDownloadNotice('uploadVideo', 'loading', { percent: 100 });
                if (recorder && recorder.state !== 'inactive') recorder.stop();
            }, { once: true });
            video.addEventListener('error', function () { fail(new Error('video optimization failed')); }, { once: true });
            video.src = url;
            video.load();
        });
    }

    function prepareUploadVideoFile(file) {
        return validateVideoFile(file).then(function (info) {
            return estimateVideoFrameRate(file, info).then(function (fps) {
                info.frameRate = fps || 0;
                if (!(fps > UPLOAD_VIDEO_OPTIMIZE_FPS)) return { file: file, info: info, optimized: false };

                return confirmHighFrameRateVideo(fps).then(function (ok) {
                    if (!ok) return { file: file, info: info, optimized: false, skippedOptimization: true };
                    setPendingSourceHealth('upload', { state: 'Applying', reasonKey: 'wallpaperStatusUploadOptimizing', message: '' });
                    return optimizeVideoFrameRate(file, info).then(function (optimizedFile) {
                        info.frameRate = UPLOAD_VIDEO_OPTIMIZE_FPS;
                        info.originalFrameRate = fps;
                        info.optimizedFrameRate = UPLOAD_VIDEO_OPTIMIZE_FPS;
                        showRuntimeDownloadNotice('uploadVideo', 'done');
                        return { file: optimizedFile, info: info, optimized: true };
                    }, function (err) {
                        warn('Local', 'video optimization failed: ' + (err && err.message ? err.message : err));
                        showRuntimeDownloadNotice('uploadVideo', 'error');
                        return { file: file, info: info, optimized: false };
                    });
                });
            });
        });
    }

    function confirmHighFrameRateVideo(fps) {
        return appConfirm(formatLocalizedText('uploadVideoHighFpsConfirm', {
            fps: Math.round(fps),
            target: UPLOAD_VIDEO_OPTIMIZE_FPS
        }), { variant: 'warning' });
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
        return prepareUploadVideoFile(file).then(function (preparedVideo) {
            file = preparedVideo.file;
            var info = preparedVideo.info;
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
            appAlert(e && e.message ? e.message : tr('uploadVideoUnsupported'), { variant: 'error' });
            return null;
        });
    }

    function deleteWallhavenImage(id) {
        if (!D.isWallhavenId || !D.isWallhavenId(id)) return;
        var order = D.activeWallhavenOrder ? D.activeWallhavenOrder() : [];
        if (!order.length) return;
        var newOrder = order.filter(function (oid) { return oid !== id; });
        if (D.saveWallhavenOrder) D.saveWallhavenOrder(newOrder);

        var thumbs = D.loadThumbs();
        delete thumbs[id];
        D.saveThumbs(thumbs);
        if (D.deleteBlurThumb) D.deleteBlurThumb(id);

        var meta = D.loadMeta();
        delete meta[id];
        D.saveMeta(meta);

        if (!newOrder.length) {
            D.saveActiveIndex(0);
            D.savePreview(null);
            D.setActiveSource('bing');
            currentMode = 'bing';
            updateModeChip();
            return D.idbDelete(D.imgKey(id)).then(function () {
                refreshGallery();
                if (window.reloadWallpaper) window.reloadWallpaper();
            }).catch(function () { });
        }

        var nextId = newOrder[D.getActiveIndex() % newOrder.length];
        saveNextPreviewFromOrder(newOrder, thumbs);
        scheduleBlurThumbForId(nextId, wallpaperBlur);

        return D.idbDelete(D.imgKey(id)).then(function () {
            refreshGallery();
        }).catch(function (e) { warn('Wallhaven', 'delete blob failed: ' + (e && e.message)); });
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
            if (resolveUploadFilePickerChange()) return;
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
        isReady: function () { return fullInitialized; },
        isOpen: function () { return isOpen; },
        isLangPanelOpen: function () { return isLangPanelOpen; },
        isModalOpen: function () { return isModalOpen; },
        isSearchPreviewOpen: function () { return isSearchPreviewOpen; },
        open: openSettings,
        close: closeSettings,
        toggle: toggleSettings,
        closeAll: closeAll,
        openModal: openModal,
        closeModal: closeModal,
        openSearchPreview: openSearchPreview,
        closeSearchPreview: closeSearchPreview,
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
