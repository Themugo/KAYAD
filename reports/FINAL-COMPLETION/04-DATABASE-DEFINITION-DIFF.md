# 04 — Database Definition Diff (hosted vs repository-built)

**Status label: VERIFIED for what was compared; NOT a staging rehearsal.**
Comparison date: 2026-11-22. Method: repository migration chain (210 files, including the new `20261122120000_listing_creation_idempotency.sql`) applied in order to a disposable Postgres 16 (`kayad_ref`, 0 failures, 233 `public` tables) versus the hosted project "KAYAD EA" read through **read-only SELECT queries only** (no DDL, no migration, no data write on hosted).

Fingerprint = first 6 hex chars of md5 over a deterministic textual dump of each class (columns incl. type/nullability/default; constraints; indexes; RLS policies; triggers) per table, and of `pg_get_functiondef` per function. Raw outputs: `evidence/def/` (queries `q_tables.sql`, `q_funcs.sql`; CSVs; `table_diff.json`, `func_diff.json`). A differing fingerprint proves *a difference exists*, not which side is "right"; column-level drill-down per table is listed as the first staging task (see 05).

## Classes compared / not compared
| Class | Compared? |
|---|---|
| Tables (existence) | YES |
| Columns, constraints (PK/UK/FK/CHECK), indexes, RLS policies, triggers — per table | YES (fingerprint) |
| Functions + bodies (`public`) | YES (fingerprint) |
| Grants / privileges, views, enums, extensions, sequences, storage buckets/policies, RLS-enabled flag, cron jobs | **NOT COMPARED** — query set still to be run (prerequisite listed in 03) |

## Table-level result
| Measure | Count |
|---|---|
| Repo-built tables | 233 |
| Hosted tables | 213 |
| In both | 189 |
| In repo, **missing on hosted** | 44 |
| On hosted, **not in repo chain** | 24 |
| In both and identical in all five classes | 139 |
| In both and **differing** | 50 |

### Missing on hosted (44)
`admin_alerts`, `auction_comment_reports`, `auction_comments`, `auction_daily_visits`, `auction_follows`, `auction_fulfilment_events`, `auction_likes`, `auction_outcomes`, `auction_platform_policies`, `auction_registration_events`, `auction_registrations`, `auction_security_holds`, `auction_setup_amendments`, `auction_setups`, `auction_watch_peaks`, `chat_message_idempotency`, `chat_message_outbox`, `dealer_listing_counters`, `dealer_listing_lifecycle_events`, `dealer_payment_accounts`, `featured_vehicle_campaign_history`, `featured_vehicle_campaigns`, `hero_placements`, `hero_slides`, `marketplace_offer_events`, `marketplace_offer_settlement_events`, `marketplace_offer_settlements`, `marketplace_offers`, `personal_listing_lifecycle_events`, `private_seller_auction_evidence_events`, `private_seller_auction_proposals`, `private_seller_capabilities`, `private_seller_listing_visibility_events`, `provider_service_capabilities`, `purchase_outcomes`, `report_corrections`, `report_versions`, `site_design_publications`, `site_designs`, `vehicle_custody_capabilities`, `vehicle_custody_capability_events`, `wallet_transactions`, `wallet_withdrawals`, `wallets`

These cover auctions (setups, registrations, security holds, outcomes), marketplace offers & settlements, wallets/withdrawals, purchase outcomes, private-seller proposals/capabilities, hero/site design, chat outbox/idempotency, dealer listing counters & lifecycle events, report versions/corrections. Features depending on them cannot work on hosted until the chain is reconciled (OWNER DECISION D-20).

### On hosted but absent from the repository chain (24)
`admin_action_requests`, `admin_control_registry`, `admin_control_state`, `auction_integrity_flags`, `auction_risk_profiles`, `bid_logs`, `contacts`, `conversion_funnels`, `dealer_analytics`, `dealer_health_scores`, `escrow_anomalies`, `escrow_provider_integrations`, `escrow_risk_scores`, `inspection_commercial_config`, `inspection_provider_availability`, `inspection_provider_scorecards`, `inspection_report_downloads`, `job_failures`, `market_data`, `marketplace_health`, `notification_audit`, `ntsa_verification_requests`, `sms_bidders`, `transactions`

