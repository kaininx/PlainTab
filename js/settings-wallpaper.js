/**
 * SettingsWallpaper - L2 wallpaper settings tab module.
 * Loaded lazily with the full settings panel; never part of first paint.
 */
(function () {
    'use strict';

    function clonePlain(value) {
        return JSON.parse(JSON.stringify(value || {}));
    }

    function create(context) {
        context = context || {};

        function tr(key) {
            return context.tr ? context.tr(key) : key;
        }

        function escapeHtml(value) {
            if (context.escapeHtml) return context.escapeHtml(value);
            return String(value == null ? '' : value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function normalizeSource(source) {
            return context.normalizeDraftSource ? context.normalizeDraftSource(source) : (source === 'local' ? 'upload' : (source || 'bing'));
        }

        function sourceDefs() {
            return [
                { id: 'bing', glyph: 'B', nameKey: 'sourceBing', descKey: 'sourceBingDesc' },
                { id: 'upload', glyph: 'U', nameKey: 'sourceUpload', descKey: 'sourceUploadDesc' },
                { id: 'folder', glyph: 'F', nameKey: 'sourceFolder', descKey: 'sourceFolderDesc' },
                { id: 'rss', glyph: 'R', nameKey: 'sourceRss', descKey: 'sourceRssDesc' },
                { id: 'wallhaven', glyph: 'W', nameKey: 'sourceWallhaven', descKey: 'sourceWallhavenDesc' },
                { id: 'api', glyph: 'A', nameKey: 'sourceApi', descKey: 'sourceApiDesc' }
            ];
        }

        function currentWorkOrder() {
            return context.currentWallpaperWorkOrder ? context.currentWallpaperWorkOrder() : {
                pendingSource: 'bing',
                pendingConfig: {},
                baseline: { pendingSource: 'bing', pendingConfig: {} },
                health: { state: 'Clean', reasonKey: 'wallpaperApplyNoChanges', message: '' }
            };
        }

        function currentStatus() {
            return context.validateWallpaperWorkOrder ? context.validateWallpaperWorkOrder() : {
                state: 'Clean',
                valid: false,
                reasonKey: 'wallpaperApplyNoChanges',
                message: ''
            };
        }

        function statusText(status) {
            if (context.wallpaperStatusText) return context.wallpaperStatusText(status);
            status = status || currentStatus();
            return status.message || tr(status.reasonKey || 'wallpaperApplyNoChanges');
        }

        function statusState(status) {
            if (context.wallpaperStatusState) return context.wallpaperStatusState(status);
            status = status || currentStatus();
            return status.state || 'Clean';
        }

        function sourceLabel(source) {
            if (context.getSourceLabel) return context.getSourceLabel(source);
            var found = sourceDefs().filter(function (item) { return item.id === source; })[0];
            return found ? tr(found.nameKey) : source;
        }

        function runningSource() {
            var D = context.D;
            if (!D) return 'bing';
            return normalizeSource(D.getActiveSource ? D.getActiveSource() : (D.loadWallpaper ? D.loadWallpaper().activeSource : 'bing'));
        }

        function runtimeCardHTML() {
            var source = runningSource();
            return '<aside class="wallpaper-runtime-card">' +
                '<span class="wallpaper-runtime-label">' + escapeHtml(tr('wallpaperCurrentSource').replace('{source}', '')) + '</span>' +
                '<strong>' + escapeHtml(sourceLabel(source)) + '</strong>' +
                '<small>' + escapeHtml(tr('wallpaperApplyNoChanges')) + '</small>' +
                '</aside>';
        }

        function sourceBadgeHTML(source, activeSource, running) {
            var status = currentStatus();
            if (source === activeSource) {
                return '<span class="wallpaper-source-badge" data-state="' + escapeHtml(statusState(status)) + '">' + escapeHtml(statusText(status)) + '</span>';
            }
            if (source === running) {
                return '<span class="wallpaper-source-badge" data-state="Running">' + escapeHtml(tr('wallpaperCurrentSource').replace('{source}', '').trim() || tr('wallpaperApplyReady')) + '</span>';
            }
            return '<span class="wallpaper-source-badge" data-state="Idle">' + escapeHtml(tr('wallpaperApplyNoChanges')) + '</span>';
        }

        function sourceNavHTML() {
            var workOrder = currentWorkOrder();
            var activeSource = normalizeSource(workOrder.pendingSource);
            var running = runningSource();
            return '<nav class="wallpaper-source-nav" role="radiogroup" aria-label="' + escapeHtml(tr('settingsGroupWallpaperSource')) + '">' +
                sourceDefs().map(function (source) {
                    var active = source.id === activeSource;
                    var classes = 'wallpaper-source-item ' + source.id + (active ? ' active' : '') + (source.id === running ? ' running' : '');
                    return '<button class="' + classes + '" type="button" role="radio" aria-checked="' + (active ? 'true' : 'false') + '" data-source="' + source.id + '" data-wallpaper-source-option="' + source.id + '">' +
                        '<span class="wallpaper-source-glyph ' + source.id + '" aria-hidden="true">' + escapeHtml(source.glyph) + '</span>' +
                        '<span class="wallpaper-source-copy"><strong>' + escapeHtml(tr(source.nameKey)) + '</strong></span>' +
                        sourceBadgeHTML(source.id, activeSource, running) +
                        '</button>';
                }).join('') +
                '</nav>';
        }

        function detailHTML() {
            var source = normalizeSource(currentWorkOrder().pendingSource);
            var body = context.buildWallpaperSourceDetailHTML ?
                context.buildWallpaperSourceDetailHTML(source) :
                '<p>' + escapeHtml(tr('sourcePendingHint')) + '</p>';
            return '<section class="wallpaper-source-detail" data-wallpaper-source-detail="' + escapeHtml(source) + '">' + body + '</section>';
        }

        function applyFooterHTML() {
            if (context.wallpaperApplyFooterHTML) return context.wallpaperApplyFooterHTML();
            var status = currentStatus();
            return '<div class="wallpaper-apply-footer">' +
                '<div class="wallpaper-apply-status" id="wallpaperApplyStatus" data-state="' + escapeHtml(statusState(status)) + '">' + escapeHtml(statusText(status)) + '</div>' +
                '<button id="wallpaperApplyBtn" class="primary-action" type="button"' + (status.valid ? '' : ' disabled') + '>' + escapeHtml(tr('wallpaperApply')) + '</button>' +
                '</div>';
        }

        function buildHTML() {
            return '<div class="wallpaper-tab-shell wallpaper-tab-shell-v2">' +
                '<div class="wallpaper-tab-header wallpaper-tab-header-v2">' +
                    '<div><h2>' + escapeHtml(tr('tabWallpaper')) + '</h2><p>' + escapeHtml(context.modalCopy ? context.modalCopy('modalSubtitleWallpaper') : '') + '</p></div>' +
                    runtimeCardHTML() +
                '</div>' +
                '<div class="wallpaper-tab-body wallpaper-tab-body-v2">' +
                    '<div class="wallpaper-workspace">' +
                        sourceNavHTML() +
                        detailHTML() +
                    '</div>' +
                    '<div class="wallpaper-section-divider" aria-hidden="true"></div>' +
                    (context.buildWallpaperDisplayHTML ? context.buildWallpaperDisplayHTML() : '') +
                    '<div class="wallpaper-reset-row"><button class="danger-action" id="wallpaperResetBtn" type="button">' + escapeHtml(tr('wallpaperResetDefaults')) + '</button></div>' +
                '</div>' +
                applyFooterHTML() +
                '</div>';
        }

        function selectWallpaperSource(source) {
            source = normalizeSource(source);
            if (context.switchWallpaperWorkOrderSource) context.switchWallpaperWorkOrderSource(source);
            if (context.setWallpaperDraftOpenSource) context.setWallpaperDraftOpenSource(source);
            if (context.refreshWallpaperDraftTab) context.refreshWallpaperDraftTab();
        }

        function syncWorkspaceDetailHeight(root) {
            root = root || (context.modalContent ? context.modalContent : document);
            var workspace = root.querySelector('.wallpaper-workspace');
            if (!workspace) return;
            var nav = workspace.querySelector('.wallpaper-source-nav');
            if (!nav) return;

            function writeHeight() {
                var height = Math.ceil(nav.getBoundingClientRect().height || 0);
                if (height > 0) workspace.style.setProperty('--wallpaper-source-nav-height', height + 'px');
            }

            writeHeight();
            requestAnimationFrame(writeHeight);

            if (workspace._wallpaperNavResizeObserver) workspace._wallpaperNavResizeObserver.disconnect();
            if (typeof ResizeObserver === 'function') {
                workspace._wallpaperNavResizeObserver = new ResizeObserver(writeHeight);
                workspace._wallpaperNavResizeObserver.observe(nav);
            }
        }

        function bindEvents(root) {
            root = root || (context.modalContent ? context.modalContent : document);
            root.querySelectorAll('[data-wallpaper-source-option]').forEach(function (button) {
                button.addEventListener('click', function () {
                    selectWallpaperSource(button.dataset.wallpaperSourceOption);
                });
            });
            if (context.bindWallpaperSourceDetailEvents) context.bindWallpaperSourceDetailEvents(root);
            syncWorkspaceDetailHeight(root);
            var applyBtn = root.querySelector('#wallpaperApplyBtn');
            if (applyBtn && context.applyWallpaperDraft) applyBtn.addEventListener('click', context.applyWallpaperDraft);
            var reset = root.querySelector('#wallpaperResetBtn');
            if (reset && context.resetWallpaperDefaults) {
                reset.addEventListener('click', function () {
                    if (!confirm(tr('wallpaperResetConfirm'))) return;
                    context.resetWallpaperDefaults();
                });
            }
        }

        return {
            buildHTML: buildHTML,
            bindEvents: bindEvents,
            selectWallpaperSource: selectWallpaperSource,
            syncWorkspaceDetailHeight: syncWorkspaceDetailHeight,
            clonePlain: clonePlain
        };
    }

    window.SettingsWallpaper = {
        create: create
    };
})();
