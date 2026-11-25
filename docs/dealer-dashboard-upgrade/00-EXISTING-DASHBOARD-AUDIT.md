# 00 — Existing Dealer Dashboard audit (before this upgrade)

Base: the R3 closure ZIP (`KAYARD-KE-FINAL-SECURITY-GOVERNANCE-PRODUCTION-READINESS-CLOSURE-20261124-r3`). No Git repository was present in the sandbox, so no commit/branch state is claimed; nothing was committed, pushed or deployed.

| Area | Finding |
|---|---|
| Shell | `src/pages/dealer/dashboard/DealerDashboard.tsx`: section SPA (`?section=`), `DEALER_NAV_GROUPS` (5 groups). |
| **Page frame (cause of the "huge space")** | `App.tsx` rendered the dealer workspace inside `<main class="max-w-7xl mx-auto px-8 py-6 space-y-6">` and put the site `PageJourneyNavigation` band (back/forward/home + "Dealer workspace" pill) above it, then the dashboard added its own `p-8`, a top bar and a tall header. The hero therefore started ~230px down inside a boxed 1280px column. |
| **Sidebar (cause of the "three blocks")** | `<aside>` was `overflow-hidden` with a pinned header, a middle `<nav overflow-y-auto>` and a pinned footer, height `calc(100dvh - var(--dealer-aside-top))` measured by a polling effect, while the page column had its own `overflow-y-auto`. Two independent scrollers; the middle scrolled behind the header/footer and the panel shrank. |
| Overview | Banner (4 buttons), command-centre panel, 4 stat cards, pipeline, activity, performers, quick actions. No donut, trend, period selector, tabbed table or health panel. |
| Latent bug found | Three hooks (`closedGroups` state/effect) were declared *after* the signed-out early return, so React throws "Rendered more hooks than during the previous render" if the user arrives after the first render (seen in the browser run). Fixed by moving them above the return. |

Must not change (and did not): routes/section ids, APIs, schema, auth, tenancy, role gating, publishing, leads, auctions, payout/escrow/ledger logic, team, notifications, closure security work.
