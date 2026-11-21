# Stage 5B closure — defect ledger

All defects were found by reading the implementation (audit), then reproduced by a failing test **before** the fix. Test file: `backend/tests/regression/stage5bClosureDefects.test.js` (13 tests, CL-1…CL-7). Before the fix (original 5B code): **11 failed / 2 passed**. After: **13 / 13 passed** (logs: `evidence/stage5b-20261019/closure/closure_defects_BEFORE_fix.log`, `…_AFTER_fix.log`).

| ID | Severity | Defect | Reproduction (test) | Files changed | After |
|---|---|---|---|---|---|
| CL-1 | **High** | A registry read that began before a revocation could complete after `invalidate()` and re-install the pre-revocation snapshot (revoked owner regains power for up to a TTL) | CL-1 race test: start slow read, revoke, resolve read → owner still listed | `services/ownerRegistry.service.js` (generation counter; stale-generation result discarded; `ensureFresh` loops) | fixed |
| CL-2 | **High** | After a local revocation, a DB error let the stale-grace window serve the **pre-revocation** snapshot | CL-2: revoke, make read fail → revoked owner still `isOwnerEmail` | same (`invalidate({taint})` zeroes `goodAt`; invitation-only changes pass `taint:false` and keep the grace) | fixed |
| CL-3 | **Critical** | After the store had been read, a PostgREST "function not found" (rollback, schema-cache error) flipped the registry to *legacy*, so the env list silently regained every removed owner | CL-3: seen store → PGRST202 → env address is owner | same (`seenInstalled`; unreadable ⇒ error mode, fail closed); `config/owners.js` | fixed; live proof gov_closure C6.2–C6.3 |
| CL-4 | Medium | `isOwnerUser` accepted objects without a user id, and did not re-check ban/deactivation/verification at request time | CL-4 | `config/owners.js` (id-strict; real-time ban/deactivated/unverified override) | fixed |
| CL-5 | Medium | Owner-account protection (`protectAccount`, report handling) used the privilege predicate, so it vanished in error mode | CL-5 | `config/owners.js` (`isOwnerAccountEmail`), `middleware/protectAccount.js`, `controllers/reportController.js` | fixed |
| CL-6 | **High** | Two alternate paths could create or verify an account on a reserved owner address with no mailbox proof: `POST /admin/staff`, and inspector-application approval (sets `emailVerified=true`) | CL-6 static guards + route logic | `routes/adminRoutes.js`, `controllers/inspectorApplicationController.js` (409) | fixed |
| CL-7a | Medium | Recovery was not resumable: if the invitation step failed after access was ended, a retry said "not a member" | CL-7, gov_closure C5 | `services/ownerGovernance.service.js` (`interruptedRecovery`, `OWNER_RECOVERY_INCOMPLETE`, `resumed`) | fixed |
| CL-7b | Low | `notifyOwners` and bootstrap auto-close read the registry through the `__testing` seam | CL-7 | `services/ownerGovernance.service.js` (`registry.currentOwners()`) | fixed |
| DOC-1 | Medium | Rollback plan claimed that dropping the functions re-enables legacy by itself (contradicts fail-closed; unsafe expectation) | review + C6 | `GATE_ROLLBACK_AND_RECOVERY_PLAN_5B.md`, runbook §4; new executable `…ROLLBACK_CANDIDATE.sql` | fixed |
| DOC-2 | Medium | Hosted prerequisites not part of the preflight; candidate would abort on a hosted DB without `users.deactivated_at` | upgrade rehearsal §B | preflight items 7–8, `HOSTED_SCHEMA_PREREQUISITES_5B.md` | fixed |
| MIG-1 | Low | No `NOTIFY pgrst, 'reload schema'` after creating functions | review | candidate (last statement), rollback | fixed |
| LINT-1 | Info | New `react-hooks/set-state-in-effect` warning in `AdminOwnerManagement.jsx`; unused variables in the journey harnesses | ESLint diff vs 5A | the three files | fixed (0 new findings) |

No unresolved reproducible defect remains in scope. Policy effects of CL-3…CL-7 are recorded as D9–D14 in `OWNER_DECISION_REGISTER_STAGE5B.md` and in `AUTHORIZATION_MATRIX_5B.md` (Closure additions).
