const assert = require('assert');
const fs = require('fs');

const palette = fs.readFileSync('js/command-palette.js', 'utf8');
const data = fs.readFileSync('js/wallpaper/data.js', 'utf8');
const settings = fs.readFileSync('js/settings-panel.js', 'utf8');
const settingsCss = fs.readFileSync('css/settings.css', 'utf8');

assert.ok(
  palette.includes('cpOverlayPointerStartedOnBackdrop'),
  'command palette should remember whether pointer down started on the backdrop'
);
assert.ok(
  palette.includes("cmdOverlay.addEventListener('pointerdown'"),
  'command palette should track backdrop pointerdown before deciding to close'
);
assert.ok(
  palette.includes('if (e.target === cmdOverlay && cpOverlayPointerStartedOnBackdrop) closePalette();'),
  'command palette should close from backdrop click only when the gesture started on the backdrop'
);

assert.ok(
  data.includes('function ensureDefaultGithubShortcut(model)'),
  'data layer should expose a single helper for restoring the built-in GitHub shortcut'
);
const resetShortcutStart = data.indexOf('function resetShortcutSettings()');
const resetShortcutEnd = data.indexOf('function loadOrder()', resetShortcutStart);
assert.ok(resetShortcutStart >= 0 && resetShortcutEnd > resetShortcutStart, 'resetShortcutSettings should be inspectable');
const resetShortcutBody = data.slice(resetShortcutStart, resetShortcutEnd);
assert.ok(
  resetShortcutBody.includes('ensureDefaultGithubShortcut(model);'),
  'shortcut settings reset should restore the built-in GitHub shortcut'
);
assert.ok(
  data.includes('DEFAULT_GITHUB_ICON') && data.includes('icons[existing.id] = DEFAULT_GITHUB_ICON;'),
  'restoring the built-in GitHub shortcut should also restore its icon'
);

const wallpaperResetStart = settings.indexOf('function resetWallpaperDefaults()');
const wallpaperResetEnd = settings.indexOf('function resetShortcutsDefaults()', wallpaperResetStart);
assert.ok(wallpaperResetStart >= 0 && wallpaperResetEnd > wallpaperResetStart, 'resetWallpaperDefaults should be inspectable');
const wallpaperResetBody = settings.slice(wallpaperResetStart, wallpaperResetEnd);
assert.ok(
  wallpaperResetBody.includes('applyThemeMode(false);'),
  'wallpaper reset should reset wallpaper theme extraction to its default off state'
);

const switchStart = settingsCss.indexOf('.upload-gallery-switch');
const switchEnd = settingsCss.indexOf('.wallpaper-thumb', switchStart);
assert.ok(switchStart >= 0 && switchEnd > switchStart, 'L1 upload gallery switch CSS should be inspectable');
const switchCss = settingsCss.slice(switchStart, switchEnd);
assert.ok(
  switchCss.includes('--l1-neon-blue: #19e6ff;') &&
    switchCss.includes('--l1-neon-rose: #ff3df2;'),
  'L1 upload gallery switch should use only two fixed marker colors'
);
assert.ok(
  settingsCss.includes('grid-template-columns: minmax(0, 1fr) 12px;'),
  'L1 upload gallery switch rail should stay very narrow'
);
assert.ok(
  switchCss.includes('--l1-marker-image-height: 36px;') &&
    switchCss.includes('--l1-marker-video-height: 14px;') &&
    switchCss.includes('--l1-marker-image-height: 14px;') &&
    switchCss.includes('--l1-marker-video-height: 36px;'),
  'L1 upload gallery switch should render two capsule markers with only the active marker taller'
);
assert.ok(
  switchCss.includes('align-items: flex-end;') && switchCss.includes('margin-left: auto;'),
  'L1 upload gallery switch capsules should sit closer to the outer edge'
);
assert.strictEqual(
  switchCss.includes('var(--settings-accent'),
  false,
  'L1 upload gallery switch should not inherit the theme accent color'
);
assert.ok(
  switchCss.includes('width: 2px;') && switchCss.includes('border-radius: 999px;'),
  'L1 upload gallery switch capsule markers should stay thin'
);
assert.ok(
  switchCss.includes('opacity: 0.22;') && switchCss.includes('opacity: 0.62;'),
  'L1 upload gallery switch should keep a low visual presence'
);
assert.strictEqual(
  /l1-neon-(scan|entangle|nudge)|clip-path:\s*polygon|--l1-neon-acid|\.upload-gallery-switch::before/.test(switchCss),
  false,
  'L1 upload gallery switch should avoid extra effects or overlay markers beyond the two capsules'
);
assert.strictEqual(
  switchCss.includes('0 0 0 1px'),
  false,
  'L1 upload gallery switch should not draw a visible border ring'
);

console.log('restore defaults and L1 panel polish behavior ok');
