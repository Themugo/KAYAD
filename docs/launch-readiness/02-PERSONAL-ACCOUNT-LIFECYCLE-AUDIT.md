# 02 — Personal account lifecycle (buyer + private seller are one account)
| Step | Result | Evidence |
|---|---|---|
| Register personal (`role=user`; retired `individual_seller` maps to personal) | PASS | journey 20 B1, C6 |
| Atomic identity + credential row (no orphan), 409 duplicate, same-attempt retry returns original | PASS | 20 B3, C3–C5 |
| Verification e-mail: 64-hex link, only a hash stored, single use, expired → 400, resend with cooldown, enumeration-safe | PASS | 20 B4–B11, D1–D6 |
| Registration does not claim e-mail was delivered; provider failure is recorded `failed`, resend recovers | PASS | 20 B2, B6, E1–E6 |
| Login refused until verified; works after | PASS | 20 B7, B12 |
| Password reset, no replay, no enumeration | PASS | 20 G1–G10 |
| No raw token/password/provider key in logs or ledger | PASS | 20 H1–H3 |
| Browse, open vehicle, contact dealer, enquiry creates lead | PASS | 36, 37; browser: storefront → vehicle at 390px |
| Personal seller lists, uploads photos, publishes (auto-publish policy), edits, sees status | PASS (API) | journey 07, 30 |
| Notifications for personal seller listing events | PARTIAL — moderation notices exist; no "listing published" notice | `01` gaps |
| Personal dashboard and seller form in a real browser | **NOT RE-RUN this pass** | earlier phases only |
## Policy recorded
Personal registration enabled; personal sellers self-publish (`listingModeration=auto_publish`); e-mail verification always required for seller actions; packages free. Hosted `onboarding_policy` row matches (`privateSellerRegistration=enabled`, schema version 1 — legacy fields normalise safely).
