# Staging & Production Certification Runbook
Nothing here has been executed against production.
1. Staging DB: create branch/clone, apply `supabase/migrations` newer than 20260922 in filename order (list in evidence/allareas/unapplied_source_migrations.txt) plus R12/R14; run `get_advisors` security/performance; confirm auction_setups, auctions exist; run auction setup→publish→bid→settle journey.
2. Provider: with Daraja sandbox credentials, run STK push → callback; verify one payment settles once (replay callback → no double credit), amount mismatch rejected, ledger debits=credits.
3. Topology: discover ingress/proxy peer CIDR; set MPESA_TRUSTED_PROXY_CIDRS; confirm a forged X-Forwarded-For from a non-proxy peer is rejected and a real Safaricom callback through ingress is accepted. Confirm MPESA_ENV=production.
4. Deploy artifacts: `helm template` and `kubectl apply --dry-run=server` with real values; verify Secret keys match Deployment refs; ingress rewrite check against real ingress-nginx.
5. Authz smoke: unauthenticated GET /api/marketplace-health/summary and /api/users/search → 401; admin → 200.
6. Production: backup, apply migrations in a window, re-run smoke, then enable.
Gates: source CERTIFIED (this ZIP); staging NOT RUN; provider NOT RUN; production NOT CERTIFIED.
