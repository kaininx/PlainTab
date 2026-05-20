/**
 * WallpaperFolder —— 本地文件夹壁纸能力层
 * 只封装 File System Access API、目录索引和文件预览准备。
 */
(function () {
    'use strict';

    var D = window.WallpaperData;
    var S = window.WallpaperShow;
    var FIRST_BATCH_LIMIT = 48;
    var PREVIEW_WINDOW_LIMIT = 12;
    var LIGHT_CACHE_MAX_SIDE = 1920;
    var LIGHT_CACHE_QUALITY = 0.82;
    var IMAGE_EXT_RE = /\.(jpe?g|png|webp|avif|gif|bmp)$/i;

    function folderError(code, message) {
        var err = new Error(message || code);
        err.code = code;
        return err;
    }

    function isSupported() {
        return typeof window.showDirectoryPicker === 'function';
    }

    function pickDirectory() {
        if (!isSupported()) return Promise.reject(folderError('FOLDER_UNSUPPORTED', 'directory picker unsupported'));
        return window.showDirectoryPicker({ mode: 'read' });
    }

    function queryReadPermission(handle) {
        if (!handle || typeof handle.queryPermission !== 'function') return Promise.resolve('granted');
        return Promise.resolve(handle.queryPermission({ mode: 'read' })).catch(function () { return 'denied'; });
    }

    function requestReadPermission(handle) {
        if (!handle || typeof handle.requestPermission !== 'function') return Promise.resolve('granted');
        return Promise.resolve(handle.requestPermission({ mode: 'read' })).catch(function () { return 'denied'; });
    }

    function ensureReadPermission(handle, request) {
        return queryReadPermission(handle).then(function (state) {
            if (state === 'granted') return true;
            if (!request) throw folderError('FOLDER_PERMISSION_DENIED', 'folder permission denied');
            return requestReadPermission(handle).then(function (nextState) {
                if (nextState === 'granted') return true;
                throw folderError('FOLDER_PERMISSION_DENIED', 'folder permission denied');
            });
        });
    }

    function isSupportedImageName(name) {
        return IMAGE_EXT_RE.test(String(name || ''));
    }

    function normalizeFileRecord(record) {
        record = record || {};
        var name = String(record.name || '').trim();
        if (!name || !isSupportedImageName(name)) return null;
        return {
            name: name,
            size: Math.max(0, parseInt(record.size, 10) || 0),
            lastModified: Math.max(0, parseInt(record.lastModified, 10) || 0)
        };
    }

    function fileRecord(file) {
        return normalizeFileRecord(file);
    }

    function scanDirectory(handle, options) {
        options = options || {};
        var limit = parseInt(options.limit, 10) || 0;
        var files = [];
        var completed = true;

        return ensureReadPermission(handle, options.requestPermission === true).then(async function () {
            if (!handle || typeof handle.values !== 'function') throw folderError('FOLDER_INVALID_HANDLE', 'invalid folder handle');
            for await (var entry of handle.values()) {
                if (!entry || entry.kind !== 'file' || !isSupportedImageName(entry.name)) continue;
                files.push({ name: String(entry.name || '') });
                if (limit && files.length >= limit) {
                    completed = false;
                    break;
                }
            }
            return { files: files, completed: completed };
        });
    }

    function scanFirstBatch(handle, limit) {
        return scanDirectory(handle, { limit: limit || FIRST_BATCH_LIMIT, requestPermission: true });
    }

    function readImageFile(handle, name) {
        if (!handle || typeof handle.getFileHandle !== 'function') {
            return Promise.reject(folderError('FOLDER_INVALID_HANDLE', 'invalid folder handle'));
        }
        if (!isSupportedImageName(name)) {
            return Promise.reject(folderError('FOLDER_UNSUPPORTED_IMAGE', 'unsupported image file'));
        }
        return ensureReadPermission(handle, false).then(function () {
            return handle.getFileHandle(name);
        }).then(function (fileHandle) {
            if (!fileHandle || typeof fileHandle.getFile !== 'function') throw folderError('FOLDER_FILE_NOT_FOUND', 'file not found');
            return fileHandle.getFile();
        }).then(function (file) {
            if (!file || !isSupportedImageName(file.name || name)) throw folderError('FOLDER_UNSUPPORTED_IMAGE', 'unsupported image file');
            return file;
        }).catch(function (err) {
            if (err && err.code) throw err;
            if (err && (err.name === 'NotFoundError' || err.name === 'NotAllowedError')) {
                throw folderError(err.name === 'NotAllowedError' ? 'FOLDER_PERMISSION_DENIED' : 'FOLDER_FILE_NOT_FOUND', err.message || err.name);
            }
            throw err;
        });
    }

    function shuffle(values) {
        var list = values.slice();
        for (var i = list.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = list[i];
            list[i] = list[j];
            list[j] = temp;
        }
        return list;
    }

    function buildShuffleBag(files, currentName) {
        var seen = {};
        var names = (Array.isArray(files) ? files : []).map(function (file) {
            return String(file && file.name || '').trim();
        }).filter(function (name) {
            if (!name || name === currentName || seen[name]) return false;
            seen[name] = true;
            return true;
        });
        return shuffle(names);
    }

    function buildPreviewWindow(files, currentName, shuffleBag, limit) {
        limit = parseInt(limit, 10) || PREVIEW_WINDOW_LIMIT;
        var seen = {};
        var allNames = (Array.isArray(files) ? files : []).map(function (file) {
            return String(file && file.name || '').trim();
        }).filter(function (name) {
            if (!name || seen[name]) return false;
            seen[name] = true;
            return true;
        });
        if (allNames.length <= limit) return allNames;

        var valid = {};
        allNames.forEach(function (name) { valid[name] = true; });
        var windowNames = [];
        function add(name) {
            name = String(name || '').trim();
            if (!name || !valid[name] || windowNames.indexOf(name) !== -1 || windowNames.length >= limit) return;
            windowNames.push(name);
        }

        add(currentName);
        (Array.isArray(shuffleBag) ? shuffleBag : []).forEach(add);
        allNames.forEach(add);
        return windowNames.slice(0, limit);
    }

    function preparePreviewFromFile(file, id, blur) {
        if (!file) return Promise.reject(folderError('FOLDER_FILE_NOT_FOUND', 'file not found'));
        var url = URL.createObjectURL(file);
        var normalizedBlur = D && D.normalizeWallpaperBlur ? D.normalizeWallpaperBlur(blur) : 0;
        var thumbPromise = S.thumbnail(url);
        var previewPromise = normalizedBlur >= 5 && S.blurredThumbnail ? S.blurredThumbnail(url, normalizedBlur) : thumbPromise;

        return Promise.all([thumbPromise, previewPromise]).then(function (values) {
            URL.revokeObjectURL(url);
            var thumb = values[0];
            var preview = values[1] || thumb;
            if (!thumb || !preview) throw folderError('FOLDER_THUMBNAIL_FAILED', 'folder thumbnail failed');
            return { id: id, thumb: thumb, preview: preview };
        }, function (err) {
            URL.revokeObjectURL(url);
            throw err;
        });
    }

    function imageFromUrl(url) {
        return new Promise(function (resolve, reject) {
            var img = new Image();
            img.onload = function () { resolve(img); };
            img.onerror = function () { reject(folderError('FOLDER_LIGHT_CACHE_FAILED', 'folder light cache failed')); };
            img.src = url;
        });
    }

    function canvasToBlob(canvas, type, quality) {
        return new Promise(function (resolve, reject) {
            if (!canvas.toBlob) {
                reject(folderError('FOLDER_LIGHT_CACHE_FAILED', 'canvas toBlob unsupported'));
                return;
            }
            canvas.toBlob(function (blob) {
                if (blob) resolve(blob);
                else reject(folderError('FOLDER_LIGHT_CACHE_FAILED', 'folder light cache failed'));
            }, type, quality);
        });
    }

    function prepareLightCacheFromFile(file, id) {
        if (!file) return Promise.reject(folderError('FOLDER_FILE_NOT_FOUND', 'file not found'));
        var url = URL.createObjectURL(file);
        return imageFromUrl(url).then(function (img) {
            var maxSide = Math.max(img.width || 0, img.height || 0);
            var scale = maxSide > LIGHT_CACHE_MAX_SIDE ? LIGHT_CACHE_MAX_SIDE / maxSide : 1;
            var width = Math.max(1, Math.round((img.width || 1) * scale));
            var height = Math.max(1, Math.round((img.height || 1) * scale));
            var canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            return canvasToBlob(canvas, 'image/jpeg', LIGHT_CACHE_QUALITY).then(function (blob) {
                canvas.width = 0;
                canvas.height = 0;
                URL.revokeObjectURL(url);
                return {
                    id: id,
                    record: {
                        blob: blob,
                        mime: blob.type || 'image/jpeg',
                        name: file.name || '',
                        size: file.size || 0,
                        lastModified: file.lastModified || 0,
                        cachedAt: Date.now(),
                        source: 'folder-light'
                    }
                };
            }, function (err) {
                canvas.width = 0;
                canvas.height = 0;
                URL.revokeObjectURL(url);
                throw err;
            });
        }, function (err) {
            URL.revokeObjectURL(url);
            throw err;
        });
    }

    function prewarmThumbs(handle, names, blur, limit) {
        if (!handle || !D || !S || !readImageFile || !preparePreviewFromFile || !names || !names.length) return Promise.resolve(false);
        limit = parseInt(limit, 10) || PREVIEW_WINDOW_LIMIT;
        var chain = Promise.resolve(false);
        names.slice(0, limit).forEach(function (name) {
            chain = chain.then(function (changed) {
                var id = D.folderId(name);
                var hasThumb = !!D.loadThumbs()[id];
                var hasBlur = blur < 5 || !D.blurThumbFor || !!D.blurThumbFor(id, blur);
                if (hasThumb && hasBlur) return changed;
                return readImageFile(handle, name).then(function (file) {
                    return preparePreviewFromFile(file, id, blur);
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

    function prewarmLightCache(handle, names, limit) {
        if (!handle || !D || !readImageFile || !prepareLightCacheFromFile || !D.saveFolderLightCache || !names || !names.length) {
            return Promise.resolve(false);
        }
        limit = parseInt(limit, 10) || PREVIEW_WINDOW_LIMIT;
        var chain = Promise.resolve(false);
        names.slice(0, limit).forEach(function (name) {
            chain = chain.then(function (changed) {
                var id = D.folderId(name);
                return readImageFile(handle, name).then(function (file) {
                    return (D.loadFolderLightCache ? D.loadFolderLightCache(name) : Promise.resolve(null)).then(function (existing) {
                        if (existing && existing.blob && existing.size === file.size && existing.lastModified === file.lastModified) return changed;
                        return prepareLightCacheFromFile(file, id).then(function (prepared) {
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

    function pruneThumbs(names) {
        if (!D || !D.loadThumbs || !D.saveThumbs || !D.folderId) return false;
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
        return changed;
    }

    function pruneLightCache(names) {
        if (!D || !D.idbKeys || !D.idbDeleteMany || !D.DB || !D.DB.FOLDER_LIGHT_PREFIX) return Promise.resolve(false);
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

    function prepareMount(handle, options) {
        options = options || {};
        return scanFirstBatch(handle, options.limit || FIRST_BATCH_LIMIT).then(function (scan) {
            if (!scan.files.length) throw folderError('FOLDER_NO_IMAGES', 'no supported images');

            var usable = [];
            function tryNext(index) {
                if (index >= scan.files.length) throw folderError('FOLDER_NO_USABLE_IMAGES', 'no usable images');
                var name = scan.files[index].name;
                return readImageFile(handle, name).then(function (file) {
                    var record = fileRecord(file) || scan.files[index];
                    var id = D.folderId(record.name);
                    return preparePreviewFromFile(file, id, options.blur).then(function (prepared) {
                        usable.push(record);
                        scan.files.forEach(function (item) {
                            if (item.name !== record.name) usable.push(item);
                        });
                        var shuffleBag = buildShuffleBag(usable, record.name);
                        return {
                            handle: handle,
                            pathLabel: String(handle && handle.name || ''),
                            files: usable,
                            completed: scan.completed,
                            firstName: record.name,
                            firstFile: file,
                            firstRecord: record,
                            firstId: id,
                            preview: prepared.preview,
                            thumb: prepared.thumb,
                            shuffleBag: shuffleBag,
                            previewWindow: buildPreviewWindow(usable, '', [record.name].concat(shuffleBag))
                        };
                    });
                }).catch(function () {
                    return tryNext(index + 1);
                });
            }

            return tryNext(0);
        });
    }

    function rescan(handle, options) {
        return scanDirectory(handle, options || {});
    }

    window.WallpaperFolder = {
        isSupported: isSupported,
        pickDirectory: pickDirectory,
        queryReadPermission: queryReadPermission,
        requestReadPermission: requestReadPermission,
        ensureReadPermission: ensureReadPermission,
        isSupportedImageName: isSupportedImageName,
        scanDirectory: scanDirectory,
        scanFirstBatch: scanFirstBatch,
        readImageFile: readImageFile,
        fileRecord: fileRecord,
        buildShuffleBag: buildShuffleBag,
        buildPreviewWindow: buildPreviewWindow,
        prewarmThumbs: prewarmThumbs,
        prewarmLightCache: prewarmLightCache,
        pruneThumbs: pruneThumbs,
        pruneLightCache: pruneLightCache,
        prepareMount: prepareMount,
        preparePreviewFromFile: preparePreviewFromFile,
        prepareLightCacheFromFile: prepareLightCacheFromFile,
        rescan: rescan,
        error: folderError
    };
})();
