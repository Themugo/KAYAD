# 05 — Dealer suspension: request → Super Admin approval

## Workflow
1. Staff with dealer-verification permission files a request (`reason` ≥ 10 chars) — `dealer_suspension_requests` (migration `20261124120000`, **not applied to hosted**).
2. Exactly one open request per dealer (unique partial index) → duplicates 409.
3. Super Admin (owner decision authority, `requireDecisionAuthority`) approves or rejects; requester can cancel own pending request.
4. Approve → `applyVerificationTransition` suspends once (compare-and-swap); replays 409; dealer record, listings, staff and audit history preserved.
5. Everything audited (`audit_logs` fallback).

## Closed bypasses
| Path | Before | Now |
|---|---|---|
| `POST …/suspend` by Admin | direct suspend | Super Admin only, reason ≥10 |
| `POST /api/admin/users/:id/toggle-ban` on a dealer | direct | 403 `SUSPENSION_REQUIRES_APPROVAL` for non-superadmin/non-owner |
| reinstate | any admin | Super Admin only (**owner to confirm** this is the intended policy) |
| Pending-approval count/queue | included non-dealers | dealer-only |

## Finding
Default decision authority allows only the owner Super Admin; a second Super Admin gets 403 (journey 30 adjusted accordingly). Separation of duties is server-side; UI mirrors it.

## Evidence
Journey 30 (62/62) incl. race/replay; jest `dealerIndependentApproval`, `stage5f5*`; Vitest `DealerSuspensionWorkflow.test.jsx`. ISOLATED-DB TESTED. Hosted: table absent ⇒ workflow unavailable until migration is authorised.
