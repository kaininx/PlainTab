const assert = require('assert');
const path = require('path');

const repoRoot = path.join(__dirname, '..', '..');

function createLocalStorage(initial = {}) {
  const store = { ...initial };
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
    snapshot() {
      return { ...store };
    }
  };
}

function loadData(initial = {}) {
  Object.keys(require.cache).forEach((key) => {
    if (key.endsWith(path.join('js', 'wallpaper', 'data.js'))) delete require.cache[key];
  });
  global.window = {};
  global.localStorage = createLocalStorage(initial);
  global.indexedDB = {};
  require(path.join(repoRoot, 'js', 'wallpaper', 'data.js'));
  return global.window.WallpaperData;
}

function loadFetch(D, fetchImpl) {
  Object.keys(require.cache).forEach((key) => {
    if (key.endsWith(path.join('js', 'wallpaper', 'fetch.js'))) delete require.cache[key];
  });
  global.window = {
    WallpaperData: D,
    WallpaperShow: {},
    log() {},
    warn() {}
  };
  global.fetch = fetchImpl;
  require(path.join(repoRoot, 'js', 'wallpaper', 'fetch.js'));
  return global.window.WallpaperFetch;
}

function testBingResolutionStorageDefaultsAndMigration() {
  const D = loadData({
    ptab_wallpaper: JSON.stringify({
      activeSource: 'bing',
      providers: { bing: { config: { mkt: 'auto' }, state: {} } },
      cache: { order: ['bing'], index: 0, meta: { bing: {} } }
    }),
    ptab_schema_version: '3'
  });

  assert.strictEqual(D.LS_VERSION, 3, 'Bing resolution uses the existing wallpaper model without bumping LS schema');
  const wallpaper = D.loadWallpaper();
  assert.strictEqual(wallpaper.providers.bing.config.resolution, '1920x1080');
  assert.strictEqual(wallpaper.providers.bing.config.mkt, 'auto');
  return D.migrate().then(() => {
    assert.strictEqual(global.localStorage.getItem('ptab_schema_version'), '3');
    const stored = JSON.parse(global.localStorage.getItem('ptab_wallpaper'));
    assert.strictEqual(stored.providers.bing.config.resolution, undefined, 'migration should not rewrite the existing wallpaper model just to add the default field');
  });
}

function testBingResolutionNormalizationAndImport() {
  const D = loadData();
  D.saveWallpaper({
    activeSource: 'bing',
    providers: { bing: { config: { mkt: 'auto', resolution: 'invalid' }, state: {} } },
    cache: { order: ['bing'], index: 0, meta: { bing: {} } }
  });
  assert.strictEqual(D.loadWallpaper().providers.bing.config.resolution, '1920x1080');

  D.importUserData({
    data: {
      wallpaper: {
        activeSource: 'bing',
        providers: { bing: { config: { mkt: 'auto', resolution: 'UHD' }, state: {} } },
        cache: { order: ['bing'], index: 0, meta: { bing: {} } }
      }
    }
  });
  assert.strictEqual(D.loadWallpaper().providers.bing.config.resolution, 'UHD');
  assert.strictEqual(D.exportUserData().data.wallpaper.providers.bing.config.resolution, 'UHD');
}

async function testFetchUsesConfiguredBingResolution() {
  const D = loadData();
  const urls = [];
  const F = loadFetch(D, (url) => {
    urls.push(url);
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ url: 'https://example.test/bing.jpg' })
    });
  });

  await F.fetchBingUrl('en', { resolution: 'UHD' });
  assert(urls.length >= 2, 'both Bing metadata endpoints should be raced');
  assert(urls.every((url) => url.includes('resolution=UHD')), '4K config should request UHD metadata');

  urls.length = 0;
  await F.fetchBingUrl('en', {});
  assert(urls.every((url) => url.includes('resolution=1920x1080')), 'default Bing config should request 1920x1080 metadata');
}

function testSettingsExposeBingResolutionControl() {
  const fs = require('fs');
  const panel = fs.readFileSync(path.join(repoRoot, 'js', 'settings-panel.js'), 'utf8');
  const css = fs.readFileSync(path.join(repoRoot, 'css', 'settings.css'), 'utf8');
  assert(panel.includes("tr('bingResolution4K')"), 'Bing detail should render a localized 4K switch label');
  assert(panel.includes('type="checkbox" id="bingResolution"'), 'Bing detail should expose the shared sliding switch for UHD');
  assert(panel.includes('class="switch-control"'), 'Bing resolution should reuse the shared switch visual language');
  assert(panel.includes('bindBingConfigEvents'), 'Bing config changes should be wired through the shared settings flow');
  assert(panel.includes('customSelectPortalHost.appendChild(menu)'), 'custom select menus should escape clipped settings panels through the shared portal flow');
  assert(css.includes('.custom-select-menu.floating'), 'ported custom select menus should keep shared menu styling');
}

function testRuntimeRefreshUsesResolutionFreshness() {
  const fs = require('fs');
  const runtime = fs.readFileSync(path.join(repoRoot, 'js', 'newtab.js'), 'utf8');
  assert(runtime.includes('D.bingResolutionMatches(meta, config)'), 'Bing runtime freshness should compare cached and configured resolution');
  assert(runtime.includes('F.fetchBingUrl(SP.getCurrentLang(), config)'), 'Bing runtime fetch should pass the current source config');
  assert(runtime.includes('F.cacheBingBlob(r.url, r.api, today, config)'), 'Bing cache write should remember the configured resolution');
}

(async function run() {
  await testBingResolutionStorageDefaultsAndMigration();
  testBingResolutionNormalizationAndImport();
  await testFetchUsesConfiguredBingResolution();
  testSettingsExposeBingResolutionControl();
  testRuntimeRefreshUsesResolutionFreshness();
  console.log('bing resolution tests passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
