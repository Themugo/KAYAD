# Test Certification — only executed tests are listed (2026-11-17)

Environment: Node 22.23.x, sandbox, disposable Postgres 16 (Supabase stubs), Playwright Chromium against `vite preview` with `/api/**` stubbed. Not a live-backend run.

| Check | Result | Detail |
|---|---|---|
| TypeScript `tsc --noEmit` | PASS | 0 errors |
| ESLint `src` | PASS | 0 errors, 1,848 warnings (pre-existing class) |
| Frontend vitest | PASS | 198 files, 1,646 passed, 1 skipped |
| Backend jest (13 sequential chunks) | PASS | 4,107 passed, 21 skipped (run before the final frontend-only edits; no backend file changed afterwards) |
| Backend vitest / node:test | PASS | earlier run, same backend state |
| `vite build` | PASS | |
| Validators (341) | 313 PASS / 28 FAIL | all 28 also fail on the supplied baseline (network, credentials, Docker, live runtime); none new. Includes the four named baseline admin validators |
| Migration replay, fresh DB | 200 of 202 apply | 2 fail on Supabase-only platform function `rls_auto_enable` (pre-existing); new migration applies |
| Lifecycle DB assertions | PASS | 58/58 in one rolled-back transaction |
| Lifecycle concurrency races | PASS | 5 hide/hide, 3 hide/mark_sold, repeated 4× clean. Note: an earlier assertion wrongly required a single winner; hide-then-sell serialising (2 audit rows, final=sold) is valid and now accepted |
| Mobile navigation certification | PASS | 91/91 |
| Width sweep | PASS | 126 loads, 18 widths, 0 issues |
| Page audit | PASS | 230 loads, 0 issues |
| Accessibility (axe + keyboard) | PASS | 26 screens 0 violation groups; keyboard 10/0 failing |
| Dock clearance | PASS | 64 pages |
| Dealer state audit | PASS | |
| Hero audit | PASS | 162 loads 0 issues, 0 behaviour failures (after fixes above) |
| Real devices, live backend, Supabase production, M-Pesa, Brevo, GitHub CI | BLOCKED | not reachable from the sandbox |
| Coverage of production-like load / pen test | NOT APPLICABLE / not run | |
