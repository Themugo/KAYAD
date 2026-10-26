# KAYAD Phase 13D — Caller and Ownership Map

## Guards (after 13D)
| Guard | Admits | Source of identity |
|---|---|---|
| `dealerOnly` (unchanged) | `dealer`, `individual_seller`, all staff roles, owner bypass; seller/dealer email must be verified | `req.user.role` re-read from DB by `protect` |
| `dealerBusinessOnly` (new) | `dealer`, existing staff roles, owner bypass; dealer email must be verified | same |
| `requireOwnDealerResource` (new) | the caller whose id equals the path id; staff; owner bypass | authenticated `req.user.id`, compared with `req.params.dealerId` |
| `dealerOrgAccess` (unchanged) | role `dealer` owner, staff, or an **active** `dealer_teams` member | org id resolved from membership, never from the request |
| `requireApproved` (unchanged) | `users.status = approved` | DB |

A `dealers` row on its own grants nothing anywhere: no guard consults it for access.

## Callers
| Route group | Frontend caller | Backend/other callers | Who legitimately calls |
|---|---|---|---|
| `/api/dealer` team/upgrade/wholesale/trade-listings/pricing | `dealerAPI` in dealer pages (e.g. `DealerPackageTab` upgrade, `DealerListingsTab` wholesale, `AddCarStepPricing` pricing) | none | dealers (+ staff) |
| `/api/dealer` caller-scoped (cars, bulk, mark-sold, bids, auction, earnings, escrows, payouts, settlement, profile, analytics) | `dealerAPI` dealer pages | S1-LIST-04 test pins private-seller access | dealers and private sellers (unchanged) |
| `/api/dealer-platform` business | dealer platform pages | none | dealers (+ staff) |
| `/api/listing-quality/dealer/:id/*` | listing-quality widgets for the signed-in owner | none | the owner of that id; staff |
| `/api/search-analytics/dealer/demand` | none found | none found | dealers (+ staff) |
| `requireDealerVerification` | — | `/api/cars` POST/PUT/DELETE/images, `dealerPlatform POST /inventory` | dealers (gate); private sellers (pass-through, no record) |

## Ownership resolution per Workstream B endpoint
1. `protect` authenticates and re-reads role/status.
2. `dealerOnly` keeps the existing role/email rules.
3. `validateObjectId` rejects malformed ids (400).
4. `requireOwnDealerResource` compares the path id with the authenticated id. For the listing-quality service, `dealerId` is the owning `users.id` (`cars.dealer`), so the comparison is the verified-ownership test; no database lookup is needed and none is trusted from the caller.
5. Nonexistent and foreign ids are indistinguishable (same 403).
Explicit org-permission access (team members reading an owner's quality data) is **not** supported by the existing code and was not added; this keeps the correction minimal.

## Dealer-record creation paths traced (Workstream C)
| Path | Creates `dealers` row? | Status |
|---|---|---|
| DB trigger `sync_dealer_profile_from_user` (role `dealer`) | yes, `approved=false` | legitimate; unchanged |
| `requireDealerVerification` for `individual_seller` | **was yes (`approved:true`)** | **removed in 13D** |
| `PUT /api/dealer/onboarding` (role `dealer` only) | updates the dealer's own profile | unchanged |
| Admin/verification workflows | approve existing rows | unchanged |
No private-seller application or personal-listing path now creates or approves a dealership. Historical rows created by the old behaviour are **not** deleted, converted or re-owned (staging query Q5 sizes them).

## Dashboard note (Workstream D — documentation only)
`DashboardHub` currently gives an `individual_seller` a seller-only view with its own action set. The intended future design (C1/13E) is one personal shell: buyer sections remain, with the seller workspace shown according to real seller state, and existing routes/aliases intact. 13D builds or changes no dashboard code. Security consequence for 13E: seller-workspace visibility must come from seller capability/state, never from `dealerOnly` admission, and the caller-scoped legacy `/api/dealer/*` routes need re-homing behind the capability guard.
