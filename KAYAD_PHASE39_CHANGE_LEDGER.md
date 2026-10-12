# KAYAD Phase 39 — Change Ledger

**Date:** 2026-10-12  
**Foundation archive:** `KAYAD-PHASE38-DEPLOYMENT-RUNTIME-CERTIFICATION-20261012.zip`  
**Foundation SHA-256:** `6553b879b9ba3c88a5ce5f5a70580b67e34f39cb63e9dfc34ce9725636e76466`  
**Foundation integrity:** `unzip -t` passed; no checksum sidecar was supplied with this upload.  
**Scope:** isolated source workspace only; no commit, push, deployment, or production mutation.

| # | File | Change | Reason | Verification |
|---|---|---|---|---|
| 1 | `backend/middleware/mpesaSecurity.js` | Added an explicit `MPESA_TRUSTED_PROXY_CIDRS` peer gate. The middleware uses `req.ip` only when the immediate socket peer matches an explicitly configured proxy CIDR; otherwise it checks the socket peer address directly. Missing/invalid configuration fails closed. | R25: `trust proxy: 1` alone does not prove a request passed through the trusted ingress. | `node --check` PASS; source/config validator PASS. Jest/HTTP regression test added but not executed locally because dependencies could not be installed offline and runtime is below required version. |
| 2 | `backend/package.json` | Declared `proxy-addr` as a direct dependency and added `test:phase39-mpesa-proxy-regression`. | Make CIDR matching an explicit dependency and expose a targeted regression command. | JSON parse and lock consistency PASS. Full install/test BLOCKED. |
| 3 | `backend/package-lock.json` | Added `proxy-addr` to root dependency contract, using already locked version 2.0.8. | Keep manifest and lockfile consistent. | Static lock consistency PASS; clean npm install BLOCKED by unavailable registry/cache. |
| 4 | `backend/tests/regression/phase39MpesaTrustedProxy.test.js` | Added regressions for spoofed whitelisted XFF from an untrusted peer, trusted-peer gating, malformed CIDR fail-closed behavior, and a real local HTTP request using Express. | Prevent recurrence of proxy-trust bypass. | `node --check` PASS; Jest execution BLOCKED. |
| 5 | `backend/tests/regression/phase38DeploymentRuntimeReconciliation.test.js` | Replaced the weak “trust proxy exists” assertion with checks for the explicit peer gate and deployment configuration. | The old assertion did not prove direct callers were rejected. | `node --check` PASS; Jest execution BLOCKED. |
| 6 | `k8s/backend/configmap.yaml` | Explicitly sets `MPESA_ENV=production` and adds an empty-by-default `MPESA_TRUSTED_PROXY_CIDRS`. | Prevent a production Kubernetes deployment from implicitly using sandbox allowlist mode; keep callback identity fail-closed until the actual ingress peer CIDRs are supplied. | YAML parse and required-env coverage PASS. |
| 7 | `helm/kayad-backend/values.yaml` | Explicitly sets `MPESA_ENV=production` and exposes `MPESA_TRUSTED_PROXY_CIDRS` with an empty-by-default fail-closed value. | Align Helm runtime contract with Kubernetes manifest. | Source/config validator PASS; Helm rendering BLOCKED (binary unavailable). |
| 8 | `helm/kayad-backend/templates/secret.yaml` | Quotes rendered secret string values. | Prevent credential values containing YAML metacharacters from corrupting rendered manifests. | Template source check PASS; Helm rendering BLOCKED. |
| 9 | `scripts/validate-phase39-deployment-security.mjs` | Added a deterministic source/config contract validator covering R25 gating, manifests, ingress routes, Helm secret quoting, and gitleaks CI wiring. | Make critical deployment/security assumptions regression-testable in CI. | 15/15 checks PASS. |
| 10 | `package.json` | Registered `validate:phase39-deployment-security`. | Make the new validator discoverable and repeatable. | JSON parse and direct script execution PASS. |
| 11 | `KAYAD_PHASE39_*` reports and evidence | Added execution report, status matrix, runbook, and raw command evidence. | Preserve traceability and distinguish verified results from blockers. | Files included in final ZIP; archive/checksum validation performed after packaging. |

## Critical operational note

`MPESA_TRUSTED_PROXY_CIDRS` is intentionally empty by default. This is fail-closed: M-Pesa callbacks through a proxy will be rejected until the operator supplies the **actual ingress-controller peer CIDRs** for the target cluster. Do not fill it with a broad cluster CIDR without checking whether other workloads share that range. The current phase did not have cluster networking data to safely choose those CIDRs.
