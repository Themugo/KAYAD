# KAYAD — Dealer registration and admin approval: root cause, fix, tests (2026-11-01)

**Nothing was committed, pushed, merged or deployed. No production record was changed and no migration was run.** Hosted database access was read-only SELECTs (project `ubvgixwhfybbyjuvxboj`).

## 1. Evidence-based root cause

Approve fails for **four independent reasons**; fixing code removes two of them and makes the other two visible. The remaining ones need owner action on the hosted database.

| # | Cause | Evidence | Kind |
|---|---|---|---|
| a | The handler called `kayad_apply_dealer_verification_atomic` with **no reason**; the function raises "A reason is required". Every database exception was returned as an opaque 500. | Route source before the fix; function definition on the hosted DB | **Code — fixed** |
| b | The function requires the acting user's **database row** to be role `admin`/`superadmin` with status `approved`. The hosted `users` table has **no such row**; the owner's e-mail row is a pending dealer. The owner is recognised by verified e-mail only. | `SELECT` on hosted users | **Owner action** (code now says so: 403 `ADMIN_ACCOUNT_REQUIRED`) |
| c | The function also needs a `dealers` row and a `dealer_verifications` row. Both pending dealers have **neither** (0 rows in each table). | hosted `SELECT`s | **Dealer/owner action** (code now refuses with the exact missing item) |
| d | The hosted database lacks every migration after 20260922, including `kayad_register_identity_atomic` and the trigger that creates the `dealers` row at registration. New registrations return 503 `DATABASE_MIGRATION_REQUIRED`. | `list_migrations` | **Owner action** |

Correction to an earlier statement: in the repo, registration (`kayad_register_identity_atomic`) creates `users`(pending) + `user_auth`, and the trigger `trg_sync_dealer_profile_from_user` creates the `dealers` row (approved=false). The `dealer_verifications` row is created only when the dealer submits onboarding/documents. The hosted database has neither the function nor the trigger.

## 2. File-by-file changes

| File | Change |
|---|---|
| `backend/services/dealerApproval.service.js` (new) | Single place for approval rules: reason required (≥8); application assessment (profile, suspension, ban, verification submitted/rejected/suspended, required documents); error mapping of database refusals to stable codes; per-dealer single-flight with fresh re-read (idempotent); batch summary for the list (fail-soft → `null` = unknown). |
| `backend/routes/adminRoutes.js` | `approve-dealer` and `verify-dealer` use the service; refusals are audited and returned with `code`/`message`/`blockers`; already-approved returns `changed:false` with no side effects; `/users` adds `application` per dealer. Authorization (`adminOrSuper`, `requireDecisionAuthority`) unchanged. |
| `src/utils/dealerDecision.ts` (new) | Reason rule, server error text + `[HTTP · code]`, eligibility helper. |
| `src/api/api.exports.ts` | `approveDealer(userId, body)` sends the reason. |
| `src/pages/admin/AdminSellers.jsx` | Approve opens a reason dialog; shows the server's message and code; Approve withheld (with reasons) when the server lists blockers; row changes only after the list is re-read; double-click safe. |
| `src/pages/admin/AdminUsers.jsx`, `src/features/AdminView.tsx` | Ask the operator for a reason; show server error text and code. |
| Tests adjusted (not weakened) | `stage5aRealSchemaPins` (RPC now asserted in the service file), `validate-business-command-centre-phase04.mjs` (same), `adminTables.test.jsx` (reason prompt, cancel sends nothing). |

## 3. Registration → approval workflow

1. `POST /auth/register` (dealer needs business name + location) → `users` pending, `user_auth`, `dealers` (approved=false, via trigger). Invalid input or a duplicate creates nothing; a missing function returns 503 and creates nothing.
2. Dealer verifies e-mail, signs in, completes `/dealer/onboarding` and submits verification (`dealer_verifications` with governmentId, kraPin, businessRegistration, physicalAddress).
3. Seller Management lists the pending dealer and what it still lacks.
4. An authorised admin (decision-authority policy + DB role admin/superadmin) gives a reason → validation → atomic database function → audit → dealer notified once.
5. Pending dealers are refused by `requireDealerVerification`; approved + verified dealers pass. No second registration path was added.

