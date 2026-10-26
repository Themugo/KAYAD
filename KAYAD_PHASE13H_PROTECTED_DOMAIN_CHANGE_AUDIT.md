# KAYAD Phase 13H — Protected-Domain Change Audit

Method: `diff -rq` of the 13H tree against the extracted 13G foundation (excluding node_modules, dist, logs, evidence, uploads).

## Application source changed in 13H
| file | change | domain |
|---|---|---|
| `src/utils/adminAlertMessage.ts` (new) | pure string reader | admin UI |
| `src/features/AdminAlertsPanel.tsx`, `src/pages/admin/OperationsControlRoom.jsx`, `src/pages/admin/components/AdminAlertsPanel.jsx` | call the reader | admin UI |
| `backend/services/vehicleAnalyticsService.js` | `getCountyTrends`: select `city` instead of non-existent `location` | public vehicle analytics (read-only) |
| `backend/services/savedSearchCron.js` | select/match `city`; `matches` exported | saved-search notifications |
| `scripts/validate-super-admin-phase1-navigation.mjs` | expected list + label (mutation-tested) | validator only |
New tests, runbooks and `scripts/owner/*` read-only SQL/tools are additive and not part of the shipped application.

## Protected areas
| area | changed? |
|---|---|
| M-Pesa, payments, escrow, ledger, bid activation, settlement, refunds, forfeitures, reconciliation, financial webhooks, payouts, idempotency/concurrency | **No** file under these services/controllers/routes/jobs changed. The alert fix is UI-side; `reconciliationService.sendAlerts()` is untouched and its payload shape is the contract the UI now reads |
| Super Admin authentication, auth middleware, CSRF, RLS policies, audit logging, role boundaries | **No** |
| Shared data layer (`backend/db/index.js`, `backend/models/_base.js`, `fieldMap.js`) | **No change in 13H** (13G changes already audited) |
| Identities, ownership, dealer organization data, listing policy | **No** |
| Database schema | **No new migration**; disposable-database changes only (`kayad_*_disposable`) |

## Protected routes failing, deliberately left untouched (9)
`/api/bids/admin/suspicious`, `/api/escrow/operations/dashboard`, `/api/finance/issues`, `/api/referral/stats`, `/api/admin/referrals/stats`, `/api/sms-bidding/my`, `/api/new-admin/auction-integrity` (+`/dashboard`, `/risk-profiles`). Required decision: the owner of each domain. Their access boundaries were re-checked and remain closed to anonymous/buyer/dealer (matrix H6).

## Behavioural note on the saved-search cron
Previously it failed before reading any row, so it never emitted notifications. After the fix it can match new cars to saved searches and call `emitCommunication` (email/SMS/WhatsApp/in-app) on a running deployment. No such call occurred in any test (no provider credentials; the matcher is unit-tested in isolation). **This is a behaviour change to review at deployment**: the cron starts with the other background services and has no dedicated on/off switch in the code inspected, so the owner must decide before release whether saved-search notifications may start (if not, the cron start line in `server.js` would need a switch — not added here).
