# KAYAD Remaining Blockers (by severity)

## Critical / High
1. **Production DB is ~58 migrations behind source** (hosted last = 20260922; source through 20261012, incl. auction_setups publication contract, RLS enablement, client-execute revokes, ledger rebuild). `auction_setups` and `auctions` tables are absent on the hosted project, which is the root cause of the known auction_setups failure and leaves security hardening unapplied. NEEDS AUTHORIZATION: apply in staging first, in order, then production with backup. List: evidence/allareas/unapplied_source_migrations.txt. (Name-based comparison; some hosted entries use renamed versions, so verify on a staging branch before relying on exact count.)
2. R12/R14 dealer onboarding columns / suspended status not on production — NEEDS AUTHORIZATION.
3. Live M-Pesa Daraja sandbox round trip NOT RUN (no credentials). Financial release gate F cannot be called certified for provider level.

## Medium
4. Which path serves production (Render+Vercel vs k8s/Helm) unconfirmed; MPESA_TRUSTED_PROXY_CIDRS must be set to the real ingress peer CIDR once known (left blank, fail-closed — all proxied callbacks will be rejected until set).
5. Helm render, kubectl dry-run, Docker build, real ingress-nginx: BLOCKED in sandbox.
6. Two lockfile ecosystems at root (package-lock.json + bun.lock): choose one.
7. R20 (ingress CORS annotations) and R24 (dead Helm email/SMS fields) decisions pending.
8. dealer-health-score public endpoints have no frontend consumer: decide public vs protected.

## Low
9. Route matrix is heuristic (regex); false positives expected; deeper per-route IDOR review of dealer/finance/escrow domains not done this session.
10. Domains A, D, H, I, J, K received no new deep audit beyond the passing regression suites.
