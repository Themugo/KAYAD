# KAYAD unified personal account: audit, deploy/CLI fixes and navbar lockup

**Date:** 10 November 2026
**Baseline:** `KAYAD-PRIVATE-SELLER-REGISTRATION-CORRECTED-20261110.zip`
**Status:** Changes made in the working tree only. **Nothing committed, pushed, migrated or deployed.**

Evidence below comes from commands actually run in this session. Anything that needs your live Supabase, staging or production is marked **NOT VERIFIED** with the check to run.

---

## 1. Architecture map (as found)

| Concern | Where it lives |
|---|---|
| Identity | `users` row, `role` in `user`, `individual_seller`, `dealer`, staff. Registration RPC `kayad_register_identity_atomic` |
| Policy | `system_settings.onboarding_policy` -> `getOnboardingPolicy()`; `privateSellerApprovalMode` (`disabled`/`required`), `privateSellerPackageMode` (`free`/`optional`/`required`) |
| Effective seller access | `services/privateSellerCapability.service.js` `resolveSellerState()`; `middleware/sellerCapability.js` `sellerListingAccess()`; `middleware/auth.js` `requireApproved` |
| Seller workspace UI | `src/features/PrivateSellerPlatform/pages/PrivateSellerPlatform.tsx` (sidebar, home, listings, wizard, escrow, trust) |
| Capability panel (buyer hub) | `src/components/SellerCapabilityPanel.tsx` |
| Listings | `cars` table; `controllers/carController.js`; admin moderation via `utils/carModerationGuard.js` |
| Navigation | `src/components/Navbar.tsx`, `MobileBottomNav.tsx`, `styles/kayad-navigation.css` |
| Deploy | `vercel.json` (prod), `vercel-staging.json`, `.github/workflows/deploy.yml` (Vercel CLI pinned 60.1.3) |

Effective access under the free default is computed from policy (`source: policy_default`), not from the legacy row. That is the right design and is what the spec asks for.

## 2. Findings register

