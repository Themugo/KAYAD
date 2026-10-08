# PREMIUM KAYAD NAVIGATION DESIGN AUDIT — 2026-10-08

## Reference handling

The BRS reference image was **not attached** to the upload (only the
brief text arrived). The design was therefore driven from the brief's
stated principles — independent brand identity, a distinct navigation
field, clear dropdown affordance, utility separation, disciplined
hierarchy — applied to KAYAD's own architecture. Nothing is copied from
any external header; colours, wording, icons, geometry and menu content
are KAYAD's.

## Design decisions

1. **Three fields, one row.** Brand | navigation capsule | utilities,
   instead of one undifferentiated white bar.
   - *Brand field*: logo mark, KAYAD wordmark, EA marker and tagline on
     white, with its own weight. Logo implementation (icon / text / admin
     image) is unchanged and still branding-driven; nothing cropped or
     distorted.
   - *Navigation field*: a deep-teal capsule (`#062E3A → #0A3340 → #0E4B5A`)
     so primary navigation reads as its own deliberate surface. Active
     section = lighter fill + a 2px teal underline (`#13B8A6`), not a
     full-colour block.
   - *Utility field*: Messages, Saved, then a divider, then Sell Vehicle
     (the only filled teal CTA) and Sign In / account (outlined). Utilities
     never share the capsule, so "where do I go" and "what do I do" stay
     separate.
2. **Height discipline.** One row: 72px desktop (73px measured with the
   border) vs. 72px before; 60px mobile. The ticker stays above and is not
   made taller. Product content starts at the same position as before.
3. **Dropdown affordance without hover dependence.** Items with
   sub-destinations are a *split control*: label link (goes to the section)
   + chevron button (opens the panel). The chevron rotates when open;
   hover also opens for pointer users, but click/keyboard works everywhere.
4. **Dropdown content = existing destinations only**, each with one line of
   truthful copy taken from the destination's own page wording. 2–4 rows,
   320px wide, white card, 18px radius, teal icon tiles that invert on
   hover/current. No marketing, no counts, no status — counts would need
   data fetching the header must not do.
5. **Support stays flat.** No sub-destinations exist.
6. **Colour placement rethought, palette untouched.** Same KAYAD teal/navy
   tokens; deep teal moved from "button fill" to the navigation field, white
   kept for identity and dropdown surfaces.
7. **Ticker relationship.** Content/colours/height/speed remain admin-owned;
   only a 1px teal hairline under the strip ties it to the header.
8. **Mobile is recomposed, not shrunk.** The bar carries brand + Sell
   Vehicle + menu (Sell becomes "Sell" below 360px, accessible name stays
   "Sell Vehicle"); the message icon moves to the drawer under 640px. The
   existing drawer now lists the same five destinations from the same
   config with its sub-destinations as 36px chips, plus the existing
   account/role blocks. The bottom dock is unchanged — still one mobile
   navigation system.

## Accessibility design

- Primary nav is `<nav aria-label="Primary">` with real `<a href>` links;
  SPA click is intercepted, modified clicks (new tab, copy link) work.
- Dropdowns use the **disclosure** pattern (`button[aria-expanded]` +
  `aria-controls`), deliberately not `role="menu"`.
- `aria-current="page"` on the active section and on the current child.
- Escape closes the open panel/account menu/drawer and returns focus to the
  control that opened it; tabbing out of a group closes it (no trap);
  outside click closes.
- The drawer is a genuine modal dialog: focus moves in, Tab is contained,
  Escape closes and restores focus to the menu button.
- Icon-only utilities now have accessible names (count included).
- Reduced motion disables the dropdown entrance and hover transforms.
- Touch targets: menu button 44×44, utilities 40×40, drawer rows/chips ≥36px.

## Not done, on purpose

- No mega-menu, no imagery, no live data in menus.
- No new nav items, routes, pages or features.
- No backend/config changes (see the admin control audit).
