# P0-D — RLS classification — 2026-09-19

## Production access architecture

The frontend does not create a Supabase client or query public tables directly. Application data access goes through the KAYAD backend, which uses the server-side Supabase service-role connection.

Therefore, a public table with RLS enabled and no client policy is classified **SERVICE_ONLY** when there is no direct client/realtime contract requiring authenticated/anonymous table access.

## Classification rule

- **SERVICE_ONLY** — backend/service-role only; no direct browser Supabase table access.
- **CLIENT_EXPOSED** — browser code directly queries the table; requires least-privilege RLS policies.
- **REALTIME_EXPOSED** — browser subscribes directly to the table; requires explicit RLS/realtime authorization.
- **UNUSED** — no reachable application consumer found; retain RLS and deny client access until removed.
- **OBSOLETE** — confirmed stale implementation/schema object; requires separate deletion migration after dependency proof.

## Current conclusion

The 91 production tables reported by Supabase as RLS-enabled with no policies are classified **SERVICE_ONLY or UNUSED by current application architecture**, not automatically vulnerable.

No direct `createClient()`/Supabase table query was found under `src/`, and the browser-facing application calls the backend API instead. Consequently, the correct hardening action is to deny `anon` and `authenticated` table privileges on zero-policy public tables rather than adding broad `auth.uid()` policies that would expose internal data.

## Verification requirement

After the privilege hardening migration is applied, verify:

1. `anon` and `authenticated` have no table privileges on the zero-policy set.
2. `service_role` retains backend access.
3. Supabase security advisor no longer reports an actual exposed zero-policy table; informational RLS-without-policy findings may remain because RLS itself is intentionally enabled as defense in depth.
4. Backend production smoke tests remain green.
