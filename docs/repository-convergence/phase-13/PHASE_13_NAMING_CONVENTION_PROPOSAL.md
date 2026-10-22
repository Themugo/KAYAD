# Phase 13 — Naming Convention Proposal

## Status
Proposal only. No existing filename is renamed by this phase.

## New dated evidence artifacts
Use `KAYAD_<SCOPE>_<ARTIFACT-TYPE>_<YYYYMMDD>.<ext>` for new standalone audit, certification, and execution evidence where no established phase-specific naming contract takes precedence. Use uppercase ASCII words separated by underscores; preserve exact phase identifiers and dates.

## Maintained documentation
Prefer concise stable names such as `README.md`, `ARCHITECTURE.md`, `DEVELOPMENT.md`, `OPERATIONS.md`, `RELEASE_PROCESS.md`, and `TROUBLESHOOTING.md` only when an authoritative equivalent does not already exist. Do not create competing documents solely to fit a naming scheme.

## Governance
- Preserve historical filenames and provenance.
- Avoid `final-final`, `latest`, and `new-copy` for new artifacts.
- Use `CERTIFIED`, `FINAL`, or `PRODUCTION-READY` only where specific evidence supports the claim.
- Do not rename scripts, manifests, or referenced files without consumer analysis and exact approval.
- Keep the two support test matrices separate pending an owner decision.
- Any approved rename must record source, destination, hash, consumer analysis, approval evidence, and rollback procedure.

## Limitations
This is a policy proposal, not an assertion that every existing filename has been fully reviewed for naming consistency.
