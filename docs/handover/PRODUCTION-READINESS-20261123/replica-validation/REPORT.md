# KAYARD KE — Local replica validation: evidence, blockers, approvals (v1)
Date 2026-11-23. Status labels: CONFIRMED / LIKELY / HYPOTHESIS / NOT ESTABLISHED.
Scope: LOCAL structural validation on an isolated Postgres 16 replica. NOT production verification. NOT end-to-end application or financial workflow validation.

## 1. Conditions honoured
No Supabase project/branch/paid resource created. No write to hosted. No migration applied to production, no `db push`, no deploy, commit, merge or push. Baseline = the actual hosted dump + hosted migration history you supplied (not a repo-generated DB). Existing audit baseline, PR 266, /p8 and all prior deliverables untouched. The 12 differing financial functions were NOT edited. Only synthetic data used; no production data copied.

## 2. How the replica was built (isolation)
pg_dump 19 of hosted (schema-only for public + supabase_migrations, plus migration-history rows; run by you) -> restored into local Postgres 16.15 on loopback, database `kayad_test_replica`. Added stub Supabase roles and `auth` schema. PG17-only items skipped/replayed (transaction_timeout, MAINTAIN grant). Each rehearsal ran on `CREATE DATABASE ... TEMPLATE` copies. No outbound DB connection exists from the sandbox. Logs: evidence/restore-*.log.

## 3. Hosted identity (CONFIRMED)
Project ubvgixwhfybbyjuvxboj ("KAYAD EA"), dashboard badge "Production", "No backups", no branches, PG 17.6, Free plan.

## 4. Catalog comparison hosted vs repo-migrations (CONFIRMED, counts)
| kind | hosted | repo | hosted-only | repo-only | differ |
|---|---|---|---|---|---|
| columns | 3045 | 3299 | 343 | 597 | 16 |
| constraints | 732 | 964 | 74 | 306 | 14 |
| indexes | 650 | 766 | 53 | 169 | 0 |
| functions | 96 | 302 | 27 | 233 | 46 |
| triggers | 38 | 79 | 1 | 42 | 0 |
| policies | 120 | 146 | 1 | 27 | 28 |
| ACL | 213 | 236 | 24 | 47 | 130 |
Direction of drift (hosted newer vs repo newer) for policy 28, constraint 14, and 22 function bodies: NOT ESTABLISHED; not classified one by one. Hosted-only objects (27 fns, 343 cols) are LIKELY legacy/manual and must not be dropped by any plan. Full data: evidence/cmp.json.

## 5. Root causes confirmed
- Registration failure: hosted `kayad_register_identity_atomic` is a placeholder raising 2F005 (CONFIRMED on hosted and reproduced on replica).
- Hidden command-centre figures: four tables absent on hosted — marketplace_offers, marketplace_offer_settlements, auction_outcomes, dealer_listing_lifecycle_events (CONFIRMED). Service marks them `unavailable` by design; panel hides rather than shows zero.
- Dealer listing creation: 4-arg `kayad_create_dealer_listing_atomic` missing on hosted (CONFIRMED); failing in production is LIKELY if the deployed backend includes PR #265.
- Hosted logs show backend queries to missing objects (error_budgets, kayad_owner_snapshot, disputes, kayad_claim_chat_outbox, bids.bid_count). Note `escrows.warningSent` exists on both; a `warning_sent` reference is a code/schema naming mismatch (LIKELY, not re-traced).

## 6. Rehearsal results (STRUCTURAL + synthetic functional; evidence/rehearsal-results.txt)
Stage 1 `20261122200000_restore_register_identity_atomic`: all checks PASS (user/dealer registration, duplicate email rejected, privileged role rejected, anon/authenticated denied, service_role allowed, no partial rows). Full-catalog diff: exactly 1 object changed (the function). Financial objects untouched.
Stage 2 `20261122120000_listing_creation_idempotency`: all PASS (single 4-arg function, old 3-arg call compat, replay idempotent, key reuse with different payload rejected, owner isolation, atomic rollback, 6 concurrent requests -> 1 row, immutability trigger). Diff: 8 objects, all on cars/listing function; no financial objects.
Both are VERIFIED on the replica only. NOT production-verified.

## 7. What fails / must not be done (CONFIRMED on replica)
- Blanket replay of the 88 post-0922 migrations: stops at `20261002180000_escrow_live_operations_hardening` (hosted `escrow_audits` shape drift) after 16 financial-touching migrations already applied. Continuing past it (push_all) overwrites 14 financial/auction function bodies and drops/replaces the hosted listing fn signature; stopping at the failure still changes 5 (mark_dealer_payout, post_ledger_entry, resolve_dispute, transition_escrow, verify_escrow_funding). => Do NOT run `supabase db push` against production.
- Offers chain: `20261110120000` OK, `20261121090000` OK, `20261121110000_offer_settlement_binding` FAILS (needs `purchase_outcomes`, absent on hosted); fails atomically under `psql -1`, no partial state.
- Auction outcomes need `auction_setups` and a longer chain: BLOCKED.

## 8. Not performed (NOT TESTED)
Phase 7 full DB journeys, Phase 8 financial/security regression with PostgREST on the replica, real email delivery, production behaviour, load/concurrency beyond 6 requests, any financial workflow. Backend unit suite (local, mocked, not DB): 254 suites / 4,216 tests pass — mocked evidence only.

## 9. CI (Phase 9)
PR 266 "DB Journeys" fails after ~1m; cause NOT ESTABLISHED (log inaccessible to sandbox). Workflow header says it had never run on GitHub. Need log text (`failed.txt`).

## 10. Release risks
- No backup / PITR on a "Production" project: any DDL has no restore point. (CONFIRMED)
- Deployed backend target unconfirmed (LIKELY this project).
- Live traffic exists; backend newer than schema.

## 11. Proposed production reconciliation (PREPARE ONLY — nothing executed)
Order by independence, each its own approved change with rollback note:
1. Take a recovery point (manual pg_dump via owner or upgrade for PITR) — prerequisite.
2. Stage 1 migration (registration) — single-function replace; rehearsed.
3. Stage 2 migration (listing idempotency) — rehearsed; DROP of 3-arg overload is compatible with old app (tested).
4. Offers/lifecycle tables (command-centre, non-financial) — needs an offer chain without `purchase_outcomes` dependency; not yet rehearsed past 20261121090000.
5. Settlements / auction outcomes / financial drift — separate financial-owner review; hosted functions are NOT to be overwritten to match repo until direction of drift is established.

## 12. Blockers
B1 no backup; B2 financial-function drift direction unknown; B3 settlements need purchase_outcomes; B4 auction needs auction_setups; B5 CI log; B6 deployed-backend target; B7 original login problem unclarified; B8 BREVO_FROM_NAME (render.yaml says KAYAD).

## 13. Approvals required (exact)
A1 recovery point taken/confirmed. A2 explicit go for Stage 1 on production (single migration file, named). A3 explicit go for Stage 2. A4 decision on offers/lifecycle chain scope (I can prepare a reduced, non-financial migration for rehearsal). A5 financial owner decision on drift (no change by me). A6 supply failed.txt for CI. A7 confirm which backend deploy points to this project. I will not proceed on any of these without a separate instruction.

## 14. Project files
No project source files changed in this phase, so no new project ZIP. The latest combined ZIP (640ed7db…) remains the current one. Scratch DBs `kayad_test_*` exist only in the sandbox.
