# KAYAD Phase 13G — ESLint Baseline Comparison (Defect D)

ESLint 9.39.5, flat config `eslint.config.js` unchanged (no rule disabled, no ignore added).

## Why earlier numbers disagreed
| source | command / scope | errors | warnings |
|---|---|---|---|
| 13D/13E | `npx eslint src` (backend ignored; no scripts/runbooks) | 5 | 1556–1557 |
| 13F | `npx eslint .` (adds node scripts, runbooks, tests dirs; 2071 `no-undef`) | 2255 | 1557 |

Same code, different scope. Reproduced here on the unmodified 13F tree: `src` = 5 / 1557, `.` = 2255 / 1557 (`validation-logs/phase13g/eslint/baseline-13F-*.json`).

## Final (13G tree)
| scope | errors | warnings | exit | new violations vs baseline | resolved |
|---|---|---|---|---|---|
| `eslint src` | **0** (was 5) | 1557 (was 1557) | 0 | 0 | 4 (+1 file-level reclass) |
| `eslint .` | 2250 (was 2255) | 1557 (was 1557) | 1 | 0 | 4 |

New-violation test: file + rule + first message line absent from the baseline (`runbooks/phase13g-20261026/lint/eslint-compare.mjs`, outputs `compare-src.txt`, `compare-all.txt`). The new 13G files introduce no violation.

## Errors fixed (real, 5 in `src`)
no-useless-escape ×2, react-hooks/use-memo, react-refresh/only-export-components, react-hooks/globals — in VehicleMarketplace.tsx, CMSContext.tsx, orgUi.tsx, AuthSessionStates.test.tsx. Behaviour preserved (frontend vitest 852 pass).

## Rule deltas (all scope `.`)
| rule | baseline | final | delta |
|---|---|---|---|
| no-useless-escape [error] | 73 | 71 | -2 |
| react-hooks/use-memo [error] | 1 | 0 | -1 |
| react-refresh/only-export-components [error] | 1 | 0 | -1 |
| react-hooks/globals [error] | 1 | 0 | -1 |

## Remaining backlog (not addressed, quantified)
- `eslint .`: 2250 errors, of which 2071 `no-undef` (Node globals in scripts/runbooks lacking a node env override), 95 `no-unused-vars`, 71 `no-useless-escape`, 8 `no-empty`. Fixing them needs a scoped config override — a policy decision, left open per the "no broad ignores" rule.
- `src` warnings: 1557 (542 no-explicit-any, 463 no-unused-vars, 159 set-state-in-effect, …).
