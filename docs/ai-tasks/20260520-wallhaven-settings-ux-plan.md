# Wallhaven Settings UX Implementation Plan

Goal: make the Wallhaven settings drawer self-explanatory without adding a separate help panel.

Architecture: keep the existing `settingItem(label, desc, control)` pattern. Hard-code the Wallhaven category glyphs as `G`, `A`, and `P`, then add localized description keys for the controls whose effect is not obvious.

Files:
- `js/settings-panel.js`: Wallhaven category glyphs and description key usage.
- `css/settings.css`: compact category card styling for fixed glyphs and small explanatory text.
- `js/i18n/*.js`: localized description keys for all supported languages.
- `docs/ai-tasks/20260520-wallpaper-settings-redesign-test.js`: static regression checks for the Wallhaven settings UI contract.

Tasks:
- Add a failing static test for category glyphs and required hint keys.
- Update Wallhaven category rendering to use fixed glyphs and accessible labels.
- Add descriptions for search, categories, sorting, top range, resolution, ratio, color, refresh interval, and seed.
- Keep the existing work-order/test/apply state machine unchanged.
- Validate JS syntax, i18n completeness, the Wallhaven test script, and diff whitespace.
