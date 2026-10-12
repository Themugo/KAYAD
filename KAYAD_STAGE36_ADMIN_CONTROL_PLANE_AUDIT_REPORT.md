# KAYAD — Admin Control Plane Audit Report (Stage 36 basis)

**Audit basis:** `KAYAD-STAGE36-SHOWROOM-CANONICAL-SEARCH-MOBILE-POLISH-20261012.zip`
**Source zip SHA-256:** `bc008a5ab7db739b5c626ea5848bcb18d09276cabdba18416f443e72d7eda796`
**Date:** 2026-10-12
**Scope delivered this pass:** Stage 0 (baseline), Stage 1 (authorization audit), Stage 2 (hardcode census and the two concretely pre-identified fixes), plus the real regression battery (typecheck, build, frontend/backend test suites, backend boot, 209-script validator battery).
**Explicitly NOT delivered this pass (see §7):** Stage 3 (canonical configuration registry), Stage 5 (multi-message ticker schema), Stage 6 (taxonomy moderation tooling), Stage 7 (versioned config/rollback), Stage 8 (control-plane UX consolidation), Stage 9 (new contract/role-matrix test suites), Stage 10 (staging DB/RLS/Playwright/provider-sandbox certification). This is a continuation baseline, not a claim that the full 11-stage brief is complete — per the brief's own instruction, "full audit passed" is not claimed where live/staging evidence is missing.

---

## 1. Stage 0 — Baseline

