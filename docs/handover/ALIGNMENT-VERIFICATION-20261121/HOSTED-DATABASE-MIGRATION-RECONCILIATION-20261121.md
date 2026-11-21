# Hosted Database Migration Reconciliation (ASSESSMENT ONLY) - 2026-11-21

**Scope and authority.** Read-only. The hosted project (KAYAD EA, `ubvgixwhfybbyjuvxboj`) was queried with `SELECT` statements against the catalog only. No hosted write, no `apply_migration`, no production data change was made or is authorised. All write-side work was done on disposable local PostgreSQL 16 databases.

## 1. Two different questions - do not conflate them

| Question | Source | Answer |
|---|---|---|
| Which migrations does the hosted project RECORD as applied? (history) | `supabase_migrations` tracking via `list_migrations` | Tracking ends at **20260922060457**. |
| Which migration OBJECTS actually exist in the hosted schema? (schema inspection) | `information_schema` / `pg_catalog` probes (`probe_agg.sql`) | See section 3. Many objects exist that the history does not record. |

The repository holds **202 migrations at the audited `main` (6eb7c98)**; **79** sort after the last hosted record. This phase adds one more (`20261121090000_offer_action_replay_lookup_fix.sql`, section 6), so **80** sort after the last hosted record in the working tree. **It is NOT true that all 79 are missing.** The history is behind; the schema is behind in places and ahead of the history in others.

## 2. Method and its limits (read before trusting the table)

* For each of the 79 migrations the probe extracted the objects it creates or alters that can be located in a catalog (tables, columns, functions, indexes, triggers, policies, constraints) and checked each on the hosted database.
* Classification: **PRESENT** = every probed object exists; **ABSENT** = none exists; **PARTIAL** = some exist; **NO-OBJECTS** = the migration only changes grants, RLS enablement, data or settings, so there is nothing to probe and **the status is UNKNOWN, not "applied"**.
* **PRESENT/PARTIAL are decided by object presence, not by function-body or definition equivalence.** 17 functions are defined by several migrations (section 4); a function existing on hosted does not say which revision of it is installed. Treat PRESENT as "needs definition-level comparison", not "verified applied".
* Hosted data was not read. Row-level preconditions (duplicates that would break a new unique index, for example) are NOT TESTED.

## 3. Result for the 79 migrations after the last hosted record

Totals: **42 ABSENT, 11 PARTIAL, 15 PRESENT, 11 NO-OBJECTS** (= 79).

