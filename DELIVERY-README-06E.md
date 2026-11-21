# KAYARD KE — Implementation 06E full corrected source package

## What this package contains

This is the complete KAYARD KE source tree based on the 06E working baseline. It preserves the existing application and includes the 06E inventory toolbar, vehicle-card presentation, pagination UI, targeted component/browser regression coverage, static validators, screenshots, and implementation/certification notes.

## Important certification status

**06E is the working baseline, but the inventory is NOT browser-certified yet.** The following source-level validators were executed successfully when this package was prepared:

- `node scripts/validate-inventory-layout-06a.mjs` — 16/16 PASS
- `node scripts/validate-inventory-responsive-06d.mjs` — 10/10 PASS
- `node scripts/validate-inventory-presentation-06e.mjs` — 14/14 PASS

The actual six-viewport Playwright run, pagination browser run, full marketplace-controls E2E suite, project type-check, and production build remain pending because the preparation environment did not have the repository-pinned Node.js 22.22.2 runtime and complete installed dependencies. Do not treat static validators as a substitute for browser verification.

See:

- `IMPLEMENTATION-06E-REPORT.md`
- `REAL-BROWSER-REGRESSION-06E-STATUS.md`
- `REAL-BROWSER-REGRESSION-06E-RUNBOOK.md`

## Required local runtime

Use Node.js **22.22.2** as specified by `.nvmrc` and `package.json`.

From this directory:

```bash
node --version
npm ci
npm --prefix e2e ci
npx --prefix e2e playwright install chromium
```

Then follow `REAL-BROWSER-REGRESSION-06E-RUNBOOK.md` for targeted tests, all six viewport sizes (1440, 1280, 1024, 768, 390, 360), pagination boundary/direct-page tests, full marketplace controls regression, type-check, production build, and screenshot review.

## Scope protection

06E is limited to homepage marketplace inventory presentation and its regression coverage. It does not authorize unrelated dashboard, account, hero, navbar, backend, database, or listing-lifecycle changes.
