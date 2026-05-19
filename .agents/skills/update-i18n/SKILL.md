---
name: update-i18n
description: Maintain PlainTab runtime UI translations and i18n language packs. Use when adding, editing, formatting, validating, or reviewing UI text in js/i18n/*.js, js/languages.js, data-i18n markup, or t(key) calls; also use when onboarding/help copy or new settings need localized strings.
---

# Update PlainTab I18N

Use this skill for PlainTab runtime UI copy. Keep the runtime contract unchanged:

- `js/languages.js` is the synchronous language bootstrap and must stay early in `index.html`.
- `js/i18n/*.js` are language packs that assign flat objects to `window.I18N["locale"]`.
- Runtime code should call `t(key)` or use existing `data-i18n`; do not hard-code UI language branches.
- Keep all language packs key-complete. `zh-CN` and `en` need real maintained copy. Other languages may temporarily use English only when a real translation is not available.

## Workflow

1. Read `.claude/rules/30-language.md` and any touched runtime file.
2. Add or update flat keys in every `js/i18n/*.js` file.
3. Keep language packs multi-line, one key per line:

```js
window.I18N["en"] = {
    "someKey": "Some text",
    "anotherKey": "Another text"
};
```

4. In runtime code, reference keys through `t("someKey")`. Avoid detecting language manually for UI strings.
5. For generated or mechanical updates, preserve UTF-8 text. Be careful with PowerShell pipelines that can turn non-ASCII text into `?`.
6. If adding user-facing behavior, keep first-paint rules intact; do not move `js/languages.js` or `js/preload.js`.

## Validation

Run these checks before finishing:

```powershell
Get-ChildItem js\i18n\*.js | ForEach-Object { node --check $_.FullName }
node --check js\languages.js
node --check js\newtab.js
@'
const fs = require('fs');
global.window = {};
global.document = { write() {} };
global.navigator = { language: 'en' };
global.localStorage = { getItem() { return ''; } };
require('./js/languages.js');
for (const file of fs.readdirSync('js/i18n').filter(f => f.endsWith('.js'))) require('./js/i18n/' + file);
const report = window.validatePlainTabI18N({ silent: true });
if (!report.ok) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log('validatePlainTabI18N ok');
'@ | node -
```

If only specific runtime files changed, still run `git diff --check` on the touched files.
