# Stage 5D — blockers and the authorizations they need
| Id | Blocker | Authorization / input required |
|---|---|---|
| A1 | Is project `ubvgixwhfybbyjuvxboj` production or staging? Which is the staging target? | owner statement; a staging project/branch |
| A2 | Export SQL of the 38 hosted-only migrations (schema-only dump) | owner-approved read-only export per `APPROVED_READONLY_SCHEMA_REHEARSAL_20261013.md` |
| A3 | Apply the 63 + 5B + 5C candidates (+ service_role GRANT, otp_challenges REVOKE) | explicit staging-migration approval; owner decision D1 for 5B |
| A4 | Brevo and Africa's Talking credentials, verified sender/domain, authorized test recipient/handset, network egress to `api.brevo.com` | owner provides in the deployment, not in chat |
| A5 | Deployed backend revision identity | deploy log / build id |
| A6 | Correct owner mailbox spelling (`kayadautomotives` vs `kayadaautomotives`) and mailbox control | owner confirmation |
| A7 | Decision on existing hosted `jimmythemugo` dealer-pending row (D-5D-1) | owner decision |
| A8 | Windows tree inspection | link the session to the computer or paste `git status` |
| A9 | Commit/push of 5D changes | user performs; not done here |
