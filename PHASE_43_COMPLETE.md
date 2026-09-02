# KAYAD Phase 43 — Authoritative Seller Identity & Contact Hardening

## Objective
Remove fabricated seller identity/contact content from the vehicle detail path and consume the real seller relation already populated by the backend.

## Completed
- Extended the vehicle API seller relation to include real name, business name, avatar, phone, email, role, and approval timestamp.
- Mapped seller display name from the populated backend relation.
- Mapped seller avatar, phone, and email when actually returned.
- Derived seller type from the real seller role instead of `dealer_id` presence.
- Kept seller rating explicitly unavailable because this endpoint does not return an authoritative rating aggregate.
- Removed the fabricated hard-coded dealer phone number from the vehicle detail page.
- Removed the fabricated seller-description fallback.
- Added an honest unavailable-phone state when the backend has no seller phone.
- Added Phase 43 static validation.

## Non-goals
- No invented seller ratings.
- No new database tables or migrations.
- No Supabase Auth changes.
- No new external integrations.
- No fabricated seller records.

## Validation
Run:

```bat
npm run lint
npm run build
node scripts\validate-phase40.mjs
node scripts\validate-phase41.mjs
node scripts\validate-phase42.mjs
node scripts\validate-phase43.mjs
```
