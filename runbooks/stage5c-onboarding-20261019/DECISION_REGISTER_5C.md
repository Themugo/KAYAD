# Owner decision register (Stage 5C)

| ID | Decision | Recommendation | Default if undecided |
|---|---|---|---|
| D5C-A | Narrow `adminOnly` so `ghost_checker` is excluded, with explicit allow lists for inspector routes | Approve; do it as a reviewed change with the route matrix | Inspectors keep admin-route access (risk accepted) |
| D5C-B | Apply candidate `20261019200000` (function replacement) to hosted | Approve after preflight and with the rollback file staged | Dealer paid activation stays broken on hosted |
| D5C-C | Enforce `users.status='suspended'` at login | Approve (currently only `is_banned`/`deactivated_at` block) | Suspended users can still sign in |
| D5C-D | Key the admin limiter per user rather than per address | Approve | Shared-office admins may hit 429 |
| D5C-E | Add a `cars.wholesale` column or retire trade listings | Owner product decision | Trade listings stay 503 |
| D5C-F | Dealer team invitation: deliver by email, stop returning the raw token | Approve as follow-up feature | Token returned to inviter only |
| D5C-G | Authorize a single live Brevo test send and owner invitations (separate task) | Approve when mailbox holders are ready | Everything stays BLOCKED |