These were created outside the repository chain (the 38 hosted-only migration names recorded earlier). They must be inventoried before any reconciliation; **do not drop them**. Some (admin_* control plane, escrow_* risk, inspection_commercial_config) have matching hosted-only functions below.

### Common tables whose definitions differ (50)
| Table | Differing classes |
|---|---|
| `ad_slots` | columns, constraints, policies |
| `approval_rules` | constraints, policies |
| `audit_logs` | triggers |
| `bids` | indexes |
| `cars` | columns, constraints, indexes, triggers |
| `change_requests` | constraints, policies |
| `cms_faqs` | columns |
| `command_center_war_rooms` | policies |
| `country_rules` | policies |
| `dealer_payouts` | indexes |
| `dealers` | indexes |
| `decision_registers` | constraints, policies |
| `enterprise_standards` | constraints, policies |
| `escrow_audits` | columns, constraints, indexes, policies, triggers |
| `escrows` | indexes, triggers |
| `experiments` | policies |
| `feature_lifecycles` | constraints, policies |
| `governance_policies` | constraints, policies |
| `idempotency_audit_logs` | columns, indexes |
| `improvements` | policies |
| `innovation_ideas` | policies |
| `inspection_bookings` | columns, constraints, indexes, policies, triggers |
| `inspection_branches` | columns, constraints, indexes, policies, triggers |
| `inspection_disputes` | indexes |
| `inspection_packages` | columns, constraints |
| `inspection_providers` | columns, constraints, indexes |
| `inspection_refunds` | indexes |
| `inspection_reports` | columns, constraints, policies |
| `inspection_settlements` | policies |
| `inspection_staff` | columns, constraints, indexes, policies |
| `inspection_transactions` | indexes, policies |
| `inspector_applications` | columns, constraints, indexes, triggers |
| `notifications` | indexes |
| `otp_challenges` | constraints |
| `owner_vehicles` | triggers |
| `partner_requirements` | policies |
| `payments` | indexes, triggers |
| `platform_config` | columns, constraints |
| `profiles` | columns |
| `provider_credentials` | columns, constraints |
| `refunds` | indexes |
| `releases` | constraints, policies |
| `risk_assessments` | constraints, policies |
| `roadside_service_requests` | columns, constraints, indexes |
| `support_tickets` | columns, constraints, indexes, policies, triggers |
| `user_auth` | indexes |
| `users` | constraints, indexes, triggers |
| `vehicle_service_offerings` | columns, constraints, indexes |
| `webhook_events` | indexes |
| `website_settings` | columns |

Class totals: columns 19, constraints 25, indexes 24, policies 23, triggers 11 (tables may appear in several classes). Earlier column-level analysis found 58 columns missing on existing hosted tables (plus 37 columns via missing tables), 14 of 16 key triggers missing, and `uq_cars_owner_listing_number` absent on hosted `cars`.

## Function-level result (`public` schema)
| Measure | Count |
|---|---|
| Repo-built (includes `citext` extension operators installed in `public`) | 300 |
| Hosted | 96 |
| Same name+signature and identical body | 34 |
| Same signature, **body differs** | 35 |
| On hosted only (no repo counterpart at that signature) | 27 |
| In repo, missing on hosted (excl. extension noise listed separately) | see list |

