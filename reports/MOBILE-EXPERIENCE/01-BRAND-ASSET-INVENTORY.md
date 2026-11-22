# 01 — Brand asset inventory
| Asset | Size | Status |
|---|---|---|
| `public/branding/kayard-ke-logo.png` | 1200×403 | **Official approved lockup** (`DEFAULT_LOGO_URL`) |
| `public/branding/kayard-ke-logo-dark.png` | 1200×403 | Pre-existing white-text variant (`DEFAULT_LOGO_DARK_URL`); used for dark surfaces (footer). Approval status not stated by owner — please confirm. |
| `public/icons/icon-192.png`, `icon-512.png`, `badge-72.png` | square | **Regenerated 2026-11-22**: the approved lockup scaled uniformly (no stretch/crop) onto a white square, 80% width (90% badge). |
| `public/branding/kayard-ke-favicon-32.png`, `-64.png` | square | **New**, same method. |
| `kayard-k-mark.png`, `kayad-mark.png`, `kayad-symbol.svg`, `kayad-road-mark*.svg`, `kayad-premium-master.png`, `icons/*.svg`, `favicon.svg` | — | Legacy art, no longer referenced by runtime code (kept; deletion needs dependency analysis/owner approval). `BrandingContext` still recognises these URLs so stored legacy admin settings migrate to the new logo. |
Emails (`email.service.js`) and PDFs (`pdfService.js`) are text-only "KAYARD KE" — no logo image was ever embedded; unchanged.
## Gaps needing owner approval
1. No approved **square symbol** exists. Square icons carry the full wide lockup, so the wordmark is small (illegible at 16–32px favicon size, thin on a home-screen icon). Supply a square icon artwork to replace.
2. Dark logo approval (above). No new dark logo was invented.
