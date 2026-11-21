-- DISPOSABLE / LOCAL DATABASES ONLY. Never run against a hosted Supabase project.
-- Reproduces the default privileges every hosted Supabase project has on the `public` schema *before* any
-- project migration runs, so that the migrations' own GRANT/REVOKE statements produce the same effective
-- privileges locally as they do in a hosted project. Apply after supabase-shim.sql and before migrations.
-- Also lets PostgREST's `authenticator` role switch into anon/authenticated/service_role for runtime tests.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
GRANT anon, authenticated, service_role TO authenticator;
