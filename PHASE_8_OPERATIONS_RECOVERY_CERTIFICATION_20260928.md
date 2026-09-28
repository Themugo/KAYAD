# KAYAD Phase 8 — Operations & Recovery Certification

## Scope
Operational hardening only. No marketplace, payment, escrow, authentication, communications, or database business logic was rebuilt.

## Changes
- Normalized structured and positional alert calls in the canonical alerting service.
- Preserved Sentry, metrics, structured logging, queue/DLQ, and worker lifecycle architecture.
- Added dependency-free backup artifact verification (`npm run verify:backup -- <file>`).
- Reconciled recovery documentation with Brevo, Africa's Talking, and Twilio.
- Replaced stale hard-coded production rollback hosts with configurable `BACKEND_URL` / `FRONTEND_URL` examples.
- Added Phase 8 operational certification gate.

## Required live drills
1. Produce a fresh Supabase/PostgreSQL backup using `scripts/backup-database.sh` or `.bat`.
2. Run `npm run verify:backup -- <backup-file>`.
3. Restore the backup into an isolated non-production database.
4. Verify migration/schema/RLS integrity and a controlled buyer/dealer smoke journey.
5. Exercise Redis/worker restart and DLQ recovery.
6. Exercise deployment rollback against a staging revision.
7. Verify Sentry/metrics/alert delivery with non-sensitive test events.

## Hard rule
A successful static certification does not claim a live backup restore, provider delivery, or rollback drill. Those require the real staging/production environment.
