# KAYAD Stage 5F.16 — Dealer + Inspector + Garage multi-branch workflow convergence

**Status: PARTIAL.** Everything runnable locally is green on the final tree (source, mocked, real disposable PostgreSQL, real HTTP stack, real Chromium). PARTIAL because no hosted/staging database, hosted RLS, deployed browser run, real email or payment rail was (or may be) exercised, and the migration is an unapplied CANDIDATE. Source checks are not a production-readiness claim.

## 1. Base
5F.15 ZIP SHA-256 `efe4cf1d2109c7ba672a033fe631e9e560134903d8cb3e0afd47ba9a2a0e8ade` (verified at extraction). The 5F.11–5F.14 ZIPs were not supplied; 5F.15 already contains their sources and reports. 5F.15 does **not** contain the 5F.10 auction-gate and it is not merged here (owner decision).

## 2. Dealer (Phase B) — selective, invariants proven
Not re-merged wholesale. `backend/tests/regression/stage5f16DealerLifecycleInvariants.test.js` (25 tests) pins: a suspended/rejected dealer is not rescued by a stale approved flag; approval never auto-publishes listings; ownership checks stay. Four pre-existing failing suites were repaired without weakening assertions (`onboardingFlow`, `stage5DealerDecisions`, `placeBidErrorContract`, `placeBidRejectedListing`). Open owner decision OD-17: a legacy-approved dealer with a pending verification is fail-closed blocked.

## 3. Inspector/garage convergence and multi-branch model (Phases C, D)
Reuses `InspectionMarketplace`, `ProviderApplicationModal`, `ProviderServicesModal` ("My business") and admin provider governance; no new account per branch. Full model, role/capability matrix, lifecycle, routes, RLS design and risks: `docs/GARAGE_ORGANIZATION_BRANCH_MODEL_5F16.md`. Defects found and fixed on the way: the legacy staff role default `'mechanic'` violated `inspection_staff_role_check` (backend default and frontend invite), ended inspectors could still read their old bookings/reports through RLS (P1/P2 prove it before, P4/P5 after), and the shared `Modal` used undefined CSS tokens (rendered transparent and under the site header; fixed with fallbacks, checked in browser B0).

## 4. Source map
Feature → UI → client → route → service → DB → authz → tests
- Branches: `organization/BranchesPanel.tsx` → `organizationApi.ts` → `organizationRoutes.js` (`branch.*`) → `organizationService.js` → `kayad_org_branch_*` → owner/org_admin → PG B*, HTTP H11–H20, vitest.
- Team: `TeamPanel.tsx` → `members/*` → `kayad_org_member_*` (invite/accept/confirm/change/set_status) → rank + branch scope + no self-change → PG C*–I*, HTTP H21+.
- Bookings: `OperationsPanel.tsx` → `bookings/*` → `kayad_org_booking_route|assign|transition` (existing state machine trigger) → `kayad_org_booking_access`.
- Report: `OrgReportPanel.tsx` → `report` → `kayad_org_report`.
- Own side: `MyMembershipsPanel.tsx` → `/me/*`.
- Entry: `InspectionsView.tsx` → `ProviderServicesModal` → "Open organization workspace" (owner) / "Open workspace" (member). `ProviderBusinessCenter` is not mounted anywhere (pre-existing); only wired to the same components.

## 5. Change ledger (vs 5F.15)
Added: `backend/inspection/{middleware/requireOrgAccess.js, routes/organizationRoutes.js, services/organizationService.js}`, `backend/validation/garageOrganization.schema.js`, `supabase/migrations/20261020180000_garage_organization_branch_membership.sql`, `src/features/InspectionMarketplace/{services/organizationApi.ts, organization/*}`, `docs/GARAGE_ORGANIZATION_BRANCH_MODEL_5F16.md`, `runbooks/stage5f16-garage-organization-20261020/{rollback, pg, http, ui}`, tests `stage5f16OrganizationBackend`, `stage5f16BookingServiceBranch`, `stage5f16DealerLifecycleInvariants`, `src/__tests__/features/organization/`.
Modified: `inspectionRoutes.js`, `bookingService.js` (branch-aware, legacy affiliation via RPC), `providerGovernanceService.js`, `phase22.schema.js`, `backend/package.json` (`test:node` gets `--test-force-exit`), `ProviderServicesModal.tsx`, `InspectionsView.tsx`, `ProviderBusinessCenter.tsx`, `components/ui/Modal.tsx`, and the test files listed in §2 plus `fakeSupabase.js`, `automotiveServices.test.js`, `providerModals.test.tsx`.

## 6. Security matrix (all against the REAL stack, no mocked authorization)
Two organizations × two branches, every role. Uniform 404 for stranger/other-org/non-existent (H3–H7); strict bodies reject `organizationId`/`provider_id`/`isOwner` (H15,H16,H23); CSRF required (H10); cross-org branch/member/booking IDOR through the caller's own org URL → 404 and rows unchanged (H19–H20 and siblings); owner cannot accept on the invitee's behalf and replay → 409 (H25–H28); escalation (org_admin creating org_admin, branch manager touching another branch or higher roles, self role change) refused in the DB (PG E*–I*); revoked/suspended/inactive-branch members lose access on the next call with a still-valid token (HTTP + PG + browser B30); no organization-A row attributed to organization-B actors (H151). Browser: tabs exactly match the role (owner, branch manager, inspector, finance); stranger offered nothing.

