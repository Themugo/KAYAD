# Staging & Production Certification Runbook
Nothing here has been executed against production.
1. Staging DB: create branch/clone, apply `supabase/migrations` newer than 20260922 in filename order (list in evidence/allareas/unapplied_source_migrations.txt) plus R12/R14; run `get_advisors` security/performance; confirm auction_setups, auctions exist; run auction setup→publish→bid→settle journey.
2. Provider: with Daraja sandbox credentials, run STK push → callback; verify one payment settles once (replay callback → no double credit), amount mismatch rejected, ledger debits=credits.
3. Topology: discover ingress/proxy peer CIDR; set MPESA_TRUSTED_PROXY_CIDRS; confirm a forged X-Forwarded-For from a non-proxy peer is rejected and a real Safaricom callback through ingress is accepted. Confirm MPESA_ENV=production.
4. Deploy artifacts: `helm template` and `kubectl apply --dry-run=server` with real values; verify Secret keys match Deployment refs; ingress rewrite check against real ingress-nginx.
5. Authz smoke: unauthenticated GET /api/marketplace-health/summary and /api/users/search → 401; admin → 200.
6. Production: backup, apply migrations in a window, re-run smoke, then enable.
Gates: source CERTIFIED (this ZIP); staging NOT RUN; provider NOT RUN; production NOT CERTIFIED.

---
# Continuation 2 - additional certification steps
A. **Reproduce locally:** `scripts/audit/replay-migrations.sh <db> <label>` after loading `scripts/audit/supabase_stubs.sql` into a throwaway PG16 (outputs `evidence/db_replay/pass_<label>.tsv`). This is a substitute; certify on a real Supabase branch.
B. **Schema capture (needs authorization):** `supabase link --project-ref <prod>` then `supabase db dump --schema public --schema-only -f captured_public.sql`; diff against `evidence/db_replay/hosted_tables.txt` / `replayed_tables.txt`; turn the 24 hosted-only tables into a baseline migration. Never `db push --include-all`.
C. **Manifest validation (any machine with the tools):** `kubeconform -strict -kubernetes-version 1.29.0 -summary k8s/**/*.yaml`; `helm lint helm/kayad-backend && helm template kayad helm/kayad-backend -f <real-values.yaml> | kubeconform -strict -summary -`; `kubectl apply --dry-run=server -f k8s/`.
D. **Authz smoke (staging):** for roles user, dealer, marketing, ghost_checker, admin: GET `/api/marketplace-health/summary` -> 401 / 403 / 403 / 403 / 200; GET `/api/users/search?q=a` -> 401 anon, no `email` field for non-admin, staff accounts absent.
E. **CI evidence:** paste the gitleaks job log for the PR and for the push to `main`; the job must pass with `GITHUB_TOKEN` provided; consider adding `pull-requests: read` to that job's `permissions` (public repo works without).
F. **Release gates status:** source = CERTIFIED for items listed PASS in the matrix; staging = NOT RUN; provider = NOT RUN; production = NOT CERTIFIED.
