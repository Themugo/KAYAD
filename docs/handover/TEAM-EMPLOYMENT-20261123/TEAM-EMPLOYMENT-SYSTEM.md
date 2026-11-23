# KAYARD KE — Team & Employment (v5 continuation)

Status labels: **VERIFIED** = executed locally with evidence · **NOT VERIFIED IN PRODUCTION** = nothing here has run against hosted Supabase/Render/Vercel · **DEFERRED** · **OUTSTANDING**.
Nothing in this package has been committed, pushed, merged, deployed or applied to a hosted database.

## 1. Baseline audit (Phase 0)
| Item | Finding |
|---|---|
| Checkout | `/home/claude/p12`, HEAD detached at `5bbf2843`; v5 source in the working tree (not a ZIP extracted over the repo). Remote not contacted. |
| v5 present? | YES — invitation-first onboarding (public `GET /team/invitations/preview`, token-bearing sign-in/register, `dealer/setup?invite=`), v5 ZIP sha256 `8a05a425…6fee6f74`. |
| Tree vs HEAD | Four handover docs present at HEAD (`CI-DB-JOURNEYS.md`, `DEPLOYMENT-TOPOLOGY.md`, `LISTING-RPC-COMPATIBILITY.md`, `LOGIN-ROOT-CAUSE.md`) are absent from the supplied v5 tree. Not restored (unknown whether intentional); owner should confirm. |
| Existing model | `dealer_teams` is BOTH membership and invitation (one row per dealer + invited e-mail). Permissions are a jsonb on that row, read on every request. |
| PR 266 | **NOT VERIFIED** — no GitHub API access from this environment. Keep it open; do not assume its state. |

Invitation inventory (all reused, none replaced): creation `POST /dealer-platform/team/invite` (7-day, SHA-256 hashed token, e-mail-bound, rate limited) · preview `GET /team/invitations/preview` · lookup/acceptance `POST /team/accept` (CAS claim, 403 wrong account, 409 spent, 410 expired/cancelled) · resend/cancel · registration/sign-in with invitation context · retired legacy `PATCH/DELETE /dealer/team/:id` → 410 `TEAM_ROUTE_MOVED`.

## 2. v5 foundation preserved and known limitations (Phase 1)
All 16 v5 behaviours kept; journeys 17 (42/42) and 21 (37/37) and browser 55/55 still pass.
| Limitation | Class |
|---|---|
| Replaced link vs unknown link look identical on preview | OUTSTANDING / DEFERRED (needs a hash-history column; security-neutral) |
| Invited e-mail not pre-filled on sign-in page | OUTSTANDING (cosmetic) |
| Acceptance notification goes to the dealership account, not each delegated inviter | OUTSTANDING / DEFERRED |
| Two memberships ⇒ ambiguous workspace | RESOLVED (X-Dealer-Org selector, fail-closed) |

## 3. Employment architecture (Phase 2)
```
users (personal identity: login e-mail, password, role=user|dealer|admin)   ← never altered by employment
  └─ dealer_teams  (ONE row per dealership × person = membership + invitation)
        access:   status  invited | active | suspended | removed        ← what every request is authorised on
        HR:       employment_status invited|onboarding|active|suspended|terminated|resigned|archived
        role/permissions (jsonb)  → effective permissions, read per request
        staff identity: staff_number, business_email (recorded contact), staff_display_name, work_phone, start/end date + reason
  ├─ dealer_staff_settings   (dealer → staff_code, next_seq)           unique code, monotonic counter
  └─ dealer_employment_events (append-only history; UPDATE blocked by trigger)
```
Personal identity (login e-mail) ≠ invitation e-mail (the address the link was sent to) ≠ business e-mail (a contact the dealer records; **not a mailbox, not a login**).
Migration impact: additive columns + 2 tables + 2 SQL functions + 2 triggers; existing rows backfilled (HR status derived from access status; staff numbers for accepted members in `created_at` order; legacy start dates left NULL, never guessed). A compatibility trigger keeps older writers (status-only updates) consistent, so deploying the migration before/after the backend cannot break the Team page. If the migration is absent the API reports `employmentAvailable:false` and the UI says so.

## 4. Employment lifecycle
```
invited ──accept──▶ onboarding ──role assigned──▶ active ◀──reinstate── suspended
   │cancel/expire        │                          │ suspend ─────────────▶ ▲
   ▼                     └──────── terminate / resign (reason required) ─────────▶ terminated | resigned ──▶ archived
removed(no member)                                                                    │ re-hire invitation (same record, same staff number, starts at Basic)
```
Access status pairs are enforced by the DB constraint `dealer_teams_access_employment_consistent`.

