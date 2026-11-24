# Workflow end-to-end verification (2026-11-24)

Evidence tier: **local disposable stack only** (real backend, real PostgREST, real Postgres built from `supabase/migrations`, loopback e-mail stub). Not hosted, not production. No real broadcast, message, payment, panic or recovery action was executed.

Legend: VERIFIED (executed with assertions) / PARTIAL / NOT VERIFIED / UNAVAILABLE (intentionally not provisioned).

| Workflow (brief section 9) | Status | Evidence (journey: checks) | Not covered |
|---|---|---|---|
| Dealer registration -> verification -> approval -> verified visibility | VERIFIED | 24 (free registration, pending state, owner approve/reject, workspace), 23, 12 | Hosted behaviour; real e-mail delivery |
| Personal account register -> available -> admin block -> restore | VERIFIED | 26 (block/restore, records retained, no approval gate, 409 SELLER_APPROVAL_NOT_REQUIRED), 24 | Browser click-through of the block dialog |
| Vehicle submission -> moderation -> marketplace visibility | VERIFIED | 07/09/11 (publish/pause/republish, no per-listing pre-approval), 28 M1-M5 (takedown/restore, sold protected, auth) | Photo upload (no image provider) |
| Auction creation -> bids -> outcome | NOT VERIFIED | journeys 05/09 only cover sale-vs-escrow locks | Auction engine untouched; needs its own journey |
| Escrow -> transaction records | PARTIAL | 03 (reconciliation issues), 05 (offer payment; settlement function SIMULATED, M-Pesa not executed) | Admin escrow actions; financial logic deliberately untouched |
| Support ticket -> response -> resolution | VERIFIED | 28 S1-S9 (create, ownership, queue gate, oversight read-only, public vs internal reply, status transitions, illegal transition refused) | Customer rating; SLA timers |
| Reports -> review -> enforcement | VERIFIED (local) | 27 A1-A11 | Needs the migration on hosted |
| Feedback -> read -> addressed | VERIFIED (local) | 27 B1-B5 | Needs the migration on hosted |
| Broadcast (draft/history/audience) | PARTIAL | 27 C1-C6 | **Send** not executed by design |
| Market data create/list | PARTIAL | 27 D1-D3 | Update/delete |
| NTSA queue request -> decision | VERIFIED (local; internal queue, not a live NTSA integration) | 27 D4-D7, D6b | Hosted migration; real NTSA lookup does not exist |
| Staff creation -> role -> authorised access | VERIFIED (authorization) | 26, 14 (every staff role x every admin write endpoint), 22 | Full create/offboard UI flow |
| Dealer staff separate from platform staff | VERIFIED | 26 section 2 (dealer team staff refused every admin API), 21/22 (membership revoked, personal account intact) | |
| Site design / CMS -> public result | PARTIAL | 27 F4-F6 (authorization; public CMS unaffected) | Publishing and public rendering |
| Security events / monitoring | PARTIAL | 27 F1-F3b | Real provider health (not claimed) |
| Panic Room / Platform Recovery | NOT VERIFIED | pages open as Super Admin | **Deliberately not executed** |
| Studios (automation, config, low-code, VXP, XOS, AI, digital twin) | UNAVAILABLE | 27 E (503 FEATURE_NOT_PROVISIONED) | Needs owner-approved data model |
| Inspections, inspector applications, ads, referrals, reviews, chats, featured vehicles, traffic, communications, provider governance | NOT VERIFIED | open only (sweep) | Each needs its own journey |

## New journeys this phase
- `27_customer_care.mjs` - 47 checks (reports, feedback, announcements, market data, NTSA, 8 not-provisioned endpoints, security-log and CMS authorization, public CMS preserved).
- `28_support_and_moderation.mjs` - 16 checks (support lifecycle, listing moderation).

## Defects the journeys found (all fixed, see matrix)
1. Report-queue `listing_removed` wrote an invalid `cars.status` ('rejected') and answered 500 after saving the report.
2. NTSA approval wrote a non-existent `cars.verified_by` and answered 500 after saving the request as final.
3. `/security-logs/my` and `/security-logs/summary` answered 500 when `security_logs` is absent.
4. Tables for reports, feedback, announcements (and the two hosted-only tables) were missing from the migration chain.
5. Security-log API did not enforce the `VIEW_LOGS` permission the UI requires; CMS Studio reads were open to every signed-in account.
