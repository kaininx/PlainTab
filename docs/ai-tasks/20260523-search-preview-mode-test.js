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
    assert(next > last, `${message}: ${label} should appear after previous item`);
    last = next;
  });
}

const settings = read('js/settings-panel.js');
const runtime = read('js/newtab.js');
const css = read('css/settings.css');
const i18nDir = path.join(repoRoot, 'js', 'i18n');

function testSearchTabStartsWithPreviewAction() {
  const block = sliceFunction(settings, 'buildSearchHTML');
  assertOrder(block, [
    "tr('searchPreviewAction')",
    "tr('settingsGroupSearchSurface')",
    "tr('searchSurface')"
  ], 'search preview action order');
}

function testPreviewSurfaceApiExists() {
  assert(
    /var\s+isSearchPreviewOpen\s*=\s*false/.test(settings),
    'settings panel should track search preview state'
  );
  ['openSearchPreview', 'closeSearchPreview', 'returnToSearchSettings'].forEach((name) => {
    assert(settings.includes(`function ${name}(`), `${name} should be implemented`);
  });
  ['isSearchPreviewOpen', 'openSearchPreview', 'closeSearchPreview'].forEach((api) => {
    assert(settings.includes(`${api}:`), `SettingsPanelFull should expose ${api}`);
  });
}

function testPreviewControlsAreVisualOnly() {
  const block = sliceFunction(settings, 'buildSearchPreviewPanelHTML');
  [
    'previewSearchSurface',
    'previewSearchBgRange',
    'previewSearchBlurRange',
    'previewSearchRadius',
    'previewSearchShadow',
    'previewSearchMode',
    'previewSearchPos',
    'previewSearchWidthRange',
    'previewSearchIconVisibility',
    'previewSearchIconPosition'
  ].forEach((id) => assert(block.includes(id), `preview panel should include ${id}`));

  [
    'previewEngineSel',
    'previewSearchEnterBehavior',
    'previewSearchPlaceholder',
    'previewSearchHistoryLimit'
  ].forEach((id) => assert(!block.includes(id), `preview panel should not include ${id}`));
}

function testRuntimeTreatsPreviewAsSettingsSurface() {
  const surfaceBlock = sliceFunction(runtime, 'settingsSurfaceActive');
  assert(
    surfaceBlock.includes('SP.isSearchPreviewOpen') && surfaceBlock.includes('SP.isSearchPreviewOpen()'),
    'runtime should treat search preview as a settings surface'
  );
  const clickBlock = runtime.slice(runtime.indexOf("document.addEventListener('click'"));
  assert(
    clickBlock.includes('SP.closeSearchPreview') && clickBlock.includes('return;'),
    'blank-page click handling should close search preview before focusing search'
  );
}

function testCssDefinesPreviewSurface() {
  assert(css.includes('.search-preview-panel'), 'settings CSS should style the search preview panel');
  assert(
    /html\[data-search-preview="true"\]\s+\.search-bar/.test(css),
    'settings CSS should force the real search bar visible in preview mode'
  );
}

function testI18nKeysComplete() {
  const keys = [
    'searchPreviewAction',
    'searchPreviewTitle',
    'searchPreviewDesc',
    'searchPreviewBack',
    'searchPreviewClose'
  ];
  fs.readdirSync(i18nDir).filter((file) => file.endsWith('.js')).forEach((file) => {
    const source = read(path.join('js', 'i18n', file));
    keys.forEach((key) => {
      assert(source.includes(`"${key}"`), `${file} should define ${key}`);
    });
  });
}

testSearchTabStartsWithPreviewAction();
testPreviewSurfaceApiExists();
testPreviewControlsAreVisualOnly();
testRuntimeTreatsPreviewAsSettingsSurface();
testCssDefinesPreviewSurface();
testI18nKeysComplete();
console.log('search preview mode behavior ok');
