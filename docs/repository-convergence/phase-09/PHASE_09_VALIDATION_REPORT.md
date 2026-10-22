# Validation Report

| Check | Result | Evidence |
|---|---|---|
| Foundation SHA-256 | PASS | Expected and observed `f189acf74113e833f38196dbecec75bdb47156ed246e3c9ffd833ad226380688` |
| Foundation sidecar | PASS | Exact filename and hash match |
| Input ZIP integrity | PASS | 6,857 entries; `testzip()` returned `None` |
| Phase 8 evidence presence | PASS | 18/18 expected records present |
| Phase 8 count reconciliation | PASS WITH NOTE | Earlier ledger says 6,838; actual archive has 6,857; discrepancy documented |
| Candidate coverage | PASS | All 7 candidates individually represented |
| Test matrix comparison | PASS WITH BLOCKER | Both files differ and both were preserved |
| Owner approval verification | BLOCKED | No qualifying candidate-specific approval in supplied archive |
| Relocation/reference edits | SKIPPED | Zero moves and zero reference edits |
| CSV syntax and row widths | PASS | 11 CSV files parsed with consistent row widths before final manifest refresh |
| Final ZIP integrity | PASS | `testzip()` returned `None`; 6878 entries (6391 files, 487 directories) |
| Original entry preservation | PASS | All 6857 original entries present; 6371 original file payload hashes matched |
| Application/build/runtime checks | NOT RUN | No application source changed; outside scope |
