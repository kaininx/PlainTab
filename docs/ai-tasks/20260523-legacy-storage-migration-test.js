const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..', '..');

function createLocalStorage(seed) {
    const store = Object.assign({}, seed || {});
    return {
        getItem(key) {
            return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
        },
        setItem(key, value) {
            store[key] = String(value);
        },
        removeItem(key) {
            delete store[key];
        },
        dump() {
            return Object.assign({}, store);
        }
    };
}

function runScript(context, relativePath) {
    const filename = path.join(ROOT, relativePath);
    if (!fs.existsSync(filename)) return;
    const source = fs.readFileSync(filename, 'utf8');
    vm.runInContext(source, context, { filename });
}

async function loadWallpaperData(seed, options) {
    const localStorage = createLocalStorage(seed);
    const window = {};
    const context = vm.createContext({
        window,
        localStorage,
        indexedDB: options && options.indexedDB ? options.indexedDB : {},
        console,
        Promise,
        JSON,
        Date,
        Math,
        String,
        Number,
        parseInt,
        parseFloat,
        URL
    });
    runScript(context, 'js/wallpaper/data.js');
    runScript(context, 'js/wallpaper/migrate.js');
    return { D: window.WallpaperData, localStorage };
}

async function testPreloadFallsBackToLegacyLocalThumb() {
    const localStorage = createLocalStorage({
        ptab_mode: 'local',
        ptab_img_order: JSON.stringify(['abc', 'def']),
        ptab_img_thumbs: JSON.stringify({
            abc: 'url(data:image/jpeg;base64,abc)',
            def: 'url(data:image/jpeg;base64,def)'
        }),
        ptab_local_index: '1',
        ptab_bing_thumb: 'url(data:image/jpeg;base64,bing)'
    });
    const wallpaperBack = { style: {} };
    const context = vm.createContext({
        localStorage,
        document: {
            getElementById(id) {
                return id === 'wallpaperBack' ? wallpaperBack : null;
            }
        },
        JSON,
        parseInt
    });

    runScript(context, 'js/preload.js');

    assert.strictEqual(wallpaperBack.style.backgroundImage, 'url(data:image/jpeg;base64,def)');
}

async function testMigratesLegacyV2UploadWallpaperAndCleansOldData() {
    const legacyBing = { blob: 'bing-blob', mime: 'image/jpeg', name: 'bing.jpg' };
    const legacyUploadA = { blob: 'upload-a', mime: 'image/png', name: 'a.png' };
    const legacyUploadB = { blob: 'upload-b', mime: 'image/png', name: 'b.png' };
    const writes = {};
    const deletes = [];
    const { D, localStorage } = await loadWallpaperData({
        ptab_version: '2',
        ptab_lang: 'zh-CN',
        ptab_mode: 'local',
        ptab_img_order: JSON.stringify(['abc', 'def', 'missing']),
        ptab_img_thumbs: JSON.stringify({
            abc: 'url(data:image/png;base64,abc)',
            def: 'url(data:image/png;base64,def)',
            missing: 'url(data:image/png;base64,missing)'
        }),
        ptab_local_index: '1',
        ptab_bing_thumb: 'url(data:image/jpeg;base64,bing)',
        ptab_search_mode: 'hover',
        ptab_search_engine: 'duckduckgo'
    }, {
        indexedDB: { open() { } }
    });

    D.idbGet = function (key) {
        if (key === 'ptab_bing_blob') return Promise.resolve(legacyBing);
        if (key === 'ptab_img_abc') return Promise.resolve(legacyUploadA);
        if (key === 'ptab_img_def') return Promise.resolve(legacyUploadB);
        return Promise.resolve(null);
    };
    D.idbPut = function (key, value) {
        writes[key] = value;
        return Promise.resolve();
    };
    D.idbDeleteMany = function (keys) {
        deletes.push(...keys);
        return Promise.resolve();
    };

    await D.migrate();

    assert.strictEqual(writes.ptab_wallpaper_blob_bing, undefined);
    assert.strictEqual(writes.ptab_wallpaper_blob_upload_abc, legacyUploadA);
    assert.strictEqual(writes.ptab_wallpaper_blob_upload_def, legacyUploadB);
    assert.strictEqual(writes.ptab_wallpaper_blob_upload_missing, undefined);

    assert.strictEqual(localStorage.getItem('ptab_schema_version'), '3');
    assert.strictEqual(localStorage.getItem('ptab_legacy_v2_migrated'), '1');
    assert.strictEqual(localStorage.getItem('ptab_locale'), null);

    const wallpaper = JSON.parse(localStorage.getItem('ptab_wallpaper'));
    assert.strictEqual(wallpaper.activeSource, 'upload');
    assert.deepStrictEqual(wallpaper.cache.order, ['upload_abc', 'upload_def']);
    assert.strictEqual(wallpaper.cache.index, 1);

    const thumbs = JSON.parse(localStorage.getItem('ptab_wallpaper_thumbs'));
    assert.strictEqual(thumbs.upload_abc, 'url(data:image/png;base64,abc)');
    assert.strictEqual(thumbs.upload_def, 'url(data:image/png;base64,def)');
    assert.strictEqual(thumbs.upload_missing, undefined);
    assert.strictEqual(thumbs.bing, undefined);
    assert.strictEqual(localStorage.getItem('ptab_wallpaper_preview'), 'url(data:image/png;base64,def)');

    assert.strictEqual(localStorage.getItem('ptab_version'), null);
    assert.strictEqual(localStorage.getItem('ptab_img_order'), null);
    assert.strictEqual(localStorage.getItem('ptab_img_thumbs'), null);
    assert.strictEqual(localStorage.getItem('ptab_local_index'), null);
    assert.strictEqual(localStorage.getItem('ptab_lang'), null);
    assert.strictEqual(localStorage.getItem('ptab_search_mode'), null);
    assert.ok(deletes.includes('ptab_bing_blob'));
    assert.ok(deletes.includes('ptab_img_abc'));
    assert.ok(deletes.includes('ptab_img_def'));
    assert.ok(deletes.includes('ptab_img_missing'));
}

async function main() {
    await testPreloadFallsBackToLegacyLocalThumb();
    await testMigratesLegacyV2UploadWallpaperAndCleansOldData();
    console.log('legacy storage migration tests passed');
}

main().catch((error) => {
    console.error(error && error.stack || error);
    process.exit(1);
});