**Bodies differ (35):** `governance_touch_updated_at`, `increment_car_views`, `kayad_append_dispute_evidence_atomic`, `kayad_apply_dealer_verification_atomic`, `kayad_auto_bid_atomic`, `kayad_bridge_inspection_execution`, `kayad_confirm_bid_payment_atomic`, `kayad_create_inspection_provider_application`, `kayad_expire_dealer_subscriptions_atomic`, `kayad_extend_auction_atomic`, `kayad_generate_inspection_settlement_atomic`, `kayad_get_or_create_inspection_chat`, `kayad_inspection_report_immutability_guard`, `kayad_mark_dealer_payout_atomic`, `kayad_mark_inspection_settlement_paid_atomic`, `kayad_open_dispute_atomic`, `kayad_place_bid_atomic`, `kayad_post_ledger_entry_atomic`, `kayad_prepare_dealer_payout_atomic`, `kayad_process_inspection_payment_atomic`, `kayad_process_inspection_refund_atomic`, `kayad_rebuild_ledger_balances`, `kayad_register_identity_atomic`, `kayad_resolve_dispute_atomic`, `kayad_rotate_refresh_token`, `kayad_settle_bid_payment_atomic`, `kayad_settle_purchase_payment_atomic`, `kayad_start_auction_atomic`, `kayad_submit_inspection_review_atomic`, `kayad_transition_dispute_atomic`, `kayad_transition_escrow_atomic`, `kayad_verify_escrow_funding_atomic`, `register_vehicle_identity`, `rls_auto_enable`, `sync_dealer_profile_from_user`

Includes money-moving functions (`kayad_transition_escrow_atomic`, `kayad_resolve_dispute_atomic`, `kayad_post_ledger_entry_atomic`, `kayad_place_bid_atomic`, `kayad_settle_*_payment_atomic`, `kayad_prepare_dealer_payout_atomic`, `kayad_mark_dealer_payout_atomic`, `kayad_rotate_refresh_token`). Behaviour on hosted therefore may differ from everything tested locally.

**Hosted-only signatures (27):** `kayad_add_inspection_dispute_evidence_atomic`, `kayad_add_service_job_dispute_evidence_atomic`, `kayad_admin_approve_action`, `kayad_admin_authorize_capability`, `kayad_admin_execute_auction_action`, `kayad_admin_execute_escrow_action`, `kayad_admin_execute_identity_action`, `kayad_admin_execute_listing_action`, `kayad_admin_execute_payment_action`, `kayad_admin_get_control_plane`, `kayad_admin_request_action`, `kayad_admin_resolve_inspection_dispute_atomic`, `kayad_admin_resolve_service_job_dispute_atomic`, `kayad_admin_set_control_state`, `kayad_admin_set_provider_status`, `kayad_audit_logs_append_only`, `kayad_create_dealer_listing_atomic`, `kayad_create_private_listing_atomic`, `kayad_create_support_ticket_atomic`, `kayad_escrow_eligibility`, `kayad_find_nearby_inspection_providers`, `kayad_get_inspection_quote`, `kayad_get_inspection_report_access`, `kayad_open_inspection_dispute_atomic`, `kayad_open_service_job_dispute_atomic`, `kayad_purchase_inspection_report_download`, `kayad_transition_service_job_atomic`

(`kayad_create_dealer_listing_atomic(uuid,jsonb,text)` appears here only because this work replaces it with a 4-argument form; see 01 and 07.)

