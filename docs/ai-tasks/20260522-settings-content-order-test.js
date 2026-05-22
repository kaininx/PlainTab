const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..', '..');

function read(file) {
  return fs.readFileSync(path.join(repoRoot, file), 'utf8');
}

function sliceFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert(start >= 0, `${name} should exist`);
  const next = source.indexOf('\n    function ', start + 1);
  return next >= 0 ? source.slice(start, next) : source.slice(start);
}

function assertOrder(source, labels, message) {
  let last = -1;
  labels.forEach((label) => {
    const next = source.indexOf(label);
    assert(next >= 0, `${message}: missing ${label}`);
    assert(next > last, `${message}: ${label} should appear after the previous item`);
    last = next;
  });
}

const settings = read('js/settings-panel.js');
const wallpaperSettings = read('js/settings-wallpaper.js');

function testAppearanceKeepsThemeFirstThenUsabilityAndSurface() {
  const block = sliceFunction(settings, 'buildAppearanceHTML');
  assertOrder(block, [
    "tr('settingsGroupTheme')",
    "tr('themeEnableLabel')",
    "tr('accentColorLabel')",
    "tr('settingsGroupSurface')",
    "tr('panelOpacityLabel')",
    "tr('opacityLabel')",
    "tr('uiRadiusLabel')",
    "tr('fontScaleLabel')",
    "tr('reducedMotionLabel')"
  ], 'appearance settings order');
}

function testSearchStartsWithSurfaceThenLayoutThenBehavior() {
  const block = sliceFunction(settings, 'buildSearchHTML');
  assertOrder(block, [
    "tr('settingsGroupSearchSurface')",
    "tr('searchSurface')",
    "tr('searchBackground')",
    "tr('searchBlur')",
    "tr('searchRadius')",
    "tr('searchShadow')",
    "tr('settingsGroupSearchLayout')",
    "tr('searchLabel')",
    "tr('searchPosition')",
    "tr('searchWidth')",
    "tr('searchIconVisibility')",
    "tr('searchIconPosition')",
    "tr('settingsGroupSearchBehavior')",
    "tr('searchPlaceholderCustom')",
    "tr('searchEnterBehavior')",
    "tr('searchHistory')",
    "tr('settingsGroupSearchEngine')",
    "tr('engineLabel')"
  ], 'search settings order');
}

function testCommandPanelStartsWithOpeningAndEndsWithSkin() {
  const block = sliceFunction(settings, 'buildShortcutsHTML');
  assertOrder(block, [
    "tr('cpGroupOpen')",
    "tr('cpPlacementLabel')",
    "tr('cpHotkeyLabel')",
    "tr('cpHiddenHotkeyLabel')",
    "tr('cpGroupContent')",
    "tr('cpRecommendLabel')",
    "tr('cpGroupAppearance')",
    "tr('cpSkinLabel')"
  ], 'command panel settings order');
}

function testWallpaperSourceAndDisplayOrder() {
  const sourceDefs = sliceFunction(wallpaperSettings, 'sourceDefs');
  assertOrder(sourceDefs, [
    "id: 'bing'",
    "id: 'upload'",
    "id: 'folder'",
    "id: 'wallhaven'",
    "id: 'rss'",
    "id: 'api'"
  ], 'wallpaper source order');

  const display = sliceFunction(settings, 'buildWallpaperDisplayHTML');
  assertOrder(display, [
    "tr('wallpaperFit')",
    "tr('wallpaperPosition')",
    "tr('overlayLabel')",
    "tr('wallpaperVignette')",
    "tr('wallpaperBlur')"
  ], 'wallpaper display settings order');
}

function testRestorePrioritizesCoreHomepageSurfaces() {
  const block = sliceFunction(settings, 'buildRestoreHTML');
  assertOrder(block, [
    "tr('tabWallpaper')",
    "tr('tabSearch')",
    "tr('tabAppearance')",
    "tr('tabShortcuts')",
    "tr('settingsGroupRestoreGlobal')"
  ], 'restore settings order');
}

function testDataOffersSaferExportFirst() {
  const block = sliceFunction(settings, 'buildDataHTML');
  assertOrder(block, [
    "tr('dataEncrypted')",
    "settingItem('JSON'",
    "settingGroup(tr('dataImport')"
  ], 'data settings order');
}

testAppearanceKeepsThemeFirstThenUsabilityAndSurface();
testSearchStartsWithSurfaceThenLayoutThenBehavior();
testCommandPanelStartsWithOpeningAndEndsWithSkin();
testWallpaperSourceAndDisplayOrder();
testRestorePrioritizesCoreHomepageSurfaces();
testDataOffersSaferExportFirst();
console.log('settings content order tests passed');
