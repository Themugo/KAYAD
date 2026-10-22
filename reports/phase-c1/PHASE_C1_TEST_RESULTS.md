# PHASE C.1 — Test Results and Command Log

Runtime: Node **v22.22.2** (official binary), npm 10.9.4, Linux x86_64. Unless stated, every result below was produced from a
**fresh extraction of the Phase C.1 candidate archive** followed by `npm ci` (root and backend). Logs: `reports/phase-c1/logs/`.
Statuses: PASS / FAIL / BLOCKED / NOT VERIFIED / SOURCE-LEVEL ONLY.

## 1. Build, type and unit/regression suites

| Command (cwd) | Phase C as supplied | Phase C.1 final | Log |
|---|---|---|---|
| `npm ci` (root, backend) | PASS / PASS | PASS / PASS (manifests unchanged) | F01, F02 |
| `npm run typecheck` (root) | PASS 0 errors | **PASS** 0 errors | F10-typecheck |
| `npm run build` (root) | PASS | **PASS** | F10-build |
| `npx vitest run` (root) | PASS 759 + 1 skipped | **PASS** 759 + 1 skipped (95 files) | F10-vitest |
| `npm run test:jest` (backend) | **FAIL** 2,569/2,570 (1 failing suite) | **PASS** 153/153 suites, 2,573/2,573 | F20 |
| `npm run test:vitest` (backend) | PASS 36/36 | **PASS** 36/36 | F21 |
| `npm run test:node` (backend) | PASS 1/1 | **PASS** 1/1 | F22 |
| `npm audit --audit-level=high` (root) / `--omit=dev` (backend) | — | **PASS** / **PASS** (CI replay) | F40 |

## 2. CI and deployment workflow replay

Every `run:` step of `.github/workflows/deploy.yml` (job `validate`) and `.github/workflows/ci.yml` (quality, backend-quality,
security incl. secret scan, bundle-analysis) executed in order on the extracted candidate: **35/35 exit 0** (F40).
The bundle job prints its existing advisory warning (total JS above its 2,000 K soft limit), which does not fail the job.

## 3. Repository validators (`validate:*`, 120 s timeout each)

| | Scripts | PASS | FAIL |
|---|---|---|---|
| Phase C as supplied | 135 | 131 | 4 |
| Phase C.1 final | 136 | **132** | **4** |

- `validate:backend-boot` and `validate:lucide-icon-exports` failed in the first final sweep only because a concurrent
  `npm ci` (from the CI replay) was rebuilding `node_modules` in the same folder; rerun in isolation: **PASS** (F32), and both
  pass inside the CI replay itself (F40).
- New: `validate:phaseC1-runtime-integrity` 12/12 PASS (fails 3/12 on Phase C sources). `validate:phaseC-soft-delete` PASS, 715
  files (fails 5 checks on Phase C sources). `scripts/validate-admin-control-plane-e2e.mjs` 11/11.
- The 4 remaining failures are identical on Phase C and outside every CI/deploy gate:
  `validate:communications:providers` (BLOCKED: no provider credentials; stops at its credential check, nothing sent);
  `validate:live-runtime` (BLOCKED: requires live Supabase credentials); `validate:release` (FAIL: phase21 substring false
  positive, R-13); `validate:brand-palette-convergence` (FAIL: 7 amber utilities + one `#2563EB`, R-14).

## 4. Database and migration chain (disposable PostgreSQL 16.15, loopback only)

| Check | Status | Evidence |
|---|---|---|
| Shim + Supabase default privileges + all `supabase/migrations` in order, one transaction each, `ON_ERROR_STOP` | **PASS 184/184** | 30-migration-chain |
| Resulting schema | PASS | 205 public tables, RLS enabled on 205/205, 144 policies, 182 functions; PostgREST schema cache: 205 relations, 158 relationships |
| Migration hygiene validator | PASS | F30/F32 |

## 5. Runtime suites against the disposable stack (final candidate backend + PostgREST + Redis)

