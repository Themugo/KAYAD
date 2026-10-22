# KAYAD Phase 39 — Critical Security Regression & Deployment Certification

**Date:** 2026-10-12  
**Status:** PARTIAL — source hardening and configuration checks completed; runtime certification is blocked by the available environment.

## 1. Foundation

- Archive: `KAYAD-PHASE38-DEPLOYMENT-RUNTIME-CERTIFICATION-20261012.zip`
- SHA-256 calculated from the uploaded archive: `6553b879b9ba3c88a5ce5f5a70580b67e34f39cb63e9dfc34ce9725636e76466`
- `unzip -t`: PASS — no compressed-data errors.
- Checksum sidecar: not supplied with this upload. The calculated hash is the verified baseline; no sidecar match is claimed.
- Work was performed in an isolated extracted copy. The original archive was not modified.
- No commit, push, deployment, production database mutation, or live payment was performed.

## 2. New R25 finding

Phase 38 changed the whitelist to use `req.ip`, but the regression suite only asserted that `req.ip` and a `trust proxy` setting existed. The server uses `app.set("trust proxy", 1)`, and the Kubernetes network policy allows backend ingress from both the ingress-controller namespace and frontend pods. A one-hop setting alone does not prove every caller passed through a trusted proxy.

### Fix implemented

`mpesaSecurity.js` now requires the immediate socket peer to match an explicit `MPESA_TRUSTED_PROXY_CIDRS` allowlist before it honors `req.ip`. If the variable is absent, malformed, or the peer is not trusted, it uses the socket peer address instead of any forwarded identity. Since the socket peer is not a Safaricom address in those cases, the callback allowlist rejects it.

The setting is exposed in the Kubernetes ConfigMap and Helm values with an empty default. The deployment operator must supply the actual ingress-controller peer CIDRs after verifying cluster topology. This is deliberately fail-closed; M-Pesa callback availability through the proxy remains BLOCKED until configured and tested. A broad cluster CIDR must not be used without proving it excludes untrusted workloads.

A Jest regression file was added for spoofed XFF, trusted-peer gating, malformed CIDRs, and a real local Express HTTP request. The test source passes Node syntax checks, but the Jest suite was not executed in this environment.

## 3. R23 / deployment configuration

- `MPESA_ENV=production` is now explicit in both Kubernetes and Helm production defaults; this avoids relying on the middleware's sandbox default when `MPESA_ENV` is absent.
- `MPESA_TRUSTED_PROXY_CIDRS` is documented as an environment-specific setting with a fail-closed blank default.
- Kubernetes ConfigMap consumption remains present.
- Required environment coverage was checked against `backend/utils/env.js` using the parsed Kubernetes ConfigMap and Deployment: PASS for the enumerated required variables.
- A sanitized call to the real `validateEnv()` passed with the required environment populated; removing `BREVO_API_KEY` caused validation to reject the environment as expected. No real credentials were used.
- Helm secret template values now use `quote` to protect YAML output when secret values contain metacharacters.
- Helm template rendering was not executed because the Helm binary is unavailable. No Helm-render PASS is claimed.

## 4. Ingress and CI

- `k8s/ingress.yaml` parses as two YAML documents.
- Source/config validator checks the R18 callback path and R19 rewrite capture reference: PASS.
- The Phase 38 report's standalone-nginx test is preserved as inherited evidence; it was not independently rerun in Phase 39. Standalone nginx evidence is not equivalent to testing a live ingress-nginx controller.
- CI source inspection confirms `.github/workflows/security.yml` invokes `gitleaks/gitleaks-action@v2` using `.gitleaks.toml`: PASS by source inspection.
- Gitleaks was not installed in this environment, so a new binary scan was not executed. The Phase 38 raw scan report is preserved; it is not represented as a new Phase 39 scan.

## 5. Commands and results

