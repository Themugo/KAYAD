# KAYAD Phase 16B — Package integrity

- Foundation archive: `KAYAD-PHASE16A-PRIMARY-OWNER-SECOND-OWNER-TEST-DEALER-PRESERVATION-20261026.zip`
  - **Actual SHA-256 computed here:** `2a6a433175c91fa89c11de646e4eba27ce4b3a6403b90fbe2e5ddefdd135aa0f`
  - No sidecar was supplied with the upload, so the hash could not be compared to a declared value. **Compare it with the hash you hold for that archive.**
  - It was extracted unchanged into a separate directory and used as the diff baseline; the Phase 15/16/16A archives are untouched.
- This archive's SHA-256 is in the sidecar `…20261027.zip.sha256` delivered next to the ZIP (a hash cannot be stored inside the file it describes).
- `KAYAD_PHASE16B_SOURCE_MANIFEST.sha256`: SHA-256 of every file in the package except `node_modules/`, `dist/`, itself and this file. Verify from the package root: `sha256sum -c KAYAD_PHASE16B_SOURCE_MANIFEST.sha256`.
- Excluded on purpose: `node_modules/` (reinstall with `npm ci` in the root and in `backend/`), `dist/` (rebuild with `npm run build`), any real `.env` (none present).
- Changed vs the 16A package: 10 source files, 0 removed — see `KAYAD_PHASE16B_CHANGE_LEDGER.md`.
- A clean re-extract of the final ZIP was verified (manifest, selected tests); the result is in the integrity log delivered next to the ZIP.
