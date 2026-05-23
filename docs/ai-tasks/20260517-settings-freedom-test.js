const assert = require('assert');
const fs = require('fs');

const settingsBootstrap = fs.readFileSync('js/settings-bootstrap.js', 'utf8');
const settings = fs.readFileSync('js/settings-panel.js', 'utf8');
const newtab = fs.readFileSync('js/newtab.js', 'utf8');
const data = fs.readFileSync('js/wallpaper/data.js', 'utf8');
const searchCss = fs.readFileSync('css/search.css', 'utf8');
const wallpaperCss = fs.readFileSync('css/wallpaper.css', 'utf8');
const baseCss = fs.readFileSync('css/base.css', 'utf8');
const settingsCss = fs.readFileSync('css/settings.css', 'utf8');
const settingsStyleCss = `${baseCss}\n${settingsCss}`;

[
  'DEFAULT_SEARCH_ALIGN',
  'DEFAULT_SEARCH_ICON_POSITION',
  'DEFAULT_SEARCH_WIDTH',
  'DEFAULT_SEARCH_BG_OPACITY',
  'DEFAULT_SEARCH_BLUR',
  'DEFAULT_WALLPAPER_FIT',
  'DEFAULT_WALLPAPER_POSITION',
  'DEFAULT_WALLPAPER_BLUR',
  'DEFAULT_WALLPAPER_BLUR_MAX',
  'DEFAULT_UI_RADIUS',
  'function searchPositionParts',
  'function applySearchIconPosition',
  'function applySearchWidth',
  'function applySearchBackgroundOpacity',
  'function applySearchBlur',
  'function applyWallpaperFit',
  'function applyWallpaperPosition',
  'function applyWallpaperBlur',
  'function normalizeWallpaperBlur',
  'function queueWallpaperBlurSave',
  'function syncWallpaperBlurPerformanceMode',
  'function enhanceModalSelects',
  'function openCustomSelect',
  'function syncCustomSelects',
  'function applyUiRadius',
].forEach((token) => {
  assert.ok(settings.includes(token), `settings-panel.js should include ${token}`);
});

[
  'ui.search.position = searchPosition',
  'ui.search.align = searchAlign',
  'ui.search.iconPosition = searchIconPosition',
  'ui.search.width = searchWidth',
  'ui.search.backgroundOpacity = searchBackgroundOpacity',
  'ui.search.blur = searchBlur',
  'ui.wallpaper.fit = wallpaperFit',
  'ui.wallpaper.position = wallpaperPosition',
  'ui.wallpaper.blur = wallpaperBlur',
  'ui.appearance.radius = uiRadius',
].forEach((token) => {
  assert.ok(settings.includes(token), `saveAllSettings should persist ${token}`);
});

[
  "position: 'center'",
  "align: 'center'",
  "iconPosition: 'right'",
  'width: 560',
  'backgroundOpacity: 0.1',
  'blur: 24',
  "fit: 'cover'",
  'blur: 0',
  "appearance: {",
  "radius: 'soft'",
].forEach((token) => {
  assert.ok(data.includes(token), `DEFAULT_UI should include ${token}`);
});

[
  '--search-width',
  '--search-bg-opacity',
  '--search-blur',
  '.search-bar[data-position="top"]',
  '.search-bar[data-position="edge-top"]',
  '.search-bar[data-position="upper"]',
  '.search-bar[data-position="center-upper"]',
  '.search-bar[data-position="center"]',
  '.search-bar[data-position="center-lower"]',
  '.search-bar[data-position="lower"]',
  '.search-bar[data-position="bottom"]',
  '.search-bar[data-position="edge-bottom"]',
  '.search-bar[data-icon-position="left"]',
  '.search-bar[data-icon-position="right"]',
].forEach((token) => {
  assert.ok(searchCss.includes(token), `search.css should include ${token}`);
});

[
  'top-left',
  'top-center',
  'top-right',
  'center-left',
  'center-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
  '--search-left: 6vw',
  '--search-left: 94vw',
].forEach((token) => {
  assert.strictEqual(searchCss.includes(token), false, `search.css should not keep edge-grid token ${token}`);
});

