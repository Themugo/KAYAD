# KAYAD Super Admin — Data Provenance Matrix

For every figure, list and status shown on the dashboard and the studios that were corrected: where it comes from, what the page does when the source is slow, empty, failing, restricted or malformed, and what was removed because it had no source. The page-by-page source inventory (every route, every API call, every state) is in `KAYAD_SUPER_ADMIN_FEATURE_DATA_SOURCE_MAP.csv`.

Rules applied everywhere: a missing, malformed, negative or non-numeric value is shown as **Unavailable**; a failed request is an explicit message (never an empty list or a zero); a 403 is described as an access boundary, not an outage; an empty list is described as empty; nothing is estimated, defaulted or "typical".

## 1. Dashboard (`/admin`, `/admin/dashboard`) — `src/features/AdminView.tsx`
All five core sources are requested together with `Promise.allSettled` and a load-sequence guard, so one failing source never erases another and a slow refresh cannot overwrite newer data.

| Element | Source (existing) | Loading | Empty | Failed | Restricted (403) | Malformed |
|---|---|---|---|---|---|---|
| Hero name / role / initials | Authenticated session (`useAuth`) | — | "Account name unavailable" / "Role unavailable" | — | — | Non-string → fallback text, never a guess |
| KPI Total Users, Verified Dealers, Vehicles, Live Auctions, Open Escrows | `adminAPI.stats` → `stats.*` | "Loading…" | A genuine `0` is shown as 0 | "Unavailable" + alert naming the source | "Unavailable" + access-boundary note | Non-safe-integer / negative → "Unavailable" |
| KPI Active Staff | **No count source exists** | — | — | — | — | Shows the link text "View staff"; no number is invented |
| Quick actions | Role permissions (`PAGE_PERMISSIONS`) | — | Hidden if the role may not open the page | — | — | — |
| Approval workbench / pending dealers | `adminAPI.users` (pending-dealer filter) | Loading text | "No pending dealers" | Alert | Boundary note | Rows without id skipped |
| Recent vehicle submissions | `adminAPI.cars` | Loading text | Empty note | Alert | Boundary note | Missing price/year omitted, never 0 |
| Live auctions | `adminAPI.cars` filtered by existing `auctionStatus === live` | "Loading auction records…" | Honest empty note | Alert | Boundary note | Bids/prices only when numeric |
| System Health | **Existing** `adminAPI.getInfrastructureHealth` (`/ecp/health`) via `AdminSystemHealthPanel` | "Checking service health…" | "No verifiable service checks" | "Unknown — no status is assumed" | "Not included in your role" | Unrecognised status → "Unknown"; negative latency dropped |
| ↳ service names, status | Returned by the health source only | | | | | A category is never added by the UI |
| ↳ latency | Shown only when the source returns a finite non-negative number | | | | | |
| ↳ check time | Shown only when `checkedAt` / `timestamp` parses; otherwise "Check time not provided" | | | | | |
| ↳ uptime %, request rates | **Not shown anywhere** — no measured source | | | | | |
| Recent Activity | `adminAPI.getAuditLog` (already fetched by the dashboard) | "Loading audit activity…" | "No audit activity was returned" | "Unavailable… not a confirmation that nothing happened" | "Restricted for this role" | Missing actor → "Actor not recorded"; missing/invalid time omitted |
| System Alerts | `adminAPI.alerts({limit:4})` via `AdminAlertsPanel` | "Loading alerts…" | "No alerts were returned" | "Unavailable… not a confirmation that there are none" | "Not included in your role" | List must be an array or the state is "error" |
| Team members / RBAC summary | `adminAPI.users` | Loading | Empty note | Alert | Boundary note | — |
| Department overview, Provider status | Static navigation to existing pages | — | — | — | — | Text states that connectivity is **not** verified here |

## 2. Studios and pages corrected for truthfulness

