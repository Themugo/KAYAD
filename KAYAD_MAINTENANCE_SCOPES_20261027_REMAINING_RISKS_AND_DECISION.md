# Remaining risks and final decision

## Decision: **A — Local verification complete; deployment approval required**

Scope of that statement: the owner recovery lane, scoped/global maintenance, the central server-side policy, the atomic control plane and the Panic Room are implemented and verified **locally** against a real backend, real PostgreSQL/PostgREST and a real browser on the final build. The full review found two defects (safe logout; fail-open after a store outage) which are fixed and tested; **no owner-lockout or privilege-bypass defect remains known**. This is **not** hosted verification: hosted login, hosted recovery and production readiness are **not** claimed. The hosted flag was read (read-only) and is **still enabled**.

This changes the previous round's **B** to **A**. The reason is stated openly: the earlier blocker "no MFA for technical-recovery staff" is a limitation of the design that does not block this decision *only because* it can be fully neutralised by configuration — see condition 1. If you do not accept condition 1, the correct decision is B.

## Conditions that gate Operation B (deployment)
1. **Technical-recovery staff have no MFA.** Only System Owners have a second-factor store in this repository. Technical recovery is gated by an explicit owner-made per-account grant (`platform_recovery`), password re-entry on every recover, a mandatory reason, rate limits (per user), CRITICAL audit, and by being restore-only (cannot activate; verified to gain **no** admin, finance, auction or escrow access — test T1–T8). That is not MFA. **Do not grant `platform_recovery` to anyone until staff MFA exists**; with zero grants the owner lane (MFA enforced) is the only recovery path and the gap is not exercised. Needs your explicit acceptance, or a separate staff-MFA piece of work.
2. **Hosted owner recognition is unverified.** The hosted owner row has legacy role `dealer`, status `pending`, no owner tables. The deployed backend must recognise `jimmythemugo@gmail.com` as owner via `WEBHOIST_EMAIL` (first address) or the owner-governance migrations. If it does not, no code can give the owner a recovery lane (Operation A's SQL is independent of this and still works). Confirm before approving B.
3. **Hosted PostgREST** must accept the JSON-path conditional update used for compare-and-swap (verified on local PostgREST only). Post-deploy test 4 in the deployment plan proves it.

## Failure-policy recommendation (item 6)
Implemented and recommended: **fail-static for a known state, fail-open only with no prior knowledge, never report a recovery that was not read back**; sign-in and recovery need the identity/settings store and honestly return 5xx without it. Full trade-off table: policy matrix section 7. Residual risk: a freshly started instance with the store down has no last-known state and serves ordinary traffic (database-backed routes fail on their own); a future hardening step is to persist the last-known state in Redis.

## Other known limitations (accurate, not hidden)
- **Sockets:** already-open realtime connections are not closed or re-evaluated when maintenance starts; HTTP access is cut immediately (every request is re-checked, including with old tokens).
- **Cache lag:** each backend instance caches the flag ~10 s (dealer-team lookup also ~10 s); changes made on another instance can lag up to that. The control plane always reads the database directly.
- **Registration pause is coarse:** under `buyers_sellers`, `ordinary_users` and `global`, all anonymous `POST /auth/register` is paused (the backend cannot know the intended audience).
- **Password-reset / email-verification flows are not paused** (not signed-in functions; needed to recover accounts).
- **Feature switches** (auctions, payments, ghost check) are separate from maintenance and stay `superadmin`-gated by the pre-existing legacy router; they are not a maintenance bypass (legacy `full_maintenance` / `maintenance` are refused).
- **Authenticator interoperability:** MFA was exercised with KAYAD's own RFC 6238 implementation, not a physical app.
- **Node version:** local runs used 22.23.4 vs the pinned 22.22.2.
- **Two validators** fail only for missing credentials (`validate:communications:providers`, `validate:live-runtime`).
- **Older incident documents** (`KAYAD_INCIDENT_20261027_*`) describe the superseded owner-only lane; this package's deployment plan replaces their "Op 2".

## What is NOT claimed
Hosted login, hosted recovery, deployment success or production readiness. Nothing hosted was changed; no commit, push or deploy was made.
