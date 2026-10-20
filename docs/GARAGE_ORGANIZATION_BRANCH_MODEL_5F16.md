# Garage / Inspector organization → branches → staff memberships (Stage 5F.16)

Status: SOURCE + DISPOSABLE-DB CANDIDATE. Migration `20261020180000_garage_organization_branch_membership.sql` has NOT been applied to any hosted database.

## 1. Model (no new account per branch)
| Concept | Table | Notes |
|---|---|---|
| Organization | `inspection_providers` | Owner = `provider.user_id` (implicit role `owner`). Onboarding, approval and suspension stay in `ProviderApplicationModal` → `AdminProviderGovernance`. |
| Branch | `inspection_branches` | `(id, provider_id)` unique; statuses `active|suspended|closed`; one head office at most; names unique per organization (case/space-insensitive). |
| Membership | `inspection_staff` | One row per person per organization. `access_role` (authority), optional `branch_id` (scope), legacy technical title `role`. `affiliation_status`: `pending → confirmed ⇄ suspended → ended`. |
| Booking branch | `inspection_bookings.branch_id` | Composite FK `(branch_id, provider_id)`; `NULL` = org-level (unrouted) queue. |

## 2. Roles and scope
| Role | Rank | Branch scope | May manage |
|---|---|---|---|
| owner (implicit) | 100 | org | everyone |
| org_admin | 80 | NULL | all roles except org_admin |
| operations_manager | 60 | NULL | bookings (route/assign) org-wide; reads team |
| branch_manager | 50 | required | inspectors and technicians of **its own branch** |
| finance | 30 | NULL | read earnings/settlements only |
| report_reviewer | 30 | optional | reads bookings |
| inspector / technician | 20 | optional | executes only bookings assigned to them |
Nobody changes their own role; an org_admin cannot create or modify org_admins; revocation is immediate (standing recomputed on every request and inside every DB function).

## 3. Capability matrix (server `CAPABILITIES`, mirrored by `orgAccess.ts`)
| Capability | owner | org_admin | ops | branch_mgr | finance | reviewer | inspector/tech |
|---|---|---|---|---|---|---|---|
| org.read / branch.read | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| branch.manage | ✔ | ✔ | | | | | |
| member.read | ✔ | ✔ | ✔ | ✔ | | | |
| member.manage | ✔ | ✔ | | ✔ (own branch, inspector/technician) | | | |
| booking.read | ✔ | ✔ | ✔ | ✔ (own branch) | | ✔ | ✔ (assigned) |
| booking.manage (route/assign) | ✔ | ✔ | ✔ | ✔ (own branch) | | | |
| booking.execute (transitions) | ✔ | ✔ | ✔ | ✔ | | | ✔ (assigned only) |
| report.read | ✔ | ✔ | ✔ | ✔ (own branch) | ✔ (money only) | | |
The UI hides what the role cannot do; the server and the database decide.

## 4. Lifecycle states
- Invitation: `pending` (TTL 168 h default, max 720) → accepted by the **invited user only** → `confirmed`; or expired / declined → `ended`. Replay → 409.
- Membership: `confirmed ⇄ suspended`, `* → ended` (revoke or leave). Ending releases the member's open assignments.
- Branch: `active ⇄ suspended`, `→ closed`. A non-active branch cannot receive new routing or assignments; members scoped to it lose operational access.
- Booking: the existing state machine is unchanged (`kayad_validate_inspection_booking_transition`). Custody remains separate from inspection approval.

## 5. Canonical API (mounted at `/api/inspection/org` and `/api/inspections/org`)
`GET/POST /me/memberships|worklist`, `POST /me/memberships/:id/accept|leave`; `GET /:org`; `GET|POST /:org/branches`, `PATCH /:org/branches/:id`, `POST …/status`; `GET /:org/members`, `POST …/members/invite`, `POST …/members/:id/confirm|status`, `PATCH …/members/:id`; `GET /:org/bookings`, `POST …/bookings/:id/route|assign|transition`; `GET /:org/report`. Strict zod bodies reject `organizationId`, `provider_id`, role-authority or actor fields. A stranger gets the **same 404** as a non-existent organization.

## 6. Database / RLS design
`service_role`-only SECURITY DEFINER functions `kayad_org_*` raise `ORG_*: message` (P0001) and write the audit row in the same transaction. RLS (for any direct-to-Supabase path) uses `kayad_policy_*` wrappers that call only `auth.uid()`; no end-user role gets writes. Reporting `kayad_org_report` counts each booking once (by `scheduled_date`) and each transaction once (Nairobi-day `created_at`); unattributed money is org-level.
Rollback: `runbooks/stage5f16-garage-organization-20261020/rollback_20261020180000.sql` (refuses while any membership is `suspended`, because that state would be lost).

## 7. Local test setup
Disposable PG16 on 127.0.0.1:54339 (db names end `_disposable`; harnesses refuse anything else). `runbooks/…/pg/stage5f16_org_pg.mjs` (SQL tier), `http/run_http.sh` (real Express → PostgREST → PG), `ui/ui_5f16.mjs` (Chromium; needs Vite with `VITE_DEV_API_TARGET` and `JWT_SECRET`). Node ≥ 22.22.2.

## 8. Risks / owner decisions
OD-17 legacy-approved dealer with a pending verification is fail-closed blocked; 5F.10 auction-gate is not in the 5F.15 base and is not merged here; one branch per membership (multi-branch managers use `operations_manager`); no Idempotency-Key on org routes (DB single-use/uniqueness instead); `ProviderBusinessCenter` is not mounted (the reachable owner surface is "My business"); the `?action=manage-business` deep link rarely misses when it fires before session hydration; a React "empty string attribute" warning from the header avatar pre-exists; dev-mode error responses include stack traces (NODE_ENV=development).
