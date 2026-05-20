---
name: tdd
description: Use when implementing PlainTab features or bug fixes with test-first development, red-green-refactor, regression scripts, browser checks, or behavior-focused validation before production code changes.
---

# PlainTab TDD

Use this skill when changing runtime behavior. Adapted for PlainTab from Matt Pocock's `tdd` skill.

## Philosophy

Tests should describe observable behavior through the public interface, not internal structure. In PlainTab, the public interface might be a runtime module API, a settings interaction, a stored config shape, a wallpaper source lifecycle, or the rendered new-tab page.

PlainTab has no package manager or test framework. Do not add one. Use focused Node scripts, browser automation, and existing validation commands.

## Before Code

1. Read `.claude/rules/00-core.md` and the relevant module rule.
2. Identify the behavior to lock down in user-facing language.
3. Choose the smallest useful feedback loop:
   - Node script in `docs/ai-tasks/` for pure JS behavior.
   - Browser/Playwright check for DOM, settings, command palette, or wallpaper rendering.
   - Manual web-mode check only when automation is not practical.
4. Name the check after behavior, not implementation.

## Red-Green Loop

Work one vertical slice at a time:

1. RED: write one failing check for one behavior.
2. Verify RED: run it and confirm it fails for the expected reason.
3. GREEN: write the smallest production change to pass.
4. Verify GREEN: run the check again.
5. Repeat for the next behavior.

Do not write a batch of tests and then a batch of implementation. Do not refactor while RED.

## PlainTab Test Shape

Good checks:

- Exercise real modules and real serialized config shapes.
- Preserve existing localStorage keys unless the task includes a migration.
- Cover extension/web-mode differences when the behavior depends on browser APIs.
- Assert visible wallpaper safety when touching image layers: at least one layer should remain visible.
- Assert language key completeness when adding UI copy.

Avoid:

- Adding npm, package.json, lint frameworks, test frameworks, or frontend frameworks.
- Tests that only assert private helper names or DOM implementation details unrelated to behavior.
- Long startup work in repro code that would never exist in the real first-paint path.

## Validation

Use the narrowest meaningful command, then broaden when the change is shared:

```powershell
Get-ChildItem -Recurse js -Include *.js | ForEach-Object { node --check $_.FullName }
```

For i18n changes, use the `update-i18n` skill. For visual or interaction changes, verify in a real browser whenever practical.

