# KAYAD Phase 4 — Fresh Supabase Database Construction

## Objective

Prepare the cleaned KAYAD repository to create the new Supabase database from an empty PostgreSQL database, with the repository migrations as the only schema source of truth.

## Current migration state

- 27 migrations are present in `supabase/migrations/`.
- The demo vehicle seed migration has been removed from the production chain.
- The remaining migrations are ordered chronologically.
- No migration contains the removed demo vehicle seed, Pexels demo inventory, or obvious demo/test marketplace inserts.
- Baseline `system_settings`, singleton `platform_config`, and the M-Pesa provider registry seed are configuration records, not marketplace demo inventory.

## Canonical deployment model

```text
supabase/migrations/*
        |
        v
fresh PostgreSQL/Supabase database
        |
        v
application API/backend
        |
        v
real production data
```

Do not recreate the schema manually in the Supabase Dashboard.

## Static validation performed

1. Enumerated every migration in timestamp order.
2. Checked that the removed demo vehicle migration is absent.
3. Checked migration files for old Supabase project ID references.
4. Checked migrations for demo/seed marketplace keywords and demo URLs.
5. Checked CREATE TABLE statements for duplicate real table declarations.
6. Checked the foundational object ordering: `users`, `profiles`, `cars`, `bids`, `favorites`, and `car_views` are created before later migrations alter/reference them.
7. Confirmed the payment extension creates `mpesa_transactions` before application use.
8. Confirmed inspection tables are introduced before later inspection-domain corrections/lifecycle changes.
9. Confirmed the final payment/profile/bid correction migrations remain in the chain.

## Important architecture finding

KAYAD uses custom bcrypt/JWT authentication in the application, not Supabase Auth as its primary identity system.

Some database policies in the historical schema use `auth.uid()`. These policies should **not be rewritten during Phase 4** without first deciding whether direct browser access/Realtime will use Supabase Auth. The KAYAD API uses its own authentication and service-role database access.

This is a Phase 6 security/realtime decision, not a reason to corrupt the migration chain now.

## PostgreSQL execution status

A full `supabase db reset` could not be executed in the current working environment because the Supabase CLI and PostgreSQL/Docker runtime are unavailable here.

Therefore this phase does **not** claim that the migrations have been executed successfully against PostgreSQL.

The repository has instead been prepared for that exact validation step.

## Required next deployment action

On a machine with the Supabase CLI:

```bash
supabase login
supabase link --project-ref <NEW_KAYAD_PROJECT_REF>
supabase db reset
```

For a brand-new project, `db reset` should be run against a local development database first. After the local reset succeeds:

```bash
supabase db push
```

must be run only against the new Supabase project.

Do not run either command against the deleted/old project.

## Production rule

No production marketplace records should be inserted by migrations.

The only intentional initial records are platform configuration:

- KAYAD platform name
- dealer commission
- bid commitment
- escrow release policy
- image limit
- guest browsing setting
- dealer approval setting
- minimum bid increment
- platform configuration singleton
- payment provider registry configuration

No users, dealers, vehicles, bids, messages, inspections, payments, escrows, or support tickets are seeded.

## Phase 4 exit criteria

- [x] Demo marketplace seed removed
- [x] 27-migration production chain retained
- [x] Old Supabase project ID removed from runtime Supabase config
- [x] No demo marketplace inserts remain in migrations
- [x] Canonical migration directory identified
- [x] Migration validation report created
- [ ] Execute full migration reset against PostgreSQL
- [ ] Verify resulting table/constraint/index/function/trigger inventory
- [ ] Link the new Supabase project
- [ ] Push the verified migration chain
- [ ] Verify the remote schema matches the local migration result

The unchecked items require an actual Supabase/PostgreSQL runtime and should be completed before production data is introduced.
