# KAYAD Phase 16C — Test commands, results and evidence tiers

Tiers: **U** unit/contract · **D** disposable PostgreSQL · **A** local app stack (backend → PostgREST → PostgreSQL) · **B** real-stack browser (Playwright, no request mocking). None is hosted, staging or provider certification.
Environment: PostgreSQL 16.15, Redis, PostgREST, Node 22, Chromium; Postgres 54329, PostgREST 54330/54331, backend 5055, SPA 4173. Logs: `validation-logs/phase16c/`.

| Area | Command (from the repo root unless noted) | Result | Tier |
|---|---|---|---|
| TypeScript | `npm run lint` (`tsc --noEmit`) | exit 0 | U |
| Build | `npm run build` | exit 0 | U |
| Frontend | `npm test` | 964 pass, 1 skipped (120 files) | U |
| Backend Jest | `cd backend && npm run test:jest` | 3,074 pass (176 suites) | U |
| Backend Vitest / node | `npm run test:vitest` / `npm run test:node` | 36/36 / 1/1 | U |
| Validators | `npm run validate:*` (143) | 141 pass, 2 credential-dependent fail | U |
| Changed-file lint | `npx eslint --no-ignore <9 files>` | 0 problems | — |
| Migration set | `bash runbooks/phase16c-20261027/pg-tests/migration_set_certification.sh` | **99/99** | D |
| M2 | `owner_governance_pg_checks.sh kayad_16c_base_disposable <M2>` | 97/97 | D |
| M2 upgrade/rollback | `owner_governance_pg_upgrade_rollback.sh …` | 15/15 | D |
| M3 | `owner_mfa_pg_checks.sh …` | 23/23 | D |
| M1 | `registration_dealer_onboarding_pg_checks.sh kayad_16b_base` | 47/47 | D |
| Owner governance | `e2e_owner_identity_governance.cjs` | 73/73 | A |
| 16A arrangement | `e2e_phase16a_arrangement.cjs` | 58/58 | A |
| Account security | `e2e_account_security.cjs` | 47/47 owner tables, 47/47 legacy | A |
| Identity integrity | `e2e_identity_integrity.cjs` | 12/12 | A |
| Dealer lifecycle / payments | `e2e_dealer_lifecycle.cjs` / `e2e_dealer_payments.cjs` | 50/50 / 73/73 | A |
| Inventory team / superadmin governance | `e2e_inventory_team.cjs` / `e2e_superadmin_governance.cjs` | 60/60 / 73/73 | A |
| Owner/dealer separation (16B) | `e2e_phase16b_owner_dealer_separation.cjs` | 41/41 | A |
| **Dealer/staff separation (16C)** | `e2e_phase16c_dealer_staff_separation.cjs` | **40/40** (6 failures in the first run were fixture assumptions — a new manager holds no permissions until the dealership owner grants them; the staff-demotion control used a role without admin-list access — fixed in the tests, no source defect) | A |
| **MFA race / step-up / session (16C)** | `e2e_phase16c_mfa_race_stepup.cjs` | **8/8** | A |
| **Browser (16C)** | `node runbooks/phase16c-20261027/http/browser_16c_real_stack.cjs <outdir>` (SPA on 4173) | **35/35**, 0 page errors, axe: no critical/serious on owner management (desktop + 390px), MFA challenge, dealer onboarding | B |
| Route matrix | `role_matrix_probe.cjs`, `classify_500s.cjs` | 786 × 16; 222 → 220 routes with 500 | A |
Harness copies, including the exact environment variables, are in `runbooks/phase16c-20261027/harness/`.

## UI evidence (390px, owner management with populated ledger)
No horizontal page overflow; the three tables stack as labelled rows (all 59 data cells labelled, `display:grid`, none outside the viewport, none needing sideways scroll); text ≥ 12px; every interactive control ≥ 24×24 px; axe clean at desktop and 390px; focus moves to the first field when an action form opens, Tab order is logical, a visible focus ring is present, Escape cancels without submitting, the form is operable by keyboard alone; a refused change shows a readable `role="alert"` message, clears the password/code fields, and creates nothing. Screenshots: `validation-logs/phase16c/browser/`. Mobile checks for MFA enrolment and dealer onboarding: dealer onboarding at 390px (no overflow, axe clean); MFA enrolment visually checked at desktop only — **the 390px MFA enrolment panel was not separately screenshotted** (it shares the page that was checked at 390px with MFA "on").
Contrast was assessed through axe's `color-contrast` rule (no serious findings), not by manual measurement.

## Not proven
Real email delivery · real authenticator apps · Cloudinary/M-Pesa/Brevo providers · hosted or staging behaviour · the 2 credential-dependent validators · Windows-tree behaviour (filenames were checked for Windows-illegal characters by `validate:repository-naming`).