| # | Migration | Objects present/probed | Class |
|---|---|---|---|
| 1 | `20260926100000_top_notice_board_animation.sql` | 0/4 | ABSENT |
| 2 | `20260926110000_hero_premium_media_layout.sql` | 0/4 | ABSENT |
| 3 | `20260926123000_platform_config_hero_vehicle_selection.sql` | 0/2 | ABSENT |
| 4 | `20260928123600_live_communications_activation_alignment.sql` | 0/0 | NO-OBJECTS |
| 5 | `20260929100000_production_service_role_runtime_integrity.sql` | 1/1 | PRESENT |
| 6 | `20260930110000_advanced_identity_session_hardening.sql` | 12/12 | PRESENT |
| 7 | `20260930111500_advanced_communication_idempotency.sql` | 4/4 | PRESENT |
| 8 | `20260930112000_identity_email_normalization.sql` | 0/1 | ABSENT |
| 9 | `20260930113000_communication_state_machine_hardening.sql` | 1/1 | PRESENT |
| 10 | `20261001090000_registration_onboarding_integrity.sql` | 4/7 | PARTIAL |
| 11 | `20261001220000_database_contract_alignment.sql` | 0/4 | ABSENT |
| 12 | `20261001223000_inspection_provider_identity_integrity.sql` | 0/2 | ABSENT |
| 13 | `20261002090000_financial_audit_routing_rls_hardening.sql` | 0/0 | NO-OBJECTS |
| 14 | `20261002120000_high_risk_boundary_hardening.sql` | 0/2 | ABSENT |
| 15 | `20261002130000_runtime_convergence_financial_locks.sql` | 1/1 | PRESENT |
| 16 | `20261002150000_escrow_business_integrity_sweep.sql` | 4/7 | PARTIAL |
| 17 | `20261002180000_escrow_live_operations_hardening.sql` | 3/8 | PARTIAL |
| 18 | `20261002190000_auction_setup_publication_contract.sql` | 0/7 | ABSENT |
| 19 | `20261002193000_auction_bidder_registration_eligibility.sql` | 0/7 | ABSENT |
| 20 | `20261002210000_auction_bidding_room_lock.sql` | 0/1 | ABSENT |
| 21 | `20261002220000_auction_settlement_platform_policy.sql` | 0/6 | ABSENT |
| 22 | `20261002230000_auction_post_fulfilment_exception_engine.sql` | 0/7 | ABSENT |
| 23 | `20261002240000_marketplace_purchase_fulfilment_convergence.sql` | 1/9 | PARTIAL |
| 24 | `20261002240100_marketplace_purchase_settlement_mode_correction.sql` | 1/1 | PRESENT |
| 25 | `20261003090000_hero_commercial_placement.sql` | 0/4 | ABSENT |
| 26 | `20261003100000_platform_config_hero_presentation_and_card_content.sql` | 0/2 | ABSENT |
| 27 | `20261003113000_hero_visual_marketing_controls.sql` | 0/1 | ABSENT |
| 28 | `20261003120000_hero_visual_balance_cleanup.sql` | 0/0 | NO-OBJECTS |
| 29 | `20261004110000_hero_clean_assets_and_mobile_balance.sql` | 0/0 | NO-OBJECTS |
| 30 | `20261006150000_inspection_qa_report_versions.sql` | 0/5 | ABSENT |
| 31 | `20261006230000_escrow_live_settlement_completion_hardening.sql` | 0/1 | ABSENT |
| 32 | `20261006240000_escrow_marketplace_reconciliation_hardening.sql` | 0/2 | ABSENT |
| 33 | `20261007120000_auction_rule_authority_convergence.sql` | 4/5 | PARTIAL |
| 34 | `20261007170000_auction_bid_mutation_boundary.sql` | 0/0 | NO-OBJECTS |
| 35 | `20261007180000_auction_financial_integrity_phase_a.sql` | 2/15 | PARTIAL |
| 36 | `20261007190000_auction_winner_payment_deadline_lock.sql` | 0/2 | ABSENT |
| 37 | `20261007200000_inspection_domain_rls_enable.sql` | 0/0 | NO-OBJECTS |
| 38 | `20261008120000_escrow_seller_capability_authority.sql` | 2/3 | PARTIAL |
| 39 | `20261008150000_platform_config_navigation.sql` | 0/1 | ABSENT |
| 40 | `20261009120000_automotive_services_governance.sql` | 1/10 | PARTIAL |
| 41 | `20261009130000_escrow_custody_binding_and_purchase_eligibility.sql` | 2/2 | PRESENT |
| 42 | `20261009150000_support_resolution_hardening.sql` | 0/12 | ABSENT |
| 43 | `20261010130000_kayad_slate_teal_theme_convergence.sql` | 0/0 | NO-OBJECTS |
| 44 | `20261010193000_chat_message_idempotency.sql` | 0/3 | ABSENT |
| 45 | `20261011090000_users_security_state_columns.sql` | 1/1 | PRESENT |
| 46 | `20261011091000_chat_idempotent_append_ordering_and_replay.sql` | 0/1 | ABSENT |
| 47 | `20261011092000_idempotency_audit_logs.sql` | 1/3 | PARTIAL |
| 48 | `20261011093000_revoke_client_execute_on_kayad_rpcs.sql` | 0/0 | NO-OBJECTS |
| 49 | `20261011093100_enable_rls_remaining_public_tables.sql` | 0/0 | NO-OBJECTS |
| 50 | `20261011100000_chat_message_outbox.sql` | 0/9 | ABSENT |
| 51 | `20261011120000_client_role_least_privilege.sql` | 0/0 | NO-OBJECTS |
| 52 | `20261011121000_profiles_role_sync_repair.sql` | 0/2 | ABSENT |
| 53 | `20261011130000_cars_click_counter.sql` | 1/2 | PARTIAL |
| 54 | `20261011210000_support_faq_content_and_seed.sql` | 0/1 | ABSENT |
| 55 | `20261011220000_ledger_signed_balance_rebuild.sql` | 1/1 | PRESENT |
| 56 | `20261012103000_home_hero_showcase_pair_and_mobile_composition.sql` | 0/0 | NO-OBJECTS |
| 57 | `20261012140000_dealer_onboarding_columns_r12.sql` | 1/1 | PRESENT |
| 58 | `20261012140100_dealer_verification_suspended_status_r14.sql` | 1/1 | PRESENT |
| 59 | `20261020160000_private_seller_auction_custody_contract.sql` | 0/8 | ABSENT |
| 60 | `20261020170000_private_seller_auction_gate_enforcement.sql` | 4/38 | PARTIAL |
| 61 | `20261020180000_garage_organization_branch_membership.sql` | 0/41 | ABSENT |
| 62 | `20261025100000_private_seller_capability.sql` | 0/2 | ABSENT |
| 63 | `20261025113000_private_seller_listing_visibility.sql` | 0/4 | ABSENT |
| 64 | `20261025130000_private_seller_listing_visibility_hardening.sql` | 0/4 | ABSENT |
| 65 | `20261026100000_admin_alerts.sql` | 0/3 | ABSENT |
| 66 | `20261101120000_visitor_analytics.sql` | 11/11 | PRESENT |
| 67 | `20261101200000_site_designs.sql` | 0/4 | ABSENT |
| 68 | `20261102120000_dealer_team_custom_roles.sql` | 3/3 | PRESENT |
| 69 | `20261104120000_auction_wallet_refunds_dealer_custody.sql` | 0/13 | ABSENT |
| 70 | `20261104150000_auction_engagement.sql` | 0/13 | ABSENT |
| 71 | `20261106120000_featured_campaigns.sql` | 0/5 | ABSENT |
| 72 | `20261110120000_canonical_offer_negotiation_workflow.sql` | 0/7 | ABSENT |
| 73 | `20261110130000_inspection_payment_reject_cancelled_bookings.sql` | 1/1 | PRESENT |
| 74 | `20261110140000_private_seller_free_access_defaults.sql` | 1/1 | PRESENT |
| 75 | `20261112090000_dealer_business_name_uniqueness.sql` | 0/4 | ABSENT |
| 76 | `20261114130000_auction_atomic_reaward.sql` | 0/1 | ABSENT |
| 77 | `20261115120000_auction_financial_reaward_integrity.sql` | 0/4 | ABSENT |
| 78 | `20261116120000_personal_listing_lifecycle_atomic.sql` | 0/4 | ABSENT |
| 79 | `20261117090000_personal_listing_lifecycle_role_gate.sql` | 0/1 | ABSENT |

