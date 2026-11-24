# 15 — Security and permission certification

All results: disposable local PostgreSQL + PostgREST + backend, direct HTTP (no UI-only authorisation). Not production.

| Suite | Checks | Focus |
|---|---|---|
| 29 permission matrix | 114 | per-role × endpoint matrix (baseline carried forward) |
| 26 admin console | 22 | staff/user boundaries |
| 27 customer care | 47 | reports/feedback/market data/NTSA/broadcast/CMS auth |
| 28 support & moderation | 16 | tickets, moderation |
| 30 personal accounts & dealer suspension | 62 | separation of duties, replay/duplicate, rank boundary, session revoke |
| 31 admin workflow closure | 73 | settings, reviews, designs, ads, financial/marketplace authz |
| 32 route API authorisation | 5 aggregate over **96 distinct endpoints** from the 53 routes | anonymous, personal, dealer, moderator-vs-UI, 5xx, SQL leakage |

## Defects found by the new tests and fixed (read-side, server)
Moderator (any staff) could read: `/api/bids/admin/all`, `/api/ads/all`, `/api/ads/stats`, `/api/admin/referrals`, `/api/wallet/dealer-accounts` — all now require the permission the UI map names. NTSA queue tightened earlier.

**Superseded by OD-1 (doc 21):** `GET /api/admin/system/health` (and `/api/ecp/health*`) now require `view_system_health` (Super Admin, or an individual grant). The earlier OD-5 staff-wide exception no longer applies. See doc 26 for the final matrix.

## Properties verified
* Privilege escalation: personal/dealer accounts get 401/403 on every staff-looking endpoint (T1, T2); staff create/role writes refused for non-owner (29).
* Cross-tenant: dealer isolation and sessions (journey 16, unchanged, in full run); dealer cannot suspend/approve.
* Separation of duties: requester cannot decide own suspension request; second Super Admin refused by owner authority (30).
* Error leakage: 4xx/5xx bodies for anonymous/personal/dealer contain no SQL/PostgREST internals (T5). Stack traces are returned only when `NODE_ENV` is development/test (`errorHandler.js:63`); production default omits them.
* Secrets: settings responses never include payment secrets (31 A10); ZIP secret scan in 16.

## Limits
No penetration test, no rate-limit/DoS testing, no production auth. 33 moderator-restricted routes are enforced server-side only for endpoints unique to those routes; shared endpoints rely on staff-role gating by design.
