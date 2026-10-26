# KAYAD Phase 13H — Source Manifest and Verification

`KAYAD_PHASE13H_PACKAGE_MANIFEST.txt` lists the SHA-256 and path of every file in the archive except itself (format of `sha256sum`). It was generated from the final tree after all tests and cleanup.

Verification procedure (executed after packaging; results are in the separate files delivered with the ZIP: `KAYAD-PHASE13H-ZIP-INTEGRITY.txt` and `KAYAD-PHASE13H-MANIFEST-VERIFY.txt`):
1. `unzip -t` the archive.
2. `sha256sum` the archive and write the `.sha256` sidecar.
3. Extract into a clean empty directory.
4. `sha256sum -c KAYAD_PHASE13H_PACKAGE_MANIFEST.txt` — every file must be `OK`; file count of the extraction must equal the manifest count.
5. Confirm no `node_modules`, `dist`, `.env` (only `*.example`) or secret in the archive.

Tested-state statement: application source in the archive is the state the 13H suites ran against, with these later non-application edits (all re-verified): the super-admin navigation validator (re-run 12/12), the throwaway-secret removal in two harness scripts (re-run 103/103 and 83/83), lint-only changes in two owner/probe scripts (lint compare: 0 new violations). `backend/data/uploads.*` were restored byte-identical to the 13G foundation after tests mutated them.
