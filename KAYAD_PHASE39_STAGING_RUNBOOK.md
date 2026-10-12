# Phase 39 Staging Runbook — R25 Proxy Trust and R23 Deployment

## Safety

Use an isolated staging cluster and non-financial test transactions. Do not change production resources, DNS, provider settings, or production databases as part of this runbook.

## 1. Configure trusted ingress peer CIDRs

1. Inspect the actual ingress-controller deployment and cluster networking to identify the source addresses observed by backend pods.
2. Determine the smallest correct CIDR set for ingress-controller peers only. Verify that frontend and other workload pod ranges are not unintentionally trusted.
3. Set `MPESA_TRUSTED_PROXY_CIDRS` in the staging backend ConfigMap/Helm values to those verified ranges.
4. If the ingress controller's source address behavior cannot be established, leave the setting blank. Blank configuration is intentionally fail-closed and M-Pesa callbacks will be rejected.
5. Apply changes only to staging and restart/reload the staging backend as required.

Do not use a broad cluster CIDR without proving it excludes untrusted workloads. A value copied from another cluster is not evidence.

## 2. Run regression tests

With Node.js >=22.22.2 and dependencies installed from the existing lockfile:

```bash
cd backend
npm ci
npm run test:phase39-mpesa-proxy-regression
npm test
```

The targeted tests must show that a direct HTTP request with a forged `X-Forwarded-For: 196.201.214.200` is rejected when its socket peer is not trusted; malformed CIDR configuration must fail closed; and the trusted-proxy branch is only reachable for a peer inside the configured ranges.

## 3. Validate deployment configuration

```bash
cd ..
node scripts/validate-phase39-deployment-security.mjs
helm lint helm/kayad-backend
helm template kayad-backend helm/kayad-backend \
  --namespace kayad-staging \
  --set env.FRONTEND_URL=https://staging.example.invalid \
  --set env.BACKEND_URL=https://api-staging.example.invalid
```

Supply staging secrets through the team's approved secret-management mechanism; do not paste real values into shell history, reports, or CI logs. Inspect the rendered Deployment environment references and Secret keys without printing values.

## 4. Staging traffic checks

- Send an external-style callback request through staging ingress with a forged XFF prefix and confirm the backend identifies the source appended by the proxy, not the forged prefix.
- Attempt a direct request from a staging frontend pod to the backend with a forged whitelisted IP and confirm it is rejected.
- Test an allowed test fixture only from a verified trusted proxy peer. Do not represent a synthetic request as a real Safaricom callback.
- Confirm the callback authenticity, amount/currency, transaction correlation, and idempotency layers remain enabled.
- Verify `/health`, the M-Pesa callback path, and expected methods through ingress.

## 5. Secret scanning

Run the gitleaks binary with the repository configuration and verify CI fails on a controlled non-sensitive test fixture. Remove the fixture immediately and retain only sanitized output.

## 6. Production gate

No production rollout is authorized by this report. Before a separately approved rollout, review the staging evidence, actual CIDR value, rendered manifests, rollback plan, and monitoring. R12/R14 migrations remain outside this phase and must not be applied without explicit authorization.
