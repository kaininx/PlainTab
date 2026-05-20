const assert = require('assert');
const path = require('path');

function createStorage(initialWallpaper, options = {}) {
  const calls = [];
  let wallpaper = JSON.parse(JSON.stringify(initialWallpaper));
  return {
    calls,
    api: {
      loadWallpaper() {
        return wallpaper;
      },
      saveWallpaper(next) {
        calls.push(['saveWallpaper', next.activeSource]);
        if (options.saveFails) return false;
        wallpaper = JSON.parse(JSON.stringify(next));
        return true;
      },
      compatMode(source) {
        return source === 'local' ? 'upload' : (source || 'bing');
      },
      normalizeSource(source) {
        return source === 'local' ? 'upload' : (source || 'bing');
      },
      hasUploadAssets() {
        return options.hasUploadAssets === true;
      },
      hasSourceCache(source) {
        calls.push(['hasSourceCache', source]);
        return source === 'upload' && options.hasSourceCacheUpload === true;
      },
      cleanupSourceCache(source) {
        calls.push(['cleanupSourceCache', source]);
        if (options.cleanupFails) return Promise.reject(new Error('cleanup failed'));
        return Promise.resolve(true);
      },
      isTestPassed(target, hash) {
        return !!target && target.test && target.test.status === 'passed' && target.test.fieldHash === hash;
      },
      rssFieldHash(source) {
        return 'rss:' + [source.url || '', source.name || ''].join('|');
      },
      apiFieldHash(source, apiType) {
        return 'api:' + apiType + ':' + [source.url || '', source.jsonPath || ''].join('|');
      },
      wallhavenFieldHash(config) {
        return 'wallhaven:' + [config.queryPreset || '', config.customQuery || '', config.categories || '', config.sorting || ''].join('|');
      },
      normalizeWallhavenConfig(config) {
        return JSON.parse(JSON.stringify(config || {}));
      }
    }
  };
}

function baseWallpaper(source = 'bing') {
  return {
    activeSource: source,
    providers: {
      bing: { config: {}, state: {} },
      upload: { config: { activeMedia: 'image' }, state: { videoId: '' } },
      folder: { config: { pathLabel: '' }, state: { status: 'idle' } },
      rss: { config: { activeSourceId: 'rss-1', sources: [] }, state: {} },
      api: { config: { apiType: 'image', activeImageSourceId: 'api-1', activeJsonSourceId: '', imageSources: [], jsonSources: [] }, state: {} },
      wallhaven: { config: {}, state: {} }
    },
    cache: { order: ['bing'], index: 0, meta: {} }
  };
}

function loadApplyModule(storage, prepare = {}) {
  global.window = {
    WallpaperData: storage.api,
    reloadWallpaper: prepare.reloadWallpaper || (() => Promise.resolve(true))
  };
  delete require.cache[require.resolve(path.join('..', '..', 'js', 'wallpaper', 'apply.js'))];
  require(path.join('..', '..', 'js', 'wallpaper', 'apply.js'));
  return global.window.WallpaperApply;
}

async function testRssRequiresMatchingPassedTest() {
  const storage = createStorage(baseWallpaper('bing'));
  const Apply = loadApplyModule(storage);
  const source = { id: 'rss-1', name: 'Feed', url: 'https://example.com/feed.xml', test: { status: 'untested', fieldHash: '' } };
  const workOrder = {
    pendingSource: 'rss',
    pendingConfig: { activeSourceId: 'rss-1', sources: [source] },
    baseline: {}
  };
  let result = Apply.validateWorkOrder(workOrder);
  assert.strictEqual(result.state, 'Blocked');
  assert.strictEqual(result.reasonKey, 'wallpaperStatusTestRss');

  source.test = { status: 'passed', fieldHash: 'rss:stale-hash', testedAt: 1 };
  result = Apply.validateWorkOrder(workOrder);
  assert.strictEqual(result.state, 'Blocked');
  assert.strictEqual(result.reasonKey, 'wallpaperStatusTestRss');

  source.test = { status: 'passed', fieldHash: storage.api.rssFieldHash(source), testedAt: 1 };
  result = Apply.validateWorkOrder(workOrder);
  assert.strictEqual(result.state, 'Ready');
}

async function testUploadReadyUsesSourceCache() {
  const storage = createStorage(baseWallpaper('bing'), { hasSourceCacheUpload: true });
  const Apply = loadApplyModule(storage);
  const result = Apply.validateWorkOrder({
    pendingSource: 'upload',
    pendingConfig: { activeMedia: 'image' },
    baseline: {}
  });
  assert.strictEqual(result.state, 'Ready');
  assert.deepStrictEqual(storage.calls, [['hasSourceCache', 'upload']]);
}

