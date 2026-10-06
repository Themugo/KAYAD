# KAYAD Vercel Deployment Recovery Audit — 2026-10-06

## Scope

Deep deployment-focused audit of `KAYAD-INSPECTION-STAGING-RUNTIME-FOUNDATION-20261006(1).zip` after the inspection/runtime progression caused the Vercel deployment to fail.

This sweep deliberately preserves the existing KAYAD architecture, marketplace, inspection domain, and UI. It targets only deployment/build integrity.

## Confirmed release blocker found and fixed

### `src/utils/helpers.js` contained TypeScript syntax in JavaScript

The file contained:

```js
export const getMediaSrcSet = (src: string | undefined | null): { src: string; srcSet?: string } | null => {
```

Because the source file is `.js`, those TypeScript annotations are invalid JavaScript and can cause the frontend bundling/transpilation stage to fail.

It is now valid JavaScript:

```js
export const getMediaSrcSet = (src) => {
```

No behavior was changed: the helper still returns `null` for an empty source and `{ src }` otherwise.

## Deployment hardening added

1. Added the official Vercel configuration schema declaration to `vercel.json`.
2. Added `scripts/validate-vercel-build-contract.mjs`.
   - validates Node contract `>=22.22.2`;
   - validates Vercel schema/build/install/output settings;
   - validates API rewrite ordering;
   - transpile-checks frontend `.ts/.tsx/.js/.jsx` source for syntax errors;
   - resolves relative frontend imports before deployment.
3. Registered `npm run validate:vercel-build` in `package.json`.
4. Added the build-contract gate to `.github/workflows/deploy.yml` immediately before `npm run build`.
5. Preserved the existing external API rewrite and SPA fallback architecture.

Vercel's current documentation supports external-origin rewrites such as `/api/:path*` and ordered catch-all SPA rewrites. The existing API-before-SPA design therefore remains the correct architecture. citeturn1search0turn1search1

## Verification performed in this environment

### PASS

- Frontend transpile/syntax sweep: **676 source files, 0 syntax errors** after the fix.
- Frontend relative-import resolution: **PASS**.
- Vercel configuration JSON: **PASS**.
- Vercel schema: **PASS**.
- Node release contract: **PASS in repository configuration** (`>=22.22.2`).
- Vercel install command: `npm ci`.
- Vercel build command: `npm run build`.
- Vercel output directory: `dist`.
- API rewrite precedes SPA fallback.
- Existing deployment readiness validator: **PASS**.
- Existing Vercel CI contract validator: **PASS** before the new gate.
- Existing frontend runtime contract validator: **PASS**.
- Existing deployment-runtime-drift validator: **17/17 PASS**.
- Existing V14 release-candidate validator: **17/17 PASS**.

### Not certified here

A complete production build and live Vercel deployment cannot honestly be declared from this sandbox because:

- the sandbox runtime is Node **22.16.0**, below the repository's required **22.22.2+**;
- a clean `npm ci` could not complete because the environment's package transport timed out;
- therefore a real `vite build` and real Vercel deployment were not executed here;
- no Vercel dashboard/token access was available to inspect the actual failed deployment logs.

The uploaded foundation therefore receives a **deployment-repaired / locally static-verified** status, not a false production-certified status.

## Required Windows release sequence

Use Node 22.22.2+ in the real checkout, then:

```cmd
cd /d "C:\Users\hp\Desktop\KAYAD-main"
node --version
npm --version
npm ci
npm run validate:vercel-build
npm run typecheck
npm test
npm run build
npm run validate:deployment-readiness
npm run validate:vercel-ci
```

Then deploy through the canonical Vercel path already documented by the repository. Do not force-push, do not delete/recreate the Vercel project, and do not bypass the release verification gate.

## Important production boundary

If the frontend build succeeds but the public site still fails, the next suspect is the Vercel project/domain configuration rather than the inspection code. The repository cannot repair missing Vercel credentials, an incorrect project ID, or an unverified custom-domain assignment without access to the Vercel project.
