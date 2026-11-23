# KAYARD KE — combined project (2026-11-23)
Base commit bfe3735 + kayard-release-consistency-v3.patch + kayard-dealer-command-centre-v2.patch + kayard-registration-email-repair-v1.patch (applied in that order). Not committed, not deployed; no hosted migration applied.
Local checks (not production verification): `tsc --noEmit` clean; full backend suite 254 suites passed (1 skipped), 4,216 tests passed (21 skipped). Frontend suite and DB journey gate were NOT re-run on this combined tree.
Install: `npm ci` in the root and in `backend/`. Pre-deployment review: `docs/handover/PRE-DEPLOYMENT-20261122/`. Do not apply `supabase/migrations/20261122200000_restore_register_identity_atomic.sql` before reading it.
