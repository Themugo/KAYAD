# KAYAD Stage 4 → Stage 5 Handoff

**Next foundation:** `KAYAD-STAGE4-COMPLETION-20261014.zip` (see external checksum file).  
**Stage 4 decision:** NO-GO for launch; usable as the next engineering foundation after integrity verification.

## Do not restart

Continue from this package. Preserve the KAYAD architecture, migrations, Stage 2/3 security fixes, Stage 3 fail-closed migration safeguards, seller role policy, canonical communication gateway, current design and existing reports. Do not create a parallel marketplace or repeat source audits that already have passing static evidence.

## Stage 5 completion order

1. Provision/use Node.js `22.22.2` and an environment with npm registry access. Run `npm ci` from the existing lockfile. Do not work around engine constraints by changing `engines` or `.nvmrc`.
2. Run `npm run typecheck`, `npm run build`, backend boot validation, Jest, Vitest and Playwright. Capture actual counts and failures; fix root causes in the same pass and rerun affected suites.
3. Use the retained `runbooks/STAGE3_SCHEMA_ONLY_REHEARSAL_RUNBOOK_20261013.md` with a disposable PostgreSQL 17-compatible database. Reconcile existing schema/migration evidence; do not apply staging/production migrations or repair history without explicit approval.
4. Run authorized, read-only staging runtime/schema preflight and record frontend/backend build identity, health/readiness, required schema objects and migration history.
5. Obtain explicit authorization for a controlled Brevo test and real Cloudinary upload/retrieval test. Use an approved recipient and non-public staging listing; distinguish provider acceptance from confirmed delivery.
6. Exercise both seller roles through registration, verification, onboarding, entitlement, upload, listing submission, admin review, publication and correlated audit trail.
7. Produce one consolidated certification report and a fresh complete ZIP. Do not declare GO while a production-critical gate is blocked or unverified.

## Exact current blockers

- Runtime available in this execution: Node `v22.16.0`, required `v22.22.2`.
- npm registry retrieval failed with `EAI_AGAIN`; no complete dependency installation.
- PostgreSQL client/server binaries unavailable in this workspace.
- No authorized current staging URLs/schema export or hosted runtime evidence were available.
- Brevo and Cloudinary credentials/provider-test authorization were unavailable; no real provider side effects were attempted.

## Safe actions already completed

- Sensitive email metadata now validates values rather than trusting allowlisted key names.
- Verification/reset subjects and rendered content are not persisted in the communications metadata.
- Provider acceptance is not logged as confirmed delivery.
- New source regression assertions pass 8/8.

**Stage 5's first gate:** establish the pinned runtime and full dependency installation, then complete the executable regression pass before any hosted schema operation.
