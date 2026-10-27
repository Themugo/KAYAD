# Phase 15 - Auction-Setup Operational Audit (endpoints first mounted in 14.9)
Evidence: governance E2E F1-F6 and dealer E2Es on the local DB stack; role probe of every auction-setup route (evidence/phase15-20261026/role_matrix_probe.json).

- Ownership/role: only the owning verified dealer can save a setup (F1); a superadmin cannot write dealer terms through the dealer endpoint (F2); private sellers cannot read a dealer setup, buyers cannot publish (F3). Probe: anonymous 401, buyer/seller/staff 403 on the dealer routes.
- Readiness: publishing a listing that is not auction-ready returns 422 with the readiness blockers, never a 5xx, and publishes nothing (F4).
- Concurrency: concurrent saves by the owner never 5xx and leave exactly one setup row (F4).
- Immutability: once published, amend returns 409 and the stored configuration is byte-identical; not even the platform owner can alter published terms through the dealer endpoint (F5).
- Super Admin bid view is closed to buyers, sellers and dealers (F6).
- Listing-state restrictions (deleted/sold/reserved/live/ended/bid-bearing) are enforced by the 14.9 state guard; this phase re-ran its regression but did not extend it.
- Not changed: bidding, deposits, escrow, ledger, settlement.

## Staging still required
Concurrent publish vs bid on a real auction, customer-facing rendering of published terms against real data, and real-environment RLS. Only local evidence exists.
