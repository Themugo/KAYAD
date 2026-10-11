# KAYAD Messaging & Notification Security Matrix

**Scope:** source-level convergence in the current ZIP. This is not a live RLS or staging certification.

## Role and workflow policy

| Actor | Inbox / message access | Creation/routing rule | Attachments / internal data | Verification status |
|---|---|---|---|---|
| Anonymous visitor | No protected chat API access | Cannot create or read chats | No access | Source routes retain `protect`; live negative test BLOCKED |
| Buyer / marketplace user | Only chats whose participants include current user | Vehicle inquiry recipient must match listing owner; self-chat rejected | Only participant-bound attachments; no support internal notes | Source verified; API/RLS test BLOCKED |
| Private seller (`individual_seller`) | Only own participant chats | Vehicle-linked inquiry routes to listing owner account | No other seller's chats or files | Source verified; two-account staging test BLOCKED |
| Dealer | Only own participant chats | Vehicle-linked inquiry routes to the account recorded in `cars.dealer_id`; team-wide access is not inferred | No other dealer's chats/files from this chat API | Source verified; dealer tenant matrix BLOCKED |
| Authorized dealer team member | Existing explicit dealer/team authorization applies in dealer domain; this generic chat endpoint does not invent team membership | Must be routed through actual existing dealer domain contract | No cross-dealer access | Needs domain-specific staging test |
| Inspection provider | Use existing assigned inspection workflow and inspection chat bridge | Generic new direct chats to staff roles are rejected; inspection chat RPC remains canonical | Only assigned inspection and participant chat data | Source-level socket membership check; live inspection E2E BLOCKED |
| Financing provider | Use the existing financing application workflow | No invented financing conversation category in generic chat | Only records authorized by financing domain | Requires application-specific staging test |
| Escrow officer | Use escrow/dispute transaction workflow | Staff role cannot be contacted by creating arbitrary new generic chat | Generic chat attachment admin bypass removed | Source verified; live escrow case test BLOCKED |
| Technical support | Use canonical support tickets/case workflow | Generic new direct chat to staff role is rejected | Support internal notes remain within support case permissions | Existing support validator 19/19 PASS; live Supabase grant test BLOCKED |
| Admin / superadmin | No blanket bypass for generic chat history or attachments | New generic direct chat creation to staff roles rejected | Admin role alone does not authorize private chat attachment access | Source verified; live privilege matrix BLOCKED |
| Other staff roles | Use their authorized operational workflows | Direct chat creation blocked for roles in `STAFF_ROLES` | No generic chat privilege from staff status | Source verified; role matrix staging BLOCKED |
| Service account / webhook | Existing authenticated service/provider contract only | No user-supplied role or recipient authority | Secrets remain server-side | Provider certification BLOCKED |

## Enforcement controls observed or changed

- Chat routes are mounted behind authentication middleware.
- Inbox query filters conversations by `participants` containing the authenticated user.
- Message history and send operations verify participant membership.
- Socket `joinChat` checks authenticated session and actual conversation participant membership before joining `chat_<id>`.
- Attachment retrieval now requires actual chat participant membership; administrator status alone no longer bypasses the boundary.
- New vehicle-linked chat creation validates recipient existence, listing ownership, listing status and approval.
- New direct chats to staff roles are routed away from the generic inbox and toward existing case/transaction workflows.
- Inbox response computes per-chat unread count from persisted message metadata, then removes raw `messages` from the summary response.
- Message notifications use the existing outbox and canonical `/?nav=chat` destination.
- Notification list, read and delete endpoints are authenticated and owner-scoped.
- Notification UI discards stale responses and mutations when the authenticated user changes.
- Public UI no longer presents nonexistent escrow/inspection/finance/NTSA/audit/vault data as if it were connected to the generic chat schema.

## Required staging negative tests

1. Buyer A cannot list, read, mark read, send to or retrieve attachments from Buyer B's chat.
2. Dealer A cannot access Dealer B's chat or listing conversation.
3. A client cannot forge a recipient, role, dealer ID or vehicle ID to route an inquiry to an unrelated account.
4. A hidden, draft, deleted or unapproved listing cannot be used to start a new inquiry.
5. A non-participant cannot join a socket room or receive the `newMessage` payload.
6. An admin who is not a participant cannot retrieve a private chat attachment.
7. Support staff must use assigned support-case permissions; internal notes never enter public chat messages.
8. Notification A cannot be read/deleted by account B; stale account A responses cannot replace B's inbox state.
9. Logout/session expiry and socket reconnect do not preserve unauthorized room access.
10. Legacy Cloudinary assets are inventoried and tested for access after participant access is revoked.

**Status:** source-level checks passed. Actual two-account API, PostgreSQL RLS, Redis multi-instance, browser and hosted provider tests remain BLOCKED.
