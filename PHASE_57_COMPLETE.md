# KAYAD Phase 57 — Dealer Settings & Subscription Authority

## Status
Complete. This phase hardens dealer settings and subscription surfaces against fabricated state and unsupported schema.

## Production contract
- Dealer profile updates are now persisted through the real `users` table and, when present, the real `dealers` record for dealer business name/location.
- Dealer profile updates are owner-scoped to the authenticated dealer ID.
- Dealer approval is read from the canonical `dealers.approved` field rather than an invented `users.approved` field.
- The dealer-platform subscription endpoint no longer returns a fabricated plan, price, usage, billing date, invoice history, or upgrade options.
- The general subscription controller no longer creates a default starter subscription or exposes hardcoded plan definitions.
- Dealer subscription operations return deterministic `501 DEALER_SUBSCRIPTION_UNAVAILABLE` until an authoritative subscription schema/contract exists in migrations.
- Dealer Settings only presents the business profile fields backed by the current production schema (`business_name`, `location`, `phone`, `bio`).
- Payment, notification, and exposure settings that lack a verified dealer-specific persistence contract are presented as unavailable instead of being stored in browser-only state or fabricated user columns.

## Explicit non-goals
- No `dealer_subscriptions` table was invented.
- No speculative migration was added.
- No demo data was added.
- No Supabase Auth conversion was introduced.
- No payment credentials were created or stored.

## Validation
Run from repository root:

```cmd
node scripts\validate-phase57.mjs
node --check backend\controllers\dealerPlatformController.js
node --check backend\controllers\subscriptionController.js
npm run lint
npm run build
```
