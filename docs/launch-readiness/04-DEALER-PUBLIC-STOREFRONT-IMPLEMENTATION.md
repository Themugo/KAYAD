# 04 — Public dealer storefront
## What was built
- Route `/showroom/:dealerId` (public, known to the router, `DealerProfilePage.tsx` replaced the stub). Banner, logo, business name, verified badge (only when approved and not suspended), location, vehicle count, member-since year, description, searchable inventory (search shown above 6 vehicles), Contact dealer (opens the newest vehicle where the enquiry controls live; disabled with an explanation when no vehicle is listed), loading / empty / 404 / retry-error states.
- Vehicle detail "View showroom" opens the storefront for dealers; private sellers keep the existing marketplace filter.
- Owner management in Settings → **Public storefront**: upload/change/remove logo and banner (JPG/PNG/WebP, 5 MB, real uploader), preview link, honest live/not-live message. Name, location, description stay in the existing profile form.
## Backend allowlist (not frontend hiding)
`GET /api/dealer-platform/profile/:id` returns only `id, businessName, bio, location, logoUrl, bannerUrl, approved, verified, publiclyVisible, memberSince, stats{activeListings, averageRating, totalReviews}`. The owner additionally gets their phone. Removed: the owner's personal name and total listing count. Never returned: documents, verification records, staff, moderation notes, e-mail, status.
Visibility: approved **and** not suspended → public (`Cache-Control: public, max-age=60`); otherwise 404 identical to an unknown id for everyone except the owner and platform admins (`private, no-store`).
Images: write accepts only `https` URLs on `res.cloudinary.com` (+ `PUBLIC_IMAGE_HOSTS`); outside production loopback `http` is allowed for the test stack; read re-checks and drops anything else.
Inventory: existing public `GET /api/cars?dealer=<uuid>` (status available, not deleted, summary projection). Journey 37 proves draft hidden, other dealer's vehicle absent, no reserve/VIN/chassis/bidder fields.
## Defect fixed on the way
`optionalAuth` accepted only a Bearer header while the web app authenticates with the session cookie, so owners were anonymous on public routes (owner phone prefill and owner preview silently never worked). It now reads the same `token` cookie as `protect`.
## Migration (REVIEW ONLY — not applied anywhere hosted)
`supabase/migrations/20261125090000_dealer_public_storefront.sql`: two nullable text columns on `dealers`, idempotent. Hosted currently lacks them (HOSTED-READONLY): until applied, logo/banner save fails with an error; every other storefront field works.
## Evidence
Journey 37 (43 PASS), backend unit tests (5 new), frontend tests (5 new), browser 19/19 incl. 320/360/390/430/768/1024/1440 px, no horizontal scroll, no page errors; screenshots in `evidence/`. In the stub stack the stored image URLs do not resolve in the browser, so the page showed the icon fallback; real logo rendering needs Cloudinary (NOT VERIFIED).