| # | Finding | Evidence | Risk | Status |
|---|---|---|---|---|
| F1 | `deny()` in `middleware/sellerCapability.js` hard-coded HTTP 403, ignoring its `status` argument. Unconfigured paid-package mode returned 403 `SELLER_PACKAGE_CONFIGURATION_INCOMPLETE` instead of the intended 503. | Test `phase13eSellerCapability` failed (expected 503, got 403); probe showed the 503 code path was reached. | Medium (wrong status for clients/monitoring; still fail-closed) | **Fixed** (`res.status(status)`); 36/36 pass |
| F2 | Migration `20261110140000_private_seller_free_access_defaults.sql` ran `UPDATE users SET status='approved' WHERE role='individual_seller' AND status='pending'`, silently approving legacy pending sellers. Spec 4.2 forbids this. | File contents. Backend already admits legacy pending sellers by policy (`requireApproved`, `resolveSellerState`), so the UPDATE was redundant. | **High** (irreversible loss of historical status; would also mean enabling approval mode later finds no pending records) | **Fixed** (UPDATE removed, rationale commented). Contract test inverted to forbid it |
| F2b | Same migration redefines `kayad_register_identity_atomic`; chain test assumed a single definition. | `stage4IdentityLifecycle` S4-D-04 | Low | Test updated to expect original + one forward-only redefinition |
| F3 | Production `vercel.json` did not proxy `/uploads/*` (staging does). The SPA fallback returned `index.html` for image URLs. | `vercel.json` vs `vercel-staging.json`. Backend serves `/uploads` publicly for jpg/jpeg/png/webp (`server.js`). Creation stores relative `/uploads/<file>` with `_pending:true`; a later step swaps in Cloudinary URLs (`carController.js` ~514, ~639). | **High** for any listing whose image was not finalised: broken image on production | **Fixed**: rewrite `/uploads/:path*` -> `https://api.kayad.space/uploads/:path*`; SPA fallback excludes `uploads/`. All three Vercel validators pass. **NOT VERIFIED on production** |
| F4 | Dashboard image rendered `object-cover` with a bare `<img>`; failure showed the browser broken-image icon. | Screenshot; code at ListingCard / My Listings rows | Medium | **Fixed**: `VehicleImage` uses `object-contain` on a neutral ground, tries thumb then full URL, shows an explicit "Photo unavailable" / "No photo yet" state, and `console.warn`s the failing URL so storage faults are not hidden |
| F5 | `npm run test:jest` (backend) crashed with a JavaScript heap OOM (exit 134): 229 suites in one process hit Node's ~2 GB default. | `/tmp` run log: "Ineffective mark-compacts near heap limit" | Medium (CLI/CI cannot complete the suite) | **Fixed**: `--max-old-space-size=6144` in `test:jest` and `test:coverage` |
| F6 | Frontend tests drifted from deliberate product changes (not product bugs): dealer dashboard now calls `useAuth().signOut` (4 test files had no auth context); free-policy copy; terms copy; role/label changes; M-Pesa `normalizeIp()`. | 66 vitest failures at start; 0 failing suites after fixes except one deferred item | Low | **Fixed** by aligning tests to current behaviour. M-Pesa guard verified still fail-closed |
| F7 | `phase13dDealerIsolation`: a legacy *pending* private seller now passes `GET /api/dealer/cars`. | Probe: only `S_PENDING` returned 200 | Low/intended: spec says not to block a personal account over a legacy pending record. Dealer-business routes are still 403 for every private seller, and suspended/rejected remain 403 | Test split to assert exactly that (174/174 pass) |
| F8 | Dashboard identity copy implied a separate seller account ("KAYAD SELLER STUDIO", "Private Seller", "Seller Home", "Seller account status"). | Screenshot + source | Medium (UX/spec) | **Fixed** (see section 3) |
| F9 | Dashboard shows only listing and escrow counters. Spec 6.2 also wants saved vehicles, offers, enquiries, recently viewed, profile completion. | `SellerHomeSection` | Medium | **OPEN** (Stage 5). Needs the existing buyer/offer endpoints wired in, no mock data |
| F10 | Backend still accepts `role=individual_seller` at self-registration (legacy compatibility). The frontend already maps the seller choice to the personal account. | `authController.js` registration; `roles.test.ts` | Medium (a second identity type persists at DB level) | **OPEN**: needs a deprecation plan, not a silent removal |
| F11 | Status model mismatch. `cars.status` CHECK allows `available, sold, pending, reserved, hidden, draft`; the spec's user-facing set also lists Changes requested, Rejected, Withdrawn, Archived. | Migration CHECK constraint | Medium | **OPEN**: needs a mapping from moderation records to user-facing states, not a duplicate status system |
| F12 | Migration history cannot be validated from the archive. The new migration's preflight requires `20261025100000_private_seller_capability.sql` and the registration function. | Migration header and preflight block | **High** | **NOT VERIFIED**. Do not apply to production before replay (section 5) |

## 3. What was changed

**Navbar (KAYAD-KE lockup).** New `public/branding/kayad-mark.png` cut from your supplied logo (real icon, not recreated). Wordmark is one line: large navy KAYAD, smaller teal KE on the same baseline, divider, Kenyan flag at the far right. Legacy and road-mark logo settings migrate to the new mark; admin-uploaded logos are untouched. Responsive fixes so all five destinations fit between 1024 and 1439px; ticker "Pause notices" control made opaque.

**Unified dashboard.** Header "KAYAD PERSONAL ACCOUNT" with the spec description; free-policy note shown when `source = policy_default`; sidebar grouped as Personal account / Selling / Transactions / Account using only existing destinations (`marketplace`, `saved`, `dashboard`, `profile`, existing seller sections); status panel renamed "Personal account status".

