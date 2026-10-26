# Phase 14.4 — Missing-Route & Backend-Gap Register

| ID | Item | Route missing or capability missing? | Finding | Action |
|---|---|---|---|---|
| G1 | Verification **review** page | Capability exists for *status* only | `GET /verification/status` is caller-scoped and read-only; approval is staff-side by design | Read-only status card in Settings. No approve/reject UI (must never be automatic) |
| G2 | Business **calendar** | **Capability missing** | No dealer calendar backend or route found (only unrelated cms/xos/lowCode hits) | Not built; needs a separately authorized backend (events table, ownership scoping) |
| G3 | Team **permissions** page | **Capability under-specified** | `PUT /team/:id` accepts a free `permissions` object but no key catalogue/enforcement map exists beyond `canManageTeam` | Not built; backend must define keys first |
| G4 | Photo management when editing a listing | Route exists in backend (image add/delete) | Not wired in the dealer form | Follow-up UI task; not required for create/edit of data fields |
| G5 | Listing delete | Route exists | Not offered (irreversible; needs a confirmation/archival policy decision) | Follow-up |
| G6 | `updateDealerProfile` writes before role check | Backend defect (low) | See settings report | Needs backend authorization to change |
| G7 | Profile GET does not return phone | Contract gap | Phone is write-only in Settings | Backend could return it to the owner |
| G8 | Legacy `/api/dealer/*` (`dealerRoutes.js`) incl. earnings/payout | Protected domain | Not touched; unrouted legacy `AddCarPage.jsx` / `EditCarPage.jsx` remain unrouted | None |
| G9 | Live-session certification | Environment missing | No Supabase/DB/JWT env, no `backend/.env`, no Postgres server | **BLOCKED** (see live-session report) |