| Suite | Status | Result | Log |
|---|---|---|---|
| Soft-delete / null-filter data layer (new) on **unmodified Phase C** code | FAIL | 14/21: five public leaks (listing, pagination, detail, sitemap, search) + model `$ne:null` 22007 + one test-side column error (fixed in the test) | 40-softdelete-RED-phaseC |
| Same suite on Phase C.1 | **PASS** | 21/21, repeatable, leaves no fixtures | F51 |
| Redis pattern invalidation (new), original `utils/cache.js` | FAIL | 0/2: keys survive `cacheDelPattern` | (run in session; see change ledger) |
| Same, Phase C.1 | **PASS** | 2/2 (250 keys across SCAN pages) | F52 |
| HTTP authorization + soft-delete matrix (new) | **PASS** | 30/30 (P1–P16 public/listing/soft-delete over HTTP, A1–A14 admin/Command Centre/owner/forged token) | F53 |
| Stage 5F.10 custody HTTP harness (existing) | **PASS** | 46/46 | F54 |
| Chat message integrity (existing, opt-in) | **PASS** | 1/1 (concurrency, idempotent replay, ordering, receipts via RPC) | F55 |
| Stage 5F.10 Chromium journey (existing, unchanged) | FAIL | 15 PASS then harness stops: stale selector `/^Auctions$/` (button is "Auctions module" since `447c4dd`), R-22 | F61 |
| Same journey, scratch copy with only that selector updated | FAIL 21/23 | 2 genuine findings: admin sidebar axe (critical `button-name`, contrast 2.18:1) R-21; `GET /api/admin/alerts` 500 R-19 | F63 |
| Phase C.1 Chromium journeys (new), desktop + phone, axe | FAIL 25/27 | Only failures: `GET /api/admin/alerts` 500 on admin pages (R-19). All public, soft-delete, Command Centre, CMS, staff restriction, dealer, buyer checks PASS | F70, screenshots |
| Default Playwright suite, frontend-only (as designed/CI) | FAIL 37/40 | 3 desktop-header assertions under the Pixel 5 project (R-12) | F73 |
| Default Playwright suite with the live disposable backend | FAIL 35/40 | Same 3 + `admin escrow dropdowns` ×2 (spec mocks `/api/cars` only; live backend data interferes) (R-12) | F72 |

Browser runs used Chromium with host-resolver rules that resolve only loopback hosts; a local bundle with
`VITE_SOCKET_URL` set to the local origin (an unset value falls back to production in production builds).
The auth limiter (20 requests / 15 min / IP, including `GET /me`) was raised with its documented
`AUTH_RATE_LIMIT_MAX` setting for browser suites only, because one test IP performs many logins (R-20).

### Accessibility (axe-core 4.10.3, WCAG 2A/AA) — measured, not gated

| Page | Critical | Serious |
|---|---|---|
| Home / Marketplace (desktop) | 0 | 1 (`color-contrast`, 18 nodes) |
| Home / Marketplace (phone) | 0 | 2 (`aria-prohibited-attr` 1, `color-contrast` 13) |
| Admin Command Centre | 1 (`button-name`, sidebar collapse button) | 1 (`color-contrast`) |
| Dealer Hub | 1 (`button-name`) | 0 |

## 6. Public-page regression comparison

The C.1 frontend source equals Phase B (no `src/`, `public/`, `index.html` or Vite config change in Phase C or C.1). The
production build output is **byte-identical to Phase B — the code live at `2e9e098` — for 184/185 files**; the only difference is
`release.json` (build timestamp). Visual regression of public pages is therefore impossible from this checkpoint; the only
user-visible change is in data: soft-deleted vehicles no longer appear publicly (intended). Screenshots of the public home,
marketplace, active and deleted vehicle (desktop 1280 / phone 390) are in `reports/phase-c1/screenshots/`.

## 7. Not run (and why)

| Area | Status | Reason |
|---|---|---|
| Approved staging environment | BLOCKED | No KAYAD staging project exists |
| Live payments / M-Pesa callbacks / provider sends | NOT VERIFIED | Prohibited in this phase; backend unit/regression suites cover payment, ledger, escrow logic (part of the 2,573 Jest tests) |
| Production deployment / DNS / migrations | NOT VERIFIED | Prohibited; read-only metadata only |
| Legacy Playwright suites (`E2E_WITH_BACKEND=1`: dealer-onboarding, vehicle-listing, chat, auction-bidding, escrow, M-Pesa, reviews, disputes) | NOT RUN | Documented in `e2e/playwright.config.ts` as targeting router-based legacy pages and requiring provisioned live fixtures |
| Firefox / WebKit | NOT RUN | Only Chromium is installed in this environment |
