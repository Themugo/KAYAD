# KAYAD Phase 16C — Staging approval checklist

**Nothing below has been performed.** The decision for this phase is in `KAYAD_PHASE16C_README.md`. Hosted production is out of scope until staging evidence is accepted.

## A. Approvals the KAYAD owner must give in writing, per item
| # | Approval | Preconditions | Evidence to bring back |
|---|---|---|---|
| S1 | Create/choose an **approved staging project** (separate from hosted production) and a database backup | — | project ref, backup id, migration list |
| S2 | Run Gate 0 read-only pre-flight (incl. the new email-case queries) on staging | S1 | query output; 0 mixed-case/duplicate emails |
| S3 | Apply M1, M2 (`psql -1`), M3 on staging in the documented order | S2 | catalog diff = certification B7 (3 objects excluded by design); byte-identical identity/session rows |
| S4 | Configure `OWNER_MFA_ENCRYPTION_KEY` (secret manager), `WEBHOIST_EMAIL=<primary only>`, a real email provider | S3 | secret-manager reference (not the value), provider test message delivered |
| S5 | Establish the primary owner with `owner:bootstrap --plan` then `--apply` and sign-in acceptance | S4 | Gate 5 verification queries: same user id, `users.role` unchanged, bootstrap closed |
| S6 | Primary enrols TOTP with a **real authenticator app**; stores recovery codes offline | S5 | enrolment + sign-in challenge screenshots/log |
| S7 | Primary invites the second owner from `/admin/owners`; the mailbox owner accepts and enrols | S6 + email delivery verified | two usable owners; second owner `role=user`; replay refused |
| S8 | Dealer workflow on a synthetic staging dealer (register → verify → onboard → owner approve/reject → suspend/reinstate) | S5 | dealer procedure verification queries |
| S9 | Re-run on staging: role matrix, the 16B/16C suites, browser checks against the staging URL | S3 | updated matrix; 500 set compared with this report |
| S10 | Rehearse each rollback on staging, including the irreversible ones with an exported ledger | S3 | logs |
| S11 | Review the route-exception report: decide which unprovisioned modules (config, low-code, automation, platform-factory, announcements, ads, feature flags, queue metrics) are to be provisioned or removed | — | owner decision |
## B. Standing prohibitions
No SQL role grants; no change to the primary's `users.role`; no recreation of `jimmythemugo@gmail.com`; `kayadautomotives@gmail.com` only via the owner invitation workflow; `kamauwamakena@gmail.com` only via the normal dealer workflow; no hosted change without its own approval.
## C. Known gaps that staging must close
Real email delivery · real authenticator interoperability · hosted RLS/trigger state re-read · hosted email-case hygiene · Supabase platform behaviour of the migrations · provider (Cloudinary/Brevo/M-Pesa) integrations · the 2 credential-dependent validators (`communications:providers`, `live-runtime`) · 220 remaining HTTP 500 routes by cause (report).
