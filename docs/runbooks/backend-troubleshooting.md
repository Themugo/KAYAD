# Backend Troubleshooting Entry Point

This page is an index, not a replacement for environment-specific runbooks. Confirm the deployed commit, environment and secrets with the service owner before changing production.

- [Backend tests and local setup](../../backend/TESTING.md)
- [Backend API OpenAPI contract](../../backend/openapi.yaml)
- [Backend runtime recovery audit](../production/KAYAD-BACKEND-RUNTIME-RECOVERY-AUDIT.md)
- [Deployment failure runbook](deployment-failure.md)
- [Infrastructure outage runbook](infrastructure-outage.md)
- [Observability guide](../OBSERVABILITY.md)

## Minimum triage

1. Capture the deployment ID/commit, timestamp, request path and sanitized error logs.
2. Check the platform's health endpoint and runtime logs; do not publish raw environment values or tokens.
3. Confirm database and Redis connectivity without running destructive commands.
4. Compare runtime configuration to the documented environment variable names.
5. If a payment, auction or ownership transaction may be affected, stop manual retries until idempotency and ledger state are verified.
6. Record the incident, owner, customer impact, mitigation and follow-up test evidence.
