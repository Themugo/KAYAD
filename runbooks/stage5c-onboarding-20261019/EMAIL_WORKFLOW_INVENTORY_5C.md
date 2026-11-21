# Email-producing workflow inventory (Stage 5C)

Every email goes through `deliver()` in `communicationGateway.service.js` → `emailProvider.service.js` → `https://api.brevo.com/v3/smtp/email`. The gateway checks `communication_event_controls` and **fails closed**: no enabled row for the namespaced event ⇒ nothing is sent.

| Workflow | Event name (control row) | Secret in body | Registered in code | Journey evidence |
|---|---|---|---|---|
| Registration verification | `account.email_verification` | yes (link) — ledger body redacted | authController.register | role_api_a, UI *.5/6 |
| Resend verification | `account.email_verification` | yes | authController.resendVerification | role_api_a, UI *.4 |
| Registration welcome | `registration.completed` | no | authController.register | role_api_a |
| Password reset / inspector set-password | `account.password_reset` | yes | authController, inspectorApplicationController | role_api_a/c, UI.5/6 |
| Owner invitation | `owner.invitation` | yes | ownerAccess service | role_api_d, UO.1 |
| Owner membership notices | `owner.security_notice` | no | owner service | role_api_d |
| Phone OTP (SMS, not email) | `account.phone_verification` | yes — body omitted | otpService | role_api_e |
| Dealer submitted / verified | `dealer.submitted`, `dealer.verified` | no | verificationController | role_api_b |
| Subscription activated | `dealer.subscription_activated` | no | dealerSubscription service | role_api_b |
| In-app `sendNotification` (generic types) | none (in-app only, no email control row) | no | various | not an email path |

**Gap (O5C-10):** hosted must have enabled control rows for every row above; this stage could not read hosted. Seeds exist in `20260909123918…`, `20260909124238…`, `20260928123600…` and the 5B candidate.
