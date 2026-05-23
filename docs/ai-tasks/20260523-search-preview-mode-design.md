# Task: Search Settings Preview Mode

## Goal

Add a real-time search preview mode that lets users tune visual search-bar settings against the actual new-tab page without the full settings modal covering the result.

## Global Context

PlainTab has three relevant runtime layers:

- `index.html` defines the stable first-paint DOM. The search bar already exists before settings scripts run, so preview mode must reuse `#searchBar` instead of creating a second search bar.
- `js/settings-panel.js` owns the full settings UI and already applies search visual settings live through attributes, classes, and CSS variables.
- `js/newtab.js` owns global click behavior, search visibility, command-palette shortcuts, search history, and actual search execution.

The preview mode is a settings surface, not a search execution feature. It belongs in `SettingsPanelFull`, with a small public state API so `newtab.js` can treat it like other settings surfaces.

## Behavior Requirements

- The Search tab places a "Live Preview" entry at the top of the page.
- Clicking it hides the full modal and opens a fixed right-side search preview bar.
- Preview mode uses the real `#searchBar`, real wallpaper, and current stored search settings.
- Preview mode temporarily forces the search bar visible, including when the saved visibility mode is `hover` or `never`.
- The preview bar exposes only visual controls: surface, background opacity, blur, radius, shadow, visibility, position, width, icon visibility, and icon position.
- Search engine, Enter behavior, placeholder, and history remain in the full Search tab because they do not benefit from visual preview.
- Clicking blank page space exits settings entirely and returns to the normal new-tab page.
- Clicking "Back to Settings" exits preview and reopens the full settings modal on the Search tab.
- The right-side preview bar stays fixed on desktop. On narrow screens it becomes a bottom drawer.
- No search config migration is needed. All existing search settings continue to save through the existing `ptab_ui.search` model.

## Architecture

### Settings Ownership

`js/settings-panel.js` should own:

- `isSearchPreviewOpen` state.
- `openSearchPreview()`, `closeSearchPreview(options)`, and `returnToSearchSettings()`.
- Lazy creation of the preview bar DOM.
- Event binding for preview controls.
- Synchronization between full Search tab controls and preview controls.

Preview controls should call the existing `applySearch*` functions instead of introducing another data path.

### Runtime Coordination

`js/newtab.js` should only know that preview mode is an active settings surface:

- `settingsSurfaceActive()` includes `SP.isSearchPreviewOpen()`.
- Palette mouse shortcuts stay blocked while preview mode is open.
- Global blank-space click asks `SettingsPanelFull` to close preview mode before it focuses the search input.

Search execution and history behavior should remain otherwise unchanged.

### DOM And CSS

The preview bar can be created lazily by `settings-panel.js` and appended to `document.body` after startup. This avoids changing first-paint DOM order.

`css/settings.css` should define:

- `.search-preview-panel`
- `.search-preview-panel.active`
- mobile bottom-drawer layout
- a temporary page attribute/class that forces `#searchBar` visible while preview is active

Search visual changes continue to be driven by existing `#searchBar` attributes and root CSS variables.

### I18N

New UI copy requires keys in every `js/i18n/*.js` pack:

- `searchPreviewAction`
- `searchPreviewTitle`
- `searchPreviewDesc`
- `searchPreviewBack`
- `searchPreviewClose`

## Architecture Notes

* time: 2026-05-23
* module: settings/search/runtime
* change summary: Add a dedicated search visual preview surface controlled by settings-panel and recognized by runtime global event guards.
* reason: The full settings modal covers the real search bar, making visual search settings hard to tune.
* affected files: `js/settings-panel.js`, `js/newtab.js`, `css/settings.css`, `js/i18n/*.js`, `docs/ai-tasks/20260523-search-preview-mode-test.js`
* runtime impact: Adds a lazy settings surface after startup; does not affect preload, wallpaper first paint, storage schema, or search execution.
* performance impact: Low. Preview DOM is created only when requested; live changes reuse existing apply functions.
* risk level: medium
