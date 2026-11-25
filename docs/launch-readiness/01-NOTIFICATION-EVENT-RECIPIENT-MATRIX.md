# 01 — Notification event and recipient matrix
## Architecture (verified in code)
Producers → `emitCommunication` / `sendNotification` / `notifyDealership` → gateway. The gateway `in_app` channel now **persists a row first** in `notifications` (type mapped from the event, link restricted to same-site `/…` paths) and then emits a realtime event to the user's room; email/SMS/WhatsApp go through `communication_deliveries` with idempotency keys, retry and dead-letter (existing). The API `/api/notifications` is per-user (`user_id` from the session): list, unread count, `POST /:id/read`, `POST /read-all`, delete. The bell reads stored rows (refetch on socket event and every 30 s), so a socket event alone is never the source of truth. Hosted `notifications` has no type CHECK and a FK to `profiles(id)` (HOSTED-READONLY): compatible.

## Recipient rules (implemented in `dealershipNotifications.service.js`)
Owner always; staff only if membership `status=active` **and** the event's permission is true in their stored permissions; never another dealership; owner never duplicated; staff receive in-app only; failure never fails the business action.

## Matrix (launch-critical events)
| Event | Trigger / producer | Recipients | Permission | In-app | Email | Realtime | Dedupe | Deep link | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| Registration, e-mail verification, resend, reset | authController → gateway | the registrant only | – | – | yes (async, ledger `sent`/`failed`) | – | idempotency key, resend cooldown | verify/reset page | journey 20 (54 PASS) |
| Dealer application received | verificationController submit | applicant | – | yes | per prefs | yes | one per submit | dashboard | journey 36 |
| Dealer application ready for review | same | all admin/superadmin | – | yes | – | yes | one per submit per admin | admin console | journey 36 |
| Dealer approved | adminRoutes approve-dealer | the dealer (owner) | – | yes, **one** notice, dealer wording | yes/sms/whatsapp per prefs | yes | duplicate "Seller Account Approved" removed | `/?nav=dealer-dashboard` | journey 36, `dealerApprovalWorkflow` test |
| Dealer rejected / suspended / reinstated | verification + admin transitions | the dealer | – | yes | per prefs | yes | per decision | dashboard | code review; journeys 30/31 for state (earlier passes), **wording not asserted** |
| New enquiry (lead) | leadService `resolveLead` on create | dealer owner + active staff | `canChatBuyers` | yes | owner per prefs | yes | one per lead (journey asserts exactly 1 each) | dashboard | journey 36, 37 |
| New chat message | chatController | the other participant | – | yes | – | yes | per message | chat | journey 36 |
| Staff invitation | dealerPlatformController invite | invitee e-mail (not an account yet) | `canManageTeam` | – | yes; owner told if e-mail not delivered | – | one per invite/resend | `/dealer/setup` | journeys 17, 21 |
| Staff accepted | team accept | owner | – | yes | – | yes | once | team page | journey 17/21 |
| Role / access changed; suspended; restored; ended | updateTeamMember, employment actions | the affected staff member | – | yes, names dealership and role | – | yes | per change | dashboard | journey 36, 22 |
| Vehicle submitted / published | carController | **no notification** (per-listing review retired; publication is automatic) | – | – | – | – | – | – | gap noted below |
| Listing approved / not approved | admin listing moderation | listing owner | – | yes | – | yes | per decision | listing | code review |
| Bid decline etc. | dealerRoutes | bidder | – | yes | – | yes | – | – | deferred module |

## Negative assertions proven (journey 37, DISPOSABLE)
For one enquiry on Dealer A: A owner 1, A staff with lead permission 1, A staff without 0, Dealer B owner 0, personal seller 0, moderator 0, super admin 0, the buyer 0, anonymous cannot read (401). B's list contains nothing of A's; B cannot mark A's notification read; mark-one lowers unread by exactly one; mark-all clears only the caller's; deactivated staff receive no further enquiries.

## Gaps (not implemented — reported, not invented)
Invitation-expiry notice; per-chat-message alerts to staff; vehicle-submitted notice for dealer staff; business announcements to staff; payout status (deferred module); "failed critical communication" alert to admins beyond the existing dead-letter ledger view; login/security alert and account-restriction wording not asserted in a journey.
