# Unresolved issues, owner decisions and release gates (2026-11-24, finalisation)

**Not production-ready; not complete.** Labels: PASS / FAIL / PARTIAL / NOT VERIFIED / NOT PROVISIONED / BLOCKED.

## Release gates (all open)
| # | Gate | Status |
|---|---|---|
| 1 | Hosted migrations, in order: `20261123210000_lead_create_find_before_insert.sql`, `20261123220000_dealer_temporary_duties.sql`, `20261124100000_admin_customer_care_and_market_tables.sql` (runbook: `MIGRATION-REHEARSAL-AND-PRODUCTION-RUNBOOK.md`). Requires your separate explicit approval | NOT APPLIED |
| 2 | Until migration 3 is applied, hosted report/feedback submission answers 500 (tables missing) | KNOWN, NOT VERIFIED on hosted |
| 3 | The latest local changes of this phase (UI access mirror, `29_permission_matrix`, migration revoke, new docs) are uncommitted; your earlier push contained Tasks A–E as of its commit | PENDING OWNER COMMIT |
| 4 | Deployment status of Vercel/Render after your push | NOT VERIFIED |
| 5 | Hosted verification of the console (53 routes), Team & Employment live test | NOT VERIFIED |
| 6 | Live e-mail delivery | BLOCKED (no provider access); no claim made |
| 7 | PR 266 gate | kept open, NOT VERIFIED |

## Owner decisions
1. The 8 NOT PROVISIONED features (automation, config, low-code, VXP, XOS, AI platform, digital twin, suspicious-bid flagging): provision or retire. See `SCHEMA-DECISION-MATRIX.md`. No feature was removed.
2. Whether to also harden the route guard so a moderator cannot open, by URL, 7 pages whose APIs already answer 403 (cosmetic; the server refuses).
3. "Private Sellers" label in `HomePageAdminPanel` (escrow configuration, test-tied) left unchanged. The `/admin/private-seller-applications` page and `individual_seller` legacy value remain for existing accounts; no new private-seller category or approval exists.
4. Overlap review (no change made): `/admin/cars` and `/admin/moderation` share the same list/moderate client calls; `/admin/support` and `/admin/support-tickets`; `/admin/control-room`, `/admin/control-center`, `/admin/command-center`. Routes are preserved for compatibility; see `ROUTE-AND-FEATURE-OWNERSHIP-MATRIX.md`.
5. Settings review: every Settings category's save/reload and its connection to the services was NOT exercised (the brief reserves this for a dedicated review).

## Not verified (will not be claimed)
Escrow and transaction admin actions; auction and inspection admin actions in a browser; panic and recovery (deliberately not executed); broadcast delivery (drafts only); settings save/reload per category; keyboard/accessibility audit in a browser; hosted behaviour.

## Risks
- Migration ordering: migration 2 needs `20261123200000` already applied.
- The rehearsal "existing schema" is built from the migration history, not a hosted dump.
- Jest memory (see TEST-RESULTS).
