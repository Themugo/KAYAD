# Operations and Release Guide — Phase 14

## Scope and status
This is a repository orientation guide, not an authorization to deploy. Phase 14 did not access or change production systems, hosting environments, databases, secrets, or payment providers.

## Configuration locations observed
- `.github/`: repository workflow definitions, if present.
- `helm/`, `k8s/`, `nginx/`, `grafana/`: infrastructure/observability configuration directories.
- `supabase/`: database platform-related files.
- `.env.example` and `.env.production.example`: examples; do not assume all variables are required or copy secrets into documentation.
- `runbooks/`: existing operational guidance. Read the specific runbook and confirm its currency before following it.

## Release safety
1. Confirm the exact release artifact and checksum.
2. Verify required approvals and change scope.
3. Verify environment and rollback procedures with an authorized owner.
4. Use staging before production where applicable and authorized.
5. Never run migrations, change secrets, or deploy as part of repository handover without explicit authorization.

No production release or rollback procedure was executed or independently certified in Phase 14. Existing historical release docs remain the source artifacts; verify their currency before relying on them.
