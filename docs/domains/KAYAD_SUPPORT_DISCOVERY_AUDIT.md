# KAYAD Support & Resolution Center — Discovery Audit (2026-10-09)

Base: git `ec5bced` (the identity/onboarding stage is **not** in this base; no file touched here overlaps its changes — see Convergence Report §9).
Method: read every support file end to end, then proved the suspected defects against a migration-built PostgreSQL 16 (`evidence/support/`).

## 1. What existed
| Layer | Item | Reality |
|---|---|---|
| Customer UI | `features/SupportView.tsx` (mounted at `nav=support`) | Real, wired to `/api/support/*`. Reference typed into the description as text; hard-coded "1h / 24h" promises; static categories; no retry safety. |
| Staff UI | `pages/admin/AdminSupportTickets.jsx`, `AdminLayout`×2, `AdminSidebar`×2 | **Not routed.** Staff had no reachable support UI. |
| Orphans | `pages/Support.tsx`, `pages/seller/SellerSupport.jsx` | Unreferenced; `Support.tsx` claimed "Live Chat 24/7", a phone/WhatsApp number and Insurance. |
| API | `/api/support/*` (canonical), `/api/admin/support-tickets/*` (legacy facade), `/api/v1/analytics/support/*` | Three overlapping surfaces, three different role rules. |
| Data | `support_tickets` (+ 3 migrations), RPC `kayad_append_support_message` | See defects. |
| Other readers | `commandCenterController`, `operationsDashboardController`, `operationsService` | Counts only (unchanged). |
| Notifications | `emitCommunication` (in_app/email/sms/whatsapp) | Owner notified of their own replies; no idempotency identity; email body = message. |

## 2. Defects (all reproduced or shown by code reading)
| # | Sev | Defect | Proof |
|---|---|---|---|
| F4 | **P0** | Ticket creation **fails on a migration-built database**: `ticket_number` is NOT NULL with no default/trigger and `createTicket` never supplies it. | `evidence/support/baseline_proof_output.txt` B1: `null value in column "ticket_number" violates not-null constraint` |
| F1 | High | `getTicket` returned the whole document: `messages` incl. `isInternal` staff notes, staff names/emails, escalation target; only React hid notes. | code (`select(... messages ...)`), B2 |
| F9 | High | RLS owner SELECT exposed the whole row (incl. `messages`/internal notes) to `authenticated` direct reads; anon/authenticated held table-level ALL. | B2 |
| F2 | High | `adminOnly` = every STAFF_ROLE (marketing, hr, accounts, ad_manager, moderator, ghost_checker) could list all cases, read analytics, change status. `canAccessTicket` also named non-existent roles `support`, `staff`. | `middleware/auth.js`, `supportController.js` |
| F7 | High | `kayad_append_support_message` took the sender role from the caller: an ordinary customer whose app role is `dealer` counted as **staff first response** and moved the case to `in_progress`; staff internal notes could also count as a first response; no closed/resolved handling; no ownership check inside the function. | B7: `first_response_at set=true status=in_progress` |
| F8 | High (staging) | Function granted `service_role` only after `REVOKE … FROM PUBLIC`, but Supabase default privileges grant EXECUTE on public functions to `anon`/`authenticated`. A signed-in user could call the RPC directly as `admin`. In the local rig B5 was blocked only incidentally by RLS on the `SELECT … FOR UPDATE`. | B5; **needs staging verification** |
| F5 | Med | `createTicket` forwarded client `category`/`priority`/`related*` unchecked; hard-coded 1h/24h SLA stored for everyone. | code |
| F6 | Med | `rateTicket`: no 1–5 validation, no resolved-only rule, repeatable, customer text written into staff field `resolution_notes`. `updateTicketStatus`: no transitions, no concurrency control, assignee/escalation targets unvalidated, no audit, `$lookup` aggregate unsupported by the adapter. | code |
| F10 | Med | Adapter `aggregate()` loads `find({})` (1000-row cap) and mishandles `{$gte}` in `$match`; `getSupportAnalytics`, dashboard `$percentile` and admin stats were therefore unreliable. | `models/_base.js` |
| F11 | Med | Legacy `addTicketMessage` bypassed the atomic RPC (lost-update risk), no first-response tracking, inconsistent role mapping. No frontend consumer of the facade. | code |
| F14 | Med | Customer UI: reference not linked; "1h first-response target" and "24-hour resolution target" asserted regardless of operations; rating comment sent as `resolutionNotes`; no duplicate protection; no automotive-services topic. | code |
| F15 | Low | Notifications: sms/whatsapp for every event; owner notified of own reply; no per-event identity → no dedupe. | code |
| – | Low | `Select`/`Textarea` labels were not associated with their controls (accessibility). | RTL query failure |
| – | Low (out of scope, found by a guard test) | `components/escrow/EscrowPage.tsx` (unreferenced duplicate) asserted CBK-regulated/ring-fenced custody and failed `escrowClaims.test.ts` at HEAD. | removed |

## 3. Baseline (git `ec5bced`)
Frontend vitest 66 files / 505 pass / **3 fail** (escrowClaims on the dead file) / 1 skipped · backend Jest 62 suites / 937 · validators 10 failing (pre-existing: communication-event-convergence, communications-provider-certification, escrow-custody-domain, home-hero-premium, lead-crm-domain-end-to-end, live-runtime, local-supabase, phase6-release, production-host-contract, v14-runtime-preflight).