| Route | Previously shown without a source | Now |
|---|---|---|
| `/admin/platform-factory` | Fallback apps/revenue ("KAYAD Cars", 123.5M), "+12% growth", environment instances (3/1), uptime 99.9 %, scaling mode, app-store catalogue (Premium Theme …) | Failure message; figures "Unavailable"; environments state that instance/uptime/scaling are not connected; catalogue note |
| `/admin/automation` | Recent executions, scheduler, tasks, business rules (with execution counts), notification templates (with "sent" counts), AI suggestions ("47 pending verifications") | Honest "not connected" notes; stats via API or "Unavailable" |
| `/admin/config` | Change history, feature flags (nine), vehicle makes with model counts, reference values and counts, countries | Change history note; **feature flags loaded from `configApi.getFeatureFlags`** (loading / error / empty, toggled by id); makes and reference values note; counts "Unavailable" |
| `/admin/control-center` | Default status "secure", score 92 %, risk "low", latency target 200 ms; units shown on "Unavailable" | "Unavailable" for each; unit only beside a number; operational quick actions disabled |
| `/admin/governance` | Compliance 94 / 96 / 98 %, open findings 3, resolved 12, review dates | "Unavailable"; "No upcoming reviews" |
| `/admin/xos` | Audience sizes (12,500 / 3,200 / 450 / 45,000 / 2,800 / 890), per-country breakdowns, budget `|| 0` | "Unavailable" |
| `/admin/vxp` | Version history ("v12"), ad placements, ad campaigns (impressions/CTR/budget), AI layout suggestions | Notes explaining nothing is connected |
| `/admin/digital-twin` | "Expand to Uganda", "User base expected to reach 75,000" | Removed |
| `/admin/ai` | Knowledge-base counts (Policies 24 …) | Removed; page can now mount (missing `handleSend`) |
| `/admin/cms` | Weekly views/clicks/conversions `|| 0`; SEO "Last generated: 2 hours ago" | "Unavailable"; claim removed |
| `/admin/escrows` | Queue counts and exposure `|| 0` / KES 0 on a page that governs held funds | "Unavailable" / "Exposure unavailable" (display only) |
| `/admin/referrals` | Earnings, referral count, credits `|| 0` | "Unavailable" |
| `/admin/integration`, `/admin/improvement`, `/admin/ads`, `/admin/intelligence`, `/admin/lowcode` | Missing counters as 0 / crash on partial data | "Unavailable" / guarded |
| `/admin/control-center` header | "All Systems Operational" (always, pulsing) | Shows `Health score N%` only when the API returned a numeric score, otherwise a neutral "Platform status unavailable" |
| `/admin/ai` | "AI Online"; sidebar "Success 96%" | "AI data loaded" / "AI status unavailable"; success rate shown only if the API returns `successRate`, else "Unavailable" |
| `/admin/digital-twin` | "Twin Active" (always) | "Twin data loaded" / "Twin status unavailable" |
| `/admin/platform-factory` header | "Unavailable Active Products" in a green pill | "N Active Products" only for a numeric count, else neutral "Active products unavailable" |
| `/admin/governance` header and risk overview | Green "Compliance unavailable" pill; coloured circles around "Unavailable" | Neutral pill; neutral dash circles (word kept for screen readers) |
| `/admin/cms` → SEO | "Pages Optimized 4/6" with a 66 % bar; invented preview title/description; page crashed with an empty list | Computed from the page records (or "—"), no invented copy, sitemap/robots blocks labelled "Illustrative template only" |
| `/admin/vxp` preview | A sample vehicle card shown as "Preview" | Heading now says "(sample content, not live data)" |
| `/admin/digital-twin` sidebar | "Success Rate 92%"; completed total labelled "This Week" | Rate only from `overview.successRate`, else "Unavailable"; label "Completed" |

## 3. Not changed, with reason
- **Active Staff count** — the existing API has no verified staff-count field. The card remains a labelled link.
- **System Health uptime / request rate** — no measured source; deliberately absent.
- **Alerts on the right rail** — wired to the existing alerts endpoint; if the backend returns nothing the panel says so.
- Test fixtures used for screenshots (`@fixture.invalid`, "Fixture …") are served by a local test harness only and are **not** production data; screenshots are labelled accordingly.
