# Evidence — Stage 2 entry corrections, 2026-10-18

The runtime was Node v22.22.2 / npm 10.9.4 in a local container with an empty environment: no DB, no providers, no secrets.

- `zip_file_sha256.txt` — SHA-256 of every file in the foundation ZIP (6dc8d83f…). `prior_worktree_sha256.txt` — the previous session's tree, which is byte-identical.
- `base_*` — the baseline run. `base_pristine_be_jest.log.txt` is backend Jest on an untouched worktree. `final_*` is the final run, and `mid_be_jest.log.txt` is the run after the fixes and before the new tests.
- `baseline_detect_stage2.log.txt` — the new tests run against the unmodified baseline. They fail as expected, which proves they detect the defects.
- `final_validators.tsv` + `validator-logs/` — results for every `scripts/validate-*.mjs`.
- `e2e_chromium.log.txt` — the Playwright run (Chromium; backend-free set as selected by the project config).
- `npm_audit_*.json` — read-only `npm audit` output. `_backend_prod` is `--omit=dev`.
- `eslint_src.log.txt` — `npx eslint src`.
- `changed_files_manifest.tsv` — baseline and final SHA-256 for each changed or new source/test file.
- Logs use `.log.txt` because the repository ignores `*.log`.
