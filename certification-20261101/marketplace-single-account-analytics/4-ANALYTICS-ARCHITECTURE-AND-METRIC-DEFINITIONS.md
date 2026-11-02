# 4. Analytics architecture and metric definitions

## Pipeline
Browser (`services/analyticsTracker.ts`, mounted by `AnalyticsBeacon`) -> `POST /api/analytics/collect` (public, `optionalAuth`, zod-strict, rate limited, always 202) -> `analytics.service.recordEvent` -> three tables -> `analyticsReport.service` -> `GET /api/admin/analytics/{summary,live,definitions,export}` (admin + superadmin; the UI route is superadmin-only) -> `AdminTrafficAnalytics` page (`/admin/traffic-analytics`, Command Centre).

## Identifiers and privacy
- Browser creates random UUIDs: `visitorId` (localStorage), `sessionId` (sessionStorage, rotates after 30 min idle), `eventId`. No cookies, no fingerprinting.
- The server stores only **keyed HMAC hashes** (`ANALYTICS_HASH_SECRET`, falling back to a derived JWT secret) of visitor, session and user ids. Raw ids, IP addresses, full user-agent strings and user ids are **never stored** (asserted by test). A signed-in request stores a user hash, never the user id.
- Country comes only from CDN headers (`cf-ipcountry`, `x-vercel-ip-country`, `x-country-code`); no city, coordinates or IP.
- Honoured: Do-Not-Track, Global Privacy Control, a local opt-out key (`setAnalyticsOptOut`), `enabled=false` in settings. None of these produce a stored row.
- Never tracked: `/admin`, `/api`, token pages (`/reset-password`, `/verify`); query strings are dropped except the in-app `nav=` section; identifiers in paths are normalised (`/car/:id`).
- The dashboard and exports return **aggregates only**: no hashes, user ids, per-person paths or IPs (asserted by test).
- Retention: default 400 days (`analytics_settings.retentionDays`, 30-1825), enforced by `POST /api/admin/analytics/purge` (superadmin, audited).
- Event times are the server's clock.

## Tables (`20261101120000_visitor_analytics.sql`)
`analytics_visitors` (first/last seen, ever_authenticated), `analytics_sessions` (started/last seen, authenticated, device, country, source), `analytics_events` (type, normalised path, listing id, dedupe key). RLS enabled, all access revoked from `anon`/`authenticated`; only the service role reads/writes.

## De-duplication and reconciliation
- Same `eventId` retried: one row. Same session + same page within 2 s (refresh): one row. A refresh is never a new visit or visitor.
- Guest then login in the same browser: same visitor + session ids; the session is **upgraded** to authenticated and the visitor flagged `ever_authenticated`; counted once, as registered.
- A session id presented by a different visitor is refused (no replay/hijack of another visit).
- Bots: user-agent classifier (crawlers, headless, HTTP libraries, empty UA, Lighthouse) -> not stored.

## Metric definitions (also shown in-product and returned by `/definitions`)
| Metric | Counting method |
|---|---|
| Total visits | Sessions started in the period (30-min idle timeout). |
| Unique visitors | Distinct visitor hashes with a visit in the period. |
| Guest visitors | Unique visitors with no signed-in request in the period. |
| Registered visitors | Unique visitors with >= 1 signed-in request. Guest + registered = unique. |
| Authenticated sessions | Sessions with >= 1 signed-in request. |
| New registrations | `users` rows created in the period (authoritative, not client events). |
| Returning visitors | Visitors whose first recorded visit predates the period; new = unique - returning. |
| Registration conversion | Visitors with a `registration` event / unique visitors. |
| Page views | page_view + listing_view + auction_view events. |
| Most visited pages / listings | Views by normalised path / public listing id (titles joined from `cars`). |
| Auction page views | `auction_view` events (+ visitors). |
| Traffic sources | Channel that started the visit: direct, search, social, email, campaign, referral (+ top referrer hosts). |
| Geography / Devices | Country from CDN header ("Unknown" if absent); mobile/tablet/desktop from UA at visit time. |
| Live activity | Sessions with a request in the last 5 min; heartbeat ~60 s while visible; dashboard refreshes every 30 s (both stated on screen). |
Not the same quantity: page views, visits, unique visitors, registered accounts, authenticated sessions, active users, auction participants (the latter come from the auctions system).

## Ranges, comparison, honesty
Today / Yesterday / 7 / 30 / 90 days / custom (validated: order, <= 366 days, not future), all in Africa/Nairobi. Previous-period comparison appears only when tracking began before the previous period; otherwise the UI says why. If tracking started inside the selected period the page shows "Reliable tracking begins <timestamp>". With no data it shows zeros and "No visitor analytics have been collected yet". Nothing is estimated or back-filled; no sample numbers exist in the code. Reads are capped at 200,000 rows per query with a visible `truncated` flag.

## Export
CSV for summary, daily, pages, listings, sources, devices, geography; each export is written to the security/audit log (`analytics_report_exported`); spreadsheet formula injection is neutralised.

## Authorization
Collect: public (that is the point; it never returns data). Read/export: admin + superadmin on the API (sidebar link and page are superadmin-only). Purge: superadmin only. Tested for buyer, moderator and anonymous callers.