- Input zip verified: SHA-256 `bc008a5ab7db739b5c626ea5848bcb18d09276cabdba18416f443e72d7eda796`.
- Working copy: `/home/claude/stage36/kayad-stage36` (not a git repo — no `git status`/commit/branch available from this zip; this sandbox has no linked GitHub account, so no commit/push/deploy was performed, consistent with the brief's constraint).
- Node: `v22.22.0` installed vs. `>=22.22.2` required by `package.json`/`backend/package.json`/`.nvmrc` — the same one-patch-version gap disclosed in every prior stage of this engagement. `npm install --engine-strict=false` used as the one-time CLI override (not persisted to `.npmrc`).
- Dependencies installed and audited for both frontend and backend (see §5).
- Admin-surface route inventory: `backend/routes/adminRoutes.js` alone declares **69** `router.get/post/put/patch/delete` registrations; additional admin-adjacent route files exist (`configurationRoutes.js`, `bulkAdminRoutes.js`, `supportTicketAdminRoutes.js`, `cmsRoutes.js`, `adSlotRoutes.js`, `heroSlideRoutes.js`, `regionalConfigurationRoutes.js`, `platformFactoryRoutes.js`, and others). A line-by-line, file/table/permission/test matrix for all of these (the brief's §6 acceptance matrix, applied platform-wide) is a multi-day effort; this pass applies that matrix in full depth only to the items the brief names explicitly (branding/footer, `/public/config`, navigation authority, the two pre-identified defects) and gives a representative, evidence-based pass over the rest (§2, §6).

## 2. Stage 1 — Authorization audit (real evidence, not UI inspection)

- **Single source of truth confirmed, not duplicated.** `backend/config/roles.js` defines `ROLE_HIERARCHY`, `STAFF_ROLES`, `SELLER_ROLES`, `PERM` (the permission constants) and `ROLE_PERMISSIONS`. `backend/middleware/rbac.js` imports `PERM`/`ROLE_PERMISSIONS` from `roles.js` and re-exports a `PERMISSIONS` object whose every key is a direct alias of a `roles.js` `PERM` constant (e.g. `MANAGE_ESCROWS: PERM.MANAGE_ESCROW`, `MANAGE_SETTINGS: PERM.MANAGE_PLATFORM`) — confirmed by direct read, not a second independent permission system. `middleware/role.js` re-exports from `rbac.js`. **PASS** — no duplicate-authority defect here.
- **`webhoist` and `superadmin` bypass is real and total.** `hasPermission()` in `roles.js` returns `true` unconditionally for `role === WEBHOIST` before consulting the permission table; `superadmin`'s `ROLE_PERMISSIONS` entry is `Object.values(PERM)` (literally every permission). This matches the brief's "highest-risk" framing exactly — flagged, not newly discovered, and out of scope to narrow in this pass without an explicit instruction (narrowing a bypass is a security-policy decision, not a bug fix).
- **`adminRoutes.js` layering confirmed by direct read:**
  1. `GET /public/config` is registered **before** the global guard, and only ever reads via an explicit Mongoose `.select(...)` allowlist (`platformName galleryTitle gallerySubtitle fontDisplay fontBody fontSizePct baseFontSize lineHeight branding allowGuestBrowsing heroCarIds heroFeaturedMode heroPresentation heroCardContent navigation`). Verified this allowlist does **not** include any `daraja`/`bank`/`reconciliation` or other secret-bearing field name present elsewhere in the schema-less `PlatformConfig` model. **PASS** — the brief's item B/#3 concern ("full inventory and tests" of this allowlist) is satisfied for the allowlist's safety; a dedicated allowlist-regression test is not yet added (see §7).
  2. `router.use(protect, adminOnly)` applies immediately after.
  3. A path-regex `router.use(...)` then maps URL fragments (`escrow`, `payments?|transactions?|...`, `cars?|listings?|auctions?|bids?`, `staff|users?|dealer-verifications?`, `ads?|campaigns?`, `inspection|ntsa|inspector`, `support|chat`, `security|audit|logs?`, `analytics|reports?|market-data`, `settings?|config|cms|theme|branding|platform`) to a `requirePermission(...)` call, as defense-in-depth under the already-applied global admin guard. Read in full: the branches are checked in a fixed order and the first match wins (e.g. a hypothetical `/admin/settings/payments-config` path would hit the `payments` branch before the `settings` branch, since `payments` is checked earlier — this makes that one case *more* restrictive, not a bypass). No branch was found that fails to assign a permission for a sensitive keyword while assigning one for an adjacent, less-sensitive keyword. This is a real defense-in-depth design as the brief's source map describes it; a full hostile-path fuzz test (every registered route's path tested against every role) is Stage 9 work, not completed here.
  4. `backend/tests/admin/navigationAuthority.test.js` (35 tests) passes in full (re-run this pass: `35/35`), covering admin config authorization, persistence/normalization, auditing and rejection of invalid navigation payloads — reused, not duplicated.

## 3. Stage 2 — Public hardcode census (evidence-based, not exhaustive)

### 3a. The two concretely pre-identified defects — fixed, verified by direct read before/after

1. **Stale brand default.** `src/pages/admin/AdminSettings.jsx`: `DEFAULTS.platformName` was `'Giclan Motors'`; changed to `'KAYAD'`. `DEFAULTS.supportEmail` was `'support@giclanmotors.co.ke'`; changed to `'support@kayad.co.ke'` (confirmed `kayad.co.ke` is the platform's real, established domain via cross-reference against `ReferralStats.tsx`, `VehicleMarketplace.test.tsx`, `ConfigurationCenter.jsx`, `SEOManager.jsx`, `docs/fusion/05-auth-map.md`).
2. **Config-load failure masquerading as a confirmed default.** Added `configLoadError` state to `AdminSettings.jsx`; the config-fetch `catch` block now sets a visible, dismissible error banner ("Could not load saved settings from the server. The values shown below may not reflect what is actually configured — fix the connection and reload before saving.") instead of silently keeping the fallback defaults with no indication the load failed. The audit-log fetch's own catch is left as a comment-only no-op (audit log is explicitly supplementary and its failure must not block settings), which is now distinguished in the code from the settings-load failure it was previously conflated with.

### 3b. Additional finding located during this pass (not previously named in the brief) — **P1, disclosed, not fixed**

**Duplicate/dead footer implementations; the live footer bypasses `BrandingContext` entirely.**

Direct read of the actual render tree (not file existence) shows:

- `src/components/Footer.tsx` is imported only by `src/components/AppLayout.tsx`.
- `src/components/layout/Footer.tsx` is imported only by `src/components/layout/CustomerLayout.tsx`.
- **Neither `AppLayout` nor `CustomerLayout` is rendered anywhere in `src/App.tsx`'s actual route tree** — `App.tsx` contains only a passing code comment mentioning `CustomerLayout`, never an import or a render of it. `AppLayout.tsx` is otherwise referenced only from `src/__tests__/App.test.jsx`.
- The footer actually rendered in production is a **third, separate, inline `<footer>` block hardcoded directly in `App.tsx`** (around line 776), with its own literal copy — `"KAYAD Automotive Marketplace East Africa"`, `"Verified Automotive & Escrow Platform East Africa"` — and a hardcoded `"K"` badge. It does **not** import or consume `BrandingContext` / `useBranding()` at all.

**Consequence:** the admin branding controls in `AdminSettingsBranding.jsx` (logo, wordmark, tagline, footer description, copyright, palette) that are designed to flow through `BrandingContext` to "the footer" do not reach the footer a real visitor sees. Both `Footer.tsx` components are reachable only from dead layout wrappers. This is exactly the duplicate-footer risk the brief's §2A called out ("Audit the duplicate footer implementations and actual route/layout usage before editing") and belongs to the brief's own `PUBLIC-CONSUMER-HARDCODED` classification. It was not fixed in this pass: rewiring the live `App.tsx` footer onto `BrandingContext` (or retiring the two dead components) is a real product/layout decision with blast radius across every route, which this session's standing "fix genuine defects found with narrowly-scoped diffs" instruction does not extend to without the user weighing in on which of the three implementations should become canonical. Flagged as the top candidate for Stage 4 (Branding/content parity).

### 3c. Spot-checked, already-safe surfaces

- `/public/config`'s field allowlist: confirmed safe (§2, item 1).
- `backend/models/PlatformConfig.js`: schema-less (`createModel("PlatformConfig")`), so the *entire* public/private boundary is the route's explicit `.select()` — there is no schema-level field restriction to fall back on if the route's allowlist is ever edited carelessly. Documented as a standing risk for whoever next touches that route.

## 4. Configuration ownership overlap — confirmed real, not fixed (Stage 3 work)

Direct file inventory confirms at least **three** separate, independently-modeled configuration stores exist today:

| Store | File(s) | Used for (as read from source) |
|---|---|---|
| `PlatformConfig` | `backend/models/PlatformConfig.js`, `backend/routes/adminRoutes.js` | Branding, fonts, hero/ticker presentation, navigation, guest browsing |
| `ConfigEntry` | `backend/models/ConfigEntry.js`, `backend/controllers/configurationController.js` (835 lines), `backend/routes/configurationRoutes.js` | Generic config entries, reference data, vehicle/location master data, country configuration |
| `FeatureFlag` | `backend/models/FeatureFlag.js` | Feature flags |

No single registry maps a given setting key to exactly one of these three stores today. Building that registry is Stage 3 work and was not attempted this pass (the brief explicitly says "Migrate nothing until ownership and compatibility are established" — attempting it without the full settings census would risk exactly the duplicate-key problem the brief warns against).

## 5. Real regression results (this pass)

| Check | Result |
|---|---|
| `npx tsc --noEmit` | PASS — 0 diagnostics |
| `npx vite build` | PASS — build succeeds (one pre-existing chunk-size advisory, not an error) |
| Frontend `npx vitest run` | PASS — 81/81 files, 643/643 tests, 1 honest skip |
| Backend `npm install --engine-strict=false` | PASS — 812 packages added |
| Backend `npm audit --omit=dev` | PASS — 0 vulnerabilities (22 dev-only advisories, same pattern as every prior stage) |
| Backend `npm run test:jest` | PASS — 79/79 suites, 1159/1159 tests (includes `navigationAuthority.test.js` 35/35) |
| Backend `npm run test:vitest` | PASS — 5/5 files, 16/16 tests |
| Backend `npm run test:node` | PASS — 1/1 |
| Backend boot (`node bootstrap.js`, `NODE_ENV=development`, ephemeral JWT/session secrets) | PASS — `/health` returns `{"status":"degraded", "checks":{"database":"degraded"}}` correctly with no live Supabase/Redis configured; graceful SIGTERM shutdown confirmed clean |
| Full validator battery (209 scripts) | **195/209 PASS** after fixes in this pass (186/209 before); remaining 14 are disclosed, non-code environment gaps (§7) |

Two genuine, intermittent test-timing bugs found and root-caused (not production defects — see §8 for the full evidence trail):
- `VehicleMarketplace.test.tsx`'s mobile hero pair-cycling tests: a real React passive-effect ordering race specific to the test harness (the component itself behaves correctly — the dock's "Next" button cannot even render until data has loaded, by which point a real browser has already flushed the effect). Fixed by making the test wait for the hero's own async state to settle before interacting, and by correcting two `getByTestId` calls that assumed a single pair-image-stage element when the component always renders two (left + right).
- `Showroom.test.jsx`'s empty-state test: the test's own `useToast` mock returned a fresh object (and fresh `vi.fn()`) on every render, breaking the real hook's stable-reference contract and causing `Showroom.jsx`'s `loadCars` effect to re-fire continuously (confirmed via instrumentation: 31 invocations in 400ms), flickering the empty state in and out of existence. Fixed by hoisting one stable mock `toast` fn, matching the real module's behavior. The same unstable-mock pattern exists in five other test files (`DealerAuctionSetup.test.jsx`, `LoginPage.test.jsx`, `ForcePasswordChange.test.jsx`, `dealer/DealerDashboard.test.jsx`, `dealerOnboardingTruth.test.jsx`) but does not currently cause visible failures there — disclosed as a latent risk, not fixed, since none of those are demonstrably broken today.

## 6. Validator-battery fixes applied this pass (source-level, narrowly-scoped, each with before/after evidence)

| Validator | Finding | Fix |
|---|---|---|
| `validate-brand-palette-convergence.mjs` | `src/components/layout/Footer.tsx` used a literal black drop-shadow (`rgba(0,0,0,.12)`) on the logo, against the established `rgba(3,19,27,…)` dark-navy-teal convention used everywhere else (confirmed via 3 other call sites in `VehicleMarketplace.tsx`) | Changed the one literal to match the established convention |
| `validate-final-system-surface-guard.mjs`, `validate-navigation-convergence.mjs` | Both asserted the mobile dock keeps exactly one `key: 'menu'` entry — stale since Stage 32 (`validate-stage32-mobile-menu-polish.mjs`, still present and documented) deliberately replaced that tab with `Saved` because the Navbar header's own hamburger already opens the one shared drawer | Updated both checks to assert "no duplicate menu tab + header hamburger opens the drawer" instead of reverting Stage 32 |
| `validate-stage32-mobile-menu-polish.mjs` | 4 of its own checks were stale against later, legitimate changes: the Saved action gained local tab-tracking state (`setSelectedTab` alongside `onNavigate`), `isActive()`'s Saved check moved into the function's fallback return, and the dock's "Search" tab was renamed "Showroom" (the Stage 36 brief's own documented rename target) | Updated the four literals to match current source |
| `validate-premium-presentation-pass.mjs` | Mobile hero wrapper's className gained `px-3` and tightened `pt-4`→`pt-3` as part of mobile spacing polish | Updated the literal |
| `validate-stage24-theme-convergence-20261012.mjs` | Public inspections hero gained an additive, CSS-defined `kayad-auto-services-hero` class between two already-checked classes | Loosened the literal to a regex tolerating an inserted class |
| `validate-stage25-admin-logo-identity-20261012.mjs` | Navbar logo's `object-contain` moved from an inline Tailwind utility into the dedicated `.kayad-brand__image` CSS class (Stage 33); footer's centered-logo max width was bumped from 240px/60vw to 250px/68vw | Updated both literals |
| `validate-stage27-brand-identity-admin-editability-20261012.mjs`, `validate-stage28-navbar-ticker-convergence.mjs` | Both pinned the pre-Stage-33 default logo asset (`kayad-premium-master.png`) and the pre-Stage-33 `max-w-[142px]` inline width utility; Stage 33 (`STAGE33_MASTER_BRAND_LOCKUP_NAVBAR_REPORT_20261012.md`, read in full) deliberately introduced a new `kayad-road-mark.svg` default emblem and moved width control into the same dedicated, per-breakpoint `.kayad-brand__image` CSS class | Updated both literals to the documented Stage 33 design |

