# KAYAD Admin Phase 4 — Data Provenance

This report records the current source-level interpretation only. Live payload verification is still required.

| Panel/metric | Current source/field | Interpretation safeguard | Remaining verification |
|---|---|---|---|
| Total Users | `adminAPI.stats()` → `stats.totalUsers` | Missing/non-number values render unavailable/loading, not zero | Verify actual authorized payload |
| Active Staff | Existing `/admin/staff` destination | Not fabricated from a limited user sample | Determine whether an existing authoritative count is exposed |
| Verified Dealers | `adminAPI.stats()` → `stats.verifiedDealers` | Uses existing API stats field | Verify actual authorized payload |
| Vehicles | `adminAPI.stats()` → `stats.totalCars` | Missing/non-number values render unavailable/loading, not zero | Verify actual authorized payload |
| Live Auctions | `adminAPI.stats()` → `stats.activeAuctions`; panel rows filter loaded vehicle records for explicit live auction status | Do not infer live status from generic listing state; no invented bid counts/countdowns | Confirm API semantics and returned values |
| Open Escrows | `adminAPI.stats()` → `stats.openEscrows` | Missing/non-number values render unavailable/loading, not zero | Verify actual authorized payload |
| Approval dealers | Existing users response and pending-dealer filter; authoritative workflow `/admin/dealer-verifications` | Loaded user sample is not the full queue; fallback directs to authoritative workspace | Verify queue response and authorization |
| Approval vehicles | Stats `pendingCars`; workflow `/admin/moderation` | Counts use existing stats response | Verify payload and destination |
| Recent vehicles | `adminAPI.cars()` loaded records; title/year/price/images/status when available | No mock records; image failure falls back to icon | Browser verify real response shape |
| Team members | Current loaded users sample filtered by existing staff role list | Empty-state copy explicitly directs to authoritative staff workspace | Verify source sample and role semantics |
| RBAC summary | Unique role values in currently loaded user sample | Visible note says counts reflect only current sample | Keep limitation; don't represent as organization totals |
| System health | Existing `/admin/control-room` destination | No fabricated status or latency | Embedded panel only if current frontend source exists |
| Departments | Existing staff/departments workspace destination | No fabricated counts | Verify existing contract |
| Provider status | Existing `/admin/provider-governance` destination | No false connected/disconnected claims | Verify existing status source |
| Calendar | No verified existing source found in this scoped pass | Do not fabricate events | Omit unless existing source is discovered |
