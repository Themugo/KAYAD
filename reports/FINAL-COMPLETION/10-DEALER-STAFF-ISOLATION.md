# 10 — Dealer / Staff Isolation

**Evidence: new journey `ci/db-journeys/16_isolation_and_sessions.mjs` — 31/31 checks, real backend + disposable Postgres, no mocks** (`evidence/16-isolation-sessions.log`, `evidence/isolation-sessions.json`). Plus the existing staff write matrix (journey 14: 385 calls, 35 write routes, 0 violations).

## Reconstructed permission model (from code, not assumed)
- Owner: role `dealer` → all dealer permissions. Team member: a **personal account** (role `user`) with an ACTIVE `dealer_teams` row; membership re-read on every request (`dealerWorkspace.js`, `dealerOrgAccess.js`); several active memberships → fails closed.
- Built-in team roles (`dealerTeamRoles.service.js`): manager {list, edit, delete, earnings, approveDeals, chat, settings}; sales_agent {list, edit, chat}; lot_agent {list, edit}; finance_officer {earnings, approveDeals}; viewer {} (no permissions). **Team management is owner-only (manager cannot).** Owner-only surfaces: subscription, finance, marketing, copilot, reputation, analytics recommendations.
- Platform staff roles (10): admin, superadmin, marketing, technical_support, hr, accounts, escrow_officer, ad_manager, moderator, ghost_checker; guards from `ROLE_PERMISSIONS`.

## Cross-business object isolation (dealer A acting on dealer B) — VERIFIED
12 direct attempts across `/api/dealer-platform/inventory/:id` (PUT, DELETE, bulk), `/api/cars/:id` (PUT, DELETE), `/api/dealer/cars/:id/{pause,publish,mark-sold}`, `/api/dealer/cars/bulk-status`, `/api/dealer-platform/leads/:id` (PUT, activities, notes): **all refused (403/404/409/400; none 2xx, none 5xx)**; B's listing row unchanged byte-for-byte; A's inventory and my-listings queries never return B's rows; bulk mixing own+foreign ids never changes the foreign one; A cannot update B's dealer profile; anonymous → 401; personal buyer → 403. Team members of A cannot edit B's listing.

## Not exercised here (honest gaps)
Exports, realtime channels, storage/Cloudinary object access and cache keys were **not** probed object-by-object in this phase (Cloudinary BLOCKED, see 08). Existing unit suites cover ownership in controllers (`phase13dDealerIsolation`, `dealerWorkspaceDelegation`). Marked PARTIAL.

## Staff
Journey 14 (unchanged, passing): every staff role refused on admin write routes it is not allowed; personal/dealer → 403; anonymous → 401/403.
