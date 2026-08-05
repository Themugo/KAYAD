# KAYAD Audit — Changed Files Manifest

This zip contains all 74 files modified or created during the audit
session, with relative paths preserved for local application.

## Deleted file (not included, apply manually)
- `.eslintignore` — removed; its rules were merged into `eslint.config.js`'s
  `ignores` array. Delete this file locally after applying the zip.

## New file
- `src/utils/vehicleDefaults.ts`

## How to apply
Copy the contents of this zip over your local KAYAD checkout, preserving
directory structure (each file's path here matches its path in the repo
root), then delete `.eslintignore` per above.

## What changed
See the git commit message (e0799751) for the full breakdown — frontend
TypeScript/lint fixes (105 → 0 errors), a backend crash-bug fix, stale
MongoDB config removed from .env.example, and the test suite (15 → 0
failures). A git bundle with full history and this commit was also
provided separately if you'd rather pull via git.
