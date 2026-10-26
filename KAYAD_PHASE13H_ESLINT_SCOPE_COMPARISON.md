# KAYAD Phase 13H — ESLint Scope Comparison

ESLint 9.39.5; `eslint.config.js` and ignore configuration unchanged (no rule disabled, no ignore added). Commands: `npx eslint src` and `npx eslint .` (JSON output compared with `runbooks/phase13g-20261026/lint/eslint-compare.mjs`; new = file + rule + first message line absent from the baseline).

| scope | 13F | 13G | **13H** | exit | new vs 13G |
|---|---|---|---|---|---|
| `eslint src` | 5 errors / 1557 warnings | 0 / 1557 | **0 / 1557** | 0 | 0 |
| `eslint .` | 2255 / 1557 | 2250 / 1557 | **2250 / 1557** | 1 | 0 |

Why they differ: `src` lints only the application source; `.` also lints Node scripts, runbooks and harnesses (2071 of the errors are `no-undef` for Node globals in those files). The backend directory is excluded by the existing configuration in both scopes, so backend files changed in 13H are not linted by either command.

One new-violation was introduced and fixed during 13H (unused `catch` binding in a new probe script); the final comparison shows 0 new. The repository-wide backlog (2250 errors under `.`, 1557 warnings) is unchanged and not hidden: addressing it needs a scoped Node-environment override, which is a policy decision.
