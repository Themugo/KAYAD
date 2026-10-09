# Support — Test Matrix
| Layer | Suite | Result |
|---|---|---|
| Backend Jest | `tests/support/supportCase.test.js` — projection leak guards, ownership/404 parity, reference ownership, idempotent create + notification dedupe, actor-kind forcing, internal-note silence, validation, rating bounds, staff update validation, transition table, DB-error mapping, `requireSupportStaff` for 13 roles | 41/41 |
| Backend full | Jest 63 suites / 978 · Vitest 16 · node:test 1 | all pass (baseline 62 / 937) |
| SQL behaviour | `evidence/support/support_hardening_proof.sql` P1–P21 on migration-built PG16 (+ migration applied twice) | all expected outcomes |
| Frontend unit | `supportView.test.tsx` (8), `adminSupportWorkspace.test.tsx` (5) + existing FAQ claims | 20/20 |
| Frontend full | vitest 68 files / 520 pass / 1 skipped / 0 fail (baseline 505 pass / **3 fail**) | pass |
| Types / build | `tsc --noEmit` 0 · `vite build` 0 | pass |
| Browser (mocked HTTP) | `e2e/support-journey/support_journey.cjs`, desktop 1440 + mobile 375, guest/customer/staff/marketing | 51/51 |
| Validators | 3 support validators rewritten (12/12, PASS, 11/11); `validate-release`, `validate-wave3` PASS (OpenAPI 0 undocumented) | 10 failing = same 10 as baseline |
| Revert proof | remove internal-note filter → 1 failing test; restore → 41/41 | recorded |

## Negative cases covered
Other customer's case (404) · forged `isInternal` · forged role `admin`/`dealer` · client priority/status/assignee/SLA · attachments · bad category/reference/key · rating 0/6/2.5/null · double rating · rating before resolve · resolve without note · illegal transition · stale version · marketing/hr/etc. staff · closed reply · expired reopen window · direct PostgREST EXECUTE/SELECT/INSERT/UPDATE · duplicate submit/retry.

## Not covered by automation
Concurrent appends under real PostgREST load (row lock `FOR UPDATE` proven structurally, not under contention) · real email/in-app delivery · Supabase-hosted grants/RLS (BLOCKED, see Runtime Certification).

# Combined support + identity matrix — integration gate (actual runs on the integrated tree, 2026-10-09)
Node 22.22.0 (repo requires ≥22.22.2 for two release validators; install used `--engine-strict=false`).

| Layer | Command | Result |
|---|---|---|
| Backend Jest | `node --experimental-vm-modules jest --forceExit` | **64 suites, 1013 passed**, 0 failed, 0 skipped (support file: 61) |
| Backend Vitest / node:test | `vitest run`, `node --test` | 16/16 · 1/1 |
| Frontend | `vitest run` | **72 files, 564 passed, 1 skipped**, 0 failed (includes identity registration/login/onboarding suites and support suites) |
| Types / build | `tsc --noEmit` · `vite build` | rc 0 · rc 0 |
| Support validators | case-management 19/19, user-surface PASS, communications-support 11/11 | pass |
| All 174 `validate-*.mjs` | looped, 60 s cap | 10 fail — **identical set on the unmodified identity foundation** (checked in a clean worktree): communication-event-convergence, communications-provider-certification (credentials), escrow-custody-domain, home-hero-premium, lead-crm-domain-end-to-end, live-runtime (no Supabase env), local-supabase, phase6-release + v14-runtime-preflight (Node 22.22.0 < 22.22.2), production-host-contract. None introduced by support. |
| SQL | legacy-data migration ×2, grants, P1–P21 | pass (local PG16) |
| Browser, mocked HTTP | support 56/56 (new: oversight reason/read-only), inspection 66/66, automotive 71/71 | 193/193 |

Historical figures (978 / 520 / 51) are superseded. Earlier merge, before reconciliation: 993 backend, 562 frontend.
Revert proof for the capability gate: `requireSupportAgent` is asserted by 3 independent tests (unit, route-source validator, browser journey).

**Not run:** Supabase staging RLS, real e-mail/in-app delivery, live-backend browser journeys, load/concurrency, deployed environment.

## Support integration verdict: **PARTIAL**
Source integration, migration data-safety (local), authorization and identity regression are verified; no unresolved critical/high source defect. PARTIAL because Supabase staging RLS, provider delivery and live-runtime evidence are environment-blocked, and the 10 inherited validator failures remain (pre-existing, outside support).

## Final integrated tree after Gate 4 (marketplace/auction changes included) — supersedes the counts above
| Layer | Result |
|---|---|
| Backend Jest | **66 suites, 1022 passed**, 0 failed, 0 skipped (+9 auction tests) |
| Backend Vitest / node:test | 16/16 · 1/1 |
| Frontend Vitest | **73 files, 567 passed, 1 skipped**, 0 failed (+3 auction load-failure tests) |
| `tsc --noEmit` / `vite build` | rc 0 / rc 0 |
| Validators (174) | same 10 inherited failures as the unmodified identity foundation; `validate-auction-bid-surface` 6/6 (an interim string-contract failure caused by my refactor was fixed in the source, not by editing the validator) |
| Browser journeys (mocked HTTP, local dev server) | support 56/56 · inspection 66/66 · automotive 71/71 · auction partial-failure 14/14 = **207/207** |
| Not run | Supabase staging RLS, live-backend journeys, deployed environment, provider delivery, load |
