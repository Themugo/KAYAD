# KAYAD — Real Inspection Staging Runtime Certification

## Authoritative sequence

Run on a clean staging runner with Node 22.22.2+ and network access:

1. `node -v` — must be >= 22.22.2
2. `npm ci`
3. `npm run typecheck`
4. `npm run build`
5. `npm test`
6. Run all selected static validators.
7. Apply Supabase migrations to an isolated staging project.
8. Verify `kayad-images` and `kayad-private` buckets and private/public policies.
9. Run `npm run certify:inspection:runtime -- --live` for private evidence upload → signed retrieval → deletion.
10. Create isolated staging buyer, provider owner, independent QA user, inspector user and admin identities.
11. Execute: paid booking → inspector assignment → start → complete canonical checklist → evidence upload → evidence retrieval → evidence deletion/replacement where valid → completion.
12. Submit report to QA. Confirm the executing inspector cannot approve it.
13. Approve using independent QA. Confirm public share is unavailable before approval.
14. Generate private PDF. Verify private object exists and signed retrieval works.
15. Deliver via Brevo email and Twilio WhatsApp. Confirm communication records contain stable report-share identity, not an expiring storage URL.
16. Buyer opens report and submits review.
17. Generate settlement.
18. Initiate M-Pesa B2C provider payout. Settlement must move to `processing`, never directly to `paid`.
19. Wait for real Daraja B2C callback. Verify amount against settlement net amount.
20. Callback marks settlement `paid`, records provider receipt, creates payout transaction and ledger entry exactly once.
21. Replay the callback. Result must remain idempotent with no duplicate payout/ledger transaction.
22. Verify provider finance/reconciliation views against the settlement, transaction and ledger.
23. Verify failure path: B2C timeout/failure leaves settlement non-paid and records failure reason.
24. Verify retry path from failed settlement.
25. Run final release gate and deployment verification.

## Required environment

- Node >= 22.22.2
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- SUPABASE_PUBLIC_BUCKET=kayad-images
- SUPABASE_PRIVATE_BUCKET=kayad-private
- M-Pesa Daraja credentials including B2C initiator/security credential, shortcode, callback and timeout URLs
- Brevo API key and verified sender
- Twilio account SID/auth token and WhatsApp sender/template configuration
- reachable staging backend URL
- reachable staging frontend URL

## Financial truth rule

Never manually mark an M-Pesa inspection settlement as paid merely because the initiation API returned success. Daraja initiation means `processing`. Only the verified callback receipt may move it to `paid`.

## Stop conditions

Stop immediately if:

- Node version is below contract;
- migrations do not apply cleanly to an isolated staging database;
- private bucket is publicly readable;
- evidence is persisted as an expiring URL rather than canonical storage identity;
- inspector can approve their own report;
- unapproved reports are publicly shareable;
- PDF can be generated before independent QA;
- communication stores an expiring storage URL as the canonical report link;
- settlement can become paid without a provider receipt;
- callback amount does not equal settlement net amount;
- callback replay creates duplicate financial effects;
- any payout failure is reported as paid.