## 7. Booking → report → settlement (Phase F, H)
Existing state machine and custody/approval separation untouched. Route/assign/transition verified at DB and HTTP level; consolidated report counts each booking once (by `scheduled_date`) and each transaction once (Nairobi day); unattributed money/settlements are org-level; branch manager pinned to own branch; finance sees money only (PG M*, HTTP report cases). Customer report access and settlement rows are exercised in the PG/HTTP suites; no real payment or notification was sent.

## 8. Migration / RLS (Phase E)
Applied only to disposable PG16 (127.0.0.1:54339, names ending `_disposable`; harnesses refuse anything else): fresh replay of 182 repo migrations + candidate (183 files now), idempotent second apply, legacy back-fill, constraints, RLS as the real `authenticated` role (with hosted-style default grants as the worst case), two-session races, rollback (`rollback_20261020180000.sql` refuses while any membership is `suspended`). **Not applied to any hosted database.**

## 9. Exact commands and counts (final tree)
- `npm run typecheck` → 0
- `npm run build` → 0
- `npx vitest run` (frontend) → 90 files, 722 passed, 1 skipped
- `cd backend && npm run test:jest` → 142 suites, 2120 passed
- `cd backend && npm run test:vitest` → 6 files, 36 passed
- `cd backend && npm run test:node` → 1 file (`tests/response-lifecycle.test.js`), pass
- Validators (`validate:supabase-migrations`, `foundation-integrity`, `owner-identity-convergence`, `master-identity-authz-corrections`, `stage5f2…`, `stage5f6…`, `stage5f7…`, `inspection-marketplace`, and the 5F.14/5F.5/5F.8/5F.9 scripts) → all exit 0
- `node runbooks/…/pg/stage5f16_org_pg.mjs` → 264 pass, 0 fail
- `bash runbooks/…/http/run_http.sh` → 117 pass, 0 fail
- `node runbooks/…/ui/ui_5f16.mjs` (Chromium; Vite with `VITE_DEV_API_TARGET`, `JWT_SECRET`) → 24 pass, 0 fail (desktop, 320/360/390/430 px no horizontal scroll, tab keyboard Arrow/Home/End, honest error on unknown invite email, revoked-session).
Evidence tiers: S source, M mocked, P real PG, H real HTTP stack, B browser.

## 10. Disclosures and remaining blockers
1. PARTIAL: no hosted DB/RLS, no staging/production browser run, no real Brevo/M-Pesa; migration unapplied.
2. Correction to my 5F.10 note: the intermittent `test:node` hang was a real hang, not a stdin artifact; mitigated with `--test-force-exit` (the script runs one file by design).
3. The `?action=manage-business` deep link rarely fails to open the modal when it fires before session hydration (one miss seen in ~12 loads in code this stage did not change; harness allows one counted reload, 0 used in final runs).
4. A React "empty string attribute" console warning from the header avatar pre-exists and is excluded from page-error checks (counted separately).
5. Dev server error bodies include stack traces (NODE_ENV=development).
6. Owner decisions: OD-17; 5F.10 auction-gate not merged; one branch per membership (multi-branch managers use operations_manager); invitation TTL 168 h default/720 max; unrouted bookings form an org-level queue; no Idempotency-Key on org routes (DB single-use/uniqueness instead).
7. Browser coverage is the workspace flows listed above; inviting/accepting through the UI and assign/transition clicks are covered by HTTP/PG and component tests, not by Chromium clicks.

## 11. Confirmation
No hosted mutation, deployment, `git commit` or `git push` was performed. No secrets in the package (scanned). Tokens in harnesses are minted from a disposable local secret.

## 12. Addendum — PR #227 CI repair (merged with main @ b6813d71)
Root cause of the red checks: the pushed merge commit contained conflict markers in `package.json` (`npm ci` failed in every job). Resolved by keeping main's block (stage5f10 scripts). Also fixed: explicit `ENABLE ROW LEVEL SECURITY` on `inspection_branches` in the 5F.16 migration (repo RLS-enablement validator), and palette violations in 5F.16 panels, `ProviderBusinessCenter.tsx`, `ProviderApplicationModal.tsx`. Re-verified with Node 22.22.2: `npm ci`, typecheck, `npm test`, phase6/frontend-runtime/V14 validators, build, `npm audit` (0), backend `npm ci`, `npm audit --omit=dev` (0), backend tests 151 suites / 2568 tests, PG harness 264/264. Pre-existing on main (not touched): brand-palette (5, private-seller/admin files), `validate:release` phase21 (`setListings`), `validate:communications:providers`; credential-gated: `validate:live-runtime`, `validate:v14:next-phase`.
