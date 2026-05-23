const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function count(text, needle) {
  return text.split(needle).length - 1;
}

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
    },
  };
}

function createIndexedDB(seed) {
  const data = Object.assign({}, seed || {});
  return {
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
              data[key] = value;
            },
            get(key) {
              const req = {};
              setTimeout(() => {
                req.result = data[key];
                if (req.onsuccess) req.onsuccess();
              }, 0);
              return req;
            },
            delete(key) {
              delete data[key];
            },
            getAllKeys() {
              const req = {};
              setTimeout(() => {
                req.result = Object.keys(data);
                if (req.onsuccess) req.onsuccess();
              }, 0);
              return req;
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

function runScript(context, relativePath) {
  const filename = path.join(ROOT, relativePath);
  vm.runInContext(read(relativePath), context, { filename });
}

function createDataContext(localSeed, idbSeed) {
  const localStorage = createLocalStorage(localSeed);
  const indexedDB = createIndexedDB(idbSeed);
  const context = vm.createContext({
    window: {},
    localStorage,
    indexedDB,
    console,
    setTimeout,
    Promise,
    JSON,
    Date,
    Math,
    String,
    Number,
    parseInt,
    parseFloat,
    URL,
    Blob: function Blob(parts, opts) {
      this.parts = parts;
      this.type = (opts && opts.type) || '';
      this.size = parts && parts[0] && parts[0].size || 0;
    },
  });
  context.window = context;
  return { context, localStorage };
}

async function loadData(localSeed, idbSeed) {
  const env = createDataContext(localSeed, idbSeed);
  runScript(env.context, 'js/wallpaper/data.js');
  runScript(env.context, 'js/wallpaper/migrate.js');
  return { D: env.context.WallpaperData, localStorage: env.localStorage };
}

function sectionBetween(text, startHeading, endHeading) {
  const start = text.indexOf(startHeading);
  assert.ok(start >= 0, `missing section ${startHeading}`);
  const afterStart = start + startHeading.length;
  const end = text.indexOf(endHeading, afterStart);
  assert.ok(end >= 0, `missing section ${endHeading}`);
  return text.slice(afterStart, end);
}

function testPreloadKeepsPreviewFirstAndLight() {
  const preload = read('js/preload.js');
  const previewRead = "localStorage.getItem('ptab_wallpaper_preview')";
  assert.ok(preload.includes(previewRead), 'preload must read current first-paint preview');
  assert.ok(preload.indexOf(previewRead) < preload.indexOf("localStorage.getItem('ptab_bing_thumb')"), 'preview must be attempted before legacy fallback');
  assert.strictEqual(preload.includes('indexedDB'), false, 'preload must not touch IndexedDB');
  assert.strictEqual(preload.includes('fetch('), false, 'preload must not fetch');
  assert.strictEqual(preload.includes('createElement'), false, 'preload must not create DOM beyond existing back layer lookup');
  assert.ok(preload.indexOf('if (!t)') < preload.indexOf('JSON.parse(localStorage.getItem'), 'legacy JSON parsing must happen only after preview is absent');
  assert.ok(count(preload, 'JSON.parse(localStorage.getItem') <= 2, 'legacy fallback may parse only order and thumbnail maps');
}

function testRuntimeModulesDoNotOwnLocalStorage() {
  const forbidden = [
    ['js/newtab.js', 'localStorage.'],
    ['js/command-palette.js', 'localStorage.'],
    ['js/command-palette.js', 'ptab_shortcut_icons'],
    ['js/wallpaper/show.js', "localStorage.setItem('ptab_wallpaper_preview'"],
  ];
  forbidden.forEach(([file, needle]) => {
    assert.strictEqual(read(file).includes(needle), false, `${file} must not contain ${needle}`);
  });
}

function testStorageRulesDescribeCurrentSchemaOnly() {
  const storageRules = read('.claude/rules/10-storage.md');
  const currentKeySection = sectionBetween(storageRules, '当前 `localStorage` key：', 'legacy v2 key');
  [
    'ptab_schema_version',
    'ptab_locale',
    'ptab_wallpaper_preview',
    'ptab_ui',
    'ptab_wallpaper',
    'ptab_wallpaper_thumbs',
    'ptab_wallpaper_blur_thumbs',
    'ptab_shortcuts',
    'ptab_shortcut_icons',
  ].forEach((key) => {
    assert.ok(currentKeySection.includes(key), `current schema must document ${key}`);
  });
  assert.ok(storageRules.includes('experience.acknowledged'), 'experience acknowledgement model must be documented');
}

async function testSchema3FinalizationAddsCurrentDefaultsOnly() {
  const { D, localStorage } = await loadData({
    ptab_schema_version: '3',
    ptab_ui: JSON.stringify({ search: { historyLimit: 10, historyItems: ['plain'] } }),
  });

  await D.migrate();

  assert.strictEqual(localStorage.getItem('ptab_schema_version'), '3');

  const ui = JSON.parse(localStorage.getItem('ptab_ui'));
  assert.strictEqual(ui.search.historyLimit, 10, 'finalization must preserve existing UI settings');
  assert.deepStrictEqual(ui.search.historyItems, ['plain'], 'finalization must preserve existing search history');
  assert.deepStrictEqual(ui.experience.acknowledged, {});
}

async function testExperienceAcknowledgementApiIsGeneric() {
  const { D, localStorage } = await loadData({});

  assert.strictEqual(D.hasAcknowledgedExperience('firstUseHint', 1), false);
  assert.strictEqual(D.acknowledgeExperience('firstUseHint', 1), true);
  assert.strictEqual(D.hasAcknowledgedExperience('firstUseHint', 1), true);
  assert.strictEqual(D.hasAcknowledgedExperience('firstUseHint', 2), false);
  assert.strictEqual(D.acknowledgeExperience('firstUseHint', 2), true);
  assert.strictEqual(D.hasAcknowledgedExperience('firstUseHint', 2), true);

  const ui = JSON.parse(localStorage.getItem('ptab_ui'));
  assert.strictEqual(ui.experience.acknowledged.firstUseHint, 2);
}

async function main() {
  testPreloadKeepsPreviewFirstAndLight();
  testRuntimeModulesDoNotOwnLocalStorage();
  testStorageRulesDescribeCurrentSchemaOnly();
  await testSchema3FinalizationAddsCurrentDefaultsOnly();
  await testExperienceAcknowledgementApiIsGeneric();
  console.log('localStorage governance checks passed');
}

main().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});