[
  '--wallpaper-fit',
  '--wallpaper-position',
].forEach((token) => {
  assert.ok(wallpaperCss.includes(token), `wallpaper.css should include ${token}`);
});

assert.ok(settings.includes('--wallpaper-blur'), 'settings should still persist the wallpaper blur value');

[
  'rgba(var(--surface-base-rgb), var(--panel-opacity))',
  '--settings-panel-bg',
  '.setting-warning',
  '.setting-group',
  '.settings-page-body',
  '.custom-select',
  '.custom-select-trigger',
  '.custom-select-menu',
  '.custom-select-option',
  '.custom-select-native',
  'mask-image',
].forEach((token) => {
  assert.ok(settingsStyleCss.includes(token), `settings styles should use panel opacity token ${token}`);
});

[
  '.wallpaper-blur-active',
].forEach((token) => {
  assert.ok(wallpaperCss.includes(token), `wallpaper.css should include ${token}`);
});

assert.strictEqual(wallpaperCss.includes('filter: blur(var(--wallpaper-blur'), false, 'wallpaper blur should not use live full-screen CSS filters');
assert.strictEqual(wallpaperCss.includes('wallpaper-blur-ui-open'), false, 'wallpaper blur should stay visually stable while UI is open');
assert.strictEqual(settings.includes('suspendWallpaperBlurForUi'), false, 'settings panel should not pause wallpaper blur while UI is open');
assert.strictEqual(settings.includes('wallpaperBlurPerfHint'), false, 'settings should not expose implementation-specific wallpaper blur warnings');
assert.ok(settings.includes('wallpaperBlurPreviewToken'), 'wallpaper blur preview changes should guard stale async updates');
assert.ok(settings.includes('function showCurrentWallpaperBlur'), 'enabling strong blur should update the currently visible wallpaper immediately');
assert.ok(settings.includes('function showCurrentWallpaperOriginal'), 'disabling wallpaper blur should restore the currently visible original immediately');
assert.ok(settings.includes('S.showPreparedUrl'), 'disabling wallpaper blur should restore a full image URL without advancing rotation');
assert.ok(settings.includes('S.currentOriginalUrl'), 'blur toggles should first reuse the visible full image URL');
assert.ok(settings.includes('S.currentOriginalId === id'), 'blur toggles should not reuse an original URL from a different wallpaper');
assert.ok(settings.includes('S.currentDisplaySource'), 'enabling blur should derive from the currently visible image when possible');
assert.ok(settings.includes('showBlurFromSource(id, blur, quickThumb'), 'enabling blur should have an immediate thumbnail fallback');
assert.ok(settings.includes('S.showPreparedPreview(quickThumb)'), 'disabling blur should visually clear blur before the full image read finishes');
assert.ok(settings.includes('keepCurrentUrl: true'), 'blurred previews should preserve the original URL for instant unblur');
const refreshBlurStart = settings.indexOf('function refreshVisibleBlurPreview');
const refreshBlurEnd = settings.indexOf('function syncNextUploadPosition', refreshBlurStart);
assert.ok(refreshBlurStart >= 0 && refreshBlurEnd > refreshBlurStart, 'refreshVisibleBlurPreview should be inspectable');
assert.strictEqual(settings.slice(refreshBlurStart, refreshBlurEnd).includes('window.reloadWallpaper'), false, 'realtime blur changes must not reload and advance wallpaper rotation');
assert.ok(settings.includes('this.checked ? 5 : 0'), 'wallpaper blur switch should only write the off/on values');
assert.ok(settings.includes('settingGroup('), 'appearance settings should be grouped');
assert.ok(settings.includes("select.classList.add('custom-select-native')"), 'native selects should be hidden after custom select enhancement');
assert.ok(settings.includes("dispatchEvent(new Event('change'"), 'custom select should keep the existing select change flow');
assert.ok(settings.includes("document.getElementById('modalThemeEnabled')"), 'reset should sync the theme toggle control');
assert.ok(settings.includes('el.checked = !!value'), 'reset should visually sync the theme toggle');
const resetStart = settings.indexOf('function resetAppearanceDefaults()');
const resetEnd = settings.indexOf('// ================================================================', resetStart + 1);
assert.ok(resetStart >= 0 && resetEnd > resetStart, 'resetAppearanceDefaults should be present');
const resetBody = settings.slice(resetStart, resetEnd);
assert.strictEqual(resetBody.includes('saveHotkey'), false, 'appearance reset should not reset command palette hotkeys');
assert.strictEqual(resetBody.includes('saveHiddenHotkey'), false, 'appearance reset should not reset hidden palette hotkey');
assert.strictEqual(resetBody.includes('saveRecommend'), false, 'appearance reset should not reset command palette recommendation setting');
assert.ok(settings.includes('type="checkbox" id="modalWallpaperBlur"'), 'wallpaper blur should be exposed as an off/on switch');
assert.strictEqual(settings.includes('modalWallpaperBlurRange'), false, 'wallpaper blur should not expose a continuous range');
assert.ok(settings.includes('wallpaperBlur >= 5'), 'wallpaper blur should switch to optimized preview mode at 5');
assert.ok(settings.includes('return normalized > 0 ? 5 : 0;'), 'wallpaper blur normalization should collapse every positive value to the single on value');
assert.ok(settings.includes('document.addEventListener(\'keydown\', handleRecording'), 'shortcut recorder should listen for keydown');
assert.ok(settings.includes('e.key.toUpperCase()'), 'shortcut recorder should accept lowercase letter keys');
assert.ok(settings.includes('e.preventDefault()'), 'shortcut recorder should prevent browser shortcuts while recording');
assert.ok(settings.includes('e.stopPropagation()'), 'shortcut recorder should stop global shortcuts while recording');
assert.strictEqual(settings.includes('--wallpaper-scale'), false, 'wallpaper blur should not scale the wallpaper');
assert.strictEqual(wallpaperCss.includes('--wallpaper-scale'), false, 'wallpaper layer should not scale for blur compensation');
assert.strictEqual(settingsCss.includes('.settings-page-header::after'), false, 'header should not use opaque fade overlay');
const blurControlStart = settings.indexOf('var wallpaperBlurControl');
const blurControlEnd = settings.indexOf('var overlayControl');
assert.ok(blurControlStart >= 0 && blurControlEnd > blurControlStart, 'wallpaper blur control should be declared');
assert.strictEqual(settings.slice(blurControlStart, blurControlEnd).includes('wallpaperBlurPerfHint'), false, 'wallpaper blur hint should be outside inline switch controls');

