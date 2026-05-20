const assert = require('assert');
const fs = require('fs');

const indexHtml = fs.readFileSync('index.html', 'utf8');
const notice = fs.readFileSync('js/app-notice.js', 'utf8');
const settings = fs.readFileSync('js/settings-panel.js', 'utf8');
const wallpaper = fs.readFileSync('js/settings-wallpaper.js', 'utf8');
const css = fs.readFileSync('css/settings.css', 'utf8');
const en = fs.readFileSync('js/i18n/en.js', 'utf8');
const zh = fs.readFileSync('js/i18n/zh-CN.js', 'utf8');

assert.ok(
  indexHtml.indexOf('js/settings-bootstrap.js') < indexHtml.indexOf('js/app-notice.js') &&
    indexHtml.indexOf('js/app-notice.js') < indexHtml.indexOf('js/newtab.js'),
  'app notice should load after i18n/settings bootstrap and before runtime orchestration'
);

assert.ok(notice.includes('window.PlainTabNotice'), 'app notice should expose a global PlainTabNotice API');
assert.ok(notice.includes('confirm: appConfirm'), 'app notice should expose Promise-based confirm');
assert.ok(notice.includes('alert: appAlert'), 'app notice should expose alert replacement');
assert.ok(notice.includes('toast: appToast'), 'app notice should expose toast notifications');
assert.ok(notice.includes('trapFocus'), 'app notice dialogs should keep focus inside the dialog');
assert.ok(notice.includes("e.key === 'Escape'") && notice.includes("e.key === 'Enter'"), 'app notice dialogs should support keyboard actions');

assert.strictEqual(/\bconfirm\s*\(/.test(settings), false, 'settings panel should not call native confirm');
assert.strictEqual(/\balert\s*\(/.test(settings), false, 'settings panel should not call native alert');
assert.strictEqual(/\bconfirm\s*\(/.test(wallpaper), false, 'wallpaper settings module should not call native confirm');
assert.ok(settings.includes('appConfirm('), 'settings panel should use appConfirm helper');
assert.ok(settings.includes('appAlert('), 'settings panel should use appAlert helper');
assert.ok(wallpaper.includes('context.confirmAction'), 'wallpaper settings module should receive confirmAction from context');

assert.ok(css.includes('.pt-notice-overlay') && css.includes('.pt-notice-toast-stack'), 'settings CSS should style dialogs and toast notifications');
assert.ok(css.includes('html[data-reduced-motion="true"] .pt-notice'), 'app notice should respect reduced motion');

['appNoticeTitle', 'appNoticeConfirm', 'appNoticeCancel', 'appNoticeClose'].forEach((key) => {
  assert.ok(en.includes('"' + key + '"'), 'en should include ' + key);
  assert.ok(zh.includes('"' + key + '"'), 'zh-CN should include ' + key);
});

console.log('app notice contract ok');