**Deploy/CLI.** F1, F2, F3, F5, F6 and the stale validators (`homepage-convergence` hero asset, `navbar-branding`, `distinctive-brand-hero`).

## 4. Files modified

Frontend: `src/components/Navbar.tsx`, `src/components/TopNoticeStrip.tsx`, `src/context/BrandingContext.tsx`, `src/styles/kayad-navigation.css`, `src/features/PrivateSellerPlatform/pages/PrivateSellerPlatform.tsx`, `public/branding/kayad-mark.png` (new), `vercel.json`.
Backend: `backend/middleware/sellerCapability.js`, `backend/package.json`, `supabase/migrations/20261110140000_private_seller_free_access_defaults.sql`.
Tests/validators: 4 dealer test files, `Navbar.test.jsx`, `DashboardHubUnifiedAccount.test.jsx`, `Phase13iPersonalAccountStates.test.jsx`, `PublicSweep1105.test.tsx`, `Sweep1105b.test.tsx`, backend `phase13dDealerIsolation`, `phase38DeploymentRuntimeReconciliation`, `stage4IdentityLifecycle`, `stage5RegistrationAndLifecycle`, `privateSellerFreeAccessMigration`, and three `scripts/validate-*.mjs`.

## 5. The Mazda 2020 CX5: checks to run (read-only, NOT VERIFIED here)

I cannot see your database, so I make no claim about this record. Run in the Supabase SQL editor (read-only):

```sql
select id, status, user_id, dealer_id, images, cover_image, created_at
from public.cars
where brand ilike 'mazda' and model ilike 'cx%5' and year = 2020;
```

- If `images[].url` starts with `/uploads/` and has `_pending`, the Cloudinary finalisation did not complete (F3 explains why it looked broken on production; also check Cloudinary credentials and the backend logs for that car id).
- If it is an `https://res.cloudinary.com/...` URL, open it directly; a 401/404 means a storage or access-policy problem.
- `status = 'pending'` is the genuine moderation state. Confirm the car appears in the admin review queue. **Do not approve it to change the counters.**

## 6. Migration and production safeguards

- Do not mark migrations as applied by hand and do not create `private_seller_capabilities` manually.
- Reconcile `20261025100000` first, then replay the whole chain on a fresh disposable database, then staging, then confirm RLS, and only then production.
- Recheck the earlier finding (production `individual_seller` pending record, missing table, missing `20261025100000`) against the live database before applying anything.

## 7. Verification actually run (10 Nov 2026, this session)

| Check | Result |
|---|---|
| Frontend `tsc --noEmit` | Clean |
| Frontend `vite build` | Succeeds (chunk-size warnings only) |
| Frontend vitest (full) | 187 files, 1,559 passed, 1 skipped, 0 failed |
| Backend jest (run in memory-bounded batches) | About 4,000 tests across 200+ suites, 0 failed; 1 rehearsal suite skipped by design |
| Backend `test:vitest` / `test:node` | 36/36 and 1/1 |
| Every `npm run` gate in `ci.yml` and `deploy.yml` | All pass (Vercel contract, deployment readiness, runtime contracts, brand/navbar/hero, homepage convergence and the rest). `verify:production` needs a live URL and was not run |
| Navbar, 13 viewports (320, 360, 375, 390, 414, 430, 768, 820, 1024, 1280, 1366, 1440, 1920) | Real Chromium: no horizontal overflow, no clipped nav, KE smaller than KAYAD, flag after KE on the same line, square logo box, no console errors |

Not run: the seller dashboard in a browser (it needs a signed-in session), PostgreSQL replay, staging/production UAT, live provider flows, real-device testing, ESLint (no lint script in the project).

## 8. Remaining work (not started)

F9 (buyer and transaction counters), F10 (legacy role deprecation), F11 (status mapping), the full listing-lifecycle and RLS test programme against a real database, and a mobile pass over the seller wizard and gallery (3-4 scrollable thumbnails, remaining-image counter).
