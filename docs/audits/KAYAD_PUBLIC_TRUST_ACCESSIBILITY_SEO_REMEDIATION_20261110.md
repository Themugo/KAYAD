# KAYAD Public Trust, Accessibility and SEO Remediation

Date: 10 November 2026
Baseline: `KAYAD-SHOWROOM-ROUTE-FIX-1110.zip`

## Implemented source changes

1. **KAYAD Live**
   - News and guide cards now expose a Read article action and open the published CMS item by its existing public slug endpoint (`GET /api/cms/content/s/:slug`).
   - News, guide and new-arrival requests settle independently. A failed request no longer suppresses the other sections and receives an explicit retry state.
   - The CMS list client no longer converts network/server failures into a successful empty list.
   - New-arrival cards call the existing App vehicle-detail handler with the selected vehicle object, rather than navigating to an unfiltered marketplace.
2. **Ticker accessibility**
   - Added a visible Pause notices / Resume notices button to fallback, scrolling and fade ticker modes.
   - The control is a native button, keyboard operable, touch operable and exposes its state through `aria-pressed`.
   - Scrolling animation play state and fade rotation respond to the pause state.
3. **Global error boundary**
   - Removed visitor-visible exception message and stack rendering.
   - Shows a support reference generated when the boundary captures the failure. Detailed errors remain sent to the existing logger.
4. **SEO metadata**
   - `usePageMeta` now updates/restores the canonical link and Twitter card type along with description and Open Graph/Twitter fields.
   - Added static homepage Open Graph, Twitter and canonical metadata for crawlers that read the initial HTML only.
   - Removed stale `2024-06-14` lastmod values from the static sitemap index rather than presenting an inaccurate freshness date.

## Trust and legal review — unresolved evidence requirements

The current `LegalPage.tsx` makes detailed operational assertions about auction commitment routing, who holds funds, refund destination, wallet fallback, forfeiture, winner completion periods and dealer-return obligations. The text is not safely certifiable from the public frontend alone. It must be reconciled against the deployed auction configuration, payment provider callbacks, ledger entries, wallet withdrawal flow, refund state machine, dealer account verification and the actual signed/accepted auction rules. No wording was broadened or silently changed in this batch.

The Privacy Policy currently says data is retained “for as long as needed” and directs requests to Support. It does not identify the data controller by its full legal name and contact details, give category-specific retention periods or criteria, explain a dedicated data-subject request route with identity verification and response tracking, or sufficiently describe processor/subprocessor and cross-border transfer arrangements. These facts cannot be invented. The KAYAD legal/controller owner must supply the controller's registered identity and postal/email contact, retention schedule, processor list/transfer locations and request-handling SLA before the policy can be completed. This is an evidence gap, not a legal conclusion.

## Sitemap and crawler verification still required

The source static sitemap index no longer carries stale 2024 lastmod values. The repository also points at generated `sitemap-cars.xml`, `sitemap-dealers.xml` and `sitemap-auctions.xml` outputs. Their live deployed HTTP responses, content freshness, canonical host, status codes and lastmod values must be fetched from the production host after deployment. No live-host verification or deployment was performed here.

## Validation

- `node scripts/validate-public-trust-accessibility-seo-batch.mjs` — PASS (five contract groups).
- `npm ci` with the repository's strict engine requirement — BLOCKED: environment Node v22.16.0; package requires >=22.22.2.
- A retry with `--engine-strict=false` did not complete before the execution timeout. Therefore TypeScript, lint, Vitest and production build were not run.
- No browser/touch-device test, deployed crawler test, live payment/auction reconciliation or legal review was performed.
- No commit, push or deployment was performed.

## Modified files

- `src/pages/KAYADLive.tsx`
- `src/services/cmsContentApi.ts`
- `src/App.tsx`
- `src/components/TopNoticeStrip.tsx`
- `src/components/ErrorBoundary.tsx`
- `src/hooks/usePageMeta.js`
- `index.html`
- `public/sitemap.xml`
- `scripts/validate-public-trust-accessibility-seo-batch.mjs`
- `package.json`
