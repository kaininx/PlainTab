const assert = require('assert');
const fs = require('fs');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function count(haystack, needle) {
  return haystack.split(needle).length - 1;
}

const index = read('index.html');
const preload = read('js/preload.js');
const data = read('js/wallpaper/data.js');
const settingsBootstrap = read('js/settings-bootstrap.js');
const settingsPanel = read('js/settings-panel.js');
const commandPalette = read('js/command-palette.js');
const show = read('js/wallpaper/show.js');
const searchCss = read('css/search.css');
const wallpaperCss = read('css/wallpaper.css');
const settingsCss = read('css/settings.css');
const baseCss = read('css/base.css');

function testStorageStartsAtV320Baseline() {
  assert.ok(data.includes("BASELINE_APP_VERSION = '3.2.1'"), 'storage should document v3.2.1 as the migration baseline');
  assert.strictEqual(data.includes('LEGACY_KEYS'), false, 'legacy localStorage migration map should not stay in the hot data module');
  assert.strictEqual(data.includes('migrate_1_to_2'), false, 'v1 migration should be removed from the hot data module');
  assert.strictEqual(data.includes('migrate_2_to_3'), false, 'v2 migration should be removed from the hot data module');
  assert.strictEqual(data.includes('hasPt3LegacyData'), false, 'versionless pt3 probing should not run on every new tab');
  assert.ok(data.includes('ensureBaselineSchema'), 'current schema initialization should stay explicit and lightweight');
}

function testPreloadUsesSingleCurrentPreviewKey() {
  assert.strictEqual(count(preload, 'localStorage.getItem'), 1, 'preload should do one synchronous localStorage read');
  assert.ok(preload.includes("ptab_wallpaper_preview"), 'preload should read the current v3.2 preview key');
  assert.ok(preload.includes('MAX_PREVIEW_LENGTH'), 'preload should guard against oversized synchronous preview payloads');
  assert.ok(preload.includes('t.length > MAX_PREVIEW_LENGTH'), 'oversized preview data should not be applied during parser-blocking preload');
  assert.ok(preload.includes('localStorage.removeItem'), 'oversized preview data should be cleared so it does not stall every new tab');
  [
    'ptab_preview_thumb',
    'ptab_bing_thumb',
    '__pt3_thumb',
    'bing_thumb',
    'ptab_img_order',
    'ptab_img_thumbs',
  ].forEach((token) => {
    assert.strictEqual(preload.includes(token), false, `preload should not probe legacy key ${token}`);
  });
}