### Reading the pattern
* **Out-of-order / out-of-band application exists.** Migrations such as `20260930110000_advanced_identity_session_hardening` (12/12), `20261101120000_visitor_analytics` (11/11) and `20261102120000_dealer_team_custom_roles` (3/3) are fully present but unrecorded, while earlier-versioned ones are absent (`20260930112000_identity_email_normalization` 0/1). Applying `supabase db push` blindly will therefore try to re-run objects that already exist.
* **11 PARTIAL migrations** (for example `20261020170000_private_seller_auction_gate_enforcement` 4/38, `20261007180000_auction_financial_integrity_phase_a` 2/15, `20261009120000_automotive_services_governance` 1/10) mean a later revision may have superseded part of the object set, or application stopped part-way. Which one is not decidable from presence alone. **BLOCKED pending a definition-level diff on a staging copy.**
* Whole product areas are absent on hosted: canonical offers (`20261110120000`), personal listing lifecycle (`20261116120000`, `20261117090000`), garage/organisation (`20261020180000`, 0/41), auction wallet/refunds and engagement (`20261104*`), featured campaigns, support-resolution hardening, chat outbox. Code on `main` that depends on these cannot work against the current hosted schema.

## 4. Dependencies, ordering, duplicates and superseded definitions

**Ordering evidence (local, disposable).** The repository chain was built from empty on PostgreSQL 16 in strict version order: 188 migrations through `20261026100000`, 0 failures, 208 tables. The remaining 14 (`20261101120000` ... `20261117090000`) then applied cleanly in order (231 tables). All 79 post-hosted migrations were then **re-applied a second time with no error** (`recon-local.txt`, `recon-rerun.txt`), which shows they are re-runnable. This proves ordering and idempotency on a repo-built schema. **It does not prove they apply cleanly to the hosted schema**, whose partial/out-of-band state differs from the repo-built one.

