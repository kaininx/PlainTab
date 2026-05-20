---
name: diagnose
description: Use when diagnosing PlainTab bugs, broken UI behavior, failing extension/web-mode flows, storage or wallpaper regressions, startup issues, or performance regressions.
---

# Diagnose PlainTab

Use this skill for bug reports and performance regressions. Adapted for PlainTab from Matt Pocock's `diagnose` skill.

## Core Rule

Build a feedback loop first. Do not guess at fixes until the symptom can be reproduced or measured well enough to prove the fix.

## PlainTab Context

1. Read `.claude/rules/00-core.md` and the relevant module rule from `.claude/rules/README.md`.
2. Preserve the startup invariant in `index.html`: `#wallpaperBack`, synchronous `js/preload.js`, `#wallpaperFront`, then the rest of the page.
3. Keep storage access behind `window.WallpaperData` and preserve localStorage compatibility unless a migration exists.
4. Use `docs/ai-tasks/` for temporary repro scripts or notes that should remain with the task.

## Build the Loop

Prefer the fastest deterministic signal that reaches the real symptom:

1. A small Node repro script in `docs/ai-tasks/` for pure JavaScript, storage migration, parser, or data-shaping bugs.
2. `node --check` on touched files or the whole `js` tree for syntax regressions.
3. A browser/Playwright script for DOM, settings panel, command palette, wallpaper rendering, or extension/web-mode behavior.
4. A direct `index.html` web-mode run when extension APIs are not required.
5. A measured timing harness using `performance.now()` for startup or wallpaper performance regressions.
6. A manually assisted loop only as a last resort; write exact steps, expected result, actual result, and screenshots/logs when available.

If no loop is possible, stop and say what was tried. Ask for the missing artifact: console log, screen recording, settings export, uploaded media sample, HAR, or permission to add temporary instrumentation.

## Diagnose

1. Reproduce the user-visible symptom, not a nearby error.
2. Capture the exact failure: console message, wrong DOM state, storage value, timing, image layer state, or user-facing result.
3. Generate 3 to 5 ranked hypotheses. Each must predict what will change if it is true.
4. Probe one hypothesis at a time. Use targeted logs or assertions at module boundaries.
5. Prefix temporary logs with a unique tag such as `[DEBUG-9f3a]` so cleanup is reliable.

For performance regressions, measure before fixing. Avoid broad logging in startup paths; it can change the timing you are trying to understand.

## Fix

1. Turn the minimized repro into a regression check before changing production code when there is a correct seam.
2. If there is no correct seam, document that as part of the finding and keep the fix small.
3. Apply the smallest fix that addresses the confirmed cause.
4. Re-run the minimized repro and the original scenario.

## Cleanup

Before finishing:

- Re-run the original feedback loop.
- Run validation appropriate to touched files.
- Remove all temporary `[DEBUG-...]` instrumentation.
- Keep useful task repro scripts under `docs/ai-tasks/`; delete throwaway scratch files.
- State the confirmed cause in the final answer or commit message.
