# KAYARD KE — Phase 1–4 Final Runtime Verification Report

Date: 2026-11-17/18 · Source: `KAYARD-PHASE1-4-CLAUDE-SOURCE-UNDER-30MB-20261117.zip` (extracted unmodified to a dedicated directory; baseline retained)

## J. Final release assessment: **CONDITIONAL PASS**

Source, unit/integration tests, type-check, production build, DB-level lifecycle suites and real-browser journeys all pass in the sandbox. Five defects were found and fixed (one routing defect that broke a Phase 4 feature, one partial-rebrand defect, and stale tests/validators). **No critical or high-priority source defect remains.** The assessment is *conditional*, not a full pass, because the live backend (Supabase, M-Pesa, Brevo), real staging accounts and real devices were unreachable, so the six journeys were verified against a contract double, not a real backend (section I).

---

## A. Environment

| Item | Value |
|---|---|
| OS | Linux 6.18 (cloud sandbox) |
| Node | v22.23.4 (satisfies `>=22.22.2`; `engine-strict=true` untouched) |
| npm / package manager | npm 10.9.9, **npm only**; lockfile untouched |
| Dependency install | `npm ci` succeeded (root and `backend/`); registry reachable via the sandbox proxy (the previous `EAI_AGAIN` did not recur) |
| Browser tooling | Playwright + Chromium (already in the repo's toolchain; **no new framework introduced**) |
| Database tooling | Disposable PostgreSQL 16 with Supabase stubs (loopback only) |

## B. Repository integrity

- Source directory: `KAYAD/` (root name preserved). **No `.git` in the archive**; none was created or assumed.
- Preserved previous corrections (inspected, no defect found, **kept**): `PersonalActivityTimeline.tsx` teal/neutral palette; `public/favicon.svg` brand gradient; `validate-kayad-navbar-branding.mjs` assertions.
- `docs/` is **absent from the supplied archive** (trimmed to fit 30 MB). This is why five validators fail here (see D).
- The archive's `scripts/validate-personal-lifecycle-db.sh` had lost its executable bit; I restored it.

## C. Phase-by-phase verification

| Phase | Scope | Result |
|---|---|---|
| 1 | Unified personal identity/dashboard; role separation | PASS — one identity (`/auth/me`), no buyer/seller shell rendered, dealer role does not load personal inbox (J1, J4); dealer/personal separation checked in source and by route/DB tests |
| 2 | KAYARD KE brand identity | PASS after fixes — `validate-kayard-brand-identity-phase2` passes; stale titles/mocks/assertions corrected; PWA icon SVGs aligned to approved favicon; "KAYARD Live" inconsistency fixed. **Residual:** ~115 user-visible "KAYAD" strings remain in `src` (finding F-02) |
| 3 | My Account | PASS — `validate:phase3-my-account` passes; J6 |
| 4 | Personal activity | PASS — `validate:phase4-personal-activity` passes; J5 |

## D. Test evidence (all executed)

| Command | Result |
|---|---|
| `npm run validate:phase3-my-account` | PASS |
| `npm run validate:phase4-personal-activity` | PASS |
| `node scripts/validate-kayard-brand-identity-phase2.mjs` | PASS |
| Focused: `PersonalActivityTimeline`, `PersonalBuyingModule`, `navLocation` | **Initially FAIL (3 tests), fixed**, now PASS |
| `DashboardHubUnifiedAccount.test.jsx` | PASS |
| Full `npx vitest run` | **Initially 51 failures / 7 files, fixed.** Final: 199 files, **1,672 passed**, 1 skipped, 0 failed |
| `npx tsc --noEmit --pretty false` | PASS, 0 errors |
| `npm run build` | PASS |
| `npm run lint` (= `tsc --noEmit`) | PASS. ESLint on `src`: 0 errors, ~1,858 warnings (pre-existing class; not suppressed) |
| Prettier | NOT APPLICABLE — not a project dependency, repo is not Prettier-formatted |
| Backend jest (13 sequential chunks; full suite OOMs in one process) | **Initially 1 failure, fixed.** Final: **4,107 passed, 21 skipped, 0 failed** |
| Backend vitest + node:test | PASS |
| Validators (344) | **311 PASS / 33 FAIL** — see below |
| DB: fresh migration replay | 200 of 202 apply; the 2 failures need Supabase-only `rls_auto_enable` (pre-existing) |
| DB: `personal_listing_lifecycle_atomic.sql` | **58/58 PASS** (ownership, dealer/staff denial, auction/bid/escrow/purchase locks, seller-hide vs moderation) |
| DB: lifecycle concurrency races (3 runs) | 10 pass / 0 fail each run |
| DB: `phase13f_private_seller_lifecycle.sql` | 43 PASS, 0 FAIL |
| `npm audit --omit=dev` | Root: 5 high (all Vite build toolchain: `vite`, `@vitejs/plugin-react`, `fdir`, `picomatch`, `tinyglobby`); backend: 10 moderate, 0 high. Not changed (lockfile policy; needs owner decision, F-05) |

**The 33 failing validators:** (a) 28 environment-bound validators (network, credentials, Docker, live runtime), identical set to the previously delivered baseline, including the four named admin validators; (b) 5 that read files under `docs/`, which this archive omits (`business-ownership-and-mobile-nav`, `phase39`, `phase8-operations`, `stage24-theme-convergence-20261012`, `write-route-coverage`). I confirmed these 5 pass in a tree that contains `docs/`. **None is caused by Phase 1–4 code.**

Browser audits (real Chromium, production build): mobile-nav certification 91/91; width sweep 126 loads/18 widths, 0 issues; page audit 230 loads, 0 issues; accessibility (axe) 26 screens 0 violation groups + 10/10 keyboard checks; dock clearance 64 pages ALL PASS; hero audit 162 loads, 0 issues, 0 behaviour failures.

## E. End-to-end journeys

Harness: `scripts/browser-journeys-phase1-4.mjs` (new; Playwright; run `node scripts/browser-journeys-phase1-4.mjs [--mobile]`). **The real React app, services and canonical `MarketplaceOfferPanel` run unmodified; only `/api/**` is answered by a stateful in-memory contract double** that enforces ownership, participant and lifecycle rules. Result: **58/58 checks pass at 1280×900 and 58/58 at 390×844.**

| # | Journey | UI behaviour (vs contract double) | Against the real backend |
|---|---|---|---|
| 1 | Unified personal account | **PASS** — Overview, Buying, My vehicles (Selling), Activity, Messages, My Account (Personal info, Notifications, Security) all reachable in one dashboard, one identity, no buyer/seller shell | BLOCKED |
| 2 | Personal listing lifecycle | **PASS** — edit persists across reload; photo upload/remove; confirmation dialog with lock warning; hide → republish → mark sold; status shown in dashboard and activity; invalid transition (409), foreign listing (403) and unknown action (400) refused; last photo refused locally and by rule. **NOT RUN: listing *creation* wizard** (multi-step form not driven) | BLOCKED (real enforcement evidenced by the DB suite and backend route/regression tests) |
| 3 | Buying & negotiations | **PASS** — canonical `MarketplaceOfferPanel` rendered; counter, withdraw and submit send correct action/amount/idempotency key. **NOT RUN: buyer-side accept and decline** (accept exercised from the seller side in J4; decline not exercised) | BLOCKED |
| 4 | Seller enquiries | **PASS** — enquiries listed, no buyer contact data, same `MarketplaceOfferPanel`, seller accepts, buyer/seller amounts consistent; dealer role does not load the personal inbox | BLOCKED |
| 5 | Personal activity | **PASS** — listing, seller enquiry, buyer enquiry, offer, auction bid, escrow events; no duplicates; All/Selling/Buying/Transactions/Auctions filters; refresh; honest "Unavailable" for a failed source; retry recovers; true-empty state; all-sources-down shows retry (not a false empty history); another account's negotiation denied | BLOCKED |
| 6 | My Account | **PASS** — profile edit persists after refresh; notification preference PATCH; Security tab shows password controls; no user id in any request body. **NOT RUN: an actual password change** (controls rendered only) | BLOCKED |

Note: "dashboard shows sold" and "timestamps" checks are coarse (text presence / a date on each row); they do not prove ordering.

## F. Security

Source review (backend), independent of frontend hiding:
- **Offers:** `offerNegotiationController` limits lead access to participants; the offer RPC binds `offerId` to `leadId`; accept/reject/counter are recipient-only and withdraw sender-only (migration `20261110120000_canonical_offer_negotiation_workflow.sql`).
- **Bids:** `getMyBids` scopes to the authenticated bidder. **Escrow:** `/escrow/my` is participant-scoped.
- **Listing lifecycle:** route refuses non-personal roles (403) and ignores body ownership; RPC refuses non-personal owners and takes an owner lock; verified by the 58-assertion DB suite and concurrency races on real PostgreSQL.
- **Seller enquiries / performance:** personal-only, metadata only (no buyer contact data).

Limitations (stated plainly): no live staging backend or test accounts, so IDOR was tested at source, SQL and contract-double level, **not by black-box probing of a running API**. Session/CSRF/cookie handling was read, not penetration-tested. Frontend component tests are not claimed as backend proof.

## G. UI/UX

Desktop (1280) and mobile (390), plus the 18-width sweep: no horizontal overflow, no fixed-nav overlap (dock clearance), no axe violations, keyboard focus trap/Escape/focus-return pass, visible focus indicators. Mobile dashboard sections live in a collapsible "Dashboard sections" control and work by touch. **Defect found and fixed:** the Seller enquiries menu item navigated to the public home page (see H). Touch-target size was covered by the existing audits only; no separate measurement was made.

## H. Corrections (every change)

| File | Reason |
|---|---|
| `src/utils/navLocation.ts` | **Real defect (Phase 4):** `dashboard:seller-enquiries` was not an allowed navigation id, so selecting *Seller enquiries* in the dashboard sent users to the public home page. Added the alias. |
| `src/__tests__/utils/navLocation.test.ts` | New regression test: all 13 personal dashboard section ids resolve to `dashboard` with their section preserved |
| `src/utils/pageTitle.ts`, `src/pages/KAYADLive.tsx` | Partial-rebrand defect: footer said "KAYARD Live" while page, title and copy said "KAYAD Live" |
| `public/icons/icon-192.svg`, `icon-512.svg`, `badge-72.svg` | Still used an older navy palette; aligned to the approved `favicon.svg` (identical structure) |
| `src/__tests__/features/PersonalActivityTimeline.test.tsx` | Fixture returned the same offer event for both conversations (the component correctly showed 2 rows). Made events lead-specific; added no-duplicate and unavailable-offer-source tests |
| `src/__tests__/utils/pageTitle.test.ts`, `src/__tests__/pages/PublicSweep1105.test.tsx` | Title suffix updated to approved "KAYARD KE" |
| `src/__tests__/components/Navbar.test.jsx`, `NavbarStaffMenu.test.jsx`, `src/__tests__/App.test.jsx`, `src/__tests__/AppDealerRouting.test.jsx` | `BrandingContext` mocks lacked `DEFAULT_LOGO_URL`/`onBrandLogoError` added in Phase 2 |
| `src/__tests__/components/ListingPolish.test.tsx` | Gradient ban narrowed: the approved K mark icons use a brand gradient; lettering and filter bans kept everywhere; the flat road-mark symbol stays gradient-free |
| `backend/tests/regression/siteDesignEditor.test.js` | Default `logoText` is now "KAYARD KE" (Phase 2 default in `utils/siteDesign.js`) |
| `scripts/validate-homepage-search-metadata.mjs`, `validate-kayad-distinctive-brand-hero.mjs`, `validate-stage25-admin-logo-identity-20261012.mjs`, `validate-public-journeys-final.mjs`, `validate-unified-navigation-convergence.mjs` | Stale KAYAD-era strings/asset names aligned to the Phase 2 approved identity; security/routing intent unchanged |
| `scripts/browser-journeys-phase1-4.mjs` | New journey harness (no new framework) |
| `scripts/validate-personal-lifecycle-db.sh` | Executable bit restored |

No backend authorization, financial or lifecycle rule was changed. No assertion was deleted to make a test pass.

## Duplication audit

| Item | Path | Classification |
|---|---|---|
| Retired buyer/private-seller shells | `src/features/PrivateSellerPlatform/pages/PrivateSellerPlatform.tsx`, `src/features/OwnershipPlatform/pages/BuyerPlatform.tsx` | **Unnecessary duplicate / legacy**. Not mounted by `DashboardHub`; referenced only by tests and validators. **Not removed** (consumers not yet migrated; owner decision) |
| Second public footer | `src/components/layout/Footer.tsx` (+ `CustomerLayout.tsx`) vs `src/components/Footer.tsx` / inline footer in `App.tsx` | **Suspected unnecessary duplicate** (one validator still reads the `layout/` copy). Not removed |
| Personal dashboard / profile / notification stores | `DashboardHub.tsx`, `Profile.tsx`, `communications/preferences` | Shared single implementation, no duplicate found |
| Offer interaction | `MarketplaceOfferPanel` used by Buying and Seller enquiries | Shared reusable implementation (canonical) |
| Personal lifecycle | `personalListingLifecycle.service.js` + RPC | Single implementation |
| Dealer CRM / dealer dashboards | dealer dashboard, CRM and membership code | Legitimate separate business functionality (untouched) |
| Personal activity | `PersonalActivityTimeline.tsx` | Single implementation |

## I. Remaining blockers and findings

| ID | Sev | Item | Needed to clear |
|---|---|---|---|
| B-01 | High (blocks full PASS) | Journeys not run against a real backend/DB with real test accounts | Staging Supabase + API + test users, then run the six journeys manually or adapt the harness to hit staging |
| B-02 | High | 28 environment-bound validators need network/credentials/Docker | Run in CI: `for f in scripts/validate-*.mjs; do node "$f"; done` with secrets |
| B-03 | Medium | `rls_auto_enable` missing outside Supabase (2 migrations unreplayable locally) | Apply and verify on Supabase staging |
| B-04 | Medium | `docs/` absent from this archive, so 5 validators fail | Restore `docs/` from the full repository |
| B-05 | Medium | No real-device, M-Pesa, Brevo, push-notification testing | Staging UAT |
| F-01 | Low | Listing *creation* wizard, buyer-side accept/decline, real password change not exercised in E2E | Add to staging runs |
| F-02 | Low | ~115 user-visible "KAYAD" strings remain in `src` (partial rebrand) | Product decision on naming scope, then bulk replace with test updates |
| F-03 | Low | Orphaned retired shells and the duplicate `layout/Footer.tsx` | Owner approval, migrate validators, then delete |
| F-04 | Low | Backend jest must run chunked (single-process OOM) | Chunk in CI or raise heap |
| F-05 | Medium | Frontend prod-dependency audit: 5 high (Vite toolchain) | Planned Vite/plugin upgrade with a full re-test; build-time exposure rather than runtime |

Nothing was committed, pushed, deployed or migrated in production.