**Functions defined by more than one migration (the last version in order must win):**

| Function | Defining migrations (version prefix) |
|---|---|
| `kayad_resolve_dispute_atomic` | 20260907190100, 20260909084443, 20260918100000, 20261002150000, 20261002180000 |
| `kayad_mark_inspection_settlement_paid_atomic` | 20260907190200, 20260918100000, 20260918144230, 20260920220000, 20260921134954 |
| `kayad_verify_escrow_funding_atomic` | 20260907150000, 20260909080841, 20261002150000, 20261009130000 |
| `kayad_transition_escrow_atomic` | 20260901210000, 20260905050000, 20261002150000, 20261002180000 |
| `kayad_settle_purchase_payment_atomic` | 20260902090000, 20261002240000, 20261002240100, 20261009130000 |
| `kayad_settle_bid_payment_atomic` | 20260902090000, 20260918100000, 20261007180000, 20261020170000 |
| `kayad_settle_auction_security_hold_atomic`, `kayad_reconcile_auction_security_holds_atomic` | 20261007180000, 20261104120000, 20261115120000 |
| `kayad_place_bid_atomic`, `kayad_auto_bid_atomic`, `kayad_confirm_bid_payment_atomic` | 20260901210000/20260905060000, 20261007120000, 20261007180000 / 20261020170000 |
| `kayad_append_chat_message_idempotent` | 20261010193000, 20261011091000, 20261011100000 |
| `kayad_register_identity_atomic` | 20261001090000, 20261110140000 |
| `kayad_offer_action` | 20261110120000 (defective), **20261121090000 (corrective, this phase)** |

**Superseded / iterative chains (apply as a set, never cherry-pick):** hero and platform-config sequence (`20260926100000`, `20260926110000`, `20260926123000`, `20261003090000` ... `20261004110000`, `20261012103000`); chat idempotency (`20261010193000` -> `20261011091000` -> `20261011100000`); purchase settlement (`20261002240000` -> `20261002240100`); auction financial chain (`20261002190000` ... `20261007190000`, `20261020160000`/`170000`, `20261104120000`, `20261114130000`, `20261115120000`); private-seller capability chain (`20261025100000` -> `113000` -> `130000`, `20261110140000`, `20261116120000`, `20261117090000`).

**Hard dependencies found:** `20261121090000` requires `20261110120000` (replaces its function); `20261116120000`/`20261117090000` (personal listing lifecycle) belong with the private-seller capability chain; `20261020170000` (38 objects) builds on `20261020160000` (custody contract, absent on hosted).

## 5. Risks and rollback requirements

