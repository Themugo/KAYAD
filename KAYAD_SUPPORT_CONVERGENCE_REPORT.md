# Support & Resolution Center — Convergence Report (2026-10-09)

## 1. One support system
`support_tickets` + `/api/support/*` + `services/support/*` are canonical. The legacy facade `/api/admin/support-tickets/*` and `/api/v1/analytics/support/*` remain mounted as **thin aliases** onto the same service and the same permission (no second lifecycle). Deleted: `supportTicketAdminController.js`, `supportDashboardController.js`, `pages/Support.tsx`, `pages/seller/SellerSupport.jsx`, `pages/admin/AdminSupportTickets.jsx`, the unused `supportAPI` export, dead `components/escrow/EscrowPage.tsx`.

## 2. Database — `20261009150000_support_resolution_hardening.sql` (additive, idempotent, applied twice cleanly)
Ticket-number sequence + BEFORE INSERT trigger (fixes P0) · `idempotency_key` (unique per user) · `related_inspection`, `related_auction` · `row_version`, `reopened_at`, `reopen_count`, `last_*_message_at`, `satisfaction_comment`, `rated_at` · customer rating text moved out of `resolution_notes` · NOT VALID category/length checks (existing rows untouched) · RPCs `create_case`, `append_message`, `update_case` (audit_logs), `rate_case`, `metrics`, helpers · legacy RPC made inert (not dropped) · all functions `service_role`-only · table writes revoked, `support_tickets_user_insert` dropped, owner SELECT limited to safe columns.

## 3. API (all under `/api/support`)
Customer: `GET /config`, `POST /` (Idempotency-Key header or body key), `GET /my-tickets`, `GET /:id`, `POST /:id/messages`, `POST /:id/rate`.
Staff (explicit capabilities, see §12): reads `GET /staff/queue|metrics|team|:id` need *agent or oversight*; writes `POST /staff/:id/messages`, `PATCH /staff/:id` need *agent*. Aliases (same service and gates): `GET /all`, `/analytics`, `PUT /:id/status` (agent).
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
6. ~~Whether ordinary `admin` keeps support powers~~ **Decided (least privilege, §12):** only `technical_support` works cases; `admin`/`superadmin`/owner get read-only, reasoned, audited oversight without internal notes.

## 11. Out of scope / noted
`commandCenterController`/`operationsService` count `support_tickets` (read-only, unchanged). The shared adapter `aggregate()` limitation (F10) remains for other domains; support no longer depends on it.

## 12. Integration gate (support + identity) — reconciliation and permission policy

**Foundation:** the identity/onboarding tree (commit `8913883` in the integration repo). The support work came from a clone at `ec5bced`; its full ZIP was **not** applied. The overlay (`KAYAD-SUPPORT-OVERLAY-20261009.zip`) was compared file by file against the foundation, then reconciled. No `robocopy /MIR`, no deletion by absence.

### 12.1 File-by-file plan and outcome
| File(s) | Foundation vs overlay | Necessary? | Other-consumer impact | Action |
|---|---|---|---|---|
| `supabase/migrations/20261009150000_support_resolution_hardening.sql` | new file (latest timestamp; sorts after `20261009130000`) | yes: P0 ticket-number failure, internal-note leak, grants | `support_tickets` readers: command-centre counts only (read-only, unaffected) | **Reconcile**: staff-user check narrowed to `technical_support`; NOT VALID constraints removed (they blocked updates of legacy rows); rating move now keeps `legacy_resolution_notes` backup + audit row; trigger function revoked from anon/authenticated; category/length validated in `create_case` |
| `backend/services/support/*` (service, policy, serializers, references) | new in overlay | yes | none outside support | **Reconcile**: staff section rewritten for agent/oversight; `messageKind` fallback for legacy messages; `canReply` honours reopen window; auction link also accepts `auction_registrations` participation |
| `backend/controllers/supportController.js`, `routes/supportRoutes.js`, `supportTicketAdminRoutes.js`, `supportDashboardRoutes.js` | overlay replaced legacy controllers | yes | legacy admin facade + analytics mount now alias the same service | **Reconcile**: GET = viewer, POST/PATCH/PUT = agent only; capability returned to the UI |
| `backend/middleware/supportAccess.js`, `backend/config/roles.js`, `src/utils/permissions.ts` | overlay: `PERM.MANAGE_SUPPORT` | partly | roles/permissions are shared (admin console, role assignment UI) | **Reconcile**: two new explicit permissions `SUPPORT_AGENT`, `SUPPORT_OVERSIGHT`; generic all-permission shortcut deliberately bypassed; mirrored in the frontend table |
| `backend/openapi.yaml`, `.env.example` | overlay adds 7 routes / SLA+reopen vars | yes (route governance) | none | **Adopt** |
| `src/features/SupportView.tsx`, `AdminSupportWorkspace.tsx`, `AdminView.tsx`, `services/supportApi.ts`, `api/api.exports.ts`, `components/ui/index.tsx` | overlay; identity files untouched (`App.tsx`, auth context, navbar not in overlay) | yes | `ui/index.tsx` label association is shared: full frontend suite re-run, 564 pass | **Adopt** (workspace + API client reconciled for oversight reason / read-only) |
| Tests, 3 validators, evidence, 5 reports | overlay | yes | — | **Reconcile** (new permission model, +20 backend, +2 frontend, journey +5) |
| `backend/controllers/supportDashboardController.js`, `supportTicketAdminController.js`, `src/pages/Support.tsx`, `pages/admin/AdminSupportTickets.jsx`, `pages/seller/SellerSupport.jsx` | deletions in `DELETE_FILES.txt` | verified | consumers grepped individually: routes now alias the new service; the three pages had no importers | **Accept all 5** |
| `src/components/escrow/EscrowPage.tsx` | in `DELETE_FILES` of the support-only clone | n/a here | **already absent in the identity foundation**; a consumer audit at `ec5bced` found it unreferenced and carrying false CBK-licence claims that failed `escrowClaims.test.ts` | **No action** (the test is unchanged and passes) |

Shared integration points checked: `App.tsx` (unchanged; `SupportView` receives the shared `handleOpenAuth`, so guests sign in through the identity modal and stay on the Support page — no second login flow), auth/session context, navbar, CSRF/API client (support uses the existing `supportFetch` + CSRF), env (`SUPPORT_*` optional), design tokens (no new CSS).

### 12.2 Staff capability matrix (default; no silent broadening)
| Role / actor | Capability | Read queue + metrics | Open case | Internal notes | Reply / status / assign | Assignable |
|---|---|---|---|---|---|---|
| `technical_support` | **agent** (`SUPPORT_AGENT`) | yes | yes (audited `support.case_viewed`) | read + write | on unassigned or own cases; take-over by reassigning is audited | yes |
| `admin`, `superadmin`, platform owner | **oversight** (`SUPPORT_OVERSIGHT`) | yes | only with a stated reason (10–300 chars); audit is fail-closed (`support.oversight_viewed`) | **never shown** (also `resolutionNote` redacted) | **no** (403) | no |
| `support`, `staff`, `marketing`, `hr`, `accounts`, `moderator`, all others | none | 403 | 403 | — | 403 | no |

Known limitation: per-user permission grants/revokes are read if present but **no migration persists them**, so today only the role defaults above apply. An `admin` who must work cases needs the `technical_support` role until grants are persisted (a decision for the owner).
