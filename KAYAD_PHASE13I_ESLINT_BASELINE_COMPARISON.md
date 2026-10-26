# KAYAD Phase 13I — ESLint Baseline Comparison

ESLint 9.39.5; `eslint.config.js` and ignore configuration **unchanged** (no rule disabled, nothing added to ignores). The `backend/` tree is outside both scopes by the existing configuration. Baseline = the final 13H JSON (`validation-logs/phase13h/eslint/final-13H-*.json`); final = this phase's frozen-tree run (`validation-logs/phase13i/eslint/final-*.json`, comparison output `compare-src.txt` / `compare-all.txt`, tool `runbooks/phase13g-20261026/lint/eslint-compare.mjs`).

| scope | 13H baseline | **13I final** | exit | new violations |
|---|---|---|---|---|
| `npx eslint src` | 0 errors / 1557 warnings | **0 / 1557** | 0 | **0** |
| `npx eslint .` | 2250 errors / 1557 warnings | **2250 / 1557** | 1 (pre-existing backlog) | **0** |

New files in the lint scope: every 13I runbook harness and script (`runbooks/phase13i-20261026/**`, which `eslint .` covers) and the 13I test files are lint-clean (an unused `catch` binding, unused variables and an unused eslint-disable were removed during development). No file got a new warning. The repository-wide backlog (2071 `no-undef` for Node globals in scripts/runbooks, 542 `no-explicit-any`, 463 `no-unused-vars`, 159 `set-state-in-effect`, …) is unchanged and is **not** fixed in this phase; `AdminPrivateSellerApplications.tsx:59` carries one pre-existing `set-state-in-effect` warning that predates 13I.
