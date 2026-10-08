# NAVIGATION ADMIN CONTROL AUDIT — 2026-10-08

Principle applied: understand the existing control plane first; do not
build a second configuration engine.

## Already admin-controlled (and still consumed unchanged)

| Item | Mechanism | Admin surface |
|---|---|---|
| Ticker items, order, colours, display mode, speed, visibility, fallback text, height | `top_ticker` ad slots + `heroPresentation.ticker*` in `PlatformConfig`, public read at `/admin/public/config` | Ad Manager, Homepage admin panel |
| Logo type (icon/text/image), logo text, logo image, tagline, brand palette | `PlatformConfig.branding` → `BrandingContext` | Admin Settings → Branding, Theme Studio |
| Fonts and base sizes | `PlatformConfig` font fields | Theme/Settings |

The redesigned header reads logo/tagline from `useBranding()` exactly as
before, and the ticker component, its admin settings and its content are
unmodified. The only ticker change is a CSS hairline
(`border-bottom: 1px solid rgba(19,184,166,.4)`) that links it to the
header; admin colour/height/speed remain authoritative.

## Role controlled

- Account-menu sections (dealer, mechanic, admin) come from `user.role`
  returned by the backend session. Admin pages are additionally protected
  by `RequireAdmin`, App's `protectedNavs` effect and backend
  `protect`/`adminOnly`/permission middleware.
- Signed-in-only entries (Saved vehicles, Saved for you, Protected deals)
  are hidden for guests. This is presentation; the destinations behind
  them remain protected by the App gate and by backend authorization.

## Hardcoded

The list, order, labels, grouping and descriptions of the primary
navigation. Before this stage they were JSX literals in two places
(desktop nav and mobile drawer). They now live once in
`src/components/navigation/navConfig.ts` and drive desktop, dropdowns and
the mobile drawer.

## Can it be admin-configured safely today?

| Candidate | Verdict |
|---|---|
| Show/hide an entire primary item | **Needs backend change.** No navigation field exists in `PlatformConfig` or in the `/public/config` whitelist. |
| Reorder/rename items | **Needs backend change** and a validation story (labels are product terminology; destinations must remain real). |
| Hide an item via the existing feature-flag service | Backend exists (`featureFlagService`, `/api/feature-flags/user`), but there is **no frontend consumer** and no navigation-keyed flags. Wiring it adds a fetch and a new coupling — new architecture. |
| Destinations, routes, permissions | **Keep code-defined.** They are product/security structure, not presentation. |
| Tagline/logo/ticker | Already controlled. |

## Exact extension if the team wants it (not implemented)

1. Add an optional `navigation` object to `PlatformConfig` (for example
   `{ hidden: string[] }` keyed by `NAV_PRIMARY` ids / child ids) and add
   that single field to the `/admin/public/config` `select(...)` list.
2. Expose it in the existing Admin Settings panel with the existing
   `MANAGE_SETTINGS` permission and the existing config audit/rollback.
3. In `BrandingContext` (which already fetches that document) expose
   `navigation.hidden`; `Navbar` filters `NAV_PRIMARY` by it. **No new
   endpoint, no extra request.**
4. Constraints: hide-only (never add destinations), ignore unknown ids,
   never hide Sign In / Sell Vehicle, and treat it as presentation — route
   protection stays in `App.tsx` + backend.

Security implications: none beyond existing settings authority.
Migration implications: one nullable JSON field with a default, no data
migration. Existing admin control **can** be reused; it was not extended
this stage because the master direction is zero backend changes.

## Result

Backend files changed: **none**. No second settings system created.
