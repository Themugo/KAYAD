# KAYARD KE — 06E inventory presentation regression runbook

Baseline: `KAYARD-KE-MASTER-IMPLEMENTATION-06E-INVENTORY-PRESENTATION-20261119.zip`

## Required environment

- Node.js `22.22.2` (repository `.nvmrc` and package engine requirement)
- npm compatible with the committed lockfile
- Network access to the configured npm registry, or a complete lockfile-compatible local cache
- Chromium installed by Playwright

## Install

```bash
node --version
# Must print v22.22.2
npm ci
npm --prefix e2e ci
npx --prefix e2e playwright install chromium
```

Do not bypass the Node engine requirement to force an install. The locked `jsdom` and `undici` versions also require a newer Node runtime than the one available in the previous verification environment.

## Unit, type and production build checks

```bash
npm test -- src/__tests__/components/VehicleMarketplace.test.tsx
npm run typecheck
npm run build
```

## Six-viewport rendered Grid/List regression

```bash
npm --prefix e2e test -- --project=chromium tests/marketplace-controls/marketplace-controls.spec.ts --grep "all six supported viewport widths"
```

The test visits 1440, 1280, 1024, 768, 390 and 360 CSS-pixel widths. At each width it switches Grid/List, checks computed card direction, card/media/content geometry, save/detail/contact actions and horizontal overflow. At phone widths it also checks 44px view-toggle targets. It writes screenshots under `e2e/test-results/inventory-responsive-06d/`. Review every screenshot in both modes.

## Server pagination browser regression

```bash
npm --prefix e2e test -- --project=chromium tests/marketplace-controls/marketplace-controls.spec.ts --grep "server pagination supports direct pages"
```

This test uses 60 deterministic fixture vehicles and a correctly server-sliced mock response. It verifies the first-page Previous boundary, direct navigation to page 3, the final-page Next boundary, Previous navigation, page-size change resetting to page 1, and the final page under the new page size. It checks both query parameters and visible vehicle records/result ranges.

## Full marketplace controls regression

```bash
npm --prefix e2e test -- --project=chromium tests/marketplace-controls/marketplace-controls.spec.ts
```

Then run the default enabled Chromium E2E suite:

```bash
npm --prefix e2e test -- --project=chromium
```

Legacy backend-dependent E2E suites require a provisioned staging backend and their documented fixtures. Only enable those with `E2E_WITH_BACKEND=1` after staging prerequisites are available.

## Certification rule

Do not mark inventory presentation certified until the six-width browser run, pagination browser run, full marketplace controls suite, targeted component test, project type-check and production build complete with zero failures, and all six-width screenshots are visually reviewed. Static source validators and isolated CSS checks are not substitutes for real application browser execution.
