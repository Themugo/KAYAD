# KAYAD Phase 38 — Gap & Risk Register

Findings from this phase only, continuing the numbering from R22 (Phase 37's last). For R1–R17 (prior dealer-platform mission) and R18–R22 (Phase 37), see `KAYAD_DEALER_GAP_AND_RISK_REGISTER.md` and `KAYAD_PHASE37_GAP_AND_RISK_REGISTER.md`, unchanged in this delivery.

## Source baseline

This phase started from `kayad-phase37-runtime-convergence.zip` (SHA-256 `25acdce3f06c259f2a06678d5615799ac685c4db24973d2f777bdd98bf19ae12`), verified against its sidecar before extraction (`sha256sum -c`: OK) and CRC-checked (`unzip -t`: no errors). Both confirmed before any file was touched, per the brief's rule to stop on a mismatch.

## R23 — CRITICAL — k8s backend Deployment missing env vars its own backend hard-requires to start

**Finding.** `backend/utils/env.js`'s `validateEnv()` throws (and `server.js` calls `process.exit(1)` on that throw) in production unless `FRONTEND_URL`, `BACKEND_URL`, `REFRESH_TOKEN_SECRET`, `SESSION_SECRET`, `BREVO_API_KEY`, and `BREVO_FROM_EMAIL` are all set. `k8s/backend/deployment.yaml` never supplied any of them, and never consumed its own `k8s/backend/configmap.yaml` at all (no `envFrom` anywhere) — that ConfigMap was dead weight. Every pod deployed from these manifests as shipped would crash-loop before ever binding to its port.

**Evidence.** Ran `validateEnv()` directly against the exact env set the unfixed manifest provided:
```
❌ Missing production-required env: FRONTEND_URL
❌ Missing production-required env: BACKEND_URL
❌ Missing production-required env: REFRESH_TOKEN_SECRET
❌ Missing production-required env: SESSION_SECRET
❌ Missing core production env: BREVO_API_KEY
❌ Missing core production env: BREVO_FROM_EMAIL
STARTUP WOULD FAIL: Environment validation failed — fix missing vars above
```
This is real code execution against the real manifest's env set, not inference from reading the YAML.

**Fix.** `k8s/backend/configmap.yaml`: added `FRONTEND_URL`, `BACKEND_URL`, `BREVO_FROM_EMAIL` (public values, not secrets). `k8s/backend/deployment.yaml`: added `envFrom: [configMapRef: kayad-backend-config]` (previously absent entirely) plus `secretKeyRef` entries for `REFRESH_TOKEN_SECRET`, `SESSION_SECRET`, `BREVO_API_KEY`, and `MPESA_SHORTCODE` (the fourth M-Pesa credential, required alongside the three already wired for the integration to function, not just to pass startup validation). `k8s/backend/secret.yaml`: its one-line `kubectl create secret` hint only showed 2 of the (now) 15 required keys — expanded to the complete, exact command. Re-ran `validateEnv()` against the corrected full env set: `✅ Env validated — PASSED, server would proceed to bind`.

Same root cause, parallel manifest: `helm/kayad-backend/values.yaml` and its `templates/deployment.yaml`/`templates/secret.yaml` had the identical gap (shipped `env:`/`secrets:` defaults never included these keys at all). Fixed the same way — added documented empty placeholders under `env:`/`secrets:` and the matching `secretKeyRef`/`env` wiring in the templates. Helm template rendering itself could not be verified live in this sandbox (`helm` binary unreachable — `get.helm.sh` is not on this sandbox's proxy allowlist); the Go-template brace balance was checked manually (22 open / 22 close in `deployment.yaml`, 21/21 in `secret.yaml`) and `values.yaml` was confirmed to still parse as plain YAML with all new keys present. **Live Helm `template`/`install --dry-run` verification is BLOCKED by this sandbox's network allowlist, not performed, and not claimed.**

**Regression test.** `backend/tests/regression/phase38DeploymentRuntimeReconciliation.test.js` — asserts every required var is supplied by the Deployment's `env` or the ConfigMap it now consumes. Confirmed this test fails against the original (pre-fix) manifest and passes against the fixed one (verified both directions directly, not just written and trusted).

## R24 — INFORMATIONAL — Helm chart's email/SMS secret fields are wired to nothing

**Finding.** `helm/kayad-backend/values.yaml`'s `secrets.emailSmtpHost/Port/User/Password` and `secrets.smsApiKey/smsApiSecret`, and the matching keys the Secret template writes, are never read by any backend code under those names (project-wide grep: zero matches). A deployer who fills these in gets a Kubernetes Secret object with those keys, but the value never reaches the running container as an env var — no functional email/SMS behavior results. The backend's real vars are `BREVO_API_KEY`/`BREVO_FROM_EMAIL` (email, now wired as part of R23) and `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN`/`TWILIO_WHATSAPP_NUMBER` plus `AT_API_KEY`/`AT_USERNAME` (SMS/WhatsApp — not modeled in this chart at all).

**Handling.** Not silently deleted or silently "fixed" by guessing an intended mapping, since a deployer's existing values file may already set these fields expecting them to do something (removing without warning could mask that confusion further). Documented in place with a comment explaining exactly what's dead and what the real env vars are, and flagged for your decision: rename to match reality, or add the missing Twilio/Africa's Talking fields this chart currently has no slot for at all.

## R25 — CRITICAL — M-Pesa IP whitelist can be bypassed with a forged header (financial-fraud path)

**Finding.** `backend/middleware/mpesaSecurity.js`'s `getClientIp()` read the **first** (leftmost) entry of the raw `X-Forwarded-For` header to decide whether a callback came from a real Safaricom IP. The standalone load-balancer config this repo ships, `nginx/nginx.conf`, uses `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;` — which **appends** to whatever `X-Forwarded-For` the client sent, it never overwrites it. `backend/server.js` already sets `app.set("trust proxy", 1)`, which correctly configures Express's own `req.ip` to resist exactly this spoofing — but `mpesaSecurity.js` never used `req.ip`; it re-implemented (incorrectly) the same calculation by hand.

**Impact.** Any external caller — not Safaricom — could POST a forged M-Pesa callback to `/api/payments/callback` or `/api/bids/mpesa/callback` with a header like `X-Forwarded-For: 196.201.214.200` (a real, documented production Safaricom IP) and pass the authenticity check entirely, with no signature of any kind required beyond that header. Downstream, `services/paymentCallback.service.js` would then treat the forged callback as a genuine payment confirmation — amount-matching and the atomic claim logic there are sound, but all of that assumes the caller really is Safaricom, which this check failed to establish. This is the single highest-severity finding across Phase 37 and 38: a direct path to marking a payment "success"/releasing escrow with no money ever having moved.

**Evidence.** Built a real, running Express server with the exact same `trust proxy: 1` configuration as `backend/server.js`, sent a request with `X-Forwarded-For: 196.201.214.200, 203.0.113.99` (simulating a forged prefix followed by the real attacker IP a proxy would append):
```
{"express_req_ip":"203.0.113.99","manual_getClientIp":"196.201.214.200","raw_xff_header":"196.201.214.200, 203.0.113.99"}
```
`req.ip` correctly resolved the real caller (`203.0.113.99`); the vulnerable function returned the attacker's forged value (`196.201.214.200`) — which is in the whitelist.

**Fix.** `getClientIp` now simply returns `req.ip || req.socket.remoteAddress || ""`. Confirmed the fix does not change behavior for the legitimate case (real Safaricom IPs still whitelisted correctly — all 14 payment/bid/M-Pesa Jest suites, 98 tests, pass unchanged) and confirmed via the same real-server test that `req.ip` resists the forged-prefix attack.

**Not vulnerable (checked, no fix needed):** `services/escrowAuditService.js`'s own `getClientIp` checks `req.ip` **first** (`req.ip || req.headers["x-forwarded-for"]...`), and Express always populates `req.ip` for a real request, so its XFF fallback is unreachable dead code in practice — this one was already safe.

**Regression test.** `backend/tests/regression/phase38DeploymentRuntimeReconciliation.test.js` — asserts `getClientIp` uses `req.ip` and no longer matches the vulnerable raw-header pattern. Confirmed this test fails when the vulnerable code is restored and passes against the fix (verified both directions).

## Workstream A — ingress routing re-verified empirically (not just re-read)

Rather than re-trust the Phase 37 source-level reasoning about ingress-nginx's rewrite/regex semantics, this phase built a real nginx instance running the exact location/rewrite blocks ingress-nginx generates for this manifest's annotations, with two mock backends standing in for `kayad-frontend`/`kayad-backend`, and sent real HTTP requests through it:

| Request | Result |
|---|---|
| `kayad.space /` | → frontend, path `/` (unchanged) |
| `kayad.space /dealer/dashboard` | → frontend, path `/dealer/dashboard` (unchanged — SPA client routes survive) |
| `api.kayad.space /api/cars/123` | → backend, path `/api/cars/123` (unchanged) |
| `api.kayad.space /health` | → backend, path `/health` (unchanged) |
| `webhooks.kayad.space POST /api/bids/mpesa/callback` | → backend, path preserved (the R18-fixed path) |
| `webhooks.kayad.space POST /mpesa/callback` (the old, pre-fix path) | **404** — correctly no longer routes anywhere, confirming R18 actually closed the gap rather than leaving a second way in |

This satisfies the brief's own standard ("a source-level path match is not proof of live ingress behavior") by testing actual proxy behavior, while still disclosing honestly that this is a faithful **replica** of ingress-nginx's generated config on a real nginx binary, not a live Kubernetes cluster or a cloud provider's managed ingress controller — no live or staging ingress-nginx deployment was available in this sandbox, so a true end-to-end live-cluster test remains **UNVERIFIED** (not claimed as PASS).

Also confirmed: `k8s/backend/service.yaml`'s `port: 80 → targetPort: 5000` matches the Deployment's `containerPort: 5000` and `PORT: "5000"` env value exactly; `k8s/frontend/service.yaml`'s `port: 80 → targetPort: 80` is consistent with a static frontend image serving on 80. The liveness/readiness probe path `/health` was already confirmed to be a real, correctly-registered route returning a real response in Phase 37's baseline test.

## Workstream D — CORS (R20) — kept inactive, as instructed; effective behavior now has real evidence behind it

Per this phase's explicit instruction, the ingress CORS annotations remain untouched (still inactive, no `enable-cors`). Rather than leave the question purely theoretical, the real backend (`bootstrap.js`) was started with a full, valid production env set and sent real preflight/request traffic:

- **Allowed origin** (`https://www.kayad.space`) OPTIONS preflight → `204`, with correct `Access-Control-Allow-Origin`, `-Credentials: true`, `-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS`, `-Headers: Content-Type,Authorization,X-Requested-By,X-CSRF-Token,X-XSRF-Token`, `-Max-Age: 600`.
- **A Vercel preview-deployment origin** (`https://kayad-space.vercel.app`) → also correctly allowed (the app-layer regex the static ingress annotation cannot express).
- **A disallowed origin** (`https://evil.example.com`) → `500`, no CORS headers at all, and a sanitized error body (`{"success":false,"message":"Internal server error","requestId":"..."}` — no stack trace or internal detail leaked).
- **M-Pesa webhook routes with no `Origin` header** (how Safaricom actually calls them — a server-to-server POST, not a browser request) → CORS policy has **no effect at all**; both `/api/payments/callback` and `/api/bids/mpesa/callback` returned `200` regardless of the CORS allow/deny decision, because `cors` middleware only short-circuits an `OPTIONS` preflight — a normal POST with no `Origin` still reaches the route handler.

**Recommendation:** do not activate the ingress-level CORS annotations. The application layer already implements the correct, complete policy (including the Vercel-preview pattern the static ingress list cannot express), and it demonstrably does not interfere with the webhook/callback paths the brief was concerned about. Turning the ingress annotation on would add a second enforcement point that could drift out of sync with `server.js`'s own list over time, for no behavior the app doesn't already provide correctly. This is a recommendation backed by real traffic through the real backend, not a guess — but it was not tested against a live ingress-nginx controller itself (same sandbox limitation as Workstream A), so "ingress-level CORS, if ever activated, behaves as expected" specifically remains UNVERIFIED.

## Workstream C — secrets scanning actually detects a real secret shape

Phase 37 wired `gitleaks` into CI but only confirmed it ran clean against this repo. This phase additionally proved the scanner isn't a no-op: ran the real gitleaks v8.21.2 binary with this repo's own `.gitleaks.toml` against a throwaway fixture containing the well-known AWS documentation placeholder key `AKIAIOSFODNN7EXAMPLE` (never a real credential) — result: `leaks found: 1`, rule `aws-access-key`, exit code 1. The scanner fires correctly on a recognizable secret shape using the checked-in config, exactly as the brief asks to confirm, without ever using or exposing a real secret.

## Workstream E — R12/R14, re-confirmed, not re-litigated

Per the brief's own rule against repeating closed investigations without new evidence, this phase did not redo the prior mission's full local-Postgres staging exercise (`KAYAD_DEALER_R12_R14_STAGING_VERIFICATION_REPORT.md`, unchanged, carried through). It did confirm: both migration files are byte-identical to the already-verified versions (`diff`, zero output both files), and a fresh **read-only** live query against the production Supabase project confirms both are still correctly unapplied — the `dealers` table still lacks the four onboarding columns, and the `verification_status` CHECK constraint still only allows `pending/approved/rejected`. No drift since Phase 37. **Still BLOCKED, not applied, pending your explicit authorization** — nothing in this phase changes that.

## Observation (not a defect) — this repo ships two parallel deployment paths

The existing `validate:deployment-readiness` and `validate:deployment-runtime-drift` scripts (both pass, 14/14 and 17/17) check a **Render (backend) + Vercel (frontend)** deployment path — Docker entrypoint checks, Render env-var wiring, Vercel CLI pinning — entirely separate from the `k8s/`/`helm/` manifests this phase's fixes live in. Both appear to be real, intentional, independently-maintained deployment options for this codebase, not one stale and one live. This phase's fixes (R23–R25) matter regardless of which path is actually in production use, since a real defect in shipped infrastructure-as-code is worth fixing whether or not it's this week's active path — but it's worth you confirming which one (if either, or both) actually serves `kayad.space` today, since that determines where to prioritize applying these manifest changes.
