# Admin Content Configuration Audit

## Existing capabilities found
- `backend/routes/adminRoutes.js` exposes a public, allow-listed `/admin/public/config` read and a protected `/admin/config` update route.
- The public configuration includes platform name, gallery title/subtitle, typography settings, branding, guest browsing, hero configuration and normalized navigation presentation.
- `src/context/BrandingContext.tsx` loads the public config and applies CSS variables with defaults on failure.
- `src/pages/admin/AdminSettingsBranding.jsx` provides logo and brand-color controls.
- The CMS route/controller layer already has pages, content, FAQs, campaigns, banners, media, revisions, publishing and analytics APIs. Mutations use route-level role gates and the admin control-plane guard.

## Important boundaries
This is not a universal visual editor. A CMS API existing does not prove every current component consumes CMS data. Each page surface must be mapped to its actual configuration source before it is advertised as editable. Public config must remain an allow-listed projection; secrets, finance settings, customer data and role permissions must not be surfaced to visitors.

## Classification
- Existing backend-backed: platform branding/navigation/typography/hero settings; CMS pages, content, banners, campaigns, media and revisions.
- Partially configurable: ticker/navbar text and other visible copy, depending on whether each component consumes the current public config/CMS fields.
- Code-controlled: route structure, component behavior, responsive safeguards, authorization, auction/escrow/payment/ledger/ownership rules.
- Never ordinary copy-editable: transaction amounts/status, verification facts, legal/financial disclosures, permission rules, settlement and ownership outcomes.

## Release limitation
No broad new CMS schema was added in this pass. Existing mechanisms should be reused, not duplicated. The actual live admin save/publish path has not been tested against staging or production.
