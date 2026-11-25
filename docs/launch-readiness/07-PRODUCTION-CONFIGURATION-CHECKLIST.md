# 07 — Production configuration checklist
Nothing below was changed. HOSTED-READONLY means catalog/SELECT reads only.
## Hosted database (project "KAYARD KE", ACTIVE_HEALTHY, Postgres 17) — HOSTED-READONLY
- Migration history: recorded entries end 2026-09-22. Repository has 218 files, **95 dated later**. History is not a reliable inventory (e.g. `dealers.onboarding_complete` from a 2026-10-12 migration exists), so reconcile by object.
- Present: `notifications` (link, type; no type CHECK), `communication_deliveries`, `communication_preferences`, `dealer_teams` (+ token hash, permissions, employment), `dealer_team_roles`, `dealers` (approved, is_suspended, bio, onboarding_complete), `dealer_verifications`, `leads`, `chats`, `audit_logs`, function `kayad_create_lead_atomic`.
- **Absent:** `dealers.logo_url`, `dealers.banner_url` (new migration), tables `dealer_suspension_requests`, `dealer_reinstatement_requests` (admin suspend/reinstate request flows), function `kayad_reconciliation_issue_rows` (financial reconciliation, deferred). Plan: review each migration, back up, apply the needed ones in a controlled order, `NOTIFY pgrst, 'reload schema'`.
- Users: 1 superadmin (approved), 1 approved dealer, 1 legacy `individual_seller` pending. A platform owner exists; capability to open the console was **not exercised**.
- `onboarding_policy` row present (admins decide dealers/listings; self-registration enabled). `dealer_paperwork_policy` row absent → nothing mandatory. `system_status`: maintenance off, **auctions active, payments active**.
## Environment (NOT VERIFIED — hosted environment variables are not visible here)
| Item | Required for | Check |
|---|---|---|
| Brevo API key + verified sender/domain (SPF/DKIM) | verification, reset, approvals, invitations | send to an authorised mailbox, confirm receipt and ledger `sent` |
| Cloudinary cloud/key/secret | photos, logo, banner | upload one image; `PUBLIC_IMAGE_HOSTS` if custom domain |
| Redis URL | sessions, locks, rate limits, idempotency | API health shows Redis connected; confirm in-app notifications still persist if Redis is down (rows are DB-first by design; **not tested against a real outage**) |
| `FRONTEND_URL`, API base URL, CORS allowlist, cookie domain, `Secure`/`SameSite` | login and verification links | open the live site, register a test account |
| JWT/CSRF secrets, `NODE_ENV=production` | startup validation (`backend/utils/env.js`) | API boots; do not print values |
## Business decisions required
Mandatory dealer documents; whether pending dealers may list; whether to hide deferred-module navigation; admin decision authority (hosted currently `admins`, code default `owner_only`).