function testWallpaperFilterStaysOffTheDefaultCompositePath() {
  const baseLayerStart = wallpaperCss.indexOf('.wallpaper-layer {');
  const frontLayerStart = wallpaperCss.indexOf('.wallpaper-layer-front', baseLayerStart);
  assert.ok(baseLayerStart >= 0 && frontLayerStart > baseLayerStart, 'wallpaper base layer CSS should be inspectable');
  const baseLayer = wallpaperCss.slice(baseLayerStart, frontLayerStart);
  assert.strictEqual(baseLayer.includes('filter:'), false, 'default wallpaper layer should not pay full-screen filter cost when blur is off');
  assert.strictEqual(baseLayer.includes('will-change: transform, filter'), false, 'default wallpaper layer should not reserve a filter compositor path');
  assert.ok(wallpaperCss.includes('.wallpaper-blur-active'), 'wallpaper blur should keep an explicit root marker class');
  assert.strictEqual(wallpaperCss.includes('filter: blur(var(--wallpaper-blur'), false, 'strong wallpaper blur should not use a live full-screen CSS filter');
  assert.ok(wallpaperCss.includes('will-change: opacity'), 'front wallpaper layer should hint the opacity fade path');
  assert.strictEqual(settingsCss.includes('.wallpaper-blur-active *'), false, 'wallpaper blur must not globally disable unrelated UI animations');
  assert.ok(settingsBootstrap.includes('wallpaperBlur >= 5'), 'startup settings should mark optimized blur mode only for strong blur values');
  assert.ok(settingsPanel.includes('wallpaperBlur >= 5'), 'settings panel should mark optimized blur mode only for strong blur values');
  assert.strictEqual(settingsPanel.includes('suspendWallpaperBlurForUi'), false, 'settings UI should not turn wallpaper blur off while panels are visible');
  assert.strictEqual(settingsPanel.includes('__wallpaperBlurUiResumeTimer'), false, 'settings UI should not need a delayed blur resume timer');
  assert.strictEqual(commandPalette.includes('suspendWallpaperBlurForUi'), false, 'command palette should not turn wallpaper blur off while open');
  assert.strictEqual(commandPalette.includes('__wallpaperBlurUiResumeTimer'), false, 'command palette should not need a delayed blur resume timer');
  assert.strictEqual(wallpaperCss.includes('wallpaper-blur-ui-open'), false, 'optimized blur should not have a UI-open override');
  assert.ok(data.includes('WALLPAPER_BLUR_THUMBS'), 'data layer should cache blurred wallpaper thumbnails separately from normal thumbnails');
  assert.ok(show.includes('function generateBlurredThumbnail'), 'wallpaper renderer should generate blurred thumbnail bitmaps');
  assert.ok(show.includes('BLUR_THUMB_MAX_W = 960'), 'strong blur thumbnails should keep enough detail without returning to full-size filters');
  assert.ok(show.includes('ctx.filter ='), 'blurred thumbnail generation should use canvas filtering off the animation path');
  assert.ok(show.includes('drawImageCover'), 'blurred thumbnail generation should overscan edges to avoid dark borders');
  assert.ok(show.includes('showPreparedPreview'), 'strong blur mode should be able to display a prepared preview without front-layer high-res fade');
  assert.ok(show.includes('showPreparedUrl'), 'wallpaper renderer should be able to restore a prepared original image URL directly');
  assert.ok(show.includes('currentOriginalUrl'), 'wallpaper renderer should track the current original URL for instant unblur');
  assert.ok(show.includes('currentOriginalId'), 'wallpaper renderer should bind the tracked original URL to the current wallpaper id');
  assert.ok(show.includes('keepCurrentUrl'), 'blur preview should preserve the current full image URL for instant unblur');
  assert.ok(show.includes('currentDisplaySource'), 'blur preview should be able to derive from the currently visible wallpaper');
  const newtab = read('js/newtab.js');
  const localStart = newtab.indexOf('function tryLoadLocalImages');
  const localEnd = newtab.indexOf('function tryLoadLocalWallpaper', localStart);
  assert.ok(localStart >= 0 && localEnd > localStart, 'local image wallpaper loader should be inspectable');
  const localBody = newtab.slice(localStart, localEnd);
  assert.ok(localBody.includes('D.blurThumbFor(id, blur)'), 'strong blur mode should check the prepared current blur preview');
  assert.ok(localBody.includes('S.showPreparedPreview(blurPreview, { keepCurrentUrl: true })'), 'strong blur mode should render prepared preview directly while preserving the original URL');
  assert.ok(localBody.includes('prepareCurrentOriginalUrl(id)'), 'cached blur startup should prepare the matching original for instant unblur');
  assert.ok(localBody.indexOf('D.blurThumbFor(id, blur)') < localBody.indexOf('D.idbGet(D.imgKey(id))'), 'prepared blur preview should be checked before reading the current full image blob');
  assert.ok(newtab.includes('function applyWallpaperRespectingBlur'), 'shared wallpaper apply path should honor strong blur mode');
  assert.ok(newtab.includes("applyWallpaperRespectingBlur(URL.createObjectURL(bingBlob), 'bing')"), 'cached Bing should use optimized blur preview mode');
  assert.ok(newtab.includes("applyWallpaperRespectingBlur(r.url, 'bing')"), 'network Bing should use optimized blur preview mode');
  assert.strictEqual(settingsCss.includes('.wallpaper-blur-active *'), false, 'wallpaper blur must not disable panel transitions globally');
  assert.strictEqual(show.includes('function shouldReduceMotion'), false, 'reduced motion must not pause video wallpaper playback');
  assert.strictEqual(show.includes('if (shouldReduceMotion())'), false, 'video playback should not branch into a paused reduced-motion state');
  assert.strictEqual(show.includes('wallpaperVideoBackEl'), false, 'video wallpaper should not keep a back video handoff layer');
  assert.strictEqual(show.includes('wallpaperVideoFrontEl'), false, 'video wallpaper should use a single video layer');
  assert.ok(show.includes('handleVideoVisibilityChange'), 'video wallpaper should pause while the page is hidden and resume when visible');
  assert.ok(show.includes('if (document.hidden)'), 'video wallpaper should not start playback while the page is hidden');
  assert.ok(show.includes('applyVideoWallpaper(url, transitionMs, sourceId, preparedThumb)'), 'video wallpaper should accept a prepared cover preview before playback');
}

