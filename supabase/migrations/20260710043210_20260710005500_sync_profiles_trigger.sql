/*
# Auto-sync profiles with users

The already-applied gari_motors_full_schema.sql.sql migration has 11
NOT-NULL-in-several-cases foreign key columns (reviews.reviewer_id,
messages.sender_id, escrow_transactions.buyer_id/seller_id,
vehicle_inspections.requester_id/inspector_id, payments.user_id,
audit_logs.actor_id, saved_searches.user_id, system_settings.updated_by,
dealer-related dealer_id) that all REFERENCES profiles(id) - the minimal
compatibility table added in the foundational tables migration.

Without something keeping profiles in sync, every one of those would
fail its foreign key constraint for any real user, since nothing
currently creates a matching profiles row when a users row is created -
controllers/authController.js's signup flow only inserts into users, and
has no reason to know profiles exists at all (it's purely a structural
compatibility shim for one migration file, not a concept the application
layer should need to think about).

Solved with a database trigger rather than an application-code change,
so this stays entirely a schema-level fix: every INSERT into users
automatically creates the matching profiles row (with role kept in
sync too - see the trigger function's own comment for why). ON DELETE
CASCADE (already set on profiles.id's foreign key to users.id) handles
cleanup automatically in the other direction.
*/

CREATE OR REPLACE FUNCTION sync_profile_from_user()
RETURNS TRIGGER AS $$
BEGIN
  -- role is included here (not just id/created_at) because profiles.role
  -- is a real column now too (see foundational_tables.sql.sql's comment
  -- on it) - the already-applied migration's profiles_role_check
  -- constraint needs it to exist, and keeping it populated from the
  -- same value users.role already has avoids a confusing default-only
  -- 'user' row that doesn't reflect the actual account.
  INSERT INTO profiles (id, role, created_at)
  VALUES (NEW.id, NEW.role, NEW.created_at)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_profile_from_user ON users;
CREATE TRIGGER trg_sync_profile_from_user
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_from_user();

-- Backfill: create profiles rows for any users that already exist
-- (relevant if this migration runs against a database that already has
-- real user data from before this trigger existed).
INSERT INTO profiles (id, role, created_at)
SELECT id, role, created_at FROM users
ON CONFLICT (id) DO NOTHING;
