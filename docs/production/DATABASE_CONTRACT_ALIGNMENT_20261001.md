# KAYAD — DATABASE CONTRACT ALIGNMENT
## 2026-10-01

### Authoritative source
This report is based on the uploaded
`KAYAD-REGISTRATION-ONBOARDING-E2E-CERTIFIED-FOUNDATION-20261001.zip`.

The versioned `supabase/migrations/` chain remains the sole database deployment
source of truth. The legacy `backend/db/*.schema.sql` files are not a deployment
source and were not silently promoted to production schema authority.

## Objective
Align the existing application/database contract end-to-end without creating a
second persistence architecture or adding unrelated product functionality.

The audit traced:

Browser registration/onboarding
→ canonical API transport
→ CSRF
→ auth controller
→ atomic database identity function
→ users
→ profiles trigger
→ user_auth
→ dealer domain / inspector application domain
→ verification/communication delivery
→ onboarding state
→ RLS/service-role boundaries
→ migration chain.

## Root database findings fixed

### 1. Registration identity boundary
`kayad_register_identity_atomic()` is the canonical registration write path.
It creates `users` and `user_auth` in one PostgreSQL transaction, while existing
triggers create/synchronize the dependent profile/dealer identity.

### 2. Dealer domain convergence
Dealer registration now has a durable `dealers` row tied one-to-one to `users`.
Historical dealer identities are backfilled and a canonical unique index protects
the relationship.

### 3. Inspector application domain
`inspector_applications` is migration-backed with the fields consumed by the
public application and admin approval workflow. Pending applications are protected
against duplicate concurrent submissions by user and normalized email.

### 4. Inspector approval domain
Approval uses the canonical `inspection_providers` domain instead of attempting to
write nonexistent inspector-specific columns into `users`.

### 5. Required verification delivery
When email verification is required, registration now waits for provider
acceptance. A failed required verification delivery compensates the newly-created
identity using `users` deletion, with dependent `user_auth`/dealer/profile records
removed by their database relationships. Registration does not return a successful
account-completion response for an account that cannot enter the required
verification lifecycle.

When verification is not required, the existing non-blocking behavior remains.
Welcome email remains non-blocking.

### 6. Verification abuse boundary
Email verification and resend endpoints use the dedicated verification limiter in
addition to the existing auth limiter.

### 7. Hero persistence migration
The premium hero migration previously altered `hero_slides` without any base table
creation in the migration chain. The base `hero_slides` table is now established
before its premium presentation columns are altered.

### 8. Phase 22 migration dependency
`service_jobs` previously referenced `vehicle_service_offerings` and
`roadside_service_requests`, although those tables were absent from the migration
chain. Both existing reference domains are now migration-backed before
`service_jobs` is created.

No new UI or public API capability was added by this repair.

### 9. Communication delivery contract
The existing communication state machine already supports the `dead_letter`
terminal status. The alignment migration reasserts backend/service-role ownership
of delivery writes and preserves the existing RLS boundary.

### 10. Database contract regression validator
Added:

`npm run validate:database-contract-alignment`

It verifies required migration-backed tables, migration foreign-key references,
hero migration ordering, Phase 22 dependency ordering, registration RPC presence,
dealer one-to-one identity protection, inspector pending concurrency protection,
and communication terminal-state support.

## Database certification

### Source-level database gates

- Supabase migration preflight: PASS
- Migration dependency contract: 8/8 PASS
- Registration/onboarding source gate: 47/47 PASS
- Registration role matrix: 32/32 PASS
- Registration/onboarding E2E contract: 14/14 PASS
- C1–C5 security/identity convergence: 9/9 PASS
- Email-only launch contract: 11/11 PASS
- Email reliability contract: 8/8 PASS
- Backend runtime contracts: PASS
- Canonical architecture: PASS
- Response lifecycle: PASS
- Session availability: PASS
- Transaction integrity: PASS

## Full validator sweep

124 of 132 repository validators passed.

The remaining 8 are not being represented as database success/failure:

1. communications provider certification — required provider credentials are not
   present in this execution environment;
2. lead CRM — stale obsolete-wrapper validation still sees legacy model files;
3. live runtime — Supabase credentials are not present here;
4. local runtime — dependency installation is incomplete (`dotenv` unavailable);
5. phase 6 release — Node runtime is 22.16.0, while the project requires >=22.22.2;
6. release — TypeScript package is unavailable in the incomplete dependency tree;
7. v14 runtime preflight — same Node 22.16.0 environment blocker;
8. wave 3 convergence — OpenAPI route inventory is missing 3 mapped routes.

These were not suppressed or converted to PASS.

## Runtime boundary

A real PostgreSQL/Supabase reset and migration execution could not be performed in
this environment because no Supabase CLI, PostgreSQL client/server, Docker runtime,
or project database credentials are available.

Therefore:

SOURCE DATABASE CONTRACT = PASS
MIGRATION DEPENDENCY CONTRACT = PASS
LIVE DATABASE EXECUTION = BLOCKED

The live database must still receive the complete migration chain and be verified
with a real disposable-account matrix before production is declared database-certified.

## Required live verification matrix

After applying migrations to the actual Supabase staging database:

### Buyer
register → users/user_auth → email verification → login → buyer state

### Private seller
register → users/user_auth → individual_seller pending state → email verification
→ login → seller platform access according to approval rules

### Dealer
register → users/user_auth → dealers row → verification lifecycle → email verification
→ login → dealer onboarding → dealer verification/approval boundary

### Inspector
application → inspector_applications → admin review → ghost_checker identity
→ inspection_providers ACTIVE/verified state

### Failure cases

- duplicate email
- duplicate pending inspector application
- missing dealer business name
- missing dealer location
- invalid CSRF
- verification provider failure
- database credential-row failure
- retry/resend verification
- refresh/login after verification
- rollback of dependent dealer/profile/auth records

## Final engineering principle

The database is now treated as a first-class application contract rather than a
passive storage layer. The next certification step is not another source patch:
it is executing this exact migration chain against the real Supabase staging
instance and observing the real browser/API/database lifecycle.