## 5. Basic Staff Access (Phase 3)
Every new invitation is created with role `basic_staff` and all eight permission keys false. UI text: "Every new employee starts with Basic Staff Access. You can assign their operational role after they join." The invite form has no role selector and the UI request never names a role.
Allowed: register/sign in, verify e-mail, accept, complete own staff profile (`GET/PUT /team/me`, name + phone only), see own staff number, role, access level, employment status.
Denied (403, journey 22 checks 6–7): leads, customers, inventory, command centre, team, roles, subscription, marketing, invite, staff code, employment records. Enforcement is structural: every `dealerWorkspaceAccess([...])` route needs ≥1 permission, so an all-false membership is refused everywhere except `/team/me`.
Dealer can reduce anyone back to Basic; effect is on the very next request (journey 22 check 14).
**Deviation to review:** the invite API still *accepts* an explicit `role` (used by existing journeys 12/14/16/17 and API integrators). The UI never sends one. To make "always Basic" server-absolute, drop that body field — one-line change, owner decision.

## 6. Staff numbering (Phase 4)
Format `<CODE>-STAFF-<NNN>` (e.g. `ABC-STAFF-001`). Allocated **on acceptance** by SQL function `kayad_allocate_staff_number` (locks the team row and the dealership counter row ⇒ concurrent acceptances serialise; idempotent; never reused; kept after termination and on re-hire). Prefix = dealer-configured code (`PUT /team/staff-code`, owner only, only before the first number) else the first 3–8 letters/digits of the dealership's **existing** business name (frozen once chosen, globally unique, collision ⇒ longer prefix). Not derived from any personal e-mail. If no code can be derived the member is still activated and the dealer is notified (`STAFF_CODE_REQUIRED`). The owner has no membership row and therefore no staff number.
Evidence: 6 concurrent acceptances → 6 distinct numbers (journey 22 checks 30–33); 10 concurrent allocations in the scratch DB rehearsal → ABC-STAFF-001…010.

## 7. Business e-mail
Recorded contact only (`PUT /team/:id/business-email`, validated, audited). KAYARD KE does not provision mailboxes or accounts; the address cannot sign in (journey 22 check 49). Verification/approval workflow: DEFERRED.

## 8. Roles and permission matrix (Phase 6)
| Role | List | Edit | Delete | Earnings | Manage team | Approve deals | Chat/leads | Settings | Access level |
|---|---|---|---|---|---|---|---|---|---|
| Basic Staff Access (default) | – | – | – | – | – | – | – | – | Basic |
| Viewer | – | – | – | – | – | – | – | – | Basic |
| Lot Agent | ✓ | ✓ | – | – | – | – | – | – | Standard |
| Sales Agent | ✓ | ✓ | – | – | – | – | ✓ | – | Standard |
| Finance Officer | – | – | – | ✓ | – | ✓ | – | – | Standard |
| Manager | ✓ | ✓ | ✓ | ✓ | – | ✓ | ✓ | ✓ | Extended |
| Owner (not a team row) | all | | | | | | | | Full |
Custom roles (`custom_*`) remain owner-only. Protected, never delegable: payouts/bank, subscription, owner-only surfaces, role creation, promoting to Manager, own role/status, owner record. No new permission was invented.

## 9. Offboarding rules (Phase 5)
Suspend/reinstate; end employment or record resignation (reason mandatory, ≥ stored in the record); archive; re-hire. Offboarding changes only that membership row: personal account, other dealerships' memberships, listings/leads/records, the staff number and the append-only history all remain (journey 22 checks 19–29, 43). A terminated person cannot re-activate themselves (check 21). Different account cannot accept a re-hire (check 28).

## 10. UI (Phase 7)
Dashboard → Team renamed **Team & Employment** (same navy/teal/white system): Team Members (table ≥ md, cards on mobile; search by name/staff ID/e-mail; role and status filters; staff detail), Invitations (form + pending list), Roles & Permissions, Employment Records, Activity (Dealer). Summary tiles use real data; unavailable data shows "—"/"Not available yet", never 0. Members' own "My staff profile" tab (`StaffProfile`) appears for every active member including Basic. Dealership chooser appears when a person has several memberships.

## 11. Security / tenant isolation (Phase 8)
Every dealership operation derives the dealership from the authenticated membership (`resolveDealerOrg`), never from the body. `X-Dealer-Org` may only *select* among the caller's own ACTIVE memberships (re-read per request; unknown/suspended/malformed ⇒ refused; ≥2 without selection ⇒ fail closed). Journey 22 covers cross-dealer read/suspend/business-email by ID (34–36), body `dealer` injection (37), header injection (38), employment records visibility (39–40), multi-membership (41–43), staff-code authority (44–48), manager cannot promote/self-edit (52–53).
Deploy note: `X-Dealer-Org` is now an allowed CORS header in `backend/server.js` — API must be redeployed with the frontend or the selector request header is blocked by the browser.

## 12. Database / RLS
Migration `supabase/migrations/20261123200000_dealer_employment_and_staff_identity.sql` (additive, idempotent, rehearsed twice on a scratch copy; applied in the disposable stack with all 212 migrations). RLS enabled on both new tables with owner-only SELECT; writes only via service role / SECURITY DEFINER functions granted to `service_role` only. **Not applied to hosted Supabase** — owner must run it (see OWNER-COMMANDS-WINDOWS.md) and `NOTIFY pgrst, 'reload schema'`.
