# KARYARD KE — Master Implementation 01: Unified Personal Account & Dashboard Design Convergence

Date: 2026-11-18. Base: the Phase 1–4 verified tree (`KARYARD-PHASE1-4-VERIFIED-20261118`). Nothing was committed, pushed, deployed or migrated; no production data was touched; backend, API contracts and authorization were not modified.

## 1. Initial source audit
- `DashboardHub.tsx` already was the single personal shell (sections overview / activity / my-vehicles / create-listing / buying / messages / seller-enquiries / auctions / deals / performance / account / trust / help) with data fetching for listings, escrow and ownership.
- `Profile.tsx` (My Account) carried its **own nested navigation** (`My Account sections`: Overview / Personal Information / Notifications / Security) inside the dashboard, with tab state — the exact nesting the brief asked to remove.
- Overview used 4 cards (My listings, Saved, Open deals, Owned vehicles) and a generic "Your personal marketplace" action grid; sidebar was a flat 10-item list; headings were duplicated on the My Vehicles page (banner h1 + section h1 + wrapper heading); listing status showed raw DB values (`available`).
- Sent enquiries/negotiations (`/leads/mine/offers`) were only visible in the Activity timeline, not in Buying.

## 2. Architecture preserved
One personal identity and one shell (`DashboardHub`); `dashboard:<section>` URL aliasing (`navLocation.ts`); lifecycle services (`transitionMyListing`, `PATCH /api/cars/:id/lifecycle`); `MarketplaceOfferPanel`; seller-enquiries + activity integration; profile/security components (`PhoneVerification`, `ChangePasswordForm`, `NotificationPreferences`); backend ownership rules; business/dealer separation. No second dashboard, no new data layer. New code is presentational and lives in `src/components/dashboard/personal/`; data fetching stays in `DashboardHub`.

## 3. My Account changes (Gate A — passed first)
Single stacked workspace inside DashboardHub: identity card (email-verified chip from the real `emailVerified` flag, member-since, sign-out) → Personal Information (name/phone/location edit, read-only email, Phone Verification) + Security (password change, 2FA "not available yet") + Notification Preferences + history link. Nested `My Account sections` nav and tab state removed. Edit/Cancel/Save, phone step-up password, error toasts and logout confirmation logic kept verbatim.

Gate A acceptance (all executed in a real browser against the contract double): renders in DashboardHub ✔; nested sidebar gone ✔; name edit sends `PUT /auth/profile` without identity ✔ and persists after refresh ✔; notification toggle PATCHes preferences ✔ and persists after refresh ✔; phone verification: wrong code rejected, correct code verifies, persists after refresh ✔; password change: wrong current password rejected, correct one succeeds ✔; sign-out confirms and calls `/auth/logout` ✔; URL `?nav=profile`/`dashboard:account` ✔; desktop+mobile visual checks ✔; navigation tests ✔; no auth regression ✔.

## 4. Dashboard overview changes (Gate B)
Greeting banner (navy→teal gradient: greeting, description, identity pill "One personal account · Buy and sell privately", Sell a vehicle, Browse vehicles, Refresh, Compact view). Metrics: My listings, Saved vehicles, Active enquiries, Open deals — all from existing sources, each showing `…` while loading and **`Unavailable` on failure, never a made-up zero**. Main column: My vehicles summary (3 most recent: photo, make/model, year, mileage, fuel, location, KES price, lifecycle badge, views if provided, Manage) + Buying activity tiles (Saved vehicles, My offers, In escrow, Owned vehicles). Secondary column: Quick actions (existing sections/routes), Recent activity (5 newest real events from listings, escrow, enquiries received, enquiries sent), Account & trust (email and phone chips; green "Verified" only when the backend says so; business-membership link retained). Empty states for no listings / no activity.

## 5. My Vehicles changes (Gate C)
Status filters with counts (All, Drafts, Under review, Active, Paused / hidden, Sold; Reserved appears only when a listing is reserved) built on the existing `getListingLifecycle`/`countByLifecycle`. Cards: photo, make/model, year, mileage, fuel, location, price, human lifecycle label (was raw `available`), views when supported, quality ring. Actions unchanged and still gated by status: Edit details, Manage photos (add/remove/make cover — now opened on demand), Hide / pause (active only), Republish (hidden only), Mark as sold (active/hidden), Remove with confirmation — now hidden for sold/reserved, matching the backend delete guard (`carDeletionGuard.js`); auction/bid locks remain server-enforced and reported on click. Duplicate headings removed.

