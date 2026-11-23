# Test results — dealer launch (2026-11-23)
All results are **local / disposable-database** evidence. None proves production behaviour.

| Check | Result |
|---|---|
| Backend Jest (`--maxWorkers=2`) | PASS — 263 suites passed, 1 skipped (264); 4,317 tests passed, 21 skipped, 0 failed |
| Frontend Vitest | PASS — 230 files, 1,969 tests passed, 1 skipped, 0 failed |
| `tsc --noEmit` | PASS (no output) |
| `npm run build` | PASS |
| DB journeys, complete suite (`ci/db-journeys/run.sh`, 213/213 migrations applied) | PASS — overall=PASS; includes 17 invitations, 21 onboarding, 22 employment, 18 command centre, 12 named dealer journeys |
| New journey `23_dealer_launch_flows` | PASS 42/42 (final standalone run after adding moderation checks; the first full-suite run executed the 33-check version and passed) |
| Browser `ci/browser/dealer-launch.mjs` (Chromium, desktop 1440 / tablet 820 / mobile 390) | PASS 31/31, 0 page errors |
| `scripts/validate-*.mjs` | 10 validators exit non-zero — **identical at baseline main** (pre-existing: live-runtime needs Supabase credentials; `validate-dealer-workforce-access` 11/12 "invite acceptance validates signed-in email"; `validate-write-route-policy` flags `POST /team/invitation/preview`; release gate / handover-core / wave3 / polish / provider-certification / homepage / local-supabase). Not introduced by this change; not fixed here. |

Not run: hosted/production anything, real e-mail delivery (the mail provider is stubbed locally; **no live delivery is claimed**), real M-Pesa, axe accessibility audit (keyboard/labels covered by unit and browser checks only), the hosted Team & Employment live test (owner has not reported it).

Screenshots: `evidence/browser/` — 01 dashboard expanded, 02 collapsed sidebar, 03 leads reply, 04 inventory status, 05 vehicle request, 06 tablet, 07 mobile, 08 mobile drawer, 09 viewer restricted, 10 public marketplace, 11 staff directory, 12 team invitation (Basic Staff Access), 13 vehicle listing form. Machine-readable: `evidence/browser/results.json`.
