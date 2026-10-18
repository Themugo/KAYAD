# KAYAD owner recovery — staging gate (no mutation)

## Non-negotiable safety rules

- Use an isolated staging project/database approved for this rehearsal; verify project ref and database name before queries.
- Do not paste or print `SUPABASE_SERVICE_ROLE_KEY`, database URLs, JWT secrets, password hashes, reset tokens, session tokens, or CSRF tokens into reports or chat.
- Do not run the legacy `backend/seed.js` as a recovery mechanism.
- Do not promote either existing dealer, overwrite an existing identity, or infer the intended owner from a role label.
- Do not run `supabase db push`, `migration repair`, or any migration until staging history, live object definitions, RLS, grants, and dependencies have been reconciled.
- Preserve the original working tree and all existing user records.

## Gate A — prove staging isolation

1. Record project ref (non-secret), database name, PostgreSQL version, service environment name, and timestamp.
2. Confirm staging is isolated from production at both project and connection-string level. Never echo the connection string.
3. Run `00_READONLY_STAGE_INVENTORY.sql` using a read-only role where possible. Save output in a restricted local evidence folder; redact PII and secret-bearing values.
4. Compare migration versions/names against `KAYAD_MIGRATION_INVENTORY_20261013.tsv` and `KAYAD_MIGRATION_RECONCILIATION_20261013.tsv`. A name match is not proof that the SQL effects match.
5. For every conflict, compare actual definitions and dependencies; classify as MATCH, EFFECT_MISSING, CONFLICT, EFFECT_PRESENT_HISTORY_MISSING, UNVERIFIED, or HISTORY_ONLY. No repair until each row has a reviewed disposition and tested rollback/restore plan.

## Gate B — establish intended owner identity privately

1. Resolve `WEBHOIST_EMAIL` / `WEBHOIST_EMAILS` from the backend environment without printing the values. Produce only a local boolean indicating whether the target was configured and a keyed/redacted identifier for comparison.
2. Verify mailbox/control of the intended address outside the database. Record only `verified=true/false`, not verification material.
3. In staging, privately compare the normalized target address against `users` and linked `user_auth`/`profiles` records. Never paste email, password hash, reset token, or session data into logs.
4. Stop on zero/multiple matches until the absence or conflict is explained; stop on inconsistent linked IDs, soft-deleted/disabled identity, duplicate normalized addresses, or a different existing identity. Do not automatically promote a dealer.
5. If the correct existing account is found and mailbox ownership is verified, test the supported password-reset flow first.
6. Only if absence is proven, design an explicit bootstrap transaction after schema and transaction capabilities are confirmed. It must lock/serialize by normalized email, enforce unique constraints, create the complete linked records atomically, write an immutable audit event, and fail without changes on any pre-existing/conflicting record. Rollback and idempotent rerun must be tested in staging.

## Gate C — recovery rehearsal and authorization proof

- Use a synthetic staging owner identity and synthetic non-owner control; do not use production password material.
- Exercise create/recover twice; second attempt must be safe and non-destructive or explicitly report already exists.
- Inject conflicts (duplicate normalized email, orphaned `user_auth`, mismatched IDs, soft-deleted user, missing uniqueness constraint, audit-write failure) and assert rollback/no partial identity.
- Test login, `/api/v1/auth/me`, effective HTTP permissions, socket authentication, room joins and privileged socket events, disabled/banned/email-verification behavior, tokenVersion change, refresh-token revocation, and old-session rejection.
- Include negative controls: dealer must not gain owner/admin permissions; malformed or absent token denied; revoked session denied on both HTTP and socket paths.
- Capture redacted request IDs, result codes, and assertions only. Never capture credentials or tokens.

## Gate decision

No production action is permitted until the staging migration ledger and schema are reconciled, recovery rehearsal passes, intended owner identity is independently verified, and rollback has been reviewed. Final live certification is a separate authorized gate.
