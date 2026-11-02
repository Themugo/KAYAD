# Settings, Branding and Logo Upload fix, 2026-11-02

## Root causes
1. **Branding never reached the public site.** `GET /api/admin/public/config` selected `heroCardContent`, `navigation` etc. as SQL columns. The hosted `platform_config` (migrations stop ~20260922) lacks hero_*/navigation, so the whole read failed and the site used defaults. (Inferred from schema evidence; not observed live.) Fix: read the row, pick public fields in code.
2. **Logo upload "dead".** Endpoint hard-required Cloudinary; UI gave no inline state. Fix: built-in DB-backed logo storage fallback (`brandingAssets.service.js`, `GET /api/admin/public/logo/:file`), new `LogoUploader` with inline error/status, "Use default logo".
3. **Typing lost focus** in Payments/Reconciliation/General: `Field` was defined inside `AdminSettings`, remounting each keystroke. Moved to module level.
4. **PUT /config** returned an opaque 500 on a missing column; now 503 `DATABASE_MIGRATION_REQUIRED`.

## UX
Branding tab: real logo preview, sticky save bar with unsaved/saved state, Save disabled unless dirty, load-error banner with Retry, accessible toggle buttons (aria-pressed).

## Test evidence (logs in ./logs)
| Command | Result |
|---|---|
| npx tsc --noEmit | exit 0 |
| npx vite build | exit 0 |
| npx vitest run (frontend) | 154 files, 1324 passed, 1 skipped, exit 0 |
| backend jest | 3752 passed, 1 failed (stage5f5RoleRouteMatrix ghost_checker, D-11, fails identically in untouched baseline) |
| backend vitest | exit 0 |
| node --test response-lifecycle | pass 1 / fail 0 |
| scripts/validate-*.mjs | 28 fail now vs 38 in baseline; none newly failing |

New tests: publicConfigMissingColumns (3), brandingLogoUpload (46), AdminBrandingLogo (10), AdminSettingsTyping (3).
Tests/validators changed because behaviour legitimately moved (not weakened): navigationAuthority now asserts served keys instead of the SQL select string; four static validators retargeted to LogoUploader / new dirty gate / new whitelist literal; old 503/502 Cloudinary-failure tests replaced by fallback tests.

## NOT verified
- Real Cloudinary upload; real browser click-through; any write to the hosted DB.
- Hosted DB state was only read via SELECT earlier; migrations are NOT applied.
- Onboarding and Audit Log tabs were reviewed and covered by existing tests, not re-exercised in a browser.

## Owner action (hosted DB)
Apply pending migrations (20260926123000, 20261003100000, 20261003113000, 20261003120000, 20261004110000, 20261008150000, 20261012103000, 20261101200000 and others after 20260922) for hero/navigation settings and design publishing. Saving branding itself works on the current hosted schema.
