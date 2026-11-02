# Account Settings, Admin Settings, Site Design Editor, Logo Upload - Implementation Report (2026-11-01)

Evidence tier: **mocked local runtime** (in-memory persistence, mocked Cloudinary/Supabase). Nothing was run against production, a real database, a real storage provider, email or SMS.

## Root cause per defect
| ID | Defect | Root cause |
|---|---|---|
| D-48 | Notification toggles did nothing | `defaultChecked` inputs bound to no state/API; a real preference store existed and the page ignored it |
| D-49 | Change Password / 2FA / avatar buttons inert | Placeholder buttons without handlers; 2FA, email change and avatar upload have no backend |
| D-50 | Profile accepted empty name, huge bio, `javascript:`/http avatar | No server-side validation besides phone |
| D-51 | `maxListingImages` saved but ignored | No consumer (hardcoded 20) |
| D-52 | Nav inventory test/validator stale | New Site Designs link |
Earlier in this task: fonts in published designs were inert (AppLayout was dead code) - fonts now applied by BrandingContext.

## Verification matrix
| Feature / control | UI -> API -> storage | Test | Result | Runtime effect verified | Limitation |
|---|---|---|---|---|---|
| Name/location edit | Profile.tsx -> PUT /api/v1/auth/profile -> users | accountSettingsContract (valid, 9 invalid, ownership), ProfileAccountSettings | PASS | Stored value returned; AuthContext refreshed from response | mocked DB |
| Phone edit + verification | same + PhoneVerification (OTP) | authProfilePhoneVerification, existing | PASS | changed phone resets verified flag | real SMS not verified |
| Email | read-only, labelled "not available yet" | ProfileAccountSettings | PASS | - | email change/verification not implemented |
| Avatar | upload control removed; server accepts https URL only | accountSettingsContract | PASS | - | avatar upload not implemented |
| Change password | ChangePasswordForm -> PUT /auth/change-password -> user_auth | accountSettingsContract (4 reject cases, success, other user), AccountSettings.test | PASS | hash replaced, tokenVersion bumped, refresh tokens revoked | - |
| 2FA | label "Not available yet" | ProfileAccountSettings | PASS | - | not implemented |
| Notification prefs (email/SMS/WhatsApp x transactional/marketing) | NotificationPreferences -> /api/communications/preferences -> communication_preferences | accountSettingsContract (isolation, validation, gateway decision), AccountSettings.test (load, persist, failure, double-submit, retry) | PASS | channelAllowed uses the same stored values the gateway checks | provider delivery not verified |
| Privacy prefs, deactivation/deletion | not present in UI and no user-facing backend | - | NOT SUPPORTED | - | not added (spec: only if already supported) |
| Business application status vs Account Settings | profile route has no application gate | accountSettingsContract "business application status never gates" | PASS | - | - |
| maxListingImages | AdminSettings -> PUT /admin/config -> system_settings -> carController add-images | maxListingImagesEffect (11), settingsConfigContract | PASS (helper) | cap read from saved config, falls back to 20 | upload endpoint not run end to end |
| escrowReleaseDays, bidCommitmentPct | saved only | settingsConfigContract | labelled "Recorded only" | none | escrow has its own configuration service |
| allowGuestBrowsing | saved only | guestAccessContract | labelled no-effect; public catalogue always open | - | - |
| Other admin settings (auth, validation, audit, secrets masking) | /admin/config | settingsConfigContract (existing, 18) | PASS | - | - |
| Site design editor (create/save/list/select/rename/duplicate/delete safeguards/preview/publish/rollback/draft survive refresh) | AdminSiteDesigns -> /api/admin/site-designs -> site_designs, site_design_publications -> platform_config -> /admin/public/config -> BrandingContext | siteDesignEditor (37), AdminSiteDesigns (18), designPreview, PublishedDesignRuntime (9) | PASS | published config reaches CSS vars, fonts, hero, ticker | SQL migration not applied to a real DB |
| Logo/asset upload | multipart -> Cloudinary -> branding.logoUrl | brandingLogoUpload (existing), siteDesignEditor asset tests | PASS (mocked provider) | failed upload keeps current logo | **real Cloudinary upload NOT verified** (no credentials) |
| Public browsing + roles | server-enforced | guestAccessContract (24), accountCapabilities (19) | PASS | - | - |
| Visitor analytics | tracker -> /api/analytics -> tables -> admin dashboard | visitorAnalytics (38) | PASS | privacy rules asserted | definitions in earlier reports |

## Validation commands and exit codes (logs in `logs/`)
- `npx tsc --noEmit` -> 0
- `npx vite build` -> 0
- `npx vitest run` (frontend) -> see `logs/frontend-vitest.log` / `.exit`
- backend jest -> 1: 197/198 suites, 3717/3718 tests; sole failure `stage5f5RoleRouteMatrix > GET /api/admin/stats > ghost_checker` = pre-existing **D-11**, identical in the untouched baseline
- backend vitest -> 0 (36); backend node --test -> 0
- `scripts/validate-*.mjs`: none fails now that passed in the previous delivery (compare `logs/validators.log` vs `logs/baseline-validators.log`). 28 scripts exit non-zero in both; they are pre-existing (e.g. `validate-admin-settings-logo-flow`).
- Regression caught and fixed during validation: my first name rule (min 2 chars) broke `authProfilePhoneVerification`; rule relaxed to 1-100.

## NOT verified
Real Cloudinary/storage upload; email/SMS/WhatsApp delivery; payments; a real Supabase database (migration `20261101200000_site_designs.sql` not applied); production behaviour; browser visual check of the editor beyond jsdom.
## Not implemented (no backend, not faked)
Email change, 2FA, avatar upload, privacy preferences, account deactivation/deletion, enforcement of escrowReleaseDays/bidCommitmentPct.

## Flaky test disclosure
Frontend vitest: first full run 151/151 files (1306 passed, 1 skipped). The final full run had 1 failure, `DealerWorkflowWrites > creates once (duplicate-submit guard)` (looks for a "Saving" button label). Re-running that file alone: pass, then fail, with no code change between runs, so it is timing-sensitive. It is a dealer-listing test and none of this work touches it. Not fixed; a candidate for a separate stabilisation task.
