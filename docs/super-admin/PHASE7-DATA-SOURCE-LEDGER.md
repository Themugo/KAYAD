# KAYAD Super Admin Phase 7 — Data Source Ledger

This ledger records source-level mappings in the supplied ZIP. It documents implemented behavior, not live runtime certification.

## Route and shell ownership

- `src/App.tsx`: `/admin` and `/admin/*` are dispatched to `AdminRouteSurface`; `/admin` is the canonical Business Command Centre route.
- `src/components/admin/AdminRouteSurface.tsx`: canonical admin route surface; route-map tests exist at `src/__tests__/components/admin/AdminRouteSurface.test.tsx`.
- `src/features/AdminView.tsx`: current command-centre view and six KPI cards.
- `src/components/layout/AdminLayout.tsx` and `AdminSidebar.tsx` re-export their canonical implementations from `src/components/admin/`; they are aliases, not evidence of a second shell.

## KPI source mappings

All six visible KPI cards originate in `AdminView.tsx`. The numeric cards call `adminAPI.stats()` through `src/api/api.exports.ts`, which calls `GET /admin/stats`. The backend route is registered in `backend/routes/adminRoutes.js`. The route uses a cache middleware and independently settles its count/aggregation queries; failed metric sources are returned as `null` and named in `unavailable`.

| Card | Frontend key / behavior | Authoritative source in current code | Current implemented semantics | Destination / caveat |
|---|---|---|---|---|
| Total Users | `stats.totalUsers`; `stat('totalUsers')` | `User.countDocuments()` in `backend/routes/adminRoutes.js` | Counts all User documents; no status filter in this query | `/admin/users`; definition includes every document currently in this model query |
| Active Staff | Intentional text action `View staff`; not a numeric stat | No Active Staff aggregate is included in the `/admin/stats` query list inspected for this card | Card opens staff workspace rather than fabricating a count | `/admin/staff`; staff count is unresolved/not exposed by this card's contract |
| Verified Dealers | `stats.verifiedDealers` | `User.countDocuments({ role: "dealer", status: "approved" })` | Counts dealer user records whose account status is approved | `/admin/dealer-verifications`; confirm destination filters match the same semantic set at runtime |
| Vehicles | `stats.totalCars` | `Car.countDocuments()` | Counts all Car documents; no deleted/status predicate in this query | `/admin/cars`; not equivalent to public/published listing count |
| Live Auctions | `stats.activeAuctions` | `Car.countDocuments({ auctionStatus: "live" })` | Counts Car documents with `auctionStatus` exactly `live`; the stats query does not itself apply a start/end-time predicate | `/admin/auctions`; runtime agreement with auction lifecycle remains to verify |
| Open Escrows | `stats.openEscrows` | `Escrow.countDocuments({ status: { $in: ["funded", "vehicle_confirmed", "delivered"] } })` | Counts escrows in these three statuses | `/admin/escrows`; status set is the current implementation, not independently redefined by Phase 7 |

### Response and UI state handling

- API adapter: `src/api/api.exports.ts`, `adminAPI.stats: () => api.get('/admin/stats').then(unwrap)`.
- Backend stats route records unavailable metric names and returns `null` for individual failed metric queries; genuine zero is preserved.
- `AdminView.tsx` tracks `statsStatus` as `loading | ready | stale | error` and retains last successful values when appropriate.
- Phase 7 makes count formatting require a non-negative safe integer. Invalid values render `Unavailable` after loading rather than being coerced to zero.
- Runtime verification of cache freshness, HTTP error responses and actual hosted response shape is blocked in this environment.

## Approval queue source mappings

| Queue | Frontend destination | Source-level contract | Authorization/evidence caveat |
|---|---|---|---|
| Dealers | `/admin/dealer-verifications` | Stats: `User.countDocuments({ role: "dealer", status: "pending" })`. Preview now uses `adminAPI.users({ page: 1, limit: 4, role: 'dealer', pendingApproval: true })`; backend `/admin/users` applies `role=dealer` and `status=pending` server-side for this filter. | Review/decision endpoints have existing role and decision-authority guards; live denied-action tests not run here. |
| Sellers | `/admin/sellers` | Existing seller workspace; `/admin/users` supports `pendingApproval=true` with seller roles when role filter is not dealer-only. | Queue's full mounted workflow and real response semantics need browser/runtime validation. |
| Inspectors | `/admin/inspector-applications` | Existing specialist destination | Specific queue contract not independently established by this command-centre source review. |
| Vehicle listings | `/admin/moderation` | Stats: `Car.countDocuments({ status: "pending" })`; user list of cars can accept `status=pending` and is server-filtered by the existing car route | Confirm the destination's exact status and review transition at runtime. |
| Document verification | `/admin/ntsa-queue` | Existing specialist destination | Underlying source/authorization contract not fully traced in this execution. |
| Inspections | `/admin/inspections` | Existing specialist destination | Underlying source/authorization contract not fully traced in this execution. |

## Other dashboard panels

- System Health links to `/admin/control-room`; `src/pages/admin/OperationsControlRoom.jsx` uses `adminAPI.getInfrastructureHealth()` and validates that a non-empty service list is returned before claiming health data is available.
- The Operations Control Room uses `adminAPI.stats()`, `adminAPI.alerts({ limit: 10 })`, `adminAPI.getAuditLog({ page: 1, limit: 20 })`, and the infrastructure-health method independently via `Promise.allSettled`.
- Recent vehicles, team preview and live-auction preview use the current first page of the general `adminAPI.cars` / `adminAPI.users` requests. They are explicitly previews, not authoritative global lists. The UI links to canonical specialist workspaces for full queues.
- The exact registered health endpoint, its production auth configuration, and live service status were not verified against a running backend in this environment.

## Unresolved source questions

1. Whether `totalUsers` should include inactive/deleted accounts is a product/domain question; current query counts all User documents.
2. Whether the `activeAuctions` card should also enforce start/end timestamps is a domain/lifecycle question; the current stats query counts `auctionStatus: "live"` only. Do not change auction logic without an authoritative existing domain rule.
3. Active Staff has no numeric count in the current KPI contract and remains a link by design.
4. Seller, inspector, document verification and inspection queues require full runtime trace to certify their current predicates and permissions.
5. No production records were inspected or changed; this ledger is based on source only.
