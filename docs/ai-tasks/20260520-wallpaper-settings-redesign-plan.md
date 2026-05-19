# Wallpaper Settings Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the wallpaper settings tab around current-source work orders, health-gated Apply, and transactional source switching.

**Architecture:** Keep display settings immediate, but move source application into a small `WallpaperApply` controller. `settings-panel.js` owns UI and current-source work order state; `js/wallpaper/data.js` remains the only storage owner.

**Tech Stack:** Vanilla JavaScript, static Manifest V3 assets, localStorage and IndexedDB through `window.WallpaperData`, Node syntax checks and task-local Node tests.

---

## File Structure

- Create `js/wallpaper/apply.js`: source work-order validation and transactional application.
- Modify `index.html`: load `js/wallpaper/apply.js` after wallpaper storage/fetch helpers and before settings/newtab runtime use it.
- Modify `js/settings-panel.js`: replace broad wallpaper draft application with current-source work order UI, health status updates, and calls to `WallpaperApply`.
- Modify `js/wallpaper/data.js`: add small storage-owner helper APIs only if needed, especially cleanup without changing `activeSource`.
- Modify `js/i18n/*.js`: add status text keys used by the new source status bar.
- Modify `.claude/rules/60-settings.md` and `.claude/rules/20-wallpaper.md`: sync rules if source apply behavior changes.
- Create `docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js`: task-local Node test harness for `WallpaperApply`.

## Task 1: Add WallpaperApply Test Harness

**Files:**
- Create: `docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js`
- Read: `docs/ai-tasks/20260520-wallpaper-settings-redesign-design.md`

- [ ] **Step 1: Write the failing tests**

Create `docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js` with this complete content:

