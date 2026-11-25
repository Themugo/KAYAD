# 02 — Component and route mapping

| Reference element | Implementation | Route / handler |
|---|---|---|
| Sidebar (one continuous panel) | `DealerDashboard.tsx` `<aside data-testid="dealer-sidebar">` — sticky, `h-dvh`, single `overflow-y-auto`; brand → identity → Add → groups → footer in one flow | unchanged |
| Groups | `DEALER_NAV_GROUPS`: Overview / Sales operations / Business management (all 14 original sections + Payouts kept) | `?section=<id>` unchanged |
| Payouts | existing `banking` section, relabelled | `?section=banking` |
| Team & Permissions | existing `team` (label only) | `?section=team` |
| Reports & Analytics | existing `analytics` | unchanged |
| Top bar | `DealerDashboard.tsx` (`dealer-topbar`, sticky, full width) | help → `onNavigate('support')`; bell → `/notifications` + `useNotificationsSafe().unreadCount` |
| Page frame | `App.tsx`: dealer workspace is full-bleed (`p-0`, no `max-w-7xl`) and no longer gets the site journey band (its header has its own history arrows) | — |
| Hero, KPIs, donut, trend, attention, health | `overview/DealerOverview.tsx`, `charts.tsx`, `overviewModel.ts` | existing handlers |
| Tabbed table | `overview/RecentActivityTabs.tsx` (ARIA tablist + arrow keys, row menu) | `openListingForm`, `setActiveSection` |
| Retained legacy blocks | `CommandCentrePanel` (its duplicate attention list hidden via `hideAttention`), business overview, pipeline, activity, performers, quick actions | unchanged |
