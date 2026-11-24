# 29 — Final security, governance and production-readiness closure (2026-11-24)

Evidence level: LOCAL and DISPOSABLE-DB, plus hosted READ-ONLY SELECTs. **Nothing here proves production readiness.**

## Phase 0 — checkout reconciliation
| Item | Finding |
|---|---|
| `origin/main` | `a24a8629` "Admin Console final closure: governance decisions (OD-1 to OD-4)…"; contains `9488526b` (verified in the work tree) |
| Work tree used | fresh worktree at `a24a8629`; all work in this document is uncommitted on top of it |
| Previous r2 ZIP vs pushed commit | identical except runtime artefacts and three log files |
| PR 266 | head `7de6f2a0` reported earlier; **still open, NOT VERIFIED** from this environment (no access) |
| Docs 00–27 and doc 07 | present; nothing overwritten. Docs 13, 14, 24, 25 received "updated" notes; 28–31 are new |

## Phase 1 — system health is technical-only (OD-1 hardened)
`view_system_health` is now bound to roles `superadmin` and `technical_support` by `PERMISSION_ROLE_ELIGIBILITY` (`backend/config/roles.js`), applied inside `getEffectivePermissions`. A grant to Moderator, HR, Accounts, Marketing, Escrow, Ad Manager, Ghost Checker or ordinary Admin is **ineffective**, the permissions API answers 409 `PERMISSION_NOT_ELIGIBLE_FOR_ROLE` before saving, and the staff-permissions screen disables the toggle with an explanation. `view_logs` is not a substitute. The UI mirror is `src/utils/permissions.ts`. Evidence: journey 33 (107/107, 14 identity types plus direct API, replay, grant-then-role-change and revoke), Jest `systemHealthPermission`, vitest `adminHealthTileGate`.

## Phase 2 — Admin Write Authorization Register
Full register: doc 28 and `write-authorization-register.csv` (707 write routes; 680 probed over real HTTP as anonymous, personal, dealer, 8 departmental staff roles and admin; 10 unmounted; 17 self-service identity routes probed anonymously only).

| Classification | Count |
|---|---:|
| Verified secure | 464 |
| Intentionally restricted | 184 |
| Fixed and retested | 54 |
| Deferred with reason and owner decision | 4 |
| Unresolved security defect | 1 |

**Fixed (existing permissions only, no new permission or role):** auction integrity, bid `set-winner` (`manage_auctions`); contact read (`manage_support`); dealer health score (`manage_users`); disputes status/assign/notes/mediation-complete/resolve/appeal-review (`operate_escrow`); feature flags, hero slides, localization, organizations, regional configuration, queue/DLQ, notification retries, marketplace-health, reliability, metrics reset, cache flush, platform factory, market-analytics regenerate (`manage_platform`); fraud check/status (`manage_moderation` or `manage_users`); loan status (`manage_finance`); listing assistant/quality (`manage_cars`); automation rules/approvals/preview and low-code field/permission/AI routes (admin tier, matching their sibling routes). Routes every staff role could pass: **63 → 9**.

**Also fixed:** the error handler no longer returns `details` on 5xx in production; input validation (400 instead of 500) for inspection reviews, `ai/command`, CMS and XOS analytics tracking (the XOS route also stopped trusting a body-supplied `userId`); the low-code field/permission routes now check the role before validating the id.

**Open items (not hidden):**
* **UD-1 — Unresolved security defect.** `POST /api/bids/:id/bid` answers an **anonymous** caller 200 "Processing" because `idempotencyCheck` runs before `protect`; no bid is placed, but the response is wrong and the key space is shared across principals. Fix (authenticate first or scope the key to the user) touches the frozen auction flow — **owner approval required.**
* **OD-5 — Deferred, owner decision.** Automation task create/update/complete/escalate is open to every staff role; no existing permission names task work.
* The static analysis cannot see custom guard variables; journey 35 is the evidence, not the regex.
* 200 write routes still answer 5xx for an empty body or a non-existent id when the actor passes the guard (mostly admin-only, stubbed services). They are baselined in `ci/db-journeys/35_known_5xx.json` so a new one fails; this is robustness debt, not an authorisation hole.
* `/api/lowcode/objects/:objectId/...` runs `validateObjectId` against `:id`, so that route always answers 400 even for Admin; reported, not changed.
* `users.bank_pre_approval` is referenced by code but created by no migration; reported.

## Phase 3 — the 53 admin routes
Re-swept on this tree (`evidence/sweep-final`): 53 routes × (Super Admin 1440 and 390 px, Moderator 1440 and 390 px) = 212 rows, **0 problems** (shell, errors, overflow, page errors, 404). Moderator direct URL navigation is refused on **33** routes and allowed on 20, identical to the previous sweep; for every endpoint unique to a restricted route, journey 32 confirms the server refuses the Moderator too (UI and API agree; no mismatch found). Class counts unchanged: 13 fully workflow-verified, 28 read-only, 5 safely simulated, 7 honest "not provisioned" 503 states, 0 blocked. 18 sweep rows show a 503 — all are the documented not-provisioned specialist services. Updated register: `route-register.md`, `route-classification.json` (read-only routes are **not** counted as full workflow). **Newly discovered page routes: none**; the 39 other `/admin/...` strings in `src` are API paths (covered in doc 28 and journey 32). Keyboard and responsive coverage are the existing a11y/responsive runs (doc 22).

## Phase 4 — screen reader
**Not performed. Gate stays OPEN.** This environment is a headless Linux container with no NVDA, JAWS or VoiceOver and no way to drive one. No screen-reader result is claimed. Automated axe checks and keyboard checks exist (doc 22) and are not a substitute. Required on the owner's side: NVDA + Firefox/Chrome pass over login, the sidebar, one table, one modal and the dealer-suspension decision.

## Phase 6 — financial and marketplace safety status
| Area | Tested | Simulated | Unavailable | Production-unverified |
|---|---|---|---|---|
| Authorisation of finance/escrow/payout routes | yes (journeys 14, 29, 31, 32, 35) | — | — | yes |
| Escrow transitions | authorisation only | disposable DB with stubs | — | yes; hosted function present, body not compared |
| Payments, M-Pesa, refunds, payouts | authorisation only | stubs | — | yes |
| Auction end / winner | authorisation | journey 34 W16–W17 | — | yes; UD-1 open |
| Reconciliation issue reads | disposable | — | hosted view absent | yes |
| Ledger | read paths | — | — | yes |
No financial logic, RPC or hosted function was modified, replaced or invented.

## Phase 7 — account governance preserved
Unified personal account unchanged; dealer suspension is requested by any Admin and decided by any Super Admin (compare-and-swap, 4 simultaneous decisions → exactly 1 wins); former staff keep their personal account; Purity's account/listings/status untouched. Evidence: journeys 30 (62/62) and 33 (107/107), re-run after this session's route changes.

## Phase 8 — specialist features
Automation, low-code, XOS, Digital Twin, VXP, AI platform, suspicious-bid flagging and configuration remain as documented in doc 11: present, authorised, and returning an honest `FEATURE_NOT_PROVISIONED` 503 where the service is not provisioned. Nothing was provisioned, deleted or retired; configuration retirement still needs explicit owner approval.
