# KAYAD Stage 5E.3 — full project (2026-10-20)

Base: live `main` a88eaf37 (Stage 5E.1 merged, PR #224). This archive is the FULL project: everything in 5E.1 plus the changes below.

## What changed in this stage
1. **Staff menu / dashboard fix** (front end): `src/utils/staffRoles.ts` (new), `src/components/Navbar.tsx`, `src/components/DashboardHub.tsx`.
   Staff roles (superadmin, admin, moderator, marketing, technical_support, hr, accounts, escrow_officer, ad_manager) no longer see the
   buyer/seller shortcuts or the buyer auction widgets; they get a role badge, "Operations Dashboard" and System Administration.
   Tests added: `src/__tests__/utils/staffRoles.test.ts`, `src/__tests__/components/NavbarStaffMenu.test.jsx`, `src/__tests__/components/DashboardHubStaff.test.jsx`.
2. **Hosted recovery record**: `runbooks/stage5e3-hosted-recovery-20261020/` — the exact SQL the owner ran by hand on the hosted database
   (email-ledger schema, users security columns, session-token table and rotation function), plus read-only checks and a partial undo.
3. **Report**: `KAYAD_STAGE5E3_EMAIL_AND_SESSION_RECOVERY_REPORT_20261020.md`.

No backend source file was changed in this stage. No migration was added to `supabase/migrations` (the repo already contained these migrations).

## Not done / still open
Hosted database is still behind the code elsewhere (dashboard tiles "—", `/api/hero` and `/api/admin/public/config` return 500).
Second designated owner not verified. Production readiness is NOT certified.

## Apply
Extract over a clean checkout of `main`, review `git status`, commit on a branch, open a PR and merge only when checks are green
(a push to `main` deploys the front end to production).
