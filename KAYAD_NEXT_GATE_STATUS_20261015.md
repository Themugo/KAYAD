# KAYAD next gate — staging schema, owner identity and recovery

Date: 2026-10-15

## Work prepared in this pass

- Added `runbooks/identity-staging/00_READONLY_STAGE_INVENTORY.sql`, a SELECT-only inventory of database identity, migration history, relevant columns/constraints/indexes, RLS/policies/grants, relevant routines, account-state aggregates and identity-link counts. It intentionally avoids outputting emails, password hashes, or tokens.
- Added `runbooks/identity-staging/01_OWNER_RECOVERY_GATE.md` defining staging isolation, migration disposition, private owner-identity verification, no-overwrite recovery rehearsal, failure injection, HTTP/socket/session tests and hard stop conditions.

## What is not certified

No staging connection or approved staging project credentials were available to this execution, so the actual staging catalog/history could not be queried. This pass does not claim staging reconciliation, recovery rehearsal, owner login, HTTP/socket authorization, or session invalidation passed. No production or staging mutation was run. No account, secret, migration history, schema, or deployment was changed.

## Known blockers carried forward

- Prior migration reconciliation found 63 repo-only migration files with mixed effects/conflicts/unverified status and 38 production-only history entries; this is a starting evidence set, not a substitute for re-querying the actual staging schema.
- `public.kayad_register_identity_atomic` was absent in the prior observed production catalog although current registration source calls it. Confirm staging function signature/body and dependencies before any repair.
- Prior observed production identity inventory showed two dealer records and no established owner record. Do not promote either dealer or run the legacy seed.
- Full certification must use required Node v22.22.2 and a complete dependency install; the prior container had Node v22.16.0 and no `node_modules`.

## Gate result

**BLOCKED — waiting for verified isolated staging connection/context and a fresh schema/history capture.** The runbook is prepared; no claim is made that the actual reconciliation has been completed.
