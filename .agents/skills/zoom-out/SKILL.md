---
name: zoom-out
description: Use when an agent or user is unfamiliar with a PlainTab module, needs a higher-level map of related files and callers, or asks how a section fits into startup, wallpaper, settings, search, command palette, storage, or i18n flows.
---

# Zoom Out PlainTab

Use this skill before editing an unfamiliar area.

## Map The Area

1. Read `.claude/rules/00-core.md`.
2. Use `.claude/rules/README.md` to find the relevant module rule.
3. Inspect the files directly involved and their callers.
4. Explain the area one layer up:
   - Runtime role.
   - Main files.
   - Data it owns.
   - Public functions or DOM contracts.
   - Startup, storage, wallpaper, i18n, or extension/web-mode constraints.
   - Validation commands that matter for this area.

Keep the answer practical. The goal is to help the next edit land in the right place with the smallest safe change.