function testColdPaletteIsNotLoadedByIndex() {
  assert.strictEqual(index.includes('js/command-palette.js'), false, 'command palette implementation should not be parser-loaded by index');
  assert.strictEqual(index.includes('css/command-palette.css'), false, 'command palette CSS should not be parser-loaded by index');
  assert.strictEqual(index.includes('js/palette.js'), false, 'legacy palette filename should not stay in index');
  assert.strictEqual(index.includes('css/palette.css'), false, 'legacy palette stylesheet filename should not stay in index');
  assert.ok(index.includes('js/newtab.js'), 'newtab orchestrator should remain in the startup path');
  const newtab = read('js/newtab.js');
  assert.ok(baseCss.includes('.cmd-palette-overlay'), 'startup CSS must hide the command palette shell before lazy palette CSS arrives');
  assert.ok(baseCss.includes('visibility: hidden'), 'startup command palette shell must not flash visible before lazy CSS arrives');
  assert.ok(baseCss.includes('opacity: 0'), 'startup command palette shell must not flash opaque before lazy CSS arrives');
  assert.ok(baseCss.includes('pointer-events: none'), 'hidden command palette shell must not intercept first-load clicks');
  assert.ok(newtab.includes('function ensurePalette()'), 'newtab should provide a lazy palette loader');
  assert.ok(newtab.includes("ensureStylesheet('css/command-palette.css')"), 'command palette CSS should load through the lazy loader');
  assert.ok(newtab.includes("ensureScript('js/command-palette.js')"), 'command palette JS should load through the lazy loader');
  assert.ok(newtab.includes('schedulePanelWarmup'), 'cold panel modules should be warmed after startup idle time');
  assert.ok(newtab.includes('requestIdleCallback'), 'panel warmup must use idle time instead of the first-paint path');
  assert.strictEqual(commandPalette.includes('.animate('), false, 'command palette open/close should use CSS transitions instead of allocating Web Animations per open');
  assert.ok(commandPalette.includes("cmdOverlay.classList.add('active')"), 'command palette should open through a CSS state class');
  assert.ok(commandPalette.includes("cmdOverlay.classList.remove('active', 'preparing')"), 'command palette should close through CSS state classes');
}

function testSettingsShortcutTabUsesDataModelWithoutPaletteScript() {
  assert.strictEqual(settingsPanel.includes('window.Palette ? window.Palette.loadHotkey()'), false, 'settings should not need command-palette.js to read normal hotkey');
  assert.strictEqual(settingsPanel.includes('window.Palette ? window.Palette.loadHiddenHotkey()'), false, 'settings should not need command-palette.js to read hidden hotkey');
  assert.strictEqual(settingsPanel.includes('window.Palette.saveHotkey'), false, 'settings should not need command-palette.js to save normal hotkey');
  assert.strictEqual(settingsPanel.includes('window.Palette.saveHiddenHotkey'), false, 'settings should not need command-palette.js to save hidden hotkey');
  assert.strictEqual(settingsPanel.includes('window.Palette.saveRecommend'), false, 'settings should not need command-palette.js to save recommendation preference');
  assert.ok(settingsPanel.includes('function loadPaletteHotkey()'), 'settings should read hotkeys through the shortcut model');
  assert.ok(settingsPanel.includes('function savePaletteRecommend'), 'settings should write palette settings through the shortcut model');
}

