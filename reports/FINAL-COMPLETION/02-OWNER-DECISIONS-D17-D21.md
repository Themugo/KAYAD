# 02 — Owner Decisions D-17 to D-21

**None of these has an owner answer. Nothing below has been decided or implemented on the owner's behalf.** The "Recommended option" column is an engineering recommendation only.

## Verified facts (not opinions)
- Listing numbers are per owner: `dealer_listing_counters`, unique `(dealer_id, listing_number)`, immutable trigger; two owners can both have #1. (journeys 13, 15)
- Escrow seller payout (B2C) uses `users.phone`; saved dealer settlement details are not used by the payout call.
- Personal sellers have no payout-details screen.
- Hosted DB differs materially from the repo chain (see 04: 44 missing tables, 24 hosted-only, 50 differing, 35 functions differing).
- 19 admin routes lack navigation links (pinned by `AdminRouteInventory` snapshot test).

## Decision table
| Decision | Exact question | Recommended option | Reason | Impact | Owner approval |
|---|---|---|---|---|---|
| D-17 | Should listing numbers stay per owner (current) or become one platform-wide sequence? | Keep per owner; always display with owner/dealer name or unique listing id for public/admin references | Implemented, tested, no contention; global needs new allocator + backfill | Changing: allocator, backfill of existing rows, public references, hosted migration | ☐ Approve per-owner ☐ Require platform-wide ☐ Other: ____ |
| D-18 | For escrow seller payout, which destination is authoritative: profile phone, saved settlement details, or per-transaction confirmed choice? | Saved settlement details or confirmed per-transaction choice, with step-up confirmation on change | Avoids paying a stale phone; but it changes where money goes | Payout service, banking UI, B2C tests; financial risk | ☐ Profile phone ☐ Saved details ☐ Per-transaction ☐ Other: ____ |
| D-19 | Do personal sellers need their own payout-details screen (separate from business banking)? | Yes, a separate personal payout record, only if D-18 picks saved details | Keeps one unified personal account without mixing business banking | New table/UI/API; depends on D-18 | ☐ No (profile phone) ☐ Yes separate record ☐ Other: ____ |
| D-20 | **Migration-history divergence:** how should hosted be reconciled with the repository chain (91 repo migrations absent from hosted ledger, 38 hosted-only names, missing/differing objects)? | Staging-first reconciliation: classify (05), adopt hosted-only objects into forward repo migrations, apply missing ones in order, **no** ledger repair on shared envs | Only route preserving hosted data and avoiding drops | All admin/auction/offer/wallet features on hosted; production release gating | ☐ Approve staging-first plan ☐ Alternative: ____ |
| D-21 | What to do with the 19 admin routes without navigation links? | Link those with production references; retire others only with usage evidence | Avoids hiding live tools; avoids deleting unknown dependencies | Admin nav, route inventory snapshot | ☐ Link ☐ Deep-link only ☐ Retire after evidence ☐ Other: ____ |

## Alternatives and plans prepared
- **D-17 platform-wide:** single Postgres sequence or global counter row; backfill by `created_at`; update unique index; contention on every insert; public URL impact. Plan not implemented.
- **D-20 alternatives:** (b) retire admin pages relying on absent objects; (c) clone hosted schema into repo as baseline snapshot then forward-only. Migration plans in 05/06/07.

## Other approvals pending (not decisions D-17..21)
- Derived dark logo asset (`kayard-ke-logo-dark.png`) — see 16.
- Accessibility changes touching the approved homepage (global focus ring, quick-action outline colour, `CarCard` badge text, hero dot target size) — hero itself untouched — see 18.
