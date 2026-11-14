# KAYAD MAIN: Master Audit Report (continuation on R2)

**Date:** 11 November 2026 (Africa/Nairobi)
**Baseline:** `KAYAD-FULL-CORRECTED-2026-11-10-R2_1.zip` (the project was not overwritten with R2; R2 was extracted separately and compared)
**Rules observed:** no commit, push, deploy, production data change, payment or refund; no test disabled or skipped; no secrets in reports; no migration edited; migration replay ran on a disposable local database only.

## 1. Certification status (evidence-based)

| Level | Status | Evidence |
|---|---|---|
| Local automated tests passed | **PASSED** | Backend Jest 4,015 passed / 21 skipped (1 rehearsal suite, by design) / 0 failed; backend vitest 36/36; node:test 1/1; frontend vitest 1,574 passed / 1 skipped / 0 failed. See `03-TEST-CERTIFICATION-REPORT.md` |
| Local build passed | **PASSED** | root `tsc --noEmit` exit 0; `vite build` succeeds |
| Disposable database validation passed | **PASSED (with documented platform shims)** | 197/197 migrations replayed in order on a fresh local PostgreSQL 16 database; newest three re-applied cleanly; repo SQL lifecycle suite 43 PASS / 0 FAIL |
| Live integration validation passed | **NOT AWARDED** | No access to live Supabase, Cloudinary, providers or the production site |
| Production operational certification passed | **NOT AWARDED** | Requires live UAT (payments, communications, workers, RLS on the real project). KAYAD is **not** declared production-ready |

## 2. Baseline comparison (R2 vs the working tree before this session)

- R2 has no `.git`, so no commit history exists to compare. The comparison is a file-level diff of the extracted R2 archive.
- Everything from the earlier sessions (navbar lockup, unified dashboard copy/nav, `vercel.json` uploads rewrite, `sellerCapability` status fix, non-destructive migration, validator updates) is **already present in R2** and was not redone.
- The Stage 5C repair described in the continuation prompt was **not present in R2**: `accountLockout.js` still had untracked per-failure `setTimeout`s and a non-unref'd hourly interval. It was re-implemented (section 4). Any local post-R2 edits you made on your own machine are not in the archive; reconcile before merging.
- Net changes this session: 11 modified, 5 new files (`02-FILE-CHANGE-REGISTER.md`).

## 3. Stage 5C validation

| Requirement | Result |
|---|---|
| Five-failure lockout | Verified by test (threshold = 5, `MAX_ATTEMPTS`) |
| 15-minute duration | Verified with fake timers (`LOCKOUT_DURATION`, measured from the last failure) |
| Per-IP isolation | Verified (a lockout on one IP does not affect another) |
| IPv6 keying | Existing Stage 5C tests pass (48/48 in `tests/stage5c`) |
| Success clears the counter | Verified, and the pending cleanup timer is cancelled |
| Real HTTP tests | Existing real-HTTP tests in `tests/stage5c` pass |
| Wiring | `/login` route uses `accountLockout`; controller calls `recordFailedAttempt` / `recordSuccessfulAttempt` |
| Timer hygiene | Cleanup timers are tracked per entry, `unref`'d, cancelled on success/expiry/clear; no open handles (`--detectOpenHandles`) |

## 4. Changes made

1. **`backend/middleware/accountLockout.js`**: tracked, unref'd, cancellable cleanup timers (same limits and behaviour). +4 tests in `tests/stage5c/ipKeyingAndThrottling.test.js`.
2. **Dashboard counters (F9)**: new `useBuyingActivity` hook and a "Buying & transactions" section. Saved vehicles come from `GET /api/favorites` and negotiations from `GET /api/leads/mine/offers`; escrow counters are derived from the escrows the page already loads. A failed request shows **"Unavailable"**, never a fabricated zero. 4 tests.
3. **Listing status mapping (F11)**: `src/utils/listingLifecycle.ts` maps the 6 DB statuses to user-facing states. `hidden` is shown as **"Not published"** (decision D3: no `rejected` DB value, and no claim that a listing was "rejected"). 11 tests. No duplicate status system, no schema change.
4. **`individual_seller` retired for new accounts (F10, owner-approved 11 Nov 2026)**: `authController.register` now creates only `user` or `dealer`. A request for `individual_seller` from an old client is mapped to a personal account, logged (`account.legacy_individual_seller_registration`), flagged with a best-effort `Deprecation` header and a `compatibility` note in the response. The seller-policy gates (approval/package/registration switch) no longer apply at registration; they apply when a listing is created (`sellerListingAccess`), as the unified-account model intends. Existing legacy rows, the DB CHECK and the RPC are **untouched** (gap G-20). 7 tests rewritten to assert the new rule and 1 source-level guard test added; no migration changed.
5. **`visitorAnalytics.test.js`**: the test seeded "now minus 1 hour" as "today", which fell on yesterday between 00:00 and 01:00 EAT. Product code is correct (EAT calendar day). The seed is now anchored to midday EAT of the target day; every assertion is unchanged. Verified.
6. **`src/components/ErrorBoundary.tsx`**: real JSX syntax defect (four orphaned closing lines). The file is unimported and excluded from `tsc`, so neither the build nor the type check saw it. Fixed; it now transpiles. It still imports modules that do not exist (`@/lib/logger`), so it remains dead code (see G-13).
7. **`backend/openapi.yaml`**: documented the 5 missing operations (canonical offer negotiation x4 and `GET /api/users/dealers`). Governance: 1,135/1,135 documented (was 1,130).
8. Two stale validators aligned to the refactored dashboard (`validate-stage5f5-private-seller-dashboard`, `validate-private-seller-workspace-shell`) without loosening their intent (nav semantics, alt text, lazy loading, accessible fallback).