async function testWallhavenRequiresMatchingPassedTest() {
  const storage = createStorage(baseWallpaper('bing'));
  const Apply = loadApplyModule(storage);
  const config = { queryPreset: 'nature', customQuery: '', categories: '111', sorting: 'random', test: { status: 'untested', fieldHash: '' } };
  const workOrder = {
    pendingSource: 'wallhaven',
    pendingConfig: config,
    baseline: {}
  };
  let result = Apply.validateWorkOrder(workOrder);
  assert.strictEqual(result.state, 'Blocked');
  assert.strictEqual(result.reasonKey, 'wallpaperStatusTestWallhaven');

  config.test = { status: 'passed', fieldHash: 'wallhaven:stale-hash', testedAt: 1 };
  result = Apply.validateWorkOrder(workOrder);
  assert.strictEqual(result.state, 'Blocked');
  assert.strictEqual(result.reasonKey, 'wallpaperStatusTestWallhaven');

  config.test = { status: 'passed', fieldHash: storage.api.wallhavenFieldHash(config), testedAt: 1 };
  result = Apply.validateWorkOrder(workOrder);
  assert.strictEqual(result.state, 'Ready');
}

async function testApplyPreparesBeforeCleanup() {
  const storage = createStorage(baseWallpaper('upload'));
  const Apply = loadApplyModule(storage, {
    reloadWallpaper: () => {
      storage.calls.push(['reloadWallpaper']);
      return Promise.resolve(true);
    }
  });
  const source = { id: 'rss-1', name: 'Feed', url: 'https://example.com/feed.xml' };
  source.test = { status: 'passed', fieldHash: storage.api.rssFieldHash(source), testedAt: 1 };
  const result = await Apply.apply({
    pendingSource: 'rss',
    pendingConfig: { activeSourceId: 'rss-1', sources: [source] },
    baseline: {}
  }, {
    prepare() {
      storage.calls.push(['prepare', 'rss']);
      return Promise.resolve({ prepared: true });
    }
  });
  assert.strictEqual(result.state, 'Applied');
  assert.deepStrictEqual(storage.calls, [['prepare', 'rss'], ['saveWallpaper', 'rss'], ['reloadWallpaper'], ['cleanupSourceCache', 'upload']]);
  assert.strictEqual(storage.api.loadWallpaper().activeSource, 'rss');
}

async function testCommitFailureSkipsReloadAndCleanup() {
  const storage = createStorage(baseWallpaper('upload'), { saveFails: true });
  const Apply = loadApplyModule(storage, {
    reloadWallpaper: () => {
      storage.calls.push(['reloadWallpaper']);
      return Promise.resolve(true);
    }
  });
  const source = { id: 'rss-1', name: 'Feed', url: 'https://example.com/feed.xml' };
  source.test = { status: 'passed', fieldHash: storage.api.rssFieldHash(source), testedAt: 1 };
  const result = await Apply.apply({
    pendingSource: 'rss',
    pendingConfig: { activeSourceId: 'rss-1', sources: [source] },
    baseline: {}
  }, {
    prepare() {
      storage.calls.push(['prepare', 'rss']);
      return Promise.resolve({ prepared: true });
    }
  });
  assert.strictEqual(result.state, 'Error');
  assert.strictEqual(storage.api.loadWallpaper().activeSource, 'upload');
  assert.deepStrictEqual(storage.calls, [['prepare', 'rss'], ['saveWallpaper', 'rss']]);
}

async function testReloadFailureSkipsCleanupAndRollsBack() {
  const storage = createStorage(baseWallpaper('upload'));
  const Apply = loadApplyModule(storage, {
    reloadWallpaper: () => {
      storage.calls.push(['reloadWallpaper']);
      return Promise.reject(new Error('reload failed'));
    }
  });
  const source = { id: 'rss-1', name: 'Feed', url: 'https://example.com/feed.xml' };
  source.test = { status: 'passed', fieldHash: storage.api.rssFieldHash(source), testedAt: 1 };
  const result = await Apply.apply({
    pendingSource: 'rss',
    pendingConfig: { activeSourceId: 'rss-1', sources: [source] },
    baseline: {}
  }, {
    prepare() {
      storage.calls.push(['prepare', 'rss']);
      return Promise.resolve({ prepared: true });
    }
  });
  assert.strictEqual(result.state, 'Error');
  assert.strictEqual(storage.api.loadWallpaper().activeSource, 'upload');
  assert.deepStrictEqual(storage.calls, [['prepare', 'rss'], ['saveWallpaper', 'rss'], ['reloadWallpaper'], ['saveWallpaper', 'upload']]);
}

async function testPrepareFailureKeepsOldSourceAndCache() {
  const storage = createStorage(baseWallpaper('bing'));
  const Apply = loadApplyModule(storage);
  const result = await Apply.apply({
    pendingSource: 'folder',
    pendingConfig: { pathLabel: 'Pictures' },
    health: { state: 'Ready' },
    baseline: {}
  }, {
    prepare() {
      storage.calls.push(['prepare', 'folder']);
      return Promise.reject(new Error('folder failed'));
    }
  });
  assert.strictEqual(result.state, 'Error');
  assert.strictEqual(storage.api.loadWallpaper().activeSource, 'bing');
  assert.deepStrictEqual(storage.calls, [['prepare', 'folder']]);
}

(async function run() {
  await testRssRequiresMatchingPassedTest();
  await testUploadReadyUsesSourceCache();
  await testWallhavenRequiresMatchingPassedTest();
  await testApplyPreparesBeforeCleanup();
  await testCommitFailureSkipsReloadAndCleanup();
  await testReloadFailureSkipsCleanupAndRollsBack();
  await testPrepareFailureKeepsOldSourceAndCache();
  console.log('wallpaper settings redesign tests passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
