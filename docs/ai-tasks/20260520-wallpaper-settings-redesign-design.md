# Task: Wallpaper Settings Interaction Redesign

## Goal

Redesign the wallpaper settings tab so source switching is predictable, source health is explicit, and applying a wallpaper source is a safe transaction rather than a complex UI-side procedure.

## Background

The current wallpaper tab mixes two interaction models:

- Wallpaper display settings such as fit, position, blur, vignette, and overlay save immediately.
- Wallpaper source settings use a draft/apply model.

This creates confusing behavior because the same page contains immediate changes, pending changes, source drawer state, source health tests, cache cleanup, and runtime reload logic. The current `applyWallpaperDraft()` flow also handles too many responsibilities: validation, confirmation, cache deletion, provider preparation, saving, runtime state sync, and reload.

The redesign keeps the useful part of the current model: display settings remain immediate, while source changes require explicit application.

## Design Decisions

### Interaction Model

- Use model B from the design review: display settings are immediate; source selection and source runtime configuration require Apply.
- Open the wallpaper tab with all source drawers collapsed.
- Source selectors only change the pending source. They do not expand drawers.
- Source drawer headers only expand or collapse drawers. They do not change the pending source.
- The selected source means "source to apply next", not necessarily "expanded source" and not necessarily "currently running source".
- The current running source should be labeled separately as "currently in use".

### Thin Work Order

Replace the broad wallpaper draft concept with a thin current-source work order.

The work order owns only the source being prepared for application:

- `pendingSource`: the source the user intends to apply.
- `pendingConfig`: the runtime configuration for that source.
- `baseline`: the saved configuration for the same source, used to detect changes.
- `health`: the validation or test status for the current work order.

The work order must not own cache deletion, IndexedDB writes, runtime provider state, reload behavior, or unrelated source list management.

When the user changes the pending source, the current work order switches to that source. The status bar then describes only that work order.

### Source List Management

RSS/API source list CRUD is not the same as applying a wallpaper source.

These actions save immediately:

- Add an RSS/API source.
- Delete a non-running RSS/API source.
- Rename an RSS/API source.
- Modify a non-pending RSS/API source URL or JSON path, while clearing that source's passed test state.

These actions require special handling:

- Modifying the currently pending RSS/API source belongs to the current work order and requires retesting before Apply.
- Deleting the currently running RSS/API source is destructive. It requires confirmation and must either fall back to Bing or ask the user to switch away first.

This allows a Folder work order to remain active while the user deletes an unrelated RSS/API link.

### Health Gate

The Apply button is enabled only when the current work order is healthy.

Health rules:

- Bing is always healthy.
- Upload is healthy only when it has at least one usable image or video asset.
- Folder is healthy only when a directory is selected, permission is granted, and a usable preview is prepared.
- RSS is healthy only when the pending RSS source has a passed test whose field hash matches the current source fields.
- API is healthy only when the pending API source has a passed test whose field hash matches the current source fields and API type.
- Wallhaven is healthy only when the pending Wallhaven config has a passed test whose field hash matches the current config.

Testing is a preparation action. Applying is a commit action. Apply should not be used as "try this and see if it works".

### Status Bar State Machine

The wallpaper source status bar follows this state machine:

- `Clean`: the current work order matches the saved baseline. Apply is disabled.
- `Dirty`: the current work order differs from the baseline and needs health evaluation.
- `Blocked`: the work order cannot be applied. Apply is disabled and the status shows exactly one blocking reason.
- `Testing`: a source test is running. Apply is disabled.
- `Ready`: the current work order is healthy. Apply is enabled.
- `Applying`: the transaction is running. Apply is disabled.
- `Error`: applying failed. The old source and old visible wallpaper remain active.
- `Applied/Clean`: applying succeeded; the baseline refreshes and the state returns to `Clean`.

Example blocking reasons:

- No source changes to apply.
- Add an image or video wallpaper first.
- Choose a folder and grant permission.
- Enter a valid HTTPS URL.
- Test the current RSS source first.
- Test the current API source first.
- Test the current Wallhaven settings first.
- The latest test failed, with the failure message shown.

### Transactional Apply

Applying a source is a transaction:

1. `validate`: check the current work order and health gate.
2. `prepare`: prepare at least one visible wallpaper for the new source.
3. `commit`: save the official wallpaper config and `activeSource`.
4. `reload`: call `window.reloadWallpaper()` to display the new source.
5. `cleanup`: after the new source is committed, clean the old source cache to prevent IndexedDB growth.
6. `refreshWorkOrder`: refresh the baseline and return to `Clean`.

Failure behavior:

