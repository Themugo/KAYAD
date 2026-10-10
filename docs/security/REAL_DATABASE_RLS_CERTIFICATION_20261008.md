# STAGE 13 — REAL DATABASE & RLS CERTIFICATION

**Tier achieved:** local real-PostgreSQL-16 certification (genuine,
non-trivial, NOT the same tier as real Supabase staging/production
certification — no such credentials exist in this sandbox).

## 1. Migration-chain certification (Phase C)

Ran the full 161-file migration chain, from an empty database, against a
real local PostgreSQL 16 engine, using the project's own
`scripts/local-db/supabase-shim.sql` + a project-specific fixtures file I
wrote (`stage13_rls_fixtures.sql`). Final result: **161/161 PASS** from an
empty database, re-verified after every fix, most recently after the final
`ad_slots_admin_all` correction (fresh run, 161/161, no errors).

### 5 genuine migration bugs found and fixed (all deterministic against ANY real Postgres, Supabase included — not a shim artifact):

1. **`images` column type mismatch** — `supabase/migrations/20260710044329_...seed_demo_vehicles.sql`: 12 `ARRAY['https://...']` literals (text[]) inserted into the real `cars.images JSONB` column. Fixed: wrapped each with `to_jsonb(...)`.
2. **`transactions(id)` FK to a table that was never created** —
   `supabase/migrations/20261002193000_auction_bidder_registration_eligibility.sql`
   line 14: `commitment_transaction_id UUID REFERENCES transactions(id)`.
   Fixed: `REFERENCES payments(id)` (the real financial-transaction table).
3. Same root cause, second file —
   `supabase/migrations/20261007180000_auction_financial_integrity_phase_a.sql`
   line 15: `payment_transaction_id UUID REFERENCES transactions(id)`. Fixed
   the same way.
4. **Reference to a confirmed-abandoned dormant subsystem** —
   `supabase/migrations/20260908070000_inspection_workforce_digital_lifecycle_hardening.sql`
   referenced `digital_inspections` and 4 sibling tables that a later
   migration (`20260918120000_canonical_inspection_lifecycle_hardening.sql`)
   explicitly documents as dormant/never-production. Because the whole file
   ran as one transaction, this one dead reference was silently rolling
   back the file's OTHER, genuinely valid hardening on real tables
   (`inspection_staff`, `inspection_bookings`). Fixed: removed only the
   dead-subsystem statements; kept everything targeting real tables.
5. **Genuinely missing column** — the same file's own index needed
   `inspection_staff.is_available`, which real backend code
   (`backend/inspectionBusinessCenter/services/engineerService.js`,
   `backend/inspection/services/workforceService.js`) reads/writes, but no
   migration had ever added it. Fixed: added the column in the same
   migration, same place it was always meant to be used.

## 2. RLS matrix certification (Phase D)

**Finding, confirmed deny-all-by-default (safe, DB-layer gives no granular
per-row protection; enforced entirely at the backend/app layer):** `cars`,
`users`, `payments`, `bids`, `ledger_entries`, `ownership_documents`,
`escrow_accounts`, `escrows` — all have RLS enabled with **zero** policies.
Proven: `anon`/`authenticated`(non-owner) get 0 rows on SELECT and denied
writes; only `service_role` (the backend's own connection) can see/write.

**Major regression found, traced, and fixed — `is_admin()` EXECUTE
privilege (3 parts, all in `20260909073141_production_advisor_hardening.sql`
and its downstream callers):**

1. A prior hardening migration over-broadly
   `REVOKE EXECUTE ... FROM public, anon, authenticated` on
   `public.is_admin()`, when the function's own defining migration
   (`20260907240500_canonical_authorization_helpers.sql`) explicitly grants
   `authenticated` EXECUTE. Real effect, proven: **every** authenticated
   query against a table whose RLS policy calls `is_admin()` — including
   the legitimate owner of their own row — failed outright with
   `permission denied for function is_admin`. Fixed: revoke narrowed to
   `anon, public` only.
2. A first fix attempt replaced 30 `is_admin()` call sites in
   `20260918130000_inspection_domain_rls_hardening.sql` with an inline
   `EXISTS(... FROM profiles ...)`. Proven WRONG against the real engine:
   `profiles` itself has RLS enabled with zero policies, so the inline,
   non-`SECURITY DEFINER` version can never see a row there for any
   non-privileged role — it silently, permanently returns false. Reverted
   all 30 call sites back to calling `is_admin()` directly (which, as
   `SECURITY DEFINER`, legitimately bypasses that lockout).
3. `ad_slots_admin_all` was scoped `TO public`, forcing Postgres to
   evaluate it (and therefore call `is_admin()`) even for `anon`, since two
   PERMISSIVE policies on one table are combined with OR and both sides
   are evaluated. Proven: this made the ENTIRE `ad_slots` table unreadable
   by `anon`, including a genuinely public/active slot. Fixed: rescoped
   `ad_slots_admin_all` to `TO authenticated` (admins always connect as
   `authenticated`; no legitimate access is lost).

### Final re-verification (fresh 161/161 run, fresh fixtures, after the final fix):

| Test | Expected | Actual |
|---|---|---|
| anon reads public ad slot | 1 | 1 ✅ |
| anon reads hidden ad slot | 0 | 0 ✅ |
| admin reads hidden ad slot | 1 | 1 ✅ |
| non-admin authenticated reads hidden ad slot | 0 | 0 ✅ |
| buyer A reads own inspection report | 1 | 1 ✅ |
| buyer B reads non-owned report | 0 | 0 ✅ |
| admin reads any report | 1 | 1 ✅ |
| anon reads report | 0 | 0 ✅ |
| inspection provider reads own booking | 1 | 1 ✅ |
| assigned staff reads assigned booking | 1 | 1 ✅ |
| customer reads own booking | 1 | 1 ✅ |
| unrelated authenticated user reads booking | 0 | 0 ✅ |
| staff reads own staff row | 1 | 1 ✅ |
| provider owner reads own staff roster row | 1 | 1 ✅ |
| unrelated user reads staff roster row | 0 | 0 ✅ |
| `escrows` (deny-all, service_role only) — anon/buyer/admin | 0/0/0 | 0/0/0 ✅ |
| `escrows` — service_role (backend) | 1 | 1 ✅ |

All 17 role×table checks pass. Backend test suite re-confirmed 644/644
passing after all fixes.
