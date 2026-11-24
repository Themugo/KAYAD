# 16 — Final Admin release readiness

## VERDICT: **CONDITIONALLY READY** (for release *review*; not for deployment)

The Admin Console code in this tree passed every local, isolated-database and browser check run in this closure. It is **not** "ready for release": hosted migrations are unapplied, no restore has been rehearsed, nothing is production-verified, and four accessibility findings and one owner decision are open.

## Matrix
| Area | Verdict | Level reached | Open conditions |
|---|---|---|---|
| Login landing & navigation (01) | Ready for review | Locally + isolated-DB + browser | — |
| Moderator/Admin guard (02) | Ready for review | Locally + isolated-DB + browser; server-side checked on 96 endpoints | OD-5 `system/health` staff-wide (owner decision) |
| Personal account & selling (03) | Ready for review | Isolated-DB | Purity not modified; hosted lacks `private_seller_capabilities` (page tolerant) |
| Personal Accounts page/API (04) | Ready for review | Isolated-DB + browser | — |
| Dealer suspension approval (05) | Ready for review | Isolated-DB + browser | **Needs migration `20261124120000` on hosted**; owner to confirm Super-Admin-only reinstate |
| 53-route workflow (06) | 13 workflow-verified, 28 read-only, 5 simulated, 7 deliberately unavailable, 0 unverified | Isolated-DB | Simulated/read-only rows have unexercised write paths |
| Financial operations (07) | Read-only/authorization only | Isolated-DB | No money movement exercised; hosted `transition_escrow` drift noted |
| Auction/inspection/NTSA (08) | Authorization + invalid transitions | Isolated-DB | NTSA is an internal queue only |
| Settings (09) | Ready for review (non-financial keys) | Isolated-DB | Escrow/commission keys recorded-only |
| Accessibility (10) | **Not certified** | Automated + keyboard probes | 3 contrast findings, 1 target-size finding, `/admin/settings` has no h1; no screen-reader testing |
| Specialist features (11) | Retained unavailable | — | Owner dispositions pending |
| Terminology (12) | Ready for review | Code audit | Public wording recommendation R-12-1 |
| Hosted migration preflight (13) | **BLOCKED** | Hosted read-only | 4 migrations unapplied; backup restore not rehearsed |
| Runbook (14) | Prepared for review — **not authorised for execution** | — | Owner authorisation |
| Security & permissions (15) | Ready for review | Isolated-DB | No pen-test; no production auth |

## Blockers before any deployment
1. Owner authorisation and a **rehearsed restore** before applying migrations (13/14).
2. Without migrations, hosted shows unavailable states for dealer suspension requests, reports, feedback, announcements, temporary duties.
3. Commit/push status of the earlier finalisation work and PR 266 are **NOT VERIFIED** from this environment.

## What is NOT claimed
Production verification, WCAG 2.2 AA compliance, financial correctness of unexercised paths, hosted behaviour after migration.
