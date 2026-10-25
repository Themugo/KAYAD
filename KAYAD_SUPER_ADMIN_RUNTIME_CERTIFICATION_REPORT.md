# KAYAD Super Admin — Runtime Certification Report

Date: 2026-10-25. Environment: Linux sandbox, Node v22.23.4, npm 10.9.9, Playwright Chromium, Vite preview on 127.0.0.1:4173. No backend, database or production service was contacted.

## What was actually run
| Item | Command / method | Exit | Outcome |
|---|---|---:|---|
| Foundation integrity | `sha256sum` of the Phase 12 ZIP | 0 | `7690e986688db50363c58058b9e7c76a7125233abc5cec405c06a41eec22c98d` — matches; ZIP preserved unchanged |
| Install | `npm ci` (existing lockfile) | 0 | manifests and lockfiles byte-identical to the foundation |
| Typecheck | `npx tsc --noEmit -p .` | 0 | PASS |
| Build | `npm run build` | 0 | PASS |
| Unit/integration tests | `npx vitest run` | 0 | 103 files, 808 passed, 1 skipped, 0 failed |
| Lint | `npx eslint src` | 1 | 5 errors / 1,556 warnings, the 5 errors pre-existing in untouched files |
| New validator | `node scripts/validate-super-admin-completion.mjs` | 0 | 30/30 |
| Existing validators | 25 scripts, same list and order as the baseline | see Functional Test Report | identical to baseline except stage5f1/5f2 now pass; stage24 still 13/14 (disclosed) |
| Browser sweep | Playwright harness (`e2e/admin-visual/`) on the final build | 0 | 588 captures, 49 routes × 12 sets |
| axe-core | WCAG 2.0/2.1 A+AA, 98 runs | — | 0 violations |

## Runtime behaviour verified (fixtures)
* No uncaught page errors on any route or scenario; no error boundary.
* **No request storm**: the shared `useToast` fallback returned a new object each render; effects that listed `toast` re-ran forever (≈850 requests in 5 s on Staff, pages stuck on spinners). Fixed (SA-048), covered by a regression test that fails against the original code, and confirmed in the browser (one request per endpoint).
* Loading → loaded transitions finish (the harness waits for spinners/`aria-busy` to detach in non-slow scenarios).
* Empty, error (HTTP 500), forbidden (HTTP 403) and slow scenarios each render an explicit, honest state; no failure is shown as zero or as healthy.
* Role gating is unchanged (no RBAC code touched); sidebar and quick actions remain permission-filtered by the existing `canOpen`.

## Console output across the 588 captures
The console is not clean, and that is stated rather than hidden. Every message is environmental or deliberate:
| Class | Count |
|---|---:|
| font/CDN/API network block (ERR_TUNNEL_CONNECTION_FAILED) | 1274 |
| HTTP 500 from fixture (error scenario, by design) | 590 |
| Socket.IO CDN unreachable (realtime fallback) | 588 |
| HTTP 403 from fixture (forbidden scenario, by design) | 295 |
| "Couldn't load preload assets" ProgressEvent (98, one per axe/interaction run, the same blocked-network class) and `ERR_UNSAFE_PORT` (18, the deliberately unreachable fixture image on `/admin`, `/admin/dashboard`, `/admin/cars`) | 116 |

None was traced to an application-code defect (the preload-asset warning is attributed to the blocked network by its timing and class, not separately proven); the counts include the 500/403 responses the error and forbidden scenarios inject on purpose.

## Public / non-admin regression check
* No file under public marketplace, non-admin dashboards, backend, `supabase/`, migrations, env or deployment config differs from the foundation (verified by `diff -rq`).
* Shared files touched: `src/context/AuthContext.tsx` (7 presentation lines in the admin denial screens) and `src/context/ToastContext.tsx` (stable no-op fallback). Both are disclosed in REMAINING_BLOCKERS.
* The two new stylesheets are imported only by `AdminLayout.tsx`, and every rule is scoped to the admin shell (verified by selector inspection), so public pages cannot receive them.
* The existing public-site and navigation validators and the full unit suite pass.
* **Not run:** a browser sweep of the public marketplace and non-admin dashboards — BLOCKED/NOT RUN (the harness only covers `/admin`). The conclusion rests on the diff, the scoping, the validators and the unit suite.

## Not certified (BLOCKED / NOT RUN)
Live backend data and real sessions; Firefox, Safari, mobile devices; screen readers; production smoke test; real web fonts. See REMAINING_BLOCKERS.
