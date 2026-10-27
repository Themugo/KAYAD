# Remaining risks, blockers and final decision

## Final decision: **B — PARTIAL; EXPLICIT BLOCKERS REMAIN**

The owner lane, scoped maintenance, central policy, atomic control plane and UI are implemented and verified locally with no owner-lockout or privilege-bypass defect found. The decision is B, not A, for one stated requirement gap and one unverifiable hosted dependency:

### Blockers
1. **No MFA for technical-recovery staff (requirement gap).** The task requires "MFA and step-up" for high-risk recovery. The repository has an MFA store only for System Owners (`owner_mfa_*`); there is no second-factor store for other staff, and building one is a new identity feature outside this task. Technical recovery is therefore gated by: an explicit per-account `platform_recovery` grant made only by a System Owner, password re-entry on every recover, a mandatory reason, rate limits, CRITICAL audit, and being restore-only (cannot activate, cannot reach admin/financial APIs). It is **not** MFA. **Mitigation that closes the gap today:** the grant is off by default and in no role default; do not grant it to anyone until staff MFA exists, and the owner path (fully MFA-enforced) is unaffected. Owner decision needed: accept this mitigation, or commission staff MFA first.
2. **Hosted owner recognition is unverified.** Whether the hosted backend recognises `jimmythemugo@gmail.com` as owner (legacy `WEBHOIST_EMAIL`, or owner tables) cannot be read from here (the owner's row has legacy role `dealer`, status `pending`, no owner tables). If recognition is missing, no code can give the owner a recovery lane; Operation B's precondition #3 covers this. Operation A (SQL) is independent of it.

Neither blocker is a local code defect, and neither stops you from approving Operation A. Operation B can be approved once you accept blocker 1's mitigation and confirm blocker 2.

## Other known limitations (accurate, not hidden)
- **Sockets:** already-open realtime (WebSocket) connections are not forcibly closed or re-evaluated when maintenance starts; HTTP access is cut immediately.
- **Cache lag:** each backend instance caches the maintenance flag ~10 s (dealer-team lookup also 10 s). Changes can lag up to ~10 s on other instances; the control plane always reads the database directly.
- **Registration pause is coarse:** under `buyers_sellers`, `ordinary_users` and `global`, all anonymous `POST /auth/register` is paused (the backend cannot know the registrant's intended audience).
- **Password-reset/verification flows are not paused** (they are not signed-in functions and are needed to recover accounts).
- **Settings-read failure fails open for ordinary traffic** (pre-existing choice to keep the marketplace up); the control `status` reports the store failure honestly.
- **Authenticator interoperability:** MFA was exercised with KAYAD's own RFC 6238 implementation, not a physical authenticator app.
- **Hosted PostgREST:** the compare-and-swap uses a JSON-path filter verified on local PostgREST; confirm with post-deploy test #4.
- **Node version:** local runs used Node 22.23.4 vs the pinned 22.22.2.
- **Two validators** fail only for missing credentials (`validate:communications:providers`, `validate:live-runtime`).
- **Older incident documents** (`KAYAD_INCIDENT_20261027_*`) describe the superseded owner-only lane; this package's plan replaces their "Op 2".

## What is NOT claimed
Hosted login, hosted recovery or deployment success is not claimed. Nothing hosted was changed.
