# NAVIGATION AUTHORITY MODEL — 2026-10-08 (Stage 14A)

Admin navigation authority now exists. It is an extension of the existing
platform control plane, not a new one.

## 1. What the admin controls (and what stays code-owned)

| Admin CAN control (presentation state) | Stays code-owned (never configurable) |
|---|---|
| Primary item shown / hidden | Which destinations exist, their routes/`navId`/`href` |
| Primary item order | Labels, descriptions, icons |
| Dropdown on / off (off = direct link to the same destination) | Layout, CSS, colours, sizes, positions, markup, scripts |
| Child item shown / hidden | `requiresAuth` display rule per entry |
| Child item order | Page protection (App `protectedNavs` + backend middleware) |

Labels are deliberately **not** configurable: the existing configuration model
has no controlled-label mechanism, and free-text labels would be a markup/XSS
and product-terminology surface. Role-based visibility is likewise not
configurable: the only existing role-presentation rule is `requiresAuth`,
which stays in code. Marketplace and Support can never be hidden, and a
configuration that hides everything is rejected.

## 2. Authority source

`platform_config.navigation` — one new `JSONB NOT NULL DEFAULT '{}'` column on
the existing singleton `platform_config` row (same pattern as
`hero_presentation`). Model: existing `PlatformConfig` (`createModel`
camelCase↔snake_case layer; field name `navigation`). No new table, model,
service, route file or admin role.

Migration: `supabase/migrations/20261008150000_platform_config_navigation.sql`
(a single `ADD COLUMN IF NOT EXISTS`, no policy change).

### Exact configuration fields

```
navigation: {
  items: [                       // array order = display order
    {
      id:       "marketplace" | "auction" | "inspection" | "escrow" | "support",
      visible?: boolean,         // default true; marketplace/support forced true
      dropdown?: boolean,        // default true; only for items that have children
      children?: [               // array order = display order
        { id: <child id of THAT parent>, visible?: boolean }
      ]
    }
  ]
}
```

Child ids: marketplace → `browse, saved, financing`; auction → `live,
scheduled, ended, saved`; inspection → `request, providers`; escrow →
`journey, deals, create`; support has none. `{}` or `{ items: [] }` means "no
override" (the code-defined navigation). The registry lives in
`backend/utils/navigationConfig.js` and mirrors `navConfig.ts`;
`validate-navigation-convergence` fails if they drift.

## 3. Admin mutation path

`PUT /api/admin/config` with body `{ "navigation": { items: [...] } }` — the
existing platform-settings route.

1. `protect` (JWT, fresh DB role/ban/session check) and `adminOnly`
   (`router.use(protect, adminOnly)`, staff roles only).
2. Permission router: path `/config` → `requirePermission(MANAGE_SETTINGS)`.
3. Route-local `adminOrSuper = authorize("admin","superadmin")`.
4. `validateNavigationInput` (strict): unknown ids/fields, non-booleans,
   duplicates, children of another parent, hidden marketplace/support,
   everything hidden → `400` with `errors[]`, nothing persisted or audited.
5. The validated value **replaces** the stored value (not shallow-merged, so
   an item can be un-hidden), then `config.save()`.
6. Audit (see §6).

UI: **Admin console → Navigation** (`src/features/AdminNavigationControl.tsx`,
mounted in `AdminView.tsx`), which loads via `GET /api/admin/config` and saves
through `adminAPI.updateConfig({ navigation })`. The UI sends only registry
ids, booleans and order; the server re-validates everything. (The older
`pages/admin/AdminSettings*.jsx` set is not imported anywhere reachable in the
app, so it was deliberately not used.)

## 4. Public read path

`GET /api/admin/public/config` (existing unauthenticated projection, defined
before the global admin guard). `navigation` was added to the existing
`.select(...)` whitelist and the value is passed through
`normalizeNavigation` before it is served, so the public client only ever
receives `{ items: [{ id, visible, dropdown?, children? }] }` — registry ids and
booleans. Secrets and admin fields (`daraja`, `bank`, `reconciliation`,
`supportEmail`, commissions, fees…) are not in the whitelist (asserted by
tests).

Frontend: `BrandingContext` already fetches this document once; it now also
stores `navigation` (no new request — the header itself still makes zero
network calls). `Navbar` renders `applyNavigationConfig(navigation)` for both
the desktop field and the mobile drawer.

## 5. Fallback behaviour

`applyNavigationConfig` is total (try/catch around a pure selection over the
code-owned `NAV_PRIMARY`). The canonical navigation is used when the config is
undefined/null (API failed, outage, abort, HTML response, missing field),
malformed (string/number/array/`items` not an array/junk entries), empty, or
contains only unknown ids. Partially specified config never loses items:
listed ids come first in the given order, every unlisted item follows in
canonical order. Unknown ids/children are ignored; label/href/icon/style
fields in the config are ignored. Marketplace and Support can never be hidden
even if stored hidden, and a result with no items falls back to canonical.

## 6. Authorization, audit, RLS

* **Authorization** — layered and unchanged: `protect` → `adminOnly` →
  permission router (`MANAGE_SETTINGS`) → `adminOrSuper`. Only `admin` and
  `superadmin` mutate. Normal user, individual seller, dealer, inspection
  provider (`ghost_checker`) and every departmental staff role (moderator,
  ad_manager, marketing, escrow_officer, technical_support, hr, accounts) get
  `403`; anonymous gets `401`. Frontend hiding is never the authority. No new
  role or permission.
* **Audit** — existing `AuditLog` only: the existing `admin.put` auto-audit
  middleware, the existing `"Platform config updated"` entry, plus a dedicated
  `"Navigation configuration updated"` entry with `adminId` and
  `details: { before, after }` (normalised states). Denials are audited by the
  existing role middleware (`access_denied`).
* **RLS** — unchanged. `platform_config` keeps RLS enabled with no policies,
  i.e. service-role-only. Proven on real PostgreSQL 16 with Supabase-style
  roles and default grants (`NAVIGATION_RLS_PROOF_OUTPUT_20261008.txt`):
  after the migration `anon` and `authenticated` see 0 rows, update 0 rows,
  cannot insert (`new row violates row-level security policy`), delete 0 rows;
  `service_role` reads and writes. The migration is idempotent.

## 7. Exact files changed

Backend: `backend/routes/adminRoutes.js` (import, public select + normalise,
validate/replace/audit in `PUT /config`), `backend/utils/navigationConfig.js`
(new), `backend/tests/admin/navigationAuthority.test.js` (new),
`backend/tests/admin/navigationConfig.test.js` (new).
Migration: `supabase/migrations/20261008150000_platform_config_navigation.sql` (new).
Frontend: `src/components/navigation/navConfig.ts` (resolver appended; data
untouched), `src/components/Navbar.tsx` (3 wiring lines; markup/CSS
untouched), `src/context/BrandingContext.tsx` (+`navigation`),
`src/features/AdminNavigationControl.tsx` (new), `src/features/AdminView.tsx`
(Navigation module), `src/__tests__/components/navigationAuthority.test.ts` (new).
Guard: `scripts/validate-navigation-convergence.mjs` (+13 checks, 40 total).
`src/styles/kayad-navigation.css` and all visual code are byte-identical to Stage 15.
