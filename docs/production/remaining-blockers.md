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

---
# Continuation 2 - blockers (supersedes ordering above where different)
## Critical / High
1. **AA-D1 schema divergence (object-level)**: hosted lacks 16 source tables (all `auction_*`, chat outbox/idempotency, hero, purchase_outcomes, report_*), and has 24 tables with no CREATE in the repo. Do NOT `db push --include-all`. Required: (a) with authorized read access run `supabase db dump --schema public --schema-only` from production to capture the 24 hosted-only tables into a baseline migration; (b) replay on a real Supabase branch; (c) apply the 16 missing tables' migrations in order on staging then production with backup. NEEDS AUTHORIZATION.
2. **AA-A1 role breadth**: decide the role matrix for ledger/fraud/disputes/communications/reliability and listing edit/delete; then introduce a `platformAdminOnly` guard and apply with tests. Interim exposure: any staff role (incl. external `ghost_checker`) can reach `adminOnly`-only routes and edit/delete any listing.
3. R12/R14 not on production (NEEDS AUTHORIZATION) - both replay cleanly after the earlier chain.
4. Live M-Pesa Daraja round trip NOT RUN; `MPESA_TRUSTED_PROXY_CIDRS` blank (fail-closed) until ingress peer CIDR verified.
## Medium
5. GitHub Actions result for the gitleaks job UNVERIFIED (not retrievable). If a push-to-main scan flags verified placeholders (`evidence/phase37_gitleaks_report.json`, `docs/domains/INTEGRATION_GUIDE.md`, the two PHASE37/38 registers), add a **path+rule scoped** allowlist; do not blanket-allowlist.
6. Helm render / `kubectl --dry-run=server` / Docker build still BLOCKED (docker client without daemon; no helm/kubectl).
7. Which path serves production (Render+Vercel vs k8s/Helm) unconfirmed.
8. dealer-health-score public field policy; `bun.lock` removal decision; R20/R24 decisions.
## Low
9. 15 migrations are not idempotent on re-run (forward-only OK); add `IF NOT EXISTS`/`DROP ... IF EXISTS` when touching them.
10. Frontend browser journeys, background-job runtime, chat realtime and auction concurrency were NOT RUN end to end (no staging/Supabase/Redis); covered only by existing automated suites.

## Communications launch blockers (2026-10-13)
- COMMS-1 (BLOCKER, NEEDS AUTHORIZATION): production `communication_deliveries` lacks `idempotency_key`/`dead_letter` -> no email can be sent. Fix path and ORDER: see audit report C-10 and `runbooks/COMMS_STEP1..4`. NOT sufficient alone if the deployed backend is current main (registration RPC, refresh-token and users security columns are also missing in production).
- COMMS-2 (BLOCKER, operator): Brevo v3 API key, validated sender, `BREVO_FROM_EMAIL` spelling aligned (noreply@ vs no-reply@), domain authentication (SPF/DKIM/DMARC) — UNVERIFIED.
- COMMS-3 (BLOCKER, operator): monitored support mailbox / `BREVO_REPLY_TO`.
- COMMS-4: no marketing unsubscribe/suppression; do not send promotional email.
- COMMS-5: dealer submitted/rejected/missing-info emails and team-invite page+ledger are missing.
- COMMS-6: live end-to-end certification NOT RUN.
- COMMS-7 (BLOCKER): deployed backend build is unidentified; current main cannot sign in against the production schema (missing 20260930110000, 20261001090000, 20261011090000 objects). No staging exists to prove the dependent set.
