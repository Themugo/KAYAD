# Phase 15 - Account and Dealer Lifecycle Regression Report
Evidence: DB-backed E2E on a disposable local PostgreSQL 16 + PostgREST + the real Express backend. Local only - not staging.

| Script | Result |
|---|---|
| e2e_superadmin_governance.cjs (Phase 15) | 73/73. The same script against the unchanged 14.9 backend: 33 FAIL / 14 PASS (shows the defects were real) |
| e2e_account_security.cjs (14.9 carried) | 47/47 - deletion dependency guard, fail-closed, soft-deleted users cannot log in/refresh, password reset, phone-change verification reset |
| e2e_dealer_lifecycle.cjs | 50/50 |
| e2e_dealer_payments.cjs | 73/73 |
| e2e_inventory_team.cjs | 60/60 |

## Accounts
- Ban (C1-C9): explicit target state, server-confirmed response, repeat is idempotent with a single audit entry, banned user's session and refresh tokens stop working, unban restores, buyer cannot ban, admin cannot ban superadmin, nobody bans themselves. Audit holds ids and outcome only (no tokens, passwords, e-mail).
- Privilege (H1-H4): profile update cannot change role/permissions; admin cannot promote to superadmin; self-registration as superadmin refused.
- Deletion (14.9 safeguards preserved, re-run): dependency conflicts return 409, check failures fail closed, dealer-owner deletion stays blocked, financial/audit history not cascaded. UI: the admin user screens update only from the server response (browser check: ban request body `{"banned":true}`, UI shows state from the response).

## Dealers
- Approval did not publish pending, draft or hidden listings and they stayed invisible on the public marketplace (E2, E3). Re-approving is refused as an invalid transition (E4). Suspension is audited, deletes nothing, and reinstatement restores approval without publishing (E5, E6). Non-privileged staff cannot suspend (E7).
- Team isolation: a dealer's team list never contains another organization's members; cross-dealer profile edits refused; buyers cannot write settlement details (G1-G3).

## Decision required (not invented)
Whether changing an approved business name must trigger re-verification is not defined by existing policy. No behaviour was added. Owner decision needed.
