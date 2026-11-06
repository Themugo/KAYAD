# Free listing by default; subscription optional (2026-11-02)

## Root causes
- D-73: `assertDealerCanCreateListing` hard-coded SUBSCRIPTION_REQUIRED for any dealer without a plan; no admin switch existed.
- D-74: sidebar "Verification: Pending" read `user.status/approved` (not populated); now uses the verification-status service (same as Settings).
- D-75: Account status / Settings>Plan assumed the gate was always on.

## Behaviour now
- Default (nothing saved): approved dealers list free, no plan, no cap/expiry. `listingsLocked` admin switch still blocks.
- Admin > Settings > Listing & Plans: "Require an active subscription to list vehicles" (MANAGE_PAYMENTS, audited). When ON: previous rules (402 no plan / expired / cap).
- Admin still grants/removes plans per dealer (User Management > Plan) and bulk via zero-cost onboarding.
- Storage: `system_settings` key `dealer_listing_policy`. No migration, no SQL for you to run.
- Unreadable settings store fails OPEN to free listing (logged).

## Evidence (logs/)
tsc 0; build 0; frontend vitest 1384 passed/1 skipped (166 files); backend jest 3834 passed + 1 failed (known baseline `stage5f5RoleRouteMatrix`, D-11); backend vitest 36; node:test pass. New: jest dealerListingPolicy (15), vitest AdminSettingsListing (3), DealerAccountStatus (6).
Validators: 14 non-zero, all in the baseline failing set or live/production aggregates needing real environments (certify:*, verify:*, validate:live-runtime, validate:release).

## NOT verified
Real browser run; real hosted DB (no writes by me); Cloudinary upload; Brevo delivery. OpenAPI doc does not list the 2 new admin routes (wave3 route-doc validator already failing in baseline). Invited team members still have no Dealer Hub workspace.

## Follow-up (same day): "Failed to create car" (D-79)
Root cause: the dealer listing is created by the DB function `kayad_create_dealer_listing_atomic`, which enforces a subscription itself and raised a plain error that the controller returned as a generic 500. Free mode now bypasses that function (normal create path); required mode still uses it, and its errors map to a clear 402.

## Super Admin immutability, employment levels, company e-mail (D-76..D-78)
- Owner and superadmin-role accounts cannot be suspended, banned, deactivated, deleted, re-roled or re-emailed through any admin route, by anyone including other owners (403 IMMUTABLE_ACCOUNT). API-level only; a direct database edit is not blocked.
- Owner-only Employment levels (Admin > Staff): name + supported base role + exact permission set; never admin/owner authority.
- Company e-mail domain with optional enforcement. Creates the login address only: no mailbox, no invitation e-mail.

## Listing audit against the REAL schema (D-80..D-86)
Method: `scripts/rehearse-listing-local.sh` builds a throwaway local PostgreSQL from all 191 migrations (Supabase stubs only) and runs the real validateCar -> createCar/updateCar -> Car model -> db layer and the real `kayad_create_dealer_listing_atomic` against it (21 cases). It never touches a hosted database. The persisted-listing, edit, duplicate-VIN, blank-field, overflow and subscription-required paths were exercised; photo upload to Cloudinary, email and the browser were not.
New listings are created `pending` by default (Admin > Settings > Onboarding > listing moderation = hold for review). Switch to auto-publish there if approved dealers should appear publicly immediately.

## Branding end to end (D-87..D-91)
Settings > Branding writes platform_config.branding (PUT /api/admin/config, validated server side). The site reads it from /api/admin/public/config. New: logo/name/tagline appear on login, register, admin, Dealer Hub and Private Seller portal via BrandMark; navbar bar/text/menu strip and footer bg/text/accent are saved server-side and applied as CSS variables; saves refresh the running site. Not verified: a real browser render, the hosted database, a live logo upload. Theme Studio (browser-only colours) is not routed in the app and was left untouched.

