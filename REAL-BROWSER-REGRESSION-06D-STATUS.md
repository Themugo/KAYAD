# KAYARD KE — 06D real-browser regression status

Date: 19 November 2026
Baseline: `KAYARD-KE-MASTER-IMPLEMENTATION-06D-INVENTORY-WORKFLOW-20261119.zip`

## Status: NOT CERTIFIED — runtime prerequisites unavailable in this environment

The requested full application Playwright run at 1440, 1280, 1024, 768, 390 and 360 CSS-pixel widths could not be executed here. No full-application browser pass is claimed.

### Exact environment blockers

- Repository `.nvmrc` pins Node `22.22.2`; the available Node runtime is `22.16.0`.
- The root `npm ci` stops on the declared engine requirement (`>=22.22.2`).
- Retrying with engine checks bypassed and npm offline mode stops because the lockfile dependency `zod-validation-error@4.0.2` is not cached.
- The package registry cannot be resolved from this environment (`Could not resolve host: registry.npmjs.org`), so the missing pinned runtime/dependencies cannot be downloaded.
- Chromium 144 is installed, but the project has no `node_modules`, Vite runtime, or `@playwright/test` installation. A browser binary alone cannot run the React application.

### Work completed

- Reopened and extracted the exact 06D ZIP.
- Added a Playwright test to the extracted working copy for all six requested widths. At each width it switches Grid/List and checks computed card direction, card/media/content geometry, save/detail/contact actions, horizontal overflow and phone toggle touch targets. It captures a screenshot for each mode.
- Added `REAL-BROWSER-REGRESSION-06D-RUNBOOK.md` with exact setup and execution commands.
- TypeScript transpilation of the updated Playwright spec: 0 syntax diagnostics.
- Existing static validators passed:
  - inventory layout 06A: 16/16
  - inventory responsive 06D: 10/10
  - homepage compact layout: 10/10
  - homepage responsive polish: 9/9
  - marketplace convergence: 17/17
  - marketplace UI convergence: 7/7
  - marketplace initiative: 12/12
  - stage 5 desktop marketplace: 14/14

These static validators are source-contract checks, not a substitute for browser execution.

## Exact command to finish on a machine with the required runtime

From the project root, using Node `22.22.2`:

```bash
npm ci
npm --prefix e2e ci
npx --prefix e2e playwright install chromium
npm --prefix e2e test -- --project=chromium tests/marketplace-controls/marketplace-controls.spec.ts --grep "all six supported viewport widths"
```

Review the generated screenshots under `e2e/test-results/inventory-responsive-06d/`. Then run the full marketplace controls spec:

```bash
npm --prefix e2e test -- --project=chromium tests/marketplace-controls/marketplace-controls.spec.ts
```

## Certification rule

Keep 06D as the application baseline. Do not label inventory responsive behaviour fully certified until both real Playwright commands complete with zero failures and the six-width screenshots have been visually reviewed. No application runtime files were changed in this regression-preparation pass.
