# Wallpaper Settings Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the L2 wallpaper settings tab as a unified premium source configuration console with left source navigation, right source detail, a runtime status card, and a hardened apply state machine.

**Architecture:** Add a focused `js/settings-wallpaper.js` module loaded lazily with the full settings panel. Migrate the wallpaper tab in vertical slices: first layout and navigation, then source detail components, then source event/prepare logic, then CSS cleanup. Keep `settings-panel.js` responsible for the modal shell, L1 gallery, shared helpers, and bootstrap integration.

**Tech Stack:** Vanilla JavaScript, native CSS, static MV3 extension assets, localStorage/IndexedDB through `WallpaperData`, existing `WallpaperApply`, `WallpaperFetch`, `WallpaperFolder`, and `WallpaperShow` helpers.

---

## Design Inputs

- Spec: `docs/superpowers/specs/2026-05-20-wallpaper-settings-unification-design.md`
- Visual reference: `docs/ai-tasks/wallpaper-settings-future-mockup.html`
- Existing regression tests: `docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js`
- Required rules:
  - `.claude/rules/00-core.md`
  - `.claude/rules/20-wallpaper.md`
  - `.claude/rules/30-language.md`
  - `.claude/rules/60-settings.md`

## Product Rules To Preserve

- Clicking a left wallpaper source tab changes only the pending source and right-side detail view. It must not write `activeSource`.
- Source-library management saves immediately. RSS/API add, delete, rename, URL edit, and selected row changes update saved source config without requiring a global Save button.
- Runtime source changes require the bottom Apply action. The Apply button is the only control that commits `activeSource`.
- Do not add a global "Save" button beside Apply. Use helper copy to explain that source list edits auto-save and Apply changes the active wallpaper source.
- Invalid RSS/API source input, such as HTTP URLs, must be blocked before it becomes a saved source.
- Deleting non-running RSS/API sources saves config only and does not reload wallpaper. Deleting the running source requires confirmation and falls back to Bing.

## File Structure

### Create

- `js/settings-wallpaper.js`
  - Owns the L2 wallpaper tab UI builder and event binding.
  - Exposes `window.SettingsWallpaper.create(context)`.
  - Receives dependencies and shared helpers from `settings-panel.js`.
  - Does not run on first paint; it is loaded only when the full settings panel is loaded.

### Modify

- `js/settings-bootstrap.js`
  - Lazy-loads `js/settings-panel.js` and `js/settings-wallpaper.js` before resolving `SettingsPanelFull`.

- `js/settings-panel.js`
  - Creates the wallpaper module context.
  - Delegates wallpaper tab build/bind/refresh calls to `SettingsWallpaper`.
  - Keeps L1 gallery and general modal responsibilities.
  - Removes migrated wallpaper-specific builder/event functions after each slice.

- `css/settings.css`
  - Adds the new wallpaper settings layout and component grammar.
  - Removes stale accordion/source-drawer wallpaper styles once the new layout no longer uses them.

- `docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js`
  - Extends static and behavioral coverage for the unified layout and source-state semantics.

- `index.html`
  - No change expected. Do not add `settings-wallpaper.js` to first-paint script order.

### Preserve

- `js/wallpaper/data.js`
- `js/wallpaper/show.js`
- `js/wallpaper/folder.js`
- `js/wallpaper/fetch.js`
- `js/wallpaper/apply.js`

Only touch these if a regression test proves a source-state bug lives below the settings UI boundary.

---

## Task 1: Add Regression Tests For New Layout And Source Tab Semantics

**Files:**
- Modify: `docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js`

- [ ] **Step 1: Add static layout contract tests**

Add this function near `testUploadSettingsUiContract()`:

```js
function testUnifiedWallpaperLayoutContract() {
  const settingsPanel = fs.readFileSync(path.join(repoRoot, 'js', 'settings-panel.js'), 'utf8');
  const settingsWallpaperPath = path.join(repoRoot, 'js', 'settings-wallpaper.js');
  assert(fs.existsSync(settingsWallpaperPath), 'wallpaper settings should live in js/settings-wallpaper.js');
  const settingsWallpaper = fs.readFileSync(settingsWallpaperPath, 'utf8');
  assert(settingsWallpaper.includes('window.SettingsWallpaper'), 'settings-wallpaper module should expose window.SettingsWallpaper');
  assert(settingsWallpaper.includes('wallpaper-source-nav'), 'new wallpaper layout should render a source navigation rail');
  assert(settingsWallpaper.includes('wallpaper-source-detail'), 'new wallpaper layout should render a source detail panel');
  assert(settingsWallpaper.includes('wallpaper-runtime-card'), 'new wallpaper layout should render a current runtime card');
  assert(settingsWallpaper.includes('data-wallpaper-source-option'), 'source nav should expose source option buttons');
  ['bing', 'upload', 'folder', 'rss', 'wallhaven', 'api'].forEach((source) => {
    assert(settingsWallpaper.includes(`'${source}'`) || settingsWallpaper.includes(`"${source}"`), `source nav should include ${source}`);
  });
  assert(!settingsWallpaper.includes('source-drawer'), 'new wallpaper module should not render the old source drawer markup');
  assert(settingsPanel.includes('SettingsWallpaper'), 'settings-panel should delegate wallpaper tab rendering to SettingsWallpaper');
}
```

Call it in `run()` immediately after `testUploadSettingsUiContract()`:

```js
  testUnifiedWallpaperLayoutContract();
```

- [ ] **Step 2: Add a source tab semantic test**

Add this test near the other `WallpaperApply` behavioral tests:

```js
async function testSourceTabSelectionDoesNotCommitActiveSource() {
  const settingsWallpaperPath = path.join(repoRoot, 'js', 'settings-wallpaper.js');
  const source = fs.readFileSync(settingsWallpaperPath, 'utf8');
  assert(source.includes('function selectWallpaperSource'), 'wallpaper module should have a source selection handler');
  assert(source.includes('pendingSource'), 'source selection should update the pending work order');
  assert(!/selectWallpaperSource[\s\S]{0,900}setActiveSource/.test(source), 'clicking a source tab must not write activeSource');
  assert(!/data-wallpaper-source-option[\s\S]{0,1400}saveWallpaper/.test(source), 'source tab event binding must not commit wallpaper storage');
}
```

Call it in `run()` after `testUnifiedWallpaperLayoutContract()`:

```js
  await testSourceTabSelectionDoesNotCommitActiveSource();
```

- [ ] **Step 3: Run the tests and verify they fail**

Run:

```powershell
node docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js
```

Expected: fail because `js/settings-wallpaper.js` does not exist yet.

- [ ] **Step 4: Commit the failing tests only**

```powershell
git add docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js
git commit -m "test: 覆盖统一壁纸设置布局"
```

---

## Task 2: Add Lazy-Loaded Wallpaper Settings Module Shell

**Files:**
- Create: `js/settings-wallpaper.js`
- Modify: `js/settings-bootstrap.js`
- Modify: `js/settings-panel.js`

- [ ] **Step 1: Create the module shell**

Create `js/settings-wallpaper.js` with this minimal shell:

