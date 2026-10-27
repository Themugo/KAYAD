# Phase 14.8 - Foundation and baseline
- Foundation: KAYAD-PHASE14.7-DEALER-BUSINESS-READINESS-ONBOARDING-CONVERGENCE-20261026.zip
- SHA-256 ecd2210dc5be4d8385402932e1778e2b5a92810100ca3012489b03b0b18ec23a - matched the sidecar and the value in the phase prompt. `unzip -t` clean; manifest verified. Extracted to an isolated workspace; the 14.7 archive was not modified.
- Baselines on the pristine 14.7 tree (before any edit): tsc 0; build 0; Vitest 943 passed + 1 skipped (114 files); backend Jest 167 suites / 2,956 tests; backend Vitest 36; node:test 1; eslint src 0 errors / 1,565 warnings; eslint . 2,286 errors (pre-existing legacy debt); validators 139/143 passing (failing: communications:providers, live-runtime, stage24-theme-convergence, stage5f7-private-auction-contract).
