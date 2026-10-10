# KAYAD Phase 3 — Infrastructure Certification

Foundation: KAYAD Phase 2 Build/Test/Certification Foundation 20260928

## Scope
- Managed Render Redis binding and production fail-closed queue configuration
- Supabase migration/RLS preflight
- Live Supabase table reachability when credentials are supplied
- Live Redis PING when credentials are supplied
- Existing Brevo / Africa's Talking / Twilio provider certification boundary

## Rules
- No Git commit or push is part of this phase.
- No second queue architecture is introduced.
- No duplicate email/SMS/WhatsApp provider abstraction is introduced.
- Production Redis must be the Render-managed `kayad-redis` resource.
- Production queue startup must not silently fall back to localhost.
- Supabase production apply remains explicit and guarded by the existing bootstrap script.

## Environment-dependent gates
The sandbox cannot honestly certify live Supabase, Redis, or external providers without the target credentials. Those gates are therefore marked PENDING rather than simulated.

## Required live commands
```text
npm run validate:phase3-infrastructure
npm run validate:supabase-migrations
npm run bootstrap:supabase:staging
node scripts/bootstrap-supabase-production.mjs --dry-run
```

For staging, set `KAYAD_SUPABASE_PROJECT_REF` to the staging project and run the migration dry-run through the Supabase CLI. Never point a staging run at the production project reference.

## RLS preflight
Use `supabase/preflight/PHASE_3_RLS_PREFLIGHT.sql` in the target database and verify every application table has the intended RLS state and policies before applying production changes.

## WhatsApp production template support
The Twilio adapter now accepts the existing free-form body path and, when configured, an approved `TWILIO_WHATSAPP_CONTENT_SID` plus `TWILIO_WHATSAPP_CONTENT_VARIABLES`. This does not create a second WhatsApp provider or notification path.