| Risk | Where | Control required before any apply |
|---|---|---|
| Irreversible column removal | `20260930110000` drops the plaintext `refresh_tokens.token` column after making `token_hash` NOT NULL (the bearer credential is no longer stored). Irreversible; any row lacking a usable `token_hash` loses its session. Its objects already exist on hosted, so verify rather than re-run. | Confirm hosted state; never re-run blindly. |
| Constraints / unique indexes added on live data | 28 of the 79 add a constraint or unique index (for example `20261112090000_dealer_business_name_uniqueness`). Existing duplicates would abort the migration. | Run duplicate/violation pre-checks on a staging copy of hosted data; **NOT TESTED**. |
| Privilege tightening | `20261011120000` revokes TRUNCATE/REFERENCES/TRIGGER from client roles; `20261011093000` revokes client EXECUTE on `kayad_*` RPCs; `20261011093100` enables RLS on remaining public tables. Any client path using the anon key directly would break. | Staging regression of every frontend direct-Supabase call; confirm only the backend (service role) calls RPCs. |
| NO-OBJECTS migrations (11) are unknowable by presence | grants, RLS, settings | Compare `pg_policies`, `role_table_grants`, `pg_proc.proacl` against a repo-built schema. |
| Definition drift in multi-defined functions | section 4 | `pg_get_functiondef` diff on staging for all 17 functions. |
| No down-migrations | Only **9 of 79** files mention a rollback; none is an executable down script. | Take a point-in-time-recovery/backup snapshot immediately before; write compensating scripts for every migration actually applied; rehearse restore. |
| Financial paths | escrow, ledger, settlement and auction RPCs are in the set | Financial-controls owner sign-off; apply on staging first and re-run the escrow/ledger/auction regression suites. |

## 6. Defect found by this reconciliation work

`20261110120000_canonical_offer_negotiation_workflow.sql` defines `kayad_offer_action` with a replay lookup `marketplace_offers ... AND actor_id = p_actor_id`. `marketplace_offers` has no `actor_id` (it has `sender_id`; only `marketplace_offer_events` has `actor_id`). On a migrated database **every submit/counter/accept/reject/withdraw returned HTTP 400 `column "actor_id" does not exist`**. Because the migration is not on hosted, the correction is **forward-only** in a new migration, `20261121090000_offer_action_replay_lookup_fix.sql`: byte-identical function except the lookup uses `sender_id`; privileges re-asserted. Guarded by `scripts/validate-offer-action-function-columns.mjs` and proven end to end by `evidence/journeys/j4_offers.mjs` (section "Offers" of the main report). **It has NOT been applied anywhere except disposable local databases.**

## 7. Disposable local database results

| Check | Result | Status |
|---|---|---|
| 188-migration chain from empty, version order | 0 failures, 208 tables | VERIFIED (local) |
| 14 remaining migrations applied in order | all OK, 231 tables | VERIFIED (local) |
| All 79 post-hosted migrations re-applied twice | all OK both runs | VERIFIED (local) |
| New corrective migration applied to a migrated DB | OK; offers journey passes | VERIFIED (local) |
| Apply to the hosted schema as it really is | not attempted (not authorised) | NOT TESTED |
| Supabase CLI local stack (`supabase start`) | Docker/CLI unavailable in this workspace | BLOCKED |

## 8. Staging verification requirements (gate before any production application)

1. Create a staging project from a hosted backup (not from the repo).
2. Record `list_migrations`; snapshot `pg_get_functiondef` for the 17 multi-defined functions, `pg_policies`, `role_table_grants`, `pg_proc.proacl`.
3. Run the duplicate/violation pre-checks for the 28 constraint/index migrations against staging data.
4. Apply the 80 migrations in version order with `ON_ERROR_STOP`; for out-of-band ones, mark as applied only after a definition-level diff proves equivalence.
5. Diff the resulting schema against a repo-built schema; any difference is a blocker.
6. Run backend jest/vitest/node suites and the validators with the staging service key; run the journey scripts (`evidence/journeys/`) against staging.
7. Rehearse the rollback (restore from snapshot) and record the time taken.
8. Obtain explicit written authorisation before any production step.

**Recommendation: do not apply anything to production.** Database readiness is **BLOCKED** until sections 7-8 are complete.
