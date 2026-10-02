# KAYAD — Vercel CLI & Deployment Hardening — 2026-10-02

## Basis

This patch is built strictly on `KAYAD-VERCEL-RELEVANT-CHERRY-PICKED-FOUNDATION-20261002.zip`.
No stale application features or unrelated ZIP-2 changes were imported.

## Confirmed failures addressed

1. **Frontend build failure**
   - Windows build reported Tailwind/Vite `CssSyntaxError: Missing closing } at .auction-wow-gallery-shade`.
   - Root cause: `.auction-wow-gallery-shade` ended with an unclosed CSS declaration.
   - Fix: close the `linear-gradient(...)` and CSS rule correctly.

2. **Vercel CLI drift**
   - The previous workflow installed an unpinned global `vercel` package.
   - Fix: CI now installs `vercel@60.1.3` and verifies `vercel --version`.

3. **Non-deterministic Vercel project targeting**
   - CI previously depended on local project settings being available after checkout.
   - Fix: CI requires `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`, explicitly links the intended project, then pulls production settings.

4. **Deployment step secret scope**
   - The deploy shell referenced Vercel secrets without exposing them as step environment variables.
   - Fix: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` are explicitly provided to the deploy step.

5. **Future deployment drift**
   - Added `validate:vercel-ci` and runs it in the deployment validation job.
   - It checks CLI pinning, project targeting, credentials, prebuilt deployment, post-deploy verification, and the repaired WOW CSS rule.

## Required GitHub Actions secrets

The production deployment job now requires:

- `VERCEL_TOKEN` — a valid Vercel token with access to the project.
- `VERCEL_ORG_ID` — the Vercel team/account ID (scope ID) containing KAYAD.
- `VERCEL_PROJECT_ID` — the KAYAD Vercel project ID.

The workflow intentionally fails before deployment if any of these are absent.

## Important: token error is an environment credential issue

The reported error `The specified token is not valid` cannot be repaired by a repository code change. A fresh valid Vercel token must be supplied to the local CLI and/or GitHub Actions secret. The repository now makes this failure explicit instead of allowing project-linking/build errors to obscure it.

## Local Windows recovery sequence

From the KAYAD repository root, use Node 22.22.2 and the pinned CLI:

```cmd
node --version
npm --version
npm install -g vercel@60.1.3
vercel --version
vercel login
vercel whoami
vercel link --yes --project <VERCEL_PROJECT_ID> --scope <VERCEL_ORG_ID>
vercel pull --yes --environment=production
npm run build
vercel build --prod
vercel deploy --prebuilt --prod
```

If the CLI reports an invalid token, do not keep retrying the same token. Authenticate again with `vercel login` for local work, or replace the `VERCEL_TOKEN` GitHub secret for CI.

## Validation performed in this build environment

- `node --check scripts/validate-vercel-ci-contract.mjs` — PASS
- `node --check scripts/validate-deployment-readiness.mjs` — PASS
- `node scripts/validate-vercel-ci-contract.mjs` — PASS
- `node scripts/validate-deployment-readiness.mjs` — PASS
- `node scripts/validate-frontend-runtime-contracts.mjs` — PASS
- `node scripts/validate-homepage-convergence.mjs` — PASS
- `.github/workflows/deploy.yml` YAML parse — PASS

A full Vite production build was **not** claimed in this sandbox because the available Node runtime is 22.16.0 while KAYAD deliberately requires exact Node 22.22.2. The original Windows build failure itself was identified and corrected at source.

## No regression imports

The patch does not import:

- stale ZIP-2 Auction changes
- Axios dependency changes
- test-only changes
- unrelated auth/model changes
- relaxed Node engine constraints
- empty `auction-experience-2.css`
- CLI session artifacts (`Success!`, `Upgrading`, `main`, `npm`, `vercel`)

## Next gate

After the user updates the valid Vercel credentials/project IDs, run the repository push and allow GitHub Actions to execute the hardened production workflow. The next failure, if any, should now be a concrete Vercel authentication/project/build/runtime error rather than ambiguous CLI drift.
