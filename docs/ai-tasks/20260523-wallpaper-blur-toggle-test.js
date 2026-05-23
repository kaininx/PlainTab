const assert = require('assert');
const fs = require('fs');

const store = Object.create(null);

global.window = global;
global.indexedDB = {
    open() {
        throw new Error('IndexedDB should not be opened by this check');
    }
};
global.localStorage = {
    getItem(key) {
        return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key, value) {
        store[key] = String(value);
    },
    removeItem(key) {
        delete store[key];
    }
};

require('../../js/wallpaper/data.js');

const D = global.WallpaperData;

assert.strictEqual(D.normalizeWallpaperBlur(undefined), 0, 'empty blur is off');
assert.strictEqual(D.normalizeWallpaperBlur(0), 0, '0 keeps blur off');
assert.strictEqual(D.normalizeWallpaperBlur(1), 5, 'legacy low blur snaps on');
assert.strictEqual(D.normalizeWallpaperBlur(5), 5, '5 keeps blur on');
assert.strictEqual(D.normalizeWallpaperBlur(15), 5, 'legacy high blur snaps to the single on value');

localStorage.setItem('ptab_ui', JSON.stringify({ wallpaper: { blur: 15 } }));
assert.strictEqual(D.loadUI().wallpaper.blur, 5, 'stored legacy blur normalizes to on');

const settingsPanelSource = fs.readFileSync('js/settings-panel.js', 'utf8');
assert(settingsPanelSource.includes('type="checkbox" id="modalWallpaperBlur"'), 'settings UI uses a switch for wallpaper blur');
assert(!settingsPanelSource.includes('modalWallpaperBlurRange'), 'settings UI no longer exposes a blur range');
assert(!settingsPanelSource.includes('modalWallpaperBlurNum'), 'settings UI no longer exposes a blur number input');

console.log('wallpaper blur toggle behavior ok');
