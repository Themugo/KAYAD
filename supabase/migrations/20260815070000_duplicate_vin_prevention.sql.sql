/*
# Duplicate VIN prevention - KAYAD Phase 4 (seller/dealer workflow hardening)

Found while auditing this phase's own explicit "verify duplicate VIN
handling" requirement: the real cars table (vin TEXT, no UNIQUE
constraint - confirmed directly against
supabase/migrations/..._foundational_tables.sql.sql) had no protection
against the same VIN being listed multiple times. An application-level
check was added in the same phase (backend/controllers/carController.js's
createCar), but that alone has a real race-condition gap: two
concurrent create requests with the same VIN could both pass the
application check before either commits. This migration adds the
corresponding database-level constraint as defense in depth - the
correct, complete fix, not a replacement for the application check
(which still provides the clean, specific error message a raw
constraint violation wouldn't).

## Design choices, stated explicitly
- A PARTIAL unique index (WHERE vin IS NOT NULL AND vin != ''), not a
  plain UNIQUE constraint on the column: vin is nullable in the real
  schema (not every listing is required to have one), and Postgres's
  own default UNIQUE behavior already treats multiple NULLs as
  non-conflicting - but an empty string is a distinct, non-NULL value
  that would incorrectly collide with any other blank-VIN listing
  under a plain UNIQUE constraint. The partial index avoids that.
- isDemo is deliberately NOT excluded here at the database level (only
  the application-level check in createCar excludes isDemo=true
  listings) - a database constraint has no clean way to express "except
  demo rows" without a more invasive schema change, and demo/seed data
  is expected to be curated carefully enough not to collide in
  practice. The database constraint's job is defense-in-depth against
  the real, adversarial case (two real listings racing), not
  replicating every nuance of the application-level rule.
- Uses CREATE UNIQUE INDEX CONCURRENTLY... wait: CONCURRENTLY cannot
  run inside a transaction block, which most migration runners
  (including Supabase's) wrap each migration in by default. Using a
  plain CREATE UNIQUE INDEX instead - acceptable here since this
  table is not expected to be under heavy write load at the point
  this migration would actually be applied (no live database exists
  in this program's environment to apply it against yet regardless).
*/

CREATE UNIQUE INDEX IF NOT EXISTS idx_cars_vin_unique
  ON cars (vin)
  WHERE vin IS NOT NULL AND vin != '';
