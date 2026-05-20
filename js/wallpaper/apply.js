(function () {
    'use strict';

    var D = window.WallpaperData;

    function clonePlain(value) {
        return JSON.parse(JSON.stringify(value || {}));
    }

    function normalizeSource(source) {
        if (D && D.normalizeSource) return D.normalizeSource(source);
        if (source === 'local') return 'upload';
        return source || 'bing';
    }

    function currentWallpaper() {
        return D && D.loadWallpaper ? D.loadWallpaper() : { activeSource: 'bing', providers: {}, cache: {} };
    }

    function providerConfig(model, source) {
        model = model || currentWallpaper();
        source = normalizeSource(source);
        return model.providers && model.providers[source] ? clonePlain(model.providers[source].config || {}) : {};
    }

    function selectedRssSource(config) {
        config = config || {};
        var sources = config.sources || [];
        return sources.filter(function (source) { return source && source.id === config.activeSourceId; })[0] || sources[0] || null;
    }

    function selectedApiSource(config) {
        config = config || {};
        var apiType = config.apiType === 'json' ? 'json' : 'image';
        var list = apiType === 'json' ? (config.jsonSources || []) : (config.imageSources || []);
        var id = apiType === 'json' ? config.activeJsonSourceId : config.activeImageSourceId;
        return list.filter(function (source) { return source && source.id === id; })[0] || list[0] || null;
    }

    function isDirty(workOrder) {
        if (!workOrder) return false;
        var baseline = workOrder.baseline || {};
        var pending = {
            pendingSource: normalizeSource(workOrder.pendingSource),
            pendingConfig: workOrder.pendingConfig || {}
        };
        var saved = {
            pendingSource: normalizeSource(baseline.pendingSource || currentWallpaper().activeSource),
            pendingConfig: baseline.pendingConfig || providerConfig(null, pending.pendingSource)
        };
        return JSON.stringify(pending) !== JSON.stringify(saved);
    }

    function blocked(reasonKey, message) {
        return { state: 'Blocked', valid: false, reasonKey: reasonKey, message: message || '' };
    }

    function hasUploadAssets() {
        if (D && D.hasSourceCache) return D.hasSourceCache('upload');
        return !!(D && D.hasUploadAssets && D.hasUploadAssets());
    }

    function validateWorkOrder(workOrder) {
        if (!workOrder) return blocked('wallpaperStatusNoPendingSource');
        var source = normalizeSource(workOrder.pendingSource);
        var config = clonePlain(workOrder.pendingConfig || providerConfig(null, source));

        if (workOrder.health && workOrder.health.state === 'Testing') {
            return { state: 'Testing', valid: false, reasonKey: 'wallpaperStatusTesting', message: '' };
        }
        if (!isDirty(workOrder)) {
            return { state: 'Clean', valid: false, reasonKey: 'wallpaperApplyNoChanges', message: '' };
        }
        if (source === 'bing') return { state: 'Ready', valid: true, reasonKey: 'wallpaperApplyReady', message: '' };
        if (source === 'upload') {
            if (hasUploadAssets()) return { state: 'Ready', valid: true, reasonKey: 'wallpaperApplyReady', message: '' };
            return blocked('wallpaperStatusUploadMissing');
        }
        if (source === 'folder') {
            if (workOrder.health && workOrder.health.state === 'Ready') return { state: 'Ready', valid: true, reasonKey: 'wallpaperApplyReady', message: '' };
            return blocked('wallpaperStatusFolderMissing');
        }
        if (source === 'rss') {
            var rss = selectedRssSource(config);
            if (!rss) return blocked('rssNeedsSource');
            if (!/^https:\/\//i.test(String(rss.url || ''))) return blocked('rssInvalidUrl');
            if (D && D.isTestPassed && D.rssFieldHash && D.isTestPassed(rss, D.rssFieldHash(rss))) {
                return { state: 'Ready', valid: true, reasonKey: 'wallpaperApplyReady', message: '' };
            }
            if (rss.test && rss.test.status === 'failed' && rss.test.error) return blocked('wallpaperStatusTestFailed', rss.test.error);
            return blocked('wallpaperStatusTestRss');
        }
        if (source === 'api') {
            var api = selectedApiSource(config);
            var apiType = config.apiType === 'json' ? 'json' : 'image';
            if (!api) return blocked('apiNeedsSource');
            if (!/^https:\/\//i.test(String(api.url || ''))) return blocked('apiInvalidUrl');
            if (D && D.isTestPassed && D.apiFieldHash && D.isTestPassed(api, D.apiFieldHash(api, apiType))) {
                return { state: 'Ready', valid: true, reasonKey: 'wallpaperApplyReady', message: '' };
            }
            if (api.test && api.test.status === 'failed' && api.test.error) return blocked('wallpaperStatusTestFailed', api.test.error);
            return blocked('wallpaperStatusTestApi');
        }
        if (source === 'wallhaven') {
            var wallhavenConfig = D && D.normalizeWallhavenConfig ? D.normalizeWallhavenConfig(config) : config;
            if (D && D.isTestPassed && D.wallhavenFieldHash && D.isTestPassed(wallhavenConfig, D.wallhavenFieldHash(wallhavenConfig))) {
                return { state: 'Ready', valid: true, reasonKey: 'wallpaperApplyReady', message: '' };
            }
            if (wallhavenConfig.test && wallhavenConfig.test.status === 'failed' && wallhavenConfig.test.error) {
                return blocked('wallpaperStatusTestFailed', wallhavenConfig.test.error);
            }
            return blocked('wallpaperStatusTestWallhaven');
        }
        return blocked('sourcePendingHint');
    }

    function defaultPrepare() {
        return Promise.resolve({ prepared: true });
    }

    function prepareWorkOrder(workOrder, hooks) {
        hooks = hooks || {};
        return (hooks.prepare || defaultPrepare)(workOrder);
    }

    function rollbackPrepared(prepared) {
        if (!prepared || typeof prepared.rollback !== 'function') return Promise.resolve(false);
        try {
            return Promise.resolve(prepared.rollback());
        } catch (e) {
            return Promise.reject(e);
        }
    }

    function commitWorkOrder(workOrder) {
        var source = normalizeSource(workOrder.pendingSource);
        var model = clonePlain(currentWallpaper());
        if (!model.providers) model.providers = {};
        if (!model.providers[source]) model.providers[source] = { config: {}, state: {} };
        model.providers[source].config = clonePlain(workOrder.pendingConfig || {});
        model.activeSource = source;
        return Promise.resolve(D.saveWallpaper(model)).then(function (saved) {
            if (saved === false) throw new Error('wallpaper save failed');
            return model;
        });
    }

    function cleanupPreviousSource(previousSource, nextSource) {
        previousSource = normalizeSource(previousSource);
        nextSource = normalizeSource(nextSource);
        if (!previousSource || previousSource === nextSource || previousSource === 'bing') return Promise.resolve(false);
        if (D.cleanupSourceCache) return D.cleanupSourceCache(previousSource);
        if (D.clearWallpaperSourceCache) return D.clearWallpaperSourceCache(previousSource);
        return Promise.resolve(false);
    }

    function reloadWallpaper() {
        if (window.reloadWallpaper) return Promise.resolve(window.reloadWallpaper());
        return Promise.resolve(false);
    }

    function restoreWallpaper(model) {
        if (!D || !D.saveWallpaper || !model) return Promise.resolve(false);
        try {
            return Promise.resolve(D.saveWallpaper(clonePlain(model)));
        } catch (e) {
            return Promise.resolve(false);
        }
    }

    function apply(workOrder, hooks) {
        hooks = hooks || {};
        var validation = validateWorkOrder(workOrder);
        if (!validation.valid) return Promise.resolve(validation);
        var previousModel = clonePlain(currentWallpaper());
        var previousSource = normalizeSource(previousModel.activeSource);
        var nextSource = normalizeSource(workOrder.pendingSource);
        var preparedResult = null;
        return prepareWorkOrder(workOrder, hooks).then(function (prepared) {
            preparedResult = prepared;
            return commitWorkOrder(workOrder);
        }).then(function () {
            return reloadWallpaper().catch(function (err) {
                return restoreWallpaper(previousModel).then(function () {
                    throw err;
                });
            });
        }).then(function () {
            return cleanupPreviousSource(previousSource, nextSource).catch(function (err) {
                return { cleanupError: err && err.message ? err.message : String(err || '') };
            });
        }).then(function () {
            return { state: 'Applied', valid: true, reasonKey: 'wallpaperApplyNoChanges', message: '' };
        }).catch(function (err) {
            return rollbackPrepared(preparedResult).then(function () {
                return { state: 'Error', valid: false, reasonKey: 'wallpaperApplyFailed', message: err && err.message ? err.message : String(err || '') };
            }, function (rollbackErr) {
                var message = err && err.message ? err.message : String(err || '');
                var rollbackMessage = rollbackErr && rollbackErr.message ? rollbackErr.message : String(rollbackErr || '');
                return { state: 'Error', valid: false, reasonKey: 'wallpaperApplyFailed', message: message + (rollbackMessage ? ('; rollback failed: ' + rollbackMessage) : '') };
            });
        });
    }

    window.WallpaperApply = {
        validateWorkOrder: validateWorkOrder,
        prepareWorkOrder: prepareWorkOrder,
        commitWorkOrder: commitWorkOrder,
        cleanupPreviousSource: cleanupPreviousSource,
        apply: apply
    };
})();