## 5. Platform audit summary

Method: full automated suites per domain, plus targeted source review of the areas changed. Evidence is local only.

| Area | Result | Notes |
|---|---|---|
| Auth and sessions | Local tests pass | Lockout hardened (section 3); registration roles verified |
| Authorization | Local tests pass | Dealer isolation 174/174; private seller capability 36/36; legacy pending seller admitted by policy, dealer-business routes still 403 for private sellers |
| Listings | Local tests pass | Status model unchanged; lifecycle mapping added in UI only |
| Auctions / escrow / payments | Local tests pass (auction 65, escrow 368, payments 2, transactions 22) | **No provider UAT**: payments are not certified |
| Communications | Local tests pass (6) | No delivery verified |
| Workers / background | Local tests pass | No live scheduler verified |
| DB / migrations / RLS | Replay 197/197; RLS enabled on 228/228 public tables | RLS **enabled** is not RLS **correct**; policy behaviour must be tested on the real project |
| Frontend | tsc clean, build OK, 1,574 tests | Navbar verified earlier at 13 viewports (320 to 1920) on identical source; the signed-in dashboard was not browser-tested (needs a session) |
| Dependencies | Root production: 0 vulnerabilities. Backend production: 8 moderate, 0 high/critical (fast-uri, ip-address, glob, minimatch, swagger-jsdoc chain, gaxios chain) | Not upgraded without approval |

## 6. Migration chain findings (G-02)

- All 197 migrations apply in filename order on a clean database once two **Supabase platform objects** are provided, which no migration creates: the `supabase_realtime` publication and `public.rls_auto_enable()`. Hosted Supabase supplies both. This is a documented dependency, not a defect, but a bare Postgres replay needs the shim. The shim used is in `04-OUTSTANDING-GAP-REGISTER.md`, appendix A.
- The newest three migrations re-apply without error (idempotent).
- **F2 proven on the database:** a legacy `individual_seller` / `pending` user stayed `pending` after `20261110140000` re-ran.
- `cars.status` CHECK allows exactly: available, sold, pending, reserved, hidden, draft.
- Still required: compare this chain to the real `supabase_migrations` ledger on staging, then production (G-02/G-03).

## 7. Older validators triage

427 validate/verify scripts: 263 pass, 144 fail, 18 skipped (need a live URL). **None of the 144 is reachable from `ci.yml` or `deploy.yml`**; every CI gate passes.

- 55 fail on missing inputs (documents/files that do not exist in this repo, e.g. disaster-recovery docs).
- 61 check a different, commerce-style product lineage and do not apply to KAYAD.
- 28 other: 4 fixed or explained this session; the rest (communications/payment certification, backup artifact, phases 86 to 88, etc.) are legacy phase gates needing a per-script decision. `verify-vercel-deployment.mjs` expects `engines.node === '22.x'` and a `vite` CLI build command; the project intentionally uses `>=22.22.2` and `vite build` (CI pins 22.22.2). Stale, not a deploy defect; confirm the Node version in the Vercel project settings.
- Recommendation: delete or archive the foreign and missing-input scripts under a separate approved cleanup so the remaining failures become meaningful. I did not delete anything.

## 8. Items I cannot do without you

- **Mazda 2020 CX-5**: needs the live database. Read-only SQL is in the earlier report (`KAYAD-UNIFIED-ACCOUNT-AUDIT-AND-DEPLOY-FIXES-20261110.md` section 5). The listing must stay `pending`; do not approve it to change counters.
- Staging/production migration ledger, live RLS checks, provider UAT, delivery checks, real-device and signed-in browser tests.

