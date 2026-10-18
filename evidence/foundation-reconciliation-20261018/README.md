# Evidence — foundation reconciliation 2026-10-18

The runtime for all runs was Node v22.22.2 / npm 10.9.4 in a local container with an empty environment (no DB, no providers, no secrets).

- `baseline_file_sha256.txt` — SHA-256 of every file in the foundation archive (d1fb0497…dd52) before any edit.
- Logs use the `.log.txt` extension because the repository ignores `*.log`. `base_*` — results on the unmodified baseline. `final_*` — results after the Stage 1 corrections. `mid_be_jest.log.txt` — run immediately after the fixes, before the new tests were added.
- `base_validators.tsv` / `final_validators.tsv` — exit code for each `scripts/validate-*.mjs`. `validator-logs/vlog_*` and `validator-logs/fvlog_*` hold their outputs. `validator_risky.txt` lists the scripts excluded for network or write risk.
- `baseline_detect_*.log` — the new Stage 1 regression tests run against the unmodified baseline, failing as expected and proving they detect the defects.
- `npm_ci_*.log` — dependency installation from the committed lockfiles.