## Traffic analytics (D-97)
Hosted DB lacks the analytics tables. Collection is now a quiet no-op and the admin report answers 503 "not set up" until `runbooks/traffic-analytics-setup-20261102/APPLY_traffic_analytics.sql` is run by the owner. Data accrues only after the tables exist.

## Vehicle page honesty and listing lists (D-98, D-99)
The public vehicle page now shows only what the seller entered. Removed: invented description, Maintenance/Ownership/"Why it stands out", Condition Summary, default features, default engine/drive/condition. Engine and drive type are now passed from the listing. Dealer Inventory: numbering, larger thumbnails with photo count, details line, search, status filter, sort. Admin Listing Management: numbering and larger thumbnails. Not verified in a real browser.

## Mobile navigation, hero and vehicle presentation (D-100)
Phone hero reduced from ~530px to ~420px (search now on the first screen); vehicle cards get a taller photo area on phones, a photo count and no unrecorded "0 km"; the bottom dock is slimmer and dealers see a dealer-only dock; header Sell/Add button compacted. Validators that pinned the old hero padding string were updated to the new one (intent unchanged: stable hero footprint); dock deliberately has no Menu key (the header owns the menu). Not verified on a real phone.

## Mobile menu polish (D-101)
CSS-only redesign of the mobile drawer (kayad-navigation.css, final layer). Before/after screenshots in logs-menu-polish. Signed-in, dealer and admin variants not screenshotted.

## Sold flow, vehicle details and navigation (D-102, D-103)
Dealers: Mark sold (confirm, optional buyer/price); sold vehicles collapse into a 'Sold vehicles (n)' section and the numbered active list renumbers. Backend fix: the old mark-sold route wrote a non-existent column. Details page: all photos, honest status, back/prev/next navigation for everyone, admin/owner 'Manage in Listing Management', dealer 'Edit listing', phone sticky action bar. Not verified on a real device or hosted DB. One backend analytics test timed out once under full-suite load and passed on rerun.

## Speed, sign-in and phone listing (D-104)
- Database check (read-only): the Land Cruiser V8 (05752bf6…) is status available, not deleted, price and photos present; /api/cars returns it unfiltered. No data or filter cause found for it missing on phone.
- Changes: session hint for the Sign In button, GET de-duplication, non-blocking fonts, marketplace loading state from first render.
- Validation: logs-speed/ (tsc, build, vitest, jest, node-test pass; validators identical to baseline).
- NOT verified: deployed site, real phone, actual load times, why the vehicle did not show on the user's phone (likely slow or failed API call; unconfirmed).

## Inventory scaling and car details (D-105, D-106)
- Phone: one-row toolbar (Sort/view/Filters), compact photo-left cards, whole card opens the vehicle, blank specs omitted. Desktop toolbar controls on their own row at 1024-1439 px.
- Details: honest empty safeguards note, full transmission text, compact header, status icon only for Available.
- Validation: logs-inventory-phone/. tsc, build, frontend 1434, backend vitest, node-test pass; validators identical to baseline. Jest 3871 pass, 1 fail: tests/regression/visitorAnalytics "yesterday excludes today" fails when run shortly after local midnight (00:10 EAT) and passed in earlier runs; backend code was not changed in this round. Test left as is.
- NOT verified: real phone, deployed site, real photos.

## Click-through audit: details, actions, navigation (D-107 to D-110)
- Fixed: shared Modal dialog behaviour, stale URL after Contact/Escrow, Share robustness, View Showroom (dealer filter + chip), Place Bid to auction lot.
- Backend: GET /api/cars?dealer=<uuid> added (needs deploy; until deployed the showroom view will show the unfiltered list).
- Validation: logs-click-through/. tsc, build, frontend 1443, jest 3875, backend vitest, node-test pass; validators identical to baseline.
- NOT verified: real phone/browser, deployed backend, signed-in admin/owner/dealer links (unit-tested only), real photos.

