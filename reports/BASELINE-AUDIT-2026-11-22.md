# Baseline audit and change-reconciliation matrix (2026-11-22)

## Repository state (verified by `git fetch` + inspection)
| Item | Value |
|---|---|
| `origin/main` | `bfe3735` "Feature/final platform completion (#265)" |
| Merged on main | #261, #262, #263 (mobile experience), #264, #265 |
| Old branch `feature/final-platform-completion` | not used, not revived; `origin/ckfs` also exists (untouched) |
| Working base for this phase | `/home/claude/p8`, local branch `work/release-consistency-and-command-centre` from `bfe3735` (no commit, no push) |
| Release-consistency delta on main? | **No.** Main still has the original `public/sw.js`. The delta (patch sha256 `503829f0…`) was applied exactly once, as uncommitted working-tree changes in p8; `git apply --check` passed first |
| Local migrations | 210 files, newest `20261122120000_listing_creation_idempotency.sql`. Which are applied on the hosted DB: **not yet re-measured** (Phase 8) |
| Reports vs code | Earlier reports `00`, `10`–`13`, `MASTER-HANDOVER` describe the release-consistency work accurately for the p7 build; they are part of the uncommitted delta. Reports on main for hero/dealer/mobile predate #265 and were not re-audited line by line |

## Deployment-pipeline facts (from `.github/workflows/deploy.yml`)
* Production = push to `main` only. Job `deploy-vercel` runs `vercel build --prod` then `vercel deploy --prebuilt --prod`, then `npm run verify:production`. The deploy job needs `validate`, not the smoke-test job.
* **Gap found and fixed in this phase:** the verifier compared `release.json` to an expected commit only if `EXPECTED_COMMIT` was set, and the workflow never set it, so the commit check was silently skipped (warning only). It also never compared the **public domain's** release with the deployment just created, so a domain alias still pointing at an older deployment would pass verification while visitors saw an old site. This is a plausible mechanism for "owner sees new, friends see old" (not proven for production).

## Reconciliation matrix
| Area | Current implementation | Already merged? | Remaining work | Risk | Required verification |
|---|---|---|---|---|---|
| Hero, 2-col grid, list view, brand icons | on main (#263/#265) | Yes | favourite already compact; detail pages/gallery/landscape review | Low | responsive + a11y audit |
| Favourite 28px + 44px target, dealer sidebar/banner | on main (#265) | Yes | none for visuals | Low | keyboard/contrast audit |
| Release identity (`release.json`, meta, bundle id) | in delta | **No** | review + PR | Medium (deploy trigger) | `verify:dist`, build, parity rehearsal |
| Service worker rewrite, update banner, stale-chunk recovery | in delta | **No** | review + real-device test | Medium | release-switch rehearsal (10/10; upgrade stall documented) |
| Cache headers (`vercel.json`) | in delta | **No** | confirm on live headers | Low | curl on unrestricted machine |
| Deploy verifier: commit assertion + domain parity | new in p8 (this phase) | **No** | review | Low | mock rehearsal done; real run on next deploy |
| Dealer command centre (money, task queue, team activity, auctions) | banner + sidebar on main; backend `GET /dealer/dashboard` (canViewEarnings), `/pipeline`, `/auctions`, `/finance`, `/team` exist | Partly | financial definitions, queue, team activity, auction metrics | **High** (money semantics) | ledger reconciliation, role matrix tests |
| Team invitation | backend journey 17 (39 checks, stub email) on main | Yes (backend) | real-browser journey; real provider delivery unverified | Medium | browser journey, two dealerships |
| Accessibility | partial prior audit | Partly | full audit | Medium | axe + manual |
| Hosted DB vs migrations | reported divergence | n/a | re-measure, classify, plan | **Critical** | read-only fingerprints, disposable rebuild |
| Escrow/ledger/payouts/offers | implemented, covered by journeys on disposable DB | Yes | retest after any change; provider journeys unverified | **Critical** | DB journeys, Jest suites |

## Scope of this session so far
Done: Phase 1 baseline; Phase 2 code audit and corrections (service worker, cache headers, release identity, verifier). Rehearsal evidence: `reports/evidence/release-switch/`, `reports/evidence/release-parity-rehearsal.txt`.
Not started: Phases 4 (production verification needs the owner), 5, 6, 7, 8, 9 (partly), 10 (final), 11.
