/**
 * Palette —— 命令面板
 * 快捷链接管理：10 种命令、搜索过滤、列表/图标双视图。
 * 完全独立，不依赖壁纸系统。挂载到 window.Palette。
 */
(function () {
    'use strict';

    function t() { return window.t.apply(window, arguments); }
    function log() { window.log.apply(window, arguments); }
    function warn() { window.warn.apply(window, arguments); }
    function formatText(key, values) {
        return String(t(key)).replace(/\{([a-zA-Z0-9_]+)\}/g, function (_, name) {
            return values && Object.prototype.hasOwnProperty.call(values, name) ? values[name] : '';
        });
    }
    function scopeLabel(scope) {
        return scope === 'hidden' ? t('commandHiddenScope') : t('commandNormalScope');
    }

    // ================================================================
    // 常量
    // ================================================================

    var LS_KEY_SHORTCUT_ICONS = 'ptab_shortcut_icons';
    var BUILTIN_GITHUB = { id: 'builtin-github', name: 'GitHub', url: 'https://github.com', freq: 0, added: 0 };
    var BUILTIN_GITHUB_ICON = 'https://icons.duckduckgo.com/ip3/github.com.ico';
    var SHORTCUT_EXPORT_TYPE = 'plaintab-command-shortcuts';

    var CP_COMMANDS_NORMAL = ['add', 'edit', 'delete', 'hide', 'recent', 'import', 'export', 'reset', 'clear', 'restore', 'help'];
    var CP_COMMANDS_HIDDEN = ['add', 'edit', 'delete', 'unhide', 'recent', 'import', 'export', 'reset', 'clear', 'restore', 'help'];

    // ================================================================
    // DOM 元素
    // ================================================================

    var cmdOverlay = document.getElementById('cmdOverlay');
    var cmdPalette = document.getElementById('cmdPalette');
    var cpPinnedBar = document.getElementById('cpPinnedBar');
    var cpSearchInput = document.getElementById('cpSearchInput');
    var cpContent = document.getElementById('cpContent');

    // ================================================================
    // 状态变量
    // ================================================================

    var isPaletteOpen = false;
    var isHiddenMode = false;
    var cpSearchTerm = '';
    var cpKeyIndex = 0;
    var cpCurrentPage = 1;
    var cpItemsPerPage = 15;
    var cpViewMode = loadShortcutSettings().viewMode || 'list';
    var cpCurrentMode = 'list';
    var cpEditTarget = null;
    var paletteOpenFrame = 0;
    var cpCommandsCollapsed = loadCommandsCollapsed();
    var cpPlacement = loadPalettePlacement();
    var cpSkin = loadPaletteSkin();
    var cpLastAnchor = null;
    var commandTerminalCommittedInput = '';
    var commandTerminalResult = null;
    var commandTerminalAsyncToken = 0;
    var commandTerminalPendingAction = null;
    var commandTerminalReturnTimer = 0;
    var cpDragState = null;
    var cpShellResizeState = null;
    var cpShellSize = null;
    var cpResizeFrame = 0;

    // 内存缓存
    var _shortcutsCache = null;
    var _iconsCache = null;
    var _recentsCache = null;
    var _hiddenCache = null;

    // ================================================================
    // 数据层：读写快捷链接相关 localStorage
    // ================================================================

    function loadShortcuts() {
        if (_shortcutsCache !== null) return _shortcutsCache;
        _shortcutsCache = loadShortcutModel().items || [];
        return _shortcutsCache;
    }
    function saveShortcuts(arr) {
        _shortcutsCache = arr;
        return updateShortcutModel(function (model) { model.items = arr; });
    }
    function loadIcons() {
        if (_iconsCache !== null) return _iconsCache;
        try { _iconsCache = JSON.parse(localStorage.getItem(LS_KEY_SHORTCUT_ICONS) || '{}'); } catch (e) { _iconsCache = {}; }
        if (ensureBuiltinGithubIcon(_iconsCache)) saveIcons(_iconsCache);
        return _iconsCache;
    }
    function saveIcons(obj) {
        _iconsCache = obj;
        try { localStorage.setItem(LS_KEY_SHORTCUT_ICONS, JSON.stringify(obj)); return true; } catch (e) { return false; }
    }
    function loadRecents() {
        if (_recentsCache !== null) return _recentsCache;
        _recentsCache = loadShortcutModel().recents || [];
        return _recentsCache;
    }
    function saveRecents(arr) {
        _recentsCache = arr;
        return updateShortcutModel(function (model) { model.recents = arr; });
    }
    function isGithubShortcut(shortcut) {
        return !!(shortcut && String(shortcut.url || '').replace(/\/$/, '').toLowerCase() === BUILTIN_GITHUB.url);
    }
    function ensureBuiltinGithubIcon(icons) {
        var shortcuts = loadShortcuts();
        var changed = false;
        shortcuts.forEach(function (shortcut) {
            if (!isGithubShortcut(shortcut)) return;
            var current = icons[shortcut.id];
            if (!current || current === 'LETTER:G') {
                icons[shortcut.id] = BUILTIN_GITHUB_ICON;
                changed = true;
            }
        });
        return changed;
    }
    function loadHotkey() { return loadShortcutSettings().primaryHotkey || 'ctrl+k'; }
    function saveHotkey(key) { return updateShortcutSettings(function (settings) { settings.primaryHotkey = key; }); }
    function loadRecommend() { return loadShortcutSettings().recommendEnabled !== false; }
    function saveRecommend(bool) { updateShortcutSettings(function (settings) { settings.recommendEnabled = !!bool; }); }
    function loadCommandsCollapsed() { return loadShortcutSettings().commandsCollapsed !== false; }
    function saveCommandsCollapsed(bool) { updateShortcutSettings(function (settings) { settings.commandsCollapsed = !!bool; }); }
    function loadPalettePlacement() {
        var placement = loadShortcutSettings().palettePlacement;
        return placement === 'fixed' ? 'fixed' : 'follow';
    }
    function savePalettePlacement(value) {
        updateShortcutSettings(function (settings) { settings.palettePlacement = value === 'fixed' ? 'fixed' : 'follow'; });
    }
    function loadPalettePosition() {
        var position = loadShortcutSettings().palettePosition;
        if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') return null;
        return { x: position.x, y: position.y };
    }
    function savePalettePosition(position) {
        updateShortcutSettings(function (settings) {
            settings.palettePosition = {
                x: Math.round(position.x),
                y: Math.round(position.y)
            };
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
    function loadHidden() {
        if (_hiddenCache !== null) return _hiddenCache;
        _hiddenCache = loadShortcutModel().hidden || [];
        return _hiddenCache;
    }
    function saveHidden(arr) {
        _hiddenCache = arr;
        return updateShortcutModel(function (model) { model.hidden = arr; });
    }
    function loadHiddenHotkey() { return loadShortcutSettings().hiddenHotkey || 'ctrl+shift+k'; }
    function saveHiddenHotkey(key) { return updateShortcutSettings(function (settings) { settings.hiddenHotkey = key; }); }

    function loadShortcutModel() {
        if (window.WallpaperData && window.WallpaperData.loadShortcutsModel) return window.WallpaperData.loadShortcutsModel();
        return {
            items: [Object.assign({}, BUILTIN_GITHUB)],
            recents: [],
            hidden: [],
            settings: { primaryHotkey: 'ctrl+k', hiddenHotkey: 'ctrl+shift+k', recommendEnabled: true, viewMode: 'list', commandsCollapsed: true, palettePlacement: 'follow', palettePosition: null, paletteSkin: 'default', builtinGithubAdded: true }
        };
    }
    function saveShortcutModel(model) {
        if (window.WallpaperData && window.WallpaperData.saveShortcutsModel) return window.WallpaperData.saveShortcutsModel(model);
        return false;
    }
    function updateShortcutModel(mutator) {
        var model = loadShortcutModel();
        mutator(model);
        return saveShortcutModel(model);
    }
    function loadShortcutSettings() {
        return loadShortcutModel().settings || {};
    }
    function updateShortcutSettings(mutator) {
        return updateShortcutModel(function (model) {
            if (!model.settings) model.settings = {};
            mutator(model.settings);
        });
    }

    function recordAccess(id) {
        var shortcuts = loadShortcuts();
        var found = false;
        for (var i = 0; i < shortcuts.length; i++) {
            if (shortcuts[i].id === id) { shortcuts[i].freq = (shortcuts[i].freq || 0) + 1; found = true; break; }
        }
        if (found) saveShortcuts(shortcuts);
        var recents = loadRecents().filter(function (rid) { return rid !== id; });
        recents.unshift(id);
        if (recents.length > 10) recents.pop();
        saveRecents(recents);
    }

    // ================================================================
    // 工具函数
    // ================================================================

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }

    function getFaviconUrl(url) {
        try {
            var host = url.match(/^https:\/\/([^\/]+)/);
            if (!host) return null;
            return 'https://icons.duckduckgo.com/ip3/' + host[1] + '.ico';
        } catch (e) { return null; }
    }

    function isHttpUrl(value) {
        return /^http:\/\//i.test(String(value || '').trim());
    }

    function currentLanguageCode() {
        var panel = window.SettingsPanelFull || window.SettingsPanel;
        return panel && panel.getCurrentLang ? panel.getCurrentLang() : '';
    }

    function invalidUrlMessage(value, fallbackKey) {
        if (!isHttpUrl(value)) return t(fallbackKey);
        if (/^zh/i.test(currentLanguageCode())) return '不支持 http:// 链接，只能使用 https://。';
        return 'http:// links are not supported. Use https:// only.';
    }

    function normalizeHttpsUrl(value) {
        var url = String(value || '').trim();
        if (!url) return '';
        if (isHttpUrl(url)) return '';
        if (!url.match(/^https?:\/\//)) url = 'https://' + url;
        if (!url.match(/^https:\/\/[^\s\/]+\.[^\s\/]+/)) return '';
        return url;
    }

    function urlHostLabel(url) {
        return String(url || '').replace(/^https?:\/\//, '').replace(/\/.*/, '');
    }

    function smartUrlName(url) {
        var host = urlHostLabel(url).replace(/^www\./i, '');
        var parts = host.split('.').filter(Boolean);
        if (!parts.length) return host || 'Shortcut';
        var main = parts.length > 2 ? parts.slice(0, -1).join(' ') : parts[0];
        var brands = { github: 'GitHub', openai: 'OpenAI', youtube: 'YouTube' };
        return main.split(/[-_\s]+/).filter(Boolean).map(function (part) {
            var mapped = brands[part.toLowerCase()];
            if (mapped) return mapped;
            return part.charAt(0).toUpperCase() + part.slice(1);
        }).join(' ') || host;
    }

    function shortcutScopeName(hiddenMode) {
        return hiddenMode ? 'hidden' : 'normal';
    }

    function currentScopeName() {
        return shortcutScopeName(isHiddenMode);
    }

    function normalizeScope(scope, fallbackHiddenMode) {
        if (scope === 'hidden' || scope === 'normal') return scope;
        return shortcutScopeName(fallbackHiddenMode);
    }

    function normalizeUrlKey(url) {
        return String(url || '').replace(/\/$/, '').toLowerCase();
    }

    function findShortcutByUrl(shortcuts, url) {
        var key = normalizeUrlKey(url);
        return shortcuts.filter(function (s) { return normalizeUrlKey(s.url) === key; })[0] || null;
    }

    function isHiddenId(id, hidden) {
        return hidden.indexOf(id) !== -1;
    }

    function uniqueIds(ids) {
        var seen = {};
        var result = [];
        (ids || []).forEach(function (id) {
            if (!id || seen[id]) return;
            seen[id] = true;
            result.push(id);
        });
        return result;
    }

    function setShortcutScope(id, scope, hidden) {
        hidden = hidden || loadHidden();
        hidden = hidden.filter(function (hid) { return hid !== id; });
        if (scope === 'hidden') hidden.push(id);
        return uniqueIds(hidden);
    }

    function feedbackMessage(message, kind) {
        var hintClass = 'cp-hint';
        if (kind === 'info') hintClass += ' cp-hint-info';
        setFeedbackContentMode(true);
        cpContent.innerHTML = '<div class="' + hintClass + '">' + escapeHTML(message) + '</div>';
        setTimeout(function () {
            if (cpCurrentMode !== 'feedback') return;
            cpCurrentMode = 'list';
            renderShortcutList('');
            cpSearchInput.value = '';
            cpSearchTerm = '';
            cpSearchInput.focus();
        }, 1600);
    }

    function letterColor(letter) {
        var colors = ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#1abc9c', '#3498db', '#9b59b6', '#34495e',
            '#c0392b', '#d35400', '#27ae60', '#2980b9', '#8e44ad', '#16a085', '#f39c12', '#2c3e50'];
        var idx = (letter || 'A').toUpperCase().charCodeAt(0) % colors.length;
        return colors[idx];
    }

    function isDDGPlaceholder(img) {
        if (img.naturalWidth !== 48 || img.naturalHeight !== 48) return false;
        try {
            var canvas = document.createElement('canvas');
            canvas.width = 48;
            canvas.height = 48;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            var data = ctx.getImageData(0, 0, 48, 48).data;
            var hash = 0;
            for (var i = 0; i < 256; i++) {
                hash = ((hash << 5) - hash) + data[i];
                hash |= 0;
            }
            return hash === -1750283373;
        } catch (e) { return false; }
    }

    function escapeHTML(str) {
        return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function commandToggleLabel() {
        var key = cpCommandsCollapsed ? 'expandShortcutLinks' : 'collapseShortcutLinks';
        return t(key);
    }

    function palettePromptLabel() {
        if (cpSkin === 'command-terminal') return isHiddenMode ? 'hidden >' : 'plain >';
        if (cpSkin === 'shell') return shellPrompt();
        return isHiddenMode ? 'hidden@plaintab ~ %' : 'plain@plaintab ~ %';
    }

    function syncPaletteSkin() {
        cmdPalette.classList.toggle('terminal-skin', cpSkin === 'terminal');
        cmdPalette.classList.toggle('shell-skin', cpSkin === 'shell');
        cmdPalette.classList.toggle('command-terminal-skin', cpSkin === 'command-terminal');
        cmdOverlay.classList.toggle('terminal-skin', cpSkin === 'terminal');
        cmdOverlay.classList.toggle('shell-skin', cpSkin === 'shell');
        cmdOverlay.classList.toggle('command-terminal-skin', cpSkin === 'command-terminal');
        cpSearchInput.placeholder = cpSkin === 'terminal' || cpSkin === 'shell' || cpSkin === 'command-terminal' ? palettePromptLabel() : '';
        applyShellPaletteSize();
    }

    // ================================================================
    // 视图渲染
    // ================================================================

    function renderPinnedBar() {
        cpPinnedBar.innerHTML = '';
        var homeBtn = document.createElement('span');
        homeBtn.className = 'cp-pinned-btn cp-home-btn';
        homeBtn.title = t('backToList');
        homeBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 495.398 495.398" fill="currentColor" aria-hidden="true"><path d="M487.083 225.514l-75.08-75.08v-86.73c0-15.682-12.708-28.391-28.413-28.391-15.669 0-28.377 12.709-28.377 28.391v29.941L299.31 37.74c-27.639-27.624-75.694-27.575-103.27.05L8.312 225.514c-11.082 11.104-11.082 29.071 0 40.158 11.087 11.101 29.089 11.101 40.172 0l187.71-187.729c6.115-6.083 16.893-6.083 22.976-.018l187.742 187.747c5.567 5.551 12.825 8.312 20.081 8.312 7.271 0 14.541-2.764 20.091-8.312 11.086-11.086 11.086-29.053-.001-40.158z"/><path d="M257.561 131.836c-5.454-5.451-14.285-5.451-19.723 0L72.712 296.913c-2.607 2.606-4.085 6.164-4.085 9.877v120.401c0 28.253 22.908 51.16 51.16 51.16h81.754v-126.61h92.299v126.61h81.755c28.251 0 51.159-22.907 51.159-51.159V306.79c0-3.713-1.465-7.271-4.085-9.877L257.561 131.836z"/></svg>';
        homeBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            goHome();
        });
        cpPinnedBar.appendChild(homeBtn);

        var modeChip = document.createElement('span');
        modeChip.className = 'cp-mode-chip command-bounce' + (cpCommandsCollapsed ? ' collapsed' : '');
        modeChip.textContent = commandToggleLabel();
        modeChip.title = commandToggleLabel();
        modeChip.addEventListener('click', function (e) {
            e.stopPropagation();
            cpCommandsCollapsed = !cpCommandsCollapsed;
            saveCommandsCollapsed(cpCommandsCollapsed);
            renderPinnedBar();
        });
        cpPinnedBar.appendChild(modeChip);

        var commandStrip = document.createElement('div');
        commandStrip.className = 'cp-command-strip' + (cpCommandsCollapsed ? ' collapsed' : '');
        cpPinnedBar.appendChild(commandStrip);

        var cmds = cpCommandsCollapsed ? ['help'] : (isHiddenMode ? CP_COMMANDS_HIDDEN : CP_COMMANDS_NORMAL);
        cmds.forEach(function (cmd) {
            var btn = document.createElement('span');
            btn.className = 'cp-pinned-btn';
            btn.textContent = cmd;
            btn.addEventListener('click', function (e) { e.stopPropagation(); handleCommand(cmd); });
            commandStrip.appendChild(btn);
        });
        var toggleBtn = document.createElement('span');
        toggleBtn.className = 'cp-pinned-btn cp-view-toggle';
        toggleBtn.title = t('toggleView');
        if (cpViewMode === 'icon') {
            toggleBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="0.5" y="0.5" width="5.5" height="5.5" rx="1" fill="currentColor" opacity="0.9"/><rect x="8" y="0.5" width="5.5" height="5.5" rx="1" fill="currentColor" opacity="0.9"/><rect x="0.5" y="8" width="5.5" height="5.5" rx="1" fill="currentColor" opacity="0.9"/><rect x="8" y="8" width="5.5" height="5.5" rx="1" fill="currentColor" opacity="0.9"/></svg>';
        } else {
            toggleBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1.5" width="12" height="2.2" rx="1" fill="currentColor" opacity="0.9"/><rect x="1" y="5.9" width="12" height="2.2" rx="1" fill="currentColor" opacity="0.9"/><rect x="1" y="10.3" width="12" height="2.2" rx="1" fill="currentColor" opacity="0.9"/></svg>';
        }
        toggleBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            cpViewMode = cpViewMode === 'icon' ? 'list' : 'icon';
            updateShortcutSettings(function (settings) { settings.viewMode = cpViewMode; });
            renderPinnedBar();
            renderCurrentView();
            resetSelection();
        });
        cpPinnedBar.appendChild(toggleBtn);
    }

    function handlePinnedWheel(e) {
        var strip = cpPinnedBar.querySelector('.cp-command-strip');
        if (!strip || cpCommandsCollapsed || strip.scrollWidth <= strip.clientWidth) return;
        e.preventDefault();
        strip.scrollBy({ left: e.deltaY, behavior: 'smooth' });
    }

    function shortcutIsHidden(shortcut, hidden) {
        return hidden.indexOf(shortcut.id) !== -1;
    }

    function shortcutsForHiddenMode(hiddenMode) {
        var hidden = loadHidden();
        return loadShortcuts().filter(function (shortcut) {
            return hiddenMode ? shortcutIsHidden(shortcut, hidden) : !shortcutIsHidden(shortcut, hidden);
        });
    }

    function shortcutsForCurrentMode() {
        return shortcutsForHiddenMode(isHiddenMode);
    }

    function recommendationState(shortcuts, filter) {
        var recommended = [];
        var recommendedIds = {};
        if (!filter && loadRecommend()) {
            var byFreq = shortcuts.slice().sort(function (a, b) { return (b.freq || 0) - (a.freq || 0); });
            recommended = byFreq.slice(0, 5);
            recommended.forEach(function (s) { recommendedIds[s.id] = true; });
        }
        return {
            recommended: recommended,
            recommendedIds: recommendedIds,
            pageSize: recommended.length ? 10 : 15
        };
    }

    function shortcutsForGridMode(mode) {
        if (mode === 'hide') return shortcutsForHiddenMode(false);
        if (mode === 'unhide') return shortcutsForHiddenMode(true);
        return shortcutsForCurrentMode();
    }

    function shellPrompt() {
        return isHiddenMode ? 'admin@PlainTab ~/hidden %' : 'coffee@PlainTab ~/shortcuts %';
    }

    function filterShortcutsByTerm(shortcuts, term) {
        term = (term || '').toLowerCase();
        if (!term) return shortcuts;
        return shortcuts.filter(function (shortcut) {
            return shortcut.name.toLowerCase().indexOf(term) !== -1 ||
                shortcut.url.toLowerCase().indexOf(term) !== -1;
        });
    }

    function shortcutById(id) {
        return loadShortcuts().find(function (shortcut) { return shortcut.id === id; });
    }

    function renderShortcutList(filter) {
        setFeedbackContentMode(false);
        setIconPageMode(cpViewMode === 'icon');
        if (cpSkin === 'command-terminal') {
            renderCommandTerminal(filter || '', false, commandTerminalResult);
            return;
        }
        if (cpSkin === 'shell') {
            renderShellShortcutList(filter || '');
            return;
        }
        filter = (filter || '').toLowerCase();
        var shortcuts = shortcutsForCurrentMode();
        var icons = loadIcons();
        var recState = recommendationState(shortcuts, filter);
        var recommended = recState.recommended;
        var recommendedIds = recState.recommendedIds;

        var rest = shortcuts.filter(function (s) { return !recommendedIds[s.id]; });
        rest.sort(function (a, b) { return a.name.toLowerCase().localeCompare(b.name.toLowerCase()); });

        if (filter) {
            recommended = [];
            recommendedIds = {};
            rest = filterShortcutsByTerm(shortcuts, filter);
        }

        var html = '';

        if (cpViewMode === 'icon') {
            if (recommended.length) {
                html += '<div class="cp-section-title">' + t('recommend') + '</div>';
                html += '<div class="cp-grid cp-grid-rec">';
                recommended.forEach(function (s) { html += buildGridIconHTML(s, icons[s.id]); });
                html += '</div>';
            }
            if (rest.length > 0) {
                var iconPageSize = recState.pageSize;
                var totalPages = Math.ceil(rest.length / iconPageSize);
                if (cpCurrentPage > totalPages) cpCurrentPage = totalPages;
                if (cpCurrentPage < 1) cpCurrentPage = 1;
                var page = cpCurrentPage;
                var start = (page - 1) * iconPageSize;
                var pageItems = rest.slice(start, start + iconPageSize);

                if (filter) html += '<div class="cp-section-title">' + t('searchResults') + (totalPages > 1 ? ' (' + page + '/' + totalPages + ')' : '') + '</div>';
                else html += '<div class="cp-section-title">' + t('allShortcuts') + ' (A-Z)' + (totalPages > 1 ? ' ' + page + '/' + totalPages : '') + '</div>';
                html += '<div class="' + gridClass(totalPages, iconPageSize) + '">';
                pageItems.forEach(function (s) { html += buildGridIconHTML(s, icons[s.id]); });
                html += '</div>';
                if (totalPages > 1) html += renderPaginationHTML(page, totalPages);
            }
            if (rest.length === 0 && !recommended.length) {
                html += '<div class="cp-empty">' + (filter ? t('noResults') : t('noShortcuts')) + '</div>';
            }
        } else {
            if (recommended.length) {
                html += '<div class="cp-section-title">' + t('recommend') + '</div>';
                recommended.forEach(function (s) { html += buildItemHTML(s, icons[s.id]); });
            }
            if (filter) html += '<div class="cp-section-title">' + t('searchResults') + '</div>';
            else if (rest.length > 0) html += '<div class="cp-section-title">' + t('allShortcuts') + ' (A-Z)</div>';
            if (rest.length === 0 && !recommended.length) {
                html += '<div class="cp-empty">' + (filter ? t('noResults') : t('noShortcuts')) + '</div>';
            } else {
                rest.forEach(function (s) { html += buildItemHTML(s, icons[s.id]); });
            }
        }

        cpContent.innerHTML = html;
        applyIconStyles(cpContent);
        applyMarqueeLabels(cpContent);
        resetSelection();
    }

    function shellCommandButtons() {
        var cmds = isHiddenMode ? CP_COMMANDS_HIDDEN : CP_COMMANDS_NORMAL;
        return cmds.map(function (cmd) {
            return '<button class="cp-command-option cp-shell-alias" data-command="' + cmd + '">' +
                '<span class="cp-shell-alias-name">' + cmd + '</span>' +
                '<span class="cp-shell-alias-path">alias ' + cmd + '</span>' +
                '</button>';
        }).join('');
    }

    function shellPathLabel(shortcut) {
        try {
            var u = new URL(shortcut.url);
            return u.hostname + u.pathname.replace(/\/$/, '');
        } catch (e) {
            return shortcut.url.replace(/^https?:\/\//, '');
        }
    }

    function shellInputState(input) {
        var raw = String(input || '').trim();
        if (!raw) return { type: 'home', raw: '', query: '' };
        var first = raw.split(/\s+/)[0].toLowerCase();
        var rest = raw.slice(first.length).trim();
        if (first === 'open' || first === 'o') return { type: 'open', raw: raw, query: rest };
        if (first === 'ls') return { type: 'ls', raw: raw, query: rest };
        if (first === 'help' || first === 'h') return { type: 'help', raw: raw, query: '' };
        if (first === 'add') return { type: 'add', raw: raw, query: rest };
        return { type: 'shortcut', raw: raw, query: raw };
    }

    function shellShortcutMatches(shortcut, query) {
        query = String(query || '').trim().toLowerCase();
        if (!query) return true;
        var name = shortcut.name.toLowerCase();
        var path = shellPathLabel(shortcut).toLowerCase();
        return name.indexOf(query) === 0 || path.indexOf(query) === 0;
    }

    function shellShortcutCandidates(state) {
        if (!state || state.type === 'help' || state.type === 'add') return [];
        return shortcutsForCurrentMode().filter(function (shortcut) {
            return shellShortcutMatches(shortcut, state.query);
        }).sort(function (a, b) {
            return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        });
    }

    function shellCommandOutput(state) {
        if (state.type === 'help') return 'help';
        if (state.type === 'add') return 'add ' + (state.query || '<url>');
        if (state.type === 'open') return 'open ' + (state.query || '<shortcut>');
        if (state.type === 'shortcut') return 'open ' + state.query;
        return state.raw || 'ls --hot --all';
    }

    function renderShellHelpOutput() {
        var commands = ['open <name>', 'ls', 'add <url>', 'recent', 'import', 'export', 'clear', 'restore', 'help'];
        if (isHiddenMode) commands.splice(7, 0, 'unhide');
        else commands.splice(7, 0, 'hide');
        return '<div class="cp-shell-section"># commands</div>' +
            '<div class="cp-shell-help-grid">' + commands.map(function (cmd) {
                return '<span class="cp-shell-help-cmd">' + escapeHTML(cmd) + '</span>';
            }).join('') + '</div>';
    }

    function buildShellShortcutHTML(shortcut, tag) {
        var freq = String(shortcut.freq || 0);
        while (freq.length < 3) freq = '0' + freq;
        return '<button class="cp-item cp-shell-entry" data-id="' + escapeHTML(shortcut.id) + '">' +
            '<span class="cp-shell-perm">cmd</span>' +
            '<span class="cp-shell-owner">' + (isHiddenMode ? 'root' : 'user') + '</span>' +
            '<span class="cp-shell-freq">' + freq + '</span>' +
            '<span class="cp-shell-name">' + escapeHTML(shortcut.name) + '</span>' +
            '<span class="cp-shell-target">' + escapeHTML(shellPathLabel(shortcut)) + '</span>' +
            '<span class="cp-shell-tag">' + tag + '</span>' +
            '</button>';
    }

    function renderShellShortcutList(input) {
        setIconPageMode(false);
        var state = shellInputState(input);
        var shortcuts = shortcutsForCurrentMode();
        var recState = recommendationState(shortcuts, '');
        var recommended = recState.recommended;
        var recommendedIds = recState.recommendedIds;
        var rest = shortcuts.filter(function (s) { return !recommendedIds[s.id]; });
        rest.sort(function (a, b) { return a.name.toLowerCase().localeCompare(b.name.toLowerCase()); });

        if (state.raw) {
            recommended = [];
            recommendedIds = {};
            rest = shellShortcutCandidates(state);
        }

        var html = '<div class="cp-shell-buffer">' +
            '<div class="cp-shell-line cp-shell-boot">PlainTab shell ready. Type help or h for commands.</div>';

        if (!state.raw || state.type === 'help') {
            html += '<div class="cp-shell-line"><span class="cp-shell-prompt">' + shellPrompt() + '</span><span class="cp-shell-command"> aliases</span></div>' +
                '<div class="cp-shell-alias-grid">' + shellCommandButtons() + '</div>';
        }

        html += '<div class="cp-shell-line"><span class="cp-shell-prompt">' + shellPrompt() + '</span><span class="cp-shell-command"> ' + escapeHTML(shellCommandOutput(state)) + '</span></div>';

        if (state.type === 'help') {
            html += renderShellHelpOutput();
        } else if (state.type === 'add') {
            html += '<div class="cp-shell-empty">' + escapeHTML(formatText('commandTerminalPromptAdd', { value: state.query || '<url>' })) + '</div>';
        } else if (state.raw && (state.type === 'open' || state.type === 'shortcut') && rest.length) {
            html += '<div class="cp-shell-section"># completions</div>';
            rest.forEach(function (s) { html += buildShellShortcutHTML(s, 'tab'); });
        } else if (recommended.length) {
            html += '<div class="cp-shell-section"># recommended</div>';
            recommended.forEach(function (s) { html += buildShellShortcutHTML(s, 'hot'); });
        }

        if (!state.raw && rest.length) {
            html += '<div class="cp-shell-section"># all shortcuts</div>';
            rest.forEach(function (s) { html += buildShellShortcutHTML(s, 'link'); });
        } else if (state.type === 'ls' && rest.length) {
            html += '<div class="cp-shell-section"># ' + (state.query ? 'matches' : 'shortcuts') + '</div>';
            rest.forEach(function (s) { html += buildShellShortcutHTML(s, state.query ? 'match' : 'link'); });
        }

        if (state.type !== 'help' && state.type !== 'add' && !recommended.length && !rest.length) {
            html += '<div class="cp-shell-empty">exit code 1: ' + escapeHTML(state.raw ? t('noResults') : t('noShortcuts')) + '</div>';
        }

        html += '</div>';
        cpContent.innerHTML = html;
        applyMarqueeLabels(cpContent);
        resetSelection();
    }

    function commandTerminalPrompt() {
        return isHiddenMode ? 'hidden' : 'plain';
    }

    function commandTerminalInputState(input) {
        var raw = String(input || '').trim();
        if (!raw) return { type: 'boot', raw: '', query: '' };
        var first = raw.split(/\s+/)[0].toLowerCase();
        var rest = raw.slice(first.length).trim();
        if (first === 'help' || first === 'h') return { type: 'help', raw: raw, query: '' };
        if (first === 'ls') return { type: 'ls', raw: raw, query: '' };
        if (first === 'open' || first === 'o') return { type: 'open', raw: raw, query: rest };
        if (first === 'add') return { type: 'add', raw: raw, query: rest };
        if (first === 'edit') return commandTerminalEditState(raw, rest);
        if (first === 'delall' || first === 'deleteall' || (first === 'delete' && rest.toLowerCase() === 'all')) return { type: 'delete-all', raw: raw, query: rest };
        if (first === 'del' || first === 'delete') return { type: 'delete', raw: raw, query: rest.replace(/\s+--yes\b/i, '').trim(), confirm: /\s--yes\b/i.test(' ' + rest), command: first };
        if (first === 'hide' && !isHiddenMode) return { type: 'hide', raw: raw, query: rest };
        if (first === 'unhide' && isHiddenMode) return { type: 'unhide', raw: raw, query: rest };
        if (first === 'recent') return { type: 'recent', raw: raw, query: '' };
        if (first === 'import') return { type: 'import', raw: raw, query: '' };
        if (first === 'export') return { type: 'export', raw: raw, query: '' };
        if (first === 'reset') return { type: 'reset', raw: raw, query: rest };
        if (first === 'restore') return { type: 'restore', raw: raw, query: '' };
        if (first === 'clear') {
            return { type: 'clear-screen', raw: raw, query: '' };
        }
        return { type: 'search', raw: raw, query: raw };
    }

    function commandTerminalDisplayCommand(state) {
        if (state.type === 'boot') return '';
        if (state.type === 'search') return state.query;
        if (state.type === 'open') return 'open ' + (state.query || '<shortcut>');
        if (state.type === 'add') return 'add ' + (state.query || '<url>');
        return state.raw;
    }

    function commandTerminalEditState(raw, rest) {
        var args = commandTerminalEditArgs(rest);
        var query = commandTerminalEditQuery(rest);
        if (!args.name && !args.url) {
            var inline = commandTerminalInlineEdit(rest);
            if (inline.value) {
                query = inline.query;
                if (commandTerminalValueLooksLikeUrl(inline.value)) args.url = inline.value;
                else args.name = inline.value;
            }
        }
        return { type: 'edit', raw: raw, query: query, args: args };
    }

    function commandTerminalEditArgs(rest) {
        var args = {};
        String(rest || '').split(/\s+/).forEach(function (part) {
            var idx = part.indexOf('=');
            if (idx <= 0) return;
            var key = part.slice(0, idx).toLowerCase();
            var value = part.slice(idx + 1).trim();
            if (key === 'name' || key === 'url') args[key] = value;
        });
        return args;
    }

    function commandTerminalEditQuery(rest) {
        var parts = String(rest || '').split(/\s+/).filter(function (part) {
            return part && part.indexOf('=') === -1;
        });
        return parts.join(' ').trim();
    }

    function commandTerminalValueLooksLikeUrl(value) {
        value = String(value || '').trim();
        return /^https?:\/\//i.test(value) || (/^[^\s]+\.[^\s]+/.test(value) && value.indexOf(' ') === -1);
    }

    function bestCommandTerminalMatch(query) {
        query = String(query || '').trim();
        if (!query) return null;
        return shortcutsForCurrentMode().filter(function (shortcut) {
            return commandTerminalMatchScore(shortcut, query) < 99;
        }).sort(function (a, b) {
            var scoreDiff = commandTerminalMatchScore(a, query) - commandTerminalMatchScore(b, query);
            return scoreDiff || a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        })[0] || null;
    }

    function commandTerminalInlineEdit(rest) {
        var parts = String(rest || '').trim().split(/\s+/).filter(Boolean);
        if (parts.length < 2) return { query: rest, value: '' };
        for (var i = parts.length - 1; i >= 1; i--) {
            var query = parts.slice(0, i).join(' ');
            if (bestCommandTerminalMatch(query)) {
                return {
                    query: query,
                    value: parts.slice(i).join(' ')
                };
            }
        }
        return { query: rest, value: '' };
    }

    function commandTerminalEditHint(state, candidates) {
        if (state.args.name || state.args.url) {
            var target = candidates[0];
            return target ? formatText('commandTerminalUpdateNamed', { name: target.name }) : t('commandTerminalNoMatchEdit');
        }
        if (candidates.length) return t('commandTerminalEditTargetHint');
        return 'Type edit <name>, or edit <name> <new name/url>.';
    }

    function commandTerminalMatchScore(shortcut, query) {
        query = String(query || '').trim().toLowerCase();
        if (!query) return 0;
        var name = shortcut.name.toLowerCase();
        var path = shellPathLabel(shortcut).toLowerCase();
        if (name === query || path === query) return 0;
        if (name.indexOf(query) === 0) return 1;
        if (path.indexOf(query) === 0) return 2;
        if (name.indexOf(query) !== -1) return 3;
        if (path.indexOf(query) !== -1) return 4;
        return 99;
    }

    function commandTerminalSortedShortcuts(shortcuts) {
        var recState = recommendationState(shortcuts, '');
        var recommendedIds = recState.recommendedIds;
        var recommended = recState.recommended.slice().sort(function (a, b) {
            var freqDiff = (b.freq || 0) - (a.freq || 0);
            return freqDiff || a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        });
        var rest = shortcuts.filter(function (s) { return !recommendedIds[s.id]; });
        rest.sort(function (a, b) { return a.name.toLowerCase().localeCompare(b.name.toLowerCase()); });
        return recommended.concat(rest);
    }

    function commandTerminalRecentShortcuts() {
        var scoped = shortcutsForCurrentMode();
        var byId = {};
        scoped.forEach(function (shortcut) { byId[shortcut.id] = shortcut; });
        return loadRecents().map(function (id) { return byId[id]; }).filter(Boolean);
    }

    function commandTerminalCandidates(state) {
        var shortcuts = shortcutsForCurrentMode();
        if (state.type === 'boot' || state.type === 'help' || state.type === 'add' || state.type === 'import' || state.type === 'export' || state.type === 'clear-screen' || state.type === 'delete-all' || state.type === 'reset' || state.type === 'restore') return [];
        if (state.type === 'recent') return commandTerminalRecentShortcuts();
        if (state.type === 'ls' && !state.query) return commandTerminalSortedShortcuts(shortcuts);
        var query = state.query || '';
        if (!query) return [];
        return shortcuts.filter(function (shortcut) {
            return commandTerminalMatchScore(shortcut, query) < 99;
        }).sort(function (a, b) {
            var scoreDiff = commandTerminalMatchScore(a, query) - commandTerminalMatchScore(b, query);
            return scoreDiff || a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        });
    }

    function commandTerminalIconHTML(shortcut, icons) {
        var iconData = icons[shortcut.id] || '';
        var letter = (shortcut.name || '?')[0].toUpperCase();
        if (iconData && iconData.indexOf('LETTER:') !== 0) {
            return '<span class="cp-command-terminal-icon"><img src="' + escapeHTML(iconData) + '" alt=""></span>';
        }
        return '<span class="cp-command-terminal-icon">' + escapeHTML(letter) + '</span>';
    }

    function buildCommandTerminalRow(shortcut, tag, icons) {
        return '<button class="cp-item cp-command-terminal-row" data-id="' + escapeHTML(shortcut.id) + '">' +
            commandTerminalIconHTML(shortcut, icons) +
            '<span class="cp-command-terminal-name">' + escapeHTML(shortcut.name) + '</span>' +
            '<span class="cp-command-terminal-path">' + escapeHTML(shellPathLabel(shortcut)) + '</span>' +
            '<span class="cp-command-terminal-tag">' + escapeHTML(tag || 'link') + '</span>' +
            '</button>';
    }

    function commandTerminalHelpHTML() {
        var groups = [
            {
                title: t('commandTerminalGroupNavigation'),
                items: [
                    ['help, h', t('commandTerminalHelpGuide')],
                    ['ls', t('commandTerminalListShortcuts')],
                    ['<keyword>', t('commandTerminalSearchShortcuts')],
                    ['open, o <name>', t('commandTerminalOpenFirst')],
                    ['recent', t('commandTerminalShowRecent')],
                    ['clear', t('commandTerminalClearOutput')]
                ]
            },
            {
                title: t('commandTerminalGroupManagement'),
                items: [
                    ['add <url>', t('commandTerminalAddUrl')],
                    ['edit <name> [new]', t('commandTerminalEditInline')],
                    ['del <name>', t('commandTerminalDeleteInline')],
                    [isHiddenMode ? 'unhide <name>' : 'hide <name>', isHiddenMode ? t('commandTerminalMoveNormal') : t('commandTerminalMoveHidden')],
                    ['delall', t('commandTerminalDeleteAll')]
                ]
            },
            {
                title: t('commandTerminalGroupDataKeys'),
                items: [
                    ['import', t('commandTerminalImportFile')],
                    ['export', t('commandTerminalExportCurrent')],
                    ['reset', t('commandTerminalResetUsage')],
                    ['restore', t('commandTerminalRestoreDefaults')],
                    ['Tab', t('commandTerminalCompleteCommand')],
                    ['Up / Down / Enter / Esc', t('commandTerminalNavigationKeys')]
                ]
            }
        ];
        return '<div class="cp-command-terminal-help">' + groups.map(function (group) {
            return '<section class="cp-command-terminal-help-group">' +
                '<div class="cp-command-terminal-help-title">' + escapeHTML(group.title) + '</div>' +
                group.items.map(function (item) {
                    return '<div class="cp-command-terminal-help-line"><code>' + escapeHTML(item[0]) + '</code><em>' + escapeHTML(item[1]) + '</em></div>';
                }).join('') +
                '</section>';
        }).join('') + '</div>';
    }

    function commandTerminalMessageHTML(result) {
        if (!result) return '';
        var cls = result.pending ? ' pending' : (result.ok ? ' ok' : ' error');
        return '<div class="cp-command-terminal-message' + cls + '">' + escapeHTML(result.message || '') + '</div>';
    }

    function renderCommandTerminal(input, committed, result) {
        setIconPageMode(false);
        setFeedbackContentMode(false);
        var state = commandTerminalInputState(input);
        var icons = loadIcons();
        var candidates = commandTerminalCandidates(state);
        var html = '<div class="cp-command-terminal-buffer">';
        html += '<div class="cp-command-terminal-boot">PlainTab terminal ready.</div>';
        html += '<div class="cp-command-terminal-boot">Type help or h to show commands. Try: ls, open github, add example.com</div>';
        if (state.type !== 'boot') {
            html += '<div class="cp-command-terminal-line"><span class="cp-command-terminal-prompt">' + commandTerminalPrompt() + '</span><span class="cp-command-terminal-command">' + escapeHTML(commandTerminalDisplayCommand(state)) + '</span><span class="cp-command-terminal-state">' + (committed ? 'executed' : 'preview') + '</span></div>';
        }
        if (state.type === 'boot') {
            html += '<div class="cp-command-terminal-line"><span class="cp-command-terminal-prompt">' + commandTerminalPrompt() + '</span><span class="cp-command-terminal-command">help</span><span class="cp-command-terminal-state">hint</span></div>';
            html += commandTerminalHelpHTML();
        } else if (state.type === 'help') {
            html += commandTerminalHelpHTML();
        } else if (state.type === 'add') {
            html += commandTerminalMessageHTML(result) || '<div class="cp-command-terminal-message">' + escapeHTML(formatText('commandTerminalPromptAdd', { value: state.query || '<url>' })) + '</div>';
        } else if (state.type === 'import') {
            html += commandTerminalMessageHTML(result) || '<div class="cp-command-terminal-message">' + t('commandTerminalPromptChooseImportFile') + '</div>';
        } else if (state.type === 'export') {
            html += commandTerminalMessageHTML(result) || '<div class="cp-command-terminal-message">' + t('commandTerminalPromptExport') + '</div>';
        } else if (state.type === 'clear-screen') {
            html += '<div class="cp-command-terminal-message">' + t('commandTerminalPromptClearOutput') + '</div>';
        } else if (state.type === 'delete-all') {
            html += commandTerminalMessageHTML(result) || '<div class="cp-command-terminal-message">' + t('commandTerminalPromptReviewDeleteAll') + '</div>';
        } else if (state.type === 'reset') {
            html += commandTerminalMessageHTML(result) || '<div class="cp-command-terminal-message">' + t('commandTerminalPromptResetUsage') + '</div>';
        } else if (state.type === 'restore') {
            html += commandTerminalMessageHTML(result) || '<div class="cp-command-terminal-message">' + t('commandTerminalPromptRestoreDefaults') + '</div>';
        } else if (state.type === 'edit') {
            html += commandTerminalMessageHTML(result) || '<div class="cp-command-terminal-message">' + escapeHTML(commandTerminalEditHint(state, candidates)) + '</div>';
            if (candidates.length) {
                html += '<div class="cp-command-terminal-section">target</div>';
                candidates.forEach(function (shortcut, index) { html += buildCommandTerminalRow(shortcut, index === 0 ? 'target' : 'match', icons); });
            }
        } else if (state.type === 'delete' || state.type === 'hide' || state.type === 'unhide') {
            html += commandTerminalMessageHTML(result) || '<div class="cp-command-terminal-message">' + escapeHTML(commandTerminalActionHint(state)) + '</div>';
            if (candidates.length) {
                html += '<div class="cp-command-terminal-section">target</div>';
                candidates.forEach(function (shortcut, index) { html += buildCommandTerminalRow(shortcut, index === 0 ? 'target' : 'match', icons); });
            }
        } else {
            if (result) html += commandTerminalMessageHTML(result);
            if (candidates.length) {
                html += '<div class="cp-command-terminal-section">' + (state.type === 'ls' ? 'shortcuts' : (state.type === 'recent' ? 'recent' : 'matches')) + '</div>';
                candidates.forEach(function (shortcut, index) {
                    var tag = state.type === 'recent' ? 'recent' : (state.type === 'ls' && (shortcut.freq || 0) > 0 ? 'hot' : (index === 0 ? 'best' : 'match'));
                    html += buildCommandTerminalRow(shortcut, tag, icons);
                });
            } else {
                html += '<div class="cp-command-terminal-empty">' + (state.type === 'recent' ? t('noRecentShortcuts') : t('noResults')) + '</div>';
            }
        }
        html += '</div>';
        cpContent.innerHTML = html;
        resetSelection();
    }

    function selectedCommandTerminalShortcut(candidates) {
        var selected = cpContent.querySelector('.cp-command-terminal-row.key-hover');
        if (selected && selected.dataset.id) {
            for (var i = 0; i < candidates.length; i++) {
                if (candidates[i].id === selected.dataset.id) return candidates[i];
            }
        }
        return candidates[0] || null;
    }

    function clearCommandTerminalInput() {
        cpSearchInput.value = '';
        cpSearchTerm = '';
    }

    function cancelCommandTerminalReturn() {
        if (!commandTerminalReturnTimer) return;
        clearTimeout(commandTerminalReturnTimer);
        commandTerminalReturnTimer = 0;
    }

    function scheduleCommandTerminalReturn(result) {
        cancelCommandTerminalReturn();
        if (!result || result.pending) return;
        commandTerminalReturnTimer = setTimeout(function () {
            commandTerminalReturnTimer = 0;
            if (!isPaletteOpen || cpSkin !== 'command-terminal' || commandTerminalPendingAction) return;
            commandTerminalCommittedInput = 'ls';
            commandTerminalResult = null;
            clearCommandTerminalInput();
            renderCommandTerminal('ls', true, null);
        }, 1400);
    }

    function renderCommandTerminalResult(input, result) {
        commandTerminalResult = result;
        renderCommandTerminal(input, true, commandTerminalResult);
        scheduleCommandTerminalReturn(commandTerminalResult);
    }

    function setCommandTerminalInput(value, selectAll) {
        value = String(value || '');
        cancelCommandTerminalReturn();
        cpSearchInput.value = value;
        cpSearchTerm = value;
        cpSearchInput.setSelectionRange(selectAll ? 0 : value.length, value.length);
    }

    function completeCommandTerminalInput() {
        cancelCommandTerminalReturn();
        var state = commandTerminalInputState(cpSearchInput.value);
        var targetTypes = { search: true, open: true, edit: true, delete: true, hide: true, unhide: true };
        if (state.type === 'search' && state.query && 'delall'.indexOf(state.query.toLowerCase()) === 0) {
            cpSearchInput.value = 'delall';
            cpSearchTerm = cpSearchInput.value;
            commandTerminalResult = null;
            renderCommandTerminal(cpSearchInput.value, false, null);
            cpSearchInput.setSelectionRange(cpSearchInput.value.length, cpSearchInput.value.length);
            return true;
        }
        if (!targetTypes[state.type]) return false;
        var target = selectedCommandTerminalShortcut(commandTerminalCandidates(state));
        if (!target) return false;
        if (state.type === 'search') {
            cpSearchInput.value = 'open ' + target.name;
        } else if (state.type === 'delete') {
            cpSearchInput.value = 'del ' + target.name + (state.confirm ? ' --yes' : '');
        } else if (state.type === 'edit') {
            var editValue = state.args.url || state.args.name || '';
            cpSearchInput.value = 'edit ' + target.name + (editValue ? ' ' + editValue : ' ');
        } else {
            cpSearchInput.value = state.type + ' ' + target.name;
        }
        cpSearchTerm = cpSearchInput.value;
        commandTerminalResult = null;
        renderCommandTerminal(cpSearchInput.value, false, null);
        cpSearchInput.setSelectionRange(cpSearchInput.value.length, cpSearchInput.value.length);
        return true;
    }

    function cleanCommandTerminalTitle(title, fallbackUrl) {
        title = String(title || '').replace(/\s+/g, ' ').trim();
        return title || smartUrlName(fallbackUrl);
    }

    function fetchTitleForCommandTerminal(url, callback) {
        var isExt = typeof chrome !== 'undefined' && chrome.permissions && !!chrome.runtime && !!chrome.runtime.id;
        var settled = false;
        var timer = setTimeout(function () { finish(null); }, 2500);
        var finish = function (title) {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            callback(cleanCommandTerminalTitle(title, url));
        };
        var doFetch = function () {
            var fetcher = isExt ? fetchPageTitleInTempTab : fetchPageTitle;
            fetcher(url, finish);
        };

        if (!isExt) {
            doFetch();
            return;
        }

        var origin;
        try {
            origin = new URL(url).origin + '/*';
        } catch (e) {
            finish(null);
            return;
        }

        chrome.permissions.contains({ origins: [origin] }, function (hasPermission) {
            if (hasPermission) {
                doFetch();
                return;
            }
            if (!chrome.permissions.request) {
                finish(null);
                return;
            }
            chrome.permissions.request({ origins: [origin] }, function (granted) {
                if (granted) {
                    doFetch();
                    return;
                }
                finish(null);
            });
        });
    }

    function createCommandTerminalShortcut(name, url) {
        var shortcuts = loadShortcuts();
        var id = generateId();
        shortcuts.push({ id: id, name: name, url: url, freq: 0, added: Date.now() });
        saveShortcuts(shortcuts);
        if (isHiddenMode) {
            var hidden = loadHidden();
            hidden.push(id);
            saveHidden(hidden);
        }
        var icons = loadIcons();
        var favUrl = getFaviconUrl(url);
        icons[id] = 'LETTER:' + name[0].toUpperCase();
        saveIcons(icons);
        if (favUrl) {
            var img = new Image();
            img.onload = function () {
                if (isDDGPlaceholder(this)) return;
                var latestIcons = loadIcons();
                latestIcons[id] = favUrl;
                saveIcons(latestIcons);
            };
            img.src = favUrl;
        }
        return {
            ok: true,
            message: formatText('commandTerminalAdded', {
                name: name,
                scope: scopeLabel(isHiddenMode ? 'hidden' : 'normal')
            })
        };
    }

    function addShortcutFromCommandTerminal(urlValue, token, input) {
        var url = normalizeHttpsUrl(urlValue);
        if (!url) return { ok: false, message: invalidUrlMessage(urlValue, 'commandTerminalInvalidUrl') };
        var shortcuts = loadShortcuts();
        if (shortcuts.some(function (s) { return s.url.toLowerCase() === url.toLowerCase(); })) {
            return { ok: false, message: t('commandTerminalShortcutExists') };
        }
        fetchTitleForCommandTerminal(url, function (name) {
            if (token !== commandTerminalAsyncToken || commandTerminalCommittedInput !== input) return;
            renderCommandTerminalResult(input, createCommandTerminalShortcut(name, url));
        });
        return { pending: true, message: formatText('commandTerminalResolvingTitle', { host: urlHostLabel(url) }) };
    }

    function importShortcutsFromCommandTerminal(inputCommand) {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,.html,.htm,application/json,text/html';
        input.addEventListener('change', function () {
            var file = input.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function () {
                var parsed = parseShortcutImportPayload(reader.result, file.name);
                if (!parsed.items.length) {
                    renderCommandTerminalResult(inputCommand, { ok: false, message: t('commandTerminalNoImportable') });
                    return;
                }
                var sourceScope = parsed.format === 'json' ? normalizeScope(parsed.scope, isHiddenMode) : null;
                var targetScope = sourceScope || currentScopeName();
                var result = importShortcutsToScope(parsed.items, targetScope);
                renderCommandTerminalResult(inputCommand, {
                    ok: true,
                    message: formatText('commandTerminalImported', {
                        scope: scopeLabel(targetScope),
                        added: result.added,
                        moved: result.moved,
                        skipped: result.skipped
                    })
                });
            };
            reader.readAsText(file);
        });
        setTimeout(function () { input.click(); }, 0);
        return { pending: true, message: t('commandTerminalChooseImportFile') };
    }

    function exportShortcutsFromCommandTerminal() {
        var count = shortcutsForScope(currentScopeName()).length;
        handleExport();
        return {
            ok: true,
            message: formatText('commandTerminalExported', {
                count: count,
                scope: scopeLabel(currentScopeName())
            })
        };
    }

    function clearShortcutsFromCommandTerminal(confirmed) {
        var scope = currentScopeName();
        if (!confirmed) return { ok: false, message: t('commandTerminalConfirmDeleteAllFirst') };
        var hidden = loadHidden();
        var removeIds = {};
        var keptShortcuts = loadShortcuts().filter(function (shortcut) {
            var remove = scope === 'hidden' ? isHiddenId(shortcut.id, hidden) : !isHiddenId(shortcut.id, hidden);
            if (remove) removeIds[shortcut.id] = true;
            return !remove;
        });
        var icons = loadIcons();
        Object.keys(removeIds).forEach(function (id) { delete icons[id]; });
        saveShortcuts(keptShortcuts);
        saveIcons(icons);
        saveRecents(loadRecents().filter(function (id) { return !removeIds[id]; }));
        if (scope === 'hidden') saveHidden(hidden.filter(function (id) { return !removeIds[id]; }));
        return {
            ok: true,
            message: formatText('commandTerminalDeletedFromScope', {
                count: Object.keys(removeIds).length,
                scope: scopeLabel(scope)
            })
        };
    }

    function commandTerminalActionHint(state) {
        if (state.type === 'delete') return state.confirm ? t('commandTerminalConfirmDelete') : t('commandTerminalDeleteInline');
        if (state.type === 'hide') return t('commandTerminalMoveHiddenHint');
        if (state.type === 'unhide') return t('commandTerminalMoveNormalHint');
        return '';
    }

    function deleteShortcutFromCommandTerminal(state) {
        if (!state.confirm) return { ok: false, message: t('commandTerminalDestructiveDelete') };
        var target = selectedCommandTerminalShortcut(commandTerminalCandidates(state));
        if (!target) return { ok: false, message: t('commandTerminalNoMatchDelete') };
        return deleteCommandTerminalTarget(target);
    }

    function deleteCommandTerminalTarget(target) {
        saveShortcuts(loadShortcuts().filter(function (shortcut) { return shortcut.id !== target.id; }));
        var icons = loadIcons();
        delete icons[target.id];
        saveIcons(icons);
        saveRecents(loadRecents().filter(function (id) { return id !== target.id; }));
        saveHidden(loadHidden().filter(function (id) { return id !== target.id; }));
        return { ok: true, message: formatText('commandTerminalDeletedNamed', { name: target.name }) };
    }

    function moveShortcutFromCommandTerminal(state, scope) {
        var target = selectedCommandTerminalShortcut(commandTerminalCandidates(state));
        if (!target) return { ok: false, message: t('commandTerminalNoMatch') };
        saveHidden(setShortcutScope(target.id, scope, loadHidden().slice()));
        return { ok: true, message: (scope === 'hidden' ? 'Hidden ' : 'Unhid ') + target.name + '.' };
    }

    function editShortcutFromCommandTerminal(state) {
        var target = selectedCommandTerminalShortcut(commandTerminalCandidates(state));
        if (!target) return { ok: false, message: t('commandTerminalNoMatchEdit') };
        return editShortcutFromCommandTerminalByTarget(target, state);
    }

    function editCommandTerminalTarget(target, value) {
        value = String(value || '').trim();
        if (!target) return { ok: false, message: t('commandTerminalNoMatchEdit') };
        if (!value) return { pending: true, message: t('commandTerminalTypeNewValue') };
        var state = { args: {}, query: target.name };
        if (/^url\s+/i.test(value)) {
            state.args.url = value.replace(/^url\s+/i, '').trim();
        } else if (/^name\s+/i.test(value)) {
            state.args.name = value.replace(/^name\s+/i, '').trim();
        } else if (/^name=/i.test(value) || /^url=/i.test(value)) {
            state.args = commandTerminalEditArgs(value);
        } else if (commandTerminalValueLooksLikeUrl(value)) {
            state.args.url = value;
        } else {
            state.args.name = value;
        }
        return editShortcutFromCommandTerminalByTarget(target, state);
    }

    function editShortcutFromCommandTerminalByTarget(target, state) {
        if (!state.args.name && !state.args.url) return { ok: false, message: t('commandTerminalTypeNewValue') };
        var oldName = target.name;
        var nextName = state.args.name || target.name;
        var nextUrl = target.url;
        if (state.args.url) {
            nextUrl = normalizeHttpsUrl(state.args.url);
            if (!nextUrl) return { ok: false, message: invalidUrlMessage(state.args.url, 'commandTerminalInvalidEditUrl') };
            if (loadShortcuts().some(function (shortcut) { return shortcut.id !== target.id && shortcut.url.toLowerCase() === nextUrl.toLowerCase(); })) {
                return { ok: false, message: t('commandTerminalUrlExists') };
            }
        }
        if (nextName === target.name && nextUrl === target.url) return { ok: true, message: t('commandTerminalNoChanges') };
        var shortcuts = loadShortcuts();
        shortcuts.forEach(function (shortcut) {
            if (shortcut.id === target.id) {
                shortcut.name = nextName;
                shortcut.url = nextUrl;
            }
        });
        saveShortcuts(shortcuts);
        var icons = loadIcons();
        icons[target.id] = getFaviconUrl(nextUrl) || ('LETTER:' + nextName[0].toUpperCase());
        saveIcons(icons);
        return { ok: true, message: formatText('commandTerminalUpdated', { oldName: oldName, newName: nextName }) };
    }

    function resetStatsFromCommandTerminal() {
        var targetIds = {};
        shortcutsForScope(currentScopeName()).forEach(function (shortcut) { targetIds[shortcut.id] = true; });
        var shortcuts = loadShortcuts();
        shortcuts.forEach(function (shortcut) {
            if (targetIds[shortcut.id]) shortcut.freq = 0;
        });
        saveShortcuts(shortcuts);
        saveRecents(loadRecents().filter(function (id) { return !targetIds[id]; }));
        return { ok: true, message: formatText('commandTerminalResetUsageOk', { scope: scopeLabel(currentScopeName()) }) };
    }

    function restoreDefaultsFromCommandTerminal() {
        if (isHiddenMode) return { ok: false, message: t('commandTerminalRestoreHiddenUnavailable') };
        var shortcuts = loadShortcuts().slice();
        var hidden = loadHidden().slice();
        var existing = findShortcutByUrl(shortcuts, BUILTIN_GITHUB.url);
        if (existing) {
            hidden = setShortcutScope(existing.id, 'normal', hidden);
        } else {
            var restoreId = shortcuts.some(function (shortcut) { return shortcut.id === BUILTIN_GITHUB.id; }) ? generateId() : BUILTIN_GITHUB.id;
            shortcuts.unshift({
                id: restoreId,
                name: BUILTIN_GITHUB.name,
                url: BUILTIN_GITHUB.url,
                freq: 0,
                added: Date.now()
            });
            var icons = loadIcons();
            icons[restoreId] = BUILTIN_GITHUB_ICON;
            saveIcons(icons);
        }
        saveShortcuts(shortcuts);
        saveHidden(hidden);
        return { ok: true, message: t('commandTerminalRestoreDefaultOk') };
    }

    function runCommandTerminalAction(input, action) {
        commandTerminalPendingAction = null;
        commandTerminalCommittedInput = input;
        renderCommandTerminalResult(input, action());
        clearCommandTerminalInput();
        return true;
    }

    function commandTerminalPendingMessage(value) {
        if (!commandTerminalPendingAction) return null;
        if (commandTerminalPendingAction.type === 'delete-all') {
            return { pending: true, message: formatText('commandTerminalConfirmDeleteAll', { scope: scopeLabel(currentScopeName()) }) };
        }
        var target = shortcutById(commandTerminalPendingAction.targetId);
        if (!target) return { ok: false, message: t('commandTerminalTargetMissing') };
        if (commandTerminalPendingAction.type === 'delete') {
            return { pending: true, message: formatText('commandTerminalConfirmDeleteNamed', { name: target.name }) };
        }
        if (commandTerminalPendingAction.type === 'edit') {
            return {
                pending: true,
                message: value ?
                    formatText('commandTerminalPromptUpdateNamed', { name: target.name, value: value }) :
                    formatText('commandTerminalPromptEditNamed', { name: target.name })
            };
        }
        return null;
    }

    function handleCommandTerminalPendingInput(input) {
        if (!commandTerminalPendingAction) return false;
        var command = commandTerminalPendingAction.command;
        if (commandTerminalPendingAction.type === 'delete-all') {
            if (/^(cancel|c|no|n)$/i.test(input)) {
                commandTerminalPendingAction = null;
                commandTerminalCommittedInput = command;
                renderCommandTerminalResult(command, { ok: true, message: t('commandTerminalCanceled') });
                clearCommandTerminalInput();
                return true;
            }
            if (!input || /^(yes|y)$/i.test(input)) {
                commandTerminalPendingAction = null;
                commandTerminalCommittedInput = command;
                renderCommandTerminalResult(command, clearShortcutsFromCommandTerminal(true));
                clearCommandTerminalInput();
                return true;
            }
            commandTerminalResult = commandTerminalPendingMessage('');
            renderCommandTerminal(command, true, commandTerminalResult);
            clearCommandTerminalInput();
            return true;
        }
        var target = shortcutById(commandTerminalPendingAction.targetId);
        if (!target) {
            commandTerminalPendingAction = null;
            commandTerminalCommittedInput = command;
            renderCommandTerminalResult(command, { ok: false, message: t('commandTerminalTargetMissing') });
            clearCommandTerminalInput();
            return true;
        }
        if (/^(cancel|c|no|n)$/i.test(input)) {
            commandTerminalPendingAction = null;
            commandTerminalCommittedInput = command;
            renderCommandTerminalResult(command, { ok: true, message: t('commandTerminalCanceled') });
            clearCommandTerminalInput();
            return true;
        }
        if (commandTerminalPendingAction.type === 'delete') {
            if (!input || /^(yes|y)$/i.test(input)) {
                commandTerminalPendingAction = null;
                commandTerminalCommittedInput = command;
                renderCommandTerminalResult(command, deleteCommandTerminalTarget(target));
                clearCommandTerminalInput();
                return true;
            }
            commandTerminalResult = { pending: true, message: formatText('commandTerminalConfirmDeletingNamed', { name: target.name }) };
            renderCommandTerminal(command, true, commandTerminalResult);
            clearCommandTerminalInput();
            return true;
        }
        if (commandTerminalPendingAction.type === 'edit') {
            if (!input) {
                commandTerminalResult = commandTerminalPendingMessage('');
                renderCommandTerminal(command, true, commandTerminalResult);
                return true;
            }
            commandTerminalPendingAction = null;
            commandTerminalCommittedInput = command;
            renderCommandTerminalResult(command, editCommandTerminalTarget(target, input));
            clearCommandTerminalInput();
            return true;
        }
        return false;
    }

    function handleCommandTerminalInputEnter() {
        var input = cpSearchInput.value.trim();
        if (commandTerminalPendingAction && handleCommandTerminalPendingInput(input)) return true;
        var state = commandTerminalInputState(input);
        if (!input) {
            if (commandTerminalCommittedInput) {
                var previousState = commandTerminalInputState(commandTerminalCommittedInput);
                var previousSelected = selectedCommandTerminalShortcut(commandTerminalCandidates(previousState));
                if (previousSelected) handleShortcutClick(previousSelected.id);
                return true;
            }
            commandTerminalCommittedInput = '';
            commandTerminalResult = null;
            renderCommandTerminal('', true, null);
            return true;
        }

        if ((state.type === 'search' || state.type === 'ls' || state.type === 'recent') && commandTerminalCommittedInput === input) {
            var selected = selectedCommandTerminalShortcut(commandTerminalCandidates(state));
            if (selected) handleShortcutClick(selected.id);
            return true;
        }

        if (state.type === 'open') {
            var target = selectedCommandTerminalShortcut(commandTerminalCandidates(state));
            if (target) {
                handleShortcutClick(target.id);
            } else {
                commandTerminalCommittedInput = input;
                renderCommandTerminalResult(input, { ok: false, message: formatText('commandTerminalNoShortcutMatches', { query: state.query || '' }) });
                clearCommandTerminalInput();
            }
            return true;
        }

        if (state.type === 'add') {
            commandTerminalCommittedInput = input;
            commandTerminalResult = addShortcutFromCommandTerminal(state.query, ++commandTerminalAsyncToken, input);
            renderCommandTerminal(input, true, commandTerminalResult);
            scheduleCommandTerminalReturn(commandTerminalResult);
            clearCommandTerminalInput();
            return true;
        }

        if (state.type === 'import') {
            commandTerminalCommittedInput = input;
            commandTerminalResult = importShortcutsFromCommandTerminal(input);
            renderCommandTerminal(input, true, commandTerminalResult);
            scheduleCommandTerminalReturn(commandTerminalResult);
            clearCommandTerminalInput();
            return true;
        }

        if (state.type === 'export') {
            commandTerminalCommittedInput = input;
            renderCommandTerminalResult(input, exportShortcutsFromCommandTerminal());
            clearCommandTerminalInput();
            return true;
        }

        if (state.type === 'clear-screen') {
            clearCommandTerminalInput();
            commandTerminalCommittedInput = '';
            commandTerminalResult = null;
            commandTerminalPendingAction = null;
            renderCommandTerminal('', true, null);
            scheduleCommandTerminalReturn({ ok: true, message: '' });
            return true;
        }

        if (state.type === 'delete-all') {
            commandTerminalPendingAction = { type: 'delete-all', command: input };
            commandTerminalCommittedInput = input;
            commandTerminalResult = commandTerminalPendingMessage('');
            renderCommandTerminal(input, true, commandTerminalResult);
            clearCommandTerminalInput();
            return true;
        }

        if (state.type === 'edit') {
            if (state.args.name || state.args.url) {
                return runCommandTerminalAction(input, function () { return editShortcutFromCommandTerminal(state); });
            }
            var editTarget = selectedCommandTerminalShortcut(commandTerminalCandidates(state));
            if (!editTarget) return runCommandTerminalAction(input, function () { return { ok: false, message: t('commandTerminalNoMatchEdit') }; });
            commandTerminalPendingAction = { type: 'edit', targetId: editTarget.id, command: input };
            commandTerminalCommittedInput = input;
            commandTerminalResult = commandTerminalPendingMessage('');
            renderCommandTerminal(input, true, commandTerminalResult);
            setCommandTerminalInput(editTarget.name, true);
            return true;
        }

        if (state.type === 'delete') {
            if (state.confirm) {
                return runCommandTerminalAction(input, function () { return deleteShortcutFromCommandTerminal(state); });
            }
            var deleteTarget = selectedCommandTerminalShortcut(commandTerminalCandidates(state));
            if (!deleteTarget) return runCommandTerminalAction(input, function () { return { ok: false, message: t('commandTerminalNoMatchDelete') }; });
            commandTerminalPendingAction = { type: 'delete', targetId: deleteTarget.id, command: input };
            commandTerminalCommittedInput = input;
            commandTerminalResult = commandTerminalPendingMessage('');
            renderCommandTerminal(input, true, commandTerminalResult);
            clearCommandTerminalInput();
            return true;
        }

        if (state.type === 'hide') {
            return runCommandTerminalAction(input, function () { return moveShortcutFromCommandTerminal(state, 'hidden'); });
        }

        if (state.type === 'unhide') {
            return runCommandTerminalAction(input, function () { return moveShortcutFromCommandTerminal(state, 'normal'); });
        }

        if (state.type === 'reset') {
            return runCommandTerminalAction(input, resetStatsFromCommandTerminal);
        }

        if (state.type === 'restore') {
            return runCommandTerminalAction(input, restoreDefaultsFromCommandTerminal);
        }

        commandTerminalCommittedInput = input;
        commandTerminalResult = null;
        renderCommandTerminal(input, true, null);
        clearCommandTerminalInput();
        return true;
    }

    function buildGridIconHTML(s, iconData, actionClass) {
        var isLetter = !iconData || iconData.indexOf('LETTER:') === 0;
        var letter = isLetter ? (iconData ? iconData.replace('LETTER:', '') : s.name[0].toUpperCase()) : s.name[0].toUpperCase();
        var inner = !isLetter ? '<img src="' + iconData + '">' : letter;
        var action = actionClass ? '<button class="' + actionClass + '" data-id="' + escapeHTML(s.id) + '"></button>' : '';
        return '<div class="cp-grid-item has-label" data-id="' + escapeHTML(s.id) + '">' +
            '<div class="cp-grid-item-icon-wrap">' +
            '<div class="cp-grid-item-icon" data-letter="' + letter + '" data-letter-color="' + letterColor(letter) + '">' + inner + '</div>' +
            action +
            '</div>' +
            '<div class="cp-grid-item-label">' + escapeHTML(s.name) + '</div>' +
            '</div>';
    }

    function buildItemHTML(s, iconData, extraClass, actionClass) {
        extraClass = extraClass || '';
        var isLetter = !iconData || iconData.indexOf('LETTER:') === 0;
        var letter = isLetter ? (iconData ? iconData.replace('LETTER:', '') : s.name[0].toUpperCase()) : s.name[0].toUpperCase();
        var inner = !isLetter ? '<img src="' + iconData + '">' : letter;
        var action = actionClass ? '<button class="' + actionClass + '" data-id="' + escapeHTML(s.id) + '"></button>' : '';
        return '<div class="cp-item' + (extraClass ? ' ' + extraClass : '') + '" data-id="' + escapeHTML(s.id) + '">' +
            '<div class="cp-item-icon" data-letter="' + letter + '" data-letter-color="' + letterColor(letter) + '">' + inner + '</div>' +
            '<span class="cp-item-name">' + escapeHTML(s.name) + '</span>' +
            '<span class="cp-item-url">' + escapeHTML(s.url.replace(/^https?:\/\//, '')) + '</span>' +
            action +
            '</div>';
    }

    function applyIconStyles(container) {
        var icons = container.querySelectorAll('.cp-item-icon, .cp-grid-item-icon, .cp-feedback-icon');
        icons.forEach(function (el) {
            if (!el.querySelector('img, .cp-icon-inner')) {
                var inner = document.createElement('span');
                inner.className = 'cp-icon-inner';
                inner.style.background = el.getAttribute('data-letter-color');
                inner.textContent = el.getAttribute('data-letter');
                el.textContent = '';
                el.appendChild(inner);
            }
        });
        var imgs = container.querySelectorAll('.cp-item-icon img, .cp-grid-item-icon img, .cp-feedback-icon img');
        imgs.forEach(function (img) {
            var fallback = function () {
                var p = img.parentElement;
                img.remove();
                var inner = document.createElement('span');
                inner.className = 'cp-icon-inner';
                inner.style.background = p.getAttribute('data-letter-color');
                inner.textContent = p.getAttribute('data-letter');
                p.appendChild(inner);
            };
            img.addEventListener('error', fallback, { once: true });
            img.addEventListener('load', function () {
                if (isDDGPlaceholder(this)) fallback();
            }, { once: true });
        });
    }

    function applyMarqueeLabels(container) {
        requestAnimationFrame(function () {
            var labels = container.querySelectorAll('.cp-item-name, .cp-grid-item-label');
            labels.forEach(function (el) {
                if (el.scrollWidth > el.clientWidth) {
                    var text = el.textContent;
                    el.innerHTML = '<span>' + text + '</span><span>' + text + '</span>';
                    el.classList.add('marquee');
                }
            });
        });
    }

    function slideInContent(fromLeft) {
        cpContent.style.transition = 'none';
        cpContent.style.transform = 'translateX(' + (fromLeft ? '-16px' : '16px') + ')';
        cpContent.style.opacity = '0';
        cpContent.offsetHeight;
        cpContent.style.transition = 'transform 0.16s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.14s ease-out';
        cpContent.style.transform = 'translateX(0)';
        cpContent.style.opacity = '1';
    }

    function setFeedbackContentMode(active) {
        cpContent.classList.toggle('feedback-mode', active);
        if (active) cpContent.classList.remove('icon-page-mode');
        if (active) cpContent.scrollTop = 0;
    }

    function setIconPageMode(active) {
        cpContent.classList.toggle('icon-page-mode', !!active);
        if (active) cpContent.scrollTop = 0;
    }

    function renderForm(mode, item) {
        var isEdit = mode === 'edit';
        setFeedbackContentMode(false);
        setIconPageMode(false);
        cpContent.innerHTML = '<div class="cp-form">' +
            '<span class="cp-form-label">' + (isEdit ? t('editShortcut') : t('addShortcut')) + '</span>' +
            '<input class="cp-form-input" id="cpFormName" placeholder="' + t('shortcutName') + '" value="' + (item ? escapeHTML(item.name) : '') + '" autocomplete="off">' +
            '<div class="cp-form-url-row">' +
            '<input class="cp-form-input" id="cpFormURL" placeholder="' + t('shortcutURL') + '" value="' + (item ? escapeHTML(item.url) : '') + '" autocomplete="off">' +
            '<button class="cp-form-fetch-btn" id="cpFormFetchBtn" title="' + t('fetchTitle') + '">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' +
            '</button>' +
            '</div>' +
            '<div class="cp-form-error" id="cpFormError"></div>' +
            '<button class="cp-form-submit" id="cpFormSubmit">' + (isEdit ? t('save') : t('add')) + '</button>' +
            '</div>';

        document.getElementById('cpFormSubmit').addEventListener('click', function () {
            if (isEdit) handleEditSubmit(item.id);
            else handleAddSubmit();
        });
        document.getElementById('cpFormName').addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('cpFormURL').focus();
            }
        });
        document.getElementById('cpFormURL').addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (isEdit) handleEditSubmit(item.id);
                else handleAddSubmit();
            }
        });
        document.getElementById('cpFormFetchBtn').addEventListener('click', function () {
            handleFetchTitle();
        });
        setTimeout(function () { document.getElementById('cpFormURL').focus(); }, 50);
    }

    function gridConfig(mode) {
        if (mode === 'delete') {
            return {
                title: t('deleteShortcut'),
                empty: t('noShortcuts'),
                gridAction: 'cp-grid-item-del',
                itemAction: 'cp-item-del',
                actionSelector: '.cp-grid-item-del, .cp-item-del',
                action: handleDeleteClick
            };
        }
        if (mode === 'hide') {
            return {
                title: t('hideShortcutTitle'),
                empty: t('noShortcuts'),
                gridAction: 'cp-grid-item-del cp-hide-btn',
                itemAction: 'cp-item-del cp-hide-btn',
                actionSelector: '.cp-hide-btn',
                action: hideShortcut
            };
        }
        if (mode === 'unhide') {
            return {
                title: t('hiddenShortcuts'),
                empty: t('noHiddenShortcuts'),
                gridAction: 'cp-grid-item-del unhide cp-unhide-btn',
                itemAction: 'cp-item-del cp-unhide-btn unhide',
                actionSelector: '.cp-unhide-btn',
                action: unhideShortcut
            };
        }
        return {
            title: t('editShortcut'),
            empty: t('noShortcuts'),
            gridAction: '',
            itemAction: '',
            actionSelector: '',
            action: handleEditClick
        };
    }

    function gridTitle(config, page, totalPages, start, end, total) {
        if (cpViewMode !== 'icon') return config.title + ' (' + total + ')';
        if (total <= 0) return config.title + ' (0)';
        return config.title + ' (' + start + '-' + end + ' / ' + total + ')' + (totalPages > 1 ? ' ' + page + '/' + totalPages : '');
    }

    function gridClass(totalPages, pageSize) {
        return 'cp-grid' + (totalPages > 1 ? ' cp-grid-paged-' + pageSize : '');
    }

    function renderGrid(mode, page) {
        setFeedbackContentMode(false);
        setIconPageMode(cpViewMode === 'icon');
        var config = gridConfig(mode);
        var shortcuts = shortcutsForGridMode(mode);
        var icons = loadIcons();
        var totalPages = 1;
        var items = shortcuts;
        var start = 0;
        var sectionTitle;

        if (cpViewMode === 'icon') {
            totalPages = Math.max(1, Math.ceil(shortcuts.length / cpItemsPerPage));
            if (page > totalPages) page = totalPages;
            if (page < 1) page = 1;
            cpCurrentPage = page;
            start = (page - 1) * cpItemsPerPage;
            items = shortcuts.slice(start, start + cpItemsPerPage);
            sectionTitle = gridTitle(config, page, totalPages, start + 1, Math.min(start + cpItemsPerPage, shortcuts.length), shortcuts.length);
        } else {
            cpCurrentPage = 1;
            sectionTitle = gridTitle(config, 1, 1, 1, shortcuts.length, shortcuts.length);
        }

        var html = '<div class="cp-section-title">' + sectionTitle + '</div>';

        if (!items.length) {
            html += '<div class="cp-empty">' + config.empty + '</div>';
        } else if (cpViewMode === 'icon') {
            html += '<div class="' + gridClass(totalPages, cpItemsPerPage) + '">';
            items.forEach(function (s) { html += buildGridIconHTML(s, icons[s.id], config.gridAction); });
            html += '</div>';
        } else {
            items.forEach(function (s) {
                html += buildItemHTML(s, icons[s.id], '', config.itemAction);
            });
        }

        if (cpViewMode === 'icon' && totalPages > 1) {
            html += renderPaginationHTML(cpCurrentPage, totalPages);
        }

        cpContent.innerHTML = html;
        applyIconStyles(cpContent);
        applyMarqueeLabels(cpContent);
        resetSelection();

        if (config.actionSelector) {
            cpContent.querySelectorAll(config.actionSelector).forEach(function (btn) {
                btn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    config.action(btn.dataset.id);
                });
            });
        }

        if (mode === 'edit') {
            var targets = cpContent.querySelectorAll('.cp-grid-item:not(.empty), .cp-item');
            targets.forEach(function (el) {
                el.addEventListener('click', function (e) {
                    if (e.target.closest('.cp-grid-item-del, .cp-item-del')) return;
                    handleEditClick(el.dataset.id);
                });
            });
        }
    }

    function renderPaginationHTML(current, total) {
        var html = '<div class="cp-pagination">';
        for (var i = 1; i <= total; i++) {
            html += '<div class="cp-pagination-dot' + (i === current ? ' active' : '') + '" data-page="' + i + '"></div>';
        }
        html += '</div>';
        return html;
    }

    function gridModeForCurrentMode() {
        var modeMap = { deleteGrid: 'delete', editGrid: 'edit', hideGrid: 'hide', unhideGrid: 'unhide' };
        return modeMap[cpCurrentMode] || null;
    }

    function renderCurrentView() {
        if (cpCurrentMode === 'recent') renderRecentList();
        else if (cpCurrentMode === 'deleteGrid') renderGrid('delete', cpCurrentPage);
        else if (cpCurrentMode === 'editGrid') renderGrid('edit', cpCurrentPage);
        else if (cpCurrentMode === 'hideGrid') renderGrid('hide', cpCurrentPage);
        else if (cpCurrentMode === 'unhideGrid') renderGrid('unhide', cpCurrentPage);
        else if (cpCurrentMode === 'commandSuggestions') renderCommandSuggestions(cpSearchTerm);
        else renderShortcutList(cpSearchTerm || '');
    }

    function goHome() {
        cpCurrentMode = 'list';
        cpSearchInput.value = '';
        cpSearchTerm = '';
        cpCurrentPage = 1;
        renderShortcutList('');
        resetSelection();
        requestAnimationFrame(function () { cpSearchInput.focus(); });
    }

    function renderFeedback(name, iconData) {
        var letter = name[0].toUpperCase();
        var isLetter = !iconData || iconData.indexOf('LETTER:') === 0;
        var inner = !isLetter ? '<img src="' + iconData + '">' : letter;
        setFeedbackContentMode(true);
        cpContent.innerHTML = '<div class="cp-feedback">' +
            '<div class="cp-feedback-icon" data-letter="' + letter + '" data-letter-color="' + letterColor(letter) + '">' + inner + '</div>' +
            '<span class="cp-feedback-text">' + escapeHTML(name) + ' ' + t('added') + '</span>' +
            '</div>';
        applyIconStyles(cpContent);
    }

    function scheduleFeedbackReturn() {
        setTimeout(function () {
            if (cpCurrentMode !== 'feedback') return;
            cpCurrentMode = 'list';
            renderShortcutList('');
            cpSearchInput.value = '';
            cpSearchTerm = '';
            cpSearchInput.focus();
        }, 2000);
    }

    function showFeedbackWithFavicon(name, favUrl, letterFallback, shortcutId) {
        var letter = name[0].toUpperCase();
        renderFeedback(name, letterFallback);
        scheduleFeedbackReturn();

        var img = new Image();
        img.onload = function () {
            if (isDDGPlaceholder(this)) return;
            var icons = loadIcons();
            icons[shortcutId] = favUrl;
            saveIcons(icons);
            var fbIcon = document.querySelector('.cp-feedback-icon');
            if (fbIcon && cpCurrentMode === 'feedback') {
                fbIcon.innerHTML = '';
                var imgEl = document.createElement('img');
                imgEl.src = favUrl;
                imgEl.addEventListener('error', function () {
                    imgEl.remove();
                    var inner = document.createElement('span');
                    inner.className = 'cp-icon-inner';
                    inner.style.background = letterColor(letter);
                    inner.textContent = letter;
                    fbIcon.appendChild(inner);
                }, { once: true });
                fbIcon.appendChild(imgEl);
            }
        };
        img.onerror = function () { };
        img.src = favUrl;
    }

    function renderHelp() {
        setFeedbackContentMode(false);
        setIconPageMode(false);
        var helpItems = [
            { cmd: '/add', desc: t('helpAdd') },
            { cmd: '/edit', desc: t('helpEdit') },
            { cmd: '/delete', desc: t('helpDelete') },
            { cmd: '/recent', desc: t('helpRecent') },
            { cmd: isHiddenMode ? '/unhide' : '/hide', desc: t(isHiddenMode ? 'helpUnhide' : 'helpHide') },
            { cmd: '/reset', desc: t('helpReset') },
            { cmd: '/import', desc: t('helpImport') },
            { cmd: '/export', desc: t('helpExport') },
            { cmd: '/clear', desc: t('helpClear') },
            { cmd: '/restore', desc: commandDescription('restore') }
        ];
        var html = '<div class="cp-section-title">' + t('commands') + '</div><div class="cp-help-list">';
        helpItems.forEach(function (h) {
            html += '<div class="cp-help-item"><span class="cp-help-cmd">' + h.cmd + '</span><span class="cp-help-desc">' + h.desc + '</span></div>';
        });
        html += '</div>';
        cpContent.innerHTML = html;
    }

    function commandDescription(cmd) {
        var map = {
            add: 'helpAdd',
            edit: 'helpEdit',
            delete: 'helpDelete',
            hide: 'helpHide',
            unhide: 'helpUnhide',
            recent: 'helpRecent',
            reset: 'helpReset',
            import: 'helpImport',
            export: 'helpExport',
            clear: 'helpClear',
            restore: 'helpRestore'
        };
        if (cmd === 'help') return t('commands');
        var key = map[cmd] || 'commands';
        var desc = t(key);
        return desc || key;
    }

    function renderCommandSuggestions(query) {
        setFeedbackContentMode(false);
        setIconPageMode(false);
        query = String(query || '').replace(/^\//, '').toLowerCase();
        var commands = (isHiddenMode ? CP_COMMANDS_HIDDEN : CP_COMMANDS_NORMAL).filter(function (cmd) {
            return !query || cmd.indexOf(query) === 0;
        });
        var html = '<div class="cp-section-title">' + t('commands') + '</div><div class="cp-help-list cp-command-list">';
        if (!commands.length) {
            html += '<div class="cp-empty">' + t('noResults') + '</div>';
        } else {
            commands.forEach(function (cmd) {
                html += '<button class="cp-help-item cp-command-option" data-command="' + cmd + '">' +
                    '<span class="cp-help-cmd">/' + cmd + '</span><span class="cp-help-desc">' + commandDescription(cmd) + '</span></button>';
            });
        }
        html += '</div>';
        cpCurrentMode = 'commandSuggestions';
        cpContent.innerHTML = html;
        resetSelection();
    }

    function renderRecentList() {
        setFeedbackContentMode(false);
        setIconPageMode(cpViewMode === 'icon');
        var allShortcuts = loadShortcuts();
        var hidden = loadHidden();
        var icons = loadIcons();
        var recents = loadRecents();
        var html = '<div class="cp-section-title">' + t('recentShortcuts') + '</div>';
        var items = [];
        recents.forEach(function (rid) {
            var s = allShortcuts.find(function (sc) { return sc.id === rid; });
            if (!s) return;
            if (shortcutIsHidden(s, hidden) === isHiddenMode) items.push(s);
        });
        if (!items.length) {
            html += '<div class="cp-empty">' + t('noRecentShortcuts') + '</div>';
        } else if (cpViewMode === 'icon') {
            html += '<div class="cp-grid">';
            items.forEach(function (s) { html += buildGridIconHTML(s, icons[s.id]); });
            html += '</div>';
        } else {
            items.forEach(function (s) { html += buildItemHTML(s, icons[s.id]); });
        }
        cpContent.innerHTML = html;
        applyIconStyles(cpContent);
        applyMarqueeLabels(cpContent);
        resetSelection();
    }

    // ================================================================
    // 交互控制
    // ================================================================

    function showPaletteHint(msg) {
        setFeedbackContentMode(false);
        setIconPageMode(false);
        cpContent.innerHTML = '<div class="cp-hint">' + escapeHTML(msg) + '</div>';
        setTimeout(function () { cpContent.textContent = ''; }, 2000);
    }

    function refreshShortcutSettings() {
        var settings = loadShortcutSettings();
        cpViewMode = settings.viewMode || 'list';
        cpCommandsCollapsed = settings.commandsCollapsed !== false;
        cpPlacement = settings.palettePlacement === 'fixed' ? 'fixed' : 'follow';
        cpSkin = settings.paletteSkin === 'terminal' || settings.paletteSkin === 'shell' || settings.paletteSkin === 'command-terminal' ? settings.paletteSkin : 'default';
        syncPaletteSkin();
    }

    function normalizeAnchor(anchor) {
        if (!anchor || typeof anchor.x !== 'number' || typeof anchor.y !== 'number') return null;
        return {
            x: Math.max(0, Math.min(window.innerWidth, anchor.x)),
            y: Math.max(0, Math.min(window.innerHeight, anchor.y))
        };
    }

    function resetPalettePosition() {
        cmdOverlay.style.alignItems = '';
        cmdOverlay.style.justifyContent = '';
        cmdOverlay.style.paddingTop = '';
        cmdPalette.style.margin = '';
        cmdPalette.style.position = '';
        cmdPalette.style.left = '';
        cmdPalette.style.top = '';
        cmdPalette.style.right = '';
        cmdPalette.style.bottom = '';
    }

    function clampPalettePosition(x, y) {
        var rect = cmdPalette.getBoundingClientRect();
        var width = rect.width || Math.min(700, window.innerWidth * 0.94);
        var height = rect.height || Math.min(420, window.innerHeight * 0.64);
        var margin = 10;
        var maxX = Math.max(margin, window.innerWidth - width - margin);
        var maxY = Math.max(margin, window.innerHeight - height - margin);
        return {
            x: Math.max(margin, Math.min(maxX, x)),
            y: Math.max(margin, Math.min(maxY, y))
        };
    }

    function applyPalettePosition(x, y) {
        cmdOverlay.style.alignItems = 'flex-start';
        cmdOverlay.style.justifyContent = 'flex-start';
        cmdOverlay.style.paddingTop = '0';
        cmdPalette.style.position = 'absolute';
        cmdPalette.style.margin = '0';
        cmdPalette.style.right = '';
        cmdPalette.style.bottom = '';
        var position = clampPalettePosition(x, y);
        cmdPalette.style.left = Math.round(position.x) + 'px';
        cmdPalette.style.top = Math.round(position.y) + 'px';
        return position;
    }

    function paletteCanResize() {
        return cpSkin === 'command-terminal';
    }

    function shellPaletteSizeLimits() {
        var maxWidth = Math.max(280, window.innerWidth - 20);
        var maxHeight = Math.max(260, window.innerHeight - 20);
        return {
            minWidth: Math.min(560, maxWidth),
            minHeight: Math.min(340, maxHeight),
            maxWidth: maxWidth,
            maxHeight: maxHeight
        };
    }

    function clampShellPaletteSize(width, height) {
        var limits = shellPaletteSizeLimits();
        return {
            width: Math.max(limits.minWidth, Math.min(limits.maxWidth, width)),
            height: Math.max(limits.minHeight, Math.min(limits.maxHeight, height))
        };
    }

    function applyShellPaletteSize() {
        if (!paletteCanResize()) {
            cmdPalette.style.width = '';
            cmdPalette.style.height = '';
            return;
        }
        if (!cpShellSize) {
            cmdPalette.style.width = '';
            cmdPalette.style.height = '';
            return;
        }
        cpShellSize = clampShellPaletteSize(cpShellSize.width, cpShellSize.height);
        cmdPalette.style.width = Math.round(cpShellSize.width) + 'px';
        cmdPalette.style.height = Math.round(cpShellSize.height) + 'px';
        if (isPaletteOpen && cmdPalette.style.position === 'absolute') {
            var rect = cmdPalette.getBoundingClientRect();
            applyPalettePosition(rect.left, rect.top);
        }
    }

    function positionPalette(anchor) {
        resetPalettePosition();
        var savedPosition = loadPalettePosition();
        if (cpPlacement === 'fixed' && savedPosition) {
            applyPalettePosition(savedPosition.x, savedPosition.y);
            return;
        }
        if (cpPlacement !== 'follow') return;

        anchor = normalizeAnchor(anchor || cpLastAnchor);
        if (!anchor) {
            anchor = { x: window.innerWidth / 2, y: Math.min(window.innerHeight * 0.34, 260) };
        }
        cpLastAnchor = anchor;

        var rect = cmdPalette.getBoundingClientRect();
        var width = rect.width || Math.min(700, window.innerWidth * 0.94);
        var height = rect.height || Math.min(420, window.innerHeight * 0.64);
        var margin = 14;
        var x = anchor.x - width / 2;
        var y = anchor.y - Math.min(78, height * 0.22);
        x = Math.max(margin, Math.min(window.innerWidth - width - margin, x));
        y = Math.max(margin, Math.min(window.innerHeight - height - margin, y));
        applyPalettePosition(x, y);
    }

    function shouldStartPaletteDrag(e) {
        if (e.button !== 0 || !isPaletteOpen) return false;
        if (cpShellResizeState) return false;
        var target = e.target;
        if (!target || target.closest('input, textarea, button, a, select, [contenteditable="true"], .cp-content, .cp-pinned-btn, .cp-mode-chip')) return false;
        if (target.closest('.cp-pinned-bar')) return true;
        var rect = cmdPalette.getBoundingClientRect();
        var topHandle = cpSkin === 'command-terminal' ? 34 : 18;
        return e.clientY - rect.top <= topHandle;
    }

    function startPaletteDrag(e) {
        if (!shouldStartPaletteDrag(e)) return;
        var rect = cmdPalette.getBoundingClientRect();
        var startPosition = applyPalettePosition(rect.left, rect.top);
        cpDragState = {
            pointerId: e.pointerId,
            offsetX: e.clientX - startPosition.x,
            offsetY: e.clientY - startPosition.y
        };
        cmdPalette.classList.add('dragging');
        cmdPalette.setPointerCapture(e.pointerId);
        e.preventDefault();
    }

    function movePaletteDrag(e) {
        if (!cpDragState || e.pointerId !== cpDragState.pointerId) return;
        var position = applyPalettePosition(e.clientX - cpDragState.offsetX, e.clientY - cpDragState.offsetY);
        cpDragState.lastPosition = position;
    }

    function endPaletteDrag(e) {
        if (!cpDragState || e.pointerId !== cpDragState.pointerId) return;
        var position = cpDragState.lastPosition;
        if (!position) {
            var rect = cmdPalette.getBoundingClientRect();
            position = clampPalettePosition(rect.left, rect.top);
        }
        savePalettePosition(position);
        cmdPalette.classList.remove('dragging');
        try { cmdPalette.releasePointerCapture(e.pointerId); } catch (err) { }
        cpDragState = null;
    }

    function ensureShellResizeHandle() {
        if (cmdPalette.querySelector('.cp-shell-resize-handle')) return;
        var handle = document.createElement('span');
        handle.className = 'cp-shell-resize-handle';
        handle.setAttribute('aria-hidden', 'true');
        handle.title = 'Resize command terminal';
        handle.addEventListener('pointerdown', startShellPaletteResize);
        cmdPalette.appendChild(handle);
    }

    function shouldStartShellPaletteResize(e) {
        if (!paletteCanResize() || e.button !== 0 || !isPaletteOpen) return false;
        var target = e.target;
        if (target && target.closest && target.closest('.cp-shell-resize-handle')) return true;
        var rect = cmdPalette.getBoundingClientRect();
        return rect.right - e.clientX <= 38 && rect.bottom - e.clientY <= 38;
    }

    function startShellPaletteResize(e) {
        if (!shouldStartShellPaletteResize(e)) return;
        var rect = cmdPalette.getBoundingClientRect();
        cpShellResizeState = {
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            startWidth: rect.width,
            startHeight: rect.height
        };
        cmdPalette.classList.add('shell-resizing');
        cmdPalette.setPointerCapture(e.pointerId);
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    }

    function moveShellPaletteResize(e) {
        if (!cpShellResizeState || e.pointerId !== cpShellResizeState.pointerId) return;
        cpShellSize = clampShellPaletteSize(
            cpShellResizeState.startWidth + e.clientX - cpShellResizeState.startX,
            cpShellResizeState.startHeight + e.clientY - cpShellResizeState.startY
        );
        applyShellPaletteSize();
        e.preventDefault();
    }

    function endShellPaletteResize(e) {
        if (!cpShellResizeState || e.pointerId !== cpShellResizeState.pointerId) return;
        moveShellPaletteResize(e);
        cmdPalette.classList.remove('shell-resizing');
        try { cmdPalette.releasePointerCapture(e.pointerId); } catch (err) { }
        cpShellResizeState = null;
        e.preventDefault();
    }

    function animatePaletteOpen() {
        var token = ++paletteOpenFrame;
        cmdOverlay.classList.add('preparing');
        requestAnimationFrame(function () {
            if (!isPaletteOpen || token !== paletteOpenFrame) return;
            cmdOverlay.classList.add('active');
            cmdOverlay.classList.remove('preparing');
            requestAnimationFrame(function () {
                if (isPaletteOpen && token === paletteOpenFrame) cpSearchInput.focus();
            });
        });
    }

    function openPaletteMode(hiddenMode, anchor) {
        if (isPaletteOpen && isHiddenMode !== hiddenMode) {
            showPaletteHint(t(hiddenMode ? 'normalModeHint' : 'hiddenModeHint'));
            return;
        }
        if (isPaletteOpen) return;
        isPaletteOpen = true;
        isHiddenMode = hiddenMode;
        refreshShortcutSettings();
        cmdPalette.classList.toggle('hidden-mode', hiddenMode);
        syncPaletteSkin();
        cmdPalette.setAttribute('aria-label', hiddenMode ? 'Hidden command palette' : 'Command palette');
        renderPinnedBar();
        cpSearchInput.value = '';
        cpSearchTerm = '';
        cancelCommandTerminalReturn();
        commandTerminalCommittedInput = '';
        commandTerminalResult = null;
        commandTerminalPendingAction = null;
        commandTerminalAsyncToken++;
        cpCurrentMode = 'list';
        cpCurrentPage = 1;
        cpKeyIndex = 0;
        renderShortcutList('');
        positionPalette(anchor);
        animatePaletteOpen();
    }

    function openPalette(anchor) {
        openPaletteMode(false, anchor);
    }

    function openHiddenPalette(anchor) {
        openPaletteMode(true, anchor);
    }

    function closePalette() {
        if (!isPaletteOpen) return;
        isPaletteOpen = false;
        isHiddenMode = false;
        paletteOpenFrame++;
        cmdOverlay.classList.remove('active', 'preparing');
        cpSearchTerm = '';
        cancelCommandTerminalReturn();
        commandTerminalCommittedInput = '';
        commandTerminalResult = null;
        commandTerminalPendingAction = null;
        commandTerminalAsyncToken++;
        cpKeyIndex = 0;
        cpCurrentPage = 1;
        cpCurrentMode = 'list';
        cpEditTarget = null;
        cpDragState = null;
        cpShellResizeState = null;
        cmdPalette.classList.remove('dragging');
        cmdPalette.classList.remove('shell-resizing');
        cmdPalette.classList.remove('hidden-mode');
        resetPalettePosition();
    }

    function handleSearchInput(e) {
        var val = cpSearchInput.value.trim();
        cpSearchTerm = val;

        if (cpSkin === 'command-terminal') {
            cancelCommandTerminalReturn();
            cpCurrentMode = 'list';
            cpCurrentPage = 1;
            commandTerminalAsyncToken++;
            if (commandTerminalPendingAction) {
                commandTerminalResult = commandTerminalPendingMessage(val);
                renderCommandTerminal(commandTerminalPendingAction.command, true, commandTerminalResult);
            } else {
                commandTerminalResult = null;
                renderCommandTerminal(val, commandTerminalCommittedInput === val && !!val, null);
            }
            return;
        }

        if (val.indexOf('/') === 0) {
            var parts = val.split(/\s+/);
            var cmd = parts[0].toLowerCase();
            if (cmd === '/') { renderCommandSuggestions(''); return; }
            if (cmd === '/add') { handleCommand('add'); return; }
            if (cmd === '/edit') { handleCommand('edit'); return; }
            if (cmd === '/delete') { handleCommand('delete'); return; }
            if (cmd === '/help') { handleCommand('help'); return; }
            if (cmd === '/recent') { handleCommand('recent'); return; }
            if (cmd === '/hide' && !isHiddenMode) { handleCommand('hide'); return; }
            if (cmd === '/unhide' && isHiddenMode) { handleCommand('unhide'); return; }
            if (cmd === '/import') { handleCommand('import'); return; }
            if (cmd === '/export') { handleCommand('export'); return; }
            if (cmd === '/reset') { handleCommand('reset'); return; }
            if (cmd === '/clear') { handleCommand('clear'); return; }
            if (cmd === '/restore') { handleCommand('restore'); return; }
            renderCommandSuggestions(cmd);
            return;
        }

        cpCurrentMode = 'list';
        cpCurrentPage = 1;
        renderShortcutList(val);
    }

    function shellNativeCommand(input) {
        var value = String(input || '').trim().toLowerCase();
        var commands = isHiddenMode ? CP_COMMANDS_HIDDEN : CP_COMMANDS_NORMAL;
        if (value === 'h') return 'help';
        return commands.indexOf(value) !== -1 ? value : '';
    }

    function selectedShellShortcut(candidates) {
        var selected = cpContent.querySelector('.cp-shell-entry.key-hover');
        if (selected && selected.dataset.id) {
            for (var i = 0; i < candidates.length; i++) {
                if (candidates[i].id === selected.dataset.id) return candidates[i];
            }
        }
        return candidates[0] || null;
    }

    function completeShellInput() {
        var state = shellInputState(cpSearchInput.value);
        if (state.type !== 'open' && state.type !== 'shortcut') return false;
        var candidates = shellShortcutCandidates(state);
        var target = selectedShellShortcut(candidates);
        if (!target) return false;
        cpSearchInput.value = 'open ' + target.name;
        cpSearchTerm = cpSearchInput.value;
        renderShortcutList(cpSearchInput.value);
        cpSearchInput.setSelectionRange(cpSearchInput.value.length, cpSearchInput.value.length);
        return true;
    }

    function addShortcutFromShell(urlValue) {
        var url = normalizeHttpsUrl(urlValue);
        if (!url) {
            cpCurrentMode = 'feedback';
            feedbackMessage(invalidUrlMessage(urlValue, 'commandAddInvalidUrl'));
            return true;
        }
        var shortcuts = loadShortcuts();
        if (shortcuts.some(function (s) { return s.url.toLowerCase() === url.toLowerCase(); })) {
            cpCurrentMode = 'feedback';
            feedbackMessage(t('commandDuplicateUrl'));
            return true;
        }
        var name = smartUrlName(url);
        var id = generateId();
        shortcuts.push({ id: id, name: name, url: url, freq: 0, added: Date.now() });
        saveShortcuts(shortcuts);
        if (isHiddenMode) {
            var hidden = loadHidden();
            hidden.push(id);
            saveHidden(hidden);
        }
        var icons = loadIcons();
        var favUrl = getFaviconUrl(url);
        var letterFallback = 'LETTER:' + name[0].toUpperCase();
        icons[id] = letterFallback;
        saveIcons(icons);
        cpCurrentMode = 'feedback';
        if (favUrl) {
            showFeedbackWithFavicon(name, favUrl, letterFallback, id);
        } else {
            renderFeedback(name, letterFallback);
            scheduleFeedbackReturn();
        }
        return true;
    }

    function handleShellInputEnter() {
        var input = cpSearchInput.value.trim();
        if (!input) return false;
        var state = shellInputState(input);
        if (state.type === 'ls' || state.type === 'help') return true;
        var nativeCommand = shellNativeCommand(input);
        if (nativeCommand) {
            handleCommand(nativeCommand);
            return true;
        }
        if (state.type === 'add') return addShortcutFromShell(state.query);
        if (state.type === 'open' || state.type === 'shortcut') {
            var target = selectedShellShortcut(shellShortcutCandidates(state));
            if (target) handleShortcutClick(target.id);
            return true;
        }
        return false;
    }

    function handleCommand(cmd) {
        cpSearchInput.value = '';
        cpSearchTerm = '';
        cpCurrentPage = 1;
        cpKeyIndex = 0;

        if (cmd === 'add') {
            cpCurrentMode = 'add';
            renderForm('add', null);
        } else if (cmd === 'edit') {
            cpCurrentMode = 'editGrid';
            renderGrid('edit', 1);
        } else if (cmd === 'delete') {
            cpCurrentMode = 'deleteGrid';
            renderGrid('delete', 1);
        } else if (cmd === 'help') {
            cpCurrentMode = 'help';
            renderHelp();
        } else if (cmd === 'recent') {
            cpCurrentMode = 'recent';
            renderRecentList();
        } else if (cmd === 'hide') {
            cpCurrentMode = 'hideGrid';
            renderGrid('hide', 1);
        } else if (cmd === 'unhide') {
            cpCurrentMode = 'unhideGrid';
            renderGrid('unhide', 1);
        } else if (cmd === 'reset') {
            handleReset();
            cpCurrentMode = 'list';
        } else if (cmd === 'import') {
            handleImport();
        } else if (cmd === 'export') {
            handleExport();
        } else if (cmd === 'clear') {
            cpCurrentMode = 'clear';
            handleClear();
        } else if (cmd === 'restore') {
            handleRestore();
        } else if (cmd.indexOf('sort') === 0) {
            var mode = cmd.split(/\s+/)[1] || 'a-z';
            handleSort(mode);
        }
    }

    function fetchPageTitle(url, callback) {
        try {
            fetch(url, { method: 'GET', mode: 'cors' }).then(function (res) {
                if (!res.ok) { callback(null); return; }
                return res.text();
            }).then(function (html) {
                if (!html) { callback(null); return; }
                var m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
                var title = m ? m[1].trim() : null;
                callback(title);
            }).catch(function () { callback(null); });
        } catch (e) { callback(null); }
    }

    function fetchPageTitleInTempTab(url, callback) {
        var done = false;
        var tabId = null;
        var timer = null;

        function finish(title) {
            if (done) return;
            done = true;
            if (timer) clearTimeout(timer);
            try { chrome.tabs.onUpdated.removeListener(onUpdated); } catch (e) { }
            if (tabId !== null && chrome.tabs && chrome.tabs.remove) {
                try { chrome.tabs.remove(tabId, function () { }); } catch (e) { }
            }
            callback(title || null);
        }

        function readTitle() {
            if (tabId === null || !chrome.scripting || !chrome.scripting.executeScript) {
                finish(null);
                return;
            }
            var injection = chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: function () { return document.title || ''; }
            });
            Promise.resolve(injection).then(function (results) {
                var title = results && results[0] && results[0].result;
                finish(typeof title === 'string' ? title.trim() : '');
            }).catch(function () {
                finish(null);
            });
        }

        function onUpdated(updatedTabId, changeInfo) {
            if (updatedTabId !== tabId || !changeInfo || changeInfo.status !== 'complete') return;
            setTimeout(readTitle, 120);
        }

        try {
            chrome.tabs.create({
                url: url,
                active: false
            }, function (tab) {
                if (chrome.runtime && chrome.runtime.lastError) {
                    finish(null);
                    return;
                }
                tabId = tab && tab.id !== undefined ? tab.id : null;
                if (tabId === null) {
                    finish(null);
                    return;
                }
                chrome.tabs.onUpdated.addListener(onUpdated);
                if (tab && tab.status === 'complete') setTimeout(readTitle, 120);
                timer = setTimeout(readTitle, 8000);
            });
        } catch (e) {
            finish(null);
        }
    }

    function handleFetchTitle() {
        var urlEl = document.getElementById('cpFormURL');
        var nameEl = document.getElementById('cpFormName');
        var btn = document.getElementById('cpFormFetchBtn');
        var rawUrl = urlEl && urlEl.value;
        var url = normalizeHttpsUrl(rawUrl);
        if (!url) {
            if (isHttpUrl(rawUrl)) {
                var errorEl = document.getElementById('cpFormError');
                if (errorEl) {
                    errorEl.textContent = invalidUrlMessage(rawUrl, 'urlRequired');
                    errorEl.style.display = 'block';
                }
                if (urlEl) urlEl.classList.add('error');
            }
            return;
        }
        var fetchErrorEl = document.getElementById('cpFormError');
        if (fetchErrorEl) fetchErrorEl.style.display = 'none';
        if (urlEl) urlEl.classList.remove('error');

        var isExt = typeof chrome !== 'undefined' && chrome.permissions && !!chrome.runtime && !!chrome.runtime.id;
        var doFetch = function () {
            btn.classList.add('loading');
            btn.disabled = true;
            nameEl.placeholder = t('fetchingTitle');
            var fetcher = isExt ? fetchPageTitleInTempTab : fetchPageTitle;
            fetcher(url, function (title) {
                btn.classList.remove('loading');
                btn.disabled = false;
                nameEl.placeholder = t('shortcutName');
                if (title) {
                    nameEl.value = title;
                } else {
                    nameEl.value = smartUrlName(url);
                }
                nameEl.focus();
            });
        };

        if (!isExt) {
            doFetch();
            return;
        }

        var origin;
        try {
            origin = new URL(url).origin + '/*';
        } catch (e) {
            nameEl.value = smartUrlName(url);
            nameEl.focus();
            return;
        }

        chrome.permissions.contains({ origins: [origin] }, function (hasPermission) {
            if (hasPermission) {
                doFetch();
                return;
            }
            chrome.permissions.request({ origins: [origin] }, function (granted) {
                if (granted) {
                    doFetch();
                    return;
                }
                nameEl.value = smartUrlName(url);
                nameEl.focus();
            });
        });
    }

    function doAddOrEditSubmit(isEdit, editId) {
        var nameEl = document.getElementById('cpFormName');
        var urlEl = document.getElementById('cpFormURL');
        var errorEl = document.getElementById('cpFormError');
        var name = (nameEl && nameEl.value || '').trim();
        var url = (urlEl && urlEl.value || '').trim();

        if (!url) { errorEl.textContent = t('urlRequired'); errorEl.style.display = 'block'; urlEl.classList.add('error'); return; }
        url = normalizeHttpsUrl(url);
        if (!url) { errorEl.textContent = invalidUrlMessage(urlEl && urlEl.value, 'urlRequired'); errorEl.style.display = 'block'; urlEl.classList.add('error'); return; }

        var shortcuts = loadShortcuts();
        if (shortcuts.some(function (s) { return s.url.toLowerCase() === url.toLowerCase() && (!isEdit || s.id !== editId); })) {
            errorEl.textContent = t('duplicateURL'); errorEl.style.display = 'block'; urlEl.classList.add('error'); return;
        }

        if (!name) name = smartUrlName(url);

        if (isEdit) {
            for (var i = 0; i < shortcuts.length; i++) {
                if (shortcuts[i].id === editId) { shortcuts[i].name = name; shortcuts[i].url = url; break; }
            }
            saveShortcuts(shortcuts);
            var editIcons = loadIcons();
            editIcons[editId] = getFaviconUrl(url) || ('LETTER:' + name[0].toUpperCase());
            saveIcons(editIcons);
            cpCurrentMode = 'list';
            cpEditTarget = null;
            renderShortcutList('');
            cpSearchInput.value = '';
            cpSearchTerm = '';
            requestAnimationFrame(function () { cpSearchInput.focus(); });
        } else {
            var id = generateId();
            var now = Date.now();
            shortcuts.push({ id: id, name: name, url: url, freq: 0, added: now });
            saveShortcuts(shortcuts);
            if (isHiddenMode) {
                var h = loadHidden();
                h.push(id);
                saveHidden(h);
            }
            var icons = loadIcons();
            var favUrl = getFaviconUrl(url);
            var letterFallback = 'LETTER:' + name[0].toUpperCase();
            icons[id] = letterFallback;
            saveIcons(icons);

            cpCurrentMode = 'feedback';
            if (favUrl) {
                showFeedbackWithFavicon(name, favUrl, letterFallback, id);
            } else {
                renderFeedback(name, letterFallback);
                scheduleFeedbackReturn();
            }
        }
    }

    function handleAddSubmit() {
        doAddOrEditSubmit(false, null);
    }

    function handleEditClick(id) {
        var item = shortcutById(id);
        if (!item) return;
        cpCurrentMode = 'add';
        cpEditTarget = id;
        renderForm('edit', item);
    }

    function handleEditSubmit(id) {
        doAddOrEditSubmit(true, id);
    }

    function handleDeleteClick(id) {
        var shortcuts = loadShortcuts().filter(function (s) { return s.id !== id; });
        saveShortcuts(shortcuts);
        var icons = loadIcons();
        delete icons[id];
        saveIcons(icons);
        var recents = loadRecents().filter(function (rid) { return rid !== id; });
        saveRecents(recents);
        var hidden = loadHidden().filter(function (h) { return h !== id; });
        saveHidden(hidden);
        renderGrid('delete', cpCurrentPage);
    }

    function handleGridScroll(e) {
        var modeMap = { 'deleteGrid': 'delete', 'editGrid': 'edit', 'hideGrid': 'hide', 'unhideGrid': 'unhide' };
        var mode = modeMap[cpCurrentMode];
        if (!mode) return;
        var filtered = shortcutsForGridMode(mode);
        var totalPages = Math.max(1, Math.ceil(filtered.length / cpItemsPerPage));
        if (e.deltaY > 0 && cpCurrentPage < totalPages) {
            cpCurrentPage++;
            renderGrid(mode, cpCurrentPage);
        } else if (e.deltaY < 0 && cpCurrentPage > 1) {
            cpCurrentPage--;
            renderGrid(mode, cpCurrentPage);
        }
    }

    function handleIconPageScroll(e) {
        var visible = filterShortcutsByTerm(shortcutsForCurrentMode(), cpSearchTerm);
        var recState = recommendationState(visible, cpSearchTerm);
        visible = visible.filter(function (s) { return !recState.recommendedIds[s.id]; });
        var iconPageSize = recState.pageSize;
        var totalPages = Math.ceil(visible.length / iconPageSize);
        if (e.deltaY > 0 && cpCurrentPage < totalPages) {
            e.preventDefault();
            cpCurrentPage++;
            renderShortcutList(cpSearchTerm);
            slideInContent(false);
        } else if (e.deltaY < 0 && cpCurrentPage > 1) {
            e.preventDefault();
            cpCurrentPage--;
            renderShortcutList(cpSearchTerm);
            slideInContent(true);
        }
    }

    function handleSort(mode) {
        var shortcuts = loadShortcuts();
        if (!mode || mode === 'a-z' || mode === 'az') {
            shortcuts.sort(function (a, b) { return a.name.toLowerCase().localeCompare(b.name.toLowerCase()); });
        } else if (mode === 'z-a' || mode === 'za') {
            shortcuts.sort(function (a, b) { return b.name.toLowerCase().localeCompare(a.name.toLowerCase()); });
        } else if (mode === 'freq') {
            shortcuts.sort(function (a, b) { return (b.freq || 0) - (a.freq || 0); });
        } else if (mode === 'recent') {
            var recents = loadRecents();
            shortcuts.sort(function (a, b) {
                var ai = recents.indexOf(a.id), bi = recents.indexOf(b.id);
                if (ai !== -1 && bi !== -1) return ai - bi;
                if (ai !== -1) return -1;
                if (bi !== -1) return 1;
                return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
            });
        }
        saveShortcuts(shortcuts);
        cpCurrentMode = 'list';
        renderShortcutList('');
        cpSearchInput.value = '';
        cpSearchTerm = '';
    }

    function handleShortcutClick(id) {
        var item = shortcutById(id);
        if (!item) return;
        recordAccess(id);
        window.open(item.url, '_self');
    }

    function normalizeImportedShortcut(raw) {
        if (!raw || typeof raw !== 'object') return null;
        var url = normalizeHttpsUrl(raw.url || raw.href || raw.link);
        if (!url) return null;
        var name = String(raw.name || raw.title || raw.label || '').trim() || smartUrlName(url);
        return {
            name: name,
            url: url,
            freq: raw.freq || 0,
            added: raw.added || Date.now()
        };
    }

    function shortcutsForScope(scope) {
        var hidden = loadHidden();
        return loadShortcuts().filter(function (shortcut) {
            var hiddenShortcut = isHiddenId(shortcut.id, hidden);
            return scope === 'hidden' ? hiddenShortcut : !hiddenShortcut;
        });
    }

    function parseShortcutImportPayload(text, filename) {
        var trimmed = String(text || '').trim();
        if (trimmed.charAt(0) === '[' || trimmed.charAt(0) === '{' || /\.json$/i.test(filename || '')) {
            try {
                var json = JSON.parse(trimmed);
                var items = Array.isArray(json) ? json : (Array.isArray(json.items) ? json.items : (Array.isArray(json.shortcuts) ? json.shortcuts : []));
                return {
                    scope: Array.isArray(json) ? null : json.scope,
                    items: items.map(normalizeImportedShortcut).filter(Boolean),
                    format: 'json'
                };
            } catch (e) {
                return { scope: null, items: [], format: 'json' };
            }
        }

        var links = [];
        var re = /<A\s+[^>]*HREF="([^"]*)"[^>]*>([^<]*)<\/A>/gi;
        var m;
        while ((m = re.exec(text)) !== null) {
            links.push(normalizeImportedShortcut({
                url: m[1],
                name: m[2].replace(/<[^>]+>/g, '').trim()
            }));
        }
        return { scope: null, items: links.filter(Boolean), format: 'html' };
    }

    function importShortcutsToScope(items, scope) {
        var shortcuts = loadShortcuts().slice();
        var hidden = loadHidden().slice();
        var icons = loadIcons();
        var added = 0;
        var moved = 0;
        var skipped = 0;

        items.forEach(function (item) {
            var existing = findShortcutByUrl(shortcuts, item.url);
            if (existing) {
                var wasHidden = isHiddenId(existing.id, hidden);
                if (shortcutScopeName(wasHidden) !== scope) {
                    hidden = setShortcutScope(existing.id, scope, hidden);
                    moved++;
                } else {
                    skipped++;
                }
                return;
            }

            var id = generateId();
            var name = item.name || urlHostLabel(item.url);
            shortcuts.push({
                id: id,
                name: name,
                url: item.url,
                freq: item.freq || 0,
                added: item.added || Date.now()
            });
            if (scope === 'hidden') hidden.push(id);
            icons[id] = 'LETTER:' + name[0].toUpperCase();
            added++;
        });

        saveShortcuts(shortcuts);
        saveHidden(uniqueIds(hidden));
        saveIcons(icons);
        return { added: added, moved: moved, skipped: skipped };
    }

    function importResultMessage(result, scope, sourceScope) {
        var target = scope === 'hidden' ? t('commandHiddenScope') : t('commandNormalScope');
        var msg = formatText('commandImportResult', {
            target: target,
            added: result.added,
            moved: result.moved,
            skipped: result.skipped
        });
        if (sourceScope && sourceScope !== currentScopeName()) {
            msg = formatText('commandImportFromOtherScope', {
                source: sourceScope === 'hidden' ? t('commandHiddenScope') : t('commandNormalScope'),
                message: msg
            });
        }
        return msg;
    }

    function handleImport() {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,.html,.htm,application/json,text/html';
        input.addEventListener('change', function () {
            var file = input.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function () {
                var parsed = parseShortcutImportPayload(reader.result, file.name);
                if (!parsed.items.length) {
                    cpCurrentMode = 'feedback';
                    feedbackMessage(t('commandImportEmpty'));
                    return;
                }
                var sourceScope = parsed.format === 'json' ? normalizeScope(parsed.scope, isHiddenMode) : null;
                var targetScope = sourceScope || currentScopeName();
                var result = importShortcutsToScope(parsed.items, targetScope);
                log('CmdPalette', 'imported shortcuts to ' + targetScope + ': ' + JSON.stringify(result));
                cpCurrentMode = 'list';
                renderShortcutList('');
                cpCurrentMode = 'feedback';
                feedbackMessage(importResultMessage(result, targetScope, sourceScope), 'info');
            };
            reader.readAsText(file);
        });
        input.click();
    }

    function handleExport() {
        var scope = currentScopeName();
        var shortcuts = shortcutsForScope(scope).map(function (shortcut) {
            return {
                name: shortcut.name,
                url: shortcut.url,
                freq: shortcut.freq || 0,
                added: shortcut.added || 0
            };
        });
        var data = JSON.stringify({
            type: SHORTCUT_EXPORT_TYPE,
            version: 1,
            scope: scope,
            exportedAt: new Date().toISOString(),
            items: shortcuts
        }, null, 2);
        var blob = new Blob([data], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'plaintab-shortcuts-' + scope + '-' + new Date().toISOString().slice(0, 10) + '.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    function handleReset() {
        var targetScope = currentScopeName();
        var targetIds = {};
        shortcutsForScope(targetScope).forEach(function (s) { targetIds[s.id] = true; });
        var shortcuts = loadShortcuts();
        shortcuts.forEach(function (s) {
            if (targetIds[s.id]) s.freq = 0;
        });
        saveShortcuts(shortcuts);
        saveRecents(loadRecents().filter(function (id) { return !targetIds[id]; }));
        renderShortcutList('');
        cpCurrentMode = 'feedback';
        feedbackMessage(formatText('commandResetUsageOk', {
            scope: targetScope === 'hidden' ? t('commandHiddenScope') : t('commandNormalScope')
        }));
    }

    function hideShortcut(id) {
        var hidden = loadHidden();
        if (hidden.indexOf(id) === -1) { hidden.push(id); saveHidden(hidden); }
        renderGrid('hide', cpCurrentPage);
    }

    function unhideShortcut(id) {
        var hidden = loadHidden().filter(function (h) { return h !== id; });
        saveHidden(hidden);
        renderGrid('unhide', cpCurrentPage);
    }

    function handleClear() {
        setFeedbackContentMode(false);
        setIconPageMode(false);
        var scope = currentScopeName();
        var scopeLabel = scope === 'hidden' ? t('commandHiddenScope') : t('commandNormalScope');
        cpContent.innerHTML = '<div class="cp-clear-confirm">' +
            '<p class="cp-clear-text">' + formatText('commandClearConfirm', { scope: scopeLabel }) + '</p>' +
            '<button id="cpClearYes" class="cp-clear-btn-yes">' + t('yes') + '</button>' +
            '<button id="cpClearNo" class="cp-clear-btn-no">' + t('no') + '</button>' +
            '</div>';
        document.getElementById('cpClearYes').addEventListener('click', function () {
            var hidden = loadHidden();
            var removeIds = {};
            var keptShortcuts = loadShortcuts().filter(function (shortcut) {
                var remove = scope === 'hidden' ? isHiddenId(shortcut.id, hidden) : !isHiddenId(shortcut.id, hidden);
                if (remove) removeIds[shortcut.id] = true;
                return !remove;
            });
            saveShortcuts(keptShortcuts);
            saveHidden(scope === 'hidden' ? hidden.filter(function (id) { return !removeIds[id]; }) : hidden);
            var icons = loadIcons();
            Object.keys(removeIds).forEach(function (id) { delete icons[id]; });
            saveIcons(icons);
            saveRecents(loadRecents().filter(function (id) { return !removeIds[id]; }));
            cpCurrentMode = 'list';
            renderShortcutList('');
            cpSearchInput.value = '';
            cpSearchTerm = '';
            requestAnimationFrame(function () { cpSearchInput.focus(); });
        });
        document.getElementById('cpClearNo').addEventListener('click', function () {
            cpCurrentMode = 'list';
            renderShortcutList('');
            cpSearchInput.value = '';
            cpSearchTerm = '';
            requestAnimationFrame(function () { cpSearchInput.focus(); });
        });
    }

    function handleRestore() {
        if (isHiddenMode) {
            cpCurrentMode = 'feedback';
            feedbackMessage(t('commandRestoreHiddenUnavailable'));
            return;
        }

        var shortcuts = loadShortcuts().slice();
        var hidden = loadHidden().slice();
        var existing = findShortcutByUrl(shortcuts, BUILTIN_GITHUB.url);
        if (existing) {
            hidden = setShortcutScope(existing.id, 'normal', hidden);
        } else {
            var restoreId = shortcuts.some(function (s) { return s.id === BUILTIN_GITHUB.id; }) ? generateId() : BUILTIN_GITHUB.id;
            shortcuts.unshift({
                id: restoreId,
                name: BUILTIN_GITHUB.name,
                url: BUILTIN_GITHUB.url,
                freq: 0,
                added: Date.now()
            });
            var icons = loadIcons();
            icons[restoreId] = BUILTIN_GITHUB_ICON;
            saveIcons(icons);
        }
        saveShortcuts(shortcuts);
        saveHidden(hidden);
        cpCurrentMode = 'list';
        renderShortcutList('');
        cpCurrentMode = 'feedback';
        feedbackMessage(t('commandRestoreDefaultOk'));
    }

    // ================================================================
    // 键盘导航
    // ================================================================

    function handleKeyNav(e) {
        if (!isPaletteOpen) return;
        var active = document.activeElement;
        var activeIsSearch = active === cpSearchInput;
        var activeIsTextField = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);

        if (e.key === 'Escape') {
            e.preventDefault();
            if (cpCurrentMode !== 'list') {
                goHome();
                return;
            }
            closePalette();
            return;
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            if (cpCurrentMode === 'feedback') return;
            if (cpSkin === 'command-terminal' && cpCurrentMode === 'list' && activeIsSearch && handleCommandTerminalInputEnter()) return;
            if (cpSkin === 'shell' && cpCurrentMode === 'list' && activeIsSearch && handleShellInputEnter()) return;
            if (cpCurrentMode === 'add') {
                var submitBtn = document.getElementById('cpFormSubmit');
                if (submitBtn && (activeIsSearch || (active && active.id === 'cpFormName'))) return;
                if (submitBtn) submitBtn.click();
                return;
            }
            activateSelectedItem();
            return;
        }

        if (e.key === 'Tab' && cpSkin === 'command-terminal' && activeIsSearch) {
            e.preventDefault();
            completeCommandTerminalInput();
            return;
        }

        if (e.key === 'Tab' && cpSkin === 'shell' && activeIsSearch) {
            e.preventDefault();
            completeShellInput();
            return;
        }

        if (e.key === 'Backspace' && activeIsSearch && !cpSearchInput.value && cpCurrentMode !== 'list') {
            e.preventDefault();
            goHome();
            return;
        }

        if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            if (activeIsTextField && !activeIsSearch) return;
            if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && activeIsSearch && cpSearchInput.value) return;
            e.preventDefault();
            moveSelection(e.key);
        }
    }

    function selectableItems() {
        return cpContent.querySelectorAll('.cp-item, .cp-grid-item:not(.empty), .cp-command-option');
    }

    function resetSelection(index) {
        var items = selectableItems();
        items.forEach(function (item) { item.classList.remove('key-hover'); });
        if (!items.length) {
            cpKeyIndex = 0;
            return;
        }
        cpKeyIndex = Math.max(0, Math.min(typeof index === 'number' ? index : 0, items.length - 1));
        highlightItems(-1, cpKeyIndex, items);
    }

    function highlightItems(prevIdx, newIdx, items) {
        if (items[prevIdx]) items[prevIdx].classList.remove('key-hover');
        if (items[newIdx]) {
            items[newIdx].classList.add('key-hover');
            if (document.activeElement !== cpSearchInput) items[newIdx].scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
    }

    function gridColumnCount() {
        var grid = cpContent.querySelector('.cp-grid');
        if (!grid) return 1;
        var columns = window.getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length;
        return Math.max(1, columns || 1);
    }

    function moveSelection(key) {
        var items = selectableItems();
        if (!items.length) return;
        var prevIdx = cpKeyIndex;
        var columns = cpViewMode === 'icon' ? gridColumnCount() : 1;
        var delta = 0;
        if (key === 'ArrowDown') delta = columns;
        else if (key === 'ArrowUp') delta = -columns;
        else if (key === 'ArrowRight') delta = 1;
        else if (key === 'ArrowLeft') delta = -1;
        var nextIdx = cpKeyIndex + delta;
        if (nextIdx < 0 && pageByDelta(-1)) {
            requestAnimationFrame(function () { resetSelection(selectableItems().length - 1); });
            return;
        }
        if (nextIdx >= items.length && pageByDelta(1)) {
            requestAnimationFrame(function () { resetSelection(0); });
            return;
        }
        cpKeyIndex = Math.max(0, Math.min(nextIdx, items.length - 1));
        highlightItems(prevIdx, cpKeyIndex, items);
    }

    function pageByDelta(delta) {
        var dots = cpContent.querySelectorAll('.cp-pagination-dot');
        if (!dots.length) return false;
        var nextPage = cpCurrentPage + delta;
        if (nextPage < 1 || nextPage > dots.length) return false;
        var fromLeft = delta < 0;
        if (cpCurrentMode === 'list') {
            cpCurrentPage = nextPage;
            renderShortcutList(cpSearchTerm);
            slideInContent(fromLeft);
            return true;
        }
        var mode = gridModeForCurrentMode();
        if (!mode) return false;
        renderGrid(mode, nextPage);
        slideInContent(fromLeft);
        return true;
    }

    function activateSelectedItem() {
        var items = selectableItems();
        var el = items[cpKeyIndex];
        if (!el) return;
        if (cpCurrentMode === 'commandSuggestions') {
            if (el.dataset.command) handleCommand(el.dataset.command);
            return;
        }
        if (!el || !el.dataset.id) return;
        if (cpCurrentMode === 'list' || cpCurrentMode === 'recent') {
            handleShortcutClick(el.dataset.id);
            return;
        }
        var mode = gridModeForCurrentMode();
        if (mode === 'edit') handleEditClick(el.dataset.id);
        else if (mode === 'delete') handleDeleteClick(el.dataset.id);
        else if (mode === 'hide') hideShortcut(el.dataset.id);
        else if (mode === 'unhide') unhideShortcut(el.dataset.id);
    }

    // ================================================================
    // 事件绑定（仅 palette 内部事件）
    // ================================================================

    function bindPaletteEvents() {
        cmdOverlay.addEventListener('click', function (e) {
            if (e.target === cmdOverlay) closePalette();
        });

        cpSearchInput.addEventListener('input', function () { handleSearchInput(); });

        cpContent.addEventListener('wheel', function (e) {
            e.stopPropagation();
            if ((cpCurrentMode === 'deleteGrid' || cpCurrentMode === 'editGrid' || cpCurrentMode === 'hideGrid' || cpCurrentMode === 'unhideGrid') && cpViewMode === 'icon') {
                e.preventDefault();
                handleGridScroll(e);
            } else if (cpCurrentMode === 'list' && cpViewMode === 'icon') {
                handleIconPageScroll(e);
            }
        });

        cpContent.addEventListener('click', function (e) {
            e.stopPropagation();
            var commandOption = e.target.closest('.cp-command-option');
            if (commandOption && commandOption.dataset.command) {
                handleCommand(commandOption.dataset.command);
                return;
            }
            var canNavigate = cpCurrentMode === 'list' || cpCurrentMode === 'recent';
            if (canNavigate) {
                var item = e.target.closest('.cp-item');
                if (item && item.dataset.id) {
                    handleShortcutClick(item.dataset.id);
                    return;
                }
                var gridItem = e.target.closest('.cp-grid-item:not(.empty)');
                if (gridItem && gridItem.dataset.id) {
                    handleShortcutClick(gridItem.dataset.id);
                    return;
                }
            }
            var dot = e.target.closest('.cp-pagination-dot');
            if (dot && dot.dataset.page) {
                var page = parseInt(dot.dataset.page);
                var prev = cpCurrentPage;
                var gridMode = gridModeForCurrentMode();
                if (gridMode) renderGrid(gridMode, page);
                else if (cpCurrentMode === 'list') { cpCurrentPage = page; renderShortcutList(cpSearchTerm); }
                slideInContent(page < prev);
            }
        });

        cpPinnedBar.addEventListener('wheel', handlePinnedWheel);
        ensureShellResizeHandle();
        cmdPalette.addEventListener('pointerdown', startShellPaletteResize);
        cmdPalette.addEventListener('pointermove', moveShellPaletteResize);
        cmdPalette.addEventListener('pointerup', endShellPaletteResize);
        cmdPalette.addEventListener('pointercancel', endShellPaletteResize);
        cmdPalette.addEventListener('pointerdown', startPaletteDrag);
        cmdPalette.addEventListener('pointermove', movePaletteDrag);
        cmdPalette.addEventListener('pointerup', endPaletteDrag);
        cmdPalette.addEventListener('pointercancel', endPaletteDrag);
        window.addEventListener('resize', function () {
            if (!isPaletteOpen || cpResizeFrame) return;
            cpResizeFrame = requestAnimationFrame(function () {
                cpResizeFrame = 0;
                applyShellPaletteSize();
                positionPalette(cpLastAnchor);
            });
        });
    }

    // 页面加载完成后绑定事件
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindPaletteEvents);
    } else {
        bindPaletteEvents();
    }

    function refreshPaletteData() {
        _shortcutsCache = null;
        _iconsCache = null;
        _recentsCache = null;
        _hiddenCache = null;
        refreshShortcutSettings();
        if (!isPaletteOpen) return;
        renderPinnedBar();
        renderCurrentView();
        positionPalette(cpLastAnchor);
    }

    // ================================================================
    // 公开 API
    // ================================================================

    window.Palette = {
        open: openPalette,
        openHidden: openHiddenPalette,
        close: closePalette,
        handleKeyNav: handleKeyNav,

        get isOpen() { return isPaletteOpen; },
        get isHidden() { return isHiddenMode; },
        get el() { return cmdPalette; },

        // Settings panel integration
        loadHotkey: loadHotkey,
        saveHotkey: saveHotkey,
        loadHiddenHotkey: loadHiddenHotkey,
        saveHiddenHotkey: saveHiddenHotkey,
        loadRecommend: loadRecommend,
        saveRecommend: saveRecommend,
        loadPalettePlacement: loadPalettePlacement,
        savePalettePlacement: savePalettePlacement,
        loadPaletteSkin: loadPaletteSkin,
        savePaletteSkin: savePaletteSkin,
        refresh: refreshPaletteData
    };

})();
