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
    var DEFAULT_SEARCH_WIDTH = 560;
    var DEFAULT_SEARCH_BG_OPACITY = 0.1;
    var DEFAULT_SEARCH_BLUR = 24;
    var DEFAULT_SEARCH_HISTORY_LIMIT = 5;
    var DEFAULT_WALLPAPER_FIT = 'cover';
    var DEFAULT_WALLPAPER_POSITION = 'center';
    var DEFAULT_WALLPAPER_BLUR = 0;
    var DEFAULT_WALLPAPER_BLUR_MAX = 15;
    var DEFAULT_UI_RADIUS = 'soft';
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
    var searchWidth = DEFAULT_SEARCH_WIDTH;
    var searchBackgroundOpacity = DEFAULT_SEARCH_BG_OPACITY;
    var searchBlur = DEFAULT_SEARCH_BLUR;
    var searchHistoryLimit = DEFAULT_SEARCH_HISTORY_LIMIT;
    var overlayOpacity = DEFAULT_OVERLAY_OPACITY;
    var searchRadius = DEFAULT_SEARCH_RADIUS;
    var panelOpacity = DEFAULT_PANEL_OPACITY;
    var wallpaperFit = DEFAULT_WALLPAPER_FIT;
    var wallpaperPosition = DEFAULT_WALLPAPER_POSITION;
    var wallpaperBlur = DEFAULT_WALLPAPER_BLUR;
    var uiRadius = DEFAULT_UI_RADIUS;
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
    var wallpaperDraft = null;
    var wallpaperDraftOriginal = '';
    var wallpaperDraftApiTestResult = null;
    var wallpaperDraftRssTestResult = null;
    var wallpaperDraftFolderMount = null;

    // ================================================================
    // 语言面板
    // ================================================================
    function updateLangUI() {
        var nextTitle = t('extName');
        if (document.title !== nextTitle) document.title = nextTitle;
        var searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.placeholder = t('searchPlaceholder');
        if (engineIcon) engineIcon.setAttribute('title', t('engineTitle'));
        langBtn.setAttribute('title', t('langTitle'));
        settingsBtn.setAttribute('title', t('settingsTitle'));
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
                    if (lang.code !== currentLang) {
                        D.saveLocale(lang.code);
                        currentLang = lang.code;
                        updateLangUI();
                        if (window.onLangChange) window.onLangChange(lang.code);
                    }
                    closeLangPanel();
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
        return D && D.loadOrder && D.loadOrder().length > 0;
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

    function getSourceLabel(source) {
        var map = {
            bing: t('sourceBing') || 'Bing 每日壁纸',
            upload: t('sourceUpload') || '本地上传',
            folder: t('sourceFolder') || '本地文件夹',
            rss: t('sourceRss') || 'RSS 订阅',
            api: t('sourceApi') || 'API 端点'
        };
        return map[source] || source;
    }

    function tr(key, fallback) {
        var value = t(key);
        return value && value !== key ? value : fallback;
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

    function modalCopy(key, fallback) {
        var lang = I18N[currentLang] || {};
        var en = I18N.en || {};
        var enFallback = {
            modalSubtitleAppearance: 'Theme, wallpaper display, and panel texture live here.',
            modalSubtitleSearch: 'Search visibility, layout, surface, and engine live here.',
            modalSubtitleWallpaper: 'The five sources keep their own signal colors, with the current source expanded.',
            modalSubtitleShortcuts: 'Command entry, hidden entry, recommendations, and panel skins live here.',
            modalSubtitlePermissions: 'Browser permissions used by shortcuts, RSS, and API sources live here.',
            modalSubtitleData: 'Export or restore the full PlainTab configuration.',
            modalSubtitleAbout: 'PlainTab stays quietly behind your new tab page.',
            modalDescSearchMode: 'Choose when the search box should appear.',
            modalDescSearchHistory: 'Keep recent searches available below the search bar.',
            modalDescSearchPosition: 'Choose a centered vertical anchor for the search box.',
            modalDescSearchIconPosition: 'Place the search icon or web engine logo on either side.',
            modalDescSearchWidth: 'Set how much horizontal room the search box takes.',
            modalDescSearchRadius: 'Match the search box shape to the current wallpaper mood.',
            modalDescSearchBackground: 'Tune the search box glass surface strength.',
            modalDescSearchBlur: 'Adjust how much the wallpaper diffuses behind the search box.',
            modalDescWallpaperFit: 'Choose how the wallpaper fills the viewport.',
            modalDescWallpaperPosition: 'Pick the visual anchor point when the wallpaper is cropped.',
            modalDescWallpaperBlur: 'Soften the wallpaper itself while keeping foreground controls sharp.',
            modalDescOverlay: 'Darken the wallpaper to improve foreground readability.',
            modalDescIconOpacity: 'Tune the presence of corner buttons and the search engine icon.',
            modalDescTheme: 'Extract surface, stroke, accent, and text colors from the wallpaper.',
            modalDescPanelOpacity: 'Adjust the distance between floating panels and the wallpaper.',
            modalDescUiRadius: 'Choose the overall corner language for panels and controls.',
            modalDescEngine: 'Web mode can switch engines; extension mode uses the browser default.',
            modalDescHotkey: 'Open the command palette and quick entries.',
            modalDescHiddenHotkey: 'Open hidden shortcut management directly.',
            modalDescRecommend: 'Keep the high-frequency recommendations area.',
            modalDescPalettePlacement: 'Open the command palette from the trigger point, or keep the old fixed position.',
            modalDescPaletteSkin: 'Choose the command panel style. Regular follows theme colors; the other styles use independent colors. Terminal is recommended and supports temporary resize.',
            modalDescWebAccess: 'Allow PlainTab to read HTTPS pages for shortcut titles, RSS/API tests, and configured data sources. PlainTab does not modify page content.',
            modalDescDataJson: 'Readable JSON is convenient for archives and troubleshooting.',
            modalDescDataEncrypted: 'Password-protected backup, compressed before encryption.',
            modalDescDataImport: 'Import JSON or encrypted PlainTab backup files.',
            modalDescDataImportPass: 'Required only for encrypted backup files.'
        };
        return lang[key] || en[key] || (currentLang.indexOf('zh') === 0 ? fallback : (enFallback[key] || fallback));
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
        if (value && select) value.textContent = getSelectLabel(select);
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
                if (wrapper.dataset.open === 'true') closeCustomSelects();
                else openCustomSelect(wrapper);
            });
            trigger.addEventListener('keydown', function (e) {
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
        return wallpaperDraft;
    }

    function clearWallpaperDraft() {
        wallpaperDraft = null;
        wallpaperDraftOriginal = '';
        wallpaperDraftApiTestResult = null;
        wallpaperDraftRssTestResult = null;
        wallpaperDraftFolderMount = null;
    }

    function currentWallpaperDraft() {
        if (!wallpaperDraft) return openWallpaperDraft();
        return wallpaperDraft;
    }

    function draftActiveSource() {
        var source = currentWallpaperDraft().activeSource;
        return D.compatMode ? D.compatMode(source) : source;
    }

    function wallpaperDraftChanged() {
        return !!wallpaperDraft && JSON.stringify(wallpaperDraft) !== wallpaperDraftOriginal;
    }

    function selectedDraftRssSource() {
        var config = currentWallpaperDraft().providers.rss.config;
        return config.sources.filter(function (source) { return source.id === config.activeSourceId; })[0] || config.sources[0] || null;
    }

    function selectedDraftApiSource() {
        var config = currentWallpaperDraft().providers.api.config;
        return D.activeApiSource ? D.activeApiSource(config) : null;
    }

    function validateWallpaperDraft() {
        var draft = currentWallpaperDraft();
        var source = D.compatMode ? D.compatMode(draft.activeSource) : draft.activeSource;
        if (!wallpaperDraftChanged()) return { valid: false, reason: tr('wallpaperApplyNoChanges', '没有未应用更改') };
        if (source === 'bing' || source === 'local') return { valid: true, reason: '' };
        if (source === 'folder') {
            if (!WF || !WF.isSupported || !WF.isSupported()) return { valid: false, reason: tr('folderUnsupported', '当前浏览器不支持文件夹壁纸') };
            if (!wallpaperDraftFolderMount) return { valid: false, reason: tr('folderNeedsValidSelection', '请选择有效文件夹') };
            return { valid: true, reason: '' };
        }
        if (source === 'rss') {
            var rss = selectedDraftRssSource();
            if (!rss) return { valid: false, reason: tr('rssNeedsSource', '请添加并选择 RSS 源') };
            var rssHash = D.rssFieldHash(rss);
            if (!D.isTestPassed(rss, rssHash)) return { valid: false, reason: tr('rssNeedsTest', '当前 RSS 源需要测试通过') };
            return { valid: true, reason: '' };
        }
        if (source === 'api') {
            var api = selectedDraftApiSource();
            if (!api) return { valid: false, reason: tr('apiNeedsSource', '请添加并选择 API 源') };
            var apiType = draft.providers.api.config.apiType;
            var apiHash = D.apiFieldHash(api, apiType);
            if (!D.isTestPassed(api, apiHash)) return { valid: false, reason: tr('apiNeedsTest', '当前 API 源需要测试通过') };
            return { valid: true, reason: '' };
        }
        return { valid: false, reason: tr('sourcePendingHint', '这个来源的配置正在接入中') };
    }

    function wallpaperApplyFooterHTML() {
        var validation = validateWallpaperDraft();
        return '<div class="wallpaper-apply-footer">' +
            '<div class="wallpaper-apply-status" id="wallpaperApplyStatus">' + escapeHtml(validation.reason || tr('wallpaperApplyReady', '可以应用配置')) + '</div>' +
            '<button id="wallpaperApplyBtn" class="primary-action" type="button"' + (validation.valid ? '' : ' disabled') + '>' + tr('wallpaperApply', '应用配置') + '</button>' +
            '</div>';
    }

    function refreshWallpaperApplyFooter() {
        var status = document.getElementById('wallpaperApplyStatus');
        var button = document.getElementById('wallpaperApplyBtn');
        if (!status || !button) return;
        var validation = validateWallpaperDraft();
        status.textContent = validation.reason || tr('wallpaperApplyReady', '可以应用配置');
        button.disabled = !validation.valid;
    }

    function normalizeDraftSource(source) {
        return D.normalizeSource ? D.normalizeSource(source) : (source === 'local' ? 'upload' : (source || 'bing'));
    }

    function sourceNeedsDiscardPrompt(previousSource, nextSource) {
        previousSource = normalizeDraftSource(previousSource);
        nextSource = normalizeDraftSource(nextSource);
        if (previousSource === nextSource) return false;
        if (previousSource === 'bing') return false;
        return D.hasSourceCache && D.hasSourceCache(previousSource);
    }

    function applyWallpaperDraft() {
        var validation = validateWallpaperDraft();
        if (!validation.valid) {
            refreshWallpaperApplyFooter();
            return;
        }

        var saved = D.loadWallpaper();
        var draft = currentWallpaperDraft();
        var previousSource = normalizeDraftSource(saved.activeSource);
        var nextSource = normalizeDraftSource(draft.activeSource);
        var applyBtn = document.getElementById('wallpaperApplyBtn');
        if (applyBtn) applyBtn.disabled = true;

        function reloadAfterApply() {
            currentMode = D.compatMode ? D.compatMode(nextSource) : nextSource;
            wallpaperDraftOriginal = JSON.stringify(draft);
            if (window.reloadWallpaper) return window.reloadWallpaper();
            return Promise.resolve();
        }

        function syncDraftRuntimeStateFromSaved() {
            var latest = D.loadWallpaper();
            draft.cache = clonePlain(latest.cache || draft.cache || {});
            Object.keys(draft.providers || {}).forEach(function (key) {
                if (latest.providers && latest.providers[key]) {
                    draft.providers[key].state = clonePlain(latest.providers[key].state || {});
                }
            });
        }

        function saveDraftAfterApiCache() {
            syncDraftRuntimeStateFromSaved();
            D.saveWallpaper(draft);
            return reloadAfterApply();
        }

        function saveDraftAfterFolderMount() {
            var mount = wallpaperDraftFolderMount;
            var folderId = mount.firstId;
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
                shuffleBag: [mount.firstName].concat(mount.shuffleBag || []),
                currentName: ''
            });
            draft.cache.order = ['bing', folderId];
            draft.cache.index = 1;
            draft.cache.meta = meta;
            D.saveWallpaper(draft);
            return reloadAfterApply();
        }

        function finishApply() {
            if (nextSource === 'folder' && wallpaperDraftFolderMount) {
                return D.saveFolderHandle(wallpaperDraftFolderMount.handle).then(function () {
                    return D.saveFolderFiles(wallpaperDraftFolderMount.files);
                }).then(saveDraftAfterFolderMount);
            }
            if (nextSource === 'api' && wallpaperDraftApiTestResult) {
                var apiConfig = draft.providers.api.config;
                var apiSource = selectedDraftApiSource();
                if (apiSource) {
                    apiSource.test = {
                        status: 'passed',
                        fieldHash: D.apiFieldHash(apiSource, apiConfig.apiType),
                        testedAt: Date.now(),
                        imageUrl: wallpaperDraftApiTestResult.imageUrl || '',
                        error: ''
                    };
                    return F.cacheApiResult(apiSource, apiConfig.apiType, wallpaperDraftApiTestResult).then(saveDraftAfterApiCache);
                }
            }
            syncDraftRuntimeStateFromSaved();
            D.saveWallpaper(draft);
            return reloadAfterApply();
        }

        var applyPromise;
        if (sourceNeedsDiscardPrompt(previousSource, nextSource)) {
            if (!confirm(tr('wallpaperDiscardCacheConfirm', '切换来源会丢弃当前来源已缓存的壁纸数据。继续吗？'))) {
                if (applyBtn) applyBtn.disabled = false;
                refreshWallpaperApplyFooter();
                return;
            }
            applyPromise = D.clearWallpaperSourceCache(previousSource).then(finishApply);
        } else {
            applyPromise = finishApply();
        }

        applyPromise.then(function () {
            openWallpaperDraft();
            invalidateWallpaperTab();
            refreshGallery();
        }).catch(function (err) {
            var status = document.getElementById('wallpaperApplyStatus');
            if (status) status.textContent = err && err.message ? err.message : String(err || 'Apply failed');
            if (applyBtn) applyBtn.disabled = false;
        });
    }

    function rssStatusText(config, state) {
        var count = D.activeRssOrder ? D.activeRssOrder(config.activeSourceId).length : 0;
        if (state.lastError) return tr('rssStatusError', 'RSS 状态：') + state.lastError;
        if (state.lastSuccessAt) return tr('rssStatusCached', '已缓存') + ' ' + count + '/12 · ' + new Date(state.lastSuccessAt).toLocaleString();
        return count ? (tr('rssStatusCached', '已缓存') + ' ' + count + '/12') : tr('rssStatusEmpty', '尚未缓存 RSS 图片');
    }

    function buildRssConfigHTML() {
        var config = currentWallpaperDraft().providers.rss.config;
        var state = D.loadWallpaper().providers.rss.state || {};
        function selected(value, current) { return String(value) === String(current) ? ' selected' : ''; }
        var rows = config.sources.map(function (source) {
            var checked = source.id === config.activeSourceId ? ' checked' : '';
            var selectedClass = checked ? ' selected' : '';
            var passed = D.isTestPassed(source, D.rssFieldHash(source));
            return '<div class="rss-source-row' + selectedClass + '" data-rss-source="' + escapeHtml(source.id) + '">' +
                '<span class="source-status-dot ' + (passed ? 'passed' : 'failed') + '"></span>' +
                '<label class="rss-source-main"><input type="radio" name="rssSource" value="' + escapeHtml(source.id) + '"' + checked + '><span><strong>' + escapeHtml(source.name) + '</strong><small>' + escapeHtml(source.url) + '</small></span></label>' +
                '<button class="rss-test-btn" type="button" data-action="test-rss">' + tr('rssTest', '测试') + '</button>' +
                '<button class="rss-delete-btn" type="button" data-action="delete-rss" aria-label="' + tr('deleteImage', '删除') + '">×</button>' +
                '</div>';
        }).join('');
        return '<div class="rss-config">' +
            '<div class="rss-source-list">' + rows + '</div>' +
            '<div class="rss-notice" id="rssNotice" hidden></div>' +
            '<div class="rss-add-row"><input id="rssNameInput" type="text" placeholder="' + tr('rssNamePlaceholder', '源名称') + '"><input id="rssUrlInput" type="url" placeholder="https://example.com/feed.xml"><button id="rssAddBtn" type="button">' + tr('rssAdd', '添加') + '</button></div>' +
            '<div class="rss-options">' +
            settingItem(tr('rssRefreshInterval', '自动拉取'), '', '<select id="rssRefreshInterval"><option value="0"' + selected(0, config.refreshIntervalMs) + '>' + tr('rssRefreshOff', '关闭') + '</option><option value="86400000"' + selected(86400000, config.refreshIntervalMs) + '>1 天</option><option value="259200000"' + selected(259200000, config.refreshIntervalMs) + '>3 天</option><option value="604800000"' + selected(604800000, config.refreshIntervalMs) + '>7 天</option></select>', 'setting-compact') +
            settingItem(tr('rssSummaryPosition', '摘要位置'), '', '<select id="rssSummaryPosition"><option value="bottom"' + selected('bottom', config.summaryPosition) + '>' + tr('bottom', '下方') + '</option><option value="top"' + selected('top', config.summaryPosition) + '>' + tr('top', '上方') + '</option></select>', 'setting-compact') +
            settingItem(tr('rssSummaryMode', '摘要展示'), '', '<select id="rssSummaryMode"><option value="expanded"' + selected('expanded', config.summaryMode) + '>' + tr('rssExpanded', '展开条带') + '</option><option value="icon"' + selected('icon', config.summaryMode) + '>' + tr('rssIconOnly', 'i 按钮') + '</option></select>', 'setting-compact') +
            settingItem(tr('rssShowSummary', '显示摘要'), '', '<label class="switch-control"><input type="checkbox" id="rssShowSummary"><span></span></label>', 'setting-compact') +
            settingItem(tr('rssShowLink', '显示正文链接'), '', '<label class="switch-control"><input type="checkbox" id="rssShowLink"><span></span></label>', 'setting-compact') +
            '</div>' +
            '<div class="rss-status" id="rssStatus">' + escapeHtml(rssStatusText(config, state)) + '</div>' +
            '</div>';
    }

    function apiSourceRowHTML(source, apiType, activeId) {
        var hash = D.apiFieldHash(source, apiType);
        var passed = D.isTestPassed(source, hash);
        var checked = source.id === activeId ? ' checked' : '';
        return '<div class="api-source-row' + (checked ? ' selected' : '') + '" data-api-type="' + apiType + '" data-api-source="' + escapeHtml(source.id) + '">' +
            '<span class="source-status-dot ' + (passed ? 'passed' : 'failed') + '"></span>' +
            '<label class="api-source-main"><input type="radio" name="apiSource" value="' + escapeHtml(source.id) + '"' + checked + '><span><strong>' + escapeHtml(source.name) + '</strong><small>' + escapeHtml(source.url) + '</small></span></label>' +
            '<button type="button" data-action="test-api">' + tr('apiTest', '测试') + '</button>' +
            '<button type="button" data-action="delete-api" aria-label="' + tr('deleteImage', '删除') + '">×</button>' +
            '</div>';
    }

    function buildApiConfigHTML() {
        var config = currentWallpaperDraft().providers.api.config;
        var apiType = config.apiType === 'json' ? 'json' : 'image';
        var sources = apiType === 'json' ? config.jsonSources : config.imageSources;
        var activeId = apiType === 'json' ? config.activeJsonSourceId : config.activeImageSourceId;
        var rows = sources.map(function (source) { return apiSourceRowHTML(source, apiType, activeId); }).join('');
        function selected(value, current) { return String(value) === String(current) ? ' selected' : ''; }
        return '<div class="api-config" data-api-type="' + apiType + '">' +
            '<div class="api-type-tabs"><button type="button" data-api-type-tab="image" class="' + (apiType === 'image' ? 'active' : '') + '"><span></span>' + tr('apiTypeImage', '图片直链/重定向') + '</button><button type="button" data-api-type-tab="json" class="' + (apiType === 'json' ? 'active' : '') + '"><span></span>' + tr('apiTypeJson', 'JSON') + '</button></div>' +
            '<div class="api-source-list">' + rows + '</div>' +
            '<div class="api-notice" id="apiNotice" hidden></div>' +
            '<div class="api-add-row"><input id="apiNameInput" type="text" placeholder="' + tr('rssNamePlaceholder', '源名称') + '"><input id="apiUrlInput" type="url" placeholder="https://example.com/wallpaper">' + (apiType === 'json' ? '<input id="apiJsonPathInput" type="text" placeholder="data.image.url">' : '') + '<button id="apiAddBtn" type="button">' + tr('rssAdd', '添加') + '</button></div>' +
            '<div class="api-options">' +
            settingItem(tr('rssRefreshInterval', '自动拉取'), '', '<select id="apiRefreshInterval"><option value="0"' + selected(0, config.refreshIntervalMs) + '>' + tr('rssRefreshOff', '关闭') + '</option><option value="-1"' + selected(-1, config.refreshIntervalMs) + '>' + tr('apiRefreshEveryTab', '每次打开') + '</option><option value="86400000"' + selected(86400000, config.refreshIntervalMs) + '>1 天</option><option value="259200000"' + selected(259200000, config.refreshIntervalMs) + '>3 天</option><option value="604800000"' + selected(604800000, config.refreshIntervalMs) + '>7 天</option></select>', 'setting-compact') +
            '</div>' +
            '</div>';
    }

    function buildSearchHTML() {
        var searchModeControl = '<select id="modalSearchMode">' +
            '<option value="hover"' + (searchMode === 'hover' ? ' selected' : '') + '>' + (t('searchHover') || '悬停时显示') + '</option>' +
            '<option value="always"' + (searchMode === 'always' ? ' selected' : '') + '>' + (t('searchAlways') || '始终显示') + '</option>' +
            '<option value="never"' + (searchMode === 'never' ? ' selected' : '') + '>' + (t('searchNever') || '始终隐藏') + '</option>' +
            '</select>';
        var searchHistoryControl = '<select id="modalSearchHistoryLimit">' +
            '<option value="0"' + (searchHistoryLimit === 0 ? ' selected' : '') + '>' + tr('searchHistoryOff', '关闭') + '</option>' +
            '<option value="5"' + (searchHistoryLimit === 5 ? ' selected' : '') + '>5</option>' +
            '<option value="10"' + (searchHistoryLimit === 10 ? ' selected' : '') + '>10</option>' +
            '</select>';
        var searchPosControl = '<select id="modalSearchPos">' +
            '<option value="edge-top"' + (searchPosition === 'edge-top' ? ' selected' : '') + '>' + tr('posEdgeTop', '贴近顶部') + '</option>' +
            '<option value="top"' + (searchPosition === 'top' ? ' selected' : '') + '>' + tr('posHigh', '居上') + '</option>' +
            '<option value="upper"' + (searchPosition === 'upper' ? ' selected' : '') + '>' + (t('posUpper') || '中上') + '</option>' +
            '<option value="center-upper"' + (searchPosition === 'center-upper' ? ' selected' : '') + '>' + tr('posCenterUpper', '居中偏上') + '</option>' +
            '<option value="center"' + (searchPosition === 'center' ? ' selected' : '') + '>' + (t('posCenter') || '居中') + '</option>' +
            '<option value="center-lower"' + (searchPosition === 'center-lower' ? ' selected' : '') + '>' + tr('posCenterLower', '居中偏下') + '</option>' +
            '<option value="lower"' + (searchPosition === 'lower' ? ' selected' : '') + '>' + (t('posLower') || '中下') + '</option>' +
            '<option value="bottom"' + (searchPosition === 'bottom' ? ' selected' : '') + '>' + tr('posLow', '居下') + '</option>' +
            '<option value="edge-bottom"' + (searchPosition === 'edge-bottom' ? ' selected' : '') + '>' + tr('posEdgeBottom', '贴近底部') + '</option>' +
            '</select>';
        var searchIconPositionControl = '<select id="modalSearchIconPosition">' +
            '<option value="left"' + (searchIconPosition === 'left' ? ' selected' : '') + '>' + tr('iconLeft', '左侧') + '</option>' +
            '<option value="right"' + (searchIconPosition === 'right' ? ' selected' : '') + '>' + tr('iconRight', '右侧') + '</option>' +
            '</select>';
        var radiusControl = '<select id="modalSearchRadius">' +
            '<option value="capsule"' + (searchRadius === 'capsule' ? ' selected' : '') + '>' + (t('radiusCapsule') || '胶囊') + '</option>' +
            '<option value="rounded"' + (searchRadius === 'rounded' ? ' selected' : '') + '>' + (t('radiusRounded') || '圆角') + '</option>' +
            '<option value="sharp"' + (searchRadius === 'sharp' ? ' selected' : '') + '>' + (t('radiusSharp') || '直角') + '</option>' +
            '</select>';
        var searchWidthControl = '<input type="range" id="modalSearchWidthRange" min="360" max="760" step="10" value="' + searchWidth + '">' +
            '<input type="number" id="modalSearchWidthNum" class="input-w-55" min="360" max="760" step="10" value="' + searchWidth + '">';
        var searchBgControl = '<input type="range" id="modalSearchBgRange" min="0.04" max="0.32" step="0.01" value="' + searchBackgroundOpacity + '">' +
            '<input type="number" id="modalSearchBgNum" class="input-w-55" min="0.04" max="0.32" step="0.01" value="' + searchBackgroundOpacity + '">';
        var searchBlurControl = '<input type="range" id="modalSearchBlurRange" min="0" max="40" step="1" value="' + searchBlur + '">' +
            '<input type="number" id="modalSearchBlurNum" class="input-w-55" min="0" max="40" step="1" value="' + searchBlur + '">';
        var engineControl = '<select id="modalEngineSel">' +
            '<option value="google"' + (currentEngine === 'google' ? ' selected' : '') + '>Google</option>' +
            '<option value="bing"' + (currentEngine === 'bing' ? ' selected' : '') + '>Bing</option>' +
            '<option value="baidu"' + (currentEngine === 'baidu' ? ' selected' : '') + '>Baidu</option>' +
            '<option value="duckduckgo"' + (currentEngine === 'duckduckgo' ? ' selected' : '') + '>DuckDuckGo</option>' +
            '</select>';
        var body =
            settingGroup(tr('settingsGroupSearchVisibility', '显示'),
            settingItem(t('searchLabel') || '搜索栏显示', modalCopy('modalDescSearchMode', '设定搜索框出现的时机。'), searchModeControl) +
            settingItem(tr('searchHistory', '搜索历史'), modalCopy('modalDescSearchHistory', '在搜索栏下方保留最近搜索。'), searchHistoryControl)) +
            settingGroup(tr('settingsGroupSearchLayout', '布局'),
            settingItem(t('searchPosition') || '搜索栏位置', modalCopy('modalDescSearchPosition', '选择搜索框在画面中轴上的高度。'), searchPosControl) +
            settingItem(tr('searchWidth', '搜索栏宽度'), modalCopy('modalDescSearchWidth', '调整搜索框占据的横向空间。'), searchWidthControl) +
            settingItem(tr('searchIconPosition', '搜索图标位置'), modalCopy('modalDescSearchIconPosition', '选择搜索图标或网页版引擎 Logo 在左侧还是右侧。'), searchIconPositionControl)) +
            settingGroup(tr('settingsGroupSearchSurface', '样式'),
            settingItem(t('searchRadius') || '搜索栏圆角', modalCopy('modalDescSearchRadius', '让搜索框形态匹配当前壁纸氛围。'), radiusControl) +
            settingItem(tr('searchBackground', '搜索框背景'), modalCopy('modalDescSearchBackground', '调节搜索框玻璃表面的强弱。'), searchBgControl) +
            settingItem(tr('searchBlur', '搜索框模糊'), modalCopy('modalDescSearchBlur', '调节搜索框背后的壁纸扩散程度。'), searchBlurControl)) +
            settingGroup(tr('settingsGroupSearchEngine', '搜索引擎'),
            settingItem(t('engineLabel') || '搜索引擎', modalCopy('modalDescEngine', '网页版可切换，扩展版沿用浏览器默认搜索。'), engineControl, IS_EXTENSION ? 'engine-row-hidden' : ''));

        return buildPageShell(tr('tabSearch', '搜索设置'), modalCopy('modalSubtitleSearch', '搜索栏的显示、位置、形态和搜索引擎集中在这里。'), body);
    }

    function buildAppearanceHTML() {
        var wallpaperFitControl = '<select id="modalWallpaperFit">' +
            '<option value="cover"' + (wallpaperFit === 'cover' ? ' selected' : '') + '>' + tr('fitCover', '铺满裁切') + '</option>' +
            '<option value="contain"' + (wallpaperFit === 'contain' ? ' selected' : '') + '>' + tr('fitContain', '完整显示') + '</option>' +
            '<option value="100% 100%"' + (wallpaperFit === '100% 100%' ? ' selected' : '') + '>' + tr('fitStretch', '拉伸填充') + '</option>' +
            '</select>';
        var wallpaperPositionControl = '<select id="modalWallpaperPosition">' +
            '<option value="center"' + (wallpaperPosition === 'center' ? ' selected' : '') + '>' + (t('posCenter') || '居中') + '</option>' +
            '<option value="top"' + (wallpaperPosition === 'top' ? ' selected' : '') + '>' + (t('posTop') || '顶部') + '</option>' +
            '<option value="bottom"' + (wallpaperPosition === 'bottom' ? ' selected' : '') + '>' + (t('posBottom') || '底部') + '</option>' +
            '<option value="left"' + (wallpaperPosition === 'left' ? ' selected' : '') + '>' + tr('alignLeft', '靠左') + '</option>' +
            '<option value="right"' + (wallpaperPosition === 'right' ? ' selected' : '') + '>' + tr('alignRight', '靠右') + '</option>' +
            '</select>';
        var wallpaperBlurControl = '<input type="range" id="modalWallpaperBlurRange" min="0" max="15" step="1" value="' + wallpaperBlur + '">' +
            '<input type="number" id="modalWallpaperBlurNum" class="input-w-55" min="0" max="15" step="1" value="' + wallpaperBlur + '">';
        var overlayControl = '<input type="range" id="modalOverlayRange" min="0" max="0.6" step="0.01" value="' + overlayOpacity + '">' +
            '<input type="number" id="modalOverlayNum" class="input-w-55" min="0" max="0.6" step="0.01" value="' + overlayOpacity + '">';
        var opacityControl = '<input type="range" id="modalOpacityRange" min="0" max="1" step="0.01" value="' + currentOpacity + '">' +
            '<input type="number" id="modalOpacityNum" class="input-w-55" min="0" max="1" step="0.01" value="' + currentOpacity + '">';
        var themeControl = '<label class="switch-control"><input type="checkbox" id="modalThemeEnabled"' + (themeEnabled ? ' checked' : '') + '><span></span></label>';
        var panelOpacityControl = '<input type="range" id="modalPanelOpacityRange" min="0.3" max="1" step="0.01" value="' + panelOpacity + '">' +
            '<input type="number" id="modalPanelOpacityNum" class="input-w-55" min="0.3" max="1" step="0.01" value="' + panelOpacity + '">';
        var uiRadiusControl = '<select id="modalUiRadius">' +
            '<option value="compact"' + (uiRadius === 'compact' ? ' selected' : '') + '>' + tr('radiusCompact', '克制') + '</option>' +
            '<option value="soft"' + (uiRadius === 'soft' ? ' selected' : '') + '>' + tr('radiusSoft', '柔和') + '</option>' +
            '<option value="round"' + (uiRadius === 'round' ? ' selected' : '') + '>' + tr('radiusRound', '圆润') + '</option>' +
            '</select>';

        var body =
            settingGroup(tr('settingsGroupTheme', '主题'),
            settingItem(t('themeEnableLabel') || '壁纸主题色', modalCopy('modalDescTheme', '从当前壁纸提取表面、描边、强调和文字色。'), themeControl, 'setting-compact')) +
            settingGroup(tr('settingsGroupWallpaper', '壁纸'),
            settingItem(tr('wallpaperFit', '壁纸适配'), modalCopy('modalDescWallpaperFit', '选择壁纸如何填充整个视口。'), wallpaperFitControl) +
            settingItem(tr('wallpaperPosition', '壁纸焦点'), modalCopy('modalDescWallpaperPosition', '当壁纸被裁切时选择画面锚点。'), wallpaperPositionControl) +
            settingItem(tr('wallpaperBlur', '背景模糊'), modalCopy('modalDescWallpaperBlur', '柔化壁纸本身，前景控件保持清晰。'), wallpaperBlurControl) +
            settingItem(t('overlayLabel') || '壁纸遮罩', modalCopy('modalDescOverlay', '加深背景，提升前景元素识别度。'), overlayControl)) +
            settingGroup(tr('settingsGroupSurface', '界面'),
            settingItem(t('opacityLabel') || '图标透明度', modalCopy('modalDescIconOpacity', '控制角落按钮和搜索引擎图标的存在感。'), opacityControl) +
            settingItem(t('panelOpacityLabel') || '面板透明度', modalCopy('modalDescPanelOpacity', '调整浮层与壁纸之间的距离感。'), panelOpacityControl) +
            settingItem(tr('uiRadiusLabel', '界面圆角'), modalCopy('modalDescUiRadius', '切换面板和控件的整体圆角语言。'), uiRadiusControl)) +
            '<div class="settings-actions"><button class="reset-defaults-btn" id="modalResetBtn">' + (t('resetAdv') || '恢复默认设置') + '</button></div>';

        return buildPageShell(tr('tabAppearance', '界面设置'), modalCopy('modalSubtitleAppearance', '主题、壁纸显示和浮层质感集中在这里。'), body);
    }

    function bindSearchEvents() {
        var selMode = document.getElementById('modalSearchMode');
        var selHistoryLimit = document.getElementById('modalSearchHistoryLimit');
        var selPos = document.getElementById('modalSearchPos');
        var selIconPosition = document.getElementById('modalSearchIconPosition');
        var selRadius = document.getElementById('modalSearchRadius');
        var searchWidthRange = document.getElementById('modalSearchWidthRange');
        var searchWidthNum = document.getElementById('modalSearchWidthNum');
        var searchBgRange = document.getElementById('modalSearchBgRange');
        var searchBgNum = document.getElementById('modalSearchBgNum');
        var searchBlurRange = document.getElementById('modalSearchBlurRange');
        var searchBlurNum = document.getElementById('modalSearchBlurNum');
        var engineSel = document.getElementById('modalEngineSel');

        if (selMode) selMode.addEventListener('change', function () { applySearchMode(this.value); });
        if (selHistoryLimit) selHistoryLimit.addEventListener('change', function () { applySearchHistoryLimit(this.value); });
        if (selPos) selPos.addEventListener('change', function () { applySearchPosition(this.value); });
        if (selIconPosition) selIconPosition.addEventListener('change', function () { applySearchIconPosition(this.value); });
        if (selRadius) selRadius.addEventListener('change', function () { applySearchRadius(this.value); });
        if (searchWidthRange) searchWidthRange.addEventListener('input', function () { applySearchWidth(this.value); if (searchWidthNum) searchWidthNum.value = this.value; });
        if (searchWidthNum) searchWidthNum.addEventListener('change', function () { applySearchWidth(this.value); if (searchWidthRange) searchWidthRange.value = searchWidth; this.value = searchWidth; });
        if (searchBgRange) searchBgRange.addEventListener('input', function () { applySearchBackgroundOpacity(this.value); if (searchBgNum) searchBgNum.value = searchBackgroundOpacity; });
        if (searchBgNum) searchBgNum.addEventListener('change', function () { applySearchBackgroundOpacity(this.value); if (searchBgRange) searchBgRange.value = searchBackgroundOpacity; this.value = searchBackgroundOpacity; });
        if (searchBlurRange) searchBlurRange.addEventListener('input', function () { applySearchBlur(this.value); if (searchBlurNum) searchBlurNum.value = searchBlur; });
        if (searchBlurNum) searchBlurNum.addEventListener('change', function () { applySearchBlur(this.value); if (searchBlurRange) searchBlurRange.value = searchBlur; this.value = searchBlur; });
        if (engineSel) engineSel.addEventListener('change', function () { applyEngine(this.value); });
        syncCustomSelects(modalContent);
    }

    function bindAppearanceEvents() {
        var wallpaperFitSel = document.getElementById('modalWallpaperFit');
        var wallpaperPositionSel = document.getElementById('modalWallpaperPosition');
        var wallpaperBlurRange = document.getElementById('modalWallpaperBlurRange');
        var wallpaperBlurNum = document.getElementById('modalWallpaperBlurNum');
        var overlayRange = document.getElementById('modalOverlayRange');
        var overlayNum = document.getElementById('modalOverlayNum');
        var opacityRange = document.getElementById('modalOpacityRange');
        var opacityNum = document.getElementById('modalOpacityNum');
        var themeCheck = document.getElementById('modalThemeEnabled');
        var panelOpacityRange = document.getElementById('modalPanelOpacityRange');
        var panelOpacityNum = document.getElementById('modalPanelOpacityNum');
        var uiRadiusSel = document.getElementById('modalUiRadius');
        var resetBtn = document.getElementById('modalResetBtn');

        if (wallpaperFitSel) wallpaperFitSel.addEventListener('change', function () { applyWallpaperFit(this.value); });
        if (wallpaperPositionSel) wallpaperPositionSel.addEventListener('change', function () { applyWallpaperPosition(this.value); });
        if (wallpaperBlurRange) wallpaperBlurRange.addEventListener('input', function () { applyWallpaperBlur(this.value, { preview: true }); this.value = wallpaperBlur; if (wallpaperBlurNum) wallpaperBlurNum.value = wallpaperBlur; });
        if (wallpaperBlurRange) wallpaperBlurRange.addEventListener('change', function () { applyWallpaperBlur(this.value); if (wallpaperBlurNum) wallpaperBlurNum.value = wallpaperBlur; this.value = wallpaperBlur; });
        if (wallpaperBlurNum) wallpaperBlurNum.addEventListener('change', function () { applyWallpaperBlur(this.value); if (wallpaperBlurRange) wallpaperBlurRange.value = wallpaperBlur; this.value = wallpaperBlur; });
        if (overlayRange) overlayRange.addEventListener('input', function () { applyOverlayOpacity(this.value); if (overlayNum) overlayNum.value = this.value; });
        if (overlayNum) overlayNum.addEventListener('change', function () { applyOverlayOpacity(this.value); if (overlayRange) overlayRange.value = this.value; });
        if (opacityRange) opacityRange.addEventListener('input', function () { applyOpacity(this.value); if (opacityNum) opacityNum.value = this.value; });
        if (opacityNum) opacityNum.addEventListener('change', function () { applyOpacity(this.value); if (opacityRange) opacityRange.value = this.value; });
        if (themeCheck) themeCheck.addEventListener('change', function () { applyThemeMode(this.checked); });
        if (panelOpacityRange) panelOpacityRange.addEventListener('input', function () { applyPanelOpacity(this.value); if (panelOpacityNum) panelOpacityNum.value = this.value; });
        if (panelOpacityNum) panelOpacityNum.addEventListener('change', function () { applyPanelOpacity(this.value); if (panelOpacityRange) panelOpacityRange.value = this.value; });
        if (uiRadiusSel) uiRadiusSel.addEventListener('change', function () { applyUiRadius(this.value); });
        if (resetBtn) resetBtn.addEventListener('click', resetAppearanceDefaults);
        syncCustomSelects(modalContent);
    }

    function buildWallpaperHTML() {
        if (!wallpaperDraft) openWallpaperDraft();
        var sources = [
            { id: 'bing',   name: getSourceLabel('bing'),   desc: t('sourceBingDesc')   || '每日自动更新，根据语言选择地区' },
            { id: 'upload', name: getSourceLabel('upload'), desc: t('sourceUploadDesc') || '上传图片，最多 12 张轮换' },
            { id: 'folder', name: getSourceLabel('folder'), desc: t('sourceFolderDesc') || '从本地文件夹直接读取图片' },
            { id: 'rss',    name: getSourceLabel('rss'),    desc: t('sourceRssDesc')    || '从 RSS Feed 自动下载图片' },
            { id: 'api',    name: getSourceLabel('api'),    desc: t('sourceApiDesc')    || '从 API 接口获取图片 URL' }
        ];

        var draftSource = draftActiveSource();
        var activeSource = draftSource === 'local' ? 'upload' : draftSource;
        var configs = {
            bing:   '<p>' + (t('bingConfigHint') || '根据当前界面语言自动选择 Bing 市场区域。') + '</p>',
            upload: '<p>' + (t('uploadConfigHint') || '在一级面板中使用「+」按钮上传图片。支持多选，单张上限 12 张。') + '</p>',
            folder: buildFolderConfigHTML(),
            rss:    buildRssConfigHTML(),
            api:    buildApiConfigHTML()
        };

        var drawers = sources.map(function (s) {
            var activeClass = s.id === activeSource ? ' active' : '';
            return '<div class="source-drawer' + activeClass + '" data-source="' + s.id + '">' +
                '<div class="source-drawer-header">' +
                '<span class="source-drawer-dot ' + s.id + '"></span>' +
                '<div class="source-drawer-info"><div class="source-drawer-name">' + s.name + '</div><div class="source-drawer-desc">' + s.desc + '</div></div>' +
                '<svg class="source-drawer-chevron" viewBox="0 0 16 16" fill="currentColor"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
                '</div>' +
                '<div class="source-drawer-body"><div class="source-drawer-body-inner">' + configs[s.id] + '</div></div>' +
                '</div>';
        }).join('');

        return '<div class="wallpaper-tab-shell">' +
            '<div class="wallpaper-tab-header"><h2>' + tr('tabWallpaper', '壁纸来源') + '</h2><p>' + modalCopy('modalSubtitleWallpaper', '五个来源保持各自的识别色，当前来源展开配置。') + '</p></div>' +
            '<div class="wallpaper-tab-body"><div class="source-accordion">' + drawers + '</div><div class="wallpaper-reset-row"><button class="danger-action" id="wallpaperResetBtn" type="button">' + tr('wallpaperResetDefaults', '恢复默认壁纸设置') + '</button></div></div>' +
            wallpaperApplyFooterHTML() +
            '</div>';
    }

    function bindWallpaperEvents() {
        modalContent.querySelectorAll('.source-drawer-header').forEach(function (header) {
            header.addEventListener('click', function (e) {
                if (e.target.closest('button, input, label')) return;
                var drawer = header.parentElement;
                var clickedSource = drawer.dataset.source;
                var draft = currentWallpaperDraft();
                draft.activeSource = clickedSource === 'upload' ? 'upload' : clickedSource;
                modalContent.querySelectorAll('.source-drawer').forEach(function (d) {
                    d.classList.toggle('active', d.dataset.source === clickedSource);
                });
                refreshWallpaperApplyFooter();
            });
        });
        bindFolderConfigEvents();
        bindRssConfigEvents();
        bindApiConfigEvents();
        var applyBtn = modalContent.querySelector('#wallpaperApplyBtn');
        if (applyBtn) applyBtn.addEventListener('click', applyWallpaperDraft);
        var reset = modalContent.querySelector('#wallpaperResetBtn');
        if (reset) reset.addEventListener('click', function () {
            if (!confirm(tr('wallpaperResetConfirm', '这会清理上传、RSS、API 和文件夹壁纸缓存，并切回 Bing。继续吗？'))) return;
            D.resetWallpaperDefaults().then(function () {
                currentMode = 'bing';
                invalidateWallpaperTab();
                refreshGallery();
                if (window.reloadWallpaper) window.reloadWallpaper();
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
        el.textContent = message || '';
        el.dataset.type = type || 'info';
        el.hidden = !message;
    }

    function setRssTestButtonState(button, testing) {
        if (!button) return;
        if (!button.dataset.idleLabel) button.dataset.idleLabel = button.textContent;
        button.disabled = !!testing;
        button.classList.toggle('testing', !!testing);
        button.textContent = testing ? tr('rssTesting', '正在测试...') : button.dataset.idleLabel;
    }

    function folderStatusText() {
        var draft = currentWallpaperDraft();
        var config = draft.providers.folder.config || {};
        var state = draft.providers.folder.state || {};
        if (!WF || !WF.isSupported || !WF.isSupported()) return tr('folderUnsupported', '当前浏览器不支持文件夹壁纸');
        if (wallpaperDraftFolderMount) {
            return tr('folderReady', '已准备文件夹：') + (wallpaperDraftFolderMount.pathLabel || tr('sourceFolder', '本地文件夹')) + ' · ' + wallpaperDraftFolderMount.files.length + ' ' + tr('folderImagesUnit', '张图片');
        }
        if (state.status === 'needs-permission') return tr('folderNeedsPermission', '需要重新授权文件夹');
        if (state.status === 'ready' && config.pathLabel) return tr('folderSaved', '已保存文件夹：') + config.pathLabel + (state.indexedCount ? (' · ' + state.indexedCount + ' ' + tr('folderImagesUnit', '张图片')) : '');
        if (state.status === 'empty') return tr('folderEmpty', '未找到支持的图片');
        if (state.status === 'error' && state.lastError) return state.lastError;
        return tr('noFolderSelected', '未选择文件夹');
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
        button.textContent = busy ? tr('folderPreparing', '正在读取...') : button.dataset.idleLabel;
    }

    function buildFolderConfigHTML() {
        var supported = !!(WF && WF.isSupported && WF.isSupported());
        var draft = currentWallpaperDraft();
        var config = draft.providers.folder.config || {};
        var label = wallpaperDraftFolderMount ? wallpaperDraftFolderMount.pathLabel : (config.pathLabel || tr('noFolderSelected', '未选择文件夹'));
        return '<div class="folder-config">' +
            '<div class="folder-current">' +
            '<div><span>' + tr('sourceFolder', '本地文件夹') + '</span><strong>' + escapeHtml(label) + '</strong></div>' +
            '<button id="folderChooseBtn" class="primary-action" type="button"' + (supported ? '' : ' disabled') + '>' + tr('chooseFolder', '选择文件夹') + '</button>' +
            '</div>' +
            '<div class="folder-strategy-readonly"><span>' + tr('folderRotation', '轮换方式') + '</span><strong>' + tr('strategyRandom', '随机') + '</strong></div>' +
            '<div class="folder-notice" id="folderNotice" hidden></div>' +
            '<div class="folder-status" id="folderStatus">' + escapeHtml(folderStatusText()) + '</div>' +
            '</div>';
    }

    function folderErrorMessage(err) {
        var map = {
            FOLDER_UNSUPPORTED: tr('folderUnsupported', '当前浏览器不支持文件夹壁纸'),
            FOLDER_PERMISSION_DENIED: tr('folderNeedsPermission', '需要重新授权文件夹'),
            FOLDER_NO_IMAGES: tr('folderEmpty', '未找到支持的图片'),
            FOLDER_NO_USABLE_IMAGES: tr('folderNoUsableImages', '找到图片，但无法读取可用壁纸'),
            FOLDER_THUMBNAIL_FAILED: tr('folderPreviewFailed', '无法生成文件夹壁纸预览')
        };
        return map[err && err.code] || (err && err.message ? err.message : String(err || 'Folder failed'));
    }

    function bindFolderConfigEvents() {
        var root = modalContent.querySelector('.folder-config');
        if (!root) return;
        var choose = root.querySelector('#folderChooseBtn');
        if (!choose) return;
        choose.addEventListener('click', function () {
            if (!WF || !WF.pickDirectory || !WF.prepareMount) {
                showFolderNotice(tr('folderUnsupported', '当前浏览器不支持文件夹壁纸'), 'error');
                refreshWallpaperApplyFooter();
                return;
            }
            setFolderButtonState(choose, true);
            showFolderNotice(tr('folderPreparing', '正在读取...'), 'info');
            WF.pickDirectory().then(function (handle) {
                return WF.prepareMount(handle, { blur: wallpaperBlur });
            }).then(function (mount) {
                wallpaperDraftFolderMount = mount;
                var draft = currentWallpaperDraft();
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
                    shuffleBag: [mount.firstName].concat(mount.shuffleBag || []),
                    currentName: ''
                });
                showFolderNotice(tr('folderReady', '已准备文件夹：') + (mount.pathLabel || tr('sourceFolder', '本地文件夹')), 'success');
                invalidateWallpaperTab();
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
            INVALID_RSS_URL: tr('rssInvalidUrl', '请输入 https:// 链接'),
            NO_RSS_IMAGES: tr('rssNoImages', '测试失败：该 RSS 没有可用图片条目'),
            NO_USABLE_RSS_IMAGES: tr('rssNoUsableImages', '找到图片条目，但图片无法下载或生成缩略图'),
            RSS_PERMISSION_DENIED: tr('rssPermissionDenied', '没有获得该 RSS 地址的访问权限'),
            RSS_PARSE_FAILED: tr('rssParseFailed', 'RSS 内容无法解析'),
            RSS_FETCH_FAILED: tr('rssFetchFailed', 'RSS 请求失败，请检查链接或稍后重试'),
            RSS_TIMEOUT: tr('rssTimeout', 'RSS 请求超时，请稍后重试')
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
        if (_tabPages.wallpaper) {
            _tabPages.wallpaper.remove();
            delete _tabPages.wallpaper;
            _tabEventBound.wallpaper = false;
        }
        renderTabContent();
    }

    function bindRssConfigEvents() {
        var root = modalContent.querySelector('.rss-config');
        if (!root) return;
        var config = currentWallpaperDraft().providers.rss.config;
        var interval = root.querySelector('#rssRefreshInterval');
        var position = root.querySelector('#rssSummaryPosition');
        var mode = root.querySelector('#rssSummaryMode');
        var showSummary = root.querySelector('#rssShowSummary');
        var showLink = root.querySelector('#rssShowLink');
        if (interval) interval.value = String(config.refreshIntervalMs);
        if (position) position.value = config.summaryPosition;
        if (mode) mode.value = config.summaryMode;
        if (showSummary) showSummary.checked = config.showSummary !== false;
        if (showLink) showLink.checked = config.showLink !== false;

        root.querySelectorAll('input[name="rssSource"]').forEach(function (radio) {
            radio.addEventListener('change', function () {
                var next = currentWallpaperDraft().providers.rss.config;
                next.activeSourceId = radio.value;
                root.querySelectorAll('.rss-source-row').forEach(function (row) {
                    row.classList.toggle('selected', row.dataset.rssSource === radio.value);
                });
                setRssStatus(rssStatusText(next, D.loadWallpaper().providers.rss.state || {}));
                refreshWallpaperApplyFooter();
            });
        });

        [interval, position, mode].forEach(function (el) {
            if (!el) return;
            el.addEventListener('change', function () {
                var next = currentWallpaperDraft().providers.rss.config;
                if (el === interval) next.refreshIntervalMs = parseInt(el.value, 10) || 0;
                if (el === position) next.summaryPosition = el.value;
                if (el === mode) next.summaryMode = el.value;
                refreshWallpaperApplyFooter();
            });
        });

        [showSummary, showLink].forEach(function (el) {
            if (!el) return;
            el.addEventListener('change', function () {
                var next = currentWallpaperDraft().providers.rss.config;
                if (el === showSummary) next.showSummary = el.checked;
                if (el === showLink) next.showLink = el.checked;
                refreshWallpaperApplyFooter();
            });
        });
        syncCustomSelects(root);

        root.addEventListener('click', onRssConfigClick);
    }

    function onRssConfigClick(e) {
        var target = e.target;
        var config = currentWallpaperDraft().providers.rss.config;
        if (target.id === 'rssAddBtn') {
            var name = document.getElementById('rssNameInput').value.trim();
            var url = document.getElementById('rssUrlInput').value.trim();
            if (config.sources.length >= 5) return setRssStatus(tr('rssLimit', '最多 5 个 RSS 源'));
            if (!F.isHttpsUrl(url)) return setRssStatus(tr('rssInvalidUrl', '请输入 https:// 链接'));
            var id = 'custom-' + F.generateId();
            config.sources.push({
                id: id,
                name: name || url,
                url: url,
                builtIn: false,
                test: { status: 'untested', fieldHash: '', testedAt: 0, imageUrl: '', error: '' }
            });
            config.activeSourceId = id;
            invalidateWallpaperTab();
            return;
        }
        var row = target.closest('.rss-source-row');
        if (!row) return;
        var source = config.sources.filter(function (item) { return item.id === row.dataset.rssSource; })[0];
        if (!source) return;
        if (target.dataset.action === 'delete-rss') {
            config.sources = config.sources.filter(function (item) { return item.id !== source.id; });
            if (!config.sources.length) config.sources = D.defaultRssConfig().sources;
            if (!config.sources.some(function (item) { return item.id === config.activeSourceId; })) config.activeSourceId = config.sources[0].id;
            invalidateWallpaperTab();
            return;
        }
        if (target.dataset.action === 'test-rss') {
            var testButton = target;
            setRssTestButtonState(testButton, true);
            setRssStatus(tr('rssTesting', '正在测试...'));
            showRssNotice(tr('rssTesting', '正在测试...'), 'info');
            F.testRssSource(source).then(function (result) {
                source.test = {
                    status: 'passed',
                    fieldHash: D.rssFieldHash(source),
                    testedAt: Date.now(),
                    imageUrl: result.first && result.first.imageUrl || '',
                    error: ''
                };
                wallpaperDraftRssTestResult = result;
                var message = tr('rssTestOk', '测试通过，可用图片条目：') + result.count;
                setRssStatus(message);
                showRssNotice(message, 'success');
                refreshWallpaperApplyFooter();
                var passedDot = testButton.closest('.rss-source-row') && testButton.closest('.rss-source-row').querySelector('.source-status-dot');
                if (passedDot) passedDot.classList.add('passed');
            }).catch(function (err) {
                var message = rssErrorMessage(err);
                source.test = {
                    status: 'failed',
                    fieldHash: D.rssFieldHash(source),
                    testedAt: Date.now(),
                    imageUrl: '',
                    error: message
                };
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
        root.addEventListener('click', onApiConfigClick);
        root.addEventListener('change', onApiConfigChange);
    }

    function onApiConfigChange(e) {
        var config = currentWallpaperDraft().providers.api.config;
        if (e.target.id === 'apiRefreshInterval') {
            config.refreshIntervalMs = parseInt(e.target.value, 10);
            refreshWallpaperApplyFooter();
            return;
        }
        if (e.target.name === 'apiSource') {
            if (config.apiType === 'json') config.activeJsonSourceId = e.target.value;
            else config.activeImageSourceId = e.target.value;
            wallpaperDraftApiTestResult = null;
            invalidateWallpaperTab();
        }
    }

    function onApiConfigClick(e) {
        var target = e.target;
        var config = currentWallpaperDraft().providers.api.config;
        var apiType = config.apiType === 'json' ? 'json' : 'image';
        var typeTab = target.closest('[data-api-type-tab]');
        if (typeTab) {
            config.apiType = typeTab.dataset.apiTypeTab === 'json' ? 'json' : 'image';
            wallpaperDraftApiTestResult = null;
            invalidateWallpaperTab();
            return;
        }
        if (target.id === 'apiAddBtn') {
            var name = document.getElementById('apiNameInput').value.trim();
            var url = document.getElementById('apiUrlInput').value.trim();
            var pathEl = document.getElementById('apiJsonPathInput');
            var list = apiType === 'json' ? config.jsonSources : config.imageSources;
            if (list.length >= 5) return showApiNotice(tr('apiLimit', '最多 5 个 API 源'), 'error');
            if (!F.isHttpsUrl(url)) return showApiNotice(tr('apiInvalidUrl', '请输入 https:// 链接'), 'error');
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
            wallpaperDraftApiTestResult = null;
            invalidateWallpaperTab();
            return;
        }
        var row = target.closest('.api-source-row');
        if (!row) return;
        var listForRow = row.dataset.apiType === 'json' ? config.jsonSources : config.imageSources;
        var sourceForRow = listForRow.filter(function (item) { return item.id === row.dataset.apiSource; })[0];
        if (!sourceForRow) return;
        if (target.dataset.action === 'delete-api') {
            listForRow.splice(listForRow.indexOf(sourceForRow), 1);
            if (row.dataset.apiType === 'json') config.activeJsonSourceId = listForRow[0] ? listForRow[0].id : '';
            else config.activeImageSourceId = listForRow[0] ? listForRow[0].id : '';
            wallpaperDraftApiTestResult = null;
            invalidateWallpaperTab();
            return;
        }
        if (target.dataset.action === 'test-api') {
            runApiSourceTest(sourceForRow, row.dataset.apiType, target);
        }
    }

    function showApiNotice(message, type) {
        var el = document.getElementById('apiNotice');
        if (!el) return;
        el.textContent = message || '';
        el.dataset.type = type || 'info';
        el.hidden = !message;
    }

    function apiErrorMessage(err) {
        var map = {
            INVALID_API_URL: tr('apiInvalidUrl', '请输入 https:// 链接'),
            API_AUTH_REQUIRED: tr('apiAuthRequired', '该接口可能需要鉴权，当前版本仅支持把 token 放在 URL 参数里的 GET 接口'),
            API_CORS_OR_NETWORK: tr('apiCorsFailed', '请求失败，可能是 CORS、网络或权限限制'),
            API_TIMEOUT: tr('apiTimeout', 'API 请求超时'),
            API_JSON_PARSE_FAILED: tr('apiJsonParseFailed', 'JSON 内容无法解析'),
            API_JSON_PATH_FAILED: tr('apiJsonPathFailed', '没有从 JSON 中找到图片 URL'),
            API_NOT_IMAGE: tr('apiNotImage', '响应不是图片'),
            API_IMAGE_DOWNLOAD_FAILED: tr('apiImageDownloadFailed', '图片下载失败')
        };
        return map[err && err.code] || (err && err.message ? err.message : String(err || 'API failed'));
    }

    function runApiSourceTest(source, apiType, button) {
        button.disabled = true;
        button.classList.add('testing');
        showApiNotice(tr('rssTesting', '正在测试...'), 'info');
        F.testApiSource(source, apiType).then(function (result) {
            source.test = {
                status: 'passed',
                fieldHash: D.apiFieldHash(source, apiType),
                testedAt: Date.now(),
                imageUrl: result.imageUrl || '',
                error: ''
            };
            wallpaperDraftApiTestResult = result;
            showApiNotice(tr('apiTestOk', '测试通过'), 'success');
            refreshWallpaperApplyFooter();
            var passedDot = button.closest('.api-source-row') && button.closest('.api-source-row').querySelector('.source-status-dot');
            if (passedDot) passedDot.classList.add('passed');
        }).catch(function (err) {
            var message = apiErrorMessage(err);
            source.test = {
                status: 'failed',
                fieldHash: D.apiFieldHash(source, apiType),
                testedAt: Date.now(),
                imageUrl: '',
                error: message
            };
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
            '<option value="follow"' + (placement === 'follow' ? ' selected' : '') + '>' + tr('cpPlacementFollow', '\u8ddf\u968f\u89e6\u53d1\u4f4d\u7f6e') + '</option>' +
            '<option value="fixed"' + (placement === 'fixed' ? ' selected' : '') + '>' + tr('cpPlacementFixed', '\u56fa\u5b9a\u4f4d\u7f6e') + '</option>' +
            '</select>';
        var skin = loadPaletteSkin();
        var skinControl = '<select id="cpSkin">' +
            '<option value="default"' + (skin === 'default' ? ' selected' : '') + '>' + tr('cpSkinDefault', '\u5e38\u89c4') + '</option>' +
            '<option value="terminal"' + (skin === 'terminal' ? ' selected' : '') + '>' + tr('cpSkinTerminal', '\u6781\u5ba2') + '</option>' +
            '<option value="shell"' + (skin === 'shell' ? ' selected' : '') + '>' + tr('cpSkinShell', '\u63a7\u5236\u53f0') + '</option>' +
            '<option value="command-terminal"' + (skin === 'command-terminal' ? ' selected' : '') + '>' + tr('cpSkinCommandTerminal', '\u7ec8\u7aef \u00b7 \u63a8\u8350') + '</option>' +
            '</select>';

        var body =
            settingGroup(tr('cpGroupAppearance', '外观'),
            settingItem(tr('cpSkinLabel', '\u547d\u4ee4\u9762\u677f\u6837\u5f0f'), modalCopy('modalDescPaletteSkin', '\u5e38\u89c4\u8ddf\u968f\u4e3b\u9898\u8272\uff1b\u5176\u4ed6\u6837\u5f0f\u4f7f\u7528\u72ec\u7acb\u914d\u8272\u3002\u63a8\u8350\u4f7f\u7528\u7ec8\u7aef\u6837\u5f0f\uff0c\u652f\u6301\u53f3\u4e0b\u89d2\u4e34\u65f6\u8c03\u6574\u5927\u5c0f\u3002'), skinControl, 'setting-compact')) +
            settingGroup(tr('cpGroupOpen', '打开方式'),
            settingItem(tr('cpPlacementLabel', '\u547d\u4ee4\u9762\u677f\u4f4d\u7f6e'), modalCopy('modalDescPalettePlacement', '\u4ece\u89e6\u53d1\u70b9\u8ddf\u624b\u6253\u5f00\uff0c\u6216\u4fdd\u6301\u539f\u6765\u7684\u56fa\u5b9a\u4f4d\u7f6e\u3002'), placementControl, 'setting-compact') +
            settingItem(t('cpHotkeyLabel') || '命令面板快捷键', modalCopy('modalDescHotkey', '打开命令面板与快捷入口。'), '<input type="text" class="hotkey-input" id="hkNormal" value="' + hkNormal + '" readonly>') +
            settingItem(t('cpHiddenHotkeyLabel') || '隐藏面板快捷键', modalCopy('modalDescHiddenHotkey', '直接打开隐藏快捷入口管理。'), '<input type="text" class="hotkey-input" id="hkHidden" value="' + hkHidden + '" readonly>')) +
            settingGroup(tr('cpGroupContent', '内容'),
            settingItem(t('cpRecommendLabel') || '显示推荐', modalCopy('modalDescRecommend', '保留高频入口的推荐区域。'), '<label class="switch-control"><input type="checkbox" id="cpRecommend"' + checked + '><span></span></label>', 'setting-compact'));

        return buildPageShell(tr('tabShortcuts', '命令面板'), modalCopy('modalSubtitleShortcuts', '命令入口、隐藏入口、推荐和面板皮肤集中在这里。'), body);
    }

    function bindShortcutsEvents() {
        var hkNormalEl = document.getElementById('hkNormal');
        var hkHiddenEl = document.getElementById('hkHidden');
        var cpRec = document.getElementById('cpRecommend');
        var cpPlacement = document.getElementById('cpPlacement');
        var cpSkin = document.getElementById('cpSkin');

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
    }

    function buildDataHTML() {
        var jsonControl = '<button class="primary-action" id="dataExportJsonBtn" type="button">' + tr('dataExportJson', '导出 JSON') + '</button>';
        var encryptedControl = '<div class="data-inline-control"><input id="dataExportPass" type="password" autocomplete="new-password" placeholder="' + tr('dataPassphrase', '口令') + '"><button class="primary-action" id="dataExportEncryptedBtn" type="button">' + tr('dataExportEncrypted', '导出加密文件') + '</button></div>';
        var importControl = '<button class="primary-action" id="dataImportChooseBtn" type="button">' + tr('dataChooseFile', '选择文件') + '</button><span class="data-file-name" id="dataImportFileName"></span>';
        var importPassControl = '<input id="dataImportPass" type="password" autocomplete="current-password" placeholder="' + tr('dataPassphrase', '口令') + '">';
        var body = settingGroup(tr('dataExport', '导出'),
            settingItem('JSON', modalCopy('modalDescDataJson', 'JSON 方便留存和排查。'), jsonControl, 'setting-compact') +
            settingItem(tr('dataEncrypted', '加密'), modalCopy('modalDescDataEncrypted', '加密文件会先压缩再加密，体积通常更小。'), encryptedControl)) +
            settingGroup(tr('dataImport', '导入'),
            settingItem(tr('dataBackupFile', '备份文件'), modalCopy('modalDescDataImport', '支持 JSON 或加密备份文件。'), importControl, 'setting-compact') +
            settingItem(tr('dataImportPass', '导入口令'), modalCopy('modalDescDataImportPass', '仅导入加密文件时需要。'), importPassControl, 'setting-compact')) +
            '<div class="data-status" id="dataStatus" hidden></div>';
        return buildPageShell(tr('tabData', '数据'), modalCopy('modalSubtitleData', '导出或恢复 PlainTab 的完整用户配置。'), body);
    }

    function buildPermissionsHTML() {
        var webAccessControl = '<section class="permission-card" id="webAccessCard" data-state="checking">' +
            '<div class="permission-card-header">' +
            '<div class="permission-card-copy">' +
            '<span class="permission-eyebrow">' + tr('permissionGroupWebAccess', '网页读取') + '</span>' +
            '<h3>' + tr('webAccessTitle', 'HTTPS 网站读取权限') + '</h3>' +
            '<p>' + modalCopy('modalDescWebAccess', '用于添加快捷方式时获取网页标题，也用于 RSS/API 测试与读取你配置的数据源。PlainTab 不会修改网页内容。') + '</p>' +
            '</div>' +
            '<span class="permission-state" id="webAccessState" data-type="info">' + tr('webAccessChecking', '正在检查权限...') + '</span>' +
            '</div>' +
            '<div class="permission-uses" aria-label="' + tr('permissionUsesLabel', '用途') + '">' +
            '<span>' + tr('permissionUseShortcut', '快捷方式标题') + '</span>' +
            '<span>' + tr('permissionUseRss', 'RSS 测试') + '</span>' +
            '<span>' + tr('permissionUseApi', 'API 读取') + '</span>' +
            '</div>' +
            '<div class="permission-note">' + tr('webAccessHint', '默认会按站点请求授权；一次性授权后，PlainTab 可在 HTTPS 站点上更顺畅地自动读取标题与测试数据源。') + '</div>' +
            '<div class="permission-control">' +
            '<button class="primary-action" id="webAccessGrantBtn" type="button">' + tr('webAccessGrant', '一次性授权 HTTPS 网站') + '</button>' +
            '<button class="permission-revoke-action" id="webAccessRevokeBtn" type="button">' + tr('webAccessRevoke', '改回按需授权') + '</button>' +
            '</div>' +
            '</section>';
        var body = webAccessControl +
            '<div class="permission-status" id="permissionsStatus" hidden></div>';
        return buildPageShell(tr('tabPermissions', '权限'), modalCopy('modalSubtitlePermissions', '快捷方式、RSS 和 API 共用的浏览器权限放在这里。'), body);
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
        if (granted) setWebAccessStatus(tr('webAccessEnabled', '已授权所有 HTTPS 网站读取'), 'success');
        else setWebAccessStatus(tr('webAccessDisabled', '按需授权；未授权时使用降级名称'), 'info');
    }

    function refreshAllHttpsAccessState() {
        if (!hasPermissionApi()) {
            updateWebAccessControls(false, true);
            setWebAccessStatus(tr('webAccessUnsupported', '仅扩展模式支持此授权'), 'info');
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
        setWebAccessStatus(tr('webAccessRequesting', '等待浏览器授权确认...'), 'info');
        chrome.permissions.request({ origins: [HTTPS_ALL_ORIGIN] }, function (granted) {
            updateWebAccessControls(!!granted, false);
            setPermissionsStatus(granted ? tr('webAccessGrantOk', '已启用 HTTPS 网站读取权限') : tr('webAccessGrantCanceled', '授权已取消'), granted ? 'success' : 'info');
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
            setPermissionsStatus(removed ? tr('webAccessRevokeOk', '已改回按需获取') : tr('webAccessRevokeFailed', '没有可撤销的 HTTPS 网站读取授权'), removed ? 'success' : 'info');
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
            setDataStatus(tr('dataExportOk', '导出完成'), 'success');
        } catch (e) {
            setDataStatus(tr('dataExportFailed', '导出失败：') + (e && e.message ? e.message : String(e)), 'error');
        }
    }

    function exportEncryptedDataBackup() {
        var pass = (document.getElementById('dataExportPass') || {}).value || '';
        if (!pass) {
            setDataStatus(tr('dataPassRequired', '请输入加密口令'), 'error');
            return;
        }
        if (!window.crypto || !crypto.subtle || !window.TextEncoder) {
            setDataStatus(tr('dataCryptoUnsupported', '当前浏览器不支持加密备份'), 'error');
            return;
        }
        setDataStatus(tr('dataExporting', '正在导出...'), 'info');
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
                    setDataStatus(tr('dataExportOk', '导出完成'), 'success');
                });
            });
        }).catch(function (e) {
            setDataStatus(tr('dataExportFailed', '导出失败：') + (e && e.message ? e.message : String(e)), 'error');
        });
    }

    function decryptDataBackup(wrapper, passphrase) {
        if (!passphrase) return Promise.reject(new Error(tr('dataPassRequired', '请输入加密口令')));
        if (!window.crypto || !crypto.subtle || !window.TextDecoder) return Promise.reject(new Error(tr('dataCryptoUnsupported', '当前浏览器不支持加密备份')));
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
        if (!payload || typeof payload !== 'object') throw new Error(tr('dataInvalidBackup', '备份文件无效'));
        if (payload.app && payload.app !== 'PlainTab') throw new Error(tr('dataInvalidBackup', '备份文件无效'));
        if (!payload.data || typeof payload.data !== 'object') throw new Error(tr('dataInvalidBackup', '备份文件无效'));
        return payload;
    }

    function refreshAfterDataImport() {
        currentMode = D.compatMode ? D.compatMode(D.getActiveSource()) : D.getActiveSource();
        currentLang = D.loadLocale() || currentLang;
        if (!I18N[currentLang]) currentLang = 'en';
        loadSettings();
        updateLangUI();
        refreshGallery();
        Object.keys(_tabPages).forEach(function (tabName) {
            if (tabName === activeTab) return;
            _tabPages[tabName].remove();
            delete _tabPages[tabName];
            _tabEventBound[tabName] = false;
        });
        if (window.Palette && window.Palette.refresh) window.Palette.refresh();
        if (window.reloadWallpaper) window.reloadWallpaper();
    }

    function importDataBackup(file) {
        setDataStatus(tr('dataImporting', '正在导入...'), 'info');
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
            setDataStatus(tr('dataImportOk', '导入完成'), 'success');
        }).catch(function (e) {
            setDataStatus(tr('dataImportFailed', '导入失败：') + (e && e.message ? e.message : String(e)), 'error');
        });
    }

    function buildAboutHTML() {
        return buildPageShell(tr('tabAbout', '关于'), modalCopy('modalSubtitleAbout', '一个静静待在新标签页背后的 PlainTab。'),
            '<div class="about-section">' +
            '<div class="about-name">PlainTab</div>' +
            '<div class="about-version">v3.2.0</div>' +
            '<p class="about-desc">' + (t('aboutDesc') || '一款零闪白、极简纯粹的浏览器新标签页扩展。支持五种壁纸来源，双层渲染引擎确保首帧即壁纸。') + '</p>' +
            '<a class="about-link" href="https://github.com/kaininx/PlainTab" target="_blank">github.com/kaininx/PlainTab</a>' +
            '<div class="about-footer">' + (t('aboutFooter') || 'Made by kaininx · MIT License') + '</div>' +
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

    function applySearchWidth(value) {
        searchWidth = clampInteger(value, 360, 760, DEFAULT_SEARCH_WIDTH);
        document.documentElement.style.setProperty('--search-width', searchWidth + 'px');
        saveAllSettings();
    }

    function applySearchBackgroundOpacity(value) {
        searchBackgroundOpacity = clampNumber(value, 0.04, 0.32, DEFAULT_SEARCH_BG_OPACITY);
        searchBackgroundOpacity = parseFloat(searchBackgroundOpacity.toFixed(2));
        document.documentElement.style.setProperty('--search-bg-opacity', searchBackgroundOpacity);
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
        ui.search.radius = searchRadius;
        ui.search.width = searchWidth;
        ui.search.backgroundOpacity = searchBackgroundOpacity;
        ui.search.blur = searchBlur;
        ui.search.historyLimit = searchHistoryLimit;
        ui.wallpaper.overlayOpacity = overlayOpacity;
        ui.wallpaper.themeEnabled = themeEnabled;
        ui.wallpaper.fit = wallpaperFit;
        ui.wallpaper.position = wallpaperPosition;
        ui.wallpaper.blur = wallpaperBlur;
        ui.icon.opacity = currentOpacity;
        ui.panel.opacity = panelOpacity;
        ui.appearance.radius = uiRadius;
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
        searchRadius = search.radius || DEFAULT_SEARCH_RADIUS;
        searchWidth = search.width !== undefined ? search.width : DEFAULT_SEARCH_WIDTH;
        searchBackgroundOpacity = search.backgroundOpacity !== undefined ? search.backgroundOpacity : DEFAULT_SEARCH_BG_OPACITY;
        searchBlur = search.blur !== undefined ? search.blur : DEFAULT_SEARCH_BLUR;
        searchHistoryLimit = D.normalizeSearchHistoryLimit ? D.normalizeSearchHistoryLimit(search.historyLimit) : DEFAULT_SEARCH_HISTORY_LIMIT;
        currentOpacity = icon.opacity !== undefined ? parseFloat(icon.opacity) : DEFAULT_OPACITY;
        overlayOpacity = wallpaper.overlayOpacity !== undefined ? parseFloat(wallpaper.overlayOpacity) : DEFAULT_OVERLAY_OPACITY;
        panelOpacity = panel.opacity !== undefined ? parseFloat(panel.opacity) : DEFAULT_PANEL_OPACITY;
        wallpaperFit = wallpaper.fit || DEFAULT_WALLPAPER_FIT;
        wallpaperPosition = wallpaper.position || DEFAULT_WALLPAPER_POSITION;
        wallpaperBlur = wallpaper.blur !== undefined ? wallpaper.blur : DEFAULT_WALLPAPER_BLUR;
        uiRadius = appearance.radius || DEFAULT_UI_RADIUS;
        themeEnabled = wallpaper.themeEnabled === true;
        currentEngine = search.engine || DEFAULT_ENGINE;

        isHydratingSettings = true;
        try {
            applySearchMode(searchMode);
            applySearchPosition(searchPosition);
            applySearchIconPosition(searchIconPosition);
            applySearchWidth(searchWidth);
            applySearchBackgroundOpacity(searchBackgroundOpacity);
            applySearchBlur(searchBlur);
            applySearchHistoryLimit(searchHistoryLimit);
            applySearchRadius(searchRadius);
            applyOpacity(currentOpacity);
            applyWallpaperFit(wallpaperFit);
            applyWallpaperPosition(wallpaperPosition);
            applyWallpaperBlur(wallpaperBlur);
            applyOverlayOpacity(overlayOpacity);
            applyPanelOpacity(panelOpacity);
            applyUiRadius(uiRadius);
            applyThemeMode(themeEnabled);
            if (!IS_EXTENSION) applyEngine(currentEngine);
        } finally {
            isHydratingSettings = false;
        }
    }

    function resetAppearanceDefaults() {
        applySearchMode(DEFAULT_SEARCH_MODE);
        applySearchPosition(DEFAULT_SEARCH_POSITION);
        applySearchIconPosition(DEFAULT_SEARCH_ICON_POSITION);
        applySearchWidth(DEFAULT_SEARCH_WIDTH);
        applySearchBackgroundOpacity(DEFAULT_SEARCH_BG_OPACITY);
        applySearchBlur(DEFAULT_SEARCH_BLUR);
        applySearchHistoryLimit(DEFAULT_SEARCH_HISTORY_LIMIT);
        applySearchRadius(DEFAULT_SEARCH_RADIUS);
        applyOpacity(DEFAULT_OPACITY);
        applyWallpaperFit(DEFAULT_WALLPAPER_FIT);
        applyWallpaperPosition(DEFAULT_WALLPAPER_POSITION);
        applyWallpaperBlur(DEFAULT_WALLPAPER_BLUR);
        applyOverlayOpacity(DEFAULT_OVERLAY_OPACITY);
        applyPanelOpacity(DEFAULT_PANEL_OPACITY);
        applyUiRadius(DEFAULT_UI_RADIUS);
        applyThemeMode(false);
        if (!IS_EXTENSION) applyEngine(DEFAULT_ENGINE);
        saveAllSettings();
        // Update modal form values
        var el;
        el = document.getElementById('modalSearchMode'); if (el) el.value = DEFAULT_SEARCH_MODE;
        el = document.getElementById('modalSearchPos'); if (el) el.value = DEFAULT_SEARCH_POSITION;
        el = document.getElementById('modalSearchIconPosition'); if (el) el.value = DEFAULT_SEARCH_ICON_POSITION;
        el = document.getElementById('modalSearchRadius'); if (el) el.value = DEFAULT_SEARCH_RADIUS;
        el = document.getElementById('modalSearchWidthRange'); if (el) el.value = DEFAULT_SEARCH_WIDTH;
        el = document.getElementById('modalSearchWidthNum'); if (el) el.value = DEFAULT_SEARCH_WIDTH;
        el = document.getElementById('modalSearchBgRange'); if (el) el.value = DEFAULT_SEARCH_BG_OPACITY;
        el = document.getElementById('modalSearchBgNum'); if (el) el.value = DEFAULT_SEARCH_BG_OPACITY;
        el = document.getElementById('modalSearchBlurRange'); if (el) el.value = DEFAULT_SEARCH_BLUR;
        el = document.getElementById('modalSearchBlurNum'); if (el) el.value = DEFAULT_SEARCH_BLUR;
        el = document.getElementById('modalSearchHistoryLimit'); if (el) el.value = DEFAULT_SEARCH_HISTORY_LIMIT;
        el = document.getElementById('modalWallpaperFit'); if (el) el.value = DEFAULT_WALLPAPER_FIT;
        el = document.getElementById('modalWallpaperPosition'); if (el) el.value = DEFAULT_WALLPAPER_POSITION;
        el = document.getElementById('modalWallpaperBlurRange'); if (el) el.value = DEFAULT_WALLPAPER_BLUR;
        el = document.getElementById('modalWallpaperBlurNum'); if (el) el.value = DEFAULT_WALLPAPER_BLUR;
        el = document.getElementById('modalOpacityRange'); if (el) el.value = DEFAULT_OPACITY;
        el = document.getElementById('modalOpacityNum'); if (el) el.value = DEFAULT_OPACITY;
        el = document.getElementById('modalOverlayRange'); if (el) el.value = DEFAULT_OVERLAY_OPACITY;
        el = document.getElementById('modalOverlayNum'); if (el) el.value = DEFAULT_OVERLAY_OPACITY;
        el = document.getElementById('modalPanelOpacityRange'); if (el) el.value = DEFAULT_PANEL_OPACITY;
        el = document.getElementById('modalPanelOpacityNum'); if (el) el.value = DEFAULT_PANEL_OPACITY;
        el = document.getElementById('modalUiRadius'); if (el) el.value = DEFAULT_UI_RADIUS;
        el = document.getElementById('modalEngineSel'); if (el) el.value = DEFAULT_ENGINE;
        el = document.getElementById('modalThemeEnabled'); if (el) el.checked = false;
        syncCustomSelects(modalContent);
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
        inputEl.value = t('pressCombo') || '按下组合键...';
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
            el.value = t('needCtrl') || '需要 Ctrl 键';
            setTimeout(function () { if (isRecording) el.value = t('pressCombo') || '按下组合键...'; }, 800);
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
                el.value = t('hotkeyConflict') || '冲突！';
                setTimeout(function () { if (isRecording) el.value = t('pressCombo') || '按下组合键...'; }, 1000);
                return;
            }

            el.value = combo;
            el.classList.remove('recording');

            if (isRecording === 'normal') savePaletteHotkey(combo);
            else savePaletteHiddenHotkey(combo);

            isRecording = null;
        } else {
            el.value = t('needLetter') || '需要字母键 A-Z';
            setTimeout(function () { if (isRecording) el.value = t('pressCombo') || '按下组合键...'; }, 800);
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
        var order = isRssWallpaperMode() ? activeRssOrder() : D.loadOrder();
        if (!order.length) return null;
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
        if (state.currentName) names.push(state.currentName);
        (state.shuffleBag || []).forEach(function (name) {
            if (names.length >= 6) return;
            if (names.indexOf(name) === -1) names.push(name);
        });
        if (!names.length) {
            (D.loadWallpaper().cache.order || []).filter(function (id) { return D.isFolderId && D.isFolderId(id); }).forEach(function (id) {
                var name = D.folderNameFromId ? D.folderNameFromId(id) : id;
                if (names.indexOf(name) === -1) names.push(name);
            });
        }
        return names.slice(0, 6);
    }

    function scheduleVisibleFolderThumbs(names) {
        if (!WF || !WF.readImageFile || !WF.preparePreviewFromFile || !names || !names.length) return;
        var thumbs = D.loadThumbs();
        var missing = names.filter(function (name) {
            return !thumbs[D.folderId(name)];
        }).slice(0, 4);
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
        if (!order.length) {
            renderGallery([], { source: 'upload', canAdd: true });
            return;
        }
        var thumbs = D.loadThumbs();
        var meta = D.loadMeta();

        var allCached = order.every(function (id) { return meta[id] && thumbs[id]; });
        if (allCached) {
            renderUploadGallery(order, order.map(function (id) { return meta[id]; }), thumbs);
            return;
        }

        var reads = order.map(function (id) { return D.idbGet(D.imgKey(id)); });
        Promise.all(reads).then(function (images) {
            if (!isOpen) return;
            var m = D.loadMeta();
            var changed = false;
            images.forEach(function (img, i) {
                if (img && !m[order[i]]) {
                    m[order[i]] = { name: img.name || '', size: img.size || 0 };
                    changed = true;
                }
            });
            if (changed) D.saveMeta(m);
            renderUploadGallery(order, images, thumbs);
        }).catch(function (err) {
            console.error('PlainTab: IDB read failed in refreshUploadGallery, falling back to localStorage', err);
            if (!isOpen) return;
            renderUploadGallery(order, order.map(function (id) { return meta[id] || { name: '', size: 0 }; }), thumbs);
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
        return order.slice(0, 12).map(function (id, i) {
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
                deletable: true,
                draggable: true
            };
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
            if (item.title) card.title = item.title;

            if (item.bg) {
                card.style.backgroundImage = item.bg;
            } else {
                card.classList.add('is-empty');
                var fallback = document.createElement('span');
                fallback.className = 'wallpaper-thumb-fallback';
                fallback.textContent = (item.title || item.id || '?').charAt(0).toUpperCase();
                card.appendChild(fallback);
            }

            if (item.deletable) {
                var delBtn = document.createElement('button');
                delBtn.className = 'wallpaper-thumb-del';
                delBtn.title = t('deleteImage') + (item.title ? ': ' + item.title : '');
                delBtn.setAttribute('data-id', item.id);
                delBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    deleteLocalImage(this.dataset.id);
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

    function renderUploadGallery(order, images, thumbs) {
        renderGallery(buildUploadItems(order, images, thumbs), {
            source: 'upload',
            canAdd: order.length < 12,
            draggable: order.length > 1
        });
    }

    // ================================================================
    // 数据操作：上传 / 删除 / 重置
    // ================================================================
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

            return D.idbPut(D.imgKey(id), { blob: file, mime: file.type || '', name: file.name || '' }).then(function () {
                var order = D.loadOrder();
                var thumbs = D.loadThumbs();
                order.push(id);
                thumbs[id] = thumb;
                D.saveOrder(order);
                D.saveThumbs(thumbs);

                var meta = D.loadMeta();
                meta[id] = { name: file.name || '', size: file.size || 0 };
                D.saveMeta(meta);

                return { id: id, shown: show };
            });
        }).catch(function (e) { warn('Local', 'save failed: ' + e.message); return null; });
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
            D.savePreview(null);
            D.setActiveSource('bing');
            currentMode = 'bing';
            updateModeChip();
            removeGallery();
            return D.idbDelete(D.imgKey(id)).then(function () {
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
            var files = all.filter(function (f) { return f.type && f.type.match(/^image\//); });
            fileInput.value = '';

            if (!files.length) return;

            var order = D.loadOrder();
            var slots = Math.max(0, 12 - order.length);
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
        getOpacity: function () { return currentOpacity; },
        getEngine: function () { return currentEngine; },
        getCurrentMode: function () { return currentMode; },
        setCurrentMode: function (m) { currentMode = m; },
        getCurrentLang: function () { return currentLang; },
        setCurrentLang: function (lang) {
            currentLang = lang;
            if (!I18N[currentLang]) currentLang = 'en';
            updateLangUI();
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
