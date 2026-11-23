# Service-worker release rehearsal — authoritative scenario checklist
Updated 2026-11-22 on the working tree based on origin/main `bfe3735` (uncommitted). Everything here is **local, headless Chromium (Playwright), no production access**. "PASS" means executed with evidence, not "works for every user".

Harnesses (all in `ci/`): `browser/release-switch.mjs` (10-check A→B rehearsal), `browser/sw-diagnose.mjs` (flip A/B stress), `browser/sw-forward.mjs` (single forward deploy, repeated), `browser/scenarios.mjs` (scenarios 5, 9–11, 13–15, 17, 18), `browser/scenarios-auth.mjs` (6, 7; needs the disposable DB stack). The local host mimics Vercel: `/assets/*` immutable and a real 404 for missing assets, `release.json`/`sw.js` no-store, SPA fallback.

## 1. The intermittent upgrade stall — diagnosis
**Symptom.** One navigation (`page.goto`) after a service-worker *replacement* never commits (12 s watchdog; the request reaches the server; no page error, no failed request). The next navigation succeeds. No longer timeouts were used to hide it; the 12 s limit is a detector.

**Frequency (real counts, 30 runs each unless stated; stall = one navigation hung):**
| Variant | Stalls |
|---|---|
| Control: no service worker at all | 0/20 |
| New worker → new worker (every future deploy; flip harness 0/20, forward-only 0/30) | **0/50** |
| Legacy worker → same legacy worker, no update | 0/20 |
| **Forward-only single deploy**, legacy → current, host switched 800 ms after load | 1/30 |
| same, 100 ms | 8/30 |
| same, 0 ms | 5/30 |
| **Original worker → trivially changed copy of itself** (forward-only, 12 runs) | **4/12** |
| Flip harness (A→B→A→B, i.e. rollback-like), legacy → current | 6/20, 10/30, 7/30 |
| Flip, no `skipWaiting` | 9/30 |
| Flip, navigation pass-through (worker never handles navigations) | 2/30 |
| Per-release stamped `sw.js` (removed for this reason) | ≈50% |

**Evidence per stalled run** (`reports/evidence/sw-diagnose/*.json`, `*-stall.png`, Playwright traces `*.trace.zip` kept locally): navigation timeline, worker lifecycle states and controller flag, cache names/entry counts, release ids, last server requests. In every stall the old worker goes *stopped/redundant* a few ms after the navigation is dispatched to it while the new worker activates (~1 s); the request is seen by the server; the document is never committed.

**Classification.** An **existing Chromium service-worker replacement race**, not an application, server or automation defect:
- reproduced by the **original** worker replaced by a one-byte-different copy of itself (4/12) — no code of this change involved;
- never occurs without a worker replacement (control 0/20, new→new 0/50, legacy→legacy 0/20);
- not caused by app navigation, auth, third-party blocking or the sandbox (stalled URL varies: `/`, `/dealer`; the page never reaches app code);
- hypotheses tested and **rejected as the fix**: blocking cache awaits (kept as robustness: reads are time-bounded, writes in `waitUntil`; stalls unchanged), removing `clients.claim()` (no effect), removing `skipWaiting` (not better: 9/30), navigation pass-through (reduces to 2/30 on the flip harness but loses the offline shell and does not eliminate it).

**Impact assessment.** Affects only a device that already has an *old* worker registered, once, at the moment that worker is replaced (and only if a navigation is dispatched in the first second or so). The user sees one page that does not finish loading; a reload loads release B. The new worker never produces this on later deploys (0/50). The app itself no longer registers any worker, so the population is limited to browsers that registered one earlier. Real-device frequency is **unknown** (headless Chromium only; Safari/Firefox/Android untested).
**Decision for the owner:** keep the current worker (it is what removes the stale-page defect, see §2). Residual risk accepted for the one-time swap; cannot be closed without real-device data.

## 2. Defect that the new worker fixes (verified)
The original worker, with no update, keeps a returning visitor's deep link `/dealer` on the **old release in 6/6 runs**; the new worker serves the new release on every non-stalled run (10/10 checks). This matches "friends still see the old version".

## 3. The 18 required scenarios
| # | Scenario | Status | Evidence / count |
|---|---|---|---|
| 1 | Old worker → new deployment | PASS with stall caveat | legacy→current forward: 29/30, 22/30, 25/30 navigations complete; non-stalled runs 10/10 checks |
| 2 | New worker activation | PASS with stall caveat | as 1; new→new 0/50 stalls |
| 3 | New worker → new release | PASS | 11/11 complete runs + new→new 50 runs |
| 4 | Direct `/dealer` navigation | PASS new worker; FAIL (stale) original worker | 10/10 check; original 6/6 stale |
| 5 | Direct vehicle-detail URL | PASS | `scenarios.mjs`: release B served, no page errors |
| 6 | Login during update | PASS | `scenarios-auth.mjs`: UI login before deploy, session survives, UI login right after deploy with old worker controlling (disposable API, example.test) |
| 7 | Registration + e-mail verification | PASS | register 201, verification mail captured by loopback stub, link opened after deploy → "Email verified" on release B |
| 8 | Open form during update | PASS | typed text preserved, banner shown, no auto reload |
| 9 | Multiple tabs | PASS | tab 1 lands on B; tab 2 keeps its typed input on A, banner shown, not reloaded behind the user |
| 10 | Offline → online | PASS | offline: cached shell renders; online: live release B |
| 11 | Interrupted asset download | PASS | aborted chunk not stored in any cache; retry loads |
| 12 | Failed release endpoint | PASS (unit) | HTML/500/offline never counted as a new release (`releaseWatcher.test.tsx`) |
| 13 | Browser restart after update | PASS | persistent profile, relaunch shows B |
| 14 | Installed PWA | PARTIAL | manifest standalone/start_url/scope/icons verified; **an actual installed PWA on a phone cannot be tested headless** → owner/device evidence |
| 15 | Slow network | PASS | 700 ms added to every request: navigation after deploy completes on B (≈1.5 s) |
| 16 | Blocked external font/image | PASS (incidental) | sandbox refuses external hosts in every run; no failures |
| 17 | Old cached HTML | PASS | cached A shell/assets do not prevent B |
| 18 | Partially cached assets | PASS | half of asset cache deleted: page loads and refills; HTML-as-asset never cached (unit) |

Scenarios 1–2 are the only ones with a residual caveat (§1). Scenario 14 needs real-device evidence.

## 4. Re-run on this exact tree (2026-11-22)
Service-worker + release unit tests 18/18; verifier mock tests 15/15; typecheck clean; production build OK; `verify:dist` OK; full frontend suite 226 files / 1897 passed (1 skipped); validators deployment-readiness, production-verifier-contract, vercel-ci, frontend-runtime-contracts, pwa-mobile (13/13 after updating its stale cache-name checks), deployment-runtime-drift, private-upload-cache, code-splitting, phase39-deployment-security all PASS. Browser: `scenarios.mjs` 15/15, `scenarios-auth.mjs` 8/8.