## Public pages sweep (D-111, D-112)
- Audited 16 public routes at 390 and 1366 px (errors, overflow, tap targets, headings, titles) and clicked all 18 mobile menu items: every one lands correctly.
- Fixed: per-screen page titles, main headings, phone tap targets.
- Observed but not changed: Auctions and Services pages showed their error states because my test API returned empty replies (not evidence of a real fault); auction journey strip scrolls sideways by design.
- Validation: logs-public-sweep/. tsc, build, frontend 1449, jest 3875, backend vitest, node-test pass; validators identical to baseline.
- NOT verified: real phone, deployed site, signed-in flows.

## Auction page and business-flow audit (2026-11-04)
Code-read audit against the 10 stated steps; nothing run against real M-Pesa, Supabase prod or a phone.
Fixed: D-113 STK push ignored dealer account and used a constant reference (now per-car AccountReference AUC-xxxxxxxx; string misuse removed). D-114 private-seller commitments not forced to KAYAD-held (now forced; seller account ignored; unverifiable type fails safe to KAYAD-held). D-115 silent 50000 default amount removed (fails closed). D-116 two different bidder identities (K-ID at registration vs "Bidder #x" on bids) unified; D-117 room ignored bidderTag and showed no own standing (now shows K-ID, YOU marker, leading/outbid line).
Open, owner decision: D-118 losers' holds stop at refund_pending: no wallet and no payout code (needs wallet/B2C design + SQL). D-119 dealer-direct collection to a dealer paybill/till needs that dealer's own Daraja credentials; today all STK money lands on KAYAD's shortcode. D-120 certificate/winner notification and winner-to-dealer handover read in code only, not exercised.

## Auction wallet, loser refunds and dealer-direct collection (2026-11-04)
Closes D-118 and D-119. New: wallet + loser refund (keep in wallet or send to own M-Pesa) + withdrawals with automatic reversal on failure; verified dealer paybill/till collection with AES-256-GCM credentials and admin verification; dealer-custody holds skip KAYAD ledger postings; screens (WalletPanel on the auction page after close and under Payments; dealer Banking > Auction commitment account).
Verified: SQL migration loaded and re-run on a scratch local Postgres 16 with scenario checks (refund, double refund, wrong user, dealer custody refusal, overdraw, withdraw replay, failure reversal, paid ledger, replay no double credit). 32 new/updated backend tests, 5 frontend tests. Full run final17: one failure (route-inventory guard flagged the new refund route) fixed by classifying it as an exempt "refund of held funds" like the escrow refunds; that file re-run alone passes (89/89); the rest of final17 was green. A complete re-run after that one-line test change was not done.
NOT verified: migration on the hosted database (owner-run), real M-Pesa STK to a dealer till, real B2C payout and callback, the screens on a phone, a verified-dealer flow end to end in sandbox.

## Master audit round (2026-11-04)
Gaps found and closed: D-121 winner certificate screen existed but was never shown and had no backend (now winner-only GET /api/auctions/:id/certificate, View winner certificate button, accessible dialog, print/save as PDF with print CSS, shows bidder ID, commitment credited, balance due, pay-by). D-122 win/loss notifications gave no next step (win: certificate + payment deadline; loss: refund to wallet/M-Pesa). D-123 phone auction list: bidder-profile card and a floating "swipe the room" bubble pushed live auctions down and covered text (profile card desktop-only, bubble removed). D-124 room bid history amount wrapped under the name on phones; mixed emoji icons replaced with consistent icons (Crown, Check, Lock, Zap).
Verified: headless Chromium at 390 and 1366 widths with mocked API (screenshots in logs-master-audit); full run final18 green (tsc, build, 176 frontend files, 3897 backend tests, same 14 baseline validators).
NOT verified: real device, real data, winner flow with a real outcome, handover after payment (read only), admin screen for verifying dealer accounts does not exist (API only).

