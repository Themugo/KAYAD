# 07 — Migration Risk Register

| ID | Risk | Likelihood | Impact | Mitigation | Status |
|---|---|---|---|---|---|
| M-01 | Hosted/repo history diverged (91 absent, 38 hosted-only) | Certain | High | Owner decision D-20; staging rehearsal; forward-only reconciliation | OPEN |
| M-02 | 44 tables absent on hosted → auctions, offers, wallets, outbox fail | Certain | High | Staged apply after drift classification | OPEN |
| M-03 | 24 hosted-only tables/objects could be dropped or shadowed | Medium | High | Inventory first; never drop; export definitions | OPEN |
| M-04 | 35 functions differ incl. escrow/ledger/payout/bid logic | Certain | Critical | Review diffs by body; test on staging with financial invariants | OPEN |
| M-05 | Key triggers missing (listing number, sold-read-only, escrow guards) | Certain | High | Apply with backfill plan for `listing_number` duplicates | OPEN |
| M-06 | `uq_cars_owner_listing_number` creation fails if hosted duplicates exist | Medium | High | Pre-check duplicates read-only; backfill migration | OPEN |
| M-07 | New backend + migration 20261122120000 must ship together (3-arg RPC dropped) | Certain if split | High | Single release unit; deployment order documented | MITIGATED (doc) |
| M-08 | Old clients send no key → no replay protection | Medium | Medium | Header optional by design; new client sends key | ACCEPTED |
| M-09 | Index builds lock large tables | Low–Med | Medium | CONCURRENTLY, off-peak | OPEN |
| M-10 | Fingerprint false positives from PG version differences | Low | Low | Confirm versions; drill down | OPEN |
| M-11 | Remaining definition classes uncompared (grants, storage, enums…) | Certain | Medium | Run queries (03 #7) | OPEN |
| M-12 | No staging, no restore test | Certain | Critical | Owner provisions staging (03) | BLOCKER |
