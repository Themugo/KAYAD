# KAYAD Featured Campaign Governance — Implementation Pass 2

Date: 2026-11-16

## Changes made

1. Added `featuredCampaignPaymentMethods` to the existing `/api/admin/config` allowlist. It contains two independent booleans: `manualAllowed` and `automaticAllowed`.
2. The backend validates each value as a boolean and treats a missing setting as denied (`false`). The values flow through the existing PlatformConfig save and `auditAfterCommit` change-diff mechanism; no second settings store or permission model was added.
3. Added the two independent controls to the existing Admin Settings → Payments tab. The UI loads the saved values, submits them through the existing `adminAPI.updateConfig` call, and preserves the existing Daraja and bank settings.
4. Changed the Featured Vehicles page permission mapping from `MANAGE_PLATFORM` to `MANAGE_ADS`.
5. Changed the Featured Campaign API guard to use the existing `MANAGE_ADS` permission rather than a hard-coded admin/superadmin role list. This aligns backend access with the existing marketing/ad_manager roles and the frontend page guard.
6. Updated the featured campaign regression test's authorization mock and added marketing/ad_manager permission coverage.
7. Added `scripts/validate-featured-campaign-governance.mjs` to statically verify the configuration, default-deny behavior, audit path, UI controls and permission alignment.

## Validation performed

- `node --check backend/routes/featuredCampaignRoutes.js` — passed.
- `node --check backend/routes/adminRoutes.js` — passed.
- `node --check backend/tests/regression/featuredCampaigns.test.js` — passed.
- `node --check scripts/validate-featured-campaign-governance.mjs` — passed.
- `scripts/validate-featured-campaign-governance.mjs` — 10/10 passed.
- `scripts/validate-hero-admin-control.mjs` — passed; existing hero configuration controls remain intact.
- `scripts/validate-admin-navigation-page-coverage.mjs` — 34/34 passed.
- `scripts/validate-payment-gateway-lifecycle.mjs` — 13/13 passed.

## Not certified / remaining implementation boundary

This pass does **not** complete the featured-campaign payment transaction lifecycle. The source currently has no authoritative featured-campaign price rule, no campaign-to-`payments` linkage, no manual receipt submission/finance verification flow, and no callback settlement handler that marks a campaign paid. The new allow/deny values are therefore configuration controls only at this point; they do not yet gate live payment initiation or publish/unpublish campaigns. It would be unsafe to represent these controls as end-to-end operational until those paths are implemented and tested.

No fee was invented. Before the automatic and manual payment paths can be safely completed, KAYAD needs a defined source of truth for campaign pricing (for example, a fixed price table by duration or an authorised per-campaign amount), and a supported receipt-evidence storage/submission rule for manual payments. The payment transaction itself should then reuse the existing `payments`, `payment_events`, `payment_attempts`, `webhook_events`, Daraja callback and idempotency infrastructure.

## Environment limitations

- Root and backend `node_modules` are absent, so Jest/Vitest, lint, TypeScript and production build were not run.
- No live Supabase database, Daraja credentials or payment callback environment was available; no live migration, callback, manual reconciliation or production certification was performed.
- The extracted source tree has no `.git` directory; no commit, push or deploy was attempted.
