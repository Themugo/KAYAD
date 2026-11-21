-- Phase 29: reconcile the legacy Supabase Auth policy/trigger layer with
-- KAYAD's canonical custom users + user_auth authentication architecture.
--
-- The earlier gari_motors_full_schema migration was authored around a
-- Supabase Auth design and created auth.uid()-based policies plus an
-- auth.users trigger. KAYAD does not use Supabase Auth as application
-- identity: Express/JWT middleware authorizes requests and the backend uses
-- the users/user_auth tables. This corrective migration preserves migration
-- history while removing that incompatible runtime contract from the live
-- database. RLS remains enabled as a default-deny boundary; service-role
-- backend operations continue to bypass RLS as intended.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

DO $$
DECLARE
  policy_name text;
  policy_names text[] := ARRAY[
    'select_own_conversations', 'insert_own_conversations',
    'update_own_conversations', 'delete_own_conversations',
    'select_own_messages', 'insert_own_messages', 'update_own_messages',
    'select_own_notifications', 'insert_own_notifications',
    'update_own_notifications', 'delete_own_notifications',
    'select_own_payments', 'insert_own_payments',
    'update_own_payments', 'delete_own_payments',
    'select_own_escrows', 'insert_own_escrows', 'update_own_escrows',
    'select_all_reviews', 'insert_own_reviews', 'update_own_reviews',
    'delete_own_reviews',
    'select_own_saved_searches', 'insert_own_saved_searches',
    'update_own_saved_searches', 'delete_own_saved_searches',
    'select_own_inspections', 'insert_own_inspections',
    'update_own_inspections',
    'select_admin_audit_logs', 'insert_audit_logs',
    'select_own_activity_logs', 'insert_activity_logs',
    'select_system_settings', 'update_admin_system_settings',
    'insert_admin_system_settings',
    'select_own_profile', 'update_own_profile', 'insert_own_profile',
    'select_published_cars', 'insert_own_cars', 'update_own_cars',
    'delete_own_cars',
    'select_own_bids', 'insert_own_bids', 'update_own_bids',
    'insert_car_views', 'select_car_views',
    'select_own_favorites', 'insert_own_favorites', 'delete_own_favorites'
  ];
  target_table text;
BEGIN
  FOREACH policy_name IN ARRAY policy_names LOOP
    FOR target_table IN
      SELECT DISTINCT schemaname || '.' || tablename
      FROM pg_policies
      WHERE policyname = policy_name
        AND schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %s', policy_name, target_table);
    END LOOP;
  END LOOP;
END $$;