```javascript
const assert = require('assert');
const path = require('path');

function createStorage(initialWallpaper, options = {}) {
  const calls = [];
  let wallpaper = JSON.parse(JSON.stringify(initialWallpaper));
  return {
    calls,
    api: {
      loadWallpaper() {
        return JSON.parse(JSON.stringify(wallpaper));
      },
      saveWallpaper(next) {
        calls.push(['saveWallpaper', next.activeSource]);
        wallpaper = JSON.parse(JSON.stringify(next));
        return true;
      },
      compatMode(source) {
        return source === 'local' ? 'upload' : (source || 'bing');
      },
      normalizeSource(source) {
        return source === 'local' ? 'upload' : (source || 'bing');
      },
      hasUploadAssets() {
        return options.hasUploadAssets === true;
      },
      cleanupSourceCache(source) {
        calls.push(['cleanupSourceCache', source]);
        if (options.cleanupFails) return Promise.reject(new Error('cleanup failed'));
        return Promise.resolve(true);
      },
      isTestPassed(target, hash) {
        return !!target && target.test && target.test.status === 'passed' && target.test.fieldHash === hash;
      },
      rssFieldHash(source) {
        return 'rss:' + [source.url || '', source.name || ''].join('|');
      },
      apiFieldHash(source, apiType) {
        return 'api:' + apiType + ':' + [source.url || '', source.jsonPath || ''].join('|');
      },
      wallhavenFieldHash(config) {
        return 'wallhaven:' + [config.queryPreset || '', config.customQuery || '', config.categories || '', config.sorting || ''].join('|');
      }
    }
  };
}

function baseWallpaper(source = 'bing') {
  return {
    activeSource: source,
    providers: {
      bing: { config: {}, state: {} },
      upload: { config: { activeMedia: 'image' }, state: { videoId: '' } },
      folder: { config: { pathLabel: '' }, state: { status: 'idle' } },
      rss: { config: { activeSourceId: 'rss-1', sources: [] }, state: {} },
      api: { config: { apiType: 'image', activeImageSourceId: 'api-1', activeJsonSourceId: '', imageSources: [], jsonSources: [] }, state: {} },
      wallhaven: { config: {}, state: {} }
    },
    cache: { order: ['bing'], index: 0, meta: {} }
  };
}

function loadApplyModule(storage, prepare = {}) {
  global.window = {
    WallpaperData: storage.api,
    reloadWallpaper: prepare.reloadWallpaper || (() => Promise.resolve(true))
  };
  delete require.cache[require.resolve(path.join('..', '..', 'js', 'wallpaper', 'apply.js'))];
  require(path.join('..', '..', 'js', 'wallpaper', 'apply.js'));
  return global.window.WallpaperApply;
}

async function testRssRequiresMatchingPassedTest() {
  const storage = createStorage(baseWallpaper('bing'));
  const Apply = loadApplyModule(storage);
  const source = { id: 'rss-1', name: 'Feed', url: 'https://example.com/feed.xml', test: { status: 'untested', fieldHash: '' } };
  const workOrder = {
    pendingSource: 'rss',
    pendingConfig: { activeSourceId: 'rss-1', sources: [source] },
    baseline: {}
  };
  let result = Apply.validateWorkOrder(workOrder);
  assert.strictEqual(result.state, 'Blocked');
  assert.strictEqual(result.reasonKey, 'wallpaperStatusTestRss');

  source.test = { status: 'passed', fieldHash: storage.api.rssFieldHash(source), testedAt: 1 };
  result = Apply.validateWorkOrder(workOrder);
  assert.strictEqual(result.state, 'Ready');
}

async function testApplyPreparesBeforeCleanup() {
  const storage = createStorage(baseWallpaper('bing'));
  const Apply = loadApplyModule(storage, {
    reloadWallpaper: () => {
      storage.calls.push(['reloadWallpaper']);
      return Promise.resolve(true);
    }
  });
  const source = { id: 'rss-1', name: 'Feed', url: 'https://example.com/feed.xml' };
  source.test = { status: 'passed', fieldHash: storage.api.rssFieldHash(source), testedAt: 1 };
  const result = await Apply.apply({
    pendingSource: 'rss',
    pendingConfig: { activeSourceId: 'rss-1', sources: [source] },
    baseline: {}
  }, {
    prepare() {
      storage.calls.push(['prepare', 'rss']);
      return Promise.resolve({ prepared: true });
    }
  });
  assert.strictEqual(result.state, 'Applied');
  assert.deepStrictEqual(storage.calls.map((call) => call[0]), ['prepare', 'saveWallpaper', 'reloadWallpaper', 'cleanupSourceCache']);
  assert.strictEqual(storage.api.loadWallpaper().activeSource, 'rss');
}

async function testPrepareFailureKeepsOldSourceAndCache() {
  const storage = createStorage(baseWallpaper('bing'));
  const Apply = loadApplyModule(storage);
  const result = await Apply.apply({
    pendingSource: 'folder',
    pendingConfig: { pathLabel: 'Pictures' },
    health: { state: 'Ready' },
    baseline: {}
  }, {
    prepare() {
      storage.calls.push(['prepare', 'folder']);
      return Promise.reject(new Error('folder failed'));
    }
  });
  assert.strictEqual(result.state, 'Error');
  assert.strictEqual(storage.api.loadWallpaper().activeSource, 'bing');
  assert.deepStrictEqual(storage.calls, [['prepare', 'folder']]);
}

(async function run() {
  await testRssRequiresMatchingPassedTest();
  await testApplyPreparesBeforeCleanup();
  await testPrepareFailureKeepsOldSourceAndCache();
  console.log('wallpaper settings redesign tests passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Run tests and verify they fail before implementation**

Run:

```powershell
node docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js
```

Expected: fails because `js/wallpaper/apply.js` does not exist or `window.WallpaperApply` is not defined.

- [ ] **Step 3: Commit the failing tests**

```powershell
git add docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js
git commit -m "test: cover wallpaper source apply transaction"
```

## Task 2: Implement WallpaperApply Controller

**Files:**
- Create: `js/wallpaper/apply.js`
- Test: `docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js`

- [ ] **Step 1: Add the module**

Create `js/wallpaper/apply.js` with this complete content:

```javascript
(function () {
    'use strict';

    var D = window.WallpaperData;

    function clonePlain(value) {
        return JSON.parse(JSON.stringify(value || {}));
    }

    function normalizeSource(source) {
        if (D && D.normalizeSource) return D.normalizeSource(source);
        if (source === 'local') return 'upload';
        return source || 'bing';
    }

    function currentWallpaper() {
        return D && D.loadWallpaper ? D.loadWallpaper() : { activeSource: 'bing', providers: {}, cache: {} };
    }

    function providerConfig(model, source) {
        model = model || currentWallpaper();
        source = normalizeSource(source);
        return model.providers && model.providers[source] ? clonePlain(model.providers[source].config || {}) : {};
    }

    function selectedRssSource(config) {
        config = config || {};
        var sources = config.sources || [];
        return sources.filter(function (source) { return source && source.id === config.activeSourceId; })[0] || sources[0] || null;
    }

    function selectedApiSource(config) {
        config = config || {};
        var apiType = config.apiType === 'json' ? 'json' : 'image';
        var list = apiType === 'json' ? (config.jsonSources || []) : (config.imageSources || []);
        var id = apiType === 'json' ? config.activeJsonSourceId : config.activeImageSourceId;
        return list.filter(function (source) { return source && source.id === id; })[0] || list[0] || null;
    }

    function isDirty(workOrder) {
        if (!workOrder) return false;
        var baseline = workOrder.baseline || {};
        var pending = {
            pendingSource: normalizeSource(workOrder.pendingSource),
            pendingConfig: workOrder.pendingConfig || {}
        };
        var saved = {
            pendingSource: normalizeSource(baseline.pendingSource || currentWallpaper().activeSource),
            pendingConfig: baseline.pendingConfig || providerConfig(null, pending.pendingSource)
        };
        return JSON.stringify(pending) !== JSON.stringify(saved);
    }

    function blocked(reasonKey, message) {
        return { state: 'Blocked', valid: false, reasonKey: reasonKey, message: message || '' };
    }

    function validateWorkOrder(workOrder) {
        if (!workOrder) return blocked('wallpaperStatusNoPendingSource');
        var source = normalizeSource(workOrder.pendingSource);
        var config = clonePlain(workOrder.pendingConfig || providerConfig(null, source));

        if (workOrder.health && workOrder.health.state === 'Testing') {
            return { state: 'Testing', valid: false, reasonKey: 'wallpaperStatusTesting', message: '' };
        }
        if (!isDirty(workOrder)) {
            return { state: 'Clean', valid: false, reasonKey: 'wallpaperApplyNoChanges', message: '' };
        }
        if (source === 'bing') return { state: 'Ready', valid: true, reasonKey: 'wallpaperApplyReady', message: '' };
        if (source === 'upload') {
            if (D && D.hasUploadAssets && D.hasUploadAssets()) return { state: 'Ready', valid: true, reasonKey: 'wallpaperApplyReady', message: '' };
            return blocked('wallpaperStatusUploadMissing');
        }
        if (source === 'folder') {
            if (workOrder.health && workOrder.health.state === 'Ready') return { state: 'Ready', valid: true, reasonKey: 'wallpaperApplyReady', message: '' };
            return blocked('wallpaperStatusFolderMissing');
        }
        if (source === 'rss') {
            var rss = selectedRssSource(config);
            if (!rss) return blocked('rssNeedsSource');
            if (!/^https:\/\//i.test(String(rss.url || ''))) return blocked('rssInvalidUrl');
            if (D && D.isTestPassed && D.rssFieldHash && D.isTestPassed(rss, D.rssFieldHash(rss))) {
                return { state: 'Ready', valid: true, reasonKey: 'wallpaperApplyReady', message: '' };
            }
            if (rss.test && rss.test.status === 'failed' && rss.test.error) return blocked('wallpaperStatusTestFailed', rss.test.error);
            return blocked('wallpaperStatusTestRss');
        }
        if (source === 'api') {
            var api = selectedApiSource(config);
            var apiType = config.apiType === 'json' ? 'json' : 'image';
            if (!api) return blocked('apiNeedsSource');
            if (!/^https:\/\//i.test(String(api.url || ''))) return blocked('apiInvalidUrl');
            if (D && D.isTestPassed && D.apiFieldHash && D.isTestPassed(api, D.apiFieldHash(api, apiType))) {
                return { state: 'Ready', valid: true, reasonKey: 'wallpaperApplyReady', message: '' };
            }
            if (api.test && api.test.status === 'failed' && api.test.error) return blocked('wallpaperStatusTestFailed', api.test.error);
            return blocked('wallpaperStatusTestApi');
        }
        if (source === 'wallhaven') {
            if (D && D.isTestPassed && D.wallhavenFieldHash && D.isTestPassed(config, D.wallhavenFieldHash(config))) {
                return { state: 'Ready', valid: true, reasonKey: 'wallpaperApplyReady', message: '' };
            }
            if (config.test && config.test.status === 'failed' && config.test.error) return blocked('wallpaperStatusTestFailed', config.test.error);
            return blocked('wallpaperStatusTestWallhaven');
        }
        return blocked('sourcePendingHint');
    }

    function defaultPrepare() {
        return Promise.resolve({ prepared: true });
    }

    function prepareWorkOrder(workOrder, hooks) {
        hooks = hooks || {};
        return (hooks.prepare || defaultPrepare)(workOrder);
    }

    function commitWorkOrder(workOrder) {
        var source = normalizeSource(workOrder.pendingSource);
        var model = currentWallpaper();
        if (!model.providers) model.providers = {};
        if (!model.providers[source]) model.providers[source] = { config: {}, state: {} };
        model.providers[source].config = clonePlain(workOrder.pendingConfig || {});
        model.activeSource = source;
        D.saveWallpaper(model);
        return Promise.resolve(model);
    }

    function cleanupPreviousSource(previousSource, nextSource) {
        previousSource = normalizeSource(previousSource);
        nextSource = normalizeSource(nextSource);
        if (!previousSource || previousSource === nextSource || previousSource === 'bing') return Promise.resolve(false);
        if (D.cleanupSourceCache) return D.cleanupSourceCache(previousSource);
        if (D.clearWallpaperSourceCache) return D.clearWallpaperSourceCache(previousSource);
        return Promise.resolve(false);
    }

    function reloadWallpaper() {
        if (window.reloadWallpaper) return Promise.resolve(window.reloadWallpaper());
        return Promise.resolve(false);
    }

    function apply(workOrder, hooks) {
        hooks = hooks || {};
        var validation = validateWorkOrder(workOrder);
        if (!validation.valid) return Promise.resolve(validation);
        var previousSource = normalizeSource(currentWallpaper().activeSource);
        var nextSource = normalizeSource(workOrder.pendingSource);
        return prepareWorkOrder(workOrder, hooks).then(function () {
            return commitWorkOrder(workOrder);
        }).then(function () {
            return reloadWallpaper();
        }).then(function () {
            return cleanupPreviousSource(previousSource, nextSource).catch(function (err) {
                return { cleanupError: err && err.message ? err.message : String(err || '') };
            });
        }).then(function () {
            return { state: 'Applied', valid: true, reasonKey: 'wallpaperApplyNoChanges', message: '' };
        }).catch(function (err) {
            return { state: 'Error', valid: false, reasonKey: 'wallpaperApplyFailed', message: err && err.message ? err.message : String(err || '') };
        });
    }

    window.WallpaperApply = {
        validateWorkOrder: validateWorkOrder,
        prepareWorkOrder: prepareWorkOrder,
        commitWorkOrder: commitWorkOrder,
        cleanupPreviousSource: cleanupPreviousSource,
        apply: apply
    };
})();
```

- [ ] **Step 2: Run the task test**

Run:

```powershell
node docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js
```

Expected: `wallpaper settings redesign tests passed`.

- [ ] **Step 3: Run syntax check for the new module**

Run:

```powershell
node --check js/wallpaper/apply.js
```

Expected: no output and exit code 0.

- [ ] **Step 4: Commit**

```powershell
git add js/wallpaper/apply.js docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js
git commit -m "feat: add wallpaper source apply controller"
```

## Task 3: Load WallpaperApply at Runtime

**Files:**
- Modify: `index.html`
- Test: `index.html`

- [ ] **Step 1: Insert the script**

In `index.html`, find the wallpaper runtime script block that loads `js/wallpaper/data.js`, `js/wallpaper/fetch.js`, `js/wallpaper/folder.js`, and `js/wallpaper/show.js`. Add:

```html
<script src="js/wallpaper/apply.js"></script>
```

Place it after `js/wallpaper/fetch.js` and `js/wallpaper/folder.js`, and before `js/settings-panel.js` or `js/newtab.js`.

- [ ] **Step 2: Verify script order**

Run:

```powershell
Select-String -Path index.html -Pattern 'js/wallpaper/(data|fetch|folder|apply|show)\\.js|js/settings-panel\\.js|js/newtab\\.js'
```

Expected: `apply.js` appears after data/fetch/folder helpers and before settings/newtab runtime code. `js/preload.js` remains in its original synchronous first-paint position.

- [ ] **Step 3: Commit**

```powershell
git add index.html
git commit -m "chore: load wallpaper apply controller"
```

## Task 4: Add Current-Source Work Order in Settings Panel

**Files:**
- Modify: `js/settings-panel.js`
- Test: `docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js`

- [ ] **Step 1: Add state variables near existing wallpaper draft state**

In `js/settings-panel.js`, near the existing `wallpaperDraft` variables, add:

```javascript
    var wallpaperWorkOrder = null;
    var wallpaperWorkOrderStatus = { state: 'Clean', valid: false, reasonKey: 'wallpaperApplyNoChanges', message: '' };
```

- [ ] **Step 2: Add work order helpers near `openWallpaperDraft()`**

Add these helper functions near the current wallpaper draft helpers:

```javascript
    function providerConfigForSource(model, source) {
        source = normalizeDraftSource(source);
        if (!model || !model.providers || !model.providers[source]) return {};
        return clonePlain(model.providers[source].config || {});
    }

    function createWallpaperWorkOrder(source) {
        var saved = D.loadWallpaper();
        source = normalizeDraftSource(source || saved.activeSource);
        var config = providerConfigForSource(saved, source);
        wallpaperWorkOrder = {
            pendingSource: source,
            pendingConfig: clonePlain(config),
            baseline: {
                pendingSource: source,
                pendingConfig: clonePlain(config)
            },
            health: { state: 'Clean', reasonKey: 'wallpaperApplyNoChanges', message: '' }
        };
        return wallpaperWorkOrder;
    }

    function currentWallpaperWorkOrder() {
        if (!wallpaperWorkOrder) return createWallpaperWorkOrder(D.getActiveSource ? D.getActiveSource() : 'bing');
        return wallpaperWorkOrder;
    }

    function switchWallpaperWorkOrderSource(source) {
        return createWallpaperWorkOrder(normalizeDraftSource(source));
    }

    function validateWallpaperWorkOrder() {
        var Apply = window.WallpaperApply;
        wallpaperWorkOrderStatus = Apply && Apply.validateWorkOrder ?
            Apply.validateWorkOrder(currentWallpaperWorkOrder()) :
            { state: 'Blocked', valid: false, reasonKey: 'wallpaperApplyFailed', message: '' };
        return wallpaperWorkOrderStatus;
    }

    function refreshWallpaperWorkOrderBaseline() {
        if (!wallpaperWorkOrder) return;
        var saved = D.loadWallpaper();
        var source = normalizeDraftSource(wallpaperWorkOrder.pendingSource);
        var config = providerConfigForSource(saved, source);
        wallpaperWorkOrder.baseline = {
            pendingSource: source,
            pendingConfig: clonePlain(config)
        };
        wallpaperWorkOrder.pendingConfig = clonePlain(config);
        wallpaperWorkOrder.health = { state: 'Clean', reasonKey: 'wallpaperApplyNoChanges', message: '' };
        validateWallpaperWorkOrder();
    }
```

- [ ] **Step 3: Make `clearWallpaperDraft()` also clear the work order**

Update `clearWallpaperDraft()` to include:

```javascript
        wallpaperWorkOrder = null;
        wallpaperWorkOrderStatus = { state: 'Clean', valid: false, reasonKey: 'wallpaperApplyNoChanges', message: '' };
```

- [ ] **Step 4: Run syntax check**

Run:

```powershell
node --check js/settings-panel.js
```

Expected: no output and exit code 0.

- [ ] **Step 5: Commit**

```powershell
git add js/settings-panel.js
git commit -m "refactor: add wallpaper source work order state"
```

## Task 5: Rewire Source Selection and Status Bar

**Files:**
- Modify: `js/settings-panel.js`
- Modify: `js/i18n/en.js`
- Later mirror i18n keys to other `js/i18n/*.js`

- [ ] **Step 1: Update status rendering**

Replace `validateWallpaperDraft()` usage inside `wallpaperApplyFooterHTML()` and `refreshWallpaperApplyFooter()` with `validateWallpaperWorkOrder()`.

Use this helper near `wallpaperApplyFooterHTML()`:

```javascript
    function wallpaperStatusText(status) {
        status = status || validateWallpaperWorkOrder();
        if (status.message) return status.message;
        return tr(status.reasonKey || 'wallpaperApplyNoChanges');
    }
```

Update `wallpaperApplyFooterHTML()` to:

```javascript
    function wallpaperApplyFooterHTML() {
        var validation = validateWallpaperWorkOrder();
        return '<div class="wallpaper-apply-footer">' +
            '<div class="wallpaper-apply-status" id="wallpaperApplyStatus">' + escapeHtml(wallpaperStatusText(validation)) + '</div>' +
            '<button id="wallpaperApplyBtn" class="primary-action" type="button"' + (validation.valid ? '' : ' disabled') + '>' + tr('wallpaperApply') + '</button>' +
            '</div>';
    }
```

Update `refreshWallpaperApplyFooter()` to:

```javascript
    function refreshWallpaperApplyFooter() {
        var status = document.getElementById('wallpaperApplyStatus');
        var button = document.getElementById('wallpaperApplyBtn');
        if (!status || !button) return;
        var validation = validateWallpaperWorkOrder();
        status.textContent = wallpaperStatusText(validation);
        button.disabled = !validation.valid;
    }
```

- [ ] **Step 2: Update source selector behavior**

In `bindWallpaperEvents()`, change the source selector click handler to:

```javascript
            button.addEventListener('click', function (e) {
                e.stopPropagation();
                var source = normalizeDraftSource(button.dataset.sourceOption);
                var openDrawer = modalContent.querySelector('.source-drawer.active');
                switchWallpaperWorkOrderSource(source);
                wallpaperDraftOpenSource = openDrawer ? openDrawer.dataset.source : 'none';
                refreshWallpaperDraftTab();
            });
```

Keep the drawer header handler as header-only expand/collapse.

- [ ] **Step 3: Update `buildWallpaperHTML()` active source calculation**

At the start of `buildWallpaperHTML()`, ensure a work order exists:

```javascript
        var workOrder = currentWallpaperWorkOrder();
        var activeSource = normalizeDraftSource(workOrder.pendingSource);
```

Use `activeSource` for selected/pending source UI. Keep a separate `runningSource`:

```javascript
        var runningSource = normalizeDraftSource(D.getActiveSource ? D.getActiveSource() : D.loadWallpaper().activeSource);
```

For each drawer, keep `selectedClass` for pending source and add a running class when `s.id === runningSource`:

```javascript
            var runningClass = s.id === runningSource ? ' running' : '';
            return '<div class="source-drawer' + expandedClass + selectedClass + runningClass + '" data-source="' + s.id + '">' +
```

- [ ] **Step 4: Add English status keys**

In `js/i18n/en.js`, add these keys near existing wallpaper apply strings:

```javascript
        "wallpaperStatusNoPendingSource": "Choose a wallpaper source first",
        "wallpaperStatusTesting": "Testing current source...",
        "wallpaperStatusUploadMissing": "Add an image or video wallpaper first",
        "wallpaperStatusFolderMissing": "Choose a folder and grant permission first",
        "wallpaperStatusTestRss": "Test the current RSS source first",
        "wallpaperStatusTestApi": "Test the current API source first",
        "wallpaperStatusTestWallhaven": "Test the current Wallhaven settings first",
        "wallpaperStatusTestFailed": "The latest source test failed"
```

- [ ] **Step 5: Run syntax checks**

Run:

```powershell
node --check js/settings-panel.js
node --check js/i18n/en.js
```

Expected: both commands exit 0.

- [ ] **Step 6: Commit**

```powershell
git add js/settings-panel.js js/i18n/en.js
git commit -m "refactor: gate wallpaper apply by source health"
```

## Task 6: Connect Source Config Editors to Current Work Order

**Files:**
- Modify: `js/settings-panel.js`
- Test manually in settings modal

- [ ] **Step 1: Route pending source config reads**

Add helper:

```javascript
    function pendingConfigForSource(source) {
        var workOrder = currentWallpaperWorkOrder();
        source = normalizeDraftSource(source);
        if (normalizeDraftSource(workOrder.pendingSource) === source) return workOrder.pendingConfig;
        return providerConfigForSource(D.loadWallpaper(), source);
    }
```

Use `pendingConfigForSource('rss')`, `pendingConfigForSource('api')`, `pendingConfigForSource('wallhaven')`, and `pendingConfigForSource('folder')` in build functions that render source config controls.

- [ ] **Step 2: Route current pending config writes**

Add helper:

```javascript
    function updatePendingSourceConfig(source, mutator) {
        var workOrder = currentWallpaperWorkOrder();
        source = normalizeDraftSource(source);
        if (normalizeDraftSource(workOrder.pendingSource) !== source) return false;
        mutator(workOrder.pendingConfig);
        workOrder.health = { state: 'Dirty', reasonKey: 'wallpaperStatusTest' + source.charAt(0).toUpperCase() + source.slice(1), message: '' };
        refreshWallpaperApplyFooter();
        return true;
    }
```

For RSS/API/Wallhaven controls that edit the currently pending source, call `updatePendingSourceConfig(...)` instead of mutating the broad `wallpaperDraft`.

- [ ] **Step 3: Keep list CRUD immediate for non-pending RSS/API**

For RSS/API delete actions, use this pattern:

```javascript
            var pendingSource = normalizeDraftSource(currentWallpaperWorkOrder().pendingSource);
            var runningSource = normalizeDraftSource(D.getActiveSource ? D.getActiveSource() : D.loadWallpaper().activeSource);
            var deletingRunning = runningSource === 'rss' && source.id === D.loadRssConfig().activeSourceId;
            if (deletingRunning && !confirm(tr('wallpaperActiveSourceDeletedConfirm'))) return;
            config.sources = config.sources.filter(function (item) { return item.id !== source.id; });
            D.saveRssConfig(config);
            if (deletingRunning) {
                D.setActiveSource('bing');
                if (window.reloadWallpaper) window.reloadWallpaper();
            }
            if (pendingSource === 'rss') switchWallpaperWorkOrderSource('rss');
            refreshWallpaperDraftTab();
```

Apply the same structure for API image/json source deletion using `D.saveApiConfig(config)`.

- [ ] **Step 4: Run syntax check**

```powershell
node --check js/settings-panel.js
```

Expected: exit 0.

- [ ] **Step 5: Commit**

```powershell
git add js/settings-panel.js
git commit -m "refactor: scope wallpaper source edits to current work order"
```

## Task 7: Replace Apply Handler with Transaction Call

**Files:**
- Modify: `js/settings-panel.js`
- Modify: `js/wallpaper/apply.js` if source-specific prepare hooks need expansion
- Test: `docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js`

- [ ] **Step 1: Replace `applyWallpaperDraft()` body**

Replace the current body with:

```javascript
    function applyWallpaperDraft() {
        var Apply = window.WallpaperApply;
        var workOrder = currentWallpaperWorkOrder();
        var validation = validateWallpaperWorkOrder();
        var applyBtn = document.getElementById('wallpaperApplyBtn');
        var status = document.getElementById('wallpaperApplyStatus');
        if (!Apply || !validation.valid) {
            refreshWallpaperApplyFooter();
            return;
        }
        if (applyBtn) applyBtn.disabled = true;
        if (status) status.textContent = tr('wallpaperStatusApplying');
        workOrder.health = { state: 'Applying', reasonKey: 'wallpaperStatusApplying', message: '' };

        Apply.apply(workOrder, {
            prepare: function () {
                return prepareWallpaperWorkOrder(workOrder);
            }
        }).then(function (result) {
            if (result.state === 'Applied') {
                refreshWallpaperWorkOrderBaseline();
                invalidateWallpaperTab();
                refreshGallery();
                return;
            }
            workOrder.health = { state: 'Error', reasonKey: result.reasonKey || 'wallpaperApplyFailed', message: result.message || '' };
            refreshWallpaperApplyFooter();
        }).catch(function (err) {
            workOrder.health = { state: 'Error', reasonKey: 'wallpaperApplyFailed', message: err && err.message ? err.message : String(err || '') };
            refreshWallpaperApplyFooter();
        });
    }
```

- [ ] **Step 2: Add `prepareWallpaperWorkOrder()`**

Add near apply helpers:

```javascript
    function prepareWallpaperWorkOrder(workOrder) {
        var source = normalizeDraftSource(workOrder.pendingSource);
        if (source === 'bing' || source === 'upload') return Promise.resolve({ prepared: true });
        if (source === 'folder') {
            if (!wallpaperDraftFolderMount) return Promise.resolve({ prepared: true });
            return D.saveFolderHandle(wallpaperDraftFolderMount.handle).then(function () {
                return D.saveFolderFiles(wallpaperDraftFolderMount.files);
            });
        }
        if (source === 'api' && wallpaperDraftApiTestResult) {
            var apiConfig = workOrder.pendingConfig;
            var apiSource = D.activeApiSource ? D.activeApiSource(apiConfig) : selectedDraftApiSource();
            return F.cacheApiResult(apiSource, apiConfig.apiType, wallpaperDraftApiTestResult);
        }
        if (source === 'wallhaven' && wallpaperDraftWallhavenTestResult) {
            showRuntimeDownloadNotice('wallhaven', 'loading');
            return F.cacheWallhavenItems(workOrder.pendingConfig, wallpaperDraftWallhavenTestResult.items, {
                activate: true,
                queryUrl: wallpaperDraftWallhavenTestResult.queryUrl,
                onProgress: function (progress) {
                    showRuntimeDownloadNotice('wallhaven', 'loading', progress);
                }
            }).then(function (result) {
                showRuntimeDownloadNotice('wallhaven', 'done', { cached: result.cached || 0, total: result.total || 0 });
                return result;
            });
        }
        return Promise.resolve({ prepared: true });
    }
```

- [ ] **Step 3: Add applying i18n key in English**

In `js/i18n/en.js`:

```javascript
        "wallpaperStatusApplying": "Applying wallpaper source..."
```

- [ ] **Step 4: Run tests**

```powershell
node docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js
node --check js/settings-panel.js
node --check js/wallpaper/apply.js
```

Expected: task test prints pass; syntax checks exit 0.

- [ ] **Step 5: Commit**

```powershell
git add js/settings-panel.js js/wallpaper/apply.js js/i18n/en.js
git commit -m "refactor: apply wallpaper sources transactionally"
```

## Task 8: Complete i18n and Rule Documentation

**Files:**
- Modify: `js/i18n/ar.js`, `js/i18n/de.js`, `js/i18n/en.js`, `js/i18n/es.js`, `js/i18n/fr.js`, `js/i18n/hi.js`, `js/i18n/it.js`, `js/i18n/ja.js`, `js/i18n/ko.js`, `js/i18n/pl.js`, `js/i18n/pt.js`, `js/i18n/ru.js`, `js/i18n/tr.js`, `js/i18n/vi.js`, `js/i18n/zh-CN.js`, `js/i18n/zh-TW.js`
- Modify: `.claude/rules/60-settings.md`
- Modify: `.claude/rules/20-wallpaper.md`

- [ ] **Step 1: Mirror i18n keys**

Add the same new keys from English to every locale file. If high-quality translation is not available in the moment, use clear English fallback values to avoid missing-key UI:

```javascript
        "wallpaperStatusNoPendingSource": "Choose a wallpaper source first",
        "wallpaperStatusTesting": "Testing current source...",
        "wallpaperStatusUploadMissing": "Add an image or video wallpaper first",
        "wallpaperStatusFolderMissing": "Choose a folder and grant permission first",
        "wallpaperStatusTestRss": "Test the current RSS source first",
        "wallpaperStatusTestApi": "Test the current API source first",
        "wallpaperStatusTestWallhaven": "Test the current Wallhaven settings first",
        "wallpaperStatusTestFailed": "The latest source test failed",
        "wallpaperStatusApplying": "Applying wallpaper source..."
```

- [ ] **Step 2: Update settings rule**

In `.claude/rules/60-settings.md`, update the wallpaper draft/apply section to state:

```markdown
Wallpaper source settings use a current-source work order model:

- Opening the wallpaper tab does not expand any source drawer.
- Source selectors change only the pending source.
- Drawer headers expand/collapse only and do not change the pending source.
- Display settings save immediately.
- Source Apply is enabled only when the current work order passes its health gate.
- RSS/API list management saves immediately unless deleting the currently running source.
- Applying a source prepares the new source first, commits it, reloads, then cleans the old source cache.
```

- [ ] **Step 3: Update wallpaper rule**

In `.claude/rules/20-wallpaper.md`, add:

```markdown
Source switching must be transactional. Prepare the new source before changing `activeSource` or clearing old source cache. If preparation fails, keep the old visible wallpaper and old cache. Cleanup after a successful switch is allowed to fail without blanking wallpaper.
```

- [ ] **Step 4: Run checks**

```powershell
Get-ChildItem -Recurse js -Include *.js | ForEach-Object { node --check $_.FullName }
git diff --check -- .claude/rules js/i18n
```

Expected: all JS syntax checks pass; diff check exits 0.

- [ ] **Step 5: Commit**

```powershell
git add js/i18n .claude/rules/60-settings.md .claude/rules/20-wallpaper.md
git commit -m "docs: update wallpaper source apply rules"
```

## Task 9: Browser QA and Final Cleanup

**Files:**
- Modify only if QA finds defects.
- Read: `docs/ai-tasks/20260520-wallpaper-settings-redesign-design.md`

- [ ] **Step 1: Run full syntax verification**

```powershell
Get-ChildItem -Recurse js -Include *.js | ForEach-Object { node --check $_.FullName }
node docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js
```

Expected: all syntax checks pass and task test prints `wallpaper settings redesign tests passed`.

- [ ] **Step 2: Manual QA in browser**

Open `index.html` directly and verify:

- Wallpaper tab opens with all drawers collapsed.
- Clicking a selector changes pending source but does not expand a drawer.
- Clicking a drawer header expands/collapses without changing pending source.
- Current running source and pending source are visually distinguishable.
- Display fit/position/blur/overlay save immediately.
- RSS/API/Wallhaven Apply is disabled before matching test pass.
- A passed RSS/API/Wallhaven test enables Apply for that work order.
- Folder work order remains active after deleting an unrelated RSS/API source.
- Deleting the currently running RSS/API source asks for confirmation.
- Cross-source apply prepares the new source before old cache cleanup.
- Failed preparation leaves the old wallpaper visible.

- [ ] **Step 3: Inspect final diff**

```powershell
git diff --stat
git diff -- js/wallpaper/apply.js js/settings-panel.js js/wallpaper/data.js index.html
```

Expected: changes are scoped to the planned files and no unrelated rewrites are present.

- [ ] **Step 4: Final commit if QA fixes were made**

If Task 9 required fixes:

```powershell
git add js/wallpaper/apply.js js/settings-panel.js js/wallpaper/data.js index.html js/i18n .claude/rules docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js
git commit -m "fix: polish wallpaper settings source apply flow"
```

If no fixes were needed, do not create an empty commit.

## Self-Review

- Spec coverage: interaction model, thin work order, source list management, health gate, status state machine, transactional apply, code structure, and verification are covered by Tasks 1-9.
- Red-flag scan: this plan does not contain unresolved marker text. Each code-changing task includes concrete snippets or full file content.
- Type consistency: `pendingSource`, `pendingConfig`, `baseline`, and `health` are used consistently across the test harness, `WallpaperApply`, and settings-panel integration tasks.