Every update above is a documented, more-restrictive-or-equal, later change overriding an earlier literal check — none reverts source code or weakens a check's intent. Each is backed by either a reference to the specific stage report that documents the change, or direct cross-file confirmation (e.g. the Stage 32 validator's own still-passing checks confirming the header hamburger is the intended sole menu opener).

## 7. Explicitly not done this pass (honest disclosure, per the brief's own instruction)

- **Stage 3** (single canonical configuration registry spanning `PlatformConfig`/`ConfigEntry`/`FeatureFlag`) — not started; §4 is the inventory this would build from.
- **Stage 4** (rewiring the live footer onto `BrandingContext`, or retiring the dead `Footer.tsx`/`layout/Footer.tsx` components) — found, disclosed (§3b), not fixed; needs a product decision on which implementation is canonical.
- **Stage 5** (multi-message, schedulable ticker) — existing single-ticker `platform_config.heroPresentation`/`TopNoticeStrip` controls were not extended.
- **Stage 6** (taxonomy moderation/alias tooling for seller-entered make/model variants) — not started.
- **Stage 7** (versioned config, optimistic-concurrency rollback, stronger approval flow for high-impact settings) — not started; the `configLoadError` fix in §3a addresses only the specific masking defect named in the brief, not the broader versioning/rollback ask.
- **Stage 8** (consolidated Admin Control Plane index/UX) — not built.
- **Stage 9** (new contract/role-matrix/hostile-payload test suites beyond the existing, reused `navigationAuthority.test.js`) — not added. The `/public/config` allowlist (§2, item 1) was verified by direct read this pass but has no dedicated regression test pinning it yet.
- **Stage 10** (Playwright desktop/mobile at 320/360/390/430px, staging Postgres/RLS matrix, provider-sandbox tests) — not run; this sandbox has no browser-automation tooling invoked this pass, no staging database, and no live communications-provider credentials (`validate-communications-provider-certification.mjs` and `validate-live-runtime.mjs` fail for exactly this reason, as in every prior stage).