- If `validate` or `prepare` fails, do not save `activeSource` and do not clear old cache.
- If `commit` or `reload` fails, keep the old visible wallpaper available and show an error.
- If `cleanup` fails, the apply can still be considered successful; cache cleanup is a follow-up concern.
- If the previous and next source are the same, do not clear that source cache. Save config changes and reload only if needed.

The user should not see a generic "switching source will discard cached wallpaper data" confirmation. Cache cleanup is an internal successful-apply step. User confirmation is reserved for destructive configuration actions such as deleting the currently running RSS/API source.

## Proposed Code Structure

### New Module

Add `js/wallpaper/apply.js` with `window.WallpaperApply`.

Responsibilities:

- Build and validate current-source work orders.
- Report health gate state and blocking reasons.
- Prepare source-specific runtime data before commit.
- Commit source config and `activeSource`.
- Reload wallpaper.
- Clean previous source cache after successful commit.

Expected public shape:

- `validateWorkOrder(workOrder)`
- `prepareWorkOrder(workOrder)`
- `commitWorkOrder(workOrder)`
- `cleanupPreviousSource(previousSource, nextSource)`
- `apply(workOrder)`

### Settings Panel

Keep UI construction in `js/settings-panel.js`, but reduce source application responsibilities.

Settings panel responsibilities:

- Render wallpaper display controls and source drawers.
- Keep display settings immediate.
- Maintain the current-source work order.
- Update the status bar from `WallpaperApply.validateWorkOrder`.
- Run RSS/API/Wallhaven tests and store test state against the relevant source/config.
- Call `WallpaperApply.apply(workOrder)` when Apply is clicked.

The existing `applyWallpaperDraft()` logic should be removed or reduced to an adapter.

### Data Module

Keep storage ownership in `js/wallpaper/data.js`.

If needed, add small helper APIs rather than direct IndexedDB access from UI code. A likely helper is a cache cleanup function that can clear a previous source without changing `activeSource`.

### Startup Order

Add `js/wallpaper/apply.js` in the normal runtime script area of `index.html`.

Do not move `js/preload.js`, do not make it async, and do not put network, IndexedDB, or source preparation work into the first-paint path.

## Acceptance Criteria

- Wallpaper tab opens with all source drawers collapsed.
- Clicking a source selector changes the pending source and does not expand drawers.
- Clicking a drawer header expands or collapses the drawer and does not change the pending source.
- The current running source and pending source are visually distinguishable.
- Display settings continue to preview and save immediately.
- RSS/API/Wallhaven Apply is disabled until the current pending source/config passes a matching health test.
- Folder Apply is disabled until a usable folder preview is prepared.
- Upload Apply is disabled when no upload asset exists.
- Folder pending work is not lost when deleting an unrelated RSS/API source.
- Deleting a non-running RSS/API source saves immediately.
- Deleting the currently running RSS/API source requires confirmation and falls back safely.
- Applying a new source prepares the new source before clearing old source cache.
- Failed preparation leaves the old source, old cache, and visible wallpaper intact.
- Successful cross-source apply cleans the previous source cache after the new source is active.
- No wallpaper transition path can leave both wallpaper layers blank.

## Verification Plan

- Run JavaScript syntax checks:

```powershell
Get-ChildItem -Recurse js -Include *.js | ForEach-Object { node --check $_.FullName }
```

- Manually verify in browser:
  - Default collapsed drawers.
  - Selector and drawer header independence.
  - Health-gated RSS/API/Wallhaven Apply button.
  - Folder work order plus unrelated RSS/API source deletion.
  - Successful cross-source apply and old cache cleanup.
  - Failed source preparation preserving the old wallpaper.

## Scope Boundaries

- Do not add build tools, npm, frameworks, lint frameworks, or large runtime dependencies.
- Do not change first-paint invariants.
- Do not redesign the whole settings modal.
- Do not rewrite storage schema unless a small compatibility helper is required.
- Do not make source selection immediately persistent.

## Architecture Notes

* time: 2026-05-20
* module: wallpaper settings
* change summary: planned redesign of wallpaper source interaction around current-source work orders, health-gated Apply, and transactional source switching
* reason: current wallpaper tab mixes immediate settings, broad drafts, source health tests, cache cleanup, and runtime reloads in a way that makes interaction and code flow hard to reason about
* affected files: `js/settings-panel.js`, `js/wallpaper/apply.js`, `js/wallpaper/data.js`, `index.html`, related i18n files if new status text is needed
* runtime impact: source application becomes an explicit transaction that prepares the new source before committing and cleaning old cache
* performance impact: no first-paint impact; source preparation remains user-triggered inside settings
* risk level: medium
