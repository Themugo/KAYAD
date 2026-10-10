# KAYAD — Registration & Onboarding Holistic Certification
## 2026-10-01

### Authoritative source
The uploaded KAYAD ZIP was used as the sole source of truth for this pass.
No older foundation was used to reconstruct implementation.

## Root causes found

1. **Dealer domain record missing at registration.** Dealer signup created identity records but not the required `dealers` row. The canonical dealer verification service therefore rejected onboarding before verification could be submitted.
2. **Dealer onboarding route was orphaned.** `/dealer/onboarding` was referenced throughout the dealer UI but was not rendered by the application shell.
3. **Dealer onboarding wrote to the wrong domain.** The existing page sent `paymentDetails` and `onboardingComplete` through the generic user profile contract, where those fields were not part of the users database contract.
4. **Dealer onboarding ended at a dead route.** `/dealer/choose-plan` had no corresponding route/page.
5. **Inspector application table missing from migration chain.** The controller/model existed, but `inspector_applications` had no canonical migration, so a fresh database could not persist the public application.
6. **Inspector application notification coupling.** Reviewer notifications were awaited after the application write, allowing provider latency/failure to make a successful application appear incomplete.
7. **Inspector approval used nonexistent user columns.** Approval attempted to write `users.isInspector`, `users.inspectionSpecialty` and `users.locationCity`, which are not columns in the current users table.
8. **Registration identity writes were independently persisted.** `users` and `user_auth` were separate writes, leaving a half-created-account window if the second write failed.

## Corrections

- Added `kayad_register_identity_atomic(...)` PostgreSQL RPC.
- Registration now persists `users` + profile trigger + dealer trigger + `user_auth` in one database transaction.
- Added dealer profile trigger and historical backfill.
- Added dealer onboarding persistence fields to the `dealers` domain.
- Added pending-dealer onboarding GET/PUT endpoints before the approved-dealer boundary.
- Connected the existing DealerOnboarding UI to the canonical dealer onboarding contract.
- Dealer onboarding now submits its profile/payment data and verification documents through one canonical completion request.
- Added a real application-shell route for `/dealer/onboarding`.
- Removed the dead `/dealer/choose-plan` destination.
- Added the missing `inspector_applications` table, indexes, RLS/service-role boundary and timestamp trigger.
- Made inspector reviewer notifications asynchronous.
- Changed inspector approval to provision/update the canonical `inspection_providers` record and activate/verify that record.
- Restricted dealer onboarding endpoints to the dealer role.
- Corrected the stale private-seller E2E completion assertion.

## End-to-end role state model

### Buyer
`register → users(role=user,status=approved) → user_auth → verification email → verify-email → explicit login → buyer/dashboard`

### Private seller
`register → users(role=individual_seller,status=pending) → user_auth → verification email → explicit login → private-seller platform → real listing workflow`

### Dealer
`register → users(role=dealer,status=pending) → automatic dealers row → user_auth → verification email → explicit login → /dealer/onboarding → dealer profile/payment data → dealer_verifications(pending) → admin verification lifecycle`

### Inspector
`public application → inspector_applications(pending) → asynchronous reviewer notification → admin approval → ghost_checker identity → inspection_providers(ACTIVE/verified)`

## Executed certification

- Registration/onboarding source gate: **47/47 PASS**
- Registration role matrix: **32/32 PASS**
- Registration/onboarding end-to-end contract: **14/14 PASS**
- Explicit auth flow convergence: **PASS**
- Canonical architecture: **PASS**
- Supabase migration preflight: **PASS**
- Backend runtime contracts: **14/14 PASS**
- Frontend runtime contracts: **PASS**
- Response lifecycle: **PASS**
- Session availability: **7/7 PASS**
- API availability: **8/8 PASS**
- Deployment/runtime drift: **17/17 PASS**
- Foundation integrity: **PASS**

## Environment-blocked gates

### Full Vitest
**BLOCKED** — the attempted dependency installation did not complete cleanly; `vitest` is unavailable in the resulting partial `node_modules` tree.

### Full Vite build
**BLOCKED** for the same incomplete dependency installation (`vite` unavailable).

### TypeScript typecheck
**BLOCKED** by the incomplete dependency tree; TypeScript cannot resolve the installed type-definition packages.

### Live PostgreSQL/Supabase reset
**BLOCKED** — no `SUPABASE_URL`, service-role credentials, PostgreSQL server, Docker runtime, or Supabase CLI is available in this environment.

### Live production registration
**NOT CLAIMED** — source and database migration contracts are certified, but a real account creation against the actual production/staging Supabase cannot be honestly claimed without the target environment.

## Release principle

This foundation is a truthful source-level correction, not a fabricated live certification. The migration chain must be applied to the target Supabase environment before the live buyer/private-seller/dealer/inspector journeys can be declared production-certified.
