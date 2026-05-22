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
  const css = fs.readFileSync(path.join(repoRoot, 'css', 'settings.css'), 'utf8');
  const newtab = fs.readFileSync(path.join(repoRoot, 'js', 'newtab.js'), 'utf8');
  assert(settingsPanel.includes('function buildUploadConfigHTML'), 'upload drawer should render explicit media choices');
  assert(settingsPanel.includes("data-upload-mode=\"image\""), 'upload drawer should expose an image mode choice');
  assert(settingsPanel.includes("data-upload-mode=\"video\""), 'upload drawer should expose a video mode choice');
  assert(settingsPanel.includes("tr('uploadApplyImageTitle')"), 'image mode should use localized title copy');
  assert(settingsPanel.includes("tr('uploadApplyVideoTitle')"), 'video mode should use localized title copy');
  assert(settingsPanel.includes("tr('uploadApplyPrivacyHint')"), 'upload drawer should explain local-only storage');
  assert(settingsPanel.includes("tr('folderPermissionHint')"), 'folder drawer should explain browser permission lifetime and local-only access');
  assert(settingsPanel.includes('prepareUploadWorkOrder'), 'upload source should prepare files during apply');
  assert(settingsPanel.includes("mode = mode === 'video' ? 'video' : (mode === 'image' ? 'image' : uploadGalleryView());"), 'explicit image uploads should not fall back to the saved video gallery view');
  assert(settingsPanel.includes('UPLOAD_VIDEO_OPTIMIZE_FPS = 30'), 'high-frame-rate upload videos should be capped to 30fps');
  assert(settingsPanel.includes('estimateVideoFrameRate'), 'video upload should estimate selected video frame rate before saving');
  assert(settingsPanel.includes('canvas.captureStream(UPLOAD_VIDEO_OPTIMIZE_FPS)'), 'video upload should generate the optimized copy without changing resolution');
  assert(settingsPanel.includes("showRuntimeDownloadNotice('uploadVideo', 'loading'"), 'video optimization should report progress in the runtime wallpaper notice');
  assert(newtab.includes("kind === 'uploadVideo'"), 'runtime wallpaper notice should render video optimization copy');
  assert(settingsPanel.includes('prepareUploadVideoFile(video)'), 'upload apply flow should optimize high-frame-rate video before thumbnailing and saving');
  assert(settingsPanel.includes('prepareUploadVideoFile(file)'), 'direct upload flow should optimize high-frame-rate video before displaying');
  assert(settingsPanel.includes("id: 'upload_image_empty'"), 'image gallery should render an empty placeholder when only video exists');
  assert(settingsPanel.includes("mediaType: 'image-empty'"), 'image gallery empty placeholder should be distinguishable from real image cards');
  assert(css.includes('[data-media-type="image-empty"]'), 'image gallery empty placeholder should not inherit the draggable upload cursor');
}

