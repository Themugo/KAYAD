# Open issues and decisions

Format: decision · current behaviour · recommendation · consequences.

**D-1 Apply the migrations to hosted.** Current: not applied. Recommend: apply the pending chain in order on a staging copy first (backfill locks `cars` briefly), then production, then reload PostgREST. Consequence: until applied, hosted dealer mark-sold stays on the old behaviour only if the old code is deployed; the new code returns 503 on status changes (fail closed).
**D-2 Brand rows on hosted.** Current: `KAYAD` / `KAYARD ` still stored; the client normaliser hides it on screen. Recommend: apply migration 170000. Consequence: names in e-mails or server-rendered pages that read the raw value change to KAYARD KE.
**D-3 Pause / Publish control in the dealer UI.** Current: backend and bulk API ready; the inventory row offers Mark sold / Edit / Remove only. Recommend: add Pause / Publish buttons using the bulk endpoint. Consequence: dealers can take a listing off the public site without deleting it.
**D-4 Manager and finance officer powers (DA-13, DA-14).** Current: only the owner can mark sold; finance officers cannot see earnings. Recommend: keep until the owner decides; no widening was done.
**D-5 Viewer and sales / lot dashboard access (DA-11, DA-12).** Current: viewer has no read access; sales and lot agents get 403 on the Overview they land on. Recommend: pick a read-only landing section per role. Consequence: touches the permission model, so not done unprompted.
**D-6 Sidebar grouping.** The brief's groups (Leads & enquiries, Customers & deals, Offers & escrow, Banking & payouts …) were not re-labelled; the existing groups (Overview, Business, Operations, System Management) remain, with every section reachable. Recommend a copy-only relabel after approval.
**D-7 Legacy removal.** See legacy register; nothing deleted.
**D-8 Banking at rest.** Account numbers are stored and returned unmasked to the owner (masked fields added for display). Masking / encryption at rest is a separate decision.
**D-9 Photo upload provider.** BLOCKED: real Cloudinary credentials are not available in the sandbox; only a loopback stub was exercised.
**D-10 Journeys.** 18 database-backed suites (10 legacy, 03, 05, 06, 07, 08, 09, 10) plus the earlier 32 × 9 permission matrix were run. The 30 named journeys in the brief were not each scripted individually (NOT TESTED as named).
**D-11 Staff dashboard permissions UI** (DealershipWorkspace) was not changed or re-screenshotted.
**D-12 Dark-mode / dark-logo screenshots** were not captured (NOT TESTED).
