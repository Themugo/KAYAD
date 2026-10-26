# KAYAD Phase 14.2 — Sidebar, Header and Navigation Report

## Audit (Phase 14.1 source)
- The dealer sidebar was a flat list of 14 `NavTab` buttons held only in component state. There was no URL for a section, so browser Refresh, direct links and Back/Forward could not reach or restore a section.
- The header title was always "Dashboard"; the notification bell had no handler (a dead icon button). "Add Listing" (header, overview quick action, inventory) called `onNavigate('seller-platform')`; for dealers `App.tsx` renders the same `DealerDashboard` for that destination, so the control did not add a listing.
- Profile menu, avatar and logout belong to the global `Navbar` (`AuthContext.logout`), which wraps the dealer workspace. They were audited and not changed; no duplicate profile or logout was added to the dealer header.
- There is no dealer-level search control and no organization switcher; none was added.

## Changes
| Area | Change |
|---|---|
| Grouping | Same 14 sections, grouped: **Overview** (Overview); **Business** (Inventory, Leads, Pipeline, Customers, Finance, Analytics, Reputation); **Operations** (Auctions, Inspections, Escrow, Marketing); **System Management** (Team, Settings). Groups are `role="group"` labelled by a visible heading (screen-reader label on the horizontal mobile bar), separated by a rule. |
| Decisions | Finance and Reputation/Analytics sit in Business (they report on sales and buyers); Escrow and Marketing in Operations (transaction and promotion work). No route or section was added or removed. |
| Icons | Leads = message, Pipeline = target, Customers = users, Team = user-cog, Marketing = megaphone (previously arrow, shopping bag, a duplicated users icon, and zap). All icons are `aria-hidden`, uniform 20px / stroke 2. |
| States | One `aria-current="page"` item; visible focus ring; long labels truncate on desktop and do not wrap on the mobile scroll bar; new-lead badge uses real dashboard data with a screen-reader "N new" label. |
| URL | `?section=<id>` (kept alongside `nav=dealer-dashboard`). Selecting a section adds a history entry; `popstate` restores it; unknown values fall back to Overview; `escrowId` is dropped when leaving Escrow. |
| Header | Title and description follow the section; breadcrumb (Dealer Hub › group › section) whose parent link returns to Overview; the group name is plain text because groups are not destinations. |
| Bell | Now opens the existing `/notifications` route. |
| Add Listing | Removed from the three places where it did not work. Header shows "Manage Inventory" (opens Inventory); the inventory section states that listing creation is not available in this workspace (DEF-01). |
| Landmarks | The workspace used a second `<main>` nested inside the app `<main id="main-content">`; it is now a `div`. |
| Auctions | Added links to the existing `/dealer/auction-operations` and `/dealer/auction-setup`. |
| Mobile | Horizontal scrollable bar kept; group dividers shown; no page-level horizontal scroll at 390px (measured in browser). |

## Previous / Next / unsaved changes
- No sequential workflow exists in the dealer workspace (leads load as one `limit=100` page; no multi-step form), so no Previous/Next controls were added.
- No dealer form with draft state exists in these sections except the one-field "new campaign" input, so no unsaved-changes prompt was added.

## Browser evidence (real frontend bundle, MOCKED API, headless Chromium)
Desktop 1280x900 and mobile 390x844: all 14 sections open, correct header/current item; Back, Forward, Refresh, direct link (`section=reputation`) and keyboard Enter on a focused nav item all resolve correctly. Raw results: `evidence/phase14-2-20261026/browser-results.json`.
Not exercised: a live session, real role/permission denial in the browser, real logout.
