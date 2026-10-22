# Operations and Release Guide — Phase 13

## Safety boundary
This is a repository handover document, not an operational runbook certification. No production settings, hosting configuration, secrets, database state, payment state, or deployments were changed.

## Release review checklist
- Identify the exact checkpoint and verify its SHA-256 sidecar.
- Review the repository's actual CI/deployment workflows and their required approvals.
- Verify environment variables against `.env.example` or related example files; never copy secret values into this guide.
- Require explicit approval for database migrations, RLS changes, payment changes, webhook changes, or production deployment.
- Preserve rollback artifacts and confirm a rollback procedure before release.
- Record test evidence with command, environment, timestamp, result, and artifact path.

## Unknowns
Phase 13 did not authenticate external hosting workflows, verify current production configuration, execute deployment, or validate rollback in a live environment. Consult the relevant authorized maintainer before any operational action.
