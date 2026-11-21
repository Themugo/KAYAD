# KAYAD Disaster Recovery

Source of truth for recovery targets and procedures. Each scenario has a detailed runbook under `runbooks/`; this page is the index and the decision summary. Written 2026-11-15 from the existing runbooks and backup scripts (the earlier copy was not in the supplied archive). The recovery targets below are copied from those runbooks; nothing here has been rehearsed against production.

## Recovery targets

| Scenario | Severity | RTO | RPO | Runbook |
|---|---|---|---|---|
| Database failure / data loss | Critical | 1 hour | 15 minutes | `runbooks/database-failure.md` |
| Bad deployment | Critical | 15 minutes | 0 | `runbooks/deployment-rollback.md` |
| Cache failure | Medium | 5 minutes | 0 | `runbooks/cache-failure.md` |
| Third-party outage (M-Pesa, Cloudinary, Brevo, Twilio, Sentry) | Variable | Variable (M-Pesa: 2 hours) | n/a | `runbooks/third-party-outage.md` |

## Backups
- `scripts/backup-database.sh` (Linux/macOS) and `scripts/backup-database.bat` (Windows) take a Supabase/PostgreSQL dump. They need the Supabase CLI and `SUPABASE_DB_URL`, and keep 7 days locally.
- `scripts/verify-backup-artifact.mjs` checks that a dump is complete before it is trusted.
- The 15-minute RPO depends on the Supabase project's point-in-time-recovery setting, which must be enabled on the hosted plan. Confirm it in the Supabase dashboard. It cannot be verified from the repository.

## Decision summary
1. Confirm the scope: database, application deploy, cache, or a third party. Use the status pages and Sentry first.
2. Deploy problem: roll back using `runbooks/deployment-rollback.md`. Set `BACKEND_URL` and `FRONTEND_URL` for the health checks.
3. Database problem: follow `runbooks/database-failure.md`. Restore into a new project first and verify before switching traffic.
4. Provider outage: enable maintenance or fallback behaviour for that feature only (payments, images, email, SMS). Transactional email runs on Brevo.
5. Record the incident and its timeline, then review the runbook that was used.

## Owner responsibilities
- Applying migrations, restoring data and switching production traffic are owner-run actions and are never automated from this repository.
- Review these runbooks quarterly (the `last-reviewed` field in each runbook's header).