function testSettingsLoadDoesNotPersistDuringHydration() {
  assert.ok(settingsPanel.includes('isHydratingSettings'), 'settings hydration should be tracked');
  const loadStart = settingsPanel.indexOf('function loadSettings()');
  const resetStart = settingsPanel.indexOf('function resetAppearanceDefaults()', loadStart);
  assert.ok(loadStart >= 0 && resetStart > loadStart, 'loadSettings should exist before resetAppearanceDefaults');
  const body = settingsPanel.slice(loadStart, resetStart);
  assert.ok(body.includes('isHydratingSettings = true'), 'loadSettings should suppress persistence before applying values');
  assert.ok(body.includes('isHydratingSettings = false'), 'loadSettings should re-enable persistence after applying values');
  assert.ok(settingsPanel.includes('if (isHydratingSettings) return true;'), 'saveAllSettings should skip startup writes');
}

function testFullSettingsIsLoadedOnDemand() {
  assert.ok(index.includes('js/settings-bootstrap.js'), 'settings bootstrap should stay in the startup path');
  assert.strictEqual(index.includes('js/settings-panel.js'), false, 'settings panel should not be parser-loaded by index');
  assert.strictEqual(index.includes('js/settings.js'), false, 'legacy settings filename should not stay in index');
  assert.strictEqual(index.includes('js/settings-full.js'), false, 'legacy full-settings filename should not stay in index');
  assert.ok(settingsBootstrap.includes('function ensureFullSettings()'), 'settings bootstrap should expose a lazy full-settings loader');
  assert.ok(settingsBootstrap.includes("loadScript('js/settings-panel.js')"), 'settings bootstrap should load the full module lazily');
  assert.ok(settingsBootstrap.includes('window.SettingsPanel = {'), 'settings bootstrap should own window.SettingsPanel');
  assert.ok(settingsPanel.includes('window.SettingsPanelFull = {'), 'settings panel should export a secondary API');
  assert.strictEqual(settingsPanel.includes('window.SettingsPanel = {'), false, 'settings panel must not replace the startup SettingsPanel facade');
}

function testWallpaperThemeExtractionIsGatedBeforeCanvasWork() {
  assert.strictEqual(index.includes('js/wallpaper/theme.js'), false, 'wallpaper theme extraction should be loaded on demand');
  const applyStart = show.indexOf('function applyWallpaper');
  const thumbStart = show.indexOf('function generateThumbnail', applyStart);
  assert.ok(applyStart >= 0 && thumbStart > applyStart, 'applyWallpaper should exist');
  const body = show.slice(applyStart, thumbStart);
  const loadUiIndex = body.indexOf('WallpaperData.loadUI');
  const scheduleIndex = body.indexOf('scheduleThemeExtraction(img);');
  assert.ok(loadUiIndex >= 0, 'applyWallpaper should read theme setting before extracting colors');
  assert.ok(show.includes('function applyExtractedTheme'), 'theme extraction should still exist for enabled theme mode');
  assert.ok(show.includes('theme.extract(img)'), 'theme extraction should still use the decoded wallpaper image');
  assert.ok(scheduleIndex >= 0, 'applyWallpaper should schedule theme extraction instead of doing canvas work inline');
  assert.ok(loadUiIndex < scheduleIndex, 'theme setting should be checked before canvas color extraction is scheduled');
  assert.ok(show.includes('function ensureThemeModule()'), 'WallpaperShow should expose a lazy theme loader');
  assert.ok(show.includes("script.src = 'js/wallpaper/theme.js'"), 'theme module should be loaded only when needed');
  assert.ok(show.includes('ensureTheme: ensureThemeModule'), 'settings should be able to request the theme module lazily');
  assert.ok(show.includes('function refreshThemeFromCurrentWallpaper'), 'WallpaperShow should be able to theme the already visible wallpaper');
  assert.ok(show.includes('refreshTheme: refreshThemeFromCurrentWallpaper'), 'settings should request current-wallpaper theme refresh after toggling theme on');
  assert.ok(settingsBootstrap.includes('WallpaperShow.refreshTheme(true)'), 'startup settings should force-refresh the current wallpaper theme when enabling theme mode');
  assert.ok(settingsPanel.includes('WallpaperShow.refreshTheme(true)'), 'settings panel should force-refresh the current wallpaper theme before saved UI catches up');
  assert.ok(show.includes('function afterAnimationFrame'), 'WallpaperShow should be able to schedule post-paint follow-up work');
  assert.ok(show.includes('function scheduleIdle'), 'WallpaperShow should defer non-visual follow-up work off the fade frame');
  assert.ok(show.includes('scheduleThemeExtraction(img);'), 'theme extraction should be scheduled after the wallpaper fade is underway');
  assert.ok(show.includes("typeof transitionMs !== 'number'"), 'wallpaper fade should ignore legacy non-numeric transition labels');
  assert.ok(show.includes('window.setTimeout(finishTransition, transitionMs + 100)'), 'wallpaper fade should not hang if transitionend is missed');
}

