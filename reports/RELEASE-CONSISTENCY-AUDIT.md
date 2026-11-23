# Release-consistency audit (Phase 1–2 acceptance review)
2026-11-22 · tree: origin/main `bfe3735` + uncommitted release-consistency changes · all results below were executed on this tree unless marked otherwise. Nothing was committed, pushed, merged or deployed; no DNS/CDN/hosted configuration was touched.

## 1. Why friends could see an old version — findings
| Cause | Status | Evidence |
|---|---|---|
| Old `public/sw.js` served stale HTML/deep links (returning visitors' `/dealer` stayed on the old release 6/6) | **VERIFIED defect, fixed in code** (not deployed) | `SERVICE-WORKER-REHEARSAL.md` §2 |
| Deploy verifier never asserted the commit or the custom domain | **VERIFIED gap, fixed in code**, mock-proved | §2 below |
| Production not on the latest `main` commit (failed/skipped deploy, wrong project) | **UNVERIFIED — BLOCKED**: sandbox cannot reach `kayad.space`; GitHub Actions status not readable (403) | owner evidence E1 |
| `kayad.space`/`www` pointing at a different Vercel project or old deployment; DNS/CDN | **UNVERIFIED — BLOCKED** | owner evidence E2–E3 |
| Devices holding a legacy worker | handled by new worker once deployed (one-time swap; stall caveat) | rehearsal §1 |

## 2. Post-deployment verifier (`scripts/verify-production-deployment.mjs`)
Tested with isolated loopback mock servers: `node --test ci/verifier-mock-tests.mjs` → **15/15 pass** (real run on this tree).
| Requirement | Result |
|---|---|
| Receives intended commit | `EXPECTED_COMMIT` (workflow passes `${{ github.sha }}`), falls back to `GITHUB_SHA`; test 14 |
| Checks deployed release identity | `/release.json` of the deployment URL compared with the commit |
| Checks public custom-domain identity | `checkPublicDomainMatchesDeployment`: commit **and** releaseId must equal the deployment's; retries for propagation (test 4) |
| Public domain serves older release | FAIL (tests 2, 3) |
| `release.json` is HTML / invalid JSON / wrong content-type | FAIL (tests 5–7) |
| No usable commit on either side (two empty identities are not "equal"), commit `unknown` | FAIL (tests 8, 9) |
| Wrong commit | FAIL (test 10) |
| Network error / hang | FAIL without crashing, bounded by a timeout (tests 11, 12) |
| Success reported when verification was skipped | **Cannot happen**: in CI (or `REQUIRE_RELEASE_IDENTITY`) a missing expected commit fails (test 13); no deployment URL fails (test 15) |
| Diagnostics | each failure names the check, the HTTP status and/or content-type ("an SPA fallback was served instead of release.json"), and the expected vs. observed commit/releaseId |

**Workflow lifecycle** (`.github/workflows/deploy.yml`, reviewed): trigger push to `main` → `validate` job (validators, build, `Validate dist output`, new `Verify dist integrity`) → `smoke-test` → `deploy-vercel`: link, pull, `vercel build --prod`, `vercel deploy --prebuilt --prod` (captures URL) → **`Verify deployed production` runs after the deploy with `DEPLOYMENT_URL` and `EXPECTED_COMMIT`**. The release commit is stamped into the build from `VERCEL_GIT_COMMIT_SHA`/`GITHUB_SHA` (`vite.config.ts` line 8); `vercel build` runs on the GitHub runner, so `GITHUB_SHA` is present. **Not executed in real CI** (no Actions access, no production deploy for testing): the first real run is the first end-to-end proof. Limitation: the verifier checks what the public domain serves *to the runner*; it cannot see other regions/devices.

## 3. Critical-file review (effects on auth, dealer navigation, payments, forms, PWA, offline)
| File | Review result |
|---|---|
| `public/sw.js` | Never intercepts `/api/` (auth, payments, CSRF), `/uploads/`, `/sw.js`, `*.json`, manifests → auth/payment calls always hit the network (login/registration scenarios pass). Navigations network-first (dealer routes always current); shell cached only as offline fallback; hashed assets cache-first; HTML never cached as an asset; activation deletes only non-owned caches; no `clients.claim()`; `skipWaiting` on install; push/notification handlers kept. Risk: the one-time legacy-worker replacement stall (see rehearsal §1). Not re-verified: push notifications on devices. |
| `vercel.json` | `/` and `/index.html` and manifest revalidate; `/assets/*` immutable; `/sw.js`, `/release.json` no-store; icons/branding/hero 1 h + SWR. No CSP/auth header touched. Valid JSON; `validate:vercel-ci` PASS. Hosted effect unverified. |
| `vite.config.ts` release identity | Emits `release.json`, meta tag, `__KAYAD_RELEASE_ID__`; `verify:dist` checks consistency; `sw.js` deliberately not stamped. |
| `releaseWatcher.ts` / `ReleaseUpdateBanner.tsx` | Banner only; never auto-reloads; stale-chunk recovery reloads once, skips when the user edited an input, no loop inside 60 s → forms keep input (scenarios 8, 9). |
| `verify-dist-integrity.mjs` | Checks meta vs release.json, referenced assets exist, chunk imports resolve, hashed names, no sw placeholder. PASS on this build. |
| Installed PWAs | manifest unchanged; worker replaces silently. Real installed-app behaviour NOT tested (device evidence needed). |
| Offline | cached shell fallback works (scenario 10); first offline visit with nothing cached fails honestly. |
| Tests | `serviceWorker.test.ts` updated to the `event.waitUntil` handlers and a stuck-cache-read test added; `validate-pwa-mobile-contract.mjs` updated (it asserted the retired cache names). No critical regression found. |

## 4. Gates run on this exact tree
SW+release unit 18/18 · verifier mock 15/15 · `tsc --noEmit` clean · `npm run build` OK · `verify:dist` OK · `npx vitest run` 226 files, 1897 passed, 1 skipped · validators (deployment-readiness, production-verifier-contract, vercel-ci, frontend-runtime-contracts, pwa-mobile, deployment-runtime-drift, private-upload-cache, code-splitting, phase39-deployment-security) PASS · browser `scenarios.mjs` 15/15, `scenarios-auth.mjs` 8/8 · stall matrices as reported. The full set of ~150 other `validate:*` scripts and the backend suites were **not** re-run (unchanged by this work; they are historical context only).

## 5. Acceptance decision
Criteria: (1) all 18 scenarios accounted — **yes** (17 executed; #14 partial); (2) stall diagnosed and assessed — **yes** (browser race, reproduced with the original worker); (3) full traces captured — **yes**; (4) verifier positive/negative — **yes**; (5) production verification procedure ready — **yes** (`12`); (6) no critical regression — **none found**.
**Phase 2 is accepted as code-complete and locally verified, but it is NOT release-verified.** Deployment and independent-device confirmation remain open (blockers below). The dealer command centre has not been started; it waits for explicit owner approval.

## 6. Remaining blockers and the evidence that closes each
| ID | Blocker | Evidence needed |
|---|---|---|
| B1 | Which commit Production serves; was the last `Deploy to Production` on `main` successful | Screenshot/text of Vercel → Deployments (Production row: commit SHA, status, domains) and the GitHub Actions run result |
| B2 | Custom domain parity (`kayad.space`, `www`) with that deployment | Output of `12` Steps 1–2 from an unrestricted machine |
| B3 | Delta not on `main`, so none of the fixes are live | Owner review and merge of the delta (owner decision; merging deploys) |
| B4 | First real CI run of the new verifier step | Green/red `Verify deployed production` log after the merge |
| B5 | Devices (phones, friends' networks, installed PWA, Safari/Firefox/Android) see the same release and the one-time worker swap is benign | `12` Step 3 table filled from ≥3 independent devices before and after the deploy |
| B6 | Old-worker swap stall frequency on real browsers | Same table plus a note of any page that failed to load once after first visit |
| B7 | Hosted DB divergence, dealer financial metrics, team-invitation real-browser journey, accessibility audit | Separate phases, not started |
