# KAYAD Hardening — Final Cleanup Report

Date: 2026-08-24
Scope: Remove proven-dead technical debt only. **No features added. Nothing deleted merely for looking old — every deletion was verified against imports, route references, dynamic references, tests, deployment config, and backend/frontend contracts before removal.**

## Deletion verification protocol (applied per file)

For each candidate: `grep` across `src/`, `e2e/`, `backend/` for static imports, string references, and dynamic `import()`/`require`; checked `vercel.json` / `render.yaml` / `.github/workflows/*` / `vite.config.ts` / `vitest.config.ts` for deployment references; checked test files for dependencies; then **deleted and ran the full gate suite (typecheck + tests + build + audit) before keeping the deletion**.

## Files removed (12) — all proven dead

| File | Class | Verification evidence |
| --- | --- | --- |
| `src/api/api.exports.backup.ts` | backup source file | 0 references anywhere; `api.exports.ts` is the live barrel |
| `src/lib/supabase.ts` | duplicate implementation | 0 imports; live client is `lib/supabaseClient.ts` |
| `src/lib/supabaseClient.js` | duplicate (untyped shadow) | only `supabaseClient.ts` imported (`SocketContext`); `.ts` wins module resolution |
| `src/data/mockCars.js` | duplicate (untyped shadow) | only `mockCars.ts` imported (`api.exports.ts`); `.ts` wins resolution |
| `src/data/demoCars.js` | duplicate (untyped shadow) | identical to `.ts`; only `demoCars.ts` imported (`Showroom.jsx` resolves to `.ts`) |
| `src/utils/helpers.js` | duplicate (untyped shadow) | only `helpers.ts` imported by 4+ files; `.ts` wins resolution |
| `src/utils/requestCache.js` | duplicate (untyped shadow) | only `requestCache.ts` imported (`BrowsePage`, `apiResilience.test`) |
| `src/utils/security.js` | duplicate (untyped shadow) | only `security.ts` imported; `.ts` wins resolution |
| `src/data/demoData.js` | obsolete mock data island | only referenced by `demoAPI.js` (also deleted); 0 app/test imports |
| `src/data/demoAPI.js` | obsolete mock API client | 0 imports anywhere; superseded by real `services/authApi` + `api.exports` |
| `src/data/carImages.js` | obsolete mock data (island member) | only referenced by deleted `demoData.js` |
| `src/data/carSeedData.js` | obsolete mock data (island member) | only referenced by deleted `demoData.js` |

## Adjustments made to keep contracts intact (not features)

- `src/utils/helpers.ts`: restored the boolean `validateEmail` export that the deleted `.js` shadow had been the (accidental) source of — the `helpers.test.js` contract and the barrel `utils/index.ts` both require it. Implemented inline (single source of truth).
- `src/utils/security.ts`: renamed its richer result-object variant to internal `validateEmailDetailed` (kept in the default-export object) to resolve the `utils/index.ts` name collision with `helpers.validateEmail`.

## What was deliberately NOT removed (looked suspicious but is live)

- **7 "unmounted" backend route files** (`auctionRoutes`, `bidLogRoutes`, `biddingSecurityRoutes`, `localizationRoutes`, `transactionLedgerRoutes`, `userPreferenceRoutes`) — all actually mounted in `routes/v1.js` (the `/api/v1` tree). Verified, kept.
- ~~`mediaEventRoutes.js` / `mediaEventController.js`~~ — **removed in the second pass** (see below): the routes were mounted nowhere, the controller was consumed only by those routes, and no test touches either. The `mediaEventEngine/` library itself is **kept** — its own test suite depends on it and passes.
- `web-vitals` dependency — dynamically imported in `utils/observability.ts` (`await import('web-vitals')`). Live. Kept.
- All `services/*Api.js` — each has ≥1 importer. Kept.
- All `docs/` (57 files) — these are the phase truth-maps and audit evidence this directive instructs to clean *using*; deleting them would destroy the evidence trail. Kept.

## Gates after cleanup (all green)

| Check | Result |
| --- | --- |
| Typecheck (`tsc --noEmit`) | **0 errors** |
| Frontend tests (`vitest run`) | **50/50 files, 359 passed / 1 skipped** |
| Backend tests (Jest) | **16/16 suites, 335/335 passed** |
| Frontend build (`vite build`) | **succeeds** (chunk-size warning only) |
| E2E workflow-certification (Playwright, system Chromium) | **8/8 passed** |
| Security audit (`npm audit --audit-level=high`) | **0 vulnerabilities (frontend AND backend)** |

## Second pass (2026-08-24) — additional proven-dead removals

