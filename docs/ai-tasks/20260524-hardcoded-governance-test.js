const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function declarationValue(body, property) {
  const match = body.match(new RegExp(`${property}:\\s*([^;]+);`));
  return match ? match[1].replace(/\s+/g, ' ').trim() : '';
}

function sourceRgb(css, selectorPrefix, property) {
  const out = {};
  const re = /([^{}]+)\{([^{}]+)\}/g;
  let match;
  while ((match = re.exec(css))) {
    const selector = match[1];
    const body = match[2];
    ['bing', 'upload', 'folder', 'rss', 'wallhaven', 'api'].forEach((source) => {
      if (!selector.includes(`.${selectorPrefix}.${source}`)) return;
      let value = declarationValue(body, property);
      if (value === 'var(--source-rgb)') value = declarationValue(body, '--source-rgb');
      if (value) out[source] = value;
    });
  }
  return out;
}

function assertEqualMaps(label, expected, actual) {
  Object.keys(expected).forEach((key) => {
    assert.strictEqual(actual[key], expected[key], `${label} should use the shared ${key} source color`);
  });
}

function testWallpaperSourceColorsStayInSync() {
  const css = read('css/settings.css');
  const chip = sourceRgb(css, 'wp-mode-chip', '--chip-signal-rgb');
  const glyph = sourceRgb(css, 'wallpaper-source-glyph', '--source-rgb');
  const dot = sourceRgb(css, 'wallpaper-detail-source-dot', '--source-rgb');
  const expected = {
    bing: '59, 130, 246',
    upload: '34, 197, 94',
    folder: '234, 179, 8',
    rss: '249, 115, 22',
    wallhaven: '6, 182, 212',
    api: '168, 85, 247',
  };

  assertEqualMaps('wp-mode-chip', expected, chip);
  assertEqualMaps('wallpaper-source-glyph', expected, glyph);
  assertEqualMaps('wallpaper-detail-source-dot', expected, dot);
}

function testRefreshIntervalsHaveOneRuntimeSource() {
  const data = read('js/wallpaper/data.js');
  const settings = read('js/settings-panel.js');

  assert.ok(data.includes('function refreshIntervalOptions'), 'WallpaperData should expose shared refresh interval options');
  assert.ok(data.includes('refreshIntervalOptions:'), 'WallpaperData public API should export refreshIntervalOptions');
  assert.strictEqual((settings.match(/\b86400000\b|\b259200000\b|\b604800000\b/g) || []).length, 0,
    'settings-panel should render refresh intervals from WallpaperData instead of repeating day-ms literals');
}

function testSettingsDefaultsComeFromDataLayer() {
  const bootstrap = read('js/settings-bootstrap.js');
  const panel = read('js/settings-panel.js');

  assert.ok(bootstrap.includes('D.defaultUISection'), 'settings-bootstrap should derive defaults from WallpaperData.defaultUISection');
  assert.ok(panel.includes('D.defaultUISection'), 'settings-panel should derive defaults from WallpaperData.defaultUISection');
}

testWallpaperSourceColorsStayInSync();
testRefreshIntervalsHaveOneRuntimeSource();
testSettingsDefaultsComeFromDataLayer();

console.log('hardcoded governance checks passed');
