# KAYAD Phase 38 — Change Ledger

Every file changed in this phase, in the order it was changed. "Verified by" lists the real tooling run after the change — never asserted without a run. No change listed here was pushed, committed, or deployed — this session has no linked git remote; apply via the git commands at the end of this document or by extracting the delivered zip over your live checkout.

| # | File | Change | Reason (gap register ref) | Verified by |
|---|---|---|---|---|
| 1 | `k8s/backend/configmap.yaml` | Added `FRONTEND_URL`, `BACKEND_URL`, `BREVO_FROM_EMAIL`. | R23 — backend hard-requires these in production; previously absent. | `validateEnv()` run directly against the corrected full env set — PASS |
| 2 | `k8s/backend/deployment.yaml` | Added `envFrom: [configMapRef: kayad-backend-config]` (the ConfigMap was never consumed before); added `secretKeyRef` entries for `REFRESH_TOKEN_SECRET`, `SESSION_SECRET`, `BREVO_API_KEY`, `MPESA_SHORTCODE`. | R23 | same |
| 3 | `k8s/backend/secret.yaml` | Expanded the one-line `kubectl create secret` hint (previously showed 2 of 15 required keys) to the complete, exact command. | R23 | Manual cross-check against deployment.yaml's full secretKeyRef list |
| 4 | `helm/kayad-backend/values.yaml` | Added `env.FRONTEND_URL/BACKEND_URL/BREVO_FROM_EMAIL` (empty, documented placeholders) and `secrets.refreshTokenSecret/sessionSecret/brevoApiKey/mpesaShortcode`; documented the pre-existing dead `emailSmtpHost/Port/User/Password`/`smsApiKey/smsApiSecret` fields. | R23, R24 | YAML parse check (plain-YAML sections); Helm template rendering BLOCKED — `helm` binary unreachable in this sandbox |
| 5 | `helm/kayad-backend/templates/deployment.yaml` | Added `{{- if .Values.secrets.X }}` blocks for `REFRESH_TOKEN_SECRET`, `SESSION_SECRET`, `BREVO_API_KEY`, `MPESA_SHORTCODE`, mirroring the chart's existing pattern exactly. | R23 | Go-template brace balance check (22 open / 22 close) |
| 6 | `helm/kayad-backend/templates/secret.yaml` | Added the matching `stringData` keys (`refresh-token-secret`, `session-secret`, `brevo-api-key`, `mpesa-shortcode`). | R23 | Go-template brace balance check (21 open / 21 close) |
| 7 | `backend/middleware/mpesaSecurity.js` | `getClientIp()` changed from manually parsing the first entry of the raw `X-Forwarded-For` header to using Express's trust-proxy-aware `req.ip`. | R25 — CRITICAL. The old code let a forged header defeat the M-Pesa authenticity check entirely. | Live reproduction with a real Express server (both before and after the fix); 14 payment/bid/M-Pesa Jest suites (98 tests) re-run clean; full backend suite (81 suites/1179 tests) re-run clean |
| 8 | `backend/tests/regression/phase38DeploymentRuntimeReconciliation.test.js` | New regression test (11 assertions) covering R18, R19, R23, R25 — manifest/env/security reconciliation checks that a unit test alone could never catch without this phase's investigation. | Closes the exact gap the brief's Workstream A item 7 asks for. | Confirmed fails against each pre-fix original and passes against each fix, in both directions, for R18/R19 and R25 |

## What was investigated and found to need no change

- `services/escrowAuditService.js`'s own `getClientIp` — already checks `req.ip` first; its XFF fallback is dead code in practice (Express always populates `req.ip`). Not touched.
- `services/paymentCallback.service.js` — amount/currency verification, atomic claim-based idempotency, state-machine transition guards, and claim-release-on-failure logic were all read in full and found sound (this is the code R25's fix protects the authenticity check in front of). No change needed.
- `nginx/nginx.conf` — its `$proxy_add_x_forwarded_for` directive is the standard, documented nginx idiom and not itself a defect; the defect was the application trusting the wrong part of the resulting header. Not touched.
- Existing validator scripts (`validate:deployment-readiness`, `validate:deployment-runtime-drift`, `validate:phase3-infrastructure`, `validate:phase7-security-release`, `validate:dependency-security`, `validate:backend-boot`) — all re-run, all still pass (see final report §3). These check a separate Render+Vercel deployment path and did not (and could not) cover the k8s/Helm defects this phase found.

## Deliberately NOT changed (require your explicit authorization — live production database)

Unchanged from Phase 37: R12 (`dealers` onboarding columns) and R14 (`dealer_verifications` suspend constraint) remain drafted, staging-verified, and **not applied to production**. Re-confirmed live and unchanged this phase (read-only query, no mutation).

## Exact git commands (for your own clone — this session has no linked GitHub)

```bash
git status
git add k8s/backend/configmap.yaml \
        k8s/backend/deployment.yaml \
        k8s/backend/secret.yaml \
        helm/kayad-backend/values.yaml \
        helm/kayad-backend/templates/deployment.yaml \
        helm/kayad-backend/templates/secret.yaml \
        backend/middleware/mpesaSecurity.js \
        backend/tests/regression/phase38DeploymentRuntimeReconciliation.test.js \
        KAYAD_PHASE38_*.md
git commit -m "Phase 38: fix crash-on-start k8s env gap, close M-Pesa IP-whitelist spoofing bypass, add deployment/security regression test"
git push origin main
```
