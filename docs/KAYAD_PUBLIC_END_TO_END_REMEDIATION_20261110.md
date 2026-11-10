# KAYAD Public End-to-End Remediation — 10 November 2026

## Baseline and scope

This work extends the cumulative `KAYAD-PUBLIC-TRUST-SEO-ACCESSIBILITY-FIX-1110` source bundle. Existing dealer-directory, security.txt, homepage metadata and showroom crawler fixes were preserved. The existing application architecture, route model, backend ownership and brand styling were retained. No database migration, deployment, commit or push was performed.

## Changes in this pass

1. **Public footer and discoverability**
   - Added direct public destinations for vehicle browsing, dealer showrooms, auctions, auto services, KAYAD Live, escrow services, financing and support/disputes.
   - Kept links connected to existing application navigation identifiers and preserved legal links.
   - Added visible keyboard focus treatment and minimum-height targets to footer navigation controls.
   - Removed the unsupported “Verified Automotive & Escrow Platform” footer descriptor.
   - Replaced fallback footer copy that implied blanket trust/escrow coverage with neutral marketplace language.

2. **KAYAD Live content journeys**
   - Added shareable article deep links using `?nav=kayadlive&article=<slug>`.
   - Back navigation clears the article query; browser back/forward and direct article URLs are supported when the published article is in the returned News/Guide index.
   - Added page metadata for the Live index and selected article.
   - Added lazy loading/async decoding and descriptive alternative text to content images; vehicle arrival imagery uses `object-contain` to avoid cropping.
   - Existing independent News, Guides and vehicle loading/error/retry handling was preserved.

3. **Ticker accessibility and destination safety**
   - Added `safeTickerHref` to reject script/data/unknown schemes, protocol-relative destinations and control characters; only same-site relative paths and HTTP(S) URLs are linked.
   - Honors `prefers-reduced-motion` and pauses scrolling when hovered or when keyboard focus enters the ticker.
   - Existing visible pause/resume control and fade-ticker pause state remain.

4. **Marketing and SEO claims**
   - Removed blanket “every listing escrow-backed” claims from the audited Showroom descriptions.
   - Replaced default ticker claims about universally verified/protected inventory with neutral marketplace/eligibility language.
   - Replaced unsupported homepage trust-strip labels (“verified listings”, “inspected vehicles”, “protected transactions”) with factual discovery labels.
   - Changed public footer branding copy to avoid implying universal verification or escrow coverage.
   - Existing SEO metadata remediation and canonical showroom crawler correction were retained.

5. **Privacy disclosure improvements**
   - Expanded retention language to explain purpose limitation, lawful retention exceptions and secure deletion/de-identification, while explicitly avoiding invented fixed periods.
   - Added a practical data-rights request route using `support@kayad.space`, account identifier guidance, proportionate verification, response expectations and explicit warnings not to share passwords, M-Pesa PINs or OTPs.
   - Clarified processor categories and disclosed that provider-specific processing locations and cross-border safeguards are not represented as verified in this document.
   - Added a controller/contact disclosure section. The public brand and support contact are known; the legal entity name, registered address and DPO contact still require operator confirmation.
   - Updated the legal page date to 10 November 2026.

6. **Existing cumulative fixes retained**
   - `public/security.txt` and `public/.well-known/security.txt` are identical and point to `security@kayad.space` with the canonical `https://www.kayad.space/.well-known/security.txt` URL.
   - Public dealer directory uses backend-returned approved dealer records, truthful approval wording, retry/error handling and dealer-ID-scoped showroom filtering.
   - Robots no longer advertises a non-canonical standalone `/showroom` route; route/crawler alignment validator remains in place.

## Validation results

All listed checks below were executed against the extracted source tree in this environment:

| Validation | Result |
|---|---:|
| security.txt contract | PASS — both files identical and KAYAD contact/canonical/expiry verified |
| public dealer directory contract | PASS — 15 assertions |
| homepage search metadata contract | PASS — 10 assertions |
| showroom route/crawler alignment | PASS — 4/4 |
| public trust/SEO/accessibility batch | PASS |
| new public journeys final validator | PASS — footer, Live, ticker, privacy and claims contracts |
| unified mobile menu | PASS |
| mobile menu viewport | PASS — 10/10 |
| mobile navigation polish | PASS — 38/38 |
| PWA/mobile contract | PASS — 13/13 |
| public-facing convergence | PASS — 49/49 (validator updated to test the active directory implementation rather than an obsolete duplicate component) |
| public support surface | PASS — 21/21 |
| public auto-services boundary | PASS — 17/17 |
| public escrow boundary | PASS — 14/14 |
| public financing boundary | PASS — 23/23 |

### Checks blocked in this environment

- `npm run typecheck` could not start because the supplied `node_modules` tree is incomplete and TypeScript reports missing type-definition packages (`aria-query`, `chai`, `deep-eql`, `estree`, `json-schema`, `node`, `react`, `react-dom`, `trusted-types`).
- `npm run build` could not start because the Vite executable is absent (`vite: not found`).
- Vitest/component/browser suites could not be run because the local dependency installation is incomplete.
- No physical Android/iOS, tablet or desktop browser matrix was available; viewport source validators are not a substitute for rendered-device testing.
- No Lighthouse/Web Vitals lab run, axe scan, real network waterfall or load test was performed. Therefore performance and full accessibility certification are **not claimed**.
- Live HTTP verification of sitemap endpoints was previously attempted but DNS resolution for `www.kayad.space` failed in this environment. HTTP status, XML validity, record filtering and freshness remain unverified; this is not evidence that the live endpoints are broken.

## Required owner inputs / release blockers

1. Confirm the legal controller's full registered entity name, registered address and any designated DPO/privacy contact. Replace the explicit pending-identity disclosure with approved legal details.
2. Approve a retention schedule by data category and provide the verified provider/sub-processor register, processing countries and cross-border transfer safeguards. Do not publish guessed retention periods or provider locations.
3. Reconcile auction commitment custody, wallet refunds and dealer-direct collection with the production migration history and live database functions. The previously reviewed runbook labels migration `20261104120000_auction_wallet_refunds_dealer_custody.sql` as owner-run/not applied; no migration was applied during this pass. Terms must not be treated as production-certified until the production database state, callback path, ledger and M-Pesa B2C configuration/tests are confirmed.
4. Re-run install, typecheck, build, Vitest, browser E2E, accessibility and performance checks in a complete CI/runtime environment.
5. Re-run live sitemap checks once DNS/network access is available, checking all three dynamic child sitemaps for HTTP 200, XML content type and parseability, canonical host, freshness, and exclusion of private/unpublished records.

## Release status

**Source remediation completed for the scoped public-surface changes; full production certification remains open.** The package must not be represented as fully mobile/desktop/performance/accessibility certified or legally complete until the owner inputs and blocked runtime checks above are closed.
