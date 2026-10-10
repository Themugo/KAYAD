# NAVIGATION ADMIN CONTROL — EXECUTION REPORT — 2026-10-08 (Stage 14A)

Companion: `NAVIGATION_AUTHORITY_MODEL_20261008.md`,
`NAVIGATION_RLS_PROOF_OUTPUT_20261008.txt`.

## Phase K gate — could the existing architecture already do it?

No. Stage 15 proved there is no navigation field in `PlatformConfig`, in the
`/admin/public/config` whitelist, or in the feature-flag / configuration-entry
services (which have no frontend consumer and no navigation keys). Authority
therefore needed a backend extension, and the smallest one was one JSONB column
on the existing singleton row, one validator, and one extra whitelist entry.
No standalone navigation service, route, model, table, role, settings engine
or audit system was created.

## Phases

* **A trace** — `PlatformConfig` (`createModel`), `PUT /api/admin/config`
  (allowlist + `AuditLog`), `/admin/public/config` (select whitelist),
  `BrandingContext` (single fetch), role/permission middleware, RLS on
  `platform_config`, `audit_logs`. Canonical place found: `platform_config`.
* **B/C/D/E** — controls limited to visibility, order, dropdown on/off, child
  visibility/order; strict server-side validation; reuse of existing guards,
  public projection and `AuditLog`.
* **F** — total resolver with canonical fallback; locked Marketplace/Support.
* **G** — visual freeze: CSS unchanged; Navbar diff is 3 wiring lines.
* **Finding fixed** — the existing `AdminSettings*.jsx` pages are not imported
  by anything reachable, so the editor was placed in the live admin console
  (`AdminView`), not in the orphaned page.
* **Finding fixed** — other screens echo the whole stored config back via
  `adminAPI.updateConfig({ ...config, … })`; `{}` (the default) is therefore
  accepted as "no override" so those saves cannot start failing.

## Verification

**Authorization matrix (real `adminRoutes.js`, real `protect`/`adminOnly`/
`requirePermission`/`authorize`, HTTP, persistence mocked)** — admin 200,
superadmin 200; user, individual_seller, dealer, ghost_checker, moderator,
ad_manager, marketing, escrow_officer, technical_support, hr, accounts → 403
with nothing persisted and no mutation audit; anonymous → 401; 15 hostile
payloads (unknown id/route creation, hide marketplace/support/all, css, raw
HTML label, `javascript:` href, unknown/foreign child, duplicates, non-boolean,
extra fields, non-object, array) → 400, nothing persisted; public read returns
only the whitelisted projection with normalised navigation and degrades
null/garbage to `{items:[]}`; full config GET is not public.

**RLS on real PostgreSQL 16** — see Authority Model §6 (anon/authenticated
cannot read, update, insert or delete; service_role can; migration idempotent).

**Real browser (Playwright/Chromium)**
* `nav_e2e.js` (Stage 15 suite, unmodified) — **180/180 PASS** with config
  unavailable (sandbox backend).
* `nav_authority_e2e.js` — **94/94 PASS**: fallback for 500, aborted request,
  missing field, HTML response, three malformed shapes; partial config;
  hostile "hide everything"; label/href injection ignored (no script runs);
  controlled state (hidden item, reorder, dropdown off, child hide/reorder),
  keyboard Enter/Tab/Escape + focus return, child navigation, active section;
  auth visibility (guest/user, admin-hidden child stays hidden); **visual
  freeze — header screenshot hash with an explicit canonical config equals the
  fallback header at 1440/1280/1100/1024 and 320/360/375/390/412/430**;
  no overflow/clipping at all 10 viewports with controlled config; mobile
  drawer lists the controlled set, targets ≥34px, focus in, Escape returns.
* `admin_nav_ui_e2e.js` — **11/11 PASS**: admin console Navigation module,
  locked items, the exact PUT body the UI sends (registry ids/booleans/order
  only), reload shows the change in the public header, server rejection shown,
  reset restores the five items.

**REVERT → FAIL → RESTORE → PASS** (restored files byte-identical)
1. Navbar ignores config → the controlled-state browser checks FAIL (partial, hide, reorder, dropdown, admin-hidden child); restored → 94/94.
2. Validation bypass → 15 Jest FAIL; restored → 35/35.
3. `navigation` dropped from public select → 1 FAIL; restored.
4. Dedicated audit entry removed → 2 FAIL; restored.
5. Public read un-normalised → 2 FAIL; restored.
6. Authorization layers removed → removing only `adminOrSuper` or only the
   global `adminOnly` still passes (defence in depth: other layers deny);
   removing all three layers → 12 FAIL (every non-admin role); restored.
7. Locked items removed → 1 FAIL; no-fallback resolver → 7 FAIL; restored → 20/20.
8. `AdminView` mount removed → UI test + guard FAIL; restored.

**Regression**
* `npx tsc --noEmit` clean; `npm run build` clean.
* Frontend `npm test`: 377 passed / 11 failed / 1 skipped (baseline 357/11/1 +
  20 new). The 11 failures are the same known pre-existing ones (9
  VehicleMarketplace mobile hero, 2 Navbar "Create Account").
* Backend: Jest 694/694 (644 + 50 new), Vitest 16/16, node:test 1/1.
* Validators: `validate-navigation-convergence` **40/40** (27 + 13);
  existing validators identical to the Stage 15 baseline
  (`premium-presentation-pass` 3 pre-existing FAIL, `next7-polish` 3/4
  pre-existing); `supabase-migrations`, `migration-hygiene`,
  `financial-audit-rls-hardening`, `inspection-domain-rls-enablement`,
  `hero-admin-control`, `backend-runtime-contracts` 14/14,
  `production-backend` 12/12 pass.

## Remaining gaps (honest)

1. **Persistence is not exercised end-to-end through the real service.** The
   sandbox has no Supabase/PostgREST, so the authorization suite mocks the
   model layer. The column, default, RLS and idempotency are proven on real
   Postgres; the `createModel` camelCase↔snake_case translation of
   `navigation` (a single word, so identical in both cases) is by design
   rather than by an end-to-end write. First staging run should confirm:
   apply the migration, `PUT` as admin, `GET /admin/public/config`.
2. The migration must be applied before deploying the backend; until then
   `PUT` with `navigation` would fail on an unknown column (other config
   writes are unaffected).
3. Header changes reach visitors on next page load (config is read once per
   load); no live push.
4. Labels and role-based visibility are intentionally not configurable.
5. `GET /admin/public/config` is still fetched four times by independent
   components, and the legacy `AdminSettings*.jsx` set is unreachable dead
   code (both pre-existing, untouched).
6. Live-data states remain environment-blocked as in Stages 13–14.
