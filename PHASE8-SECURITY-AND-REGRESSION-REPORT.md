# KAYAD Phase 8 — Security and Regression Report

## Access controls
- Existing staff governance routes retain `authorize("superadmin")` plus `systemOwnerOnly`.
- Existing frontend System Owner checks remain.
- CMS calendar now restricts unpublished scheduling metadata to the existing CMS authoring roles. This is a narrower server-side read boundary, not a new permission system.
- Existing role catalog and role-update semantics remain; only the UI's create choices are aligned with the current create endpoint.
- No database schema, migration, token, secret or production data was changed.

## Regression evidence
- Existing navigation, hero, dashboard foundation, gap closure, right-panel and Phase 7 static validators passed.
- Extended staff governance static validator passed 16/16.
- New Phase 8 source-contract validator passed 12/12.
- Syntax parser passed for the four changed JSX files; `node --check` passed for changed backend/test/validator JavaScript files.

## Unverified runtime checks
- `npm ci` blocked by strict Node engine requirement.
- Unit tests, typecheck/lint, production build, backend/API integration, Playwright, accessibility and screenshots remain unverified.
- No browser evidence is available to support a claim of visual equivalence.

## Change scope
No public marketplace source file, route definition, database model or migration was modified. The new validator is under the existing `scripts/` directory; no new application path was introduced.
