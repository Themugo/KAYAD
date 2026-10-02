# KAYAD Registration + Onboarding End-to-End Correction — 2026-10-01

## Root causes found in the uploaded foundation

1. Dealer registration created `users` and `user_auth` but did not create the required `dealers` domain row. The existing verification service therefore rejected the first dealer onboarding submission with `Dealer profile required before verification`.
2. The existing `/dealer/onboarding` page was orphaned from the application shell; its route was not rendered by `App.tsx`.
3. Dealer onboarding submitted `paymentDetails` and `onboardingComplete` through the generic auth profile schema, which stripped those unknown fields because the database contract did not contain them on `users`.
4. Dealer onboarding navigated to `/dealer/choose-plan`, but no such route or page exists in the current source.
5. The public inspector application controller depended on the `inspector_applications` model, but the migration chain contained no canonical `inspector_applications` table.
6. Inspector reviewer notifications were awaited after the application write, allowing notification latency/failure to make a successful application appear incomplete.
7. Registration used two independent identity inserts (`users` then `user_auth`), leaving a failure window between them; the new database RPC makes those identity writes atomic.

## Corrections

- Added `kayad_register_identity_atomic(...)` PostgreSQL function and changed registration to use it.
- Added dealer-profile creation trigger/backfill for dealer accounts.
- Added dealer-domain onboarding fields (`bio`, `payment_details`, `onboarding_complete`, `onboarding_completed_at`).
- Added authenticated pending-dealer onboarding GET/PUT routes before the approved-dealer boundary.
- Connected the existing DealerOnboarding page to those routes.
- Made dealer verification submission part of the canonical onboarding completion request.
- Removed the dead `choose-plan` destination; completion returns through the real KAYAD shell.
- Added the missing `inspector_applications` table, indexes and service-role grants.
- Made inspector reviewer notifications non-blocking.
- Corrected the private-seller E2E completion assertion.

## Certification boundary

Source-level validation is executable in the isolated environment. Full npm/Vitest/build and live database reset certification still require Node `>=22.22.2` plus a reachable Supabase project with the production environment variables.
8. Inspector approval also contained a second database-model mismatch: it attempted to write non-existent `users.isInspector`, `users.inspectionSpecialty` and `users.locationCity` fields. Approval now provisions the canonical `inspection_providers` record and activates/ verifies it there.

## End-to-end role contracts

- Buyer: account -> user role -> approved base status -> email verification -> explicit login.
- Private seller: account -> individual_seller role -> pending seller status -> email verification -> explicit login -> real seller platform/listing path.
- Dealer: account -> dealer role -> dealer domain row -> email verification -> explicit login -> pending dealer onboarding -> dealer profile/payment data -> dealer verification record -> admin approval lifecycle.
- Inspector: public application -> durable inspector_applications row -> reviewer notification asynchronously -> admin approval -> ghost_checker identity -> canonical inspection_providers record.
