# Stage 5F.6 — Buyer API Verification Matrix

| Frontend surface | Canonical client / endpoint evidenced in source | Authorization/data boundary | Stage result |
|---|---|---|---|
| Saved vehicles | `getFavorites()` from `src/services/favoriteApi.ts`, `/api/favorites` | Client documents authenticated routes; backend caller-scoped checks covered by buyer portal boundary validator | Static boundary PASS; runtime blocked |
| Ownership dashboard | `getOwnershipDashboard()` from `src/services/ownershipApi.ts` | Existing authenticated owner-scoped route/service | Static boundary PASS; runtime blocked |
| Bid history | `fetchMyBids()` from `src/services/bidApi.ts`, `/api/bids/my` | Existing authenticated bid API; no new endpoint created | Source-contract PASS; runtime blocked |
| Auction discovery | Existing `AuctionsView` and auction service (`fetchList`) | Existing auction APIs and server-side auction rules | Existing source retained; browser blocked |
| Inspection history | `getMyInspections()` from `src/services/inspectionApi.ts`, `/api/inspections/my` | Authenticated and requester-scoped according to existing source/validator | Inspection validation PASS; runtime blocked |
| Inspection request | `createInspectionOrder()` → `/api/inspections/order` | Existing authenticated canonical request API | Not modified; staging flow unverified |
| Participant escrow overview | `getMyEscrowOverview()` and existing escrow client methods | Participant/staff authorization checks covered by existing source validator | Transaction/source checks PASS; runtime blocked |
| Financing | Existing `FinanceMarketplace` in account mode | Existing authenticated account component | Reused; runtime blocked |
| Messages | Existing `chat` navigation and chat system | Existing participant membership controls covered by buyer portal boundary validator | Static boundary PASS; browser blocked |

No new backend endpoint, database table, migration, RLS policy or payment path was added. This matrix records source evidence, not a claim of deployed API health.
