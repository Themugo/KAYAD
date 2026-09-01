# KAYAD Phase 3 — API / Database Contract Consolidation

## Objective

Align the browser application with the repository's canonical backend authentication and data-access architecture before provisioning the new production Supabase project.

## Canonical runtime contract

Browser → KAYAD HTTP API → Express controllers/services → Supabase/PostgreSQL

Authentication is owned by the KAYAD backend. The backend issues the access JWT as an HttpOnly `token` cookie scoped to `/api`. Frontend API calls therefore use `credentials: include` / Axios `withCredentials: true` and do not read or persist access tokens in browser storage.

Supabase's frontend client is retained only for the Realtime layer. It does not create or maintain a second Supabase Auth session.

## Changes made in Phase 3

1. `src/api/api.ts`
   - enabled `withCredentials: true`.
   - removed the `localStorage` bearer-token interceptor.
   - removed client-side deletion of `kayad_token` on 401.
   - retained the auth-expired event so application state can react to an invalid backend session.

2. Legacy Axios API modules under `src/services/*Api.js`
   - removed browser `localStorage.getItem('token')` bearer injection.
   - enabled `withCredentials: true` so protected routes receive the backend HttpOnly cookie.

3. `src/pages/ForcePasswordChange.jsx`
   - removed the obsolete `gari_token` browser-storage write. Password-change responses do not expose an access token.

4. `src/lib/supabaseClient.js`
   - removed Supabase Auth session handling from the frontend client.
   - configured the client strictly as a Realtime client.
   - disabled session persistence, token auto-refresh, and URL auth detection.

5. Removed duplicate/dead frontend Supabase helper modules:
   - `src/lib/supabase.ts`
   - `src/lib/supabaseClient.ts`

## Contract findings retained for the next phase

### Realtime

`src/context/SocketContext.tsx` currently subscribes directly to Supabase Postgres Changes, while the backend also has a Socket.IO server. This is a genuine architecture split. It must be resolved in the Realtime phase rather than silently maintaining two competing event systems.

The backend Socket.IO implementation authenticates with the KAYAD JWT. Supabase Realtime does not automatically understand that custom KAYAD identity. Therefore protected user-specific Realtime subscriptions must not be assumed to work merely because the Supabase client connects.

### Data model naming

The canonical vehicle table is `cars`, with `cars.images` as JSONB and `bids.car_id` referencing `cars.id`. The frontend's old direct Supabase helper that queried `vehicles` and inserted `vehicle_id`/`bidder_id` has been removed as dead/incorrect architecture.

### API authority

Marketplace writes, authentication, bidding, payments, escrow, dealer workflows, inspections, support and admin operations should continue through the KAYAD API. The browser should not bypass those server-side authorization/business rules by writing directly to Supabase tables.

## Phase 3 acceptance criteria

- No production frontend code reads `token`, `kayad_token`, or `gari_token` from browser storage.
- Protected Axios clients send credentials automatically.
- Backend authentication remains the sole application authentication authority.
- No production frontend code queries a non-existent `vehicles` table directly.
- No frontend bid path simulates a successful write when Supabase configuration is absent.
- Supabase frontend client is not used as a second authentication system.
- Remaining Realtime architecture split is explicitly isolated for the dedicated Realtime phase.