| Command/check | Result | Notes |
|---|---|---|
| `sha256sum` on uploaded ZIP | PASS | Calculated hash recorded above. |
| `unzip -t` | PASS | No archive errors. |
| `node --check backend/middleware/mpesaSecurity.js` | PASS | Syntax only, not runtime behavior. |
| `node --check backend/tests/regression/phase39MpesaTrustedProxy.test.js` | PASS | Test file syntax only. |
| `node --check backend/tests/regression/phase38DeploymentRuntimeReconciliation.test.js` | PASS | Test file syntax only. |
| `node scripts/validate-phase39-deployment-security.mjs` | PASS | 15/15 source/config contract checks. |
| `node scripts/validate-phase38.mjs` | PASS | Existing phase validator. |
| `node scripts/validate-deployment-readiness.mjs` | PASS | Existing validator. |
| `node scripts/validate-deployment-runtime-drift.mjs` | PASS | 17/17. |
| `node scripts/validate-phase7-security-release.mjs` | PASS | 15/15. |
| `node scripts/validate-backend-boot.mjs` | BLOCKED | Missing package `eslint` because dependencies were not installed. |
| YAML parse: Kubernetes ingress, network policies, backend ConfigMap, Deployment, Secret, Service | PASS | Parsed with PyYAML. |
| Kubernetes required environment coverage | PASS | Parsed ConfigMap + Deployment covers the enumerated production-required variable names. |
| Sanitized `validateEnv()` complete environment | PASS | Synthetic values only. |
| Sanitized `validateEnv()` with `BREVO_API_KEY` removed | PASS | Correctly rejected missing required variable. |
| `npm ci --offline --ignore-scripts --no-audit --no-fund --engine-strict=false` in `backend/` | BLOCKED | `ENOTCACHED` for zod tarball; registry package not available in local npm cache. |
| `npm ci --ignore-scripts --no-audit --no-fund` in `backend/` | BLOCKED | Attempt timed out while fetching dependencies. |
| Runtime version | BLOCKED | Available Node is v22.16.0 / npm 10.9.2; project requires Node >=22.22.2. |
| Jest / Vitest / full regression | BLOCKED | Dependencies unavailable; not claimed as passed. |
| Helm template render | BLOCKED | Helm binary unavailable. |
| Phase 39 gitleaks execution | BLOCKED | Gitleaks binary unavailable; CI wiring inspected, not executed. |
| Live ingress-nginx / live Safaricom callback | UNVERIFIED | No live cluster/provider certification performed. |

Raw validator logs are stored under `docs/audits/evidence/phase39-20261012/`.

## 6. Final status matrix

| Area | Status | Reason |
|---|---|---|
| Foundation integrity | PASS | ZIP CRC and calculated SHA-256 recorded. |
| R25 source hardening | PASS (source) | Explicit peer-CIDR gate; missing/invalid config fails closed. |
| R25 runtime regression | BLOCKED | Jest dependencies and supported Node runtime unavailable. |
| M-Pesa production callback | BLOCKED | Actual proxy CIDRs must be configured and validated; no live Safaricom test. |
| R23 Kubernetes env contract | PASS (source/config) | Parsed manifest coverage and sanitized env validator test pass. |
| Helm rendering | BLOCKED | Helm binary unavailable. |
| R18/R19 ingress source contract | PASS (source) | Route and rewrite checks pass. |
| Live ingress-nginx | UNVERIFIED | No live ingress-nginx controller test in this phase. |
| Secret scan CI wiring | PASS (source) | Workflow invokes configured gitleaks action. |
| New gitleaks scan | BLOCKED | Binary unavailable in current environment. |
| Full frontend/backend suites | BLOCKED | Dependency install blocked and Node runtime below project requirement. |
| R12/R14 production migrations | NOT AUTHORIZED / UNCHANGED | No production mutation performed. |

## 7. Required next actions before production rollout

1. Use Node.js 22.22.2 or newer and install dependencies from the existing lockfiles in a network-enabled environment.
2. Run `npm run test:phase39-mpesa-proxy-regression` in `backend/` and the full backend suites.
3. Set `MPESA_TRUSTED_PROXY_CIDRS` to the verified ingress-controller source CIDRs for the actual cluster. Do not guess or use an overbroad cluster CIDR.
4. Render Helm charts with production-like sanitized values and inspect the rendered ConfigMap, Deployment, and Secret keys.
5. Run gitleaks with the actual binary and checked-in configuration.
6. Test callback ingress and spoofed-header rejection in an isolated staging cluster; no live payment should be initiated.
7. Keep R12/R14 unapplied to production until separately authorized.