## Addendum R7 — Dealer company identity and team rules (2026-11-11)
- Every dealer must have a company name: required, 2–120 chars, no e-mail/URL/phone-like text, never the owner's personal name (any order/case). Enforced at registration, `PUT /api/dealer/onboarding`, dealer profile update and auth profile update. Personal accounts never store a business name. Public dealer directory and dashboard no longer fall back to the personal name (`dealerPublicName`).
- A personal account cannot become a dealer (G-22 closed). A dealer can invite a personal account (including the owner's own, from its own e-mail) to the team; only personal accounts may accept; dealer/staff accounts are refused; membership never changes a member's role; removal revokes access.
- Open: G-23 (members operating inventory/leads), G-24 (unique business-name index), G-25 (legacy rows).
- Verification: backend Jest 4,021 passed / 21 skipped / 0 failed; backend vitest 36/36; node:test 1/1; frontend 189 files, 1,573 passed, 1 skipped; tsc 0 errors. Nothing committed, pushed or deployed.

## Addendum R8 — remaining gaps addressed (2026-11-12)
- G-23 closed in the backend (team delegation, tested). G-24 migration written and replay-tested on a disposable DB, not applied to production. G-21 closed. G-25 and G-20: read-only review SQL provided; no data was changed (needs owner authorization).
- Verification: backend Jest 4,035 passed / 21 skipped / 0 failed (chunked); vitest 36/36; node:test 1/1; frontend 189 files, 1,573 passed, 1 skipped (one branding test flaked once while backend ran concurrently and passed 5/5 alone); tsc 0; vite build OK; API governance PASSED (91%).
- Not claimed: live Supabase/provider UAT, payment certification, production readiness.

## Addendum R9 — hired-staff workspace entry (2026-11-12)
- Added `GET /api/dealer-platform/my-workspace`, the `DealershipWorkspace` screen and entry links (personal dashboard action, account menu). A hired member signs in with their personal account, sees the dealership's public name and role, and only the sections their permissions allow. Fired/suspended/none/error → no entry, no data calls. Dealer and staff accounts never call the endpoint's membership path.
- Verification: backend Jest 4,037 passed / 21 skipped / 0 failed (one transient batch-load failure in `stage5aOwnerIdentityBootstrap`, 33/33 on two isolated reruns; not related to these changes); vitest 36/36; node:test 1/1; frontend 191 files, 1,581 passed, 1 skipped; tsc 0; vite build OK; API governance PASSED (90%). Not covered: live browser E2E, live Supabase.

## Addendum R10 — merge with origin/main and CI repair (2026-11-12)
- Tree is the merged result of origin/main and the unified-accounts branch (merge commit e4e648a) with two repairs: (1) unresolved merge marker removed from `backend/tests/regression/stage5RegistrationAndLifecycle.test.js` (kept the retirement-wording assertions); (2) `scripts/validate-v14-live-certification-contract.mjs` now accepts `dealerWorkspaceAccess(` on the dealer dashboard route (the owner-only `/finance` check is unchanged).
- Verified on this merged tree: backend Jest 4,037 passed / 0 failed (chunked), backend vitest + node:test green, `tsc` clean, v14 release-candidate gate 17/17, phase6-release / frontend-runtime-contracts / v14 runtime-preflight / lucide-icon-exports gates pass. Frontend vitest and production build were not rerun on this tree. Windows-only path-separator failure in `superAdminOperationalIntegrity.test.jsx` is pre-existing and does not occur on Linux CI.
- Nothing committed, pushed or deployed by the assistant.

## Addendum R11 — mobile marketplace, unified filters, listing approval (2026-11-12)
- **Listing approval:** the default is now "No approval — publish immediately" (`INITIAL_DEFAULTS.listingModeration = auto_publish`). Admin → Settings → Onboarding (and the inline control in Admin → Listings) offers "No approval" or "Admin approval — hold every new listing". A saved policy row keeps whatever the admin saved earlier; an unreadable/corrupt policy still HOLDS listings (fail-safe unchanged). Suspended accounts still cannot publish; admins can still reject/remove any listing. Listings already pending are not changed.
- **Account menu collapse fixed:** the mobile drawer re-ran its "expand current section" effect whenever navigation or account data re-rendered, collapsing groups the person had just opened (worst for personal accounts whose data loads after sign-in). It now runs only when the drawer opens. Regression test fails without the fix, passes with it.
- **Unified filter panel:** one `InventoryFilterPanel` powers both the desktop sidebar and the mobile sheet. Make, Model, Body, Fuel, Transmission, Condition and Colour accept typed entry plus suggestions; price, year and mileage are typed numbers with admin-configured quick picks. The server accepts `brandLike`/`modelLike`/`colorLike` (contains, case-insensitive, escaped, 2–40 characters, strings only); listed options stay exact. The silent KES 50,000 minimum-price default was removed (0 = no minimum).
- **Mobile layout:** phones get a compact search + Filters row (with active count) instead of six stacked selects; the two-car showcase stage and the four quick-action tiles are hidden below 640px so inventory is reached sooner. Tablet/desktop layouts are unchanged.
- Verification: backend Jest 4,044 passed / 21 skipped / 0 failed; frontend 192 files, 1,591 passed, 1 skipped; tsc 0; vite build OK; v14 release-candidate gate 17/17; phase6/runtime-contracts/preflight/lucide gates pass. Not verified: a live on-device visual check.

## R12 addendum — loading speed and listing presentation
- Inventory read cache (stale-while-revalidate) in `services/vehicleApi.ts`: identical requests share one call, results are reused for 30 s, an older page (up to 10 min, kept in sessionStorage) paints instantly while a background refresh runs, and every listing write clears it. The first page is prefetched in `main.tsx`.
- Marketplace: a cached page paints before the browser draws (no skeleton); a new filter keeps the previous results on screen under a thin progress bar; a failed background refresh keeps what the shopper sees. First three card photos load eagerly, the rest lazily with a fade-in; featured feed reduced from 100 to 24.
- Fixed a latent refetch flicker: facet arrays changing identity re-ran the inventory query (now keyed by signature).
- Shared listing presentation (`components/listing/ListingPresentation.tsx`) used by the dealer inventory and the personal "My listings": status badge, photo box with thumbnail-to-full fallback, facts row, quality ring.
- Evidence: tsc clean; vitest 193 files / 1,596 passed (+5 cache tests, +4 presentation tests); build OK. Measured with a 1.2 s simulated API: first load 1,667 ms to first card, repeat load 48 ms.
- Not verified: real-network timings, and the dealer/personal screens on a real signed-in device (G-27 remains partial).

## R13 addendum — dealer mobile layout and personal-account listing gate
- **Root cause of "pending" on personal accounts (new gap G-28, closed in code):** `createCar` published only when the owner policy was `auto_publish` AND a separate approved seller-capability record existed. Personal accounts never had one, so they stayed pending even with auto-publish. `createCar` now uses the same `sellerMayPublishDirectly` rule as the dealer routes: auto-publish + good standing + verified email goes live; a personal account needs no approval record unless the owner turns approval mode on. Suspended accounts, unverified emails, `hold_for_review` and an unreadable policy still hold the listing.
- **Already-pending vehicles are data, not code.** Not touched by this build. Owner-run script `scripts/audit/release-pending-personal-listings.sql` (review query, then a transaction that releases only the ids listed). Admin > Cars > Pending > Approve does the same per vehicle. The saved policy (G-26) must also be `auto_publish` for future listings.
- Dealer dashboard on phones: sticky app bar, slide-over menu (closes on selection and Escape, page does not scroll behind it), vertical grouped navigation instead of a horizontal strip, 2-column KPI cards, compact inventory rows with a thumbnail, status and three equal-width actions, search/filters on a grid, Marketing form no longer overflows. All 15 sections measured at 390 px: no horizontal overflow.
- Evidence: full backend batch run (jest in chunks) before the test updates: 4,009 passed, 1 failed, and 3 suites could not load because their mocks lacked the new export; after updating those mocks and the one outdated expectation, the 4 affected suites pass (74 tests). The full backend batch was not re-run end to end after that. Plus 2 new tests, backend vitest 36, node 1. Frontend vitest 194 files / 1,600 passed; tsc clean; build OK.
- Not verified: real devices, signed-in dealer data shapes (screenshots use stubbed API), live Supabase.

## R14 addendum
- `backend/openapi.yaml` now documents `GET /api/dealer-platform/my-workspace` (YAML parses).
- Personal-account pages (dashboard, seller platform, buyer platform, profile, saved, payments, notifications) measured at phone width with a stubbed personal login: no page-level horizontal overflow (only clipped decorative/marquee elements).
- Private-seller page wording no longer says private selling is added "once approved"; it states no seller approval or package is needed, matching the no-approval listing rule.
- Verified: frontend vitest 194 files / 1,600 passed, tsc clean, build OK, V14 contract 15/15, mobile-navigation validator run.
- Still open: members can read and act on inventory/leads/customers through the workspace screen, but there is no create/edit-vehicle form there yet (backend routes already allow it with `canListCars`/`canEditCars`); dashboard/analytics are not surfaced for members; G-20/G-25 owner SQL review; G-26 live policy switch; releasing the already-pending vehicle (owner-run script); live Supabase/provider UAT; real-device check (G-27).
