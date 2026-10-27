# KAYAD Phase 16B — Change ledger (vs the 16A archive; 10 source files changed, 0 removed)
| File | Change | Why |
|---|---|---|
| backend/services/ownerMfa.service.js | CAS charge-before-evaluate failure counter | lockout race |
| backend/models/_base.js | chainable `findByIdAndUpdate` (`_updateByIdExec` holds the old body) | `.lean()` chains threw |
| backend/db/index.js | `applyOrdering` accepts object sorts | `s.replace` TypeError |
| backend/middleware/errorHandler.js | 22P02→400, PGRST116→404 when unassigned; financial-path guard; `dbCode` in log | dead classification |
| backend/services/communicationControl.service.js | `AppError` 400/404, generic messages | plain Error→500, input echo |
| backend/controllers/{cmsController,automationController,configurationController,lowCodeController}.js | input validation guards → 400 | TypeError→500 |
| src/pages/dealer/DealerOnboarding.jsx | button text colour #0a3340 → #ffffff (2 lines) | WCAG contrast |
| backend/tests/regression/phase16bRouteExceptions.test.js, phase16bMfaAttemptCharging.test.js | new | regression |
| runbooks/phase16b-20261027/** | candidate migration, rollback, PG rehearsal, 2 HTTP/browser suites | blockers + evidence |
| KAYAD_PHASE16B_*.md/.csv, validation-logs/phase16b/** | reports and logs | deliverables |

**Not changed (hash-compared against the extracted 16A archive):** every payment, M-Pesa, escrow, refund, settlement, forfeiture, ledger, wallet and auction file; all routes and route guards; `ownerRoutes.js`, `ownerGovernance.service.js`, `config/owners.js`, `utils/totp.js`, `utils/stepUp.js`; all migrations under `supabase/`. No existing test assertion was edited. Runtime-rewritten `e2e_*_results.json` files at the archive root were restored to their 16A content.