## 6. Navigation changes (Gates D/E)
Sidebar grouped OVERVIEW / BUYING / SELLING / ACTIVITY / ACCOUNT, sticky on desktop, every entry maps to a rendered view (unit-tested: each button navigates to a valid `dashboard:<section>`). Mobile keeps the grouped "Dashboard sections" disclosure plus the global bottom dock. Buying now has **"Enquiries & offers you sent"** (with the participant-scoped `MarketplaceOfferPanel`); Seller enquiries is explicitly "received on your listings". Each record appears once; sent and received lists are disjoint (tested).

## 7. Mobile adaptations
Compact banner with wrapped actions, 2×2 metric cards, single-column vehicle cards with larger photo, stacked identity card with full-width sign-out, grouped section disclosure, existing fixed bottom dock with preserved clearance. No horizontal overflow at 1440/1280/768/390/360.

## 8. Files modified
New: `src/components/dashboard/personal/{personalNav.ts, PersonalSidebar.tsx, PersonalGreetingBanner.tsx, PersonalOverview.tsx}`, `src/__tests__/components/DashboardHubPersonalOverview.test.jsx` (16 tests).
Modified: `src/components/DashboardHub.tsx`, `src/pages/Profile.tsx`, `src/features/PrivateSellerPlatform/pages/PersonalSellingModule.tsx`, `src/__tests__/pages/ProfileAccountSettings.test.tsx`, `src/__tests__/features/PersonalSellingModuleGate.test.tsx` (anchor moved from a removed duplicate sub-heading to the stable workspace region), `scripts/browser-journeys-phase1-4.mjs` (now 69 checks; no-tab account, phone/password/notification/sign-out, filters, photo toggle, `--width`/`--shot` options), and six validators that pinned moved source text (`validate-phase3-my-account-convergence`, `-personal-account-pages`, `-phase4-personal-activity-lifecycle`, `-unified-dashboard-design-audit`, `-individual-profile-edit-cancel` — retargeted to the new files, no assertion weakened).

## 9–10. Tests executed and results
- `tsc --noEmit` (this project's `lint` script): clean. Production `vite build`: succeeds.
- Full frontend suite: **200 files, 1690 tests passed, 1 skipped, 0 failed** (a first run surfaced 4 failures in `PersonalSellingModuleGate`, caused by my removal of a duplicate sub-heading; the tests were repointed at the stable workspace region and the full suite re-run clean).
- New/changed suites: DashboardHubPersonalOverview 16/16, ProfileAccountSettings 10/10, PersonalSellingModuleGate 12/12; all 7 DashboardHub-related files pass.
- Playwright journeys (stateful contract double): **69/69 at 1440, 1280, 768, 390 and 360** (J1 unified account, J2 lifecycle, J2 photos, J3 buying, J4 seller enquiries, J5 activity, J6 my account).
- Browser audits: axe accessibility 26 screens / 0 violations, keyboard 10/10; dock clearance 64 pages pass; width sweep 126 loads / 18 widths / 0 issues; mobile-nav certification 91/91; mobile dock validator 9/9.
- Validators: 34 failed before this work and 34 fail now on the same set (pre-existing, unrelated to the personal account: admin/staff/homepage/provider/env-dependent). The 5 that my change broke were fixed; no new failures. `validate-local-runtime` flaked once in the baseline run and passes now.

## 11. Before / after screenshots
`audit-screenshots/master-implementation-01/before|after/` — overview, My vehicles, My Account at 1440/1280/768/390/360 (before = Phase 1–4 verified tree), plus after-only Buying and Seller enquiries. Full-page captures: the fixed bottom dock appears mid-page in tall mobile captures; that is a capture artifact (dock clearance is verified separately).

## 12. Outstanding limitations (honest)
- Password change, phone OTP, notification persistence and sign-out were exercised against a **contract double**, not a live backend: there is no live Supabase, SMS or email provider in this environment. Component logic, request shapes and persistence-after-refresh are real; delivery of an actual SMS/email is not verified.
- "Saved vehicles" shows `Unavailable` in the browser double (it does not serve favourites); the count path is unit-tested (4 → "4").
- "Active enquiries" = received enquiries whose stage is not sold/lost/won/closed/archived. "My offers" = enquiries/negotiations you sent (`/leads/mine/offers`), not auction bids. "Owned vehicles" (ownership records) is shown instead of "Purchases": no separate purchase-record source exists.
- Paused = `hidden`: the schema cannot tell an owner pause from a moderation rejection, so the filter is labelled "Paused / hidden". Views/fuel appear only when the API returns them.
- Not adopted from the reference: a standalone "Browse vehicles" sidebar entry (available in the banner, quick actions and top nav), a "Settings" entry (My Account holds settings), and per-card ⋮ menus (explicit buttons are used).
- Backend suites were not re-run (no backend changes). Live/staging certification scripts that need external services were not run. Nothing is committed or pushed.
