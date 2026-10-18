# KAYAD Master Identity & Authorization Audit — 2026-10-15

## Scope and safety

Reviewed the supplied `KAYAD-OWNER-IDENTITY-CONVERGENCE-20261015.zip` as a source candidate. All work was performed in an extracted audit copy. No production API/database calls were made in this pass, no secrets were read, and no migration, deployment, or Git commit/push was performed. The two existing dealer identities remain untouched. The candidate source package was not overwritten in place.

## Verified validation results

| Gate | Result | Meaning |
|---|---:|---|
| Owner identity convergence | 7/7 PASS | Static source contracts only |
| Recovery repair | 19/19 PASS | Static source contracts only |
| Registration/onboarding | 47/47 PASS | Static source contracts only |
| Explicit auth flows | 19/19 PASS | Static source contracts only |
| Registration role matrix | 33/33 PASS | Static source contracts only |
| Backend runtime contracts | 14/14 PASS | Static source contracts only |

These checks do not establish successful live login, correct deployed environment values, effective runtime permissions, database/RLS parity, or owner recovery.

## Findings

### AUTHZ-01 — owner predicate remains duplicated in `/auth/me` (high)

`backend/routes/authRoutes.js` computes owner status directly from `WEBHOIST_EMAIL`; it does not use canonical `isOwnerEmail` from `backend/config/owners.js`, so it does not honor `WEBHOIST_EMAILS`. This means `/auth/me` can serialize a different role from login serialization/middleware when only the alias is configured. Converge this route on the canonical predicate and add a regression test for both env variables, mixed case, whitespace, and comma-separated values.

### AUTHZ-02 — auction fulfilment has route-level role lists and missing visible admin middleware (high; service review required)

`backend/routes/auctionFulfilmentRoutes.js` defines admin status locally as `admin`, `super_admin`, `superadmin`, or `staff` on read routes. This does not use the canonical role/owner policy, and the write routes rely on `protect` plus domain service checks. Before changing this, inspect every service's actor/party/ownership checks and write down the intended policy for each action. Do not simply add `adminOnly` to all writes because winners/organizers/dealers may legitimately perform some actions.

### AUTHZ-03 — governance has two authorization layers (medium)

`backend/routes/governanceRoutes.js` uses global `protect` and `allowRoles("admin", "superadmin", "executive", "manager")`, then applies narrower per-route roles. `backend/controllers/governanceController.js` separately has an `ensure()` role allowlist and silently catches audit-log creation errors. This dual policy can drift. Consolidate policy definitions and ensure security-relevant governance actions cannot report success while audit logging silently failed, or explicitly document which events are best-effort.

### AUTHZ-04 — owner status is configuration-derived, not a stored admin account (design constraint)

The canonical owner module grants virtual `webhoist` authority to configured emails. That is intentionally independent of a DB role, but it does not create a `users` or `user_auth` row and does not bypass password validation. The original owner still needs an existing identity and valid credentials or an approved recovery procedure.

### AUTH-05 — seed is blocked in production but remains unsafe for non-production shared databases

`backend/seed.js` now refuses production before connecting, which is safer than the previous behavior. Outside production it still performs separate `users` and `user_auth` upserts. Do not use it against any shared/staging database containing real identities without a separate safe mode that refuses all existing email/user-id conflicts and uses an atomic transaction/RPC.

### DB-06 — registration RPC gap and migration drift remain release blockers

Earlier read-only production checks reported `public.kayad_register_identity_atomic` missing. Current source registration calls this RPC and expects a controlled `DATABASE_MIGRATION_REQUIRED` response if it is absent. This candidate does not repair production schema. Resolve only after migration-history reconciliation and successful isolated staging certification; do not use a blind production `db push`.

### RECOVERY-07 — no proven original-owner identity in observed production user inventory

Earlier read-only evidence found two pending dealer records, matching `user_auth` records, and no rows in `auth.users`. Neither dealer is a superadmin. Do not promote either account or run the seed script. Verify the intended owner email against protected deployment configuration without printing values, then query only the matching account's non-secret identity/status fields. If no row exists, design an audited, transactional bootstrap with explicit owner approval and a no-overwrite invariant.

### SESSION-08 — permission verification must cover both API and sockets

The middleware derives owner role at request time and uses `tokenVersion`, user state, and refresh-session checks. Socket auth also uses owner email. Once recovery is implemented, test both HTTP and socket authorization, plus deactivated/banned/email-unverified states, token invalidation, and a non-owner control account. Do not infer end-to-end authorization from a serialized `superadmin` role in `/auth/me` alone.

## Required next source correction pass

1. Replace the direct owner-email calculation in `/auth/me` with canonical `isOwnerEmail`.
2. Add focused tests covering canonical owner config through login serialization, `/auth/me`, HTTP `protect`, socket auth, and `WEBHOIST_EMAILS` alias.
3. Audit `auctionFulfilment.service.js` action-by-action before changing route middleware; assert ownership/party checks on every write and constrain privileged overrides to canonical admin policy.
4. Reconcile governance controller checks with route policy; define audit-log failure behavior explicitly.
5. Design a separate atomic owner recovery RPC/command that refuses existing identity conflicts, changes only the explicitly verified owner identity, records an audit event transactionally, increments token version/revokes sessions when appropriate, and emits no credentials/tokens to logs.
6. Reconcile production migration history and certify the registration RPC in isolated staging before considering any production schema action.

## Release decision

**NOT READY for production owner recovery or deployment.** Source-level validators pass, but the remaining authorization inconsistencies and missing production schema evidence are not resolved. No account recovery success is claimed.
