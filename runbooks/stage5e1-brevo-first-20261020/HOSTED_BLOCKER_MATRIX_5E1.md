# Stage 5E.1 — Hosted migration / environment blocker matrix (delta on Stage 5E and 5D)

**No hosted system was contacted in this stage** (no Supabase MCP call, no SQL, no HTTP request to the application, no Brevo call, no deployment). Everything labelled *carried* is a Stage 5D/5E read-only observation that must be **re-verified**, not trusted.
Environment rule applied: *hosted target uncertain ⇒ classify UNKNOWN and stop before querying*. Project `ubvgixwhfybbyjuvxboj` ⇒ **UNKNOWN, treated as production**.

The full per-discrepancy table (63 repo migrations absent from hosted history, 38 hosted-only versions, missing `deactivated_at`/onboarding columns/`kayad_register_identity_atomic`/`uq_users_email_normalized`, owner-governance objects absent, `service_role` EXECUTE gap, broad client-role table privileges incl. `otp_challenges`, intentional drift on `idx_inspection_payment_reference_unique`, …) is **unchanged** and lives in `runbooks/stage5e-verification-recovery-20261019/MIGRATION_RECONCILIATION_MATRIX_5E.md` and `runbooks/stage5d-readiness-20261019/HOSTED_SCHEMA_PREFLIGHT_MATRIX_5D.md`. Read-only evidence to collect once the owner authorises: `runbooks/identity-staging/00_READONLY_STAGE_INVENTORY.sql` plus the 5D preflight SQL (SELECT-only).

## New / changed blockers from this stage
| ID | Blocker | Status | Evidence needed to continue | Authoriser |
|---|---|---|---|---|
| B1 | Which environment is `ubvgixwhfybbyjuvxboj` and which commit is deployed (frontend on Vercel, backend host)? | **UNRESOLVED** | owner statement + host dashboards' deploy SHA. `main` is at `0a3d10bb`(+ this stage's fix once pushed); `deploy.yml` deploys the frontend on push, backend auto-deploy **unknown** | owner |
| B2 | Brevo ready on the deployed backend? (key accepted, sender validated, SPF/DKIM/DMARC) | **UNKNOWN** | run `brevo-readiness.mjs --live-readonly` with the deployed values (GET only) and report the JSON; Brevo dashboard: sender/domain authenticated | owner / operator |
| B3 | `FRONTEND_URL` on the backend host is the right origin | **UNKNOWN** | readiness tool's `frontendUrlHost` + https flag | operator |
| B4 | Designated owner list on the host contains exactly the two intended spellings | **UNKNOWN** | `owner-bootstrap.mjs --verify-designated "<addr>,<addr>"` on the host shell (booleans only) | operator |
| B5 | D-5E2-1: accept that, in legacy mode, the verification click activates owner-1? or wait for governance migration | **OWNER DECISION** | decision record | owner |
| B6 | Owner invitation resend rotates before send (F-5E1-05) must be redesigned before the governance migration is approved | **OPEN (design)** | reviewed two-phase RPC + tests | engineering |
| B7 | CI: Gitleaks fix must be seen green on GitHub; Node-24 action bump candidate must pass CI | **PENDING** | CI run on a branch/PR | owner |
| B8 | Windows working tree vs `main` | **PARTIAL** | `main` @ `0a3d10bb` == the 5E.2 package + this stage's changes (verified here by tree diff); the Windows tree was not inspected | owner (read-only commands in `WINDOWS_READONLY_COMMANDS_5E.md`) |

## Stop conditions (prompt §L) — status
Stage 5D hash: verified (see ledger). Hosted target identified: **no** ⇒ no hosted work. Read-only access confirmed: **no** ⇒ none attempted. Genuine credential exposed: **no**. Migration provenance resolved: **no** (38 statements unexported). Dealer record at risk: **no change proposed**. Verification bypass proposed: **no**. Source/deployed revision reconciled: **no**.
