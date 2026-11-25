# 07 — First-dealer readiness audit (notifications + onboarding lifecycle)

Scope: dealer notification flow; personal and dealer registration → verification → approval → listing → enquiries → staff → public presence.
Out of scope (phased rollout, not audited for go-live): auctions, escrow, mechanic, pre-inspection.
Labels: **PASS** = executed here against a disposable PostgreSQL + PostgREST + the real Express app. **NOT RUN** = not executed. **NOT VERIFIED** = depends on your hosted environment, which this audit cannot see.

## Verdict

**GO for the first dealer and personal accounts, conditional on the 6 configuration checks in section 4 and on you accepting the open items in section 5.** The code path is PASS end to end. Hosted configuration is NOT VERIFIED.

## 1. Notification audit — what was wrong

| # | Defect | Effect | Fix |
|---|---|---|---|
| 1 | Gateway `in_app` channel emitted a socket event and **persisted nothing** | Every event sent through the gateway (dealer approved, application received, etc.) vanished on refresh/offline; bell showed stale or zero | Gateway now stores the row (type mapped from event, safe in-app link) and emits it |
| 2 | Dealer approval produced two notices: a gateway one (lost) and "Seller Account Approved" | Wrong wording for a dealer, duplicate | Single notice "Dealer account approved", dealer wording, link to dashboard |
| 3 | New enquiry (lead) never notified the dealership | Dealer learnt of leads only by opening the dashboard | Dealership notified "New enquiry" naming the vehicle; owner + active staff with `canChatBuyers` |
| 4 | Staff were never told about role/permission/employment changes | Staff unaware access changed | Staff notified in-app on role change and on employment actions |
| 5 | Admins not told a dealer application was waiting | Applications sat unseen | Admin/superadmin notified "Dealer application ready for review" |
| 6 | Notification type free text with unknown values | Wrong icons/filters | Valid types extended; unknown event maps to `info` |
| 7 | Bid-decline notification used the old positional call | Mis-shaped record | Converted to the object call |

Isolation: another dealership received none of the first dealership's notifications (PASS).

### Event matrix (who gets what)

| Event | Owner | Staff | Admin | Channels |
|---|---|---|---|---|
| Application submitted | acknowledgement | – | "ready for review" | in-app (+ email per prefs) |
| Dealer approved | "Dealer account approved" | – | – | in-app, email, SMS, WhatsApp (per preference/provider) |
| New enquiry | yes | active staff with `canChatBuyers` | – | owner: in-app + email/SMS per prefs; staff: in-app only |
| New chat message | yes | NOT per message (open item) | – | in-app |
| Staff role / permission / employment change | – | the affected person | – | in-app |

## 2. Lifecycle test (journey 36) — PASS 23/23

Personal sign-up usable immediately · session works · dealer registers pending · application acknowledged · admins told · approval (one notice, dealer wording) · publish with photo, live, no per-listing approval, on public marketplace · edit price/body type/features · in inventory · lead created and dealer told (names the vehicle) · invite employee, assign Sales agent, employee told · Sales agent sees leads and is told of new enquiry · second dealership isolated · unread count equals unread rows.

## 3. Regression after the fixes

- Backend Jest (communications, regression, auction): 189 suites / 3,028 tests PASS (after fixing two tests of mine, below).
- Other Jest suites (escrow, inspection, admin, auth, payments, etc.): PASS; vitest 61/61; node:test 34/34.
- Journeys 21, 22, 30, 36 PASS on a clean disposable stack. Journey 20 ran in the same set (see out logs).
- Tests I had to change, and why: `dealerApprovalWorkflow` pinned the removed duplicate "Seller Account Approved" notice, now pins exactly one dealer-approval communication; `phase13dDealerIsolation` mocked the platform controller without the r2 `resetTeamRole` export. Neither weakens a security assertion.
- New: `dealershipNotifications.test.js` (owner/staff targeting, other-dealership isolation, no double notice, failures never break the business action).
- NOT RUN: browser e2e of the notification bell (journey proves API and DB state, not pixels). Full journey set 1–35 not re-run in this pass.

## 4. Go-live configuration checklist — all NOT VERIFIED
1. Email provider (Brevo) key and verified sender: registration verification and approval emails depend on it.
2. Cloudinary credentials: listing photos fail to upload without them.
3. Redis reachable: sessions, locks, rate limits.
4. A platform owner/superadmin exists (the owner approves dealers).
5. Paperwork policy: journey submitted empty documents successfully on the disposable stack; check what production requires so your first dealer is not blocked or waved through unintentionally.
6. Frontend `VITE_API_URL`/CORS/cookie domain match the hosted API, and the 217 migrations are applied.

## 5. Open items (not changed; need your decision)
- **Public dealer profile page is a stub** (`DealerProfilePage.tsx` renders "Dealer profile unavailable"; no public profile API). Listings themselves are public and verified. Buyers cannot open a dealership storefront. Building it is new scope; I did not invent it.
- **Pending dealers can list under progressive access** (policy). Confirm that is intended before the first dealer; approve first if not.
- Staff are not notified per chat message.
- Subscription gate is off by default (`dealerListingPolicy.subscriptionRequired=false`): listing is not payment-gated.
- Basic Staff Access remains deliberately locked (r2 decision).

## 6. Phase 2 (not audited)
Auctions, escrow, mechanic and pre-inspection stay behind their rollout controls.