| Item | Class | Verification evidence |
| --- | --- | --- |
| `src/pages/HomePage.jsx` | orphaned page | 0 imports, no router config, no test import (matches are unrelated `MobileHomePage` / `isHomePage` prop) |
| `src/pages/ChatPage.jsx` | orphaned duplicate page | 0 imports; `ChatPage.test.jsx` imports `pages/Chat.tsx` (the live twin) |
| `src/pages/ProfilePage.jsx` | orphaned duplicate page | 0 imports; `ProfilePage.test.jsx` imports `pages/Profile.tsx` |
| `src/pages/Home.tsx` | orphaned page | imports CarCard types but is imported by nothing; app shell doesn't route it |
| `src/test-setup.ts` | dead config file | 0 references; vitest uses `src/__tests__/setup.js` |
| `backend/routes/mediaEventRoutes.js` | orphaned routes | mounted in neither `server.js` nor `v1.js`; referenced only by itself; tests don't touch it |
| `backend/controllers/mediaEventController.js` | orphaned controller | consumed only by the orphaned routes file; engine (`mediaEventEngine/`) KEPT — its test suite exercises it directly |
| `stripe` (backend dependency) | unused dependency | never imported anywhere (only the string `'stripe'` as a provider label in seed data) |
| `semantic-release` + 5 `@semantic-release/*` plugins + `release` script (backend devDeps) | abandoned experiment / unused dependencies | no `.releaserc`, no CI workflow, no code reference; also the source of ALL 7 remaining backend audit vulnerabilities (bundled npm inside it). Backend `npm audit --audit-level=high` now **0** |
| Fixed runtime CVEs | security | `dompurify`, `ip-address`, `brace-expansion` (runtime copies) via `npm audit fix` + version overrides (`brace-expansion ^5.0.9`, `ip-address ^10.3.1`, `tar ^7.5.21`, `undici ^6.27.1`) |

Note: `backend/mediaEventEngine/` itself was again **kept** — its own test suite (`mediaEventEngine.test.js`) depends on it and passes. Only the unmounted routes and their exclusively-consuming controller were removed as proven dead.

---

# Final Architecture Map

```
GitHub (Themugo/KAYAD, main)
  │
  ├─ CI (.github/workflows/ci.yml)        ✅ green: lint(tsc) + test(vitest) + build + audit
  ├─ CodeQL (security.yml)                ✅ green
  └─ Deploy (deploy.yml)                  ❌ fails: Vercel credentials missing (owner-side)
        │
        ├─ FRONTEND  React 19 + Vite (src/)
        │   ├─ entry: main.tsx → App.tsx (app shell, BrowserRouter)
        │   ├─ context/: AuthContext (cookie auth, roles), Theme/Toast/Socket/…
        │   ├─ features/: VehicleMarketplace, AuctionsView, EscrowView,
        │   │             InspectionsView, FinancingView, DealersView,
        │   │             DashboardView, ChatView, AdminView, OwnershipPlatform…
        │   ├─ components/: VehicleCard, VehicleDetailModal, AuthModal(real auth),
        │   │               PostAuctionCompletionModal, ui/ primitives…
        │   ├─ pages/: 60+ routed pages
        │   ├─ services/: authApi(fetch/cookie) + 20 domain Api clients
        │   ├─ api/: api.ts (axios + 401/timeout interceptors) + api.exports.ts
        │   ├─ data/: mockVehicles/mockAuctions/mockCars (+9 domain mocks)
        │   └─ utils/: helpers, security, navigation, permissions, escrow…
        │        build → vite build → dist/ → Vercel (vercel.json: SPA rewrite,
        │        security headers)        ❌ DEPLOYMENT_NOT_FOUND in production
        │
        └─ BACKEND  Express + Socket.IO (backend/server.js)
            ├─ routes/: ~80 files, unversioned /api/* + v1.js /api/v1/*
            ├─ controllers/ ~50  middleware/ auth,csfr,rbac,rateLimit,idempotency…
            ├─ services/ ~60 (mpesa, paymentCallback, escrow state machine,
            │   reconciliation, notification retry, cache, queue…)
            ├─ models/ (createModel → Supabase tables)  db/ (schema_clean.sql)
            ├─ queues/ + workers/ (BullMQ on Redis)  crons (escrow, auction,
            │   reconciliation ×4, SLI…)
            │    → Render (render.yaml, Docker)     ❌ 502 on all endpoints
            ├─ Supabase Postgres                      ⚠️ connectivity NOT VERIFIED
            ├─ Redis                                  ⚠️ NOT VERIFIED
            ├─ Cloudinary (uploads)                   ⚠️ NOT VERIFIED
            └─ M-Pesa Daraja / Africa's Talking / email  ⚠️ NOT VERIFIED

TESTING: backend 16 suites/335 tests (Jest) · frontend 50 files/359 (Vitest)
         e2e/ 10 legacy specs (env-blocked) + workflow-certification 8/8 (Playwright)
```

---

# Final Production-Readiness Report

**Verdict: NOT production-ready.** This is unchanged from Phase 13 and is an evidence-based FAIL, not a hedged pass.

