# KAYAD – Settings, logo, sidebar, configurable dealer paperwork, one-account convergence (2026-11-01)

Everything below is LOCAL code. Nothing was committed, pushed, deployed, or applied to production/hosted data.

## 1. Logo upload – root cause and fix
Root cause: the shared axios client defaults to `Content-Type: application/json`; axios 1.20 then serialises a `FormData` body to JSON text, so the file reached the server as `{"logo":{}}` and multer saw no file. Fix: `src/api/httpClient.ts` interceptor sets `multipart/form-data` for FormData bodies. Also: `/admin/upload-logo` now uses `uploadMemory` (5 MB, jpg/png/webp, magic-byte check) with coded errors and an audit row (with the previous logo URL); branding URLs are allow-listed (`/branding/...` or this account's Cloudinary); logo `<img>` elements fall back to the default logo if the stored asset is missing. A failed upload leaves the saved logo unchanged. Tests: 35 backend + 2 frontend (the frontend test was shown to fail without the fix).
Not verified: a real upload to Cloudinary (needs credentials).

## 2. Dealer approval (current repo state)
Approval is by the secure model: administrator action through `kayad_apply_dealer_verification_atomic`, reason required, owner-controlled decision authority. Owner email is not treated as an admin role. Dealers created by `/auth/register` get a pending users row and (with the migration) a dealers row via trigger.

## 3. Admin-configurable dealer paperwork
* Catalogue (`config/dealerPaperwork.js`): government ID, KRA PIN, business registration, physical address (structured entries) and phone verification (OTP). There is no dealer file upload in KAYAD, so none was added.
* Owner-saved policy `dealer_paperwork_policy` (system_settings): per item Not asked / Optional / Required; "required implies enabled"; revisioned compare-and-swap; owner-only write; admins read; before/after audit; fails closed (503 / approval blocker) if unreadable.
* Default: every item offered, NONE required (onboarding-friendly). This is a documented assumption: previously ID + KRA PIN were hard-required. The owner can require them in one click. "No paperwork at all" and "ask for everything, require nothing" presets exist.
* Enforcement points: `PUT /api/dealer/onboarding`, `POST /api/verification/submit`, and approval (`dealerApproval.service`). Optional/disabled items never block; missing required items block approval with `DEALER_REQUIRED_DOCUMENTS_MISSING`; optional gaps give a non-blocking warning.
* In-progress applications: measured against the CURRENT policy at decision time; relaxing/disabling never deletes submitted data; omitting an optional item on resubmission never wipes what is on file.
* UI: Settings > Onboarding has the paperwork panel with an effect preview before saving; the dealer form builds its checklist from `GET /api/dealer/paperwork-requirements` (Required/Optional badges, nothing hard-coded); Seller Management shows supplied / required-missing / optional-missing.

## 4. One account for buying and selling
* `POST /api/dealer/application` (role user or dealer, verified e-mail, active, not banned, applications not closed) creates the dealers row for the SAME user; idempotent; `users.role/status` unchanged, so buyer history is intact and no seller privilege exists until approval.
* No account is merged on unverified contact details; no second user is created.
* Admin: "Buyer applicants" tab (`GET /admin/users?dealerApplicants=true`); approve-dealer accepts applicants and the RPC converts the same user to dealer; rejecting a buyer's application updates only the application (the RPC would have set `users.status=rejected` and locked the buyer out).
* UI: "Become a dealer" in the account menu for buyers; `RequireDealerApplicant` guard; start screen then the normal form.
* Existing dealers already could use buyer features (buyer routes have no role gating).

## 5. Settings tabs
* General: server error + code now shown on a rejected save; five settings (`maxListingImages`, `escrowReleaseDays`, `bidCommitmentPct`, `allowGuestBrowsing`, `requireDealerApproval`) are stored and audited but read by NO runtime code (repository search) – labelled "Recorded only"; the superseded Require-Dealer-Approval toggle was removed; API returns `recordedOnly`. I did not wire them into behaviour (that would change business rules).
* Onboarding: existing owner-only revisioned policy + new paperwork panel.
* Branding: logo fix above, plus validation.
* Payments / Reconciliation: existing server validation kept; secrets never returned (presence flags only), blank secret retains stored value; audit records changed keys and before/after for non-secret values only, secrets/bank values as "changed".
* Audit Log: unchanged, superadmin-only, reads genuine records.
* Reconciliation actions themselves (financial) were not modified.

## 6. Sidebar
Seven groups with Settings pinned in a footer outside all groups (below "View marketplace"), visible regardless of expand/collapse; all routes preserved, no duplicates; validator and component tests updated.

## 7. Files changed (main)
Backend: `config/dealerPaperwork.js` (new), `services/dealerPaperwork.service.js` (new), `services/dealerApproval.service.js`, `services/dealerVerificationService.js`, `controllers/verificationController.js`, `routes/dealerRoutes.js`, `routes/adminRoutes.js`, `validation/dealerOnboarding.schema.js`, `utils/brandingValidation.js` (new). No database migration was added: the policy is a row in the existing `system_settings` table, created on first owner save.
Frontend: `api/httpClient.ts`, `api/api.exports.ts`, `context/AuthContext.tsx`, `App.tsx`, `components/Navbar.tsx`, `AdminSidebar.tsx` (+css), `BrandingContext.tsx`, footers, `AdminSettings.jsx`, `AdminSettingsOnboarding.jsx`, `AdminSettingsDealerPaperwork.jsx` (new), `AdminSellers.jsx`, `DealerOnboarding.jsx`.
New tests: `brandingLogoUpload`, `dealerPaperworkConvergence` (28), `dealerApplicationRoutes` (19), `settingsConfigContract` (18), `multipartUpload`, `AdminSidebarOrganization`, `AdminSettingsDealerPaperwork`, `DealerOnboardingPaperwork`, plus 3 new AdminSettings tests.
Existing tests changed (none weakened/deleted): `dealerApprovalWorkflow` (paperwork seam; blocker code), `dealerOnboardingWriteOrder` (buyer-without-application fixture; the "buyer refused" case now asserts 409 and a staff case asserts 401/403), `stage5DealerDecisions` (paperwork seam), `AdminShell`, `AdminSettingsOnboarding`, `dealerOnboardingTruth` (mocks for the new API calls), `validate-super-admin-phase1-navigation.mjs`.

## 8. Validation (logs + exit codes in this folder)
| Check | Result |
|---|---|
| `tsc --noEmit` | exit 0 |
| `npm run lint` | exit 0 (warnings only, 0 errors) |
| `npx vitest run` (frontend) | exit 0 – 144 files, 1240 passed, 1 skipped |
| `npm run build` | exit 0 |
| validate-panic-room-end-to-end / business-command-centre-phase04 / super-admin-phase1-navigation / admin-route-convergence | all exit 0 |
| validate-super-admin-completion | 28/30 – the same 2 checks fail on the untouched original project (pre-existing) |
| backend Jest | 3565 passed, 1 failed – D-11 `GET /api/admin/stats › ghost_checker` (pre-existing) |
| backend Vitest | 36/36 |
| backend node:test | 1/1 |
After the full run I added 3 AdminSettings tests; that file was re-run alone: 6/6 pass.
Not run: browser e2e (none available here), hosted/Cloudinary/Supabase checks.

## 9. Limitations and operator actions
* Hosted DB still lacks migrations after 20260922 (D-33) and the two pending dealers never submitted applications (D-34); applying migrations and having an administrator account with an approved DB row are OPERATOR actions. I did not touch production.
* The hosted RPC differs from the repo migration (D-36); the rejection of a buyer applicant is application-level, not RPC-atomic.
* Owner must decide whether to keep "nothing required" as the paperwork default.
* Private-seller -> dealer upgrade is not covered.
* Seller Management has no Reject button for dealers (API supports it).
* Separation of duties for owner self-approval remains an owner decision.
* `AdminSettingsGeneral.jsx` is dead code (not rendered); left in place.
