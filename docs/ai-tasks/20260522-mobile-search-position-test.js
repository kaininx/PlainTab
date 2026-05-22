const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..', '..');

function read(file) {
  return fs.readFileSync(path.join(repoRoot, file), 'utf8');
}

function testMobileCenterSearchUsesUpperVisualPosition() {
  const css = read('css/search.css');
  const mobileMatch = css.match(/@media\s*\(max-width:\s*480px\)\s*\{([\s\S]*)\}\s*$/);
  assert(mobileMatch, 'search CSS should define a narrow-screen breakpoint');
  const mobileCss = mobileMatch[1];
  assert(
    /\.search-bar\[data-position="center"\]\s*\{[\s\S]*--search-top:\s*26%/.test(mobileCss),
    'narrow screens should render the default center search position at the upper visual height'
  );
  assert(
    !/\.search-bar\[data-position="(?:top|upper|center-upper|center-lower|lower|bottom|edge-top|edge-bottom)"\]/.test(
      mobileCss.replace(/\.search-bar\[data-position="center"\][\s\S]*?\}/, '')
    ),
    'narrow-screen default adjustment should not override explicit non-center position presets'
  );
}

function testNarrowRestoreDefaultsUsesUpperPosition() {
  const settingsPanel = read('js/settings-panel.js');
  assert(
    /function defaultSearchPosition\(\)\s*\{[\s\S]*matchMedia\('\(max-width:\s*480px\)'\)[\s\S]*return 'upper'/.test(settingsPanel),
    'settings panel should compute a narrow-screen search default position'
  );
  assert(
    /function resetSearchDefaults\(\)\s*\{[\s\S]*applySearchPosition\(defaultSearchPosition\(\)\)/.test(settingsPanel),
    'restoring search defaults should use the responsive default search position'
  );
}

function testStoredDefaultSearchPositionRemainsCenter() {
  const settingsBootstrap = read('js/settings-bootstrap.js');
  const settingsPanel = read('js/settings-panel.js');
  const data = read('js/wallpaper/data.js');
  assert(
    /DEFAULT_SEARCH_POSITION\s*=\s*'center'/.test(settingsBootstrap),
    'startup defaults should keep the stored search position as center'
  );
  assert(
    /DEFAULT_SEARCH_POSITION\s*=\s*'center'/.test(settingsPanel),
    'settings panel defaults should keep the stored search position as center'
  );
  assert(
    /position:\s*'center'/.test(data),
    'storage defaults should keep the stored search position as center'
  );
}

testMobileCenterSearchUsesUpperVisualPosition();
testNarrowRestoreDefaultsUsesUpperPosition();
testStoredDefaultSearchPositionRemainsCenter();
console.log('mobile search position tests passed');
