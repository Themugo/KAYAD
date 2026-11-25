# 01 — Reference design specification

Source: the proposed-design screenshot supplied on 2026-11-25 (`evidence/reference-design.png`), which refines the earlier reference. Tokens live in `overview/dealerCommandCentre.css` under `.dcc` / `.dcc-shell`.

Palette: navy `#062F3A`, dark teal `#003F49`, brand teal `#00CBB4`, secondary teal `#087E7B`, background `#F5F8FA`, text `#102B3A`. Cards: white, 1px `#DFE8EC`, 14px radius, soft shadow.

Piece-by-piece (reference → implementation):
1. Sidebar: logo + tagline "Kenya's Trusted Vehicle Marketplace" → white-wordmark logo asset + tagline. Identity card (name, account holder, DEALER ACCOUNT ✓) → same, ✓ only when the dealer is approved. Teal **Add a vehicle**. Dashboard (active). **SALES OPERATIONS** with count badges (Inventory, Leads, Auctions) → real counts, hidden at 0. **BUSINESS MANAGEMENT**. Footer: Account status + pill, Help & support (+ Sign out). Group dropdowns collapse to save space.
2. Top bar: wide search with Ctrl K, bell with badge, help, avatar + name + "Dealer Account" + dropdown → same (search is truthful: "Search your vehicles…").
3. Header: DEALER HUB eyebrow, H1, welcome line; right: date | "Last 30 days" selector (7/30/90).
4. Hero: navy→teal gradient, vehicle photo right with fade, diagonal teal slash, 5 buttons.
5. KPI cards with delta pills; Inventory Overview donut + legend; Sales Trend (bars + line, dual axis, legend); "Needs your attention" pale-red list; tabbed table (Recent Inventory | Hot Leads | Active Auctions | Recent Sales) with thumbnail, make/model, year, price, status pill, performance, row menu; Business health progress bars.

Deliberate deviations: the reference's example numbers (24, 92 %, 88 %, +3 (14 %) …) are NOT shown — every value is real or "—". "Business Profile" has no separate page in the product, so it stays inside Settings (renamed "Business profile & settings"). The reference's hero photo (a silver SUV on a road) is not in the repo; the existing KAYARD Land Cruiser artwork is used. Sign out is kept in the footer (the reference crops it).
