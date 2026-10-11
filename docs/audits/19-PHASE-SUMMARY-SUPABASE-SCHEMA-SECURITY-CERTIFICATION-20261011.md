# Phase summary — Supabase PostgreSQL reconciliation, RLS security and staging certification

## Verification levels used (never mixed)
| Level | Used for | Status |
|---|---|---|
| Local PostgreSQL 16 (disposable, full replay, optional Supabase default-privilege emulation) | every code/migration fix, harness, RLS tests | **PASS** (`18-…`) |
| Disposable Supabase project | — | **NOT RUN** (none provisioned; nothing was created) |
| Staging | checklist `17-…` | **NOT RUN** (owner) |
| Production | catalog inspection only, read-only, after the owner connected the KAYAD org | **SOURCE-VERIFIED** (`evidence/hosted-readonly-20261011/`). No row data, DDL, writes, migrations or configuration |

## Outcome by mission item
| Item | Result | Where |
|---|---|---|
| Schema reconciliation (repo ↔ history ↔ actual) | Done for all three sources. Production is **52 migrations behind**, has **38 versions with no repo SQL**, and 5 older repo migrations are absent by name. Fingerprint diff recorded | `08-…`, hosted evidence |
| RLS / privilege matrix | RLS-1 (14 `USING(true)` policies; latent in production), RLS-2 (client EXECUTE on trigger functions), RLS-3 (TRUNCATE etc. on 72 production tables) fixed by migration `20261011120000`. Production advisor: 0 ERROR / 0 WARN | `09-…` |
| Migration and rollback review | 2 new additive, idempotent migrations with rollback SQL. Hosted deploy route defined (staging clone of production → export the 38 → apply in order) | `11-…` |
| Outbox and messaging consistency | 7 new failure-mode tests (lease, dead letter, dedupe, SKIP LOCKED) PASS; outbox absent in production (deploy-order) | `10-…` |
| Legacy attachments | Read-only inventory tool and reversible, manifest-driven migration script, tested locally. Real inventory: owner (customer data not read) | `12-…` |
| Realtime auth / host config | Reproduced in real Chromium: cross-host sockets are anonymous. Options A/B documented; nothing changed (cookie flags untouched) | `15-…` |
| Financial schema integrity | FIN-SCH-1 (callbacks depended on `transactions`) and FIN-CB-1 (500 after successful settlement) fixed. FIN-1 escrow automation dormant: owner decision, not changed | `13-…` |
| Change ledger / staging checklist / blockers | — | `16-…`, `17-…`, `14-…` |

## Top blockers (full ranking in `14-…`)
1. **DEPLOY-ORDER (P0):** production schema stops at 2026-09-22. The current backend needs the outbox, idempotency, `users.deactivated_at` and the auction tables. Apply the pending migrations on a staging clone of production, then production, **before** deploying this backend.
2. **HIST-38 (P0):** 38 production migrations have no SQL in the repository, so `supabase db push` refuses. Export and commit them first.
3. **FIN-SCH-1 (P0, fixed in code):** ship with the backend; staging D1–D5.
4. **FIN-1 (P1):** escrow auto-release/warnings dormant; owner policy decision.
5. **RT-3 (P1):** realtime anonymous across hosts; choose option A or B.

## Safety confirmation
No commit, push, deploy, hosted migration, branch, configuration change, Cloudinary change or cookie change was made. No secret, key, token, password or customer data was requested, printed or stored. No historical migration was edited. The foundation was kept untouched, and the 52 pending migrations were **not** applied anywhere hosted.
