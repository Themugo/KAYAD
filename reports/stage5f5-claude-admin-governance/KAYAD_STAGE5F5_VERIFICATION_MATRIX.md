# KAYAD Stage 5F.5 — Verification Matrix

Node 22.22.2. Evidence tiers: **S** source review · **M** mocked local runtime (jest/vitest, real routers) · **R** real local stack (disposable PostgreSQL 16 → PostgREST → backend → Vite, stub Brevo/SMS/Cloudinary, headless Chromium) · **H** hosted (Render/Vercel/Supabase).
Logs from the final run are in the working session; commands below were executed on the final tree (npm scripts from `package.json`).

| # | Check | Tier | Command / harness | Result |
|---|---|---|---|---|
| 1 | Foundation ZIP SHA-256 | S | sha256sum | matches c6368768…e4c43 |
| 2 | Typecheck | S | `npm run typecheck` | exit 0 |
| 3 | "Lint" | S | `npm run lint` (= `tsc --noEmit`; there is no separate ESLint script) | exit 0 |
| 4 | Production build | S | `npm run build` | exit 0 |
| 5 | Frontend unit/integration | M | `npx vitest run` | 90 files; 704 passed, 1 skipped |
| 6 | Backend jest | M | `cd backend && npm run test:jest` | 146 suites; 2446 passed |
| 7 | Backend vitest | M | `npm run test:vitest` | 6 files; 36 passed |
| 8 | Backend node test | M | `npm run test:node` | 1 passed |
| 9 | Stage 5F.5 new suites | M | `jest tests/regression/stage5f5` | 7 suites; 434 passed |
| 10 | Role × route matrix | M | stage5f5RoleRouteMatrix | 280 cases passed |
| 11 | Staff governance / owner-only | M | stage5f5StaffGovernance, OwnerIdentityLifecycle | passed (incl. legacy vs DB mode pins) |
| 12 | Approval/audit | M | stage5f5AdminGovernance, stage4AuditAfterCommit | passed |
| 13 | Command-centre API contract | M | CommandCenterSnapshot (17), AdminStatsContract (8) | passed |
| 14 | UI permission parity | M | permissionsParity (5) | passed |
| 15 | Command-centre UI behaviour | M | adminCommandCentre.test.tsx (11) | passed |
| 16 | Mutation checks | M | D-1/2/3/4/5/6/14 and queue filter tests fail without fixes | confirmed |
| 17 | Validators | S | supabase-migrations, foundation-integrity, owner-identity-convergence, master-identity-authz-corrections, stage5f2-dashboard-data-workflow | all exit 0 |
| 18 | Real API – admin/role | R | `role_api_5f5.mjs` | 88/0 |
| 19 | Real API – earlier role suites | R | role_api_a…k | a 70, b 67, c 55, d 49, e 30, f 53, g 104, h 60, i 64, j 35, k 93 — all 0 fail |
| 20 | Browser journeys (all roles) | R | `ui_journeys.mjs`, `ui_owner_unverified.mjs` | 35/0, 6/0 |
| 21 | Admin command-centre browser | R | `ui_5f5_admin.mjs` | 27/0: tiles = DB counts; queue filters (dealers→Users, vehicles→Cars); forged localStorage ignored; marketing boundary; owner tab; phone/tablet/desktop no overflow; axe WCAG2A/AA 0 serious/critical; keyboard |
| 22 | Owner governance on disposable DB | R | `owner_governance_pg_checks.sh` (candidate migration from 5B) | 97/97; upgrade/rollback 15/15 (run earlier in this stage; no migration changed since) |
| 23 | Route inventory | S | `tools/route_inventory.mjs` | 1277 rows / 1157 authed / 120 unauth / 30 unauth-mutating, reviewed |
| 24 | RLS | — | no migration changed in 5F.5 → no new RLS test | N/A (see 22 for the 5B candidate) |
| 25 | Secret scan on package | S | value scan + gitleaks `.gitleaks.toml` | see execution report §archive |

## NOT RUN / BLOCKED (never counted as passed)

| Item | Reason |
|---|---|
| Any test against Render / Vercel / hosted Supabase / live Brevo / live SMS / live payments | Forbidden by the stage constraints; environment classified UNKNOWN. |
| Hosted-database parity (63 migrations) | Hosted DB is behind code; applying migrations needs owner approval (OD-7). |
| Second owner `kayadaautomotives@gmail.com` verification | Requires a real mailbox action by the owner. |
| Real-device / real-browser matrix beyond headless Chromium | Not available in this environment. |
| Maker-checker for refunds/payouts | No policy exists (OD-6); not invented. |
