# KAYAD Master Convergence — Phase 0 Read-Only Audit

**Date:** 2026-10-21 · **Mode:** Phase 0 (read-only audit, design recovery, deployment diagnosis) · **Repository changes made:** none

**Release decision: NOT READY.** The checkpoint `447c4dd` **does not build**. That one defect explains why this commit is not live: CI fails, the Vercel deploy job is skipped, and production is still serving the previous commit `b9fbb15`. The fix is small and well-bounded. A larger and separate risk is that about 87 tables used by backend models have no schema anywhere. Several existing admin pages therefore cannot work in production.

---

## 0. How this audit was run (method and limits)

| Item | Detail |
|---|---|
| Source examined | Uploaded `KAYAD-BUSINESS-COMMAND-CENTRE-PHASE07-RELEASE-CERTIFICATION-20261021.zip` (SHA-256 `dbb846cc…354b`) **and** a fresh clone of `github.com/Themugo/KAYAD` at `main`. |
| Toolchain | **Node v22.22.2 exactly** (the official `node-linux-x64@22.22.2` binary from the npm registry, because nodejs.org is blocked here) and npm 10.9.4. This meets `engines: >=22.22.2` with `engine-strict=true`. It is the first run with the correct engine; Phase 07 was blocked on Node 22.16.0. |
| Dependency install | `npm ci` was run **only in a disposable copy** outside the repository, so the lockfile was honoured exactly and no manifests changed. Lockfile hashes were verified unchanged afterwards (`package-lock.json: OK`, `backend/package-lock.json: OK`). The checkpoint clone stayed `git status` clean. |
| Production checks | Safe GETs only: `release.json`, `/health`, and HTML shells. No logins, writes, deploys, env/DNS changes or provider sends. |
| Database | One read-only `list_tables` on Supabase project `ubvgixwhfybbyjuvxboj` (KAYAD EA). No SQL, no migrations. |
| Not available | Vercel dashboard/API (no token), GitHub Actions run logs (repo not attached with credentials), and browser rendering of the live site (the shell's egress blocks `kayad.space`). Items that depend on these are marked **UNVERIFIED**. |

---

## 1. Verified baseline and repository integrity

| Check | Result | Evidence |
|---|---|---|
| Remote `main` HEAD | **PASS**, `447c4dd9c24c9a078514ab9379586d5348a3d962` | `git ls-remote` → `447c4dd… HEAD` |
| Commit message | **PASS**, "Complete KAYAD Business Command Centre phases 1-7" (2026-10-21 08:23 +0300) | `git log -1` |
| ZIP vs checkpoint | **PASS**, identical tracked files | `diff -rq` reports only 2 extra items, both gitignored test-run artifacts: `backend/data/uploads.sqlite` (ignored by `backend/.gitignore:45`) and the empty `backend/uploads/` (`:41`) |
| ZIP has `.git` | No, so working-tree state is verified via the clone, not the ZIP | — |
| Node pins | `.nvmrc` = `.node-version` = `22.22.2`; `engines >=22.22.2` (root + backend); `.npmrc engine-strict=true, save-exact=true` | files |
| Lockfiles | `package-lock.json` (v3) and `backend/package-lock.json`, both install cleanly. **Also present: stale `bun.lock` (v1)**, see D-11. | `npm ci` exit 0 (470 + 812 packages) |
| Your local clone `C:\Users\hp\Desktop\kayad-fresh` | **UNVERIFIED.** Not reachable from this session. Run `git status` and `git rev-parse HEAD` there before Phase A. | — |

---

## 2. Actual architecture and route inventory

**Stack:** React 19.2.8 + Vite 8.2 (rolldown) + Tailwind 4.3 SPA on Vercel. The Express 5 API runs on Render (`api.kayad.space`) against Supabase Postgres. Realtime is Socket.IO, with the client script loaded at runtime from `VITE_SOCKET_URL`.

**Routing is a hand-written path switch, not `<Routes>`** (`src/App.tsx:832–905`):

- **Direct paths:** `/login`, `/admin/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/owner-invite`, `/force-password-change`, `/notifications` (auth), `/cars/:id` → `/?nav=marketplace&vehicleId=…`, `/auction/:id` (`AuctionLivePage`, keyed by path), `/dealer/onboarding`, `/dealer/auction-setup`, `/dealer/auction-operations[/:id]` (auth + dealer).
- **Legacy redirects into `/?nav=…`:** `/gallery`, `/marketplace`, `/auction(s)`, `/escrow`, `/support`, `/inspections`, `/financing`, `/sell*`, `/saved`, `/profile`, `/payments`, `/chat`, `/dashboard`, `/buyer-platform`, `/dealer`, `/inspector/dashboard`.
- **`/?nav=` surfaces in `AppInner`:**
  - Public: `marketplace`, `discovery`/`auctions`, `escrow`, `inspections`, `inspection-marketplace`, `financing`, `dealers`, `support`, `kayadlive`.
  - Authenticated: `saved`, `profile`, `payments`, `chat`, `dashboard` (DashboardHub), `buyer-platform`, `dealer-dashboard`, `seller-platform` (+ aliases), `escrow-operations` (staff).
- **Admin:** `/admin` and `/admin/dashboard` render the Command Centre (`AdminView`). There are **47 registered `/admin/*` routes** in `ADMIN_ROUTE_COMPONENTS` (`src/components/admin/AdminRouteSurface.tsx:66`), 18 of them flagged superadmin-only, with `SUPERADMIN_ONLY` as a second check. Unknown paths get an explicit "Admin page not found".

**Reachability:** an esbuild module graph from `src/main.tsx` shows that **235 of 641 frontend source files are reachable, and 406 (63%) are not**. Canonical (reachable) surfaces:

| Surface | Canonical module | Notable dead alternatives |
|---|---|---|
| Buyer/customer | `features/OwnershipPlatform/pages/BuyerPlatform.tsx`, `components/DashboardHub.tsx` | `pages/buyer/**`, `pages/Dashboard.tsx` |
| Private seller | `features/PrivateSellerPlatform/pages/PrivateSellerPlatform.tsx` | `pages/PrivateSellerDashboard.jsx` |
| Dealer | `pages/dealer/dashboard/DealerDashboard.tsx` + 4 dealer auction/onboarding pages | `pages/dealer/DealerDashboard.jsx`, `components/dealer/*`, `components/layout/Dealer*` |
| Inspector | **No dedicated dashboard.** `/inspector/dashboard` → `InspectionsView` + `InspectionMarketplace/organization/*` (branches, team, operations, reports) | `pages/inspector/components/*` (5 files) |
| Admin shell | `components/admin/AdminLayout`, `AdminSidebar`, `AdminRouteSurface` | `components/layout/AdminLayout`, `components/layout/AdminSidebar`, `pages/admin/AdminDashboard.jsx`, `ControlRoom.jsx`, `OperationsDashboard.jsx`, `AdminDisputes.jsx`, … |
| Design system | `components/ui/` (only 9 of 58 files used) | **all 9 files in `src/design-system/`** |

---

## 3. Public webpage design and preservation checklist

**Current public design (recovered from source):** KAYAD Slate Teal palette, defined once in `src/index.css:5–96`:

- **Brand colours:** deep `#0A3340`, dark `#12576D`, brand `#176B87`, accent `#13B8A6`, muted `#5AAFA4`, soft `#DDF4F0`, surface `#F6FAF9`, border `#D7E7E4`.
- **Fonts:** Plus Jakarta Sans (body) and Outfit (display).
- **Shadows:** `--shadow-card` and `--shadow-card-hover`.
- **Live public stylesheets:** `index.css`, which `@import`s `auction-experience-2.css`, `auction-premium.css` and `kayad-theme-convergence.css`, plus `kayad-navigation.css`.
- **Shell:** `TopNoticeStrip`, `Navbar`, a `main.kayad-public-shell` wrapper, and the mobile docks (`MobileBottomNav`, `AuctionMobileDock`).
- **Accessibility already present:** `:focus-visible` rules and 6 `prefers-reduced-motion` blocks.

**Live state:** `https://www.kayad.space/` and `https://kayad.space/` both serve the KAYAD app shell ("KAYAD | Kenya's Verified Automotive Marketplace & Escrow Vault") from commit `b9fbb15`.

**Preservation checklist (gate for every later phase):**

- [ ] No edits to `src/index.css :root`/`@theme` token values, `kayad-theme-convergence.css`, `kayad-navigation.css`, `auction-*.css`.
- [ ] No edits to `Navbar.tsx` markup or classes other than the one type fix (D-3), which changes no rendered output.
- [ ] No edits to `features/VehicleMarketplace/**`, `components/home/**`, `pages/home/**`, `TopNoticeStrip`, `MobileBottomNav`, `AuctionLivePage`, `AuctionsView`, `DealersView`, `InspectionMarketplacePage` (public mode), `FinanceMarketplace` (public mode), `SupportView`, `EscrowView`, auth pages.
- [ ] No change to `App.tsx` path switch, redirects or `publicShellClass`.
- [ ] New dashboard styles are **scoped under `.kayad-admin-shell` or a new `.kayad-workspace` root class**. No bare element selectors and no new global `@theme` entries.
- [ ] Public visual baseline captured **before** Phase D: screenshots at 390 / 768 / 1280 / 1440 px of home, marketplace, vehicle detail, auctions, auction detail, dealers, inspections, financing, escrow, support, login and register. Pixel-diff after every phase.

**Shared-component regression risk:**

| Shared element | Used by | Risk if changed |
|---|---|---|
| `index.css` tokens and `@layer base` | everything | **High.** Do not touch. |
| `Navbar.tsx` | public + all workspaces | **High.** Type-only fix allowed. |
| `components/ui/Card`, `Modal`, `MarketplacePrimitives`, `DomainPremiumSurface` | public + portals | **High.** Add new variants, never change defaults. |
| `kayad-admin-shell.css` | admin only (selectors scoped) | Low |
| `AdminLayout` / `AdminSidebar` | admin only | Low |

---

## 4. Authenticated dashboard inventory and proposed polish

Measured over canonical modules only (inline `style={{}}` objects / hex literals / distinct hex values):

| Surface | Files | Lines | Inline styles | Hex literals | Distinct hex | Proposed polish (no new capability) |
|---|---|---|---|---|---|---|
| Buyer portal | 2 | 313 | 0 | 79 | 17 | Replace hex with token classes; shared `WorkspaceHeader`, `StatTile`, `EmptyState`, `ErrorState`. Saved vehicles, bids, escrows and inspections already flow through existing APIs. |
| Private seller | 3 | 1,140 | 61 | 70 | 24 | Move inline styles to scoped classes; unify listing-status badges with admin `StatusBadge`. |
| Dealer dashboard | 5 | 1,828 | 176 | 279 | 23 | Largest portal debt. Convert inline styles, standardise tables and tabs, consistent loading/empty states. Leave the 4 dealer auction pages' workflows untouched. |
| Inspections / inspector | 24 | 4,579 | 142 | 418 | 32 | Treat as the inspector workspace. Add a clear "My assigned inspections" landing state inside the existing `InspectionsView`; **no new route.** |
| DashboardHub | 1 | 86 | 2 | 32 | 11 | Align to the shared tile and header components. |

---

## 5. Business Command Centre and department convergence matrix

**Actual implementation:** `AdminView.tsx` (455 lines, Tailwind, owner-gated "Departments module") and `AdminDepartmentCapabilities.tsx`, a static and honest inventory of 9 departments, each capability labelled IMPLEMENTED BUT UNVERIFIED / PARTIAL / NOT IMPLEMENTED. The sidebar (`AdminSidebar.tsx`) is a **flat list of 29 links** styled entirely with inline styles.

| Department | Existing route(s) | Sidebar? | Production schema backing | Status |
|---|---|---|---|---|
| Sales & orders | `/admin/cars`, `/moderation`, `/auctions`, `/bids`, `/transactions` | Yes | cars, bids, payments, transactions ✔ | Works (unverified at runtime) |
| Accounting & finance | `/admin/transactions`, `/escrows` | Yes | payments, escrows, ledger_*, reconciliation_* ✔ | Works (unverified) |
| Technical operations | `/admin/control-room`, `/security-log`, `/provider-governance` | Partial | incidents, alerts ✔; **`security_logs` ✘** | **Security Log will fail** |
| Inspections | `/admin/inspections`, `/inspector-applications`, `/ntsa-queue` | Yes | vehicle_inspections, inspector_applications, ntsa_verification_requests ✔ | Works (unverified) |
| Support & disputes | `/admin/support` ≡ `/admin/support-tickets` (same component), `/feedback`, `/chats`, `/reports` | Yes | support_tickets ✔; **`feedback` ✘, `reports` ✘** | **Feedback and Reports will fail** |
| Marketing & comms | `/admin/communications`, `/broadcast`, `/ads`, `/cms` | Partial | communication_* ✔, cms_* ✔; **`ads` ✘, `announcements` ✘** | **Ad Manager and Broadcast likely fail. CMS breaks the build (D-1).** |
| Staff & permissions | `/admin/staff`, `/staff-permissions`, `/owners` | Partial | users, admin_control_* ✔ | Works (unverified) |
| Reporting | `/admin/market-data`, `/intelligence` | Partial | market_data ✔ | Partial |
| Approvals | `/admin/dealer-verifications`, `/sellers`, `/moderation`, `/inspector-applications` | Yes | ✔ | Works (unverified) |
| Superadmin studios | `/admin/lowcode`, `/vxp`, `/xos`, `/digital-twin`, `/automation`, `/platform-factory`, `/config`, `/ai` | **No** | **`business_objects`, `vx_*`, `experiences`, `simulations`, `workflows*`, `platform_*`, `config_entries`, `feature_flags`, `ai_*` all ✘** | **Will fail.** UI and API exist, schema does not. |

"✘" means the table is absent from production **and has no `CREATE TABLE` anywhere in the repository** (`supabase/migrations`, `backend/db/*.sql`). This is inferred from code and schema listing and was **not** exercised at runtime.

**Proposed convergence (preserves every route):**

1. Group the sidebar by the 8 departments above. Show studios only to superadmin under a collapsed "Labs (schema not provisioned)" group, or hide them until the schema exists.
2. Point `/admin/support-tickets` and `/admin/support` at one sidebar entry.
3. Replace sidebar inline styles with scoped classes in `kayad-admin-shell.css`.
4. Make every department page render an explicit `ErrorState` when its API returns 5xx, never a blank or zero panel.

---

## 6. Design system and visual inconsistency report

- **Two parallel styling systems:** the newer TSX surfaces use Tailwind arbitrary values (`bg-[#0A3340]`); the 55 legacy `pages/admin/**` JSX files use inline style objects (**1,215 `style={{}}`, 2,720 hex literals, 46 distinct colours**).
- **Tokens exist but are bypassed:** most-used literals are exact token values (`#0A3340` ×939, `#64748B` ×756, `#D7E7E4` ×591), so tokenising them is mechanical and visually neutral.
- **Status-colour drift:** success green appears as `#22C55E`, `#10B981` and `#2ECC71`; danger as `#EF4444` and `#991B1B`; near-duplicates such as `#0B3440` vs `#0A3340`, and `#DCE8EB`/`#DBE7E8`/`#D7E7E4`. There are no semantic status tokens.
- **Dead design system:** `src/design-system/*` (Badge, Button, Card, DataTable, Drawer, Input, Modal, Tabs, Toast) is imported by nothing. 49 of the 58 `components/ui` files are also unused.
- **Dead CSS:** `mobile.css` (1,943 lines), `dealer.css` (1,416), `dashboard.css` (654), `layout.css`, `showroom.css`, `car-detail.css`, `compare.css`, `auction-live.css` and `accessibility.css`, about 4,800 lines in total, are never loaded.
- **Proposed shared dashboard tokens** (added under `.kayad-workspace`, not `:root`):
  - Status: `--ws-success:#15803D`, `--ws-warning:#B45309`, `--ws-danger:#B91C1C`, `--ws-info:#176B87`, each with a `-soft` background.
  - Text: `--ws-text:#0A3340`, `--ws-text-muted:#58717A` (meets 4.5:1 on white).
  - Space scale: 4/8/12/16/24/32. Radius: 8/12.
  - One component set: `WorkspaceHeader`, `StatTile`, `DataTable`, `StatusBadge`, `EmptyState`, `ErrorState`, `SkeletonRows`, `FilterBar`.

  These are proposals and do not exist yet.

---

## 7. CLI / build / dependency failure register

All commands were run with Node 22.22.2 in the disposable copy.

| # | Command | Result | Exact error / evidence | Classification |
|---|---|---|---|---|
| C-1 | `npm ci` (root) | **PASS** | 470 packages, 15 s | — |
| C-2 | `npm ci` (backend) | **PASS** | 812 packages, 21 s | — |
| C-3 | `npm run build` | **FAIL** | `Build failed with 7 errors: [MISSING_EXPORT] "LandingPage" … "Paragraph" … "Button" … "Gallery" … "Banner" … "Robots" … "Sitemap" is not exported by lucide-react` | **Source defect (D-1)** |
| C-4 | `npm run typecheck` | **FAIL** (1 error) | `src/components/Navbar.tsx(698,27): TS2367 … '"buyer" \| "dealer" \| "admin" \| "bank_officer" \| "mechanic"' and '"superadmin"' have no overlap` | **Source defect (D-3)** |
| C-5 | `npx vitest run` | **FAIL** 1 / 760 | `adminCommandCentre.test.tsx › shows the capability matrix only to a confirmed owner…: TypeError: Cannot destructure property 'basename' of … useContext(...) as it is null` (94/95 files, 758 pass, 1 skipped) | **Test-harness defect (D-4)** |
| C-6 | backend `npm test` | **PASS** | Jest 151 suites / 2,569 tests; Vitest 36; node:test 1 | — |
| C-7 | The 10 pre-build gates in `deploy.yml` | **PASS** | phase6-release, frontend-runtime-contracts, homepage-convergence, deployment-readiness, vercel-ci, backend-boot, hero-mobile-assets, hero-admin-control, v14 release-candidate (17/0), v14 runtime-preflight | — |
| C-8 | `validate-admin-control-plane-e2e.mjs` | **FAIL** 10/11 | `FAIL - snapshot reads authoritative Supabase tables` | **Stale assertion (D-7)** |
| C-9 | Parent `b9fbb15`: `npm run build` / `tsc` / failing test | **PASS / PASS / PASS (11/11)** | Proves C-3, C-4 and C-5 were all introduced in `447c4dd` | — |

**Phase 07 blockers reclassified:** "Node 22.16.0", "node_modules absent" and "eslint missing" were **environmental**. With the correct engine all of them disappear. Backend boot is a PASS.

**Root cause of C-3:** `447c4dd` registered `/admin/cms` → `pages/admin/cms/ContentStudio` in `ADMIN_ROUTE_COMPONENTS` (first appearance of that import, per `git log -S`). That pulled the previously orphaned CMS tree into the bundle graph. Its imports use 7 icon names that do not exist in lucide-react 1.28.0:

- `ContentStudio.jsx:2` — `LandingPage`
- `VisualPageBuilder.jsx:4` — `Paragraph`, `Button`, `Gallery`, `Banner`
- `SEOManager.jsx:2` — `Robots`, `Sitemap`

Rolldown treats a missing export as a hard error. Separately, `components/layout/Header.tsx` imports `Facebook`, `Instagram` and `Linkedin`, which were removed from lucide. That file is dead code and does not break the build today.

---

## 8. Vercel deployment and domain failure analysis

| Link in chain | Finding | Evidence |
|---|---|---|
| Source → build | **Broken at `447c4dd`** (C-3) | local build exit 1; parent exit 0 |
| CI (`deploy.yml`) | `validate` job passes 10 gates, then **fails at "Build production frontend"**. `deploy-vercel` has `needs: validate`, so it **never runs**. `ci.yml` also fails at Typecheck (C-4), Test (C-5) and Build. | workflow source + replayed gates. The Actions run log itself is **UNVERIFIED** (no API access). |
| Deployed frontend | **`b9fbb15`**, generated 2026-10-20T17:00:29Z | `https://kayad.space/release.json` and `https://www.kayad.space/release.json` both return `{"commit":"b9fbb155…","source":"production"}` |
| Deployed backend (Render) | **`447c4dd`**, status ok, DB ok, uptime ≈ 20 min at 05:45Z | `https://api.kayad.space/health?probe=…` (an un-cache-busted fetch returned a stale 2026-10-13 snapshot; ignore that) |
| **Skew** | Backend is one commit ahead of the frontend. Backend diff is small and additive: new `GET /api/admin/staff/roles/catalog`; staff creation now requires a ≥12-character password and a valid email; optional audit `reason`; communications-control tweaks. **Low risk**, but the deployed staff-create form may now receive 400s for short passwords. | `git diff b9fbb15 447c4dd -- backend/` |
| Domains | `kayad.space` and `www.kayad.space` both serve the app shell. **The historical "kayad.space 404 while Ready" symptom is not reproducible today.** Its original cause cannot be determined without Vercel domain/deployment logs (UNVERIFIED). | WebFetch |
| `kayad-space-themugos-projects.vercel.app` | **302 → `vercel.com/login`**, so Vercel Deployment Protection is on for that alias. It is not a public URL and should not be used for smoke tests. | WebFetch |
| `vercel.json` (prod) | Correct for a Vite SPA: `framework: vite`, `npm ci`, `npm run build`, `outputDirectory: dist`, `/api/:path*` → `api.kayad.space`, SPA fallback `/((?!api/|assets/).*)`. Vercel serves real files (`sw.js`, `release.json`, `manifest.webmanifest`) before rewrites. | file |
| Gaps vs staging config | Prod has **no CSP header** (staging does) and no `/socket.io` or `/uploads` rewrites. Sockets go direct to `api.kayad.space` via `VITE_SOCKET_URL`, which is acceptable. `vercel-staging.json` uses `npm install` (not reproducible). | files |
| Vercel-side settings | Project Node version, whether Git-integration builds also run alongside the CLI deploy, and production env vars (`VITE_PUBLIC_URL`, `VITE_API_URL=/api`, `VITE_SOCKET_URL`, `VITE_POSTHOG_*`) are **UNVERIFIED**. If Vercel's own Git builds run on a Node 22 below 22.22.2, `engine-strict` would make them fail independently. | — |

**Corrective actions (each needs your explicit approval):**

1. Merge the D-1, D-3 and D-4 fixes to `main`. This automatically triggers `deploy.yml` → Vercel production deploy of the fixed commit. Pushing to `main` deploys production, so it is the approval point.
2. After the deploy, confirm `release.json` shows the new SHA and run the existing `npm run verify:production`.
3. In Vercel (your permission): confirm Node 22.x ≥ 22.22.2, confirm only one deploy path is active (CLI from Actions, or Git integration, not both), and add a CSP equivalent to staging's.

---

## 9. Backend, data and authentication findings

- **D-7 (validator).** The assertion is **outdated, not a product defect.** Commit `b6813d7` (Stage 5F.5 D-7) deliberately replaced the inline `sb.from(table).limit(1000)` sample, which under-reported queues above 1,000 rows, with exact server-side `count()` calls from `backend/db/index.js:217`. That helper itself runs `getSupabase().from(table).select('*',{count:'exact',head:true})`. Every table it reads exists in production. **Correct fix:** update the assertion to require `count(` imported from `../db/index.js` and to reject any `.limit(1000)` sampling. That is stricter than before, not weaker.
- **D-6 (data integrity).** `applyFilters` (`backend/db/index.js:28`) and `createModel().buildWhere` (`models/_base.js`) **silently drop any filter whose value is `null`.** So `{ deletedAt: null }` applies no filter at all. The test suite already documents this (`tests/auction/auctionListIntegrity.test.js`), and the established fix is `{ deletedAt: { $exists: false } }`. **34 call sites in 11 files still use the broken form.** Affected:
  - `sitemapService.js:51` (public sitemap can list soft-deleted auction vehicles)
  - `dealerSubscription.service.js:71` (soft-deleted listings count against dealer plan limits)
  - `commandCenterController.js` (Command Centre `cars` / `pendingVehicles` include deleted rows)
  - `marketplaceHealthService`, `vehicleAnalytics*`, `operationsDashboardController`, `ecpService`, `auctionIntegrityService`, `reminderAutomationService`, `dealerHealthScoreService`
- **D-5 (schema).** 90 of 181 tables in `models/_base.js TABLE_MAP` are absent from production, and **87 have no DDL anywhere in the repo.** See §5 for affected admin pages. Production is otherwise lightly populated: 2 users, 0 cars, 0 payments. RLS is enabled on every public table.
- **Authorization (source review):**
  - Frontend `RequireAdmin` / `RequireAdminPage` plus `SUPERADMIN_ONLY` double-check (`AdminRouteSurface.tsx:165–190`).
  - Backend `ensureOperator` / `ensureMutation` / `ensureAdmin` in `commandCenterController.js:28–36`.
  - The owner-only department matrix rejects a forged string `isOwner: 'true'` (test passes).
  - Runtime direct-API RBAC across identities is **NOT RUN** (needs isolated identities).

---

## 10. Test readiness matrix

| Test | Status now | Evidence / limitation |
|---|---|---|
| TypeScript typecheck | **FAIL** (1) | C-4 |
| Production frontend build | **FAIL** (7) | C-3 |
| Backend startup / boot guard | PASS (static) | `validate:backend-boot`; full server start against a DB **NOT RUN** |
| Backend unit/integration | **PASS** 2,606 | C-6 |
| Frontend unit/component | **FAIL** 758/759 | C-5 |
| Source validators (deploy gate) | PASS 10/10 | C-7 |
| Admin control-plane validator | FAIL 10/11 | stale (D-7) |
| Browser E2E: public pages | NOT RUN | needs a running build + reachable API; Playwright + Chromium are available here for Phase F |
| Browser E2E: dashboards | NOT RUN | needs authorised test identities |
| BCC navigation / departments | PASS (source + unit) | runtime NOT RUN |
| Role & ownership authorization (API) | NOT RUN | needs isolated identities |
| Responsive / a11y | NOT RUN | — |
| Deployment / domain smoke | PARTIAL | release.json + health GETs only |
| Payment / ledger integrity | PASS (backend unit only) | no live money movement, by design |

---

## 11. Severity-ranked defect register

| ID | Sev | Defect | Location | Introduced | Minimal fix |
|---|---|---|---|---|---|
| **D-1** | **Critical** | Production build fails; blocks every deploy | `pages/admin/cms/ContentStudio.jsx:2`, `components/VisualPageBuilder.jsx:4`, `components/SEOManager.jsx:2` | `447c4dd` | Swap the 7 icons for existing lucide 1.28 names (verified to exist): `LandingPage→LayoutTemplate`, `Paragraph→Pilcrow`, `Button→SquareMousePointer`, `Gallery→Images`, `Banner→RectangleHorizontal`, `Robots→Bot`, `Sitemap→Network`. Add a validator that checks every lucide import against real exports. |
| **D-2** | High | Frontend (`b9fbb15`) / backend (`447c4dd`) version skew; BCC phases 1–7 not live | Vercel vs Render | consequence of D-1 | Resolved by deploying the D-1 fix |
| **D-3** | High | Typecheck error blocks `ci.yml` | `Navbar.tsx:698`; `UserProfile.role` union (`src/types.ts:623`) lacks staff roles | `447c4dd` | Widen the union to include the staff roles already used at runtime (type-only, no rendered change) |
| **D-4** | Medium | Test mounts `AdminView` without a Router; `<Link>` throws | `src/__tests__/features/adminCommandCentre.test.tsx:31` | `447c4dd` | Wrap `mount()` in `<MemoryRouter>`; assertions unchanged |
| **D-5** | High | 87 model tables have no schema; Feedback, Reports, Ad Manager, Security Log, Broadcast, Config and 6+ superadmin studios cannot work in production | `models/_base.js TABLE_MAP` vs Supabase | long-standing | **Owner decision:** (a) hide/flag these routes until schema is designed, or (b) a separately approved migration programme. Never invent tables during convergence. |
| **D-6** | Medium | `deletedAt: null` filters silently ignored; soft-deleted rows leak into sitemap, dealer quotas and admin counts | 34 call sites / 11 files | long-standing | Mechanical change to `{ $exists: false }` plus a regression test per call site |
| **D-7** | Low | Validator asserts superseded implementation | `scripts/validate-admin-control-plane-e2e.mjs` check #2 | `b6813d7` | Update to assert canonical exact-count path (stricter) |
| **D-8** | Medium | Sidebar is flat and inline-styled; 19 registered routes absent from nav; duplicate support entries | `AdminSidebar.tsx`, `AdminRouteSurface.tsx` | — | Department grouping (§5) |
| **D-9** | Medium | Dashboard styling debt: 1,215 inline styles, 2,720 hex literals, 3 success greens | `pages/admin/**`, dealer, inspections | — | Phase D tokenisation, scoped |
| **D-10** | Low | 406 unreachable source files, ~4,800 lines of dead CSS, unused `design-system/` | repo-wide | — | Do **not** delete during convergence; record in a dead-code register and remove later in a separate approved pass |
| **D-11** | Low | Stale `bun.lock` beside `package-lock.json`; prod has no CSP; staging uses `npm install`; `Header.tsx` dead file imports removed brand icons | root | — | Remove `bun.lock` (approval); add CSP after verifying the asset/socket origins |
| **D-12** | Info | Main chunk 597 KB (154 KB gzip), single CSS 302 KB | build output (parent) | — | Optional later; not in scope |

---

## 12. Minimal-change implementation sequence

The order is the brief's A→F with one justified change: **Phase B goes first and alone**, because production is currently stuck and the fix is about 10 lines.

| Phase | Scope | Files (expected) | Gate |
|---|---|---|---|
| **A — Baseline** | Confirm `kayad-fresh` HEAD/clean; capture public screenshots from the current production build `b9fbb15` at 4 widths; record the Vercel project's Node and env settings (you, in the dashboard) | none | baseline archive + SHA-256 |
| **B — Build recovery** | D-1, D-3, D-4, D-7, plus a new lucide-export validator | 3 CMS files, `types.ts`, 1 test, 1 validator, 1 new validator script, `package.json` script entry | typecheck 0, build 0, vitest all pass, all validators pass |
| **C — Deploy convergence** | Push B to `main` (**your approval**), verify `release.json`/`verify:production`, Vercel settings check, CSP proposal, remove `bun.lock` | `vercel.json` (CSP, separately approved) | release.json = new SHA; public pixel-diff = 0 |
| **E (moved before D) — Integrity** | D-6 call-site fixes + tests; D-5 owner decision → route flags / "not provisioned" error states | 11 backend files + tests; admin route metadata | backend suite green; no public change |
| **D — Dashboard convergence** | `.kayad-workspace` tokens + shared components; sidebar grouping; tokenise buyer → seller → dealer → inspections → admin pages, one surface per commit | dashboard modules only | public pixel-diff = 0 each commit |
| **F — Certification** | Full matrix §10 incl. Playwright public + dashboards at 4 widths, a11y (axe), RBAC matrix with isolated identities | — | final ZIP + SHA-256 + report |

E moves ahead of D because D's error/empty states should reflect real schema availability. Polishing pages that will 500 first would be wasted effort.

---

## 13. Acceptance criteria and public-page regression gates

1. `npm ci && npm run typecheck && npm run build && npm test` exit 0 on Node 22.22.2. Backend `npm test` exit 0.
2. All `deploy.yml` / `ci.yml` steps green on the merged commit. No validator assertion weakened (diff-reviewed).
3. `https://www.kayad.space/release.json` commit = merged SHA = `api.kayad.space/health` buildId.
4. **Public gate (release-blocking):** pixel-diff of every baseline page at 390/768/1280/1440 is within anti-aliasing tolerance. Any intentional public change requires its own approved defect ID.
5. No new global selectors. `git diff` shows no change to `index.css` tokens, `kayad-navigation.css` or the public module list in §3.
6. Every admin route either works against existing schema or renders an explicit, truthful "not available" state. No fabricated metrics.
7. RBAC: unauthenticated, ordinary user, dealer, staff role, admin, superadmin and owner each receive the expected 200/401/403 on a sampled set of admin APIs.

---

## 14. Release readiness decision

**NOT READY — but recoverable quickly.** Production is healthy on the previous commit, and the backend is healthy on the current one. The checkpoint fails to build because of 7 non-existent icon names, and CI additionally fails on one type error and one test-harness error, all introduced in `447c4dd`. With those fixed, all deploy gates already pass.

**Remaining unknowns:**

- Vercel project settings and deploy logs.
- The GitHub Actions run history for `447c4dd`.
- The state of your local clone.
- Runtime behaviour of admin pages backed by missing tables.
- Browser-level E2E and RBAC.
- Why `kayad.space` previously returned 404 (not reproducible now).

**Approval requested:** Phase B (build recovery, about 7 files) as a standalone change, with Phase C's push-to-`main` as a separate explicit go-ahead.
