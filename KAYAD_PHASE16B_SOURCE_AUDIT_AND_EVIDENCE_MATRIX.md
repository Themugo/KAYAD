# KAYAD Phase 16B — Source audit and evidence matrix

Foundation: `KAYAD-PHASE16A-PRIMARY-OWNER-SECOND-OWNER-TEST-DEALER-PRESERVATION-20261026.zip` (no sidecar was supplied; the actual SHA-256 is in `KAYAD_PHASE16B_PACKAGE_INTEGRITY.md` — compare it with your own copy).
Nothing hosted was read or written in 16B. Hosted facts below are the Phase 16A **read-only** observations, quoted, not re-queried.

**Evidence labels** — `SRC` source-confirmed (read in this archive) · `TEST` test-confirmed (ran green against the disposable stack: D = disposable PostgreSQL, A = local app stack, U = unit) · `HOSTED` hosted-confirmed (16A read-only, not re-verified) · `OPEN` unresolved.

## 1. Repository, runtime, build
| Item | Finding | Label |
|---|---|---|
| Stack | Vite/React SPA (`src/`), Express backend (`backend/`, ESM), PostgREST via supabase-js behind a Mongoose-style facade (`models/_base.js`, `db/index.js`, `utils/fieldMap.js`), PostgreSQL, Redis (queues) | SRC |
| Build / typecheck | `npm run build` and `npm run lint` (= `tsc --noEmit`) exit 0 on the final tree | TEST (A) |
| Dependencies | `validate:dependency-security` passes | TEST |
| Migrations | `supabase/migrations` is the applied history; every `runbooks/**/migration-candidate/*` is a **candidate, never applied**. 16B adds one candidate pair (registration + dealer onboarding) | SRC |

## 2. Identity, owner resolution, role fields
| Item | Finding | Label |
|---|---|---|
| Who is an owner | `config/owners.js` `isOwnerUser`. **Database mode**: an active, email-verified, not-banned `owner_memberships` row bound to the user id. **Legacy mode**: a verified address in `WEBHOIST_EMAIL` (first entry = primary). The role label is never consulted | SRC + TEST (D,A) |
| What an owner gets | `middleware/auth.js` overrides `req.user.role = "superadmin"` and `effectiveRole = "webhoist"` **in memory per request** for owners only. `users.role` is not rewritten, so the primary owner keeps a `users.role` of `user` without losing access | SRC + TEST |
| Do not change `users.role` of the primary owner | Owner membership alone is sufficient: the 16B suites run an owner whose `users.role='user'` through owner management, MFA and invitations. No requirement to write `superadmin` was demonstrated, so none is proposed | TEST (A) |
| `profiles.role` | No backend code queries a `profiles` role; the only reference is a comment in `authController.js` (DB triggers create profile/dealer rows at registration). Auth and owner resolution never read it | SRC |
| Reserved addresses | Registration of a designated owner address is refused (`OWNER_IDENTITY_RESERVED`) | TEST |
| Stale sessions | A demoted or banned account's already-issued session loses access on the next request (role/ban are re-read per request) | TEST (A) – new S5 |
| Domain / KAYAD addresses | No code path derives a permission from an email domain. `kayadautomotives@gmail.com`-style, `@kayad.co.ke`, `@kayadautomotives.com` and look-alike addresses register as plain users | TEST (A) – new S6 |

## 2b. Every owner create / invite / recover / role-change / remove route
| Route (`routes/ownerRoutes.js`) | Gate | Purpose | Label |
|---|---|---|---|
| `GET /api/owner` | owner | list owners, invitations, ledger | TEST |
| `POST /api/owner/invitations` | owner + password + typed-email confirmation + TOTP (when enrolled) | the **only** way to add an owner | TEST |
| `POST /api/owner/invitations/:id/resend`, `DELETE /api/owner/invitations/:id` | owner (+ step-up) | resend / revoke | TEST |
| `DELETE /api/owner/members/:userId` | owner + step-up | remove an owner; last usable owner refused | TEST |
| `POST /api/owner/members/:userId/recovery` | other owner + step-up | lost-device recovery; resets MFA, kills old sessions, privilege returns only on re-accept | TEST |
| `GET/POST/DELETE /api/owner/mfa…` | owner | status, enrol, activate, recovery codes, disable | TEST |
| `GET /api/owner-access/invitation`, `POST …/accept` | public token / signed-in mailbox owner | accept; wrong account refused, single use, expiry enforced | TEST |
| `PUT /api/admin/staff/:id`, `POST /api/admin/staff` | admin-level | cannot assign `superadmin`/`webhoist`/`owner` | TEST – new S4 |
No other route writes `owner_memberships`. Direct `users.role` writes exist only in admin staff/role endpoints, which are covered by S4.

## 3. Dealer, dealership owner, dealer staff
| Item | Finding | Label |
|---|---|---|
| Dealer onboarding (`PUT /api/dealer/onboarding`) | Ignores `approved/verified/role/super_admin/isOwner/status` in the body; dealer stays unapproved, role unchanged, `/api/owner` is 403 | TEST (A) – new S3 |
| Dealer team invite with owner-like roles | `owner`, `webhoist`, `superadmin`, `admin` refused (4xx) and nothing created | TEST – new S3 |
| Dealer / dealer staff reach owner or staff management | Always 401/403 (role matrix, 786 routes × 16 roles) | TEST |
| Dealer role change cannot grant owner membership | membership count unchanged across every dealer journey (S1–S3, browser B7) | TEST |

## 4. TOTP / MFA
Real RFC 6238 on `node:crypto` (`utils/totp.js`), AES-256-GCM secret at rest (`v1:iv:tag:ct`), recovery codes HMAC-SHA256 with a key-derived pepper, replay guard (`last_used_step`), lockout 5 failures → 15 min. SRC + TEST (D,A,U). **16B defect found and fixed:** the failure counter was a read-modify-write, so concurrent wrong codes bypassed the limit (see MFA evidence). Real browser enrolment/challenge/recovery against the real backend: TEST.

## 5. Registration and dealer onboarding blockers
| Item | Finding | Label |
|---|---|---|
| `kayad_register_identity_atomic` | Called by `authController.js` via RPC; defined in repo migrations `20261001090000_registration_onboarding_integrity.sql` / `20261001220000_database_contract_alignment.sql`; **absent on hosted** (16A) | SRC + HOSTED |
| Dealer columns | hosted `dealers` lacks `bio`, `payment_details`, `onboarding_complete`, `onboarding_completed_at`; `dealer_verifications_verification_status_check` lacks `suspended` (16A) | SRC + HOSTED |
| Closure | candidate migration + rollback + 47-check rehearsal on a hosted-shaped clone; **not applied anywhere hosted** | TEST (D) |

## 6. Phase 15 / 16 / 16A blockers
| Blocker | State |
|---|---|
| Live M-Pesa shortcode routing | OPEN (unverified, out of scope) |
| Amount-mismatch / late-success callback behaviour | OPEN (not touched) |
| Dealer-set payment destination vs actual routing | OPEN |
| Live payment certification | OPEN |
| Seller commission/waiver/discount policy and schema | OPEN (undecided) |
| Hosted owner-governance + owner-MFA migrations, second-owner activation | OPEN — staging required, owner approval gate |
| Finance/support staff restrictions from Phase 16 | preserved: no authorization status changed vs baseline (0 of 12,576 matrix cells moved from 401/403) |
| `validate:stage5f7-private-auction-contract` (13I baseline failure) | now passes in this archive |
| `validate:communications:providers`, `validate:live-runtime` | fail only because no provider/hosted credentials exist here — environment, not defect |
