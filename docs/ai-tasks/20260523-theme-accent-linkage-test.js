const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const repoRoot = path.join(__dirname, '..', '..');

function loadThemeModule() {
  const props = {};
  const attrs = {};
  const context = {
    window: {},
    document: {
      documentElement: {
        style: {
          setProperty(name, value) {
            props[name] = String(value);
          },
          removeProperty(name) {
            delete props[name];
          }
        },
        setAttribute(name, value) {
          attrs[name] = String(value);
        }
      }
    }
  };
  context.window = context;
  vm.runInNewContext(fs.readFileSync(path.join(repoRoot, 'js/theme.js'), 'utf8'), context);
  return { theme: context.PlainTabTheme, props, attrs };
}

function testCustomAccentDoesNotReplaceWallpaperSurfaceAliases() {
  const { theme, props, attrs } = loadThemeModule();
  theme.applyWallpaperTheme();
  theme.applyCustomAccentTheme('#ff3366');

  assert.strictEqual(attrs['data-ui-theme-source'], 'wallpaper', 'custom accent should not change the active surface theme source');
  assert.strictEqual(attrs['data-wallpaper-theme'], 'on', 'custom accent should not turn off wallpaper theme mode');
  assert.strictEqual(props['--surface-base-rgb'], 'var(--theme-surface-base-rgb)', 'wallpaper surface base alias should remain wallpaper-driven');
  assert.strictEqual(props['--surface-elevated-rgb'], 'var(--theme-surface-elevated-rgb)', 'wallpaper elevated alias should remain wallpaper-driven');
  assert.strictEqual(props['--tint-rgb'], 'var(--theme-tint-rgb)', 'wallpaper tint alias should remain wallpaper-driven');
  assert.strictEqual(props['--stroke-rgb'], 'var(--theme-stroke-rgb)', 'wallpaper stroke alias should remain wallpaper-driven');
  assert.strictEqual(props['--accent-rgb'], '255, 51, 102', 'custom accent should override only the active accent alias');
}

function testCustomAccentOnDefaultThemeLeavesDefaultSurfacesAlone() {
  const { theme, props, attrs } = loadThemeModule();
  theme.applyDefaultSurfaceTheme();
  theme.applyCustomAccentTheme('#22cc88');

  assert.strictEqual(attrs['data-ui-theme-source'], 'default', 'default surface theme should remain the active source');
  assert.strictEqual(attrs['data-wallpaper-theme'], 'off', 'default surface theme should keep wallpaper theme off');
  assert.strictEqual(props['--surface-base-rgb'], undefined, 'custom accent should not install a custom surface base alias');
  assert.strictEqual(props['--surface-elevated-rgb'], undefined, 'custom accent should not install a custom elevated surface alias');
  assert.strictEqual(props['--tint-rgb'], undefined, 'custom accent should not install a custom tint alias');
  assert.strictEqual(props['--stroke-rgb'], undefined, 'custom accent should not install a custom stroke alias');
  assert.strictEqual(props['--accent-rgb'], '34, 204, 136', 'custom accent should still override the active accent alias');
}

testCustomAccentDoesNotReplaceWallpaperSurfaceAliases();
testCustomAccentOnDefaultThemeLeavesDefaultSurfacesAlone();
console.log('theme accent linkage behavior ok');
