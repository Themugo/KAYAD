# Staging certification instructions: runtime-convergence phase

These steps are for an authorised operator on **staging** (or a disposable Supabase project) and must never use production data.
- Record PASS, FAIL or BLOCKED for each step, with an evidence link.
- Never paste connection strings, passwords, service-role keys, cookies, JWTs or socket tickets into tickets or chats.
- Earlier checklists remain in force: `17-STAGING-CERTIFICATION-CHECKLIST-SUPABASE-20261011.md`, `08-STAGING-CERTIFICATION-CHECKLIST-20261011.md` and `02-STAGING-VERIFICATION-AND-ENV-CONVERGENCE-20261011.md`.

## A. Environment
| # | Step | Expected |
|---|---|---|
| A1 | Staging built as a schema-only clone of production; the 38 hosted-only migrations exported and committed (HIST-38) | `schema_migrations` equals production |
| A2 | Apply pending migrations in order, ending with `20261011130000_cars_click_counter.sql` | each succeeds; `cars.clicks` exists with default 0 |
| A3 | Supabase Auth → "Allow new users to sign up" | **off** |
| A4 | Node 22.22.2 on the API host; `CORS_ORIGINS` includes the app origin; optional `SOCKET_TICKET_SECRET` (≥ 32 random bytes) set as a secret | — |

## B. Disposable-Supabase verification (Priority 3, BLOCKED in this phase)
| # | Step | Expected |
|---|---|---|
| B1 | `BEGIN READ ONLY; \i supabase/preflight/INVENTORY_SCHEMA_SECURITY.sql; ROLLBACK;` → `scripts/supabase-reconcile.mjs` against `docs/audits/evidence/certification-20261011/schema/repo-inventory-supabase-defaults.json` | no `critical`; 14 RLS-1 policies admin-gated; no client TRUNCATE |
| B2 | Harness against the project: `m10`, `m8`, `m8b`, `m14`, `m15` (service key from a local `.env` only) | all PASS except `m15` #7 until FIN-LEDGER-1 is decided |
| B3 | Re-apply `…100000/120000/121000/130000` | idempotent |

## C. Route schema (Priority 1)
| # | Step | Expected |
|---|---|---|
| C1 | `KAYAD_TEST_DB=<staging-shaped local copy> node tools/route-schema-crawl.mjs crawl.json 45000`, then `python3 tools/classify-route-crawl.py BEFORE.json crawl.json out.json` | group A (27) routes stop failing once the hosted DDL is present; no `newFailures` |
| C2 | Product decision recorded for each group B, C and D subsystem in `21-…` §4 | — |

## D. Financial (Priority 4)
| # | Step | Expected |
|---|---|---|
| D1 | M-Pesa **sandbox** STK push for a bid commitment: success, wrong amount, cancelled | settles once / fails / resets registration (`m13` parity) |
| D2 | Replay the sandbox callback 5× | one settlement, one receipt |
| D3 | Owner decision on FIN-LEDGER-1 (`24-…`), implemented as a migration; `m15` #7 green | balances unchanged by rebuild |
| D4 | Read-only production check (owner): `select count(*) from ledger_entries where source='reversal';` and, if > 0, compare `ledger_accounts.balance` with a journal-derived recomputation inside `BEGIN; … ROLLBACK;` | quantifies the FIN-LEDGER-1 impact; no writes |

## E. Realtime (RT-3)
| # | Step | Expected |
|---|---|---|
| E1 | Sign in on the app host, open DevTools → Network → WS | one `POST /api/realtime/socket-ticket` (200, `no-store`) before the socket connects; **no ticket in any URL**; first server frame `authState {authenticated:true}` |
| E2 | Two accounts in one conversation (two browsers) | messages and notifications arrive live in both directions |
| E3 | Leave a tab open past access-token expiry (or shorten `ACCESS_TOKEN_EXPIRE` on staging) | `sessionExpired`, then automatic reconnect with a fresh ticket after the cookie refresh; live delivery resumes |
| E4 | "Sign out of all sessions" in another tab | the open tab loses private realtime within `SOCKET_REVALIDATE_MS` (default 5 min) |
| E5 | Ban the test account from admin while it is connected | private realtime ends within `SOCKET_REVALIDATE_MS`; the ticket endpoint returns 401/403 |
| E6 | Signed-out visitor on an auction page | anonymous socket; auction updates still arrive |
| E7 | Server logs (API host and proxy) searched for `socket-ticket` responses and `eyJ` | no ticket or token values logged |

## F. Messages (regression)
`docs/audits/08-STAGING-CERTIFICATION-CHECKLIST-20261011.md` §Messages: authenticated `/?nav=chat`, delayed bootstrap, transient failure, confirmed expiry, login return path, two-account messaging, read receipts and unread counts, unauthorized conversation.

## G. Live E2E suites (opt-in)
Seed one buyer, one dealer and one admin on staging. Export `BUYER_EMAIL`/`BUYER_PASSWORD`, `DEALER_EMAIL`/…, `ADMIN_EMAIL`/… in the CI secret store. Run `E2E_WITH_BACKEND=1 BASE_URL=<staging> npx playwright test` and file every failure in `22-…` format.
