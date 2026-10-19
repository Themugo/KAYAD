# KAYAD Stage 5B — Initial owner registration, multi-owner governance & secure recovery (2026-10-19)

## FINAL DECISION: **READY WITH EXPLICIT BLOCKERS**
The implementation is complete and was exercised end to end (real application + real browser + real, disposable PostgreSQL). It is **not** ready to be called "owners provisioned": nothing was applied to, or changed in, the hosted environment, as instructed.

| Question | Answer |
|---|---|
| `kayadautomotives@gmail.com` provisioned? | **PENDING** — not an active owner. Becomes one only after D1/D3 and the steps in the runbook §1 (verified mailbox + accepted invitation). |
| `jimmythemugo@gmail.com` provisioned? | **PENDING** — same. |
| Live e-mail tests passed? | **BLOCKED** — no Brevo credentials / authorised test mailboxes here. Stub-captured payload tests pass (EMAIL_TEST_STATUS_5B.md). |
| Migration approved? applied? | **Not approved, not applied** anywhere shared (D1). Candidate + preflight + rollback plan are in the ZIP; it applies cleanly and re-applies idempotently on a disposable replay of all 181 existing migrations. |
| Owner management passed acceptance? | **Yes, in the isolated environment** (API journey 136/136, browser journey 25/25, PG 97/97). Not yet on hosted. |
| Windows tree reconciled? | **No — unreachable** (WINDOWS_TREE_STATUS_5B.md). The five previously reported missing files remain unreconciled. |

## 1. Foundation
Built from the verified Stage 5A ZIP (sha256 `8aacd7db…0c13fc`, 42,835,667 bytes; unzip -t clean; manifest verified before work). Earlier ZIPs, checkpoints and sqlite backups preserved untouched. Runtime Node v22.22.2 / npm 10.9.4.

## 2. What was built
- **Database-backed membership** (candidate migration): `owner_memberships` (stable user id, status, who/when), `owner_invitations` (hash-only tokens, expiry, resend count), `owner_membership_events` (append-only audit ledger with a no-secret CHECK), `owner_bootstrap_state` (one-shot switch). RLS on, all direct table privileges removed; every change goes through locked SQL functions (concurrency-safe, last-owner rule enforced inside the database).
- **One authority predicate** (`isOwnerUser`, id-aware, registry-backed) used by HTTP `protect`/`optionalAuth`, login, refresh, `serializeUser`, sockets and the owner routes. Fail-closed when the store is unreadable beyond a short grace; falls back to the Stage 5A behaviour only while the store is *not installed*, so code can ship before the migration.
- **Controlled bootstrap** (`npm run owner:bootstrap`): operator-only, `--plan`/`--apply`, host confirmation, operator name recorded, mailbox-bound invitations, idempotent, no passwords, no tokens printed, closes itself and then refuses.
- **Owner management console** (Admin → Owners; owner-only): owners with active/blocked reason, invite, resend, revoke, remove/leave, recover, pending invitations with expiry, audit history; password step-up + typed confirmation; no secrets rendered. Public acceptance page `/owner-invite`.
- **Safeguards**: ordinary admins cannot grant owner; public/dealer/seller onboarding cannot touch owners; last-owner and self-lockout protection; immediate revocation of access tokens, refresh sessions and sockets; notices to all owners and the affected person; five-failure step-up lock that does not log the user out; no two-person approval for ordinary owner actions (either owner acts independently).
- **Recovery**: one-owner recovery with mandatory out-of-band verification record; all-owners emergency CLI gated by deployment access **and** a ≤24 h environment authorisation, only when no usable owner exists; no backdoor, no hard-coded password.
- **Hardening found by the audit**: legacy `seed.js` provisioned owners as pre-verified without mailbox proof → blocked in production without a named override.

## 3. Findings during the stage (fixed)
Squatter on a designated address (neutralised at acceptance); wrong step-up password returned 401, which would have triggered SPA session-expiry handling and double-counted failures → now 403; Stage 4A pin and 5A validator pinned the old e-mail predicate → updated intentionally; a legacy-amber colour tripped the brand-palette validator → replaced; audit table made the mobile page very long → capped at 20 rows with "Show all".

## 4. Verification (tiers: R/P unless stated; no H/L)
| Suite | Result | 5A baseline |
|---|---|---|
| `tsc --noEmit` | exit 0 | exit 0 |
| `npm run build` | exit 0 | exit 0 |
| Frontend Vitest | 662 pass + 1 skip | 650 + 1 |
| Backend Jest | 123 suites / 1871 tests pass (+4 suites / +57 tests) | 119 / 1814 |
| Backend Vitest | 36 pass | 36 |
| node:test | 1 pass | 1 |
| Validators | all pass except the same 8 hosted/live checks that need production credentials (identical to 5A) | 126 pass / 8 |
| Disposable-PG owner checks | 97 / 97 | — |
| Real-stack API journey J0–J11 | 136 / 136 | — |
| Browser journey U0–U10 (desktop + 390 px) | 25 / 25 | — |
(The final row set was re-run on the **extracted ZIP**: see `evidence/stage5b-20261019/extracted_run/` and the certificate.)

## 5. Implemented · Verified · Mocked · Needs approval · Needs migration
- **Verified (real runtime/PG/browser):** both initial owners via mailbox-bound invitations, bootstrap auto-close, third-owner invite/accept/expiry/resend/replay, removal with immediate HTTP/refresh/socket revocation, last-owner protection, concurrency races, one-owner and emergency recovery, fail-closed store, audit completeness, secret hygiene, admin/dealer/seller/anonymous refusal.
- **Mocked/captured only:** e-mail provider (stub), Jest suites.
- **Not tested:** live Brevo, hosted behaviour, Windows tree, browsers other than Chromium, multi-instance propagation across real separate hosts (bounded by TTL; reasoned, not run).
- **Needs approval:** D1 migration, D3 owner identities/mailboxes confirmed, D4 Brevo, D6 emergency custodians (register).
- **Needs a migration:** Stage 5B candidate **and** the Stage 5A hosted identity chain (Gate C: 4 items missing on hosted as of 5A) — the preflight lists both.

## 6. Next actions for you (in order)
1. Read the runbook and rollback plan; run `MIGRATION_PREFLIGHT_READONLY_5B.sql` on hosted.
2. Decide D1/D3/D4/D6. 3. Apply 5A Gate C chain, then 5B migration, in one sitting with both owners present; run bootstrap; both accept.
4. Live e-mail test with your own mailboxes. 5. Reconcile the Windows tree, then commit (Stage 6 not started).
