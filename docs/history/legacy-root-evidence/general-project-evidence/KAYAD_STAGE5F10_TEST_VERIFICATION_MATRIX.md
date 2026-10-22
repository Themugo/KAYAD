# KAYAD Stage 5F.10 — Test verification matrix

Evidence tiers: **S** source/static · **M** mocked unit/integration (jest/vitest) · **P** real disposable PostgreSQL 16 · **H** real disposable stack over HTTP (Express → PostgREST → PostgreSQL) · **B** headless Chromium on the real disposable stack · **N** not run. Every number below is from the final run on the final tree (`validation-logs/final/`). Nothing was run against a hosted system.

## Whole-suite results

| Suite | Command | Exit | Passed | Failed | Skipped |
|---|---|---:|---:|---:|---:|
| TypeScript | `npm run typecheck` (= `tsc --noEmit`; this is also the project's lint) | 0 | clean | 0 | — |
| Production build | `npm run build` | 0 | 2,400 modules | 0 | — |
| Frontend (M) | `npx vitest run` | 0 | 716 (93 files) | 0 | 1 (pre-existing, same as baseline) |
| Backend jest (M) | `npm run test:jest` | 0 | 2,460 (148 suites) | 0 | 0 |
| Backend vitest (M) | `npm run test:vitest` | 0 | 36 (6 files) | 0 | 0 |
| Backend node:test | `npm run test:node` | 0 | 1 | 0 | 0 |
| Validators (S) | supabase-migrations, foundation-integrity, owner-identity-convergence, master-identity-authz-corrections, stage5f2, stage5f6, stage5f7, 5f5-seller, 5f8, 5f9, **stage5f10** | 0 | all | 0 | — |
| Migration replay (P) | 183 migrations on an empty disposable DB | 0 | 183 | 0 | — |
| 5F.10 gate (P) | `npm run test:pg:stage5f10` | 0 | **227** | 0 | 0 |
| 5F.10 HTTP (H) | `npm run test:http:stage5f10` | 0 | **46** | 0 | 0 |
| 5F.10 UI (B) | `npm run test:ui:stage5f10` | 0 | **23** | 0 | 0 |
| 5F.5 admin API on merged tree (H) | `role_api_5f5` | 0 | **88** | 0 | 0 |
| 5F.5 admin UI on merged tree (B) | `ui_5f5_admin` | 0 | **27** | 0 | 0 |

Baseline → final: frontend 707 → 716 passed; backend jest 2,441 passed with **2 failing suites** → 2,460 passed with **0**.

## Requirement → evidence

| Requirement | Tier | Evidence |
|---|:-:|---|
| Phase 0 inputs verified (SHA-256) | S | `KAYAD_STAGE5F10_INPUT_VERIFICATION.md` |
| Phase 1: 5F.5 governance merged, D-1…D-17 behaviour intact, OD-1…OD-7 still open | M, H, B | zero overlapping files; 7 `stage5f5*` jest suites; `permissionsParity`, `adminCommandCentre`; role_api_5f5 88/88; ui_5f5_admin 27/27 |
| Seller classification fail-closed | P | harness A (7 checks) |
| Payment only from the canonical verified record; browser redirect never counts | P, H, B | PG D (payment disqualifiers); HTTP H17/H18; UI U2.3/U3.2 |
| New evidence version invalidates older approval | P, H | PG F/I17–I18; HTTP H46 |
| Failed / inconclusive verification blocks auction; correction, reinspection and appeal paths; overturned appeal does not restore eligibility | P, M, B | PG F; vitest `auctionVerificationSection` |
| Booking is single-use (no re-inspection bypass) | P | PG F23 |
| Custody mandatory; VIN/registration mismatch is a hold | P, H | PG D/E; HTTP H28/H29 |
| Only approved garages/dealers with active capability hold vehicles; inspect-only partner cannot; escrow ≠ custody | P, H | PG D/E/G; HTTP H20–H24 |
| Admin approval separate from inspection and custody; self-review/self-approval forbidden | P, H | PG E; HTTP H22, H33 |
| Gate inside PostgreSQL in the same transaction — manual bid, auto-bid, admin start, scheduled start, settlement, publication, direct row writes | P | PG B (12), H (8), mutation check |
| Race: bid vs hold / capability suspension / verification invalidation, both orders; equal simultaneous bids; duplicate submissions | P | PG I1–I18 |
| Public list/active/scheduled/detail/room/marketplace/sitemap/lead hide an ineligible auction | H, M | HTTP H35–H41; jest `privateSellerEligibilityService` |
| Bid refused (409) before any payment is initiated; no bid row/payment created | H, S | HTTP H42/H43; wiring validator |
| Buyer cannot bid unless the backend permits; refusal reason shown honestly | M | vitest, jest |
| Gate unreachable ⇒ fail closed (503), never "eligible" | M | jest (7 checks) |
| Idempotent and auditable transitions; append-only audit | P, H | PG G, J; HTTP H8 |
| Least-privilege RLS; service-role-only RPCs | P | PG G (RLS cross-seller, anon/authenticated denied) |
| Rollback non-destructive, tested on disposable DB only; migration re-appliable | P | PG J1–J9 |
| Seller/Admin UI: honest states, desktop/tablet/phone, no horizontal scroll, ≥28px targets, axe WCAG2A/AA, keyboard | B | UI U1–U5, A1–A4 |
| Authorization from the browser: plain user gets no admin console; every API role boundary | H, B | HTTP H3–H6, H10–H11, H20, H22, H25, H33; UI A4.1 |

## Not run / not claimed

| Item | Status |
|---|---|
| Hosted Supabase, Render, Vercel | **N** — forbidden by the brief; nothing contacted |
| Live M-Pesa callbacks, SMS, e-mail | **N** — payment is proven through the database's own payment-processing function, not a provider |
| Real devices, screen readers, Safari/Firefox | **N** |
| Load/performance of the gate under production data volume | **N** — the gate is O(1) per vehicle; the batch helper is a loop (L-4) |
| Cross-version upgrade of a database that already holds 5F.8 rows | **N** (rehearsed only with empty and synthetic data) |

## Mutation evidence
Removing the proposal/capability `FOR SHARE` locks from the RPCs alone still passes (the `cars` backstop trigger takes the same lock — defence in depth). Removing the RPC locks **and** the trigger lock produces 11 failures (B6, B9, I1, I4–I9, I12, I13), so the concurrency checks are not vacuous.
