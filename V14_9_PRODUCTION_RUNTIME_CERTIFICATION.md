# KAYAD V14.9 — Production Runtime Certification

V14.9 consolidates the runtime certification boundary around the existing canonical deployment verifier and live API certification harness.

## Runtime flow

1. `verify-production-deployment.mjs` verifies the deployed frontend shell, release identity, public domain and API health.
2. `certify-v14-live-api.mjs` performs the existing read-only authenticated API certification when a real certification account is supplied.
3. `certify-v14-production-runtime.mjs` orchestrates those existing checks without creating a second implementation of either verifier.

## Credential behavior

- Without `KAYAD_CERT_EMAIL` and `KAYAD_CERT_PASSWORD`, public deployment verification can complete but authenticated certification is explicitly reported as pending.
- Set `KAYAD_REQUIRE_LIVE_CERTIFICATION=true` in a certification environment to make missing authenticated credentials a hard failure.
- No synthetic production records are created by these certification tools.

## V14.9 contract changes

- Live certification contract now also verifies the public auction catalogue and subscription plans routes.
- The release candidate remains pinned to Node `>=22.22.2`.
- No duplicate service, API, worker or domain implementation was introduced.
