# Wallpaper Settings Unification Design

## Goal

Unify the PlainTab L2 wallpaper settings page into a premium, calm, consistent control surface. The page should feel like a refined wallpaper source console: visually polished, comfortable to use, and strict about source state so configuration cannot accidentally blank or switch the visible wallpaper.

The visual reference for this direction is:

- `docs/ai-tasks/wallpaper-settings-future-mockup.html`

## Scope

This redesign covers only the L2 settings modal wallpaper tab. The L1 corner panel remains responsible for the wallpaper gallery, thumbnail management, quick upload entry, and visible wallpaper browsing.

In scope:

- Replace the current source accordion with a two-column wallpaper settings layout.
- Add a left source navigation rail and a right source detail panel.
- Add a compact current-runtime status card.
- Unify source config controls, list rows, notices, test buttons, and apply footer styling.
- Preserve and harden the work-order apply model.
- Move wallpaper settings implementation out of the large `js/settings-panel.js` file into a focused module.
- Remove or rewrite stale/conflicting wallpaper settings CSS as part of the migration.

Out of scope:

- Rebuilding the L1 gallery.
- Changing startup, preload, or first-paint behavior.
- Adding frameworks, build tools, package managers, lint tools, or large runtime dependencies.
- Changing the core wallpaper storage schema unless a narrow migration is explicitly required.

## Visual Direction

The accepted direction is B+A:

- B: gallery-curated sensibility, but without an actual gallery in L2.
- A: quiet professional settings ergonomics.

The page should look premium without becoming decorative. It should use restrained contrast, stable spacing, subtle borders, clear source color accents, and dense but readable controls. Avoid oversized hero-like compositions, nested cards, glossy effects, decorative blobs, and source-specific visual languages that make each drawer feel like a separate product.

The L2 wallpaper tab should be:

- **Unified:** every source uses the same layout grammar.
- **Calm:** no large movement, no loud gradients, no visual noise.
- **Scannable:** current source, pending source, source health, and required action must be obvious.
- **Content-first:** source controls and status are the product, not decoration.

## Layout

The new wallpaper tab uses:

1. **Header**
   - Title and short description.
   - A current-runtime status card on the right.

2. **Left Source Navigation**
   - One row per source: Bing, Upload, Folder, RSS, Wallhaven, API.
   - Shows source glyph, source name, short description, and compact status badge.
   - Indicates:
     - currently running source,
     - selected pending source,
     - ready/blocked/testing/applying/error state.

3. **Right Source Detail**
   - One source detail view at a time.
   - Contains source title, source description, status/test summary, controls, notices, and source-specific actions.
   - Does not show wallpaper thumbnails or gallery grids.

4. **Footer**
   - One unified apply status block.
   - Secondary reset/default action.
   - Primary apply action.
   - Uses `data-state` styling for Clean, Ready, Blocked, Testing, Applying, and Error.

On mobile or narrow modal widths, the source navigation becomes a horizontal strip above the detail panel. The footer stacks cleanly without text overflow.

## Source Behavior

All sources follow the same interaction rhythm:

1. Select a source.
2. Modify or confirm its configuration.
3. Complete the required gate:
   - Upload: choose image/video mode, then select files during Apply.
   - Folder: choose and prepare a folder.
   - RSS/API/Wallhaven: test the current fields.
   - Bing: no gate.
4. Apply when the footer is Ready.
5. Only after prepare succeeds does the app commit `activeSource`.

Cancellation, test failure, permission denial, invalid URL, empty folder, or failed prepare must not change the visible wallpaper.

### Source Library Persistence

The settings page must distinguish source-library management from runtime source application.

Source-library management is saved immediately:

- RSS/API source add, delete, rename, URL edit, selected row changes, and list ordering if supported.
- Wallhaven local queue deletion/reorder operations.
- Upload/folder management actions that explicitly manage saved local assets or handles.

These actions update configuration or source libraries, but they do not change the visible wallpaper unless they affect the currently running source and the existing source-specific rule says they must. For RSS/API, deleting a non-running source saves the list only and never reloads wallpaper. Deleting the running source requires confirmation and falls back to Bing.

Runtime source application is separate:

- Clicking a left source tab updates only the pending source and the right detail view.
- The saved `activeSource` changes only after the bottom Apply action passes validation and prepare.
- The UI should not expose a global "Save" button next to Apply. The copy should explain: source list edits are saved automatically; applying changes the active wallpaper source.

Invalid source-list input should be rejected before it becomes a saved source. For example, HTTP RSS/API URLs should keep the add/save action disabled and show an HTTPS-only validation message.

### Bing

Bing stays simple. Selecting Bing and applying commits immediately. There is no test or prepare step. The detail panel should explain that it updates automatically and follows the language/market mapping.

### Upload

Upload shows two mutually exclusive mode choices:

- Upload image wallpapers: up to 12 images.
- Upload video wallpaper: one MP4, max 60 seconds and 80 MB.