function testSearchVisibilityModesStayAuthoritative() {
  const newtab = read('js/newtab.js');
  assert.strictEqual(newtab.includes('function isInCenter'), false, 'hover mode should no longer use a screen-center hot zone');
  assert.strictEqual(newtab.includes('_wasInCenter'), false, 'global mousemove should not track center-zone search visibility');
  assert.ok(newtab.includes('function canRevealSearch()'), 'newtab should centralize search reveal permission');
  assert.ok(newtab.includes("return SP.getSearchMode() !== 'never';"), 'never mode should block focus-driven search reveal');
  assert.ok(newtab.includes('function canFocusSearchFromWallpaper()'), 'newtab should keep wallpaper-click focus policy separate from hover reveal');
  assert.ok(newtab.includes("return SP.getSearchMode() === 'always';"), 'wallpaper clicks should only focus search in always-visible mode');
  assert.ok(newtab.includes('showSearch();'), 'search bar hover should still reveal the bar');
  assert.ok(newtab.includes('if (canFocusSearchFromWallpaper()) {'), 'wallpaper click should gate focus through the wallpaper policy');
  assert.ok(newtab.includes('searchInput.focus();'), 'wallpaper click should still be able to focus search when the policy allows it');
  assert.ok(searchCss.includes('.search-bar[data-visibility="hover"]'), 'hover mode should keep only the search bar hit area active');
  assert.ok(searchCss.includes('.search-bar[data-visibility="hover"]:hover'), 'hover mode should reveal through the native hover hit area');
  assert.ok(searchCss.includes('--search-hover-blur'), 'hover mode should avoid paying backdrop-filter cost while hidden');
  assert.ok(searchCss.includes('blur(var(--search-hover-blur, var(--search-blur, 24px)))'), 'search blur should be disableable in hidden hover state');
  assert.ok(searchCss.includes('visibility: visible'), 'hover mode should keep the transparent search bar hit area visible to pointer events');
  assert.ok(searchCss.includes('pointer-events: auto'), 'hover mode should allow pointer entry on the search bar itself');
  assert.ok(searchCss.includes('.search-bar[data-visibility="never"]'), 'never mode should have an explicit CSS state');
  assert.ok(searchCss.includes('visibility: hidden'), 'never mode should stay visually hidden even if stale classes remain');
  assert.ok(searchCss.includes('pointer-events: none'), 'never mode should not leave an invisible interactive search bar');
  assert.ok(settingsBootstrap.includes('applyUi(D.loadUI())'), 'settings facade refresh should re-apply persisted search visibility');
  assert.ok(settingsPanel.includes('loadSettings();'), 'settings panel refresh should re-apply persisted UI state');
}

function run() {
  testStorageStartsAtV320Baseline();
  testPreloadUsesSingleCurrentPreviewKey();
  testWallpaperFilterStaysOffTheDefaultCompositePath();
  testColdPaletteIsNotLoadedByIndex();
  testFullSettingsIsLoadedOnDemand();
  testSettingsShortcutTabUsesDataModelWithoutPaletteScript();
  testSettingsLoadDoesNotPersistDuringHydration();
  testWallpaperThemeExtractionIsGatedBeforeCanvasWork();
  testSearchVisibilityModesStayAuthoritative();
  console.log('hot path performance tests passed');
}

run();
