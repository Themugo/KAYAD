# 00 — Executive launch readiness (KAYARD KE first dealer + personal accounts)
Date: 2026-11-25. Evidence classes: **DISPOSABLE** (real Express app + PostgreSQL + PostgREST on loopback, stubbed Brevo/Cloudinary), **BROWSER-DISPOSABLE** (real Chromium against the same stack), **HOSTED-READONLY** (SELECT/catalog reads on the hosted Supabase project, no writes), **NOT VERIFIED** (needs hosted access this audit does not have).

## Release decision: **NO-GO for live onboarding right now. CONDITIONAL GO once section 3 is cleared.**
Under the strict standard (section 13 of the brief) a GO needs production prerequisites verified. Brevo, Cloudinary and Redis on the hosted API are unknown, one launch migration is not applied on the hosted database, and deferred modules (auction bidding, payments) are switched ON in hosted settings. None of these is a code defect; all are bounded operational steps (see `10-FINAL-GO-LIVE-RUNBOOK.md`). The code path itself has **no known open critical defect** on the disposable stack.

## 1. The ten questions
| # | Question | Answer | Evidence class |
|---|---|---|---|
| 1 | Personal buyer can register and use the platform | **Yes** — register, e-mail verify (single-use, hashed token), login, browse, contact dealer | DISPOSABLE (journeys 20, 30, 36), BROWSER-DISPOSABLE (buyer opens storefront → vehicle) |
| 2 | Personal seller can register, onboard and list | **Yes (API)** — unified `role=user` account lists and publishes under the auto-publish policy; **listing flow not re-driven in a browser this pass** | DISPOSABLE (journeys 07, 20, 30) |
| 3 | Dealer can register and complete onboarding | **Yes** — pending dealer identity, application, admin notified, owner approval, one approval notice | DISPOSABLE (20, 36, 37) |
| 4 | Dealer can publish and manage a vehicle | **Yes** — publish with photo, live without per-listing approval, edit, inventory, draft hidden from public | DISPOSABLE (09, 36, 37; all re-run today) |
| 5 | Dealer can establish a public storefront | **Yes in code; hosted needs one migration for logo/banner** (`20261125090000`). Page, allowlisted API, owner preview, logo/banner upload, 7 widths verified | DISPOSABLE + BROWSER-DISPOSABLE |
| 6 | Dealer can invite and manage staff | **Yes** — invite, role, permissions, suspend/revoke, backend permission refusals. Token acceptance proven in journeys 17/21/22; real e-mail receipt NOT VERIFIED | DISPOSABLE (17, 21, 22, 29, 37) |
| 7 | Notifications reach the correct dealer and authorised staff | **Yes for enquiries, approval, staff changes, applications**; exactly-once and negative assertions pass for 8 identities. Per-chat-message staff alerts and invitation-expiry notices are NOT implemented | DISPOSABLE + BROWSER-DISPOSABLE (bell) |
| 8 | Buyer can contact a dealer through the public marketplace | **Yes** — storefront → vehicle → chat → lead → dealer + permitted staff notified | DISPOSABLE (36, 37), BROWSER (vehicle page offers contact) |
| 9 | Administrators can review and manage onboarding | **Yes** — approval/decision path re-run today (journey 36, unit tests); admin-console journeys 26–33 passed in earlier passes and were **not re-run today**; a superadmin exists on hosted | DISPOSABLE (today: 36; earlier: 26–33); HOSTED-READONLY (1 approved superadmin) |
| 10 | Auctions, escrow, mechanics, inspections correctly deferred | **NO — not yet.** Hosted `isAuctionActive` and `isPaymentsActive` are `true`; escrow has no freeze by design; inspection freeze has no enforcement; public navigation still shows these modules | HOSTED-READONLY + code review |

## 2. What changed in this pass (defects found and fixed)
1. **Public dealer storefront was a stub** → real `/showroom/:id` page, allowlisted profile API, approved-and-not-suspended visibility rule, owner/admin preview, logo + banner (migration), vehicle "View showroom" now opens it.
2. **`optionalAuth` ignored the session cookie** (read Bearer only, unlike `protect`). Signed-in owners were treated as anonymous on public routes: the owner-only phone prefill and owner preview could never work. Fixed to match `protect`.
3. Pending/suspended dealer profiles were publicly readable and returned the owner's personal name → now 404 to outsiders, name removed.
4. Gateway `in_app` channel did not persist; lead, staff, admin and approval notices — fixed in the previous pass, now covered by journey 37 for 8 identities.
5. Storefront bug found by tests: a network failure displayed "not available" instead of a retry message (check order). Banner painted over the profile card; broken images left an icon. All fixed.

## 3. What must be true before the first real dealer (all NOT VERIFIED unless stated)
1. Apply migration `20261125090000_dealer_public_storefront.sql` to hosted **after** review and a backup (hosted lacks `dealers.logo_url/banner_url` — HOSTED-READONLY). Without it, saving a logo returns an error; everything else works.
2. Brevo key, verified sender/domain, real mailbox receipt using an authorised test address.
3. Cloudinary credentials and a real upload; set `PUBLIC_IMAGE_HOSTS` if a custom image domain is used.
4. Redis reachable from the API.
5. Owner decision: paperwork. Hosted has **no** `dealer_paperwork_policy` row, so the default applies: nothing required (empty documents accepted). Decide the mandatory list in Admin → Settings → Onboarding.
6. Owner decision: deferred modules. Set `isAuctionActive=false` and `isPaymentsActive=false` in the admin control (existing Panic Room); decide whether to hide Auctions/Escrow/Inspections navigation (not changed here to protect the approved homepage).
7. Hosted migration history stops at 2026-09-22 while the repository has 95 later migrations. Object checks show the launch path is present (section 4 of `07`), but `dealer_suspension_requests`, `dealer_reinstatement_requests` and `kayad_reconciliation_issue_rows` are absent. Reconcile by object, not by count; do not bulk-apply.
8. Frontend API URL, CORS allowlist, cookie domain/secure flags on the real domains (only a local proxy was exercised).

## 4. Honest limits of this evidence
No staging environment, no real e-mail, no real Cloudinary, no hosted writes. Browser checks ran on the disposable stack at 7 widths for the storefront and at 1440/390 for settings, bell and buyer path; registration, dealer onboarding, inventory and staff screens were **not** re-driven at every width in this pass (earlier passes covered dealer inventory/team; see `08`). The personal-seller listing form was verified through the API, not a browser.
