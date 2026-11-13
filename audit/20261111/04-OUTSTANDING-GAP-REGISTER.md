# Outstanding gap register

Statuses: **Confirmed closed**, **Partially closed**, **Open**, **Blocked by external dependency**, **Not applicable**.

| ID | Gap | Status | Evidence / what remains |
|---|---|---|---|
| G-01 | GitHub publication | **Blocked by external dependency** | Not committed or pushed (your rule). R2 has no `.git`; push from your local clone after reconciling local edits (section 2 of the audit report) |
| G-02 | Migration replay | **Partially closed** | 197/197 replayed on a disposable local PG16 with platform shims; idempotent re-apply of newest 3; F2 proven. Still open: comparison with the staging/production migration ledger |
| G-03 | Live Supabase validation | **Blocked by external dependency** | No live access. Needs RLS policy tests as real roles, ledger check, Mazda record SQL |
| G-04 | Frontend build | **Confirmed closed** (local) | tsc 0, build OK, 1,574 tests. Vercel remote build not observed |
| G-05 | Payment provider UAT | **Blocked by external dependency** | Local payment/escrow tests pass; no sandbox/production provider UAT. **Not certified** |
| G-06 | Communications delivery | **Blocked by external dependency** | Local tests pass; no real delivery verified |
| G-07 | Background automation | **Partially closed** | Worker/timer logic tested locally; scheduler on the live host not verified. Lockout timers hardened |
| G-08 | Security / RLS | **Partially closed** | RLS enabled on 228/228 public tables (replayed DB); security suite 135/135; policies not exercised as `anon`/`authenticated` on the real project; 8 moderate backend advisories (transitive; swagger-jsdoc fix is a semver-major downgrade, needs approval) |
| G-09 | UI / mobile | **Partially closed** | Navbar verified at 13 widths in Chromium (earlier, identical source). Signed-in dashboard (counters, wizard, gallery) not browser-tested at 320/360/390/430/desktop; needs a session |
| G-10 | Auth | **Partially closed** | Stage 5C lockout verified locally. Live behind-proxy IP keying (`trust proxy`, real client IPs on Render/Vercel) not verified |
| G-11 | Finance | **Open** | No reconciliation against real provider settlements |
| G-12 | Legacy `individual_seller` self-registration | **Confirmed closed** (owner-approved, 11 Nov 2026) | Retired for all new accounts: registration creates only `user` or `dealer`; an old client sending `individual_seller` gets a personal account, a `Deprecation` header and a `compatibility` note. Source-level guard test prevents regression. No other creation or upgrade path exists (searched) |
| G-21 | Announcement audience / chat label vs unified accounts | **Closed (R8)** | "dealers" = business dealers only; "buyers" = all personal accounts incl. legacy individual_seller. Chat label "Marketplace member" for personal accounts is accurate for the unified model. Test: `announcementAudienceUnified` |
| G-22 | Personal account could start a dealer application on the same account | **Closed (R7)** | Dealer is registration-only. `APPLICANT_ROLES=["dealer"]` in service and routes, `dealer.canApply=false`, admin applicant list dealers only. Tests: `dealerApplicationRoutes`, `dealerPaperworkConvergence`, `accountCapabilities`, `dealerOnboardingWriteOrder` |
| G-23 | Dealer team members could not operate inventory/leads | **Closed (R8 backend + R9 frontend)** | `middleware/dealerWorkspace.js` runs an active member (personal account) in the dealership context per permission on 17 inventory/lead/pipeline/customer/analytics routes; membership re-read every request (fire/suspend = immediate); ambiguous/suspended dealer fail closed; owner-only routes (settings, subscription, finance, marketing, copilot, team) not delegable; `actingMember` recorded. Tests: `dealerWorkspaceDelegation` (8). Frontend entry (R9): `GET /api/dealer-platform/my-workspace`, `features/DealershipWorkspace` screen (inventory / leads / customers by permission), "Work for <dealership>" action on the personal dashboard and "Dealership Workspace" in the account menu, shown only to active members; fails closed. Closed end to end for the core sections. **Residual:** members cannot yet create/edit vehicles through the new screen (list/stage-change only; the API allows it); dashboard/analytics sections not surfaced in the member screen |
| G-24 | Business-name uniqueness not enforced in DB | **Closed in code, pending owner apply** | New additive migration `20261112090000_dealer_business_name_uniqueness.sql` (normaliser, conflict view, unique index created only if data is clean; otherwise NOTICE and skip). Replayed on a disposable DB: clean/idempotent/dirty paths verified, duplicate rejected. NOT applied to production. App returns 409 `COMPANY_NAME_TAKEN` |
| G-25 | Legacy dealers without business name / personal-account dealer drafts | **Open (data review; tooling added)** | Read-only `scripts/audit/legacy-account-review.sql` (counts only) + view `dealers_missing_business_name`. No data changed; owner reviews counts before any backfill |
| G-20 | Existing legacy `individual_seller` rows and the DB-level role value | **Open (owner decision; review SQL ready)** | Deliberately untouched: rows are not converted, approved or deleted, and the CHECK/RPC still accept the value so history stays valid. Reads/filters remain as compatibility. Needs a reviewed forward-only data migration plan (count the rows on the live DB first, convert to `user` + capability record while preserving pending state), then an optional CHECK/RPC tightening |
| G-13 | Dead, unimported components excluded from `tsc` (`ErrorBoundary.tsx` and others needing `wouter`, `@/lib/*`) | **Open** | One syntax defect fixed. Recommend an approved cleanup (delete/archive) |
| G-14 | 215 API routes without Zod input validation | **Open** | Governance report lists them; prioritise write endpoints |
| G-15 | 144 failing legacy validators outside CI | **Partially closed** | Triage in audit report section 7; 4 resolved/explained; cleanup needs approval |
| G-16 | Mazda 2020 CX-5 listing | **Blocked by external dependency** | Needs the live DB; stays `pending`; do not approve to change counters |
| G-17 | Listing statuses "Changes requested / Rejected / Withdrawn / Archived" | **Partially closed** | UI mapping added (hidden shown as "Not published"). Distinct states need a moderation-reason model and your approval (decision D3) |
| G-18 | Vercel Node version | **Open (minor)** | `engines.node` is `>=22.22.2`; confirm the Node version in Vercel project settings |
| G-19 | Single-process `npm run test:jest -- --runInBand` | **Open (environment)** | Not completed in this 6 GB-limited sandbox; chunked runs pass. Run once on a developer machine/CI |

## Appendix A: Supabase shim used for the disposable replay (platform objects only)

```sql
-- Minimal Supabase shim for a DISPOSABLE replay database only.
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key default gen_random_uuid(), email text);
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create or replace function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon') $$;
create or replace function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
create schema if not exists extensions;
create extension if not exists pgcrypto;
grant usage on schema public to anon, authenticated, service_role;
create publication supabase_realtime;
create or replace function public.rls_auto_enable() returns event_trigger language plpgsql as $$ begin null; end $$;
```

The shim contains no application schema. It must never be run on a real project.

| G-26 | Existing production policy row may still say "hold every listing" | **Open (admin action)** | The new no-approval default applies only when no policy has ever been saved. Set Admin → Settings → Onboarding → Listing approval to "No approval" to change a saved policy; existing pending listings stay pending until an admin decides them |
| G-27 | Mobile layout not visually verified on a device | **Open** | Layout changes are covered by unit tests and builds only; check kayad.space on a phone after deploy |