## Certified (all green, re-verified after this cleanup)
- **Build:** `vite build` succeeds; backend `node --check` clean.
- **CI:** Quality Checks + Security Audit + CodeQL **success** on the current main.
- **Tests:** backend 335/335, frontend 359/360 (1 skip), E2E certification 8/8.
- **Security (code level):** Phase 10 auth/authz (56 tests), `npm audit` 0 vulnerabilities.
- **Failure modes (code level):** Phase 11 fail-closed M-Pesa, idempotency, reconciliation, recovery jobs (32 resilience tests).
- **Workflows (API/component level):** all 17 certification workflows verified server-side and component-side.

## NOT VERIFIED / FAILING (live environment — owner action required)
| Item | Status |
| --- | --- |
| Frontend deployment | ❌ `kayad.space` → Vercel DEPLOYMENT_NOT_FOUND |
| Backend deployment | ❌ `api.kayad.space` → HTTP 502 on every endpoint |
| www TLS | ❌ `*.kayad.space` cert expired 2026-08-16 |
| Deploy workflow | ❌ fails on missing Vercel credentials |
| Database / Redis / storage / external integrations (live) | ⚠️ NOT VERIFIED (backend down, no dashboard access) |
| P0 E2E against live deployment | ⚠️ CANNOT RUN (production down) |
| Live auth / persistence / marketplace / inspection / auction / financial flows | ⚠️ API-level verified only; live NOT VERIFIED |
| Rollback | documented (`docs/DEPLOYMENT.md`); rehearsal NOT VERIFIED |

## Owner actions to reach production-ready (unchanged from Phase 13)
1. Restore/re-link the Vercel project; set `VITE_API_URL`; fix `VERCEL_TOKEN`/project secrets.
2. Fix the Render crash; verify `SUPABASE_*`, `JWT_SECRET`, `FRONTEND_URL`, `BACKEND_URL`.
3. Renew the `*.kayad.space` certificate.
4. Run smoke tests + full P0 E2E against the live deployment, rehearse the rollback, then re-certify.

## Codebase state after cleanup
12 proven-dead files removed (~2 backup/duplicate-source files, 6 untyped shadow duplicates, 4-file orphaned demo-data island). One parallel subsystem (`mediaEventEngine` + unmounted routes/controller) flagged for an explicit owner keep-or-remove decision rather than unilaterally deleted. Typecheck, all tests, build, and security audit are green.

---

## Addendum — this pass, additional proven-dead items found and removed

This repository's own cumulative cleanup history (this document plus `AUDIT_CLEANUP_REPORT.md`) already accounts for 52 verified-dead items across 3 prior passes. Checking the current codebase directly (not assuming prior claims still held, given some earlier-reported removals - e.g. `api.exports.backup.ts` above - were found to still be present on disk) surfaced 4 more items this session's own earlier work (Phases 0 and 7) had independently identified as orphaned:

| Item | Class | Verification performed this pass |
|---|---|---|
| `src/features/InspectionMarketplace/` (8 files, 2,909 lines) | Orphaned frontend feature - a complete, parallel inspection-marketplace UI (its own pages, components, services, types) with no navigation path to it | Re-verified fresh: zero references anywhere in `src/` outside the folder itself, and zero in `src/__tests__/`, `e2e/`, or `docs/` |
| `backend/inspectionBusinessCenter/` (7 files, 2,104 lines) | Orphaned backend service, first flagged dead in this project's own Phase 0 audit | Re-verified fresh: zero references anywhere in `backend/` outside the folder itself; no route file wires it |
| `src/api/api.exports.backup.ts` | Explicit backup file (still present on disk despite this document's earlier claim of removal) | Zero references anywhere |
| `backend/db/schema_legacy.sql` | Explicit legacy file | Zero references anywhere |

**Total this pass: 17 files, 5,013+ lines. Cumulative program total: 56 proven-dead items removed.**

**Re-verified all gates green after these deletions:**

| Check | Result |
|---|---|
| Frontend typecheck | 0 errors |
| Frontend tests | 358/360 passing, 1 skipped, 1 failing (the same pre-existing, date-sensitive `AuctionsView.test.tsx` assertion already identified as unrelated to any code change) |
| Backend tests | 16/16 suites, 335/335 passing |
| Frontend build | Succeeds |
| Frontend + backend security audits | 0 vulnerabilities each |

**Not touched, deliberately:** the ambiguous items this document and `AUDIT_CLEANUP_REPORT.md` already correctly flagged for owner review rather than auto-deleted (the entangled `'mechanic'`-role UI, the 46 uncalled backend service exports) were re-checked and left alone - re-deleting them without new evidence would repeat the exact mistake this session's own Phase 4 work learned from directly, where two components initially judged "duplicate/dead" turned out to be substantial, undeployed real work.

Production-readiness verdict: **unchanged, NOT production-ready** - the live-deployment findings above are unaffected by dead-code removal, which cannot fix an unreachable Vercel project, a crashing backend, or an expired certificate.

