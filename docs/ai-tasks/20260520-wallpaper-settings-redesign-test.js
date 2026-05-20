const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..', '..');

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

function testWallhavenSettingsUiContract() {
  const settingsPanel = fs.readFileSync(path.join(repoRoot, 'js', 'settings-panel.js'), 'utf8');
  assert(settingsPanel.includes("wallhavenCategoryToggle('general', 'G'"), 'general category should use fixed G glyph');
  assert(settingsPanel.includes("wallhavenCategoryToggle('anime', 'A'"), 'anime category should use fixed A glyph');
  assert(settingsPanel.includes("wallhavenCategoryToggle('people', 'P'"), 'people category should use fixed P glyph');
  assert(!settingsPanel.includes('wallhavenCategoryGeneral'), 'category glyphs should not use translatable labels');
  assert(!settingsPanel.includes('wallhavenCategoryAnime'), 'category glyphs should not use translatable labels');
  assert(!settingsPanel.includes('wallhavenCategoryPeople'), 'category glyphs should not use translatable labels');

  [
    'wallhavenCategoriesHint',
    'wallhavenSortingHint',
    'wallhavenTopRangeHint',
    'wallhavenResolutionHint',
    'wallhavenRatioHint',
    'wallhavenColorHint',
    'wallhavenRefreshHint'
  ].forEach((key) => {
    assert(settingsPanel.includes(`tr('${key}')`), `settings panel should render ${key}`);
  });
}

function testUploadSettingsUiContract() {
  const settingsPanel = fs.readFileSync(path.join(repoRoot, 'js', 'settings-panel.js'), 'utf8');
  assert(settingsPanel.includes('function buildUploadConfigHTML'), 'upload drawer should render explicit media choices');
  assert(settingsPanel.includes("data-upload-mode=\"image\""), 'upload drawer should expose an image mode choice');
  assert(settingsPanel.includes("data-upload-mode=\"video\""), 'upload drawer should expose a video mode choice');
  assert(settingsPanel.includes("tr('uploadApplyImageTitle')"), 'image mode should use localized title copy');
  assert(settingsPanel.includes("tr('uploadApplyVideoTitle')"), 'video mode should use localized title copy');
  assert(settingsPanel.includes('prepareUploadWorkOrder'), 'upload source should prepare files during apply');
}

function testUnifiedWallpaperLayoutContract() {
  const settingsPanel = fs.readFileSync(path.join(repoRoot, 'js', 'settings-panel.js'), 'utf8');
  const settingsBootstrap = fs.readFileSync(path.join(repoRoot, 'js', 'settings-bootstrap.js'), 'utf8');
  const settingsWallpaperPath = path.join(repoRoot, 'js', 'settings-wallpaper.js');
  assert(fs.existsSync(settingsWallpaperPath), 'wallpaper settings should live in js/settings-wallpaper.js');
  const settingsWallpaper = fs.readFileSync(settingsWallpaperPath, 'utf8');
  assert(settingsWallpaper.includes('window.SettingsWallpaper'), 'settings-wallpaper module should expose window.SettingsWallpaper');
  assert(settingsWallpaper.includes('wallpaper-source-nav'), 'new wallpaper layout should render a source navigation rail');
  assert(settingsWallpaper.includes('wallpaper-source-detail'), 'new wallpaper layout should render a source detail panel');
  assert(settingsWallpaper.includes('wallpaper-runtime-card'), 'new wallpaper layout should render a current runtime card');
  assert(settingsWallpaper.includes('data-wallpaper-source-option'), 'source nav should expose source option buttons');
  ['bing', 'upload', 'folder', 'rss', 'wallhaven', 'api'].forEach((source) => {
    assert(settingsWallpaper.includes(`'${source}'`) || settingsWallpaper.includes(`"${source}"`), `source nav should include ${source}`);
  });
  assert(!settingsWallpaper.includes('source-drawer'), 'new wallpaper module should not render the old source drawer markup');
  assert(settingsPanel.includes('SettingsWallpaper'), 'settings-panel should delegate wallpaper tab rendering to SettingsWallpaper');
  assert(settingsPanel.includes('isReady: function () { return fullInitialized; }'), 'settings-panel should expose readiness for lazy-load races');
  assert(settingsBootstrap.includes("loadScript('js/settings-panel.js')"), 'settings bootstrap should lazy-load the full panel');
  assert(settingsBootstrap.includes("loadScript('js/settings-wallpaper.js')"), 'settings bootstrap should lazy-load wallpaper settings after the full panel');
  assert(settingsBootstrap.includes('SettingsPanelFull.isReady'), 'settings bootstrap should gate full-panel refresh until init is complete');
}

