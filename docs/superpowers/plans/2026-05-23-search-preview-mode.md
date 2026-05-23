# Search Preview Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real-time preview mode for search visual settings without covering the real search bar.

**Architecture:** `js/settings-panel.js` owns preview state, lazy DOM, and controls. `js/newtab.js` only recognizes preview as an active settings surface and closes it on blank-page click. Existing `applySearch*` functions remain the single write path for search settings.

**Tech Stack:** Vanilla JavaScript, native CSS, existing PlainTab i18n files, focused Node validation scripts.

---

## Files

- Modify: `js/settings-panel.js`
  - Add preview state, DOM builder, event binding, open/close/return functions, control sync, public API.
  - Add "Live Preview" entry at the top of `buildSearchHTML()`.
- Modify: `js/newtab.js`
  - Include `SP.isSearchPreviewOpen()` in settings surface detection.
  - Let blank-space clicks close preview before focusing search.
- Modify: `css/settings.css`
  - Add preview panel and mobile drawer styles.
  - Add forced-visible search style while preview is active.
- Modify: `js/i18n/*.js`
  - Add five preview-related keys in every language pack.
- Create: `docs/ai-tasks/20260523-search-preview-mode-test.js`
  - Assert the new surface API, forced visibility, blank-click coordination, visual-control subset, and i18n completeness.

## Tasks

### Task 1: RED Behavior Check

- [ ] Create `docs/ai-tasks/20260523-search-preview-mode-test.js`.
- [ ] Assert `buildSearchHTML()` contains `searchPreviewAction` before the surface group.
- [ ] Assert `settings-panel.js` exposes `isSearchPreviewOpen`, `openSearchPreview`, and `closeSearchPreview`.
- [ ] Assert preview control IDs exist for visual settings and do not include engine, Enter behavior, placeholder, or history.
- [ ] Assert `newtab.js` checks `SP.isSearchPreviewOpen`.
- [ ] Assert `css/settings.css` includes `.search-preview-panel` and `html[data-search-preview="true"] .search-bar`.
- [ ] Assert every `js/i18n/*.js` file contains the new keys.
- [ ] Run `node docs/ai-tasks/20260523-search-preview-mode-test.js` and confirm it fails before implementation.

### Task 2: Settings Preview State

- [ ] Add `isSearchPreviewOpen` state and lazy `searchPreviewPanel` cache to `js/settings-panel.js`.
- [ ] Implement `ensureSearchPreviewPanel()`, `openSearchPreview()`, `closeSearchPreview(options)`, and `returnToSearchSettings()`.
- [ ] On preview open: close custom selects, hide the modal overlay, set `html[data-search-preview="true"]`, activate the preview panel, sync controls.
- [ ] On close: remove the preview attribute, deactivate the panel, and optionally reopen the Search tab.
- [ ] Export preview APIs on `window.SettingsPanelFull`.

### Task 3: Search UI Controls

- [ ] Add a top Search-tab preview action block before `settingsGroupSearchSurface`.
- [ ] Bind the action button in `bindSearchEvents()`.
- [ ] Build preview controls with the existing select/range inputs using unique IDs.
- [ ] Bind preview controls to existing `applySearchMode`, `applySearchPosition`, `applySearchWidth`, `applySearchSurface`, `applySearchBackgroundOpacity`, `applySearchBlur`, `applySearchRadius`, `applySearchShadow`, `applySearchIconVisibility`, and `applySearchIconPosition`.
- [ ] Update `syncSearchControls()` so full modal and preview controls stay in step.

### Task 4: Runtime Coordination

- [ ] Update `settingsSurfaceActive()` in `js/newtab.js` to include `SP.isSearchPreviewOpen()`.
- [ ] Update global blank-space click handling to call `SP.closeSearchPreview()` and return before focusing search.
- [ ] Preserve existing modal, language panel, command palette, and search history behavior.

### Task 5: Styles And I18N

- [ ] Add `.search-preview-panel` styles to `css/settings.css`.
- [ ] Add mobile bottom-drawer styles under the existing `max-width: 720px` block.
- [ ] Add `html[data-search-preview="true"] .search-bar` forced visibility.
- [ ] Add localized preview keys to all `js/i18n/*.js` files.

### Task 6: Verification

- [ ] Run `node docs/ai-tasks/20260523-search-preview-mode-test.js`.
- [ ] Run `Get-ChildItem -Recurse js -Include *.js | ForEach-Object { node --check $_.FullName }`.
- [ ] Run i18n validation from the `update-i18n` skill.
- [ ] Open `index.html` in browser mode and manually verify: open settings, Search tab, Live Preview, adjust controls, blank click exits, Back to Settings returns to Search tab.
