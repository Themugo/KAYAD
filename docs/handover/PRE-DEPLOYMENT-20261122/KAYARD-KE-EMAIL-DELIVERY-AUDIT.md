# KAYARD KE — Email delivery audit

Date 2026-11-22. Provider acceptance is never reported as delivery. Delivery is only claimed with recipient/mailbox or webhook evidence; none was obtained in this task.

## 1. Did registration failure prevent email initiation? — Yes (confirmed by source)
Verification and welcome emails are dispatched only after the registration RPC succeeds. With the placeholder, the RPC fails before any user exists, so no email could be initiated for any new registration after the break. Hosted ledger (H): 8 `communication_deliveries` email rows, all `sent`, 0 failed, 2026-10-20 to 2026-11-09, none since. This explains the absence of new mail; it does **not** prove that mail worked or fails today.

## 2. Pipeline (S)
* Auth: custom cookie/JWT. Supabase Auth is unused (`auth.users` = 0), so Supabase Auth email templates and SMTP are irrelevant.
* Only provider: Brevo transactional API `https://api.brevo.com/v3/smtp/email` (30 s abort, retry, circuit breaker).
* Sender precedence `BREVO_FROM_EMAIL` → `EMAIL_FROM` → `noreply@kayad.space` (technical domain name).
* Statuses: queued → sent (provider accepted) → delivered (only via Brevo webhook).
* Verification/reset bodies are not persisted, so the retry cron skips them; recovery is by resend (60 s cooldown; new token committed only after provider acceptance).
* Links use `FRONTEND_URL`; production boot requires HTTPS.

## 3. Findings
| # | Finding | Status |
|---|---|---|
| E1 | Registration failure blocked email initiation | VERIFIED (source, journey 20 A) |
| E2 | Provider failure leaves the account recoverable by resend | VERIFIED (L) |
| E3 | Secrets never appear in logs/reports | VERIFIED (journey 20 H) |
| E4 | `render.yaml` sets `BREVO_FROM_NAME=KAYAD`, which does not match the brand KAYARD KE | Mismatch confirmed (S). Owner env change; **not done** |
| E5 | Brevo key validity, sender verification, domain authentication, SPF/DKIM/DMARC, quota | BLOCKED (no network route to DNS/provider; no credentials in scope) |
| E6 | Redirect URLs / production `FRONTEND_URL` value | BLOCKED (production env not readable) |
| E7 | Real verification and reset email arrival | NOT TESTED (no authorised mailbox) |
| E8 | Webhook-confirmed `delivered` status | NOT TESTED |

## 4. Tests (L, loopback Brevo stub)
Journey 20 covers send, provider rejection and recovery, resend cooldown, expiry, reset request/complete; all pass (54/54). This is evidence of code behaviour only (tier L), not of Brevo or mailbox behaviour.

## 5. Required to finish (owner)
1. Brevo: active key on Render, verified sender, authenticated domain; SPF, DKIM and DMARC records for the sending domain (owner to supply `dig`/DNS evidence).
2. Decide `BREVO_FROM_NAME` (suggest "KAYARD KE") and set it on Render.
3. Provide an authorised test mailbox; run the acceptance in the deployment plan §6 and keep the evidence (message headers, timestamps, ledger rows).
4. Optionally configure the Brevo webhook so `delivered` can be recorded.

## 6. Test results, security, safety, sequence
Test results as §4. Security: no key printed anywhere. Database safety: no hosted write. Deployment sequence and acceptance: see the deployment plan.
