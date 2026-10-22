# KAYAD Phase 6 Final Data Provenance Status

This run did not have an authenticated application session or approved staging data source. Therefore no claim is made that dashboard values were verified against live data.

| Dashboard domain | Required source-to-UI check | Status | Evidence needed |
|---|---|---|---|
| KPI cards | Endpoint/field/aggregation/currency/date window and missing-vs-zero behavior | NOT VERIFIED | Authorized staging responses and browser assertions |
| Approval queues | Count/list agreement, empty/error/forbidden states, permitted action and denied action | NOT VERIFIED | Safe test records, role matrix and route/API traces |
| Vehicle submissions | Real record fields, images/fallback, moderation status, canonical destination | NOT VERIFIED | Staging records and screenshots/network traces |
| Auctions | Backend status/time semantics, counts, canonical detail route | NOT VERIFIED | Actual auction fixtures in approved test environment |
| Staff/governance | Effective roles, direct URL access and server-side denial | NOT VERIFIED | Owner/admin and restricted test identities |
| Providers/health | Configuration vs delivery evidence vs live connectivity and freshness | NOT VERIFIED | Approved health source and timestamped response |
| Request lifecycle | Partial failure, retry, stale/out-of-order responses, refresh races | NOT VERIFIED | Browser/network test evidence |

Do not populate these rows with invented numbers or synthetic production claims.
