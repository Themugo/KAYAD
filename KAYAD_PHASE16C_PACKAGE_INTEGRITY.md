# KAYAD Phase 16C — package integrity

* Foundation: Phase 16B archive SHA-256 `7f97ebe5acb00fc0313f1272cd465638c64e7fca9eb0ee96e5f64f326985d9e3` (unchanged; see source & claims verification).
* This archive's own SHA-256, size and the post-extract check results are in the sidecar files delivered beside it (`….zip.sha256`, `….integrity.log`); a file cannot contain its own archive hash.
* `KAYAD_PHASE16C_SOURCE_MANIFEST.sha256` lists every file except `node_modules/`, `dist/`, itself and this document. Verify: `sha256sum -c KAYAD_PHASE16C_SOURCE_MANIFEST.sha256`.
* Excluded: `node_modules/`, `dist/`, any real `.env` (none present). No secret, key or provider credential is included; the MFA test key used locally is not shipped.
