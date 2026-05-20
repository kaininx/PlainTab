const assert = require('assert');
const vm = require('vm');
const fs = require('fs');

function createStorage(seed) {
  const data = Object.assign({}, seed || {});
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem(key, value) {
      data[key] = String(value);
    },
    removeItem(key) {
      delete data[key];
    },
    dump() {
      return Object.assign({}, data);
    },
  };
}

function createIndexedDB(seed) {
  const storeData = Object.assign({}, seed || {});
  return {
    dump() {
      return Object.assign({}, storeData);
    },
    open() {
      const request = {};
      const db = {
        objectStoreNames: {
          contains() {
            return true;
          },
        },
        transaction() {
          const tx = {};
          const store = {
            put(value, key) {
              storeData[key] = value;
            },
            get(key) {
              const req = {};
              setTimeout(() => {
                req.result = storeData[key];
                if (req.onsuccess) req.onsuccess();
              }, 0);
              return req;
            },
            delete(key) {
              delete storeData[key];
            },
          };
          tx.objectStore = () => store;
          setTimeout(() => {
            if (tx.oncomplete) tx.oncomplete();
          }, 0);
          return tx;
        },
      };
      setTimeout(() => {
        request.result = db;
        if (request.onsuccess) request.onsuccess({ target: { result: db } });
      }, 0);
      return request;
    },
  };
}

async function loadDataModule(localSeed, idbSeed) {
  const localStorage = createStorage(localSeed);
  const indexedDB = createIndexedDB(idbSeed);
  const context = {
    window: {},
    localStorage,
    indexedDB,
    console,
    setTimeout,
    Promise,
    Date,
    Math,
    JSON,
    Blob: function Blob(parts, opts) {
      this.parts = parts;
      this.type = opts && opts.type || '';
      this.size = parts && parts[0] && parts[0].size || 0;
    },
  };
  context.window = context;
  vm.createContext(context);
  const code = fs.readFileSync('js/wallpaper/data.js', 'utf8');
  vm.runInContext(code, context);
  return { context, localStorage, indexedDB };
}

async function testInitializesEmptyInstallAsCurrentSchema() {
  const { context, localStorage } = await loadDataModule({}, {});

  await context.WallpaperData.migrate();
  const ls = localStorage.dump();

  assert.strictEqual(context.WallpaperData.BASELINE_APP_VERSION, '3.2.1');
  assert.strictEqual(ls.ptab_schema_version, '3');
  assert.strictEqual(context.WallpaperData.getActiveSource(), 'bing');
  assert.deepStrictEqual(context.WallpaperData.loadOrder(), []);
  assert.strictEqual(context.WallpaperData.loadUI().search.visibility, 'always');
}

async function testDoesNotMigrateLegacyV2Data() {
  const { context, localStorage, indexedDB } = await loadDataModule({
    ptab_version: '2',
    ptab_mode: 'local',
    ptab_img_order: JSON.stringify(['a1']),
    ptab_img_thumbs: JSON.stringify({ a1: 'url(data:image/jpeg;base64,a)' }),
    ptab_lang: 'zh-CN',
  }, {
    ptab_img_a1: { blob: { size: 10, type: 'image/jpeg' }, mime: 'image/jpeg', name: 'A.jpg' },
  });

  await context.WallpaperData.migrate();
  const ls = localStorage.dump();
  const idb = indexedDB.dump();

  assert.strictEqual(ls.ptab_schema_version, '3');
  assert.strictEqual(ls.ptab_version, '2', 'legacy version marker should be left untouched');
  assert.strictEqual(ls.ptab_mode, 'local', 'legacy mode should not be converted into current model');
  assert.strictEqual(ls.ptab_wallpaper, undefined, 'current wallpaper model should not be synthesized from legacy data');
  assert.strictEqual(idb.ptab_img_a1.name, 'A.jpg', 'legacy IDB records should not be renamed on startup');
}

