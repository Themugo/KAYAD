# KAYARD KE — 06D real-browser regression runbook

This runbook is for the exact 06D source tree. It does not change application runtime code.

## Required runtime

- Node.js `22.22.2` (the repository pins this in `.nvmrc` and requires `>=22.22.2`)
- npm compatible with the lockfile
- Chromium installed by Playwright (`npx playwright install chromium` if needed)

## Install from the repository root

```bash
node --version
# Must print v22.22.2
npm ci
npm --prefix e2e ci
npx --prefix e2e playwright install chromium
```

## Run the six-viewport inventory browser regression

```bash
npm --prefix e2e test -- --project=chromium tests/marketplace-controls/marketplace-controls.spec.ts --grep "all six supported viewport widths"
```

The test visits 1440, 1280, 1024, 768, 390 and 360 CSS-pixel viewport widths. At each width it switches Grid -> List, checks computed card direction, card/media/content geometry, save/detail/contact actions and horizontal overflow. At phone widths it also checks 44px view-toggle targets. It writes one viewport screenshot per mode to `e2e/test-results/inventory-responsive-06d/`.

## Full inventory interaction suite

```bash
npm --prefix e2e test -- --project=chromium tests/marketplace-controls/marketplace-controls.spec.ts
```

## Certification rule

Do not mark the inventory certified unless the real Playwright run completes with zero failures and the six viewport screenshots are reviewed. A static source validator or isolated CSS harness is not a substitute for this run.