## 8. Disclosed, non-code environment gaps (14 of 209 validators; none are code regressions)

All 14 remaining validator failures trace to exactly four causes, every one previously disclosed in this engagement's prior stages:

1. **Missing deployment-template files, not a repo defect.** `.env.example`, `.env.production.example` and `backend/.env.example` are entirely absent from this foundation zip, yet the repo's own `.gitignore` (`.env.*` with explicit `!.env.example` / `!.env.production.example` negations) and `backend/.gitignore` both confirm these files are meant to be tracked in git, not excluded. Their absence here looks like an artifact of how this foundation zip was assembled locally, not a change to the committed codebase — recreating them from guesswork would mean fabricating production values (Vercel org/project IDs, exact commit-SHA release-verification logic, etc.) this session has never seen, so they were left as a disclosed gap rather than invented. Affects: `validate-deployment-readiness.mjs`, `validate-homepage-convergence.mjs`, `validate-phase40.mjs`, `validate-phase59.mjs`, `validate-phase60.mjs`, `validate-production-host-contract.mjs`, `validate-registration-onboarding.mjs`, `validate-canonical-architecture.mjs` (1 of its checks), and `validate-release.mjs` (aggregates 3 of the above).
2. **No live credentials in this sandbox:** `validate-communications-provider-certification.mjs` (no email/SMS provider credentials), `validate-live-runtime.mjs` (no `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`).
3. **No Docker daemon available:** `validate-local-supabase.mjs`.
4. **The persistent one-patch Node version gap** (`22.22.0` installed vs. `>=22.22.2` required): `validate-phase6-release.mjs`, `validate-v14-runtime-preflight.mjs`.

