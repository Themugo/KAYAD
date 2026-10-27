# Naming and Path Compliance Report
Validator: `scripts/validate-repository-naming-and-paths.mjs` (`npm run validate:repository-naming`), result 9/9 PASS against the 14.4 foundation.
* No Windows-illegal or reserved names, no path over 200 characters (longest checked), no symlinks, no case-insensitive duplicates.
* No phase-numbered or temporary application source directories (`src/`, `backend/`). Phase identifiers appear only in `evidence/`, `runbooks/` and report names, following the repository's existing convention.
* Added files avoid temporary/ambiguous names; no duplicate implementations (no parallel settings/profile/API files; existing `DealerSettingsPanel.tsx`, `DealerTeamPanel.tsx`, `dealerPlatformController.js` were corrected in place).
* All relative imports in added/modified source resolve.
* Change inventory vs 14.4 foundation: 6 modified, 457 added, 434 removed(=renamed). The 434 are validation logs whose names contained `:` (illegal on Windows), renamed to `_`; list in `evidence/phase14-5-20261026/logs/renamed_files.txt`. Historical manifests from earlier phases still list the old colon names (they are records of those releases and were not rewritten).
* Evidence lives in one directory: `evidence/phase14-5-20261026/{reports,logs,screenshots}`; earlier-phase evidence folders were left as they were.
* Exact paths of every change: `03_CHANGE_LEDGER.csv`. Source manifest: `KAYAD_PHASE14_5_SOURCE_MANIFEST.sha256` (verified by the validator's manifest check on the extracted archive).
