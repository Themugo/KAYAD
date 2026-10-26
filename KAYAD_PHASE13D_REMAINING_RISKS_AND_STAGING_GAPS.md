# KAYAD Phase 13D — Remaining Risks and Staging Gaps
**No staging, production or database access was approved or used. No query was run.** Nothing below has been verified live, and no live certification is claimed.

## Remaining source-level risks (deliberately not changed in 13D)
| ID | Risk | Why left | Next |
|---|---|---|---|
| R1 | Private sellers (any role-`individual_seller` regardless of status where the route has no status gate) still reach caller-scoped legacy `/api/dealer/*` routes: cars, bulk-status/delete, mark-sold, accept/reject-bid, auction start/end/extend, earnings, escrows, payouts initiate, settlement, profile, analytics, summary, quick-stats, milestones. `requireApproved` limits the legacy router to approved users; the dealer-platform router had no status gate. | These are own-data operations pinned by S1-LIST-04 and touching listings, auctions, escrow and payouts (protected financial domains). Tightening needs a decision and a capability guard. | 13E / C1: re-home behind the seller capability; **auction/escrow/payout routes need separate approval** |
| R2 | `/api/cars` writes have no seller-status gate (DI-5) | Outside the three approved corrections | C1 capability guard |
| R3 | `POST /api/leads` still admits private sellers | Existing test pins it | C1 |
| R4 | Staff roles pass `dealerOnly`/`dealerBusinessOnly` (DI-6) | Preserved by instruction | Product decision G13 |
| R5 | Team members (role `user`) are refused on the legacy owner-level router and on listing-quality; they reach dealer-platform only through `dealerOrgAccess` team routes | Existing policy | Org-permission design in C1 |
| R6 | `dealerPlatform PUT /profile/:dealerId` uses `protect` only; its controller-level ownership was not re-audited in 13D | Outside the listed routes | Audit in 13E |
| R7 | Historical `dealers` rows auto-created for private sellers remain | Instructed not to delete/convert | Q5 sizing, then a separately approved cleanup |
| R8 | `/api/private-seller-auctions` relies on service-level checks | Protected auction domain | separate approval |

## Staging evidence still required (read-only, aggregate/redacted)
Prerequisite: approved read-only staging credentials. Expected evidence and queries are those of 13C (Q1–Q7), unchanged:
- Q1 live `users`/`profiles` CHECK constraints and triggers — expect role/status sets matching migrations.
- Q2 `private_seller%` columns — expect none (collision check for the C1 schema).
- Q3 RLS and grants on `users`, `dealers`, `dealer_teams`, `cars`.
- Q4 `role,status` counts — sizes the private-seller population exposed by DI-1/2.
- Q5 `dealers` rows by owner role and `approved` — sizes rows created by the old behaviour.
- Q6 seller-owned `dealer_teams` rows (count only) — evidence whether DI-1 was exercised.
- Q7 governance tables existence.
Plus: `cars.wholesale` existence (G16), 30-day access-log review for external clients of the tightened routes (G12), cookie/CSRF behaviour on the real domain, real email/OTP delivery, Playwright e2e, full backend suite, and rendered UI. None has been run.