const themeIndex = settings.indexOf("settingItem(tr('themeEnableLabel')");
const accentIndex = settings.indexOf("settingItem(tr('accentColorLabel')");
const searchIndex = settings.indexOf("settingItem(tr('searchLabel')");
assert.ok(themeIndex >= 0, 'appearance tab should render theme setting');
assert.ok(accentIndex >= 0, 'appearance tab should render accent setting');
assert.ok(searchIndex >= 0, 'search tab should render search visibility setting');
assert.ok(themeIndex < accentIndex, 'theme setting should be the first appearance control');
assert.strictEqual(settings.includes('id="modalSearchAlign"'), false, 'search alignment should be folded into 9-position control');

assert.ok(newtab.includes('function eventMatchesHotkey'), 'newtab should match configurable palette hotkeys');
assert.ok(newtab.includes('window.Palette.loadHotkey()'), 'newtab should read the saved normal palette hotkey');
assert.ok(newtab.includes('window.Palette.loadHiddenHotkey()'), 'newtab should read the saved hidden palette hotkey');
assert.strictEqual(newtab.includes("e.key.toLowerCase() === 'k' && !e.shiftKey"), false, 'newtab should not hardcode Ctrl+K for the normal palette');
assert.strictEqual(newtab.includes("e.key.toLowerCase() === 'k'"), false, 'newtab should not hardcode K for palette shortcuts');
assert.ok(settingsBootstrap.includes("loadScript('js/settings-panel.js')"), 'settings bootstrap should lazy-load the full settings module');
assert.ok(settings.includes('window.SettingsPanelFull = {'), 'settings-panel should export the complete settings API');

console.log('settings freedom behavior hooks ok');