Choosing a mode only changes the pending work order. Clicking Apply opens the matching system file picker. If the user cancels, the current wallpaper and saved `activeSource` remain unchanged, and the footer shows a cancelled-but-retryable Ready status.

Image apply replaces the upload image set transactionally. Video apply replaces the upload video. L1 quick upload can keep its existing add/manage behavior.

### Folder

Folder requires a successful folder pick and mount preparation before it becomes Ready. Applying a prepared folder must continue to work after the UI switches the work order health from Ready to Applying. If the prepared mount is missing, prepare fails explicitly instead of silently returning false.

The detail panel should make permission state clear: unsupported, no folder, needs permission, ready, empty, or error.

### RSS

RSS source list editing remains immediate for list CRUD, but applying the running source still requires the selected source to have a successful test for the current field hash. Deleting non-running RSS sources must save config only and not reload wallpaper. Deleting the running RSS source requires confirmation and falls back to Bing.

### API

API keeps separate image and JSON source lists. Applying requires a successful test for the selected source and current field hash. JSON path remains an advanced optional field with clear helper copy.

### Wallhaven

Wallhaven remains its own source, not a generic API entry. Applying requires a passed test for the current Wallhaven config hash. Apply downloads and caches up to 12 usable images and switches only after at least one image is cached. Category glyphs remain fixed `G`, `A`, `P`.

## State Model

The work order remains the authoritative L2 model:

- `pendingSource`
- `pendingConfig`
- `baseline`
- `health`

The redesign should not reintroduce a global wallpaper draft that makes unrelated sources dirty. Source navigation changes only `pendingSource` and its matching `pendingConfig`.

Footer state mapping:

- Clean: no unapplied source/config change.
- Ready: apply is allowed.
- Blocked: required gate is missing.
- Testing: source validation is running.
- Applying: prepare/commit/reload is running.
- Error: test, prepare, commit, or reload failed.

Important invariant:

- If the UI sets a Ready work order to Applying immediately before calling `WallpaperApply.apply`, the apply-layer validation must still accept sources whose gate was already satisfied.

## Module Design

Create a focused wallpaper settings module, tentatively:

- `js/settings-wallpaper.js`

This module owns:

- wallpaper tab HTML builders,
- wallpaper source navigation builders,
- source detail builders,
- wallpaper tab event binding,
- work-order glue used by the settings UI,
- prepare/apply helpers that are specific to settings interactions.

`js/settings-panel.js` remains responsible for:

- modal shell,
- tab lifecycle,
- shared settings helpers,
- L1 panel behavior,
- loading and initializing the wallpaper settings module.

The split should be practical, not maximal. Avoid splitting every source into its own file in this pass unless a narrow helper becomes clearly isolated and low-risk.

## CSS Design

Wallpaper settings CSS should be consolidated into a coherent section with names that match the new model:

- wallpaper tab shell
- wallpaper source nav
- wallpaper source item
- wallpaper source detail
- wallpaper control group
- wallpaper source list row
- wallpaper notice
- wallpaper apply footer

Remove old accordion-only rules after migration. Do not keep conflicting selectors that style every button inside `.source-drawer-body-inner`. Source-specific CSS should be small and only for genuinely unique controls, such as Wallhaven color swatches.

The final CSS should avoid:

- nested card-in-card composition,
- one-off source-specific button styles,
- duplicated hover/active rules,
- text overflow in buttons or badges,
- large motion or scale animations.

## Accessibility And Responsiveness

The source nav should behave like a source selection control:

- keyboard focus visible,
- active pending source expressed in ARIA state,
- source health available as text,
- buttons have clear labels,
- no important information communicated by color alone.

Responsive constraints:

- Desktop: left nav + detail panel.
- Narrow modal/mobile: horizontal source nav + stacked detail + footer.
- Footer text and buttons must not overlap.
- Long URLs, source names, and localized text must truncate or wrap predictably.

## Testing And Verification

Keep and extend `docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js`.

Required behavioral coverage:

- source navigation renders all six sources,
- only one pending source detail is active,
- Apply footer state is preserved across source selection,
- Upload cancelled prepare does not commit, reload, or cleanup,
- Upload Applying can still open the picker for same-mode reapply,
- Folder Applying can still prepare and commit a selected mount,
- RSS/API/Wallhaven require matching passed tests,
- deleting non-running RSS/API sources does not reload wallpaper,
- deleting running RSS/API sources confirms and falls back to Bing.

Required commands before implementation completion:

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

If layout implementation is substantial, also run a browser smoke check or screenshot check for desktop and narrow widths.

## Self-Review

- No placeholders remain.
- The design keeps L1 gallery responsibility separate from L2 source configuration.
- The module split is bounded to wallpaper settings and does not rewrite the entire settings system.
- The storage and first-paint invariants remain unchanged.
- The Apply state machine explicitly covers the previously observed Folder and Upload Applying edge cases.
