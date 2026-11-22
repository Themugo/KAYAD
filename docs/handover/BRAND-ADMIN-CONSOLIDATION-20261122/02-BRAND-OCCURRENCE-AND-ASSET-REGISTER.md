# 02 — Brand occurrence and asset register (with logo / icon implementation map)

Scan method: comments stripped, then every string literal / JSX text containing the standalone word `KAYAD` in `src`, `public`, `index.html`, `backend` (excluding tests). Plus a case-insensitive review of `Kayad` / `kayad` and an asset inspection.

## A. Customer-facing text — result
**No customer-facing "KAYAD" remains** in `src`, `public` or `index.html`; page title, meta, Open Graph, manifest (`name`, `short_name`), e-mail templates (`email.service.js`: `APP_NAME = "KAYARD KE"`, welcome / OTP / invitation / payment mails) all say **KAYARD KE**. VERIFIED by the scan and by reading the templates.

## B. Remaining `KAYAD` occurrences, classified
| Occurrence | Class | Decision |
|---|---|---|
| `src/context/BrandingContext.tsx:228,231` rewrites stored `KAYAD` logo text and the old copyright line to the new brand | 2 legacy branding stored in data | KEEP (it is the compatibility shim) |
| `PageJourneyNavigation.tsx:13` matches the old browser title `KAYAD \| Kenya's Verified …` | 2 legacy | KEEP (matches data only if an old title is stored) |
| `backend/services/mpesaService.js:190` `AccountReference` default `"KAYAD"` | **5 external identifier** | **DO NOT CHANGE without owner + Safaricom reconciliation decision** (payment reconciliation, historical references) |
| `backend/inspection/services/bookingService.js:16` booking reference prefix `KAYAD` | 4 historical records / 3 technical | KEEP (existing references must keep resolving) |
| `kayad:*` localStorage keys, DOM events (`kayad:open-mobile-menu`, `kayad:branding-updated`), `kayad-*` CSS classes / file names, `KAYAD_*` env vars, route/table/function names | 3 technical identifiers | KEEP (renaming breaks sessions, caches, validators) |
| `escrowModel.ts` / `inspectionJourney.ts` value `'kayad'` | 3 technical enum | KEEP |
| Code comments, doc headers | none customer-facing | optional tidy, no behaviour |

## C. Asset register (`public/`)
| File | What it is | Used by | Status |
|---|---|---|---|
| `branding/kayard-ke-logo.png` (1200×403) | approved horizontal wordmark, navy + teal + flag accent | `DEFAULT_LOGO_URL` (header, login, dealer sidebar, footer…) | **approved light-background logo** |
| `branding/kayard-ke-logo-dark.png` (1200×403) | **new this phase**: the same artwork recoloured for dark backgrounds (navy → white, teal → `#2DD4BF`; flag colours untouched; teal 7.0:1 on `#0A3545`) | admin header, admin sidebar, private-seller portal header | **needs owner approval** as a derived asset |
| `branding/kayard-k-mark.png` (512²) | square K icon | favicon / PWA / app tile | approved square icon |
| `icons/icon-192.png`, `icon-512.png`, `badge-72.png` (+ svg) | PWA icons (K mark) | `manifest.webmanifest` | OK; `purpose: "any maskable"` on one image (see gaps) |
| `branding/kayad-mark.png` (car-front icon) | **old brand mark** | only the `BrandingContext` legacy-URL rewrite and one test | LEGACY, keep for compatibility |
| `branding/kayad-premium-master.png` ("KAYAD" lockup over photo) | **old brand art** | nothing in `src`; one validator asserts it exists | LEGACY, retain (validator) |
| `branding/kayad-road-mark*.svg`, `kayad-symbol.svg` | old road-mark symbol (title text already says KAYARD KE) | `BrandingContext` legacy map, tests, validators | LEGACY, retain |
| `favicon.svg`, `opengraph.jpg`, `manifest.webmanifest` | | `index.html`, PWA | OK |

## D. Logo / icon implementation map
* Header and footer: `Navbar.tsx`, `Footer.tsx` read `branding.logoUrl` (default `kayard-ke-logo.png`) — light surfaces.
* Everywhere else the logo is drawn through **one** component, `BrandMark.tsx` (login, register, portals, dealer sidebar, admin). New `tone="dark"` prop swaps the built-in default for `kayard-ke-logo-dark.png`; a logo uploaded by an administrator is shown as uploaded (a derived dark variant cannot be generated for arbitrary art).
* Admin header and sidebar previously drew the navy wordmark on dark teal (illegible in the captured screenshot); they now use the dark variant.

## E. Gaps not closed (owner decisions / not done)
* Dark variant is derived by recolouring, not supplied by a designer — approve or replace.
* No Android adaptive-icon or iOS asset set exists in the repo (web PWA only). NOT DONE; needs the native/wrapper project or a decision that PWA icons suffice.
* No separate maskable icon with safe-zone padding; the single `any maskable` image may be cropped on Android.
* PDF/receipt/invoice generators were not located as separate templates; payment e-mails carry the brand text. NOT AUDITED beyond e-mails.
* Social share image `opengraph.jpg` content not re-inspected for the old mark in this pass.
* Navbar (public, approved homepage) intentionally not changed.