## 9. Change ledger (this pass)

| File | Change |
|---|---|
| `src/pages/admin/AdminSettings.jsx` | `DEFAULTS.platformName` → `'KAYAD'`; `DEFAULTS.supportEmail` → `'support@kayad.co.ke'`; added `configLoadError` state, a visible error banner, and distinguished "load failed" from "no saved config yet" in `loadConfig()`'s catch block |
| `src/pages/Showroom.jsx` | Added the three missing `useState` declarations (`searchFacets`, `modelFacets`, `facetsLoading`) that were being set via `useEffect` but never declared — a genuine `ReferenceError` crash on every render, fixed |
| `src/components/layout/Footer.tsx` | Logo drop-shadow color: `rgba(0,0,0,.12)` → `rgba(3,19,27,.12)`, matching the established dark-navy-teal shadow convention |
| `src/__tests__/components/VehicleMarketplace.test.tsx` | Added a `waitFor` on the hero's own pair-count state before clicking "Next featured vehicles" (fixes a test-only effect-ordering race); fixed two `getByTestId('hero-pair-image-stage')` calls to `getAllByTestId(...)[0]` since the component always renders two matching elements by design |
| `src/__tests__/pages/Showroom.test.jsx` | Hoisted a single stable `toast: vi.fn()` mock instead of returning a fresh object/fn on every `useToast()` call, matching the real module's stable-reference contract |
| `scripts/validate-brand-palette-convergence.mjs` | No change (now passes against the Footer.tsx fix) |
| `scripts/validate-final-system-surface-guard.mjs` | Updated the "one `menu` tab" check to "no duplicate menu tab, header hamburger is sole opener" (Stage 32 is the documented reason) |
| `scripts/validate-navigation-convergence.mjs` | Same update, mirrored |
| `scripts/validate-stage32-mobile-menu-polish.mjs` | Updated 3 literals to match legitimate later changes (local tab-state tracking, fallback-return refactor, Search→Showroom rename) |
| `scripts/validate-premium-presentation-pass.mjs` | Updated the mobile hero wrapper className literal (`px-3 pb-4 pt-3`) |
| `scripts/validate-stage24-theme-convergence-20261012.mjs` | Loosened the public-inspections-hero class literal to a regex tolerating the additive `kayad-auto-services-hero` class |
| `scripts/validate-stage25-admin-logo-identity-20261012.mjs` | Updated the navbar-logo-sizing and footer-centered-logo-width literals to match Stage 33's CSS-class-based approach and the later size bump |
| `scripts/validate-stage27-brand-identity-admin-editability-20261012.mjs` | Updated the default-logo-asset literal from `kayad-premium-master.png` to the Stage-33-documented `kayad-road-mark.svg` |
| `scripts/validate-stage28-navbar-ticker-convergence.mjs` | Updated the navbar-logo-width-control literal from the retired `max-w-[142px]` utility to the Stage-33 `.kayad-brand__image` CSS class |
| `src/__tests__/components/MobileBottomNav.test.tsx` | No net change (a `menu`-tab addition was tried, found to contradict Stage 32's documented design, and fully reverted) |
| `src/index.css` | No net change (same revert as above) |
| `src/components/MobileBottomNav.tsx` | No net change (same revert as above) |

No backend production source files were changed this pass beyond `AdminSettings.jsx`/`Showroom.jsx` (frontend) — the `/public/config` allowlist and `roles.js`/`rbac.js` authorization chain were read and verified safe, not modified.
