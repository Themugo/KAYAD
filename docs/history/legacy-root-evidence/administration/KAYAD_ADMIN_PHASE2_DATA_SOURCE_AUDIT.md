# KAYAD Admin Phase 2 — Data Source Audit

| Panel/value | Existing source observed | Trust level / current limitation |
|---|---|---|
| Total Users | Existing `adminAPI.stats()` payload, `totalUsers` | Source-level; runtime payload not verified |
| Active Staff | Existing `/admin/staff` destination | No unverified count shown |
| Verified Dealers | Existing `adminAPI.stats()` payload, `verifiedDealers` | Source-level; runtime payload not verified |
| Vehicles | Existing `adminAPI.stats()` payload, `totalCars` | Source-level; runtime payload not verified |
| Live Auctions | Existing stats `activeAuctions`; preview filters loaded vehicle records for explicit `auctionStatus`/`auction_status === 'live'` | Runtime semantics not verified; never infer live state from generic listing status |
| Open Escrows | Existing stats payload, `openEscrows` | Source-level; runtime payload not verified |
| Approval queue counts | Existing stats `pendingDealers` and `pendingCars`; route links use existing dealer verification and moderation pages | Runtime counts not verified |
| Vehicle preview | Existing `adminAPI.cars()` response; optional image, title, year, price, status | Some fields may be absent; fallback text/icon used where implemented |
| Team | Current `adminAPI.users()` sample, limited to first 50 loaded records | Not a database-wide staff count |
| RBAC summary | Roles in current loaded user sample | Explicitly sample-only; not authoritative role totals |
| System Health | Existing `/admin/control-room` destination | No embedded service status/latency invented |
| Department Overview | Existing `/admin/staff` destination | No department counts invented |
| Provider Status | Existing `/admin/provider-governance` destination | No provider connectivity claimed |
| Support queue | Existing `/admin/support` destination | No queue count invented |
| Escrow operations | Existing `/admin/escrows` destination | No dispute/escrow count invented |
| Business Calendar | No verified source identified | Omitted; no events fabricated |

No backend endpoints or API contracts were added or changed in this phase.
