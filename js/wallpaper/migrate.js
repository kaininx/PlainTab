/**
 * One-time storage bridge for PlainTab legacy storage version 2.
 *
 * Runtime modules should continue to read only the schema 3 model from
 * WallpaperData. This file keeps user-uploaded wallpapers when upgrades move
 * from the version 2 upload queue to the schema 3 upload provider.
 */
(function () {
    'use strict';

    var D = window.WallpaperData;
    if (!D) return;

    var baseMigrate = D.migrate || function () { return Promise.resolve(); };
    var LEGACY_SCHEMA_KEY = 'ptab_version';
    var LEGACY_BING_BLOB = 'ptab_bing_blob';
    var LEGACY_UPLOAD_PREFIX = 'ptab_img_';

    var LEGACY_KEYS = [
        LEGACY_SCHEMA_KEY,
        'ptab_lang',
        'ptab_mode',
        'ptab_bing_thumb',
        'ptab_bing_meta',
        'ptab_img_order',
        'ptab_img_thumbs',
        'ptab_local_index',
        'bing_thumb',
        'ptab_wallpaper_source',
        'ptab_search_visibility',
        'ptab_search_mode',
        'ptab_icon_opacity',
        'ptab_search_engine',
        'local_thumbs'
    ];

    function readJSON(key, fallback) {
        try {
            var raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) {
            return fallback;
        }
    }

    function hasLegacyStorage() {
        return LEGACY_KEYS.some(function (key) {
            return localStorage.getItem(key) !== null;
        });
    }

    function hasIndexedDB() {
        return typeof indexedDB !== 'undefined' && indexedDB && typeof indexedDB.open === 'function';
    }

    function uploadId(rawId) {
        rawId = String(rawId || '').trim();
        if (!rawId) return '';
        return rawId.indexOf('upload_') === 0 ? rawId : 'upload_' + rawId;
    }

    function legacyUploadId(id) {
        id = String(id || '').trim();
        return id.indexOf('upload_') === 0 ? id.slice(7) : id;
    }

    function normalizeLegacyOrder(order) {
        var seen = {};
        return (Array.isArray(order) ? order : []).map(uploadId).filter(function (id) {
            if (!id || seen[id]) return false;
            seen[id] = true;
            return true;
        });
    }

    function normalizeIndex(value, length) {
        var index = parseInt(value, 10) || 0;
        if (!length) return 0;
        if (index < 0) return 0;
        return Math.min(index, length - 1);
    }

    function isDefaultOrBingWallpaper(model) {
        var active = D.normalizeSource(model && model.activeSource);
        var order = model && model.cache && Array.isArray(model.cache.order) ? model.cache.order : [];
        return active === 'bing' && order.every(function (id) { return id === 'bing'; });
    }

    function migrateUploadBlobs(legacyOrder) {
        var normalized = normalizeLegacyOrder(legacyOrder);
        if (!normalized.length) return Promise.resolve([]);
        if (!hasIndexedDB()) return Promise.resolve([]);

        return Promise.all(normalized.map(function (newId) {
            var legacyId = legacyUploadId(newId);
            return D.idbGet(LEGACY_UPLOAD_PREFIX + legacyId).then(function (record) {
                if (!record) return null;
                return D.idbPut(D.imgKey(newId), D.imageRecord(record)).then(function () {
                    return newId;
                });
            }).catch(function () {
                return null;
            });
        })).then(function (ids) {
            return ids.filter(Boolean);
        });
    }

    function migrateThumbs(validUploadOrder) {
        if (!validUploadOrder.length) return null;
        var thumbs = D.loadThumbs();
        var legacyUploadThumbs = readJSON('ptab_img_thumbs', {});
        var legacyArrayThumbs = readJSON('local_thumbs', []);

        validUploadOrder.forEach(function (newId, index) {
            var legacyId = legacyUploadId(newId);
            if (!thumbs[newId] && legacyUploadThumbs[legacyId]) thumbs[newId] = legacyUploadThumbs[legacyId];
            if (!thumbs[newId] && legacyArrayThumbs[index]) thumbs[newId] = legacyArrayThumbs[index];
        });
        D.saveThumbs(thumbs);
        return thumbs;
    }

    function migrateWallpaper(validUploadOrder, thumbs) {
        var legacyMode = localStorage.getItem('ptab_mode') || localStorage.getItem('ptab_wallpaper_source') || 'bing';
        var hasLegacyUploads = validUploadOrder.length > 0;
        var legacyWantsUpload = legacyMode === 'local' && hasLegacyUploads;
        var model = D.loadWallpaper();
        var shouldApplyLegacy = isDefaultOrBingWallpaper(model);

        if (!shouldApplyLegacy) return;
        if (!legacyWantsUpload) return;

        model.activeSource = 'upload';
        model.cache.order = validUploadOrder.slice();
        model.cache.index = normalizeIndex(localStorage.getItem('ptab_local_index'), validUploadOrder.length);
        D.saveWallpaper(model);

        var preview = thumbs[validUploadOrder[model.cache.index]] || '';
        if (preview) D.savePreview(preview);
    }

    function cleanupLegacyData(legacyOrder) {
        LEGACY_KEYS.forEach(function (key) {
            try { localStorage.removeItem(key); } catch (e) { }
        });

        if (!hasIndexedDB()) return Promise.resolve();
        var keys = [LEGACY_BING_BLOB, 'bing', 'local_images'];
        normalizeLegacyOrder(legacyOrder).forEach(function (newId) {
            keys.push(LEGACY_UPLOAD_PREFIX + legacyUploadId(newId));
        });
        return D.idbDeleteMany(keys).catch(function () { });
    }

    function migrateLegacyStorage() {
        if (!hasLegacyStorage()) return baseMigrate();

        var legacyOrder = readJSON('ptab_img_order', []);
        return migrateUploadBlobs(legacyOrder).then(function (validUploadOrder) {
            var thumbs = migrateThumbs(validUploadOrder);
            if (thumbs) migrateWallpaper(validUploadOrder, thumbs);
            return cleanupLegacyData(legacyOrder);
        }).then(function () {
            try {
                localStorage.setItem(D.KEYS.SCHEMA_VERSION, D.LS_VERSION);
            } catch (e) { }
            return Promise.resolve();
        });
    }

    D.migrate = migrateLegacyStorage;
    D.legacyStorageMigration = {
        migrate: migrateLegacyStorage
    };
})();
