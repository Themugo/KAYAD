# KAYAD Personal Seller Lifecycle — Consolidation & Independent Audit (2026-11-17)

Baseline: `KAYAD-PERSONAL-SELLER-LIFECYCLE-ENQUIRIES-PERFORMANCE-20261116.zip` (kept untouched). Scope: consolidate, verify, enforce, polish. No rebuild, no redesign, no production data/migration/deploy, no Git commit/push performed.

## 1. Baseline architecture confirmed
- One Personal Account identity (roles `user` / `individual_seller`) for buying and private selling; five registration types preserved; mobile personal dock Home, Search, Sell, Messages, Account; dealer navigation separate.
- Unified dashboard `DashboardHub` (overview, my vehicles, create listing, buying, messages, auctions, deals, performance, seller enquiries, account, trust, settings, help). Retired buyer/seller shells are not mounted.
- Lifecycle RPC `kayad_personal_listing_lifecycle_atomic`, audit table `personal_listing_lifecycle_events`, route `PATCH /api/cars/:id/lifecycle`, enquiries `GET /api/leads/mine/seller-enquiries`, performance `GET /api/cars/my-listing-performance` (first-party metrics, privacy-hashed visitors, no invented conversion rate).

## 2. Defects found and corrected
| # | Area | Finding | Correction |
|---|------|---------|-----------|
| 1 | Lifecycle route | Role guard let dealer-type accounts reach the personal lifecycle route | Route and DB function both refuse non-personal owners (`PERSONAL_ACCOUNT_REQUIRED`, 403 / SQLSTATE 42501) |
| 2 | Lifecycle locks | `refund_pending` purchase outcome did not block hide/mark-sold | Added to lock set (additive migration) |
| 3 | Audit ordering | Audit rows could tie inside one transaction (`now()`); admin moderation hide was recorded after the status change | `clock_timestamp()` default; moderation records audit first, a failed audit leaves status unchanged |
| 4 | Photos | Last photo of a live listing could be deleted; storage object deleted before DB save (broken reference risk) | Server rule 409 `LAST_PHOTO_REQUIRED` (non-staff, non-draft); storage deletion after save, failure logged |
| 5 | Navigation | `navLocation` dropped `section` for dealer deep links | Retained for `dealer-dashboard` |
| 6 | Staff | "Work for {dealership}" action missing from personal overview | Restored |
| 7 | Seller state | Selling module hid real seller states / apply form | Renders `SellerCapabilityPanel` with honest error text; staff guard |
| 8 | Brand/a11y | Amber palette breach; WCAG contrast failures (teal-on-white buttons, light grey helper text, 10px labels) found by axe | Brand-safe colours; axe now 0 violation groups on 26 screens |
| 9 | Hero | Desktop pause/dots pill overlapped the vehicle caption at 1024–1200 px and the card at wide widths | Pill repositioned per breakpoint; hero audit 162 loads, 0 issues |
| 10 | API governance | Three routes undocumented | Added to `backend/openapi.yaml` |
| 11 | Tests | Backend tests hit unmounted paths / unmocked Supabase (hang) | Fixed; new regression tests (see certification) |

## 3. Work retained / duplicates
- Retained: all earlier hero (one-vehicle-per-slide), auction financial-integrity and re-award repairs, admin command-centre sync (pass3 patches ported cleanly; featured-campaign `manage_ads` already present).
- Duplicates/dead code: `PrivateSellerPlatform.tsx` (1,010 lines) and `BuyerPlatform.tsx` are orphaned retired shells referenced only by tests/validators. **Not deleted** (owner decision, see register OW-02). Stray `.orig` patch files removed.

## 4. Files changed (vs supplied zip)
Backend: carController, carRoutes, adminRoutes, personalListingLifecycle.service, openapi.yaml; tests marketingUploadAuthorization, stage5OwnerOnboardingSettings (edited) + personalListingLifecycleRoute, personalListingPhotoRemoval (new).
DB: `supabase/migrations/20261117090000_personal_listing_lifecycle_role_gate.sql` (additive `CREATE OR REPLACE` + column default; rollback in header), `supabase/tests/personal_listing_lifecycle_atomic.sql` (new), `scripts/validate-personal-lifecycle-db.sh` (new).
Frontend: DashboardHub, PersonalSellingModule, PersonalBuyingModule, FinanceMarketplace, FinancingView, VehicleMarketplace, TopNoticeStrip, navLocation, AdminSidebar, AdminView, AdminSettings, permissions, admin-command-centre.css, plus updated tests.
Validators realigned (security intent kept) because the retired buyer/seller shells and old nav were replaced by the unified dashboard and five-item dock: 17 `validate-*.mjs` files and `browser-certify-mobile-nav.mjs`, `browser-audit-hero.mjs` (hero now one vehicle per slide).

## 5. Security findings
Dealer access to personal lifecycle (fixed, double-enforced); owner identity always from session, body `ownerId` ignored (tested); moderation vs seller-hide vs capability blocks cannot be overridden by the seller (DB-tested); enquiries return metadata only (no buyer contact data); performance route personal-only. No secrets touched.

## 6. Performance / limitations
Enquiry list capped (~200) without cursor pagination; photo removal addresses images by array index (concurrent removals could target the wrong image — mitigated by ownership + last-photo rule, not eliminated). No load testing against a live backend was possible.
