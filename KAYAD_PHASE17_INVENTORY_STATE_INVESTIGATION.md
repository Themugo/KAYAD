# Phase 17 — "Inventory unavailable" investigation (Workstream F)

## Trace
1. **Component.** `VehicleMarketplace.tsx`: header strip pill (`#market-journey`), a second badge in the "Vehicle Inventory" `h2`, and the full error panel in `.kayad-inventory-results`.
2. **Request.** `getCars(serverQuery)` -> `GET /api/cars?page&limit&minPrice=50000&sort=newest…` (`src/services/vehicleApi.ts` -> `src/api/httpRequest.ts` -> shared Axios client, 30 s default timeout, no automatic retry). The app shell makes a second `GET /api/cars?limit=50` for its snapshot (`App.tsx fetchVehicles`, surfaced as `loadError`). Public listing responses are cached server-side in Redis and invalidated on listing writes.
3. **Failure handling (before).** Any rejection set `serverError`; the pill said "Inventory unavailable" and the panel said "temporarily unavailable … usually brief" for every cause. `vehicleFetch` rebuilt the error from status + message only, so the body (`code`, `maintenance`, `scope`) was lost. The header pill ignored `loadError`. While loading, the pill showed the stale/initial count.
4. **Backend gates.** `app.use("/api", checkSystemStatus)` runs before routers. With `isMaintenanceMode` and scope **global**, `decide()` refuses every non-session route for an anonymous caller: public `GET /api/cars` -> **503** `{success:false, code, maintenance:true, scope, message}` + `Retry-After: 60`. **Scoped** maintenance does not block anonymous catalogue reads (audience "anonymous" is not restricted). Separately `server.js` returns 503 `DATABASE_UNAVAILABLE` for `GET /api/cars` when the control-plane DB is not configured. A legacy row (`isMaintenanceMode:true`, no scope) is normalised to **global** (documented in `normalizeSystemStatus`). The settings read is cached 10 s and fails static on read error.
5. **Authentication.** `/api/cars` listing is public; 401/403 are not expected on it, but are now classified if they occur.

## Reproduction (real local stack: disposable Postgres + PostgREST + Redis + backend; 3 labelled local test vehicles)
| State | How produced | HTTP | Before | After |
|---|---|---|---|---|
| Loaded | healthy | 200 | "3 vehicles" | "3 vehicles" |
| Loading | initial fetch | – | stale count | "Loading inventory" |
| No vehicles | rows soft-deleted in disposable DB | 200, total 0 | "No vehicles match your filters" | "No vehicles are listed right now" (filtered-empty keeps the filter copy + Reset) |
| Maintenance | disposable `system_status.isMaintenanceMode=true` (global) | **503** + `maintenance:true` | "Inventory unavailable" / "usually brief" | "Inventory paused" / "paused for maintenance" / Reference HTTP 503 |
| Server/DB down | PostgREST proxy stopped | 500/502 | "Inventory unavailable" | "Inventory unavailable" / "temporarily unavailable" / Reference HTTP 500 |
| Network | **MOCK** route abort | none | generic | "Can't reach inventory" |
| Restricted | **MOCK** 403 | 403 | generic | "Inventory restricted" |
| Timeout | **MOCK** 504 | 504 | generic | "Inventory timed out" |

Retry: the header pill is now a button (`aria-label` "Retry loading vehicles. Status: …") and the panel keeps "Retry inventory". Verified against the real stack: maintenance on -> pill "Inventory paused"; maintenance cleared (cache TTL elapsed) -> one tap on the pill -> "3 vehicles".
No state invents stock, hides an outage, or reports availability it does not have. No overflow in any state at 390 px.

## What this does and does not establish
- **Established locally:** a global (or legacy-unscoped) maintenance flag makes the public homepage show exactly the screenshot's "Inventory unavailable", and the old copy misdescribed it as a brief outage.
- **Not established:** the cause on the hosted site. No hosted request was made. The hosted `system_status` row being legacy/global (found in earlier phases) is *consistent* with this, but the hosted state is unverified. Hosted Operation A/B remain separate, unapproved operations; nothing here changes them.
- **Backend observation (not changed):** under global maintenance the public catalogue is refused for anonymous visitors. That is the existing, tested policy (global = full shutdown); whether the marketplace *should* stay browsable during a global shutdown is a product decision, not a defect fixed here.
