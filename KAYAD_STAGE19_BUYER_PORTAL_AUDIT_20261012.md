# KAYAD Stage 19 — Buyer Portal End-to-End Boundary Audit

**Date:** 2026-10-12  
**Foundation:** `KAYAD-STAGE18-PUBLIC-FINANCING-CONVERGENCE-20261012.zip`  
**Foundation SHA-256:** `a0b50f9643c08697ebe9de731e99554434a5f08fa7bce9701791571bb02d565b`  
**Scope:** My Garage, saved vehicles, financing applications, inspection orders/reports, escrow participant deals, messages, notifications, account switching, server-side ownership checks and workflow navigation.

## Outcome

Stage 19 is a targeted convergence patch on top of Stage 18. It preserves the existing marketplace and domain implementations; it does not add a second portal, mock records, or a new workflow engine.

### Fixes applied

1. **My Garage account-switch isolation.** The buyer workspace now keys fetches by the authenticated user ID, cancels stale in-flight results, clears previous data when the identity changes, and masks arrays until the current account's load completes. This prevents an old response from overwriting the next account's view and prevents a prior account's data flashing during a render/effect boundary.
2. **Honest API failure states.** Favorites and ownership data load independently with `Promise.allSettled`. Failed requests are no longer converted into apparently successful empty lists; the affected section says it could not load and offers retry.
3. **Previously discarded ownership data.** My Garage already called `getOwnershipDashboard()` and stored `ownedVehicles`, but never rendered the result. The existing owned-vehicle records now appear in a compact section using the existing backend response.
4. **Saved-vehicle action.** A saved-vehicle card now navigates to the canonical saved-only inventory (`saved`) instead of the generic marketplace (`marketplace`). The existing saved inventory's quick-view action remains the route to vehicle details; this patch does not invent a parallel detail route.
5. **Escrow shortcut correction.** The buyer dashboard's “Escrow vault” action previously opened `EscrowView`, which is the public escrow explainer. It now opens the authenticated `buyer-platform` workspace containing `ParticipantEscrowDesk`, and is labelled “My escrow deals”.
6. **Messages shortcut.** The buyer dashboard now includes a Messages shortcut to the existing authenticated `chat` workflow.

## Source-level ownership review

| Surface | Source-level result | Boundary observed |
|---|---|---|
| Saved vehicles | PASS | Favorites routes inherit `protect`; list/count and mutations are scoped by `req.user.id`. |
| My Garage / ownership | PASS | Ownership routes require authentication; owner service calls receive `req.user.id`. |
| Financing applications | PASS | `/my` requires authentication and queries `applicant: req.user.id`; all-applications and status-review routes are admin-only. |
| Legacy inspection orders/reports | PASS | Buyer list is filtered by `requester_id`; route requires auth. |
| Inspection marketplace bookings | PASS | Customer booking list is filtered by customer ID; booking detail and cancellation enforce customer ownership. |
| Escrow deals | PASS | Participant list queries buyer or seller against the authenticated ID; single-record/state paths call `canViewEscrow`. |
| Messages | PASS | Chat routes require auth; message reads/writes and leaving a chat check participant membership; private attachment access checks membership and sends `private, no-store`. |
| Notifications | PASS | Routes require auth; reads and mutations scope by recipient; UI masks data unless its session key matches the current account. |
| Chat account switch | PASS | Thread data is hidden unless `threadsOwnerId` equals current user ID; stale fetches are ignored. |
| Notification account switch | PASS | Notifications and unread counts are synchronously masked until `dataSessionKey` matches the active session. |

These are **source-level findings**, not proof of live authorization behavior. A real cross-account request matrix is still required against staging to prove database/RLS behavior and deployed route parity.

## Remaining verification gaps

- No dependency installation, full TypeScript semantic typecheck, Vite production build, Vitest/Jest runtime suite or Playwright browser run was available in this environment. Runtime uses Node `v22.16.0`, below the project's required `>=22.22.2`, and the workspace has no `node_modules`.
- No authenticated two-account browser run was performed. Verify account A → logout → account B, account A → B while requests are in flight, and logout while child workspaces are loading.
- No staging IDOR/RLS matrix was executed. Test user A against user B's favorite, ownership vehicle, loan application, inspection order/booking/report, escrow ID, chat ID/attachment and notification ID. Confirm unrelated resources return the expected 403/404 without mutation or PII leakage.
- Message and notification surfaces remain canonical separate authenticated workflows (chat and `/notifications`), not duplicated inside My Garage. The buyer dashboard exposes Messages; the existing notification entry point remains the canonical `/notifications` route.
- A saved card routes to the saved-only inventory, not directly to its exact vehicle detail. That existing inventory provides the quick-view action; direct deep-link behavior should be verified in browser E2E before changing navigation contracts.
- Production URLs, Supabase RLS, real provider integrations, financial/escrow actions and deployment status were not modified or certified.

## Guardrails

No commit, push, deployment, migration, payment, provider transaction or production mutation was performed. The complete Stage 18 foundation is retained in the Stage 19 archive; only three existing files were modified and the Stage 19 validation/report artifacts were added.
