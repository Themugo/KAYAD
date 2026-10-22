# Support Test Matrix Difference Report

## Files and hashes

- Root: `KAYAD_SUPPORT_TEST_MATRIX.md` — 2054 bytes — SHA-256 `95da2372703c497a74c6da9549bcd4ce2da307b2ff7cb61a88b05173bec5f714`
- Documentation copy: `docs/domains/KAYAD_SUPPORT_TEST_MATRIX.md` — 5207 bytes — SHA-256 `3c56218e75d17618a5885e04920cd7e3fa961b459e6f140e291634450564b1ff`
- Byte-identical: **No**

## Content comparison

The root copy contains these Markdown headings: # Support — Test Matrix, ## Negative cases covered, ## Not covered by automation

The `docs/domains/` copy contains these Markdown headings: # Support — Test Matrix, ## Negative cases covered, ## Not covered by automation, # Combined support + identity matrix — integration gate (actual runs on the integrated tree, 2026-10-09), ## Support integration verdict: **PARTIAL**, ## Final integrated tree after Gate 4 (marketplace/auction changes included) — supersedes the counts above

Headings present only in root copy: (none)

Headings present only in docs copy: # Combined support + identity matrix — integration gate (actual runs on the integrated tree, 2026-10-09), ## Support integration verdict: **PARTIAL**, ## Final integrated tree after Gate 4 (marketplace/auction changes included) — supersedes the counts above

The docs copy contains an additional integrated support + identity matrix section and detailed test-run claims dated 2026-10-09, including counts for backend, frontend, validators, SQL and mocked-browser journeys. The root copy is shorter and ends after its narrower support-specific test coverage notes. These are not safely interchangeable copies. Historical test claims in either file have not been independently rerun by Phase 9.

## Authority and references

The supplied archive does not provide sufficient candidate-specific owner approval or provenance evidence to declare either copy authoritative for replacement or consolidation. Exact-name references were found in the text scan; see the consumer classification CSV for file/line contexts. Because these references include historical/documentary mentions, their presence does not alone prove operational consumption.

## Decision

`BLOCKED_REFERENCE_INTEGRITY` — preserve both files byte-for-byte. Do not merge, overwrite, rename, or move either during Phase 9. Request an explicit owner decision identifying whether these are distinct snapshots, which file is maintained, and what retention policy applies.

## Diff excerpt

```diff
--- KAYAD_SUPPORT_TEST_MATRIX.md
+++ docs/domains/KAYAD_SUPPORT_TEST_MATRIX.md
@@ -16,3 +16,36 @@
 
 ## Not covered by automation
 Concurrent appends under real PostgREST load (row lock `FOR UPDATE` proven structurally, not under contention) · real email/in-app delivery · Supabase-hosted grants/RLS (BLOCKED, see Runtime Certification).
+
+# Combined support + identity matrix — integration gate (actual runs on the integrated tree, 2026-10-09)
+Node 22.22.0 (repo requires ≥22.22.2 for two release validators; install used `--engine-strict=false`).
+
+| Layer | Command | Result |
+|---|---|---|
+| Backend Jest | `node --experimental-vm-modules jest --forceExit` | **64 suites, 1013 passed**, 0 failed, 0 skipped (support file: 61) |
+| Backend Vitest / node:test | `vitest run`, `node --test` | 16/16 · 1/1 |
+| Frontend | `vitest run` | **72 files, 564 passed, 1 skipped**, 0 failed (includes identity registration/login/onboarding suites and support suites) |
+| Types / build | `tsc --noEmit` · `vite build` | rc 0 · rc 0 |
+| Support validators | case-management 19/19, user-surface PASS, communications-support 11/11 | pass |
+| All 174 `validate-*.mjs` | looped, 60 s cap | 10 fail — **identical set on the unmodified identity foundation** (checked in a clean worktree): communication-event-convergence, communications-provider-certification (credentials), escrow-custody-domain, home-hero-premium, lead-crm-domain-end-to-end, live-runtime (no Supabase env), local-supabase, phase6-release + v14-runtime-preflight (Node 22.22.0 < 22.22.2), production-host-contract. None introduced by support. |
+| SQL | legacy-data migration ×2, grants, P1–P21 | pass (local PG16) |
+| Browser, mocked HTTP | support 56/56 (new: oversight reason/read-only), inspection 66/66, automotive 71/71 | 193/193 |
+
+Historical figures (978 / 520 / 51) are superseded. Earlier merge, before reconciliation: 993 backend, 562 frontend.
+Revert proof for the capability gate: `requireSupportAgent` is asserted by 3 independent tests (unit, route-source validator, browser journey).
+
+**Not run:** Supabase staging RLS, real e-mail/in-app delivery, live-backend browser journeys, load/concurrency, deployed environment.
+
+## Support integration verdict: **PARTIAL**
+Source integration, migration data-safety (local), authorization and identity regression are verified; no unresolved critical/high source defect. PARTIAL because Supabase staging RLS, provider delivery and live-runtime evidence are environment-blocked, and the 10 inherited validator failures remain (pre-existing, outside support).
+
+## Final integrated tree after Gate 4 (marketplace/auction changes included) — supersedes the counts above
+| Layer | Result |
+|---|---|
+| Backend Jest | **66 suites, 1022 passed**, 0 failed, 0 skipped (+9 auction tests) |
+| Backend Vitest / node:test | 16/16 · 1/1 |
+| Frontend Vitest | **73 files, 567 passed, 1 skipped**, 0 failed (+3 auction load-failure tests) |
+| `tsc --noEmit` / `vite build` | rc 0 / rc 0 |
+| Validators (174) | same 10 inherited failures as the unmodified identity foundation; `validate-auction-bid-surface` 6/6 (an interim string-contract failure caused by my refactor was fixed in the source, not by editing the validator) |
+| Browser journeys (mocked HTTP, local dev server) | support 56/56 · inspection 66/66 · automotive 71/71 · auction partial-failure 14/14 = **207/207** |
+| Not run | Supabase staging RLS, live-backend journeys, deployed environment, provider delivery, load |
```