```js
/**
 * SettingsWallpaper - L2 wallpaper settings tab module.
 * Loaded lazily with the full settings panel; never part of first paint.
 */
(function () {
    'use strict';

    function clonePlain(value) {
        return JSON.parse(JSON.stringify(value || {}));
    }

    function create(context) {
        context = context || {};

        function tr(key) {
            return context.tr ? context.tr(key) : key;
        }

        function escapeHtml(value) {
            return context.escapeHtml ? context.escapeHtml(value) : String(value == null ? '' : value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function normalizeSource(source) {
            return context.normalizeDraftSource ? context.normalizeDraftSource(source) : (source === 'local' ? 'upload' : (source || 'bing'));
        }

        function sourceDefs() {
            return [
                { id: 'bing', glyph: 'B', nameKey: 'sourceBing', descKey: 'sourceBingDesc' },
                { id: 'upload', glyph: 'U', nameKey: 'sourceUpload', descKey: 'sourceUploadDesc' },
                { id: 'folder', glyph: 'F', nameKey: 'sourceFolder', descKey: 'sourceFolderDesc' },
                { id: 'rss', glyph: 'R', nameKey: 'sourceRss', descKey: 'sourceRssDesc' },
                { id: 'wallhaven', glyph: 'W', nameKey: 'sourceWallhaven', descKey: 'sourceWallhavenDesc' },
                { id: 'api', glyph: 'A', nameKey: 'sourceApi', descKey: 'sourceApiDesc' }
            ];
        }

        function currentWorkOrder() {
            return context.currentWallpaperWorkOrder ? context.currentWallpaperWorkOrder() : {
                pendingSource: 'bing',
                pendingConfig: {},
                baseline: { pendingSource: 'bing', pendingConfig: {} },
                health: { state: 'Clean', reasonKey: 'wallpaperApplyNoChanges', message: '' }
            };
        }

        function currentStatus() {
            return context.validateWallpaperWorkOrder ? context.validateWallpaperWorkOrder() : {
                state: 'Clean',
                valid: false,
                reasonKey: 'wallpaperApplyNoChanges',
                message: ''
            };
        }

        function statusText(status) {
            if (context.wallpaperStatusText) return context.wallpaperStatusText(status);
            status = status || currentStatus();
            return status.message || tr(status.reasonKey || 'wallpaperApplyNoChanges');
        }

        function statusState(status) {
            if (context.wallpaperStatusState) return context.wallpaperStatusState(status);
            status = status || currentStatus();
            return status.state || 'Clean';
        }

        function sourceLabel(source) {
            if (context.getSourceLabel) return context.getSourceLabel(source);
            var found = sourceDefs().filter(function (item) { return item.id === source; })[0];
            return found ? tr(found.nameKey) : source;
        }

        function runningSource() {
            var D = context.D;
            if (!D) return 'bing';
            return normalizeSource(D.getActiveSource ? D.getActiveSource() : (D.loadWallpaper ? D.loadWallpaper().activeSource : 'bing'));
        }

        function runtimeCardHTML() {
            var source = runningSource();
            return '<div class="wallpaper-runtime-card">' +
                '<span class="wallpaper-runtime-label">' + escapeHtml(tr('wallpaperRuntimeLabel')) + '</span>' +
                '<strong>' + escapeHtml(sourceLabel(source)) + '</strong>' +
                '<small>' + escapeHtml(tr('wallpaperRuntimeHint')) + '</small>' +
                '</div>';
        }

        function sourceBadgeHTML(source, activeSource, running) {
            var workOrder = currentWorkOrder();
            var status = currentStatus();
            if (source === activeSource) {
                return '<span class="wallpaper-source-badge" data-state="' + escapeHtml(statusState(status)) + '">' + escapeHtml(statusText(status)) + '</span>';
            }
            if (source === running) {
                return '<span class="wallpaper-source-badge" data-state="Running">' + escapeHtml(tr('wallpaperRuntimeRunning')) + '</span>';
            }
            if (workOrder.baseline && normalizeSource(workOrder.baseline.pendingSource) === source) {
                return '<span class="wallpaper-source-badge" data-state="Saved">' + escapeHtml(tr('wallpaperRuntimeSaved')) + '</span>';
            }
            return '<span class="wallpaper-source-badge" data-state="Idle">' + escapeHtml(tr('wallpaperRuntimeIdle')) + '</span>';
        }

        function sourceNavHTML() {
            var workOrder = currentWorkOrder();
            var activeSource = normalizeSource(workOrder.pendingSource);
            var running = runningSource();
            return '<nav class="wallpaper-source-nav" role="radiogroup" aria-label="' + escapeHtml(tr('settingsGroupWallpaperSource')) + '">' +
                sourceDefs().map(function (source) {
                    var active = source.id === activeSource;
                    var classes = 'wallpaper-source-item' + (active ? ' active' : '') + (source.id === running ? ' running' : '');
                    return '<button class="' + classes + '" type="button" role="radio" aria-checked="' + (active ? 'true' : 'false') + '" data-wallpaper-source-option="' + source.id + '">' +
                        '<span class="wallpaper-source-glyph">' + escapeHtml(source.glyph) + '</span>' +
                        '<span class="wallpaper-source-copy"><strong>' + escapeHtml(tr(source.nameKey)) + '</strong><small>' + escapeHtml(tr(source.descKey)) + '</small></span>' +
                        sourceBadgeHTML(source.id, activeSource, running) +
                        '</button>';
                }).join('') +
                '</nav>';
        }

        function detailHTML() {
            var source = normalizeSource(currentWorkOrder().pendingSource);
            var body = context.buildWallpaperSourceDetailHTML ?
                context.buildWallpaperSourceDetailHTML(source) :
                '<p>' + escapeHtml(tr('sourcePendingHint')) + '</p>';
            return '<section class="wallpaper-source-detail" data-wallpaper-source-detail="' + escapeHtml(source) + '">' + body + '</section>';
        }

        function applyFooterHTML() {
            if (context.wallpaperApplyFooterHTML) return context.wallpaperApplyFooterHTML();
            var status = currentStatus();
            return '<div class="wallpaper-apply-footer">' +
                '<div class="wallpaper-apply-status" id="wallpaperApplyStatus" data-state="' + escapeHtml(statusState(status)) + '">' + escapeHtml(statusText(status)) + '</div>' +
                '<button id="wallpaperApplyBtn" class="primary-action" type="button"' + (status.valid ? '' : ' disabled') + '>' + escapeHtml(tr('wallpaperApply')) + '</button>' +
                '</div>';
        }

        function buildHTML() {
            return '<div class="wallpaper-tab-shell wallpaper-tab-shell-v2">' +
                '<div class="wallpaper-tab-header wallpaper-tab-header-v2">' +
                    '<div><h2>' + escapeHtml(tr('tabWallpaper')) + '</h2><p>' + escapeHtml(context.modalCopy ? context.modalCopy('modalSubtitleWallpaper') : '') + '</p></div>' +
                    runtimeCardHTML() +
                '</div>' +
                '<div class="wallpaper-tab-body wallpaper-tab-body-v2">' +
                    '<div class="wallpaper-workspace">' +
                        sourceNavHTML() +
                        detailHTML() +
                    '</div>' +
                    '<div class="wallpaper-section-divider" aria-hidden="true"></div>' +
                    (context.buildWallpaperDisplayHTML ? context.buildWallpaperDisplayHTML() : '') +
                    '<div class="wallpaper-reset-row"><button class="danger-action" id="wallpaperResetBtn" type="button">' + escapeHtml(tr('wallpaperResetDefaults')) + '</button></div>' +
                '</div>' +
                applyFooterHTML() +
                '</div>';
        }

        function selectWallpaperSource(source) {
            source = normalizeSource(source);
            if (context.switchWallpaperWorkOrderSource) context.switchWallpaperWorkOrderSource(source);
            if (context.setWallpaperDraftOpenSource) context.setWallpaperDraftOpenSource(source);
            if (context.refreshWallpaperDraftTab) context.refreshWallpaperDraftTab();
        }

        function bindEvents(root) {
            root = root || (context.modalContent ? context.modalContent : document);
            root.querySelectorAll('[data-wallpaper-source-option]').forEach(function (button) {
                button.addEventListener('click', function () {
                    selectWallpaperSource(button.dataset.wallpaperSourceOption);
                });
            });
            if (context.bindWallpaperSourceDetailEvents) context.bindWallpaperSourceDetailEvents(root);
            var applyBtn = root.querySelector('#wallpaperApplyBtn');
            if (applyBtn && context.applyWallpaperDraft) applyBtn.addEventListener('click', context.applyWallpaperDraft);
            var reset = root.querySelector('#wallpaperResetBtn');
            if (reset && context.resetWallpaperDefaults) {
                reset.addEventListener('click', function () {
                    if (!confirm(tr('wallpaperResetConfirm'))) return;
                    context.resetWallpaperDefaults();
                });
            }
        }

        return {
            buildHTML: buildHTML,
            bindEvents: bindEvents,
            selectWallpaperSource: selectWallpaperSource,
            clonePlain: clonePlain
        };
    }

    window.SettingsWallpaper = {
        create: create
    };
})();
```