## Auction audience engagement (2026-11-04)
New: live watching count, views and unique visitors, follow (live/ended notices), like, public comments (anonymous IDs, anti-scam screening, owner/staff moderation), owner Audience insights (totals, peak watchers, funnel visitors>followers>registered>bidders, 14-day trend).
Verified: migration on scratch Postgres 16 incl. re-run and counter/peak/unique checks; 15 backend + 9 frontend tests; full run final19 green (177 frontend files, 3912 backend tests, same 14 baseline validators); headless render at 390 and 1366 widths with mocked API.
NOT verified: migration on the hosted DB (owner-run); real Socket.IO presence with multiple users/instances (count is unit-tested against a mocked room; with several server instances it needs the Socket.IO adapter to be cluster-wide); real follower notification delivery; real phone.
Known design limits: two tabs count as two watchers; comments sit above the bid panel on phones (the sticky Place bid bar remains); no admin UI for comment moderation beyond owner/staff hide; no report-comment button yet.

## Deeper audit round (2026-11-04)
Fixed: D-129 reminder sweep could skip auctions (window widened, minutes from end time); D-130 followers and registered people now get in-app reminders; D-131 winner handover panel (dealer contact only after payment, never private sellers); D-132 comment reporting (3 distinct reports auto-hide) and admin reported list; D-133 admin Audience panel and dealer collection accounts list; D-134 comments moved below the bid grid; D-135 stale "Payment destination" removed from the setup wizard and contract (money goes to the verified dealer account, otherwise KAYAD holds it). Intentional behaviour change: validateConfig no longer errors on a missing destination; reported here, no test weakened (new test auctionSetupCommitment).
Migration 20261104150000_auction_engagement.sql now also creates auction_comment_reports (owner-run; re-run safe).
Verified: targeted tests plus full run final20 (see logs-deep-audit).
NOT verified: migrations on hosted DB, real M-Pesa/B2C, real Socket.IO multi-user, notification delivery, real phone/printer, winner flow with a real outcome. Open business decision: "direct" settlement still routes the winner's balance through KAYAD, while the stated model says KAYAD is not involved after the win. Not covered: auction cards in the list show no audience counts.

## Listing, vehicle details and logo polish (2026-11-04)
Components improved: gallery VehicleCard (Gallery, home, dashboard, dealer profile), marketplace inventory card (VehicleMarketplace + index.css mobile rules), VehicleCard.tsx title wrap, VehicleDetailModal gallery, status chip and mobile price/contact bar. No routes, APIs, data models, navbar or bottom navigation were changed.
Honesty fixes (D-136 to D-138): removed the "150-PT AUDITED" claim, made-up mileage/transmission/location defaults and the stock-photo fallback; verified badge only when the record says verified; auction badge follows the real lifecycle.
Details page (D-139, D-140): duplicate fixed bottom bar removed (one sticky bar stays); gallery uses a stable aspect ratio, labelled controls, arrow-key navigation and clear selected-thumbnail state.
Logo (D-142): refined symbol-only mark (no letters, flat colours) at public/branding/kayad-road-mark.svg, favicon.svg and icons/icon-192/512/badge-72 (svg and png). Wordmark text in the navbar is unchanged.
Price format: gallery cards now say "Ksh" like the other cards (was "KES"). Prices themselves are untouched.
Verified: tsc and production build; 12 new tests (ListingPolish); headless Chromium at 320, 390, 768 and 1366 px: no horizontal overflow, one mobile action bar; screenshots in logs-listing-polish. Full run: see logs-listing-polish/final22.
NOT verified: real phone/tablet, real vehicle photos and data, touch swipe on the gallery, the reference's hero artwork (not part of this scope), iOS home-screen icon rendering, existing admin-uploaded custom logos. Not changed: Sort label clips at 320px in the inventory toolbar.

