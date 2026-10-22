# Reference and Consumer Findings

## Scope
Static text scans covered source, backend, public, scripts, tests, E2E, package configuration, Vite configuration, documentation, manifests and historical evidence.

## Visual assets
No filename references to the five preview assets were found in the scanned active scopes: `src`, `backend`, `public`, `scripts`, `tests`, `e2e`, root `package.json` and `vite.config.ts`. The filenames appear in historical inventories and audits. Those mentions were not rewritten because they preserve provenance.

External CI, hosting, CMS records outside the repository, developer worktrees and scheduled jobs were not available for inspection. Therefore the assets were moved to historical evidence but not deleted.

## Root load test
`load-test.js` had no confirmed active root-path consumer. Its only relevant root-specific tooling match was an ESLint ignore entry; the existing `load-tests/**` ignore already covers the new destination. The file was moved to `load-tests/legacy-api-load-test.js`, and the obsolete ignore entry was removed.

## Startup scripts
`start-all.bat` and `start-frontend.bat` are read by `scripts/validate-startup-convergence.mjs`; they remain at the root. Other root startup scripts were retained as developer entrypoints.

## Classification
No local reference search is treated as proof that external consumers do not exist.