- [ ] **Step 2: Update lazy loading in `settings-bootstrap.js`**

Replace the body of `loadFullPanel()` with sequential script loading:

```js
    function loadScript(src) {
        return new Promise(function (resolve, reject) {
            var existing = document.querySelector('script[src="' + src + '"]');
            if (existing) {
                if (existing.dataset.loaded === 'true') resolve();
                else existing.addEventListener('load', function () { resolve(); }, { once: true });
                return;
            }
            var script = document.createElement('script');
            script.src = src;
            script.onload = function () {
                script.dataset.loaded = 'true';
                resolve();
            };
            script.onerror = function () { reject(new Error('failed to load ' + src)); };
            document.body.appendChild(script);
        });
    }

    function loadFullPanel() {
        if (window.SettingsPanelFull && window.SettingsWallpaper) return Promise.resolve(window.SettingsPanelFull);
        if (!fullLoadPromise) {
            fullLoadPromise = loadScript('js/settings-panel.js').then(function () {
                return loadScript('js/settings-wallpaper.js');
            }).then(function () {
                return window.SettingsPanelFull;
            });
        }
        return fullLoadPromise;
    }
```

Preserve the existing `loadFullPanel().then(function (full) { full.init(...) })` call sites.

- [ ] **Step 3: Add `settings-panel.js` context glue**

Add these variables near the wallpaper work-order state variables:

```js
    var wallpaperSettingsModule = null;
```

Add this function near `buildWallpaperHTML()`:

```js
    function setWallpaperDraftOpenSource(source) {
        wallpaperDraftOpenSource = normalizeDraftSource(source || 'none');
    }

    function buildWallpaperSourceDetailHTML(source) {
        source = normalizeDraftSource(source);
        var configs = {
            bing: '<p>' + tr('bingConfigHint') + '</p>',
            upload: buildUploadConfigHTML(),
            folder: buildFolderConfigHTML(),
            rss: buildRssConfigHTML(),
            wallhaven: buildWallhavenConfigHTML(),
            api: buildApiConfigHTML()
        };
        return configs[source] || '<p>' + tr('sourcePendingHint') + '</p>';
    }

    function bindWallpaperSourceDetailEvents(root) {
        bindUploadConfigEvents();
        bindFolderConfigEvents();
        bindRssConfigEvents();
        bindWallhavenConfigEvents();
        bindApiConfigEvents();
        var wallpaperFitSel = root.querySelector('#modalWallpaperFit');
        var wallpaperPositionSel = root.querySelector('#modalWallpaperPosition');
        var wallpaperBlurRange = root.querySelector('#modalWallpaperBlurRange');
        var wallpaperBlurNum = root.querySelector('#modalWallpaperBlurNum');
        var wallpaperVignetteSel = root.querySelector('#modalWallpaperVignette');
        var overlayRange = root.querySelector('#modalOverlayRange');
        var overlayNum = root.querySelector('#modalOverlayNum');
        if (wallpaperFitSel) wallpaperFitSel.addEventListener('change', function () { applyWallpaperFit(this.value); });
        if (wallpaperPositionSel) wallpaperPositionSel.addEventListener('change', function () { applyWallpaperPosition(this.value); });
        if (wallpaperBlurRange) wallpaperBlurRange.addEventListener('input', function () { applyWallpaperBlur(this.value, { preview: true }); this.value = wallpaperBlur; if (wallpaperBlurNum) wallpaperBlurNum.value = wallpaperBlur; });
        if (wallpaperBlurRange) wallpaperBlurRange.addEventListener('change', function () { applyWallpaperBlur(this.value); if (wallpaperBlurNum) wallpaperBlurNum.value = wallpaperBlur; this.value = wallpaperBlur; });
        if (wallpaperBlurNum) wallpaperBlurNum.addEventListener('change', function () { applyWallpaperBlur(this.value); if (wallpaperBlurRange) wallpaperBlurRange.value = wallpaperBlur; this.value = wallpaperBlur; });
        if (wallpaperVignetteSel) wallpaperVignetteSel.addEventListener('change', function () { applyWallpaperVignette(this.value); });
        if (overlayRange) overlayRange.addEventListener('input', function () { applyOverlayOpacity(this.value); if (overlayNum) overlayNum.value = this.value; });
        if (overlayNum) overlayNum.addEventListener('change', function () { applyOverlayOpacity(this.value); if (overlayRange) overlayRange.value = this.value; });
    }

    function wallpaperSettingsContext() {
        return {
            D: D,
            tr: tr,
            escapeHtml: escapeHtml,
            modalCopy: modalCopy,
            modalContent: modalContent,
            getSourceLabel: getSourceLabel,
            normalizeDraftSource: normalizeDraftSource,
            currentWallpaperWorkOrder: currentWallpaperWorkOrder,
            validateWallpaperWorkOrder: validateWallpaperWorkOrder,
            wallpaperStatusText: wallpaperStatusText,
            wallpaperStatusState: wallpaperStatusState,
            wallpaperApplyFooterHTML: wallpaperApplyFooterHTML,
            buildWallpaperDisplayHTML: buildWallpaperDisplayHTML,
            buildWallpaperSourceDetailHTML: buildWallpaperSourceDetailHTML,
            bindWallpaperSourceDetailEvents: bindWallpaperSourceDetailEvents,
            switchWallpaperWorkOrderSource: switchWallpaperWorkOrderSource,
            setWallpaperDraftOpenSource: setWallpaperDraftOpenSource,
            refreshWallpaperDraftTab: refreshWallpaperDraftTab,
            applyWallpaperDraft: applyWallpaperDraft,
            resetWallpaperDefaults: resetWallpaperDefaults
        };
    }

    function wallpaperSettings() {
        if (!wallpaperSettingsModule && window.SettingsWallpaper && window.SettingsWallpaper.create) {
            wallpaperSettingsModule = window.SettingsWallpaper.create(wallpaperSettingsContext());
        }
        return wallpaperSettingsModule;
    }
```

- [ ] **Step 4: Delegate build/bind to the module**

At the top of `buildWallpaperHTML()`, replace the old implementation with:

```js
    function buildWallpaperHTML() {
        if (!wallpaperDraft) openWallpaperDraft();
        var module = wallpaperSettings();
        if (module && module.buildHTML) return module.buildHTML();
        return '<div class="wallpaper-tab-shell"><p>' + tr('sourcePendingHint') + '</p></div>';
    }
```

Replace `bindWallpaperEvents()` with:

```js
    function bindWallpaperEvents() {
        var module = wallpaperSettings();
        if (module && module.bindEvents) module.bindEvents(modalContent);
    }
```

Do not delete the old source detail builder functions yet. They are still called through `buildWallpaperSourceDetailHTML()`.

