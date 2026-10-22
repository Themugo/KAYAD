# Support & Resolution Center — Convergence Report (2026-10-09)

## 1. One support system
`support_tickets` + `/api/support/*` + `services/support/*` are canonical. The legacy facade `/api/admin/support-tickets/*` and `/api/v1/analytics/support/*` remain mounted as **thin aliases** onto the same service and the same permission (no second lifecycle). Deleted: `supportTicketAdminController.js`, `supportDashboardController.js`, `pages/Support.tsx`, `pages/seller/SellerSupport.jsx`, `pages/admin/AdminSupportTickets.jsx`, the unused `supportAPI` export, dead `components/escrow/EscrowPage.tsx`.

## 2. Database — `20261009150000_support_resolution_hardening.sql` (additive, idempotent, applied twice cleanly)
Ticket-number sequence + BEFORE INSERT trigger (fixes P0) · `idempotency_key` (unique per user) · `related_inspection`, `related_auction` · `row_version`, `reopened_at`, `reopen_count`, `last_*_message_at`, `satisfaction_comment`, `rated_at` · customer rating text moved out of `resolution_notes` · NOT VALID category/length checks (existing rows untouched) · RPCs `create_case`, `append_message`, `update_case` (audit_logs), `rate_case`, `metrics`, helpers · legacy RPC made inert (not dropped) · all functions `service_role`-only · table writes revoked, `support_tickets_user_insert` dropped, owner SELECT limited to safe columns.

## 3. API (all under `/api/support`)
Customer: `GET /config`, `POST /` (Idempotency-Key header or body key), `GET /my-tickets`, `GET /:id`, `POST /:id/messages`, `POST /:id/rate`.
Staff (`PERM.MANAGE_SUPPORT`): `GET /staff/queue|metrics|team|:id`, `POST /staff/:id/messages`, `PATCH /staff/:id`. Aliases: `GET /all`, `/analytics`, `PUT /:id/status`.
Documented in `backend/openapi.yaml` (route governance 0 undocumented).

## 4. Lifecycle
open → in_progress / waiting_on_user / waiting_on_internal / escalated / resolved; resolved → closed | in_progress; closed terminal. Resolve requires a staff resolution note. Customer reply on `resolved` within the reopen window reopens to `open`; on `closed` is refused (409). Staff public reply moves `open → in_progress` and sets `first_response_at` once; internal notes and customer replies never do. Concurrent edits: `expectedVersion` → 409 on conflict.

## 5. SLA truthfulness
Targets exist only if `SUPPORT_SLA_FIRST_RESPONSE_MINUTES` / `SUPPORT_SLA_RESOLUTION_MINUTES` are set. Unset ⇒ nothing stored, the customer UI states no time, staff metrics report "no targets configured" (compliance `null`, not 0%). All "1h/24h" copy removed.

## 6. Customer experience
Topic list (adds *Automotive service providers* and *Something else*; no insurance/broker), contextual reference field per topic (validated UUID shape client-side, ownership verified server-side; an unverifiable reference is dropped and the customer is told), retry-safe submit (one idempotency key per attempt, draft preserved on failure), accurate confirmation, thread shows only customer-visible messages, reopen hint on resolved, closed notice, one-time rating with optional comment, form labels now properly associated.

## 7. Staff experience
New **Support** module in the existing admin console (`nav=admin`): backlog/unassigned/awaiting-first-reply/median-times/rating tiles (SQL-computed), filters, queue with "Needs reply", thread with internal notes visibly distinct, reply vs internal note, assign (active support staff only), priority, lifecycle-valid status selector, resolution note, optimistic-version updates. Access is decided by the backend; a non-support staff user sees a no-access message and no data.

## 8. Notifications
Case created / staff public reply / meaningful status change → owner via in_app + email only; customer reply → assignee in_app only. Never for the actor's own message or internal notes. Text is generic (case number only). Each event has an `idempotencyKey` so retries/dupes are suppressed by the gateway.

## 9. Interaction with the identity stage
This base is `ec5bced`; the identity ZIP (`KAYAD-IDENTITY-ONBOARDING-CONVERGENCE-20261009.zip`) is separate. Files changed here that the identity ZIP also contains were compared byte-for-byte against `ec5bced`: **no overlap** (`App.tsx` differs in the identity ZIP but is untouched here). Apply either order. Do **not** use `robocopy /MIR` from the support ZIP over a tree that already has the identity changes; copy over instead (no `/MIR`).

## 10. Business decisions needed (assumptions made, flagged)
1. **Reopen window** 14 days (`SUPPORT_REOPEN_WINDOW_DAYS`).
2. **SLA targets**: none promised until set.
3. **Attachments**: unsupported (rejected) until private storage + scanning exist.
4. **Financial disputes**: support only links a payment/escrow and records the case; refunds/releases stay in escrow/finance flows.
5. **Provider-side cases** (inspection provider writing about a booking): not enabled; inspection links verify the customer side only.
6. Whether ordinary `admin` should keep support powers or only `technical_support` (today: both, by `PERM.MANAGE_SUPPORT`).

## 11. Out of scope / noted
`commandCenterController`/`operationsService` count `support_tickets` (read-only, unchanged). The shared adapter `aggregate()` limitation (F10) remains for other domains; support no longer depends on it.
