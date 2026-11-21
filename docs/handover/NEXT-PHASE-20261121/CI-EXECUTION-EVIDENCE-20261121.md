# CI execution evidence (2026-11-21)

## What was and was not verified
| Item | Status |
|---|---|
| Empty-database runner executed locally (`ci/db-journeys/run.sh`, fresh `kayad_ci`, ports 54340/54341/6391/5065) | **VERIFIED** — `overall=PASS`, exit 0 (`evidence/ci-run-final/`) |
| Same workflow in **GitHub Actions** (`.github/workflows/db-journeys.yml`) | **NOT TESTED** — nothing was committed or pushed (not authorised); the workflow has never run on GitHub. Do not treat the local run as a CI result. |

## Retained evidence (`evidence/ci-run-final/`)
| Required | File |
|---|---|
| All 205 migration application results | `migrations.txt` (205 lines `OK`, 0 `FAILED`); `summary.txt` → `migrations applied: 205/205` |
| Stack startup evidence | `stack.txt` (PG 16.15, PostgREST 12.2.3, Node 22.23.4, Redis 7.0.15, ports, backend `/api/health` ok), `postgrest.log`, `proxy.log`, `redis.log`, `backend.log` |
| Journey results, exit codes | `summary.txt` (one line per journey: `exit=` and `fails=`), per-journey logs `*.log`, `runner.stdout` |
| Failure logs | none in the final run. Earlier failing runs (ci-run3 with the old aggregate engine: `06_aggregate_shim` 1/16 → exit 1) are described in the aggregation report |
| Test database cleanup | `cleanup.txt` — all backend/PostgREST/proxy/Redis processes stopped, ports closed, `database kayad_ci dropped` (set `KAYAD_CI_KEEP_DB=1` to keep it for debugging) |

## Journeys: **14**, not 13
11 legacy chain journeys + `03_reconciliation_issues` + `05_offer_payment` + the new `06_aggregate_shim`. (The earlier "13" excluded the aggregation journey, added this phase.) All exit 0, 0 failures.

| Journey | Assertions printed `PASS` |
|---|---|
| legacy-j1_registration_idempotency | 21 |
| legacy-j1_personal_register_login | 3 |
| legacy-j2 | 11 |
| legacy-j3 | 4 |
| legacy-j4_offers | 13 |
| legacy-j5 | 22 |
| legacy-j6 | 6 |
| legacy-j7 | 12 |
| legacy-j8 | **0** — prints the escrow dashboard payload only; passes if no exception. It asserts nothing and should be treated as a smoke call, not a verified journey |
| legacy-j9_capabilities | 2 |
| legacy-j10_legacy_and_dealer | 6 |
| 03_reconciliation_issues | 33 |
| 05_offer_payment | 74 |
| 06_aggregate_shim | 16 |

Honest caveats: one legacy check (purchase payment initiate) is logged `PASS ... BLOCKED(provider)`: it proves only that the server refuses cleanly without Daraja credentials, nothing about M-Pesa. The DB-journey harness sets rate-limit environment overrides to very large values and `MPESA_ENV=production` with placeholder Cloudinary values, so these runs do not exercise production rate limits or any third party.

## To run it on GitHub
Open a PR from a branch (not authorised here); the workflow should upload `ci/db-journeys/out/` as an artifact. Until then the claim is "local runner verified, GitHub NOT TESTED".
