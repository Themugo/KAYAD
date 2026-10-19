# Owner decision register — Stage 5B

| # | Decision | Recommendation | Needed before | Status |
|---|---|---|---|---|
| D1 | Approve and apply migration `20261019120000_stage5b_owner_governance` to the hosted database (after preflight) | Approve, in one sitting with both owners reachable (see rollback plan §Application order) | Any hosted owner provisioning | **OPEN — not approved, not applied** |
| D2 | Deploy the Stage 5B code (safe before D1: legacy mode) | Approve with the next release | — | OPEN |
| D3 | Confirm that `kayadautomotives@gmail.com` and `jimmythemugo@gmail.com` are the two initial owners and that **both mailboxes are verified accounts** in the hosted app | Confirm | `owner:bootstrap --apply` | OPEN |
| D4 | Brevo production credentials for live delivery of invitations/notices (test mailboxes only for the first live test) | Provide / confirm | Live e-mail test | OPEN (live tests BLOCKED here) |
| D5 | Invitation lifetime (default 24 h, max 168 h) and resend cooldown (default 60 s) | Keep defaults | — | Default in force |
| D6 | Who holds production service-role access for the emergency CLI, and where `OWNER_EMERGENCY_RECOVERY_UNTIL` may be set | Name two people; record in the incident process | Go-live | OPEN |
| D7 | Legacy `seed.js` owner provisioning is blocked in production unless `SEED_ALLOW_UNVERIFIED_OWNER_PROVISIONING=I_ACCEPT_NO_MAILBOX_PROOF` | Keep blocked | — | Implemented |
| D8 | Reconcile the Windows working tree (five files reported missing in earlier stages) | Run the reconciliation script on the Windows machine | Commit of 5B | OPEN — the Windows tree was **not reachable** in this stage |
