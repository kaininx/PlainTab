# Agent Skills

This directory contains the canonical shared skills for PlainTab.

## Ownership

- `.agents/skills/` is the source of truth for reusable project skills.
- `.claude/skills/` contains thin Claude Code adapters only.
- If a workflow changes, edit `.agents/skills/<skill>/SKILL.md` first.
- Keep adapters short and point them back to the canonical skill.

## Current Skills

- `bump-version`: updates the PlainTab version across manifest, runtime UI/version constants, changelogs, store listings, release notes, current validation notes, and project docs.
- `commit-changes`: prepares clean Chinese Conventional Commits while preserving unrelated working tree changes.
- `diagnose`: diagnoses PlainTab bugs, broken UI flows, startup issues, storage or wallpaper regressions, and performance regressions with a reproducible feedback loop.
- `improve-codebase-architecture`: reviews PlainTab modules for deeper seams, lower coupling, and better testability while respecting project constraints.
- `storage-migration`: guards PlainTab localStorage/IndexedDB schema changes, migration steps, cleanup order, and old-user jump upgrades.
- `tdd`: guides behavior-first PlainTab feature work and bug fixes using small regression scripts or browser checks without adding test frameworks.
- `update-i18n`: maintains runtime UI translation keys, `js/i18n/*.js` language packs, and related validation.
- `zoom-out`: maps unfamiliar PlainTab modules, callers, data ownership, and constraints before editing.

These files should be committed to git so Codex and other agents can use the project immediately after checkout.

## Third-Party Adaptations

Some engineering skills are adapted from Matt Pocock's `mattpocock/skills` project. See `THIRD_PARTY_NOTICES.md` for the MIT license notice.
