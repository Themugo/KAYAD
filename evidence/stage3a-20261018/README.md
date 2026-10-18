# Evidence — Stage 3A, 2026-10-18

The runtime was Node v22.22.2 / npm 10.9.4 in a local container with an empty environment: no DB, no providers, no secrets.

- `base_pristine_be_jest.log.txt` — the full backend Jest run on the untouched Stage 2 baseline: 1403/1403.
- `baseline_detect_stage3a.log.txt` — the new Stage 3A tests run against that baseline: 17 fail, 3 controls pass.
- `work_*` — the work-tree verification: tsc, frontend Vitest, build, backend Jest/Vitest/node.
- `work_validators.tsv` + `validator-logs-work/` — the validator sweep.
- The certification of the delivered ZIP (from an independent extraction) lives OUTSIDE the ZIP, in `KAYAD-STAGE3A-FULL-PROJECT-20261018.certification.txt`.
