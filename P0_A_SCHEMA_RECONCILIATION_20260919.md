# P0-A Schema Reconciliation — 2026-09-19

This artifact is based on the supplied `KAYAD-main (6).zip` and preserves the existing application architecture.

## Completed

- Reconciled production-reachable operational model mappings against the canonical Supabase schema.
- Added the missing operational tables required by currently mounted production routes:
  - transactions
  - market_data
  - marketplace_health
  - conversion_funnels
  - escrow_anomalies
  - escrow_risk_scores
  - escrow_audits
  - auction_integrity_flags
  - auction_risk_profiles
  - contacts
  - ntsa_verification_requests
  - inspector_applications
  - idempotency_audit_logs
  - job_failures
  - bid_logs
  - sms_bidders
  - dealer_health_scores
  - dealer_analytics
  - notification_audit
- Enabled RLS on those tables and removed `anon`/`authenticated` table privileges. Backend service-role access remains available.
- Reconciled existing model names to the actual canonical live tables:
  - Partner -> partner_organizations
  - Webhook -> webhook_configs
  - Plugin -> integration_plugins
  - APIKey -> api_credentials
  - Campaign -> marketing_campaigns
  - Inspector -> inspection_staff
  - Inspection -> vehicle_inspections
  - DealerProfile -> dealers
- Removed four duplicate implementations that had regressed into the supplied ZIP:
  - `src/services/dealerPlatformApi.js`
  - `src/features/SupportView/components/SupportView.tsx`
  - `src/features/SupportView/components/SupportFAQ.tsx`
  - `src/features/DealersView/components/DealersView.tsx`
- Added `scripts/validate-p0a-schema-contract.mjs`.
- Added `contracts/p0a-schema-manifest.json`.
- Added npm script `validate:p0a-schema-contract`.
- Added an explicit production boundary for unreconciled platform-extension route families. Those routes are disabled unless `ENABLE_PLATFORM_EXTENSION_ROUTES=true` is explicitly provisioned. This prevents dormant extension models from becoming accidental production database dependencies.
- Existing P0 hardening and financial failure-mode gates remain intact.

## Validation performed on the artifact

- P0-A schema contract: PASS
- P0 hardening static gate: PASS
- P0 financial failure-mode gate: PASS (12/12)
- Wave 3 convergence: PASS
- OpenAPI route governance: PASS (1112/1112)

The full npm dependency install/build/test gate was not claimed from the build environment because the uploaded project's `node_modules` was incomplete and the available runner was on Node 22.16.0 while the project requires Node >=22.22.2. The user-side gate must therefore be run with Node 22.22.2 after extraction.

## Supabase verification

The production KAYAD Supabase project `ubvgixwhfybbyjuvxboj` was updated with the reconciliation schema. A live information-schema verification returned all 19 required operational tables. Security-advisor output continues to show only the expected `rls_enabled_no_policy` informational class for service-only tables; the new tables are intentionally not exposed to `anon` or `authenticated`.

Do not set `ENABLE_PLATFORM_EXTENSION_ROUTES=true` until those extension domains receive their own canonical schemas and end-to-end certification.
