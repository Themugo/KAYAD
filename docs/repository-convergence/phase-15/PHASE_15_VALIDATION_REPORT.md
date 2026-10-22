# Phase 15 Validation Report

- Phase 14 SHA-256: PASS — `fec6b81b97b815ad2922d8dcd21f404aa1f5d8b3c33888e371a5f79016b51430`
- Phase 14 sidecar agreement: PASS
- Phase 14 source ZIP integrity: PASS
- Phase 14 archive entries: 7,001; files 6,508; directory entries 493
- Phase 14 manifest rows: 6,507; verified 6,507; missing 0; mismatched 0
- Phase 14 root files: 439; immediate directories: 23
- Phase 12 SHA-256: PASS — `5b60f88681eef57dfb70775535aa25917d7045adc560d45fca2a9ebe4933e302`
- Phase 12 sidecar agreement: PASS
- Phase 12 ZIP integrity: PASS
- Phase 12 size: 84,114,539 bytes; entries 6945; files 6457; directory entries 488
- Phase 13 digest distinction: `d2cdbf4eae9caefbc0be9e872ae768c757c35c0dc67db32eaa95c810a1a617cf` is the Phase 13 archive digest, not Phase 12
- Historical checksum conclusion: `RESOLVED_WRONG_ARTIFACT_REFERENCE`
- Targeted consumer checks: 9 candidates; static text search only
- Structural operations: 0
- Application tests/build/runtime/database/payment/deployment: NOT RUN
- External CI/hosting settings: NOT VERIFIED

Final checkpoint ZIP integrity and sidecar are independently verified after creation. The checkpoint manifest excludes itself under a documented non-recursive policy.
