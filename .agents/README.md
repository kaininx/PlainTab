# Agent Skills

This directory contains the canonical shared skills for PlainTab.

## Ownership

- `.agents/skills/` is the source of truth for reusable project skills.
- `.claude/skills/` contains thin Claude Code adapters only.
- If a workflow changes, edit `.agents/skills/<skill>/SKILL.md` first.
- Keep adapters short and point them back to the canonical skill.

## Current Skills

- `bump-version`: updates the PlainTab version across manifest, README badges, changelogs, store listings, release notes, and project docs.
- `commit-changes`: prepares clean Chinese Conventional Commits while preserving unrelated working tree changes.
- `update-i18n`: maintains runtime UI translation keys, `js/i18n/*.js` language packs, and related validation.

These files should be committed to git so Codex and other agents can use the project immediately after checkout.