function testApiSettingsUsesSharedVisualLanguage() {
  const settingsPanel = fs.readFileSync(path.join(repoRoot, 'js', 'settings-panel.js'), 'utf8');
  const css = fs.readFileSync(path.join(repoRoot, 'css', 'settings.css'), 'utf8');
  assert(settingsPanel.includes('data-api-type-tab="image"'), 'API editor should render the direct-image type tab');
  assert(settingsPanel.includes('data-api-type-tab="json"'), 'API editor should render the JSON type tab');
  assert(!/data-api-type-tab="(?:image|json)"[\s\S]{0,90}<span><\/span>/.test(settingsPanel), 'API type tabs should not render decorative per-type color spans');
  const apiCssStart = css.indexOf('.api-config');
  const apiCssEnd = css.indexOf('.wallhaven-config', apiCssStart);
  assert(apiCssStart > 0 && apiCssEnd > apiCssStart, 'API CSS block should be inspectable');
  const apiCss = css.slice(apiCssStart, apiCssEnd);
  assert(!apiCss.includes('168, 85, 247'), 'API controls should not hard-code a separate purple identity');
  assert(!apiCss.includes('#a855f7'), 'API controls should not hard-code the purple API color');
  assert(!apiCss.includes('#22c55e') && !apiCss.includes('#ef4444'), 'API test states should use shared muted state colors, not raw red/green dots');
  assert(/\.api-type-tabs button\.active\s*\{[\s\S]*var\(--settings-field-bg-hover\)/.test(apiCss), 'API type tabs should use the shared selected-control surface');
  assert(!apiCss.includes('.api-json-path-row'), 'API CSS should not keep dead JSON path row styles');
  assert(/\.api-add-row\s*\{[\s\S]*grid-template-columns:\s*1fr/.test(apiCss), 'API add form should stack controls instead of squeezing them into narrow columns');
  assert(/\.api-config\[data-api-type="json"\] \.api-add-row\s*\{[\s\S]*grid-template-columns:\s*1fr/.test(apiCss), 'JSON API add form should use the same stacked layout');
}

function testAccentColorAppliesOnPickerChange() {
  const settingsPanel = fs.readFileSync(path.join(repoRoot, 'js', 'settings-panel.js'), 'utf8');
  assert(/accentColorInput\.addEventListener\('input',\s*function \(\) \{ applyAccentColor\(this\.value\); \}\)/.test(settingsPanel), 'accent color should update while dragging in browsers that emit input');
  assert(/accentColorInput\.addEventListener\('change',\s*function \(\) \{ applyAccentColor\(this\.value\); \}\)/.test(settingsPanel), 'accent color should apply when the native color picker confirms with change');
}

function testCustomAccentAppliesFullThemePalette() {
  const index = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  const theme = fs.readFileSync(path.join(repoRoot, 'js', 'theme.js'), 'utf8');
  const settingsPanel = fs.readFileSync(path.join(repoRoot, 'js', 'settings-panel.js'), 'utf8');
  const settingsBootstrap = fs.readFileSync(path.join(repoRoot, 'js', 'settings-bootstrap.js'), 'utf8');
  assert(index.includes('<script src="js/theme.js"></script>'), 'shared theme module should load before settings bootstrap');
  assert(index.indexOf('js/theme.js') < index.indexOf('js/settings-bootstrap.js'), 'theme module should be available to startup settings');
  [
    'customAccentThemePalette',
    'applyCustomAccentTheme',
    'applyDefaultSurfaceTheme',
    'applyPaletteAliases'
  ].forEach((name) => {
    assert(theme.includes(`function ${name}`), `shared theme module should define ${name}`);
  });
  [
    '--theme-surface-base-rgb',
    '--theme-surface-elevated-rgb',
    '--theme-tint-rgb',
    '--theme-stroke-rgb',
    '--theme-accent-rgb',
    '--surface-base-rgb',
    '--surface-elevated-rgb',
    '--tint-rgb',
    '--stroke-rgb'
  ].forEach((token) => {
    assert(theme.includes(token), `shared custom accent should write ${token}`);
  });
  assert(theme.includes('window.PlainTabTheme'), 'theme module should expose a shared global API');
  assert(/applyCustomAccentTheme\(value\)[\s\S]*writePalette\(root, palette\);[\s\S]*applyPaletteAliases\(root, palette\);/.test(theme), 'custom accent should apply direct alias values so later wallpaper extraction cannot override it');
  assert(settingsPanel.includes('window.PlainTabTheme.applyCustomAccentTheme'), 'settings panel should call the shared theme API');
  assert(settingsBootstrap.includes('window.PlainTabTheme.applyCustomAccentTheme'), 'startup bootstrap should call the shared theme API');
  assert(/if \(mode === 'custom' && rgb\) \{\s*applyCustomAccentTheme\(rgb\);/.test(settingsBootstrap), 'startup custom accent should apply a full palette, not just --accent-rgb');
  assert(/function applyAccentPreference\(\) \{[\s\S]*applyCustomAccentTheme\(rgb\);/.test(settingsPanel), 'runtime custom accent should apply a full palette, not just --accent-rgb');
}

function testCustomAccentIsNotMaskedByWallpaperSourceColors() {
  const css = fs.readFileSync(path.join(repoRoot, 'css', 'settings.css'), 'utf8');
  const modeChipBlock = css.slice(css.indexOf('.wp-mode-chip {'), css.indexOf('/* L1 buttons */'));
  assert(modeChipBlock.includes('--chip-signal-rgb'), 'current source chip should keep source identity on the small signal only');
  assert(!/\.wp-mode-chip\.(?:bing|upload|folder|rss|api|wallhaven)\s*\{[^}]*--chip-rgb/.test(modeChipBlock), 'current source chip surface should use global accent, not source-specific chip color');
  assert(!/\.wallpaper-source-item(?:\[data-source="[^"]+"\]|\.(?:bing|upload|folder|rss|api|wallhaven))/.test(css), 'source identity colors should not override the whole source row accent');
  assert(/\.wallpaper-source-glyph\.bing\s*\{\s*--source-rgb:\s*59,\s*130,\s*246;/.test(css), 'source glyph should keep the Bing identity color');
  assert(/\.wallpaper-source-item\[aria-checked="true"\][\s\S]*box-shadow:\s*2px 0 0 var\(--settings-accent-rail\)/.test(css), 'selected source row rail should follow the custom accent color through the semantic token');
}

function testSettingsThemeSemanticTokenContract() {
  const baseCss = fs.readFileSync(path.join(repoRoot, 'css', 'base.css'), 'utf8');
  const settingsCss = fs.readFileSync(path.join(repoRoot, 'css', 'settings.css'), 'utf8');
  [
    '--settings-panel-bg',
    '--settings-shell-bg',
    '--settings-sidebar-bg',
    '--settings-content-bg',
    '--settings-section-bg',
    '--settings-row-bg',
    '--settings-row-hover-bg',
    '--settings-row-selected-bg',
    '--settings-field-bg',
    '--settings-field-bg-hover',
    '--settings-border-subtle',
    '--settings-border',
    '--settings-border-strong',
    '--settings-accent-soft',
    '--settings-accent-rail',
    '--settings-focus-ring'
  ].forEach((token) => {
    assert(baseCss.includes(token), `base theme should define ${token}`);
  });

  [
    ['settings panel shell', '.settings-panel {', 'var(--settings-panel-bg)'],
    ['modal shell', '.modal-window {', 'var(--settings-shell-bg)'],
    ['modal sidebar', '.modal-tabs {', 'var(--settings-sidebar-bg)'],
    ['modal content', '.modal-content {', 'var(--settings-content-bg)'],
    ['setting row', '.setting-item {', 'var(--settings-row-bg)'],
    ['wallpaper source row', '.wallpaper-source-item {', 'var(--settings-row-bg)'],
    ['wallpaper selected source row', '.wallpaper-source-item[aria-checked="true"],', 'var(--settings-row-selected-bg)'],
    ['wallpaper detail summary', '.wallpaper-detail-summary {', 'var(--settings-section-bg)'],
    ['wallpaper detail fields', '.wallpaper-source-detail input[type="text"],', 'var(--settings-field-bg)']
  ].forEach(([label, selector, expected]) => {
    const start = settingsCss.indexOf(selector);
    assert(start >= 0, `${label} block should be inspectable`);
    const end = settingsCss.indexOf('\n}', start);
    assert(end > start, `${label} block should have a closing brace`);
    const block = settingsCss.slice(start, end);
    assert(block.includes(expected), `${label} should consume ${expected}`);
  });

  assert(settingsCss.includes('background: var(--settings-row-hover-bg);'), 'row hovers should use a shared hover token');
  assert(settingsCss.includes('box-shadow: 2px 0 0 var(--settings-accent-rail)'), 'selected source rail should use the semantic accent rail token');
  assert(settingsCss.includes('box-shadow: var(--settings-focus-ring)'), 'focused controls should use the shared settings focus ring');
}

function testWallpaperApplyFooterUsesQuietActionTray() {
  const css = fs.readFileSync(path.join(repoRoot, 'css', 'settings.css'), 'utf8');
  const footerStart = css.indexOf('.wallpaper-apply-footer {');
  const statusStart = css.indexOf('.wallpaper-apply-status {');
  assert(footerStart > 0, 'wallpaper apply footer should be inspectable');
  assert(statusStart > footerStart, 'wallpaper apply status should be inspectable');
  const footer = css.slice(footerStart, css.indexOf('\n}', footerStart));
  const status = css.slice(statusStart, css.indexOf('\n}', statusStart));
  assert(!footer.includes('border-top'), 'wallpaper apply footer should not render as a hard full-width divider');
  assert(!footer.includes('rgba(var(--surface-elevated-rgb), var(--panel-opacity))'), 'wallpaper apply footer should not use a slab background');
  assert(footer.includes('border-radius: 10px'), 'wallpaper apply footer should render as a soft action tray');
  assert(footer.includes('var(--settings-section-bg)'), 'wallpaper apply footer should use the shared settings surface token');
  assert(!status.includes('border-left'), 'wallpaper apply status should not look like a warning block');
  assert(!status.includes('background:'), 'wallpaper apply status text should stay visually quiet inside the tray');
  assert(status.includes('--apply-state-rgb'), 'wallpaper apply status should use a small state signal instead of a colored slab');
}

function testWasmThemeEngineOwnsUiRoles() {
  const cpp = fs.readFileSync(path.join(repoRoot, 'wasm', 'theme_engine.cpp'), 'utf8');
  const wallpaperTheme = fs.readFileSync(path.join(repoRoot, 'js', 'wallpaper', 'theme.js'), 'utf8');
  assert(cpp.includes('const int kAbiVersion = 3;'), 'theme engine ABI should be bumped for role-token output');
  assert(cpp.includes('kOffsetThemeRoles = 27'), 'theme role colors should be encoded before the raw top-color list');
  assert(cpp.includes('kThemeRoleCount = 8'), 'C++ should output the eight CSS theme roles directly');
  assert(cpp.includes('write_theme_roles'), 'C++ should own final UI role generation, not only palette extraction');
  assert(cpp.includes('rgb_to_oklab') && cpp.includes('oklab_to_rgb'), 'C++ theme roles should be generated in perceptual color space');
  assert(cpp.includes('ensure_lum_delta'), 'C++ should enforce visible hierarchy between surface roles');
  assert(wallpaperTheme.includes('var WASM_ABI_VERSION = 3;'), 'JS should require the v3 role-token ABI');
  assert(wallpaperTheme.includes('var WASM_THEME_OFFSET = 27;'), 'JS decoder should know where C++ role tokens start');
  assert(wallpaperTheme.includes('function decodeWasmTheme'), 'JS should decode C++ role tokens');
  assert(/if \(palette && palette\.theme\) return palette\.theme;/.test(wallpaperTheme), 'JS should trust the C++ generated UI role palette when wasm succeeds');
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
  assert(settingsWallpaper.includes('function syncWorkspaceDetailHeight'), 'wallpaper module should sync detail height from the source nav');
  assert(settingsWallpaper.includes('ResizeObserver'), 'source nav height should update dynamically when the source list changes');
  const sourceNavMatch = settingsWallpaper.match(/function sourceNavHTML\(\) \{[\s\S]*?\n        \}/);
  assert(sourceNavMatch, 'source nav renderer should be easy to inspect');
  assert(!sourceNavMatch[0].includes('source.descKey'), 'source nav should not render descriptions in the left rail');
  assert(!sourceNavMatch[0].includes('<small>'), 'source nav should keep the left rail to name and status only');
  assert(settingsPanel.includes('wallpaper-detail-summary'), 'right detail panel should have a designed source summary header');
  assert(settingsPanel.includes('wallpaper-detail-source-dot'), 'right detail panel should repeat the source signal dot beside the title');
  assert(settingsPanel.includes('wallpaper-detail-status'), 'right detail panel should show the current source work-order status');
  assert(settingsPanel.includes('wallpaper-detail-explainer'), 'source descriptions should render as a dedicated explanatory area in the right detail panel');
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

function testWallpaperDetailScrollBoundedBySourceNav() {
  const css = fs.readFileSync(path.join(repoRoot, 'css', 'settings.css'), 'utf8');
  assert(css.includes('--wallpaper-source-nav-height'), 'wallpaper detail panel should use the measured source-nav height');
  assert(css.includes('max-height: var(--wallpaper-source-nav-height'), 'wallpaper detail panel should be capped by the source nav height');
  assert(/\.wallpaper-source-detail\s*\{[\s\S]*overflow-y:\s*auto/.test(css), 'wallpaper detail panel should scroll internally when content is taller than the source nav');
  assert(!/\.wallpaper-source-detail\s*\{[\s\S]*overscroll-behavior:\s*contain/.test(css), 'wallpaper detail panel should allow wheel scroll chaining to the main wallpaper settings body');
}

function testWallpaperHeaderUsesGlobalTabChrome() {
  const css = fs.readFileSync(path.join(repoRoot, 'css', 'settings.css'), 'utf8');
  assert(/\.wallpaper-tab-header-v2\s*\{[\s\S]*position:\s*absolute/.test(css), 'wallpaper v2 header should keep the same fixed title geometry as other tabs');
  assert(!/\.wallpaper-tab-header-v2\s*\{[\s\S]*position:\s*static/.test(css), 'wallpaper v2 header should not opt out of global title layout');
  assert(/\.wallpaper-tab-body-v2\s*\{[\s\S]*padding-top:\s*178px/.test(css), 'wallpaper v2 body should reserve the same title height as other tabs');
  assert(!/\.wallpaper-tab-body-v2\s*\{[\s\S]*mask-image:\s*none/.test(css), 'wallpaper v2 body should keep the global top fade mask');
  assert(css.includes('.settings-page-header p,\n.wallpaper-tab-header p'), 'settings subtitles should share one global style rule');
}

function testWallpaperMobileHeaderSpacing() {
  const css = fs.readFileSync(path.join(repoRoot, 'css', 'settings.css'), 'utf8');
  const mobileStart = css.indexOf('@media (max-width: 720px)');
  assert(mobileStart > 0, 'settings CSS should keep a mobile modal breakpoint');
  const mobileCss = css.slice(mobileStart, css.indexOf('/* ========== 通用辅助类', mobileStart));
  const bodyMatch = mobileCss.match(/\.wallpaper-tab-body-v2\s*\{[\s\S]*?padding-top:\s*(\d+)px/);
  assert(bodyMatch, 'mobile wallpaper v2 body should explicitly reserve header space');
  assert(Number(bodyMatch[1]) >= 228, 'mobile wallpaper source content should start below the stacked wallpaper header and runtime card');
}

function testWallpaperRuntimeCardCompactness() {
  const css = fs.readFileSync(path.join(repoRoot, 'css', 'settings.css'), 'utf8');
  const settingsWallpaper = fs.readFileSync(path.join(repoRoot, 'js', 'settings-wallpaper.js'), 'utf8');
  assert(/\.wallpaper-tab-header-v2\s*\{[\s\S]*minmax\(180px,\s*220px\)/.test(css), 'runtime card column should be compact enough for long localized text');
  assert(settingsWallpaper.includes("tr('wallpaperCurrentSource').replace('{source}', '')"), 'runtime card should keep the original current-source label');
  assert(settingsWallpaper.includes("tr('wallpaperApplyNoChanges')"), 'runtime card should keep the original saved-state copy');
  assert(!settingsWallpaper.includes("tr('wallpaperRuntimeLabel')"), 'runtime card should not use the mistaken compact label keys');
  assert(/\.wallpaper-runtime-card\s*\{[\s\S]*align-content:\s*center/.test(css), 'runtime card should keep its original vertical card layout');
  assert(/\.wallpaper-runtime-card\s*\{[\s\S]*min-height:\s*78px/.test(css), 'runtime card should keep its original height');
  assert(/\.wallpaper-source-item\s*\{[\s\S]*grid-template-columns:\s*16px minmax\(0,\s*1fr\)/.test(css), 'source rows should not reserve a narrow fixed status column');
  assert(/\.wallpaper-source-badge\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)/.test(css), 'source row status should avoid a second dot next to the source signal');
  assert(!/\.wallpaper-source-badge\s*\{[\s\S]*border-left-width/.test(css), 'source row status should not add a second rail beside the selected source rail');
  assert(/\.wallpaper-source-badge\s*\{[\s\S]*border-radius:\s*7px/.test(css), 'source row status should render as a designed status chip');
  assert(/\.wallpaper-source-badge\s*\{[\s\S]*white-space:\s*normal/.test(css), 'source row status text should wrap instead of overflowing its frame');
  assert(/\.wallpaper-source-badge\s*\{[\s\S]*overflow-wrap:\s*anywhere/.test(css), 'source row status should tolerate long localized words');
}

function testWallpaperCopyNoLongerReferencesOldAccordionInteraction() {
  const zh = fs.readFileSync(path.join(repoRoot, 'js', 'i18n', 'zh-CN.js'), 'utf8');
  const en = fs.readFileSync(path.join(repoRoot, 'js', 'i18n', 'en.js'), 'utf8');
  assert(!zh.includes('点击来源条展开配置'), 'wallpaper subtitle should not describe the removed accordion interaction');
  assert(!en.includes('Click a source row to expand settings'), 'wallpaper subtitle should not describe the removed accordion interaction in English');
  assert(zh.includes('选择来源后在右侧配置'), 'wallpaper subtitle should explain the current right-side configuration flow');
  assert(en.includes('Choose a source and configure it on the right'), 'wallpaper subtitle should explain the current right-side configuration flow in English');
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
  testApiSettingsUsesSharedVisualLanguage();
  testAccentColorAppliesOnPickerChange();
  testCustomAccentAppliesFullThemePalette();
  testCustomAccentIsNotMaskedByWallpaperSourceColors();
  testSettingsThemeSemanticTokenContract();
  testWallpaperApplyFooterUsesQuietActionTray();
  testWasmThemeEngineOwnsUiRoles();
  testUnifiedWallpaperLayoutContract();
  testWallpaperDetailScrollBoundedBySourceNav();
  testWallpaperHeaderUsesGlobalTabChrome();
  testWallpaperMobileHeaderSpacing();
  testWallpaperRuntimeCardCompactness();
  testWallpaperCopyNoLongerReferencesOldAccordionInteraction();
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
