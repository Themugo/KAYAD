# 5. Tests and validation results (2026-11-01, local; evidence tier: mocked local runtime + production build)

| Check | Result | Log |
|---|---|---|
| `tsc --noEmit` / `npm run lint` | pass / pass | tsc.log, lint.log |
| Frontend Vitest (all) | **146 files, 1263 passed, 1 skipped, 0 failed** | vitest-frontend.log |
| Production build (`npm run build`) | pass | build.log |
| Backend Jest (all) | **194/195 suites, 3646/3647 tests** - the 1 failure is `GET /api/admin/stats > ghost_checker` (`stage5f5RoleRouteMatrix`), the known pre-existing D-11, identical in the untouched baseline | backend-jest.log |
| Backend Vitest | 6 files, 36 passed | backend-vitest.log |
| Backend `node --test` response-lifecycle | 1 pass, 0 fail | backend-node-test.log |
| validate: panic-room, business-command-centre, admin-route-convergence (14/14), super-admin-phase1-navigation (13/13) | pass | *.log |
| validate: super-admin-completion | 28/30 - the same two failures as the untouched baseline (pre-existing) | validate-superadmin-completion.log |

## New tests added by this change
- `backend/tests/regression/visitorAnalytics.test.js` (38): bot/device/referrer/path classifiers; Nairobi day boundaries and custom-range validation; guest counted; bot, DNT, GPC, admin path and disabled collection not counted; invalid/unknown payload fields 400; refresh and retried event ids de-duplicated; one visitor per many pages; heartbeats add no views; **guest->login = one visitor, one session, counted as registered**; session replay by another visitor refused; **no raw id/IP/UA/user id stored**; server clock; returning visitor keeps first_seen; aggregation totals reconcile (guest+registered=unique, new+returning=unique); date filtering from seeded rows (today/yesterday/7/30/90/custom); invalid range 400; no-data zeros + notice; partial-history flag; comparison on/off; live window and refresh interval; CSV per kind, audit entry, formula-injection guard; buyer/moderator/anonymous refused; purge superadmin-only and retention-bounded; responses contain no hashes/ids.
- `backend/tests/regression/accountCapabilities.test.js` (19): guest refused; GET-only (POST/PUT/PATCH/DELETE 404, role unchanged); fresh account = buyer, nothing else granted; buyer + private seller on one id; pending/rejected seller; **pending and rejected dealer** keep buyer + seller; approved dealer/inspector; pending/rejected inspector; staff not buyers; **inspector application bound to signed-in user and account e-mail, duplicate pending refused, approval converts the same user (no `User.create`, name/email/phone/seller row intact), cannot hijack another account sharing the typed e-mail, refuses staff/dealer, unverified, self-approval**.
- `backend/tests/regression/guestAccessContract.test.js` (24): public routes unguarded; account-required actions guarded; no second registration route; applications key on user id; no self-grant endpoint. (Source-contract level.)
- Frontend: `analyticsTracker.test.ts` (11: anonymous ids only, session idle rotation, dedupe, DNT/GPC/opt-out, untracked paths, query stripping, listing/auction classification, same ids across registration/login, failure isolation, visible-only heartbeat) and `AdminTrafficAnalytics.test.jsx` (9: all metrics rendered from server, ranges incl. custom, empty state, partial-history notice, errors, export request, definitions, no identifiers).
- Updated (not weakened): sidebar inventory test and navigation validator now list 32 destinations (adds `/admin/traffic-analytics`, still exact-match); onboarding "read-only" assertion tolerates the second panel (D-47).

## Not verified here
Real browser walk-through of the guest flow and the dashboard on a running stack; the hosted database (migration unapplied); guest CSRF acquisition on the hosted site; CDN country header. These are listed in report 6.
