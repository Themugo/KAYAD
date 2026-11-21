# Provider journey status matrix (2026-11-21)

Categories: **Implemented** (code path exists) · **Locally tested** (executed against the disposable PG16/PostgREST/Redis/real-backend stack, provider absent or simulated) · **Sandbox tested** (executed against a provider sandbox) · **Production verified** · **Blocked** (missing credentials/infrastructure). A journey is never marked passed unless it was executed; "locally tested" never implies provider behaviour.

| Journey | Implemented | Locally tested | Sandbox tested | Production verified | Blocked by |
|---|---|---|---|---|---|
| M-Pesa STK initiation | yes | **yes** — payment row created with the server-derived/agreed amount; unconfigured provider refuses cleanly (`MPESA_ENV=production`, no creds) | **no** | **no** | Daraja sandbox key/secret, shortcode, passkey, public HTTPS callback |
| M-Pesa STK callback (real) | yes | **yes** — non-allow-listed callback rejected and inert; callbacks replayed through the DB settle functions (duplicate, concurrent, late) | **no** | **no** | callback from the allow-listed Safaricom source |
| Accepted-offer payment → settlement → escrow | yes | **yes** (74 checks, simulated provider via DB functions) | no | no | as above |
| Escrow funding (bank transfer verification) | yes | simulated at DB function level only | no | no | custody account + staff verifier flow |
| Vehicle confirmation / release / refund | yes | **not tested end to end** (staff permission boundaries only) | no | no | funded escrow |
| Payout / B2C / wallet withdrawal | yes | DB functions and amount validation (W-1) unit-tested; no live call | no | no | Daraja B2C sandbox |
| Reconciliation vs provider statements | yes (internal) | internal issue reporting **yes** (33 + journey 03) | no | no | provider statements |
| Auction settlement | yes | **not tested** | no | no | live auction + funded winner |
| Inspection booking/completion | yes | permission boundaries yes | no | no | provider + payment |
| Dealer documents / approval | yes | registration separation and role boundaries yes | no | no | Cloudinary credentials + reviewer |
| Email/SMS (Brevo, Twilio, Africa's Talking) | yes | webhook auth units only | no | no | provider credentials |
| GitHub Actions run of the DB-journey workflow | workflow file exists | local runner **yes** | n/a | n/a | **NOT TESTED on GitHub** — nothing has been pushed (not authorised) |

Unblock checklist: Daraja sandbox app (STK + B2C) + tunnel to HTTPS callback; Cloudinary test cloud; test custody account row; run in a separate non-CI job, never with production credentials.