## 4. Regression tests (all 12 scenarios)

| Scenario | Where |
|---|---|
| 1,2,3 registration valid / invalid / duplicate / concurrent / migration missing | `dealerRegistrationPending.e2e.test.js` |
| 4 pending dealer in list with what it lacks | `dealerApprovalWorkflow` + `adminSellerApproval` |
| 5,7,9 approve, persists after reload, audit (actor, target, previous, new, reason) | `dealerApprovalWorkflow` |
| 6 unauthorised refused (user, dealer, moderator, anonymous, owner-only policy, owner with ordinary DB row) | `dealerApprovalWorkflow` |
| 8 missing, non-seller, no reason, incomplete (4 variants), no profile, rejected, banned | `dealerApprovalWorkflow` |
| 10 pending vs approved access | `dealerAccessGate.test.js` |
| 11 failed approval keeps state, useful error | `dealerApprovalWorkflow`, `adminSellerApproval` |
| 12 retry, stale, simultaneous clicks → one decision | `dealerApprovalWorkflow`, `adminSellerApproval` |

New tests: backend 51 across the three files above (`dealerApprovalWorkflow` is the real-router suite); frontend 12 (`dealerDecision.test.ts` 4, `adminSellerApproval.test.jsx` 8) plus the updated `adminTables` test.

## 5. Validation (logs + `exit-codes.txt` in this folder)

| Command | Exit | Result |
|---|---|---|
| `npm run lint` | 0 | clean |
| `npx vitest run` | 0 | 140 files; 1213 passed, 1 skipped |
| `npm run build` | 0 | built |
| `node scripts/validate-panic-room-end-to-end.mjs` | 0 | 25/25 |
| `node scripts/validate-business-command-centre-phase04.mjs` | 0 | 13/13 |
| `cd backend && node --experimental-vm-modules ./node_modules/jest/bin/jest.js --forceExit` | **1** | 187 of 188 suites; 3463 of 3464 tests. Sole failure: pre-existing **D-11** (`stage5f5RoleRouteMatrix`, `ghost_checker` on `/api/admin/stats`), unchanged. |
| `cd backend && npx vitest run --config vitest.config.js` | 0 | 6 files, 36 passed |
| `cd backend && node --test tests/response-lifecycle.test.js` | 0 | 1 passed |

**Not run:** any test against the hosted database or a live browser; a real end-to-end registration→approval. The route tests use the real router with a faked data layer whose approval function **mirrors the hosted rules** (read from the hosted function). The repo's migration definition of that function is older and weaker than the hosted one (D-36).

## 6. Code fixes versus production data repair

**Code (in this ZIP):** everything in section 2.

**Production/owner actions — none executed:**
1. Apply the pending migrations (after 20260922) through your normal migration process. 20261001090000 also back-fills the missing `dealers` rows for the two pending dealers.
2. Ensure a database account with role `admin` or `superadmin` and status `approved` exists and use it to approve. The owner's current row is a pending *dealer* (it is also listed as "Frameworks ltd"); one row cannot be both owner-admin and dealer. Either repair that row's role/status deliberately or create a separate admin account. Candidate SQL is intentionally not provided as a script to run blind; review the row first.
3. Each pending dealer signs in (Eric Kamau must first verify his e-mail), completes onboarding and submits the four required documents. Until then Seller Management shows what is missing and Approve is withheld.
4. Decide: whether the owner may approve their own dealer account (separation of duties); whether phone OTP must be required (currently not); whether decision authority stays `owner_only` (then the owner must be the acting database admin).
5. Export the hosted `kayad_apply_dealer_verification_atomic` into a migration so repo and database agree (D-36).

## 7. Remaining risks
- The single-flight guard is per server instance; the database function is idempotent, but a duplicate notification across instances is not excluded.
- Approval-time completeness checks are the product rules found in the repo (profile + four documents); phone verification is a warning at most.
- D-11 and D-23 remain open.
