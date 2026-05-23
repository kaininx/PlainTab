---
name: storage-migration
description: Use before changing PlainTab persistent storage, including localStorage keys, IndexedDB keys or record formats, `LS_VERSION`, `DB_VERSION`, `ptab_schema_version`, migration code, backup/import/export storage shape, wallpaper cache cleanup, or any task that may affect old users upgrading across versions.
---

# PlainTab Storage Migration

Use this skill as a red-line checklist for storage changes. User data safety and jump-upgrade behavior matter more than implementation neatness.

## First Reads

1. Read `.claude/rules/00-core.md`.
2. Read `.claude/rules/10-storage.md`.
3. If wallpaper rendering, first paint, settings UI, language, search, or command palette storage is touched, read the matching rule file from `.claude/rules/README.md`.

## Version Rules

- `DB_VERSION` is only for IndexedDB structure: object stores, indexes, keyPath, or autoIncrement.
- `LS_VERSION` / `ptab_schema_version` is for PlainTab application data semantics.
- If an IndexedDB-only change affects key names, record shape, references, old data cleanup, or jump upgrades, bump `LS_VERSION` and add a `WallpaperData.migrate()` path.
- Do not use IndexedDB version upgrades for application-level migration decisions.
- Pure discardable cache changes do not need `LS_VERSION` if missing or stale cache cannot be misread and does not require cleanup.

## Migration Discipline

Before production edits, write or update a focused check in `docs/ai-tasks/` and watch it fail for the missing migration behavior.

For each migration step:

1. Detect from persisted data, not app release numbers. Prefer `ptab_schema_version`, legacy `ptab_version`, old key presence, and current model facts.
2. Make the step idempotent. A browser close midway must be safe to retry.
3. Write large data first, then write references.
4. Never write references to missing Blob records.
5. Remove references before deleting large data.
6. Mark migration complete only after required new data and cleanup succeed.
7. Do not overwrite non-default data already created by a newer version.
8. Keep runtime modules reading only the current schema after migration.

## Cleanup Rules

- Delete obsolete localStorage keys after successful migration.
- Delete obsolete IndexedDB keys with targeted deletes. Do not delete the whole `PlainTab` database while current data uses the same store.
- Avoid permanent top-level marker keys for one-off migrations. If cleanup truly needs an idempotent retry marker, keep it scoped to an existing owned model, document why persisted facts are insufficient, and include a cleanup/removal path.
- Keep old migration code for enough releases to support users who skip versions.

## Validation

Run the focused migration check, then JS syntax validation:

```powershell
node docs\ai-tasks\<migration-test>.js
Get-ChildItem -Recurse js -Include *.js | ForEach-Object { node --check $_.FullName }
git diff --check -- js docs/ai-tasks .claude/rules
```

If storage behavior changes, update `.claude/rules/10-storage.md` in the same change.