## End-to-end public and business-flow audit (2026-11-05)
Method: headless Chromium sweep of 25 public addresses at 390 and 1366 px, signed-out flow checks (404, legal pages, footer, sign-up, contact seller, saved), reachability analysis to separate live code from dead legacy files, and a scan of backend write routes for missing authentication.
Fixed: D-143 real "Page not found" page for unknown addresses; D-144 Terms of Service and Privacy Policy pages, footer links and sign-up consent line; D-145 footer brand mark, copyright and contact route; D-146 Compare no longer invents drive/condition/rating/inspection values; D-147 dealer profile no longer shows stock photos as the dealer's.
Checked and found sound: signed-out "Contact seller" lands on a sign-in prompt; every path used by live code is handled; backend write routes all sit behind authentication (route files use router-level or per-route protection; webhooks use their own secrets); bank pre-approval only submits for admin verification.
Not changed: the old Header/CustomerLayout/Footer/BuyerOverview and similar files are not reachable from the app (dead code) so their links were not edited; the inspection-marketplace page logs "Invalid provider search response" when the provider API returns an unexpected shape (in this test the mock did; not shown to be a live fault).
Verified: tsc, production build, new tests (PublicSweep1105, 25), headless checks; full run final24 green: tsc, build, 180 frontend files, 3922 backend tests, validators identical to baseline (see logs-end-to-end-1105/final24). An earlier run (final23) caught one App smoke-test failure from my footer change; the footer was fixed, the test is unchanged.
NOT verified: real servers (the 404 is client-side; the host must serve the app shell for every address, and returns HTTP 200), legal wording (drafted from how the code behaves; needs your review or a lawyer's), the signed-in buyer, dealer, admin and inspector screens in a browser, real M-Pesa, real data and phones.

## Further end-to-end audit (2026-11-05, round b)
Fixed: D-148 dealer dashboard no longer scrolls sideways on phones; D-149 Admin Cars and Site Designs no longer crash when the API returns no policy/designs; D-150 page titles for dealer auction setup/operations/onboarding/team setup, password change and email verification; D-151 Support FAQ now explains bid commitments, refunds and what happens after you win; D-152 vehicles saved while signed out now persist in the browser and merge into the account on sign-in.
Verified: tsc, new tests (Sweep1105b 4, guestSavedVehicles 3), admin and features folders, full run final25 (see logs-end-to-end-1105b).
NOT verified: signed-in screens only with mocked data, merge against a real account, real phone, FAQ wording (owner review), migrations on hosted DB, real M-Pesa/B2C, real Socket.IO presence, winner flow with a real outcome.

## Design implementation 1106 (approved design package)

- Hero captions moved beneath each vehicle (D-153); filter typography refined, structure unchanged (D-154).
- Super Admin Featured Vehicles: migration `supabase/migrations/20261106120000_featured_campaigns.sql` (owner-run), backend service/routes, admin page, hero consumption of running campaigns (D-155, D-156).
- Intentional test change: sidebar destination count 33 to 34 (D-157).
- Not verified: migration on hosted DB, real photography, real browsers/phones, campaign flow against live data, screenshots of the implemented pages.

### Phone inventory card from the supplied mockup (D-159)
Photo stage with Verified chip (only when the record says verified), heart, photo counter and expand; thumbnail strip with "+N More"; location line; title and price beside the spec list; View Vehicle Details and Contact Seller. Desktop cards keep their layout. Rendered headlessly at 390 and 320 px with placeholder photos. Not verified: real devices, real photos, Contact Seller as a distinct action.

### Polish round (D-160 to D-164)
Grounded hero cars, styled filter panel, refined grid and list cards, no-login Contact Seller (intentional change to the public vehicle projection test: detail now carries seller phone), and Super Admin configurable year and price choices. Not verified: real photos and devices, hosted settings persistence, real calls/WhatsApp.

### KE flag window (D-165)
Editable from Admin > Settings > Branding (switch and label). Backend validation added. Not verified: saving through the live settings route, real devices.