function testOldWallpaperAccordionRemoved() {
  const settingsWallpaper = fs.readFileSync(path.join(repoRoot, 'js', 'settings-wallpaper.js'), 'utf8');
  const settingsPanel = fs.readFileSync(path.join(repoRoot, 'js', 'settings-panel.js'), 'utf8');
  const css = fs.readFileSync(path.join(repoRoot, 'css', 'settings.css'), 'utf8');
  assert(!settingsWallpaper.includes('source-drawer'), 'new wallpaper module should not render old source drawers');
  assert(!settingsPanel.includes('source-accordion'), 'settings-panel should not render old source accordion');
  assert(!settingsPanel.includes('function draftOpenSource'), 'old accordion open-source helper should be removed');
  assert(!settingsPanel.includes('source-drawer'), 'settings-panel should not retain old source drawer height logic');
  assert(!css.includes('.source-drawer'), 'old source drawer CSS should be removed after migration');
  assert(!css.includes('.source-accordion'), 'old source accordion CSS should be removed after migration');
  assert(!css.includes('.source-selector'), 'old source selector CSS should be removed after migration');
}

async function testSourceTabSelectionDoesNotCommitActiveSource() {
  const settingsWallpaper = fs.readFileSync(path.join(repoRoot, 'js', 'settings-wallpaper.js'), 'utf8');
  assert(settingsWallpaper.includes('function selectWallpaperSource'), 'wallpaper module should have a source selection handler');
  assert(settingsWallpaper.includes('pendingSource'), 'source selection should update the pending work order through context');
  assert(!/selectWallpaperSource[\s\S]{0,900}setActiveSource/.test(settingsWallpaper), 'clicking a source tab must not write activeSource');
  assert(!/data-wallpaper-source-option[\s\S]{0,1400}saveWallpaper/.test(settingsWallpaper), 'source tab event binding must not commit wallpaper storage');
}