- [ ] **Step 5: Run tests and checks**

Run:

```powershell
node docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js
node --check js/settings-bootstrap.js
node --check js/settings-panel.js
node --check js/settings-wallpaper.js
git diff --check -- js/settings-bootstrap.js js/settings-panel.js js/settings-wallpaper.js docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js
```

Expected: tests pass. If the static test fails because old `settings-panel.js` still contains `source-drawer`, adjust the test to check `settings-wallpaper.js` only; the migration removes old CSS/HTML later.

- [ ] **Step 6: Commit**

```powershell
git add js/settings-bootstrap.js js/settings-panel.js js/settings-wallpaper.js docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js
git commit -m "refactor: 拆出壁纸设置模块骨架"
```

---

## Task 3: Implement Unified Wallpaper Layout Styling

**Files:**
- Modify: `css/settings.css`
- Modify: `docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js`

- [ ] **Step 1: Add CSS contract checks**

Add this function to the test file:

```js
function testUnifiedWallpaperCssContract() {
  const css = fs.readFileSync(path.join(repoRoot, 'css', 'settings.css'), 'utf8');
  [
    '.wallpaper-tab-shell-v2',
    '.wallpaper-runtime-card',
    '.wallpaper-workspace',
    '.wallpaper-source-nav',
    '.wallpaper-source-item',
    '.wallpaper-source-detail',
    '.wallpaper-source-badge',
    '.wallpaper-control-grid',
    '.wallpaper-notice'
  ].forEach((selector) => {
    assert(css.includes(selector), `settings CSS should include ${selector}`);
  });
}
```

Call it after `testUnifiedWallpaperLayoutContract()`:

```js
  testUnifiedWallpaperCssContract();
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```powershell
node docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js
```

Expected: fail because the new CSS classes do not exist.

- [ ] **Step 3: Add the unified layout CSS**

Add a new section in `css/settings.css` near the existing wallpaper tab styles:

```css
/* ========== Wallpaper settings v2 ========== */
.wallpaper-tab-shell-v2 {
    display: grid;
    grid-template-rows: auto 1fr auto;
    min-height: 0;
}

.wallpaper-tab-header-v2 {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(220px, 280px);
    gap: 18px;
    align-items: end;
}

.wallpaper-runtime-card {
    padding: 12px;
    border: 1px solid rgba(103, 211, 232, 0.22);
    border-radius: 10px;
    background: rgba(103, 211, 232, 0.07);
    color: var(--text-secondary);
}

.wallpaper-runtime-label {
    display: block;
    margin-bottom: 5px;
    color: var(--text-muted);
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0;
    text-transform: uppercase;
}

.wallpaper-runtime-card strong {
    display: block;
    color: var(--text-primary);
    font-size: 13px;
    line-height: 1.35;
}

.wallpaper-runtime-card small {
    display: block;
    margin-top: 6px;
    color: var(--text-muted);
    font-size: 11.5px;
    line-height: 1.45;
}

.wallpaper-tab-body-v2 {
    padding-top: 0;
}

.wallpaper-workspace {
    display: grid;
    grid-template-columns: 244px minmax(0, 1fr);
    min-height: 420px;
    border: 1px solid rgba(var(--stroke-rgb), 0.62);
    border-radius: 12px;
    overflow: hidden;
    background: rgba(var(--surface-base-rgb), 0.20);
}

.wallpaper-source-nav {
    display: flex;
    flex-direction: column;
    gap: 7px;
    min-width: 0;
    padding: 12px;
    border-right: 1px solid rgba(var(--stroke-rgb), 0.58);
    background: rgba(var(--surface-base-rgb), 0.18);
}

.wallpaper-source-item {
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr) auto;
    gap: 10px;
    align-items: center;
    width: 100%;
    min-height: 54px;
    padding: 9px 10px;
    border: 1px solid transparent;
    border-radius: 10px;
    background: transparent;
    color: var(--text-secondary);
    text-align: left;
    font-family: inherit;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.wallpaper-source-item:hover {
    border-color: rgba(var(--stroke-rgb), 0.80);
    background: rgba(var(--surface-elevated-rgb), 0.24);
}

.wallpaper-source-item.active {
    color: var(--text-primary);
    border-color: rgba(103, 211, 232, 0.34);
    background: rgba(103, 211, 232, 0.08);
}

.wallpaper-source-item.running:not(.active) {
    border-color: rgba(var(--accent-rgb), 0.20);
}

.wallpaper-source-glyph {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: rgba(var(--surface-elevated-rgb), 0.56);
    color: var(--text-primary);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0;
}

.wallpaper-source-copy {
    min-width: 0;
}

.wallpaper-source-copy strong,
.wallpaper-source-copy small {
    display: block;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.wallpaper-source-copy strong {
    margin-bottom: 3px;
    font-size: 12.5px;
    line-height: 1.25;
}

.wallpaper-source-copy small {
    color: var(--text-muted);
    font-size: 11px;
    line-height: 1.25;
}

.wallpaper-source-badge {
    max-width: 82px;
    padding: 3px 6px;
    border-radius: 999px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-muted);
    background: rgba(var(--surface-elevated-rgb), 0.42);
    font-size: 10.5px;
    font-weight: 720;
    line-height: 1.2;
}

.wallpaper-source-badge[data-state="Ready"],
.wallpaper-source-badge[data-state="Applied"] {
    color: #86efac;
    background: rgba(34, 197, 94, 0.12);
}

.wallpaper-source-badge[data-state="Blocked"] {
    color: #facc15;
    background: rgba(245, 158, 11, 0.13);
}

.wallpaper-source-badge[data-state="Testing"],
.wallpaper-source-badge[data-state="Applying"] {
    color: #93c5fd;
    background: rgba(59, 130, 246, 0.13);
}

.wallpaper-source-badge[data-state="Error"] {
    color: #fca5a5;
    background: rgba(239, 68, 68, 0.13);
}

.wallpaper-source-detail {
    min-width: 0;
    padding: 18px;
}

.wallpaper-source-detail > p:first-child {
    margin-top: 0;
}

.wallpaper-control-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
}

.wallpaper-notice {
    padding: 12px;
    border: 1px solid rgba(var(--stroke-rgb), 0.62);
    border-radius: 10px;
    background: rgba(var(--surface-base-rgb), 0.24);
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.45;
}

