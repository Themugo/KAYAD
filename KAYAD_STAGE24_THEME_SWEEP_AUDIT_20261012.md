# KAYAD Stage 24 — Full-System Theme Audit (Pre-change)

**Foundation:** `KAYAD-STAGE23-MASTER-POLISH-CONVERGENCE-20261012.zip`  
**SHA-256:** `0f51528fa30ba7e142bcd52cae5dba18dd0108f7d7663f0b75789ed949a1fb69`  
**Method:** read-only source and route audit performed before the Stage 24 theme changes. Screenshots supplied by the user were reviewed as visual references. This is not a claim of browser-rendered certification.

## Reference theme captured from Automotive Services

The provided Automotive Services page is the visual reference: slate-teal hero (`#12576D`), mint CTA (`#13B8A6`), white content cards, soft off-white page surface (`#F6FAF9`), thin pale-teal borders (`#D7E7E4`), deep-teal headings (`#0A3340`) and restrained slate text (`#64748B`). It combines a confident branded hero with calm, legible content cards. It should guide the system without making every page use an identical hero or layout.

## Cross-system findings before changes

1. Canonical color tokens already exist, but repeated raw hex values and repeated aliases make it easy for individual pages to drift.
2. Automotive Services uses `#12576D` as its hero surface, while Support uses the darker `#0A3340`. Both are within the palette, but the hero treatment does not currently feel like one shared system.
3. Several shared surface contracts exist in `src/index.css`, but there is no separate theme-convergence stylesheet documenting reusable public hero, card, metadata, and focus treatments in one place.
4. The main route wrapper exposes `data-kayad-surface`, providing a safe way to scope shared public treatment without touching authenticated portal business logic.
5. Homepage is intentionally full-bleed with its Nairobi automotive hero; forcing it into a standard content card would damage the established design. Preserve its unique layout and only align supporting surfaces, typography tokens, and control states.
6. Auction has a distinct live-state panel and journey strip; preserve its domain-specific lifecycle and state colors while keeping its base surfaces, typography, borders and focus treatments on-brand.
7. Public Escrow and Financing have important status/disclaimer content. Preserve their semantic statuses and copy; do not recolor semantic warning/error/success states as generic brand accents.
8. Authentication has its own premium shell and should use the shared tokens, but its form layout and security requirements must not be changed by broad public-page CSS.
9. Buyer, seller, dealer, professional and operations dashboards have role accent tokens. Preserve these restrained distinctions and avoid global rules that flatten all portals to one accent.
10. Mobile menu and bottom navigation are shared chrome; keep their established behavior and focus styling while ensuring the shared theme tokens remain consistent.

## Route-by-route pre-change audit

| Route / surface | Current intent and visual character | Theme risk to inspect | Change policy |
|---|---|---|---|
| `/` | Full-bleed Nairobi hero and marketplace discovery | supporting controls/cards may drift from the light-teal system | Preserve hero composition; align shared controls only |
| `/marketplace` | Inventory discovery, filters and vehicle cards | raw colors in legacy card variants | Keep inventory layout and real data untouched |
| `/gallery` | legacy marketplace alias | avoid separate design implementation | Keep canonical route behavior |
| `/auction`, `/auctions` | auction discovery and journey/state panels | domain-specific gradients can diverge | Preserve lifecycle/status semantics; align shared surfaces |
| `/sell`, `/sell-car`, `/sell-vehicle` | seller entry / role choice | bespoke hero/choice tokens duplicated inline | Preserve seller flow; token-align styling only |
| `/support` | FAQ and case entry | deep hero differs from Automotive Services slate-teal hero | Align hero color to canonical service hero; preserve FAQ semantics |
| `/escrow` | public escrow explainer | distinct status colors and nested card treatments | Preserve truthful status and privacy boundaries |
| `/financing` | affordability and application handoff | inline colors and disclaimer hierarchy | Preserve calculator and non-lender disclaimers |
| `/inspections` | reference Automotive Services public page and private inspection mode | current hero has the strongest target pattern | Use as theme reference; preserve account/public separation |
| `/login`, `/register` | premium authentication | independent aliases may drift | Token-align only; preserve auth logic and layout |
| `/forgot-password`, `/reset-password`, `/force-password-change` | credential recovery | risk from broad public CSS | Leave flow logic and specialized layout intact |
| `/dashboard`, `/profile`, `/saved`, `/payments` | authenticated customer surfaces | role-specific accents and status color usage | Preserve role and data boundaries |
| `/chat`, `/notifications` | communications | unread/error states must remain semantic | Preserve delivery/read state behavior |
| `/buyer-platform` | My Garage / buyer workspace | portal accent may be flattened by generic rules | Preserve private workspace and participant scope |
| `/dealer`, `/dealer/onboarding`, `/dealer/auction-setup`, `/dealer/auction-operations` | dealer workspace | dealer-specific workflow surfaces | Preserve authorization and dealer identity accent |
| `/inspector/dashboard` | professional workspace | role-specific accent | Preserve provider data scope |
| `/admin`, `/admin/login` | operations and privileged surfaces | public-theme selectors must not leak into admin | Exclude private/admin shell from broad public rules |
| Mobile menu and dock | cross-route navigation | theme inconsistency and narrow-width crowding | Keep existing navigation logic; standardize visual tokens only |
| Shared cards, buttons, forms, headings and metadata | shared UI primitives | scattered inline/raw colors and inconsistent surfaces | Add token-backed shared public styles, avoid DOM-wide overrides |

## Pre-change decision

Use the Automotive Services visual vocabulary as the reference, not as a reason to rebuild each page. The safe change is a small canonical theme layer plus alignment of the clearest cross-page inconsistency. Avoid mass-replacing every color literal: many represent legitimate semantic statuses, domain lifecycle states, image overlays or portal accents.