function testSourceLibraryEditsAutoSaveWithoutGlobalSave() {
  const settingsPanel = fs.readFileSync(path.join(repoRoot, 'js', 'settings-panel.js'), 'utf8');
  const settingsWallpaper = fs.readFileSync(path.join(repoRoot, 'js', 'settings-wallpaper.js'), 'utf8');
  assert(!settingsWallpaper.includes('wallpaperSaveBtn'), 'wallpaper settings should not expose a global save button');
  assert(settingsPanel.includes('saveRssListConfig(next);'), 'RSS selected row changes should save immediately');
  assert(settingsPanel.includes('saveApiListConfig(config);'), 'API selected row changes should save immediately');
  assert(settingsPanel.includes('rssInvalidUrl'), 'RSS invalid URLs should be blocked before saving');
  assert(settingsPanel.includes('apiInvalidUrl'), 'API invalid URLs should be blocked before saving');
  assert(settingsPanel.includes('deletedRunningRssSource'), 'deleting running RSS source should have an explicit confirmation path');
  assert(settingsPanel.includes('deletedRunningApiSource'), 'deleting running API source should have an explicit confirmation path');
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

async function testUploadSelectionCanApplyWithoutExistingCache() {
  const storage = createStorage(baseWallpaper('bing'));
  const Apply = loadApplyModule(storage);
  const result = Apply.validateWorkOrder({
    pendingSource: 'upload',
    pendingConfig: { activeMedia: 'image', galleryView: 'image' },
    baseline: { pendingSource: 'bing', pendingConfig: {} }
  });
  assert.strictEqual(result.state, 'Ready');
  assert.strictEqual(result.valid, true);
  assert.deepStrictEqual(storage.calls, []);
}

async function testUploadSameModeReadyCanReapply() {
  const storage = createStorage(baseWallpaper('upload'));
  const Apply = loadApplyModule(storage);
  const result = Apply.validateWorkOrder({
    pendingSource: 'upload',
    pendingConfig: { activeMedia: 'image', galleryView: 'image' },
    health: { state: 'Ready', reasonKey: 'wallpaperApplyReady' },
    baseline: { pendingSource: 'upload', pendingConfig: { activeMedia: 'image', galleryView: 'image' } }
  });
  assert.strictEqual(result.state, 'Ready');
  assert.strictEqual(result.valid, true);
}

async function testUploadCancelledPrepareSkipsCommitReloadAndCleanup() {
  const storage = createStorage(baseWallpaper('bing'));
  const Apply = loadApplyModule(storage, {
    reloadWallpaper: () => {
      storage.calls.push(['reloadWallpaper']);
      return Promise.resolve(true);
    }
  });
  const result = await Apply.apply({
    pendingSource: 'upload',
    pendingConfig: { activeMedia: 'image', galleryView: 'image' },
    health: { state: 'Ready', reasonKey: 'wallpaperApplyReady' },
    baseline: { pendingSource: 'bing', pendingConfig: {} }
  }, {
    prepare() {
      storage.calls.push(['prepare', 'upload']);
      return Promise.resolve({ cancelled: true, reasonKey: 'wallpaperStatusUploadCancelled' });
    }
  });
  assert.strictEqual(result.state, 'Cancelled');
  assert.strictEqual(result.reasonKey, 'wallpaperStatusUploadCancelled');
  assert.strictEqual(storage.api.loadWallpaper().activeSource, 'bing');
  assert.deepStrictEqual(storage.calls, [['prepare', 'upload']]);
}

async function testUploadApplyingSameModeStillPrepares() {
  const storage = createStorage(baseWallpaper('upload'));
  const Apply = loadApplyModule(storage, {
    reloadWallpaper: () => {
      storage.calls.push(['reloadWallpaper']);
      return Promise.resolve(true);
    }
  });
  const result = await Apply.apply({
    pendingSource: 'upload',
    pendingConfig: { activeMedia: 'image', galleryView: 'image' },
    health: { state: 'Applying', reasonKey: 'wallpaperStatusApplying' },
    baseline: { pendingSource: 'upload', pendingConfig: { activeMedia: 'image', galleryView: 'image' } }
  }, {
    prepare() {
      storage.calls.push(['prepare', 'upload']);
      return Promise.resolve({ cancelled: true, reasonKey: 'wallpaperStatusUploadCancelled' });
    }
  });
  assert.strictEqual(result.state, 'Cancelled');
  assert.deepStrictEqual(storage.calls, [['prepare', 'upload']]);
}

async function testFolderApplyingStillPreparesAndCommits() {
  const storage = createStorage(baseWallpaper('bing'), {
    hasSourceCacheUpload: false
  });
  const Apply = loadApplyModule(storage, {
    reloadWallpaper: () => {
      storage.calls.push(['reloadWallpaper']);
      return Promise.resolve(true);
    }
  });
  const result = await Apply.apply({
    pendingSource: 'folder',
    pendingConfig: { pathLabel: 'Pictures', strategy: 'shuffle' },
    health: { state: 'Applying', reasonKey: 'wallpaperStatusApplying' },
    baseline: { pendingSource: 'bing', pendingConfig: {} }
  }, {
    prepare() {
      storage.calls.push(['prepare', 'folder']);
      return Promise.resolve({ prepared: true });
    }
  });
  assert.strictEqual(result.state, 'Applied');
  assert.strictEqual(storage.api.loadWallpaper().activeSource, 'folder');
  assert.deepStrictEqual(storage.calls, [['prepare', 'folder'], ['saveWallpaper', 'folder'], ['reloadWallpaper']]);
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
  testWallhavenSettingsUiContract();
  testUploadSettingsUiContract();
  testUnifiedWallpaperLayoutContract();
  testOldWallpaperAccordionRemoved();
  testSourceLibraryEditsAutoSaveWithoutGlobalSave();
  await testSourceTabSelectionDoesNotCommitActiveSource();
  await testRssRequiresMatchingPassedTest();
  await testUploadReadyUsesSourceCache();
  await testUploadSelectionCanApplyWithoutExistingCache();
  await testUploadSameModeReadyCanReapply();
  await testUploadCancelledPrepareSkipsCommitReloadAndCleanup();
  await testUploadApplyingSameModeStillPrepares();
  await testFolderApplyingStillPreparesAndCommits();
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
