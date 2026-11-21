# Brand audit — KAYARD KE (2026-11-21)

**Brand:** "KAYARD KE" (short: "KAYARD"). Legal entity text "KAYARD MOTOR HUB" retained. Navy/teal visual system and the approved homepage hero are unchanged.

## Corrected (FIXED)
~21 customer-facing source files: page titles/meta, login/register copy, owner/dealer onboarding messages, footer, navbar lockup, offline/error text, the API unreachable message (`httpRequest.ts`), referral sample code, `backend/.env.example`. Gate: `scripts/validate-kayard-brand-customer-facing-20261121.mjs` (PASS; scans src/backend/public/index.html excluding comments and tests). Regression tests that pinned old copy were updated, not weakened (LoginPage x3 files, AdminOwnerManagement, dealerOnboardingTruth, BrandingReach).

## Retained legacy (technical, deliberately NOT renamed)
| Item | Reason |
|---|---|
| CSS classes `kayad-*`, component names (`KAYADLive`, `WhyKayadComparison`), storage keys, DB function names `kayad_*`, env vars | Internal identifiers; renaming risks breaking persisted state, RPC, deploys. No customer sees them. |
| Reference prefixes `KAYAD-` (inspection booking, `KAYAD-IR`, `KAYAD-SET`) | Persisted in unique, length-limited columns; mixed history if changed. **REQUIRES OWNER DECISION** (forward-only change possible). |
| M-Pesa `AccountReference` "KAYAD" | Appears on customer statements and is reconciled. **REQUIRES OWNER DECISION** with Safaricom/finance. |
| Domain `kayad.space` (canonical, OG url/image, API host) | Infrastructure; changing needs DNS/Vercel/Render work. **REQUIRES OWNER DECISION**. |
| Service-worker cache names `kayad-mobile-v2…` | Renaming only purges caches once; no customer impact. |
| Legacy-value detectors in `BrandingContext` | Must keep matching OLD stored admin values to migrate them. |

## Logo / admin branding
Default logo `/branding/kayard-ke-logo.png` (lockup, dark text). `BrandingContext` migrates legacy stored marks (road-mark svg, symbol, `kayad-mark.png`, `kayard-k-mark.png`) to the default and never overwrites a custom upload. Admin override (upload/replace/delete → fallback to default) remains in `LogoUploader` / `AdminSettingsBranding`; navbar and both footers read `branding.logoUrl`; footer shows the lockup on a white plate because the lockup is dark-on-light. K mark remains favicon/app icon. Validators `validate-kayad-navbar-branding` and `validate-stage27-…` PASS.
**NOT TESTED:** live admin upload to hosted storage (no hosted/Cloudinary access); favicon/social image are static files, not admin-driven. **No reversed (light-on-dark) logo asset exists** — REQUIRES OWNER DECISION / asset.
Duplicate assets: legacy `kayad-*` svg/png in `public/branding` are still referenced by the migration list; kept. No broken references found by the build.

## Seeded database content (found during the screenshot pass — FIXED in code, REQUIRES OWNER DECISION to apply)
The announcement ticker, `platform_name`, welcome/verification/OTP/receipt templates, support FAQ articles and the CMS `website_name` default were **seeded by older migrations with "KAYAD"** and live in the database, so the source-code scan could not see them. Forward-only, idempotent migration `20261121150000_brand_kayard_ke_seeded_customer_content.sql` rewrites only the brand word (never `KAYAD-…` reference prefixes, codes or identifiers). VERIFIED on the disposable DB (0 remaining; a second run changes nothing). **Not applied to the hosted database**: until it is, the live ticker, emails and FAQ keep the old wording. The brand gate now fails if this migration stops covering those tables.
