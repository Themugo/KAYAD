# Dashboard data integrity (2026-11-24)

| Panel / figure | Before | Now | State |
|---|---|---|---|
| KPI tiles (Total Users, Verified Dealers, Vehicles, Live Auctions, Open Escrows) | server counts with per-metric failure handling | unchanged; null = "Unavailable", never 0 | Existing and confirmed correct |
| Active Staff | (previous pass) verified count of non-banned platform staff, never dealer-team members | unchanged | Fixed and verified (journey 26) |
| Team Members | first 3 staff found inside a 50-row user sample (could miss staff) | reads the complete platform staff list (`GET /admin/staff`, Super Admin only); shows "Showing 3 of N active KAYARD platform staff"; banned excluded; other roles see "restricted to the Super Admin"; failure = "Staff list unavailable", empty list = real empty state | Fixed and verified (vitest) |
| Role-Based Access Control counts | counted roles of the user sample (including customers/dealers) and said "sample" | per-role counts of ACTIVE platform staff from the complete list; customers, dealers and dealership team members are not roles here | Fixed and verified (vitest) |
| Recent Vehicle Submissions | newest 4 of a 50-row page, no total | states "Newest 4 of N vehicle records (server count, newest first)" or "total unavailable"; says when a filter is active | Fixed and verified (vitest) |
| Live Auctions rows | latest vehicle records | note states the server total and that rows may not list every live auction | Existing and confirmed correct |
| Recent Activity | audit log | "Actor not recorded" when no reliable actor; links to the Security Log (requires VIEW_LOGS) | Existing and confirmed correct |
| System Health | per-check status healthy/degraded/down/unavailable/unknown | "Check unavailable" when a source fails; a successful HTTP request is not presented as provider connectivity | Existing and confirmed correct |
| Alerts | fetched list | "No alerts were returned" only after a successful response; failure/403 shown distinctly | Existing and confirmed correct |
| Header bell | real unread count only | unchanged | Fixed and verified (previous pass) |
| Security Log summary | 500 when `security_logs` absent; UI rendered missing figures as 0 | audit-log fallback; unavailable figures shown as "unavailable" with a source note | Fixed and verified (jest, journey 27 F3b) |

Zero vs unavailable vs failed vs stale: real zero is shown as 0; null / unreadable source = "Unavailable" with the failing source named; HTTP failure = classified message (maintenance, forbidden, server, network, **not provisioned**); stale = last verified value kept and marked stale.
Not changed: panels that are intentionally sample-based elsewhere (AdminUsers filters, specialist pages) - listed in the matrix.
