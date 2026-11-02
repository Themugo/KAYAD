# KAYAD — Kenyan listing, onboarding, photos, Settings and Team (2026-11-02)

## What changed
- Listing: Kenyan conditions (Ex-Japan, Locally Used, New Import, Locally Assembled); Petrol replaces Gasoline everywhere (form, filters, search, backend normalisation, legacy rows still match); price/mileage typed with commas, sent as plain numbers; "active subscription required" now explained in plain words.
- Plan gate: admin **Plan** action in User Management (grant/remove a listing plan). Dealer Hub **Account status** shows real verification and plan. Eric still needs a plan granted by the owner.
- Onboarding: paperwork off by default (owner can enable in Admin > Settings > Onboarding); Business -> Review; no banking step. **Banking** is the last item in the Dealer Hub left menu.
- Photos: thumbnails, Poster badge, Make poster (new and existing listings). New `PATCH /api/cars/:id/images/cover` moves the chosen photo to position 0.
- Logo: Save button beside the logo upload.
- Dealer Hub audit fixes: no blank hub on dashboard failure, loading guards, Pending review count, inline pipeline error, labelled inputs.
- Settings centre: Profile, Notifications (real preferences), Plan & limits, Team & roles, Banking.
- Team: invitation accept page (/dealer/setup) — previously absent; honest e-mail result + Resend; roles are permission sets, built-in templates apply real permissions, owner-defined custom roles (migration 20261102120000, applied by the owner and confirmed by a read-only check).

## Evidence (final run, logs in final-20261102/logs)
- tsc exit 0; vite build exit 0
- Frontend vitest: 164 files, 1373 passed, 1 skipped
- Backend jest (full run): 3626 passed, 2 failed — both then fixed (route-count matrix 5->10 routes; isolation mock lacked new exports) and re-run: 186 passed. Remaining failure in the full run: `stage5f5RoleRouteMatrix ghost_checker` (D-11, fails in untouched baseline).
- Backend vitest 36 passed; node:test 1 passed
- Validators: 27 fail, all in the baseline list (baseline 28; admin-users-surface now passes). No new failures.
- The two re-run suites were re-run individually after the full run, not inside it.

## Intentional test changes (intent kept)
Paperwork default tests (enable items explicitly); onboarding tests (no payments/documents step); nav count 14->15; listing price test uses 0 instead of -5 (minus cannot be typed); team route matrix 5->10 routes; isolation mock exports.

## NOT verified
Real browser; real Cloudinary upload; real Brevo delivery (webhook unwired); hosted-DB writes by me (only SELECTs; owner ran the SQL); invited team members have no workspace UI (Dealer Hub opens for dealer accounts only); whether the live site already has the earlier logo fix.

## Owner actions
Deploy; grant Eric a plan (User Management > Plan); wire Brevo webhook and sender authentication.
