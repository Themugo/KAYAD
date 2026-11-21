# P5 — Provider-dependent journeys (2026-11-21): all BLOCKED

No sandbox credentials were available. Nothing below is claimed verified. What the disposable stack **did** verify is stated separately.

| Journey | Status | Needs | What was verified without the provider |
|---|---|---|---|
| M-Pesa STK initiation | **BLOCKED** | Daraja sandbox key/secret, shortcode, passkey, public callback URL | payment row is created with the server-determined/agreed amount before the provider call; unconfigured provider refuses cleanly (no escrow created) |
| M-Pesa callback (real) | **BLOCKED** | Daraja sandbox callback from allow-listed source | non-allow-listed callback is rejected (200 ResultCode 1) and changes nothing (VERIFIED) |
| Escrow funding (bank transfer) | **BLOCKED** | a configured custody account and a verifier (staff) flow with a real reference | settlement DB function exercised directly (SIMULATED): funded escrow amount = payment amount = agreed amount |
| Vehicle confirmation, release, refund | **NOT TESTED** end-to-end | funded escrow produced by the above | staff permission boundaries on dashboard verified |
| Payout / B2C | **BLOCKED** | Daraja B2C sandbox | none |
| Reconciliation against provider statements | **BLOCKED** | provider statements | internal reconciliation issue reporting VERIFIED |
| Auction settlement | **NOT TESTED** | live auction with funded winner | none |
| Inspection booking/completion | **BLOCKED/NOT TESTED** | provider + payment | permissions on booking endpoints VERIFIED (anonymous rejected, non-owner dashboard blocked) |
| Dealer document submission/approval, dealer workspace | **BLOCKED** | file storage (Cloudinary) credentials + admin reviewer | dealer registration separation and role boundaries VERIFIED |

Unblock checklist: Daraja sandbox app (STK + B2C), tunnel to a public HTTPS callback, Cloudinary test cloud, a test custody bank account row, then re-run `ci/db-journeys/run.sh` with those env vars in a **separate, non-CI** job, never with production credentials.
