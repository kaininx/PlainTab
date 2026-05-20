---
name: improve-codebase-architecture
description: Use when reviewing PlainTab architecture, looking for refactoring opportunities, reducing coupling, improving testability, or making modules easier for agents to understand without redesigning stable behavior.
---

# Improve PlainTab Architecture

Use this skill for architecture review, not routine feature work. Adapted for PlainTab from Matt Pocock's `improve-codebase-architecture` skill.

## Scope Guard

PlainTab values minimal, stable changes. Do not propose a rewrite. Do not change code during the review unless the user asks for implementation.

Respect:

- `.claude/rules/00-core.md`
- The relevant module rule under `.claude/rules/`
- Startup invariants in `index.html`
- Storage ownership in `js/wallpaper/data.js`
- The no-build-tools/no-frameworks constraint

## Vocabulary

- Module: a file or cohesive runtime area with an interface and implementation.
- Interface: everything callers must know to use the module, including ordering, config shape, errors, and side effects.
- Implementation: the code hidden behind that interface.
- Depth: how much behavior is hidden behind a small interface.
- Seam: a place behavior can change without editing every caller.
- Locality: how concentrated the knowledge, bug surface, and change surface are.

## Review Process

1. Pick one area, such as wallpaper sources, settings panel, storage migration, command palette, search, i18n, or startup.
2. Read the module rule and the current files.
3. Follow callers enough to understand who depends on the interface.
4. Look for friction:
   - Understanding one concept requires bouncing through many files.
   - Callers must know too much ordering or storage detail.
   - A module is mostly pass-through and does not buy locality.
   - Two similar flows duplicate subtle behavior.
   - The real behavior is hard to verify through an existing interface.
5. Apply the deletion test: if deleting the module only moves the same complexity to callers, it is shallow; if deleting it spreads hidden complexity across callers, it is earning its keep.

## Output

Present 2 to 5 candidates. For each:

- Files involved.
- Current friction.
- Proposed direction.
- Benefit in terms of locality, depth, and testability.
- Risk to startup, storage compatibility, wallpaper visibility, or UI quietness.
- Recommendation strength: `Strong`, `Worth exploring`, or `Speculative`.

End with the one candidate to tackle first and the smallest safe first step. If the review contradicts an existing project rule, call that out directly instead of burying it.

