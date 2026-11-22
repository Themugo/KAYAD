# 11 - M-Pesa sandbox and financial end-to-end report

**Status: BLOCKED against the Daraja sandbox.** No `MPESA_*` credentials exist in this session and the workspace network allowlist does not reach Safaricom. No real money was involved or attempted; no success is simulated.

## Verified without Safaricom (disposable database, real backend)
Offer settlement, payment-correlation triggers, reconciliation issues, dealer payout lifecycle SQL, and escrow state machine are exercised by the DB journeys (05_offer_payment, 03_reconciliation_issues, legacy j4/j5) and backend Jest suites using **locally constructed callback payloads**. This proves our handlers, idempotency tables, ledger postings and constraints; it does not prove Safaricom's real payload shapes, signatures, timing or retries.

## Lifecycle matrix
| Step | Local payload tests | Daraja sandbox |
|---|---|---|
| STK push request, amount from server state | VERIFIED (amount never taken from the browser) | BLOCKED |
| Success / failure / timeout callback | VERIFIED locally | BLOCKED |
| Callback replay, duplicate receipt idempotency | VERIFIED locally | BLOCKED |
| Escrow funding, release, refund, ledger entries | VERIFIED locally | BLOCKED |
| B2C payout and result/timeout callbacks | VERIFIED locally | BLOCKED |
| Reconciliation and audit trail | VERIFIED locally | BLOCKED |

## Needed to unblock
Daraja sandbox app: `MPESA_ENV=sandbox`, consumer key/secret, shortcode and passkey, B2C initiator name and security credential, publicly reachable HTTPS callback URLs (tunnel) for `MPESA_CALLBACK_URL`, `MPESA_B2C_CALLBACK_URL`, `MPESA_B2C_TIMEOUT_URL`, and a webhook secret; network access to `sandbox.safaricom.co.ke`.

## Not touched (owner decision D-18/D-19)
The escrow payout destination (`users.phone`) was not changed; dealer saved settlement details remain unused by payouts until the owner decides. See doc 15.
