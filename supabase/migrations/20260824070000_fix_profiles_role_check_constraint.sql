/*
# Fix profiles_role_check - restore the full, correct role list
# KAYAD Phase 6 - Marketplace and seller workflow certification

Found while tracing the real, end-to-end private-seller registration
and listing-creation workflow against a real, migrated database (not
assumed from reading code - reproduced directly).

Root cause, confirmed by reading this project's own migration
history: the "profiles" table was first correctly defined in
20260710043200_20260710005000_foundational_tables.sql.sql with a
role check constraint including the full, real role vocabulary this
application actually uses (14 values, including individual_seller -
that migration's own comment already anticipated and warned about
this exact risk). A later migration,
20260710043238_20260710010000_gari_motors_full_schema.sql.sql, drops
and replaces that constraint - its own comment says "Update role
check constraint to include all roles," but the replacement actually
narrows it to only 5 values ('user', 'dealer', 'broker', 'admin',
'superadmin'), silently dropping individual_seller and 8 other real,
in-use roles (ghost_checker, moderator, ad_manager, marketing,
escrow_officer, technical_support, hr, accounts).

Real, confirmed, reproduced consequence: a database trigger
(sync_profile_from_user, from 20260710043210_20260710005500_
sync_profiles_trigger.sql.sql) copies users.role into profiles.role
on every user insert/update. Since users.role has no such
restriction and the application code itself (backend/config/roles.js's
own SELLER_ROLES = ["dealer", "individual_seller"]) already treats
individual_seller as a completely valid, expected role, registering
any new individual_seller (private seller) account fails outright
with a real Postgres error (23514, check constraint violation) -
reproduced directly by calling the real register() controller against
a real, migrated database. This is not a hypothetical: no private
seller account can be created at all while this constraint stands,
which blocks the entire private-seller listing workflow this phase
was asked to certify at its very first step.

The 20260710043238 migration itself is not edited here (per this
project's own established practice: an already-applied migration is
treated as immutable, matching the comment already present in the
foundational_tables.sql.sql file about this exact same constraint).
This is a new, purely additive fix that restores the full, correct
role list the very first migration already got right.
*/

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'profiles_role_check') THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
  END IF;
END $$;

ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY[
    'user'::text, 'individual_seller'::text, 'dealer'::text, 'broker'::text,
    'ghost_checker'::text, 'moderator'::text, 'ad_manager'::text, 'marketing'::text,
    'escrow_officer'::text, 'technical_support'::text, 'hr'::text, 'accounts'::text,
    'admin'::text, 'superadmin'::text
  ]));
