# 09 — M-Pesa (Daraja) Integration Report

**Status: BLOCKED — no Daraja sandbox test performed. No real money involved. No success simulated or claimed.**

Checked 2026-11-22: no `MPESA_*` variables in the session; `sandbox.safaricom.co.ke` unreachable from the sandbox.

## Verified locally only (locally constructed payloads — not Safaricom)
STK amount comes from server state (browser never authoritative); callback success/failure/timeout handling, replay and duplicate-receipt idempotency, escrow funding/release/refund ledger postings, B2C lifecycle SQL, reconciliation — via Jest and DB journeys. Free-listing idempotency work (01) has **no financial side effects**: paid-listing path replay verified to create no second reservation/charge in journey 15.

## Environment checklist (names found in backend code)
`MPESA_ENV` (=sandbox), `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY`, `MPESA_CALLBACK_URL`, `MPESA_WEBHOOK_SECRET`, `MPESA_B2C_INITIATOR`, `MPESA_B2C_INITIATOR_PW`, `MPESA_B2C_SHORTCODE`, `MPESA_B2C_CALLBACK_URL`, `MPESA_B2C_TIMEOUT_URL`, optional `MPESA_TRUSTED_PROXY_CIDRS`, `MPESA_EXTRA_IPS`, `MPESA_B2C_REMARKS`, `MPESA_B2C_OCCASION`. **`MPESA_SKIP_IP_CHECK` must never be set outside local tests.** All unset. Public HTTPS tunnel required for callbacks.

## Reproducible commands (once unblocked)
```
set MPESA_ENV=sandbox
set MPESA_CONSUMER_KEY=<sandbox key>
set MPESA_CONSUMER_SECRET=<sandbox secret>
cd backend && npm run dev
```
Use Daraja test MSISDN 254708374149 and the documented sandbox PINs only.

## Test-data matrix
| # | Case | Expected | Local payload | Sandbox |
|---|---|---|---|---|
| 1 | STK push, amount from server | ResultCode 0, one payment row | VERIFIED | NOT TESTED |
| 2 | User cancels (1032) | payment failed, no ledger | VERIFIED | NOT TESTED |
| 3 | Timeout / no callback | pending→expired via reconcile | VERIFIED | NOT TESTED |
| 4 | Duplicate callback | idempotent, one posting | VERIFIED | NOT TESTED |
| 5 | Callback with tampered amount | rejected/flagged | VERIFIED | NOT TESTED |
| 6 | Callback from non-Safaricom IP | rejected | VERIFIED | NOT TESTED |
| 7 | Escrow fund → release | ledger balanced | VERIFIED | NOT TESTED |
| 8 | Refund | ledger balanced | VERIFIED | NOT TESTED |
| 9 | B2C result success/failure/timeout | payout state correct | VERIFIED | NOT TESTED |
| 10 | Paid listing retry (same key) | no second charge | VERIFIED (DB) | NOT TESTED |

## Implementation gaps
Real payload-shape/signature confirmation; payout destination authority pending D-18/D-19 (not changed).
