# E-mail tests — Stage 5B

Live delivery: **BLOCKED** — no Brevo production credential and no authorised external test mailbox is available in this isolated workspace, and the workspace's network allowlist does not reach the provider. No message was sent to any real address.

What was proven (tier R+P, provider **stub** capturing the exact Brevo API payload through the real `email.service` / communication gateway): initial-owner invitation (bootstrap), invitation, resend (old link dead), expiry, acceptance notice, removal notice to the removed person and the remaining owners, recovery invitation, security notices with no link/secret, delivery ledger with no token/URL, gateway fail-closed without an event-control row, redacted persisted bodies for `owner.invitation`.

To run the live test (owner action): set `BREVO_API_KEY` + `BREVO_FROM_EMAIL` in the staging environment, use **only** two mailboxes you control, run `owner:bootstrap --plan`, then `--apply`, and confirm: (1) invitation arrives once, (2) link works once, (3) a second open is refused, (4) removal notice arrives. Record results in this file.
