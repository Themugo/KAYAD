# KAYAD Phase 13I — Source Manifest and Verification Method

- `KAYAD_PHASE13I_PACKAGE_MANIFEST.txt` lists the SHA-256 of **every file in the package** (excluding itself, `node_modules/`, `dist/`, `.git/`) in `sha256sum -c` format, paths relative to the project root.
- The manifest was generated from the final tree **after** the certification run, the data-file restoration and the last report edit, so it describes exactly the tested source (source files tested = source files packaged: the 15 modified source/test files in `KAYAD_PHASE13I_FILE_CHANGE_LEDGER.csv` were not edited after `validation-logs/phase13i/cert/` was produced).
- Verification procedure (also run on a clean re-extraction of the final ZIP; results delivered beside the ZIP as `KAYAD-PHASE13I-MANIFEST-VERIFY.txt` and `KAYAD-PHASE13I-ZIP-INTEGRITY.txt`, because a file cannot contain the hash of the archive that contains it):
  1. `sha256sum -c KAYAD_PHASE13I_PACKAGE_MANIFEST.txt` in the extracted root → every line OK.
  2. Extracted file count (excluding the manifest) equals the manifest entry count.
  3. The ZIP's own SHA-256 matches `KAYAD-PHASE13I-UNIFIED-PERSONAL-ACCOUNT-COMPLETION-20261026.zip.sha256`; `unzip -t` reports no errors.
  4. Source-vs-tested check: the SHA-256 of each file listed as modified in the ledger equals the SHA-256 recorded in the ledger and in the manifest.
- Runtime-mutated files (`backend/data/uploads.json`, `uploads.sqlite`, `backend/uploads/*car.png`) were restored byte-identical to the verified 13H tree before packaging.
- Exclusions: `node_modules/`, `dist/`, `.git/`, real `.env` files, credentials/secrets (scanned: none present), production data and dumps (none), temporary files. `.env.example` files are included.
