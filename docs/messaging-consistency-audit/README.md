# KAYAD — Messaging Consistency, Runtime Recovery & Regression Audit

Release candidate built from the supplied `223f2cf0-KAYAD-MESSAGING-RELIABILITY-FOLLOWUP-20261010.zip` (SHA-256 `027869a4…e189ba`, see `01`). Mode: inspect → reproduce → minimally patch → test → certify. Nothing was pushed or deployed; no migration was applied outside disposable local databases; no provider was contacted.

> **Follow-up (2026-10-11):** the Messages → login redirect had two further causes beyond D-AUTH-1 (backend `401` for infrastructure errors; frontend treating any session-check failure as signed-out). They are fixed and documented in `docs/audits/` (start with `00-AUDIT-REPORT-…`). This directory describes the release candidate that preceded that fix and is kept unchanged otherwise.

## Release decision

**NOT CERTIFIED for production. Conditional GO to a disposable/approved staging environment** after the read-only pre-flight in `10`. Production certification is **BLOCKED**: no staging or production access, no `.git` to prove commit parity, no real PostgREST/Supabase, no sandbox provider callbacks.

## What the audit found (evidence level: real server + real PostgreSQL built from the migration chain, via a test-only REST emulator — *not* Supabase)

The foundation type-checked, built and passed all its mocked unit tests, yet **could not authenticate a single request against a real database.** Running the real server against real rows exposed four P0 defects that mocks hide:

1. **D-AUTH-1 — the Messages → login bug.** `protect()` read `user._id` from a row that only has `id`; every protected request threw, was reported as `401`, and the SPA logged the user out. Reproduced in a real browser (foundation: redirected to `/login?next=…`; patched: Messages renders).
2. **D-FIN-1 — provider callbacks blocked by CSRF.** The callback allowlist never matched under the `/api` mount, so M-Pesa/webhook POSTs got `403`.
3. **D-FIN-2 — idempotency guard threw on every request.** `IdempotencyKey.getCachedResponse/record` did not exist; all critical operations failed closed with `503`.
4. **D-SEC-1 — client roles could execute SECURITY DEFINER money RPCs** (dispute resolution etc.) on the migration chain (hosted state UNCONFIRMED).

Plus 11 further fixes (see `09`): chat ordering under contention, stale replay receipt, concurrent chat creation, socket re-join on reconnect, 11 tables without RLS, open governance reads, listing-edit 500 (digit-segment column mapping), missing schema objects, masked error logging, a Jest/`node:test` collision.

**Messaging verdict:** idempotency, concurrency, ordering, per-user read receipts, unread counts and realtime delivery all behave correctly on the fixed tree (`04`, `05`). One messaging limitation is **open**: no outbox, so a crash between commit and side effects loses the in-app notification on retry (D-MSG-4, reported as a `todo`, not a pass).

## Contents

| File | Deliverable |
|---|---|
| `01-BASELINE-MANIFEST.md` | baseline manifest, checksum, toolchain, baseline test results |
| `02-RUNTIME-RECOVERY-REPORT.md` | runtime and dependency recovery, harness description, reproduction commands |
| `03-CHANGE-LEDGER.md` | file-by-file change ledger |
| `04-MESSAGING-IDEMPOTENCY-CONCURRENCY.md` | idempotency and concurrency results |
| `05-RECEIPTS-UNREAD-REALTIME.md` | two-account receipts, unread-count and realtime results |
| `06-AUTH-REDIRECT-DIAGNOSIS.md` | authentication redirect diagnosis and evidence |
| `07-SECURITY-ADJACENT-FINDINGS.md` | security and adjacent-regression findings |
| `08-COMMANDS-EXIT-CODES.md` | commands, exit codes and test reports (fresh extraction of this archive) |
| `09-DEFECT-REGISTER.md` | defect register with severity and remediation status |
| `10-DEPLOYMENT-READINESS-AND-ROLLBACK.md` | readiness decision, staging pre-flight, rollback runbook |
| `evidence/` | raw baseline outputs, migration-chain logs, final verification outputs |
| `harness/` | the offline evidence harness and all integration/browser tests (not part of the app build) |
| *(outside the archive)* `…RC-20261011.zip.sha256` | final archive checksum — an archive cannot contain its own hash |

## Status summary

| Area | Status |
|---|---|
| 1 Baseline and runtime recovery | **PASS** (baseline had 1 FAIL — fixed — and 1 SKIPPED — now executed) |
| 2 Message persistence and idempotency | **PASS** (11) + **1 TODO** (D-MSG-4 open) |
| 3 Read receipts and realtime | **PASS** (9); browser-level realtime **NOT RUN** |
| 4 Authentication recovery and redirect | **PASS** (reproduced + fixed + session lifecycle); production confirmation **UNCONFIRMED** |
| 5 Adjacent regression and security | **PASS** for what was run (22); ledger consistency, full auction settlement, escrow flows, B2C payout, provider-positive webhook paths **NOT RUN** |
| 6 Staging and release certification | Local DB integration **PASS**; staging, real PostgREST/Supabase, commit parity, production **BLOCKED** |

## Honest limits

* The REST layer is an emulator written for this audit; PostgREST/Supabase-specific behaviour (embedded resources, pooler, JWT verification, hosted default privileges) is **not** covered.
* Hosted database state (which migrations/grants/tables already exist) is unknown; every "fixed by migration" item must be confirmed with the pre-flight queries in `10`.
* Evidence for the Messages redirect in production itself is inferential (the code provably yields the symptom); confirm by running the fixed build and checking `/api/v1/auth/me`.
