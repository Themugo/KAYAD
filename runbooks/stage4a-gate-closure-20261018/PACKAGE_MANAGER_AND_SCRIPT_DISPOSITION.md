# Stage 4A — Package-manager policy and broken-script disposition (2026-10-18)

## Backend scripts that pointed at absent files (G8)
| Script (backend/package.json) | Target | Evidence of intended behavior | Disposition |
|---|---|---|---|
| `seed-depts` | `scripts/seed-departments.js` | Mentioned in `docs/DEPLOYMENT.md:209`; no implementation, no history in any supplied archive (Foundation, Stage 2, 3A, 4 and the 2026-10-17 continuation ZIP were searched) | **Disabled** |
| `monitor`, `health-check`, `notify-deployment` | `scripts/deploymentMonitor.js monitor|check|notify` | Only the three package entries; docs (handover, dependency audit) say the file is absent | **Disabled** |

Change: each entry now runs a stub that prints `npm run <name> is DISABLED (Stage 4A, 2026-10-18): <target> is not present in the supplied project archives…` and exits 1, instead of failing with `MODULE_NOT_FOUND`. Nothing was invented: behavior could not be established from any source. Names are kept so documentation does not silently become wrong. To restore: supply the owner-approved implementation (the guard test `stage4aGateClosure › G8` then requires the target to exist); to retire: delete the entries and update `docs/DEPLOYMENT.md` and the handover documents. Decision D12-scripts in the register.

## bun.lock vs npm lockfiles
Measured against `package.json` (root): `bun.lock` lists 13 dependencies but 8 differ from `package.json` (e.g. it contains `express`, `@google/genai`, `@supabase/supabase-js`; it lacks `axios`, `react-router-dom`, `framer-motion`, `@sentry/react` …), is missing 14 of 21 devDependencies (`vitest`, `eslint`, `@testing-library/*`, `jsdom` …), and pins different ranges for shared packages (`vite ^6.2.3` vs `8.2.0`, `react ^19.0.1` vs `19.2.8`). **It cannot reproduce the project.**
Policy evidence: CI uses `npm ci` (`.github/workflows/ci.yml`), Vercel `installCommand` is `npm ci`, README states npm, `.nvmrc`/engines pin Node. 
Disposition: **`bun.lock` is retained unchanged** (not deleted; no decision to delete exists) and is documented as non-authoritative. Reproducibility of the supported path was verified by `npm ci` from `package-lock.json` in a clean copy (see report). Regenerating or removing `bun.lock` is owner decision D13; a guard test pins that npm is the CI/Vercel install policy and that the drift exists, so a later regeneration is a visible, deliberate change.
