# KAYAD Staging Certification Runbook

**Do not execute against production by default.** Use an authorized staging clone and compliant Node.js `>=22.22.2`. Keep secrets in environment variables or local ignored `.env` files; never paste them into logs or reports.

## Gate 0 — runtime and baseline

1. Verify the release ZIP checksum against the companion manifest.
2. Extract into a clean working directory and verify archive integrity.
3. Confirm `node -v` is `>=22.22.2` and npm uses the repository lockfiles.
4. Run the prescribed clean install with engine strict enabled.
5. Run typecheck, lint, build and all source validators. Record command, exit code and output.

## Gate 1 — schema parity

1. Compare staging's `supabase_migrations.schema_migrations` with repository migration versions.
2. Resolve hosted-only migration SQL from authoritative exports; do not fabricate historical migrations.
3. Run reviewed migrations in order on staging.
4. Run the migration preflight, schema contract validator, route/schema crawl and RLS matrix.
5. Confirm that no client roles have unintended `TRUNCATE`, `REFERENCES`, `TRIGGER` or broad internal table grants.
6. Verify support FAQ seed/migration idempotency.

## Gate 2 — messaging and notification authorization

Use separate test accounts for Buyer A, Buyer B, private seller A/B, Dealer A/B, an authorized dealer team member, inspection provider, financing provider, escrow operator, support agent, administrator and an anonymous session.

Run the allowed/denied matrix in `KAYAD_MESSAGING_NOTIFICATION_SECURITY_MATRIX_20261011.md`. Include ID substitution, unauthorized recipient, listing-owner mismatch, cross-dealer access, forged socket room, admin non-participant attachment access, cross-user notification read/delete and internal support note access.

Verify the public inbox has no command-console copy or fabricated transaction context. Confirm unread counts agree with persisted `seenBy` state. Verify a failed read receipt does not clear unread UI state. Verify notification events open `/?nav=chat` and ordinary notifications open only an approved local destination.

## Gate 3 — real-time and attachments

1. Connect two authenticated users and one unauthenticated socket.
2. Verify only participants can join the chat room.
3. Verify session expiry, logout, revocation and reconnect behavior.
4. Verify the persisted message event ID is stable across retries and outbox replay.
5. Exercise concurrent sends, retry after lost response, notification deduplication and dead-letter recovery.
6. Test new attachment ownership and participant-bound retrieval.
7. Run the legacy attachment inventory against authorized provider records; classify public Cloudinary assets and execute only a reviewed, reversible migration plan.
8. If more than one backend instance is deployed, verify Redis-backed fan-out and cross-instance single-use socket-ticket behavior. Otherwise record the single-instance assumption.

## Gate 4 — financial integrity

1. Run `supabase/preflight/ledger_signed_balance_dry_run.sql` and save the redacted result.
2. Review every account where stored, signed and normal balances differ.
3. Confirm posting, reversal and trial-balance contracts all use signed balances.
4. Pause staging financial writes during the rebuild window.
5. Execute the reviewed rebuild once, then run `m15` test #7 and the complete financial reconciliation suite.
6. Verify duplicate M-Pesa callbacks, amount mismatch, replay, reversal and concurrent settlement.
7. Verify escrow release/refund/forfeiture and auction settlement idempotency. Do not activate escrow automation without separate owner policy approval.

## Gate 5 — full application regression

Run, in order:

1. npm clean install.
2. lint and TypeScript checks.
3. frontend production build and backend boot/health.
4. unit and integration suites.
5. security boundary and RLS matrix.
6. payment/ledger/escrow and auction suites.
7. upload/document access suite.
8. messaging/notification/socket suites.
9. support FAQ/ticket tests.
10. Playwright desktop/mobile journeys.
11. route/schema crawl and deployment readiness.
12. provider sandbox certification where credentials exist.
13. final full regression and artifact checksum.

## Gate 6 — release decision

A release is not certified if any P0 is open, any relevant P1 is unresolved without approved containment, or a test is merely assumed to have passed. Report PASS/FAIL/BLOCKED/NOT RUN separately for source, local runtime, staging and production.

Production promotion requires an independently approved change window, schema parity, approved ledger cutover, rollback plan, provider readiness and a verified deployment health check. This runbook itself authorizes no production mutation.
