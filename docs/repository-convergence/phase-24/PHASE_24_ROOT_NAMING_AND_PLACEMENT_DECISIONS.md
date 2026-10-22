# Root Naming and Placement Decisions

## Summary
- Phase 23 baseline root files: 56
- Phase 24 root files after moves: 50
- Root directories retained: 19
- Root files individually classified: 50
- No root file was deleted.

## Retained by design
The remaining root includes conventional package/tooling configuration, lockfiles, application entrypoint, environment examples, Docker/deployment configuration, repository-level documentation, local startup/setup helpers and release metadata. These are not moved merely because they are non-source files.

## Changes
- `load-test.js` → `load-tests/legacy-api-load-test.js`; load-test functionality now sits beside the existing `load-tests/` suite.
- Five historical preview assets moved to `evidence/legacy-visual-assets/` after visual inspection and local active-reference scanning.

## Blocked / retained
- `metadata.json` remains at root because it looks like Replit/app metadata but no active local reference was found. Confirm its platform/owner role before relocation.
- Root launcher scripts remain because they are local developer entrypoints; `start-all.bat` and `start-frontend.bat` are referenced by `scripts/validate-startup-convergence.mjs`.
- Deployment and proxy configuration remains at root because toolchain/deployment consumers may expect it.
- External consumers of the five moved visual assets could not be checked. Their original filenames and bytes are preserved in the evidence directory.

## Naming standard going forward
- Maintained tooling: task-oriented names grouped under existing responsibility directories.
- Historical evidence: preserve original phase/stage names and place in the existing evidence/history hierarchy.
- Active project-root files: keep conventional names required by tools and developers.
- Do not mass-rename phase-labelled validation scripts without inspecting package scripts, workflows and script payloads.