**Missing on hosted, kayad/domain functions (109, extension operators excluded):** `apply_private_seller_listing_visibility`, `enforce_private_seller_listing_visibility`, `kayad__org_actor`, `kayad__org_audit`, `kayad__org_can_manage_member`, `kayad__org_fail`, `kayad__org_release_assignments`, `kayad__org_valid_scope`, `kayad_admin_correct_sold_listing`, `kayad_append_chat_message_idempotent`, `kayad_append_support_message`, `kayad_auction_engagement_counts`, `kayad_auction_engagement_insights`, `kayad_auction_refund_to_wallet_atomic`, `kayad_auction_setups_private_seller_backstop`, `kayad_branch_sync_active`, `kayad_cars_assign_listing_number`, `kayad_cars_creation_key_immutable`, `kayad_cars_listing_number_immutable`, `kayad_cars_private_seller_backstop`, `kayad_cars_sold_read_only`, `kayad_chat_notification_exists`, `kayad_chat_outbox_stats`, `kayad_claim_chat_outbox`, `kayad_complete_escrow_refund_atomic`, `kayad_create_dealer_listing_atomic`, `kayad_dealer_listing_lifecycle_atomic`, `kayad_default_auction_winner_atomic`, `kayad_ensure_dispute_refund_settlement_record`, `kayad_ensure_escrow_refund_payable`, `kayad_escrow_audit_immutable`, `kayad_escrow_listing_sale_guard`, `kayad_finish_chat_outbox`, `kayad_forfeit_auction_winner_security_holds_atomic`, `kayad_listing_manually_sold`, `kayad_lock_published_auction_setup`, `kayad_normalize_business_name`, `kayad_offer_action`, `kayad_offer_settlement_begin_payment`, `kayad_offer_settlement_cancel`, `kayad_offer_settlement_immutable`, `kayad_offer_settlement_log`, `kayad_offer_settlement_open`, `kayad_offer_settlement_outcome`, `kayad_offer_settlement_payment_guard`, `kayad_offer_settlement_payment_status`, `kayad_offer_settlement_sweep`, `kayad_org_booking_access`, `kayad_org_booking_assign`, `kayad_org_booking_route`, `kayad_org_booking_transition`, `kayad_org_branch_create`, `kayad_org_branch_set_status`, `kayad_org_branch_update`, `kayad_org_context`, `kayad_org_member_accept`, `kayad_org_member_change`, `kayad_org_member_confirm`, `kayad_org_member_invite`, `kayad_org_member_set_status`, `kayad_org_report`, `kayad_org_role_rank`, `kayad_personal_listing_lifecycle_atomic`, `kayad_policy_can_view_booking`, `kayad_policy_can_view_branch`, `kayad_policy_can_view_member`, `kayad_policy_org_role`, `kayad_private_seller_assert_eligible`, `kayad_private_seller_gate`, `kayad_private_seller_gate_batch`, `kayad_psap_append_only`, `kayad_psap_apply_event`, `kayad_psap_create`, `kayad_psap_event`, `kayad_psap_guard_writes`, `kayad_psap_partner_in_good_standing`, `kayad_psap_provider_ids`, `kayad_psap_touch_updated_at`, `kayad_purge_chat_outbox`, `kayad_reaward_auction_outcome_atomic`, `kayad_reconcile_auction_security_holds_atomic`, `kayad_reconciliation_issue_rows`, `kayad_record_auction_visit`, `kayad_record_auction_watch_peak`, `kayad_settle_auction_security_hold_atomic`, `kayad_settle_auction_winner_payment_atomic`, `kayad_settlement_listing_sale_guard`, `kayad_start_scheduled_auction_atomic`, `kayad_support_append_message`, `kayad_support_assign_ticket_number`, `kayad_support_create_case`, `kayad_support_is_staff_user`, `kayad_support_metrics`, `kayad_support_rate_case`, `kayad_support_transition_allowed`, `kayad_support_update_case`, `kayad_sync_purchase_outcome_from_escrow`, `kayad_transition_purchase_outcome_atomic`, `kayad_validate_inspection_booking_transition`, `kayad_validate_owner_vehicle_passport`, `kayad_vcc_apply`, `kayad_wallet_request_withdrawal_atomic`, `kayad_wallet_withdrawal_result_atomic`, `prevent_late_auction_registration`, `sync_profile_role_from_user`, `update_auction_outcome_updated_at`, `update_auction_registration_updated_at`, `update_auction_security_hold_updated_at`, `update_auction_setup_updated_at`

## Conclusions
1. Hosted is **not** equivalent to the repository chain. Triggers/functions the code relies on (listing numbering, sold-listing guards, offer settlement, wallet, auction) are absent or different.
2. Local success (journeys, Jest, Vitest) proves the repository chain, **not** hosted.
3. No hosted-ready claim is made. Required before any: staging clone of hosted, remaining classes compared, ordered rehearsal (05), rollback rehearsal (06).
4. Caveat: fingerprints depend on identical Postgres major version formatting; a hosted/local version mismatch could produce cosmetic function-body differences. Confirm hosted `server_version` during drill-down.
