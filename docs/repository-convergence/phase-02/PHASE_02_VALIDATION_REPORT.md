# Phase 2 Validation Report

| Check | Result | Evidence |
|---|---|---|
| Foundation SHA-256 | PASS | `efc0415936afd57829b60221b4050cc50e2c0a7549a0a12e1ff4f7e737107a61` equals expected hash |
| Foundation ZIP integrity | PASS | `ZipFile.testzip()` returned `None` |
| Phase 1 CSV parsing | PASS WITH LIMITATIONS | 9 CSV files parsed |
| Static import graph generated | PASS WITH LIMITATIONS | 6655 edges; heuristic resolution |
| Script register generated | PASS WITH LIMITATIONS | 186 script rows; none executed |
| Infrastructure/test registers generated | PASS WITH LIMITATIONS | 831 infrastructure rows; 2061 test candidates |
| Relocation risk coverage | PASS WITH LIMITATIONS | 6232 file rows assessed; classifications are conservative heuristics |
| Source/configuration mutation | NOT DETECTED BY WORKFLOW | Foundation extracted and reports added; source hashes checked against extracted baseline snapshot |
| Build/typecheck/tests | NOT RUN | Dependencies/runtime certification outside this read-only phase |
| Production/database/deployment | NOT TOUCHED | No external calls or mutations |

**Overall:** PASS WITH DOCUMENTED LIMITATIONS. This is not application runtime certification.


## Additional integrity checks

- Original archive entries compared by path/content hash: 6,232.
- Missing original entries: 0.
- Content-hash mismatches for original entries: 0.
- Generated CSV files parseable with consistent row widths: 14/14.
- CSV row counts: PHASE_02_PATH_ALIAS_REGISTER.csv=2, PHASE_02_CURRENT_TO_PROPOSED_PATH_MAP.csv=6232, PHASE_02_FILE_RELOCATION_RISK_REGISTER.csv=6232, PHASE_02_CHECKPOINT_MANIFEST.csv=6257, PHASE_02_CIRCULAR_AND_HIGH_COUPLING_CANDIDATES.csv=120, PHASE_02_FILE_OWNERSHIP_UNCERTAINTIES.csv=2618, PHASE_02_IMPORT_DEPENDENCY_GRAPH.csv=6655, PHASE_02_SCRIPT_COMMAND_GRAPH.csv=161, PHASE_02_TEST_DEPENDENCY_GRAPH.csv=2061, PHASE_02_CHANGE_LEDGER.csv=1, PHASE_02_PACKAGE_SCRIPT_REGISTER.csv=186, PHASE_02_DUPLICATE_GROUP_REFERENCE_ANALYSIS.csv=1596, PHASE_02_DEPLOYMENT_PATH_REFERENCE_GRAPH.csv=831, PHASE_02_RUNTIME_ENTRY_POINT_REGISTER.csv=259