async function testCurrentV3DataIsPreserved() {
  const currentWallpaper = {
    activeSource: 'upload',
    providers: {
      bing: { config: { mkt: 'auto' }, state: { src: '', date: '', provider: '' } },
      upload: { config: { rotation: 'sequential' }, state: {} },
      folder: { config: { pathLabel: '', strategy: 'random' }, state: {} },
      rss: { config: { url: '', strategy: 'latest', refreshIntervalMs: 300000 }, state: { lastCheckedAt: 0, lastSuccessAt: 0, lastImageUrl: '', lastError: '' } },
      api: { config: { url: '', jsonPath: '', refreshIntervalMs: 300000 }, state: { lastCheckedAt: 0, lastSuccessAt: 0, lastImageUrl: '', lastError: '' } },
    },
    cache: { order: ['upload_a1'], index: 0, meta: { upload_a1: { name: 'A.jpg', size: 10 } } },
  };
  const { context, localStorage } = await loadDataModule({
    ptab_schema_version: '3',
    ptab_wallpaper: JSON.stringify(currentWallpaper),
    ptab_wallpaper_thumbs: JSON.stringify({ upload_a1: 'url(data:image/jpeg;base64,a)' }),
    ptab_wallpaper_preview: 'url(data:image/jpeg;base64,a)',
  }, {});

  await context.WallpaperData.migrate();
  const ls = localStorage.dump();

  assert.strictEqual(ls.ptab_schema_version, '3');
  assert.strictEqual(JSON.parse(ls.ptab_wallpaper).activeSource, 'upload');
  assert.deepStrictEqual(context.WallpaperData.loadOrder(), ['upload_a1']);
  assert.strictEqual(context.WallpaperData.loadPreview(), 'url(data:image/jpeg;base64,a)');
}

async function testPublicStorageConstantsExposeOnlyCurrentV3Keys() {
  const { context } = await loadDataModule({}, {});

  assert.deepStrictEqual(Object.keys(context.WallpaperData.KEYS).sort(), [
    'LOCALE',
    'SCHEMA_VERSION',
    'SHORTCUTS',
    'SHORTCUT_ICONS',
    'UI',
    'WALLPAPER',
    'WALLPAPER_BLUR_THUMBS',
    'WALLPAPER_PREVIEW',
    'WALLPAPER_THUMBS',
  ].sort());

  assert.deepStrictEqual(Object.keys(context.WallpaperData.DB).sort(), [
    'API_BLOB',
    'BING_BLOB',
    'FOLDER_FILES',
    'FOLDER_HANDLE',
    'FOLDER_LIGHT_PREFIX',
    'NAME',
    'RSS_PREFIX',
    'STORE',
    'UPLOAD_PREFIX',
    'WALLHAVEN_PREFIX',
  ].sort());
}

function testStartupChecksSchemaBeforeSettingsPanelReadsStorage() {
  const source = fs.readFileSync('js/newtab.js', 'utf8');
  const initIndex = source.indexOf('function init()');
  const migrateIndex = source.indexOf('D.migrate()', initIndex);
  const settingsIndex = source.indexOf('SP.init()', initIndex);

  assert.ok(initIndex !== -1, 'newtab init function should exist');
  assert.ok(migrateIndex !== -1, 'newtab init should call D.migrate()');
  assert.ok(settingsIndex !== -1, 'newtab init should call SP.init()');
  assert.ok(
    migrateIndex < settingsIndex,
    'newtab should establish current schema before SettingsPanel.init reads packed v3 settings'
  );
}

function testBingCacheWritesBlobBeforeMetadataReference() {
  const source = fs.readFileSync('js/wallpaper/fetch.js', 'utf8');
  const downloadIndex = source.indexOf('function downloadAndStore()');
  const putIndex = source.indexOf('D.idbPut(D.DB.BING_BLOB', downloadIndex);
  const metaIndex = source.indexOf('D.saveBingMeta(meta)', downloadIndex);

  assert.ok(downloadIndex !== -1, 'cacheBingBlob should keep downloadAndStore helper');
  assert.ok(putIndex !== -1, 'downloadAndStore should write the Bing blob to IDB');
  assert.ok(metaIndex !== -1, 'downloadAndStore should write Bing metadata');
  assert.ok(
    putIndex < metaIndex,
    'Bing cache should store the blob before writing metadata that references it'
  );
}

async function run() {
  await testInitializesEmptyInstallAsCurrentSchema();
  await testDoesNotMigrateLegacyV2Data();
  await testCurrentV3DataIsPreserved();
  await testPublicStorageConstantsExposeOnlyCurrentV3Keys();
  testStartupChecksSchemaBeforeSettingsPanelReadsStorage();
  testBingCacheWritesBlobBeforeMetadataReference();
  console.log('storage v3 baseline tests passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