@media (max-width: 760px) {
    .wallpaper-tab-header-v2,
    .wallpaper-workspace {
        grid-template-columns: 1fr;
    }

    .wallpaper-source-nav {
        flex-direction: row;
        overflow-x: auto;
        border-right: 0;
        border-bottom: 1px solid rgba(var(--stroke-rgb), 0.58);
    }

    .wallpaper-source-item {
        min-width: 174px;
    }

    .wallpaper-control-grid {
        grid-template-columns: 1fr;
    }
}
```

- [ ] **Step 4: Add i18n keys for runtime badges**

Add these keys to every `js/i18n/*.js` file using the `update-i18n` skill:

```js
"wallpaperRuntimeLabel": "Current runtime",
"wallpaperRuntimeHint": "Saved source currently driving the visible wallpaper.",
"wallpaperRuntimeRunning": "Running",
"wallpaperRuntimeSaved": "Saved",
"wallpaperRuntimeIdle": "Idle"
```

Localize the values for each language. Keep product/source tokens like Wallhaven unchanged.

- [ ] **Step 5: Run checks**

Run:

```powershell
node docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js
Get-ChildItem js\i18n\*.js | ForEach-Object { node --check $_.FullName }
node --check js\languages.js
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
git diff --check -- css/settings.css js/i18n docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js
```

- [ ] **Step 6: Commit**

```powershell
git add css/settings.css js/i18n docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js
git commit -m "feat: 统一壁纸设置页布局样式"
```

---

## Task 4: Migrate Source Detail Headers And Common Components

**Files:**
- Modify: `js/settings-wallpaper.js`
- Modify: `js/settings-panel.js`
- Modify: `css/settings.css`
- Modify: `docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js`

- [ ] **Step 1: Add tests for source detail header and common components**

Add:

```js
function testWallpaperSourceDetailComponentsContract() {
  const settingsWallpaper = fs.readFileSync(path.join(repoRoot, 'js', 'settings-wallpaper.js'), 'utf8');
  [
    'function sourceDetailFrameHTML',
    'function wallpaperNoticeHTML',
    'function wallpaperControlHTML',
    'wallpaper-source-head',
    'wallpaper-control-grid',
    'wallpaper-notice'
  ].forEach((needle) => {
    assert(settingsWallpaper.includes(needle), `wallpaper module should include ${needle}`);
  });
}
```

Call it after `testUnifiedWallpaperCssContract()`.

- [ ] **Step 2: Run tests and verify failure**

```powershell
node docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js
```

Expected: fail because component helpers do not exist.

- [ ] **Step 3: Add component helpers to `settings-wallpaper.js`**

Inside `create(context)`, before `detailHTML()`, add:

```js
        function wallpaperNoticeHTML(message, type) {
            return '<div class="wallpaper-notice" data-type="' + escapeHtml(type || 'info') + '">' + escapeHtml(message || '') + '</div>';
        }

        function wallpaperControlHTML(label, desc, control) {
            return '<div class="wallpaper-control">' +
                '<div class="wallpaper-control-copy"><strong>' + escapeHtml(label || '') + '</strong>' +
                (desc ? '<small>' + escapeHtml(desc) + '</small>' : '') +
                '</div>' +
                '<div class="wallpaper-control-input">' + (control || '') + '</div>' +
                '</div>';
        }

        function sourceDetailFrameHTML(source, body, options) {
            options = options || {};
            return '<div class="wallpaper-source-head">' +
                    '<div><h3>' + escapeHtml(options.title || sourceLabel(source)) + '</h3>' +
                    '<p>' + escapeHtml(options.desc || '') + '</p></div>' +
                    (options.summary ? '<div class="wallpaper-source-summary">' + options.summary + '</div>' : '') +
                '</div>' +
                '<div class="wallpaper-source-content">' + (body || '') + '</div>';
        }
```

Change `detailHTML()` to wrap existing detail callback output:

```js
        function detailHTML() {
            var source = normalizeSource(currentWorkOrder().pendingSource);
            var raw = context.buildWallpaperSourceDetailHTML ?
                context.buildWallpaperSourceDetailHTML(source) :
                '<p>' + escapeHtml(tr('sourcePendingHint')) + '</p>';
            var descKey = 'source' + source.charAt(0).toUpperCase() + source.slice(1) + 'Desc';
            if (source === 'api') descKey = 'sourceApiDesc';
            return '<section class="wallpaper-source-detail" data-wallpaper-source-detail="' + escapeHtml(source) + '">' +
                sourceDetailFrameHTML(source, raw, {
                    desc: tr(descKey),
                    summary: '<span class="wallpaper-source-summary-pill">' + escapeHtml(statusText(currentStatus())) + '</span>'
                }) +
                '</section>';
        }
```

- [ ] **Step 4: Add CSS for component helpers**

Add:

```css
.wallpaper-source-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 16px;
}

.wallpaper-source-head h3 {
    margin: 0 0 5px;
    font-size: 17px;
    line-height: 1.25;
    letter-spacing: 0;
}

.wallpaper-source-head p {
    margin: 0;
    color: var(--text-muted);
    font-size: 12.5px;
    line-height: 1.5;
}

.wallpaper-source-summary {
    flex: 0 0 auto;
}

.wallpaper-source-summary-pill {
    display: inline-flex;
    align-items: center;
    min-height: 30px;
    padding: 0 10px;
    border: 1px solid rgba(var(--accent-rgb), 0.26);
    border-radius: 999px;
    color: var(--text-secondary);
    background: rgba(var(--accent-rgb), 0.08);
    font-size: 11.5px;
    font-weight: 720;
    white-space: nowrap;
}

.wallpaper-source-content {
    min-width: 0;
}

.wallpaper-control {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(160px, 220px);
    gap: 14px;
    align-items: center;
    padding: 12px;
    border: 1px solid rgba(var(--stroke-rgb), 0.62);
    border-radius: 10px;
    background: rgba(var(--surface-base-rgb), 0.22);
}

.wallpaper-control-copy {
    min-width: 0;
}

.wallpaper-control-copy strong,
.wallpaper-control-copy small {
    display: block;
}

.wallpaper-control-copy strong {
    color: var(--text-primary);
    font-size: 12.5px;
    line-height: 1.35;
}

.wallpaper-control-copy small {
    margin-top: 4px;
    color: var(--text-muted);
    font-size: 11.5px;
    line-height: 1.45;
}

.wallpaper-control-input {
    min-width: 0;
}

.wallpaper-control-input > select,
.wallpaper-control-input > input,
.wallpaper-control-input > .custom-select {
    width: 100%;
}
```

- [ ] **Step 5: Run checks and commit**

```powershell
node docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js
node --check js/settings-wallpaper.js
node --check js/settings-panel.js
git diff --check -- js/settings-wallpaper.js js/settings-panel.js css/settings.css docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js
git add js/settings-wallpaper.js js/settings-panel.js css/settings.css docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js
git commit -m "feat: 统一壁纸来源详情组件"
```

---

## Task 5: Migrate Source Selection And Apply Footer Logic Into The Module

**Files:**
- Modify: `js/settings-wallpaper.js`
- Modify: `js/settings-panel.js`
- Modify: `docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js`

- [ ] **Step 1: Add tests for pending source behavior**

Add:

```js
function testWallpaperSourceSelectionContract() {
  const settingsWallpaper = fs.readFileSync(path.join(repoRoot, 'js', 'settings-wallpaper.js'), 'utf8');
  assert(settingsWallpaper.includes('selectWallpaperSource'), 'module owns source selection');
  assert(settingsWallpaper.includes('switchWallpaperWorkOrderSource'), 'source selection must update the work order');
  assert(settingsWallpaper.includes('refreshWallpaperDraftTab'), 'source selection should refresh detail UI');
  assert(!settingsWallpaper.includes('id="wallpaperSaveBtn"'), 'wallpaper settings should not add a global save button');
  assert(!/selectWallpaperSource[\s\S]{0,1200}activeSource\s*=/.test(settingsWallpaper), 'source selection must not mutate activeSource');
  assert(!/selectWallpaperSource[\s\S]{0,1200}saveWallpaper/.test(settingsWallpaper), 'source selection must not save wallpaper model');
}
```

Call it in `run()` after `testSourceTabSelectionDoesNotCommitActiveSource()`.

- [ ] **Step 2: Run tests and verify current behavior**

Run:

```powershell
node docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js
```

Expected: pass if Task 2 implemented `selectWallpaperSource()` correctly. If it fails, fix the module selection handler before moving on.

- [ ] **Step 3: Move footer refresh into the module**

Add these functions inside `create(context)`:

```js
        function refreshApplyFooter(root) {
            root = root || document;
            var status = root.querySelector('#wallpaperApplyStatus');
            var button = root.querySelector('#wallpaperApplyBtn');
            if (!status || !button) return;
            var validation = currentStatus();
            status.textContent = statusText(validation);
            status.dataset.state = statusState(validation);
            button.disabled = !validation.valid;
        }
```

Expose it:

```js
            refreshApplyFooter: refreshApplyFooter,
```

In `settings-panel.js`, change `refreshWallpaperApplyFooter()` to delegate when the module exists:

```js
    function refreshWallpaperApplyFooter() {
        var module = wallpaperSettingsModule;
        if (module && module.refreshApplyFooter) {
            module.refreshApplyFooter(modalContent || document);
            return;
        }
        var status = document.getElementById('wallpaperApplyStatus');
        var button = document.getElementById('wallpaperApplyBtn');
        if (!status || !button) return;
        var validation = validateWallpaperWorkOrder();
        status.textContent = wallpaperStatusText(validation);
        status.dataset.state = wallpaperStatusState(validation);
        button.disabled = !validation.valid;
    }
```

- [ ] **Step 4: Run checks and commit**

```powershell
node docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js
node --check js/settings-wallpaper.js
node --check js/settings-panel.js
git diff --check -- js/settings-wallpaper.js js/settings-panel.js docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js
git add js/settings-wallpaper.js js/settings-panel.js docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js
git commit -m "refactor: 迁移壁纸来源选择状态"
```

---

## Task 6: Migrate Simple Source Details First: Bing, Upload, Folder

**Files:**
- Modify: `js/settings-wallpaper.js`
- Modify: `js/settings-panel.js`
- Modify: `css/settings.css`
- Modify: `docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js`

- [ ] **Step 1: Add tests for simple source detail ownership**

Add:

```js
function testSimpleWallpaperSourceDetailsMoved() {
  const settingsWallpaper = fs.readFileSync(path.join(repoRoot, 'js', 'settings-wallpaper.js'), 'utf8');
  const settingsPanel = fs.readFileSync(path.join(repoRoot, 'js', 'settings-panel.js'), 'utf8');
  [
    'function buildBingDetailHTML',
    'function buildUploadDetailHTML',
    'function buildFolderDetailHTML',
    'data-upload-mode="image"',
    'data-upload-mode="video"',
    'folderChooseBtn'
  ].forEach((needle) => {
    assert(settingsWallpaper.includes(needle), `settings-wallpaper should own ${needle}`);
  });
  assert(!settingsPanel.includes('function buildUploadConfigHTML'), 'upload config builder should be moved out of settings-panel');
  assert(!settingsPanel.includes('function buildFolderConfigHTML'), 'folder config builder should be moved out of settings-panel');
}
```

Call it after `testWallpaperSourceDetailComponentsContract()`.

- [ ] **Step 2: Run tests and verify failure**

```powershell
node docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js
```

Expected: fail because the builders still live in `settings-panel.js`.

- [ ] **Step 3: Move these functions unchanged from `settings-panel.js` to `settings-wallpaper.js`**

Move the current function bodies for:

- `buildUploadConfigHTML`
- `bindUploadConfigEvents`
- `buildFolderConfigHTML`
- `bindFolderConfigEvents`
- folder helper functions directly needed by those functions:
  - `buildFolderPreviewWindow`
  - `prewarmFolderThumbs`
  - `prewarmFolderLightCache`
  - `pruneFolderThumbs`
  - `pruneFolderLightCache`
  - `reauthorizeSavedFolder`
  - `folderStatusText`
  - `folderPermissionStateClass`
  - `folderNeedsReauth`
  - `folderStatusToneClass`
  - `folderReauthLabel`
  - `showFolderNotice`
  - `setFolderStatus`
  - `setFolderButtonState`
  - `folderErrorMessage`

When moving, replace closed-over references with context access:

```js
var D = context.D;
var S = context.S;
var F = context.F;
var WF = context.WF;
```

Add these context entries from `settings-panel.js`:

```js
            S: S,
            F: F,
            WF: WF,
            currentWallpaperDraft: currentWallpaperDraft,
            updatePendingSourceConfig: updatePendingSourceConfig,
            setPendingSourceHealth: setPendingSourceHealth,
            updatePendingBaselineConfig: updatePendingBaselineConfig,
            refreshGallery: refreshGallery,
            wallpaperBlur: function () { return wallpaperBlur; },
            getFolderMount: function () { return wallpaperDraftFolderMount; },
            setFolderMount: function (mount) { wallpaperDraftFolderMount = mount; },
            getUploadModeFromConfig: uploadModeFromConfig
```

Add a simple Bing detail builder in `settings-wallpaper.js`:

```js
        function buildBingDetailHTML() {
            return sourceDetailFrameHTML('bing',
                wallpaperNoticeHTML(tr('bingConfigHint'), 'info'),
                { desc: tr('sourceBingDesc') }
            );
        }
```

Change module detail routing to call:

```js
        function sourceBodyHTML(source) {
            if (source === 'bing') return buildBingDetailHTML();
            if (source === 'upload') return buildUploadDetailHTML();
            if (source === 'folder') return buildFolderDetailHTML();
            return context.buildWallpaperSourceDetailHTML ? context.buildWallpaperSourceDetailHTML(source) : '<p>' + escapeHtml(tr('sourcePendingHint')) + '</p>';
        }
```

- [ ] **Step 4: Bind simple source events through the module**

In module `bindEvents(root)`, call:

```js
            bindUploadDetailEvents(root);
            bindFolderDetailEvents(root);
```

Keep RSS/API/Wallhaven event binding delegated to `context.bindWallpaperSourceDetailEvents(root)` for now. Remove Upload/Folder calls from `settings-panel.js` `bindWallpaperSourceDetailEvents()`.

- [ ] **Step 5: Run checks and commit**

```powershell
node docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js
node --check js/settings-wallpaper.js
node --check js/settings-panel.js
git diff --check -- js/settings-wallpaper.js js/settings-panel.js css/settings.css docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js
git add js/settings-wallpaper.js js/settings-panel.js css/settings.css docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js
git commit -m "refactor: 迁移基础壁纸来源设置"
```

---

## Task 7: Migrate RSS, API, And Wallhaven Details

**Files:**
- Modify: `js/settings-wallpaper.js`
- Modify: `js/settings-panel.js`
- Modify: `css/settings.css`
- Modify: `docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js`

- [ ] **Step 1: Add tests for complex source detail ownership**

Add:

```js
function testComplexWallpaperSourceDetailsMoved() {
  const settingsWallpaper = fs.readFileSync(path.join(repoRoot, 'js', 'settings-wallpaper.js'), 'utf8');
  const settingsPanel = fs.readFileSync(path.join(repoRoot, 'js', 'settings-panel.js'), 'utf8');
  [
    'function buildRssDetailHTML',
    'function buildApiDetailHTML',
    'function buildWallhavenDetailHTML',
    'data-action="test-rss"',
    'data-action="test-api"',
    'data-action="test-wallhaven"',
    "wallhavenCategoryToggle('general', 'G'",
    "wallhavenCategoryToggle('anime', 'A'",
    "wallhavenCategoryToggle('people', 'P'"
  ].forEach((needle) => {
    assert(settingsWallpaper.includes(needle), `settings-wallpaper should own ${needle}`);
  });
  assert(!settingsPanel.includes('function buildRssConfigHTML'), 'RSS config builder should be moved out of settings-panel');
  assert(!settingsPanel.includes('function buildApiConfigHTML'), 'API config builder should be moved out of settings-panel');
  assert(!settingsPanel.includes('function buildWallhavenConfigHTML'), 'Wallhaven config builder should be moved out of settings-panel');
}
```

Call it after `testSimpleWallpaperSourceDetailsMoved()`.

Add this source-library persistence contract test after it:

```js
function testSourceLibraryEditsAutoSaveWithoutGlobalSave() {
  const settingsWallpaper = fs.readFileSync(path.join(repoRoot, 'js', 'settings-wallpaper.js'), 'utf8');
  assert(!settingsWallpaper.includes('wallpaperSaveBtn'), 'wallpaper settings should not expose a global save button');
  assert(settingsWallpaper.includes('saveRssListConfig'), 'RSS list edits should keep the immediate-save helper');
  assert(settingsWallpaper.includes('saveApiListConfig'), 'API list edits should keep the immediate-save helper');
  assert(settingsWallpaper.includes('rssInvalidUrl'), 'RSS invalid URLs should be blocked before saving');
  assert(settingsWallpaper.includes('apiInvalidUrl'), 'API invalid URLs should be blocked before saving');
  assert(settingsWallpaper.includes('deleteRunningRssSource') || settingsWallpaper.includes('confirmRunningRss'), 'deleting running RSS source should have an explicit confirmation path');
  assert(settingsWallpaper.includes('deleteRunningApiSource') || settingsWallpaper.includes('confirmRunningApi'), 'deleting running API source should have an explicit confirmation path');
}
```

Call it in `run()` after `testComplexWallpaperSourceDetailsMoved()`.

- [ ] **Step 2: Run tests and verify failure**

```powershell
node docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js
```

Expected: fail because the complex source builders still live in `settings-panel.js`.

- [ ] **Step 3: Move RSS functions unchanged into `settings-wallpaper.js`**

Move current RSS builder/event/helper functions as a group:

- `buildRssConfigHTML` -> rename to `buildRssDetailHTML`
- `bindRssConfigEvents` -> rename to `bindRssDetailEvents`
- RSS helpers used by those functions:
  - `rssStatusText`
  - `setRssStatus`
  - `showRssNotice`
  - `showRssValidation`
  - `clearRssValidation`
  - `rssErrorMessage`
  - `activeWorkOrderRssSource`
  - `selectedWorkOrderRssSource`
  - source CRUD helpers for RSS

Replace closed-over references with context entries. Add any missing context functions explicitly to `wallpaperSettingsContext()`.

- [ ] **Step 4: Move API functions unchanged into `settings-wallpaper.js`**

Move current API builder/event/helper functions as a group:

- `buildApiConfigHTML` -> rename to `buildApiDetailHTML`
- `bindApiConfigEvents` -> rename to `bindApiDetailEvents`
- API helpers used by those functions:
  - `apiErrorMessage`
  - `setApiStatus`
  - `showApiNotice`
  - `clearApiValidation`
  - `activeApiSourceIdentity`
  - `selectedWorkOrderApiSource`
  - source CRUD helpers for API

Keep separate image/JSON source lists and the existing refresh interval behavior.

Keep source-library edits immediate-save:

- RSS/API list edits continue calling `saveRssListConfig()` / `saveApiListConfig()` immediately.
- Invalid HTTP URLs keep add/test/apply-related actions disabled and show existing invalid URL copy.
- No source-list edit should require a global Save button.
- Non-running source deletion saves config only. Running source deletion keeps the existing confirmation and fallback behavior.

- [ ] **Step 5: Move Wallhaven functions unchanged into `settings-wallpaper.js`**

Move current Wallhaven builder/event/helper functions as a group:

- `buildWallhavenConfigHTML` -> rename to `buildWallhavenDetailHTML`
- `bindWallhavenConfigEvents` -> rename to `bindWallhavenDetailEvents`
- Wallhaven helpers used by those functions:
  - `selectedDraftWallhavenConfig`
  - `wallhavenCategoryToggle`
  - `wallhavenColorSwatch`
  - `wallhavenErrorMessage`
  - `showWallhavenNotice`
  - `setWallhavenStatus`
  - `testWallhavenConfig`
  - interval, sorting, color, category, and custom query helpers

Keep fixed glyphs `G`, `A`, `P`. Do not reintroduce translatable category glyph keys.

- [ ] **Step 6: Route complex detail events**

In module `bindEvents(root)`, call:

```js
            bindRssDetailEvents(root);
            bindApiDetailEvents(root);
            bindWallhavenDetailEvents(root);
```

Remove RSS/API/Wallhaven calls from `settings-panel.js` `bindWallpaperSourceDetailEvents()`.

- [ ] **Step 7: Run checks and commit**

```powershell
node docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js
node --check js/settings-wallpaper.js
node --check js/settings-panel.js
git diff --check -- js/settings-wallpaper.js js/settings-panel.js css/settings.css docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js
git add js/settings-wallpaper.js js/settings-panel.js css/settings.css docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js
git commit -m "refactor: 迁移复杂壁纸来源设置"
```

---

## Task 8: Migrate Prepare/Apply Helpers And Tighten State Machine Boundaries

**Files:**
- Modify: `js/settings-wallpaper.js`
- Modify: `js/settings-panel.js`
- Modify: `js/wallpaper/apply.js` only if tests prove apply-layer behavior is missing
- Modify: `docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js`

- [ ] **Step 1: Add tests for prepare/apply ownership**

Add:

```js
function testWallpaperPrepareHelpersMoved() {
  const settingsWallpaper = fs.readFileSync(path.join(repoRoot, 'js', 'settings-wallpaper.js'), 'utf8');
  const settingsPanel = fs.readFileSync(path.join(repoRoot, 'js', 'settings-panel.js'), 'utf8');
  [
    'function prepareWallpaperWorkOrder',
    'function prepareUploadWorkOrder',
    'function prepareFolderWorkOrder',
    'function prepareApiWorkOrder',
    'function prepareWallhavenWorkOrder',
    'function applyWallpaperDraft'
  ].forEach((needle) => {
    assert(settingsWallpaper.includes(needle), `settings-wallpaper should own ${needle}`);
  });
  assert(!settingsPanel.includes('function prepareUploadWorkOrder'), 'upload prepare should move out of settings-panel');
  assert(!settingsPanel.includes('function prepareFolderWorkOrder'), 'folder prepare should move out of settings-panel');
  assert(!settingsPanel.includes('function applyWallpaperDraft'), 'wallpaper apply handler should move out of settings-panel');
}
```

Call it after `testComplexWallpaperSourceDetailsMoved()`.

- [ ] **Step 2: Run tests and verify failure**

```powershell
node docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js
```

Expected: fail because prepare/apply helpers still live in `settings-panel.js`.

- [ ] **Step 3: Move prepare/apply helpers into `settings-wallpaper.js`**

Move these functions unchanged as a group:

- `snapshotWallpaperStorage`
- `restoreWallpaperStorage`
- `restoreIdbValue`
- `snapshotFolderPrepareStorage`
- `restoreFolderPrepareStorage`
- `snapshotApiPrepareStorage`
- `restoreApiPrepareStorage`
- `snapshotWallhavenPrepareStorage`
- `restoreWallhavenPrepareStorage`
- `snapshotUploadPrepareStorage`
- `restoreUploadPrepareStorage`
- `createUploadImageRecord`
- `pruneUploadImageRecords`
- `writeUploadImagePrepare`
- `writeUploadVideoPrepare`
- `prepareUploadWorkOrder`
- `prepareFolderWorkOrder`
- `prepareWallhavenWorkOrder`
- `prepareApiWorkOrder`
- `prepareWallpaperWorkOrder`
- `applyWallpaperDraft`

Replace state access with context getters/setters:

```js
context.getWallpaperDraft()
context.openWallpaperDraft()
context.refreshWallpaperWorkOrderBaseline()
context.invalidateWallpaperTab()
context.refreshGallery()
context.setCurrentMode(source)
context.getWallpaperBlur()
context.getFolderMount()
context.setFolderMount(mount)
context.getUploadFilePicker(mode)
```

In `settings-panel.js`, implement these context methods using existing state variables:

```js
            getWallpaperDraft: currentWallpaperDraft,
            openWallpaperDraft: openWallpaperDraft,
            refreshWallpaperWorkOrderBaseline: refreshWallpaperWorkOrderBaseline,
            invalidateWallpaperTab: invalidateWallpaperTab,
            refreshGallery: refreshGallery,
            setCurrentMode: function (source) { currentMode = D.compatMode ? D.compatMode(source) : normalizeDraftSource(source); },
            getWallpaperBlur: function () { return wallpaperBlur; },
            getFolderMount: function () { return wallpaperDraftFolderMount; },
            setFolderMount: function (mount) { wallpaperDraftFolderMount = mount; },
            getUploadFilePicker: pickUploadFiles
```

- [ ] **Step 4: Keep `WallpaperApply` layer unchanged unless a test fails**

Run the tests before touching `js/wallpaper/apply.js`. Only edit it if a regression test proves a missing source-state behavior. The current required apply-layer invariants are:

- Upload Ready and Applying may proceed for same-mode file picker apply.
- Folder Ready and Applying may proceed for prepared mount apply.
- RSS/API/Wallhaven require matching passed test hashes.
- Cancelled prepare skips commit, reload, and cleanup.

- [ ] **Step 5: Run checks and commit**

```powershell
node docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js
node --check js/settings-wallpaper.js
node --check js/settings-panel.js
node --check js/wallpaper/apply.js
git diff --check -- js/settings-wallpaper.js js/settings-panel.js js/wallpaper/apply.js docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js
git add js/settings-wallpaper.js js/settings-panel.js js/wallpaper/apply.js docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js
git commit -m "refactor: 迁移壁纸应用流程胶水"
```

---

## Task 9: Remove Old Accordion Markup And Stale CSS

**Files:**
- Modify: `js/settings-panel.js`
- Modify: `js/settings-wallpaper.js`
- Modify: `css/settings.css`
- Modify: `docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js`

- [ ] **Step 1: Add cleanup contract tests**

Add:

```js
function testOldWallpaperAccordionRemoved() {
  const settingsWallpaper = fs.readFileSync(path.join(repoRoot, 'js', 'settings-wallpaper.js'), 'utf8');
  const settingsPanel = fs.readFileSync(path.join(repoRoot, 'js', 'settings-panel.js'), 'utf8');
  const css = fs.readFileSync(path.join(repoRoot, 'css', 'settings.css'), 'utf8');
  assert(!settingsWallpaper.includes('source-drawer'), 'new wallpaper module should not render old source drawers');
  assert(!settingsPanel.includes('source-accordion'), 'settings-panel should not render old source accordion');
  assert(!settingsPanel.includes('function draftOpenSource'), 'old accordion open-source helper should be removed');
  assert(!css.includes('.source-drawer'), 'old source drawer CSS should be removed after migration');
  assert(!css.includes('.source-accordion'), 'old source accordion CSS should be removed after migration');
}
```

Call it near the end of `run()` before behavioral tests that do not inspect CSS.

- [ ] **Step 2: Run tests and verify failure**

```powershell
node docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js
```

Expected: fail because old CSS and helpers still exist.

- [ ] **Step 3: Remove old accordion-only helpers and CSS**

Remove from `settings-panel.js` if no longer referenced:

- `draftOpenSource`
- `wallpaperDraftOpenSource`
- old source drawer max-height animation in `bindWallpaperEvents`
- old `configs` map inside previous `buildWallpaperHTML`
- old source accordion rendering code

Remove from `css/settings.css` if no longer referenced by non-wallpaper UI:

- `.source-accordion`
- `.source-drawer`
- `.source-drawer-header`
- `.source-drawer-body`
- `.source-drawer-body-inner`
- `.source-selector`
- `.source-drawer-dot`
- `.source-drawer-info`
- `.source-drawer-name`
- `.source-drawer-desc`
- `.source-drawer-chevron`
- broad selectors of the form `.source-drawer-body-inner button:not(...)`

Before deleting a selector, search:

```powershell
Select-String -Path js/*.js,css/*.css -Pattern 'source-drawer|source-accordion|source-selector|source-drawer-body-inner'
```

Only delete selectors that are not referenced by remaining markup.

- [ ] **Step 4: Run checks and commit**

```powershell
node docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js
node --check js/settings-wallpaper.js
node --check js/settings-panel.js
git diff --check -- js/settings-wallpaper.js js/settings-panel.js css/settings.css docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js
git add js/settings-wallpaper.js js/settings-panel.js css/settings.css docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js
git commit -m "refactor: 清理旧壁纸抽屉实现"
```

---

## Task 10: Browser Smoke And Visual Polish

**Files:**
- Modify: `css/settings.css`
- Modify: `js/settings-wallpaper.js`
- Optional Modify: `docs/ai-tasks/wallpaper-settings-future-mockup.html` if implementation intentionally diverges from the mockup and the reference should be updated.

- [ ] **Step 1: Run baseline non-browser checks**

```powershell
node docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js
Get-ChildItem -Recurse js -Include *.js | ForEach-Object { node --check $_.FullName; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } }
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
git diff --check
```

- [ ] **Step 2: Open `index.html` in a browser**

Use the Playwright skill if available in the execution session. Open the local file:

```text
E:\Users\CoffeeCat\Desktop\Study\puretab-extension\PlainTab\index.html
```

Manual smoke path:

1. Open the settings modal.
2. Click the Wallpaper tab.
3. Verify the layout has left source nav, right detail, runtime card, and footer.
4. Click each source tab.
5. Confirm only the right detail changes and the visible wallpaper does not switch.
6. Confirm footer status changes between Clean, Ready, Blocked, Testing, Applying, and Error when existing test controls are used.
7. Resize to narrow width and verify source nav becomes horizontal and no text overlaps.

- [ ] **Step 3: Fix visual issues with scoped CSS only**

Allowed polish fixes:

- spacing rhythm in `.wallpaper-workspace`,
- badge widths,
- source nav truncation,
- detail panel overflow,
- footer wrapping,
- button alignment,
- contrast of light status colors.

Do not change wallpaper storage, source fetching, or apply semantics in this task.

- [ ] **Step 4: Final checks and commit**

```powershell
node docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js
Get-ChildItem -Recurse js -Include *.js | ForEach-Object { node --check $_.FullName; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } }
git diff --check
git add css/settings.css js/settings-wallpaper.js docs/ai-tasks/wallpaper-settings-future-mockup.html
git commit -m "style: 打磨统一壁纸设置界面"
```

---

## Final Verification

Run the full required suite:

```powershell
node docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js
Get-ChildItem -Recurse js -Include *.js | ForEach-Object { node --check $_.FullName; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } }
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
git diff --check
git status --short
```

Expected:

- wallpaper settings redesign tests pass,
- every JavaScript file passes `node --check`,
- i18n validation prints `validatePlainTabI18N ok`,
- `git diff --check` exits 0,
- `git status --short` is clean after the final commit.

## Self-Review

- The plan covers visual layout, module split, source tab semantics, source detail migration, prepare/apply migration, CSS cleanup, and verification.
- The plan keeps `settings-wallpaper.js` out of the first-paint script list.
- The plan preserves L1 gallery ownership and does not add L2 thumbnails.
- The plan explicitly states that clicking a left source tab updates pending source only and must not write `activeSource`.
- The plan keeps RSS/API/Wallhaven hash-gated apply behavior and Upload/Folder Applying edge cases covered by tests.
