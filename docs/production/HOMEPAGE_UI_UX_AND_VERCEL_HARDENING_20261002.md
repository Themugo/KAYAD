# KAYAD Homepage UI/UX + Vercel Hardening — 2026-10-02

## Audit scope

The active public homepage is `src/features/VehicleMarketplace/components/VehicleMarketplace.tsx`, mounted from `src/App.tsx` when `activeNav === "marketplace"`. The older files under `src/components/home/` and `src/pages/home/components/` are legacy/compatibility sources and are not the active homepage composition.

## Findings and corrections

1. **Homepage admin context was not passed from App** — corrected by passing the existing real `user` and `isHomePage` flags. This restores the already-built admin presentation controls without creating a second configuration system.
2. **Hero could present configured fallback vehicle identities** — public hero identity is now strictly real featured inventory. Legacy fallback settings remain for compatibility but cannot become clickable public vehicle identities.
3. **Hero background depended on an external image URL** — switched the default to the repository asset `/hero/kayad-nairobi-kicc.jpg`, reducing a deployment/runtime dependency while preserving the current visual composition.
4. **Featured picks used `serverVehicles` as a dependency but read the older `vehicles` snapshot** — corrected to use the authoritative current server result consistently.
5. **How It Works CTA could fall through to the seller platform** — it now stays within the existing homepage journey when no CMS CTA override is configured.
6. **Hero trust row was static** — retained the same visual footprint but now shows real catalogue/current-page auction/ending-soon/saved signals.
7. **Vercel/CI deployment contract was incomplete** — added `.env.production.example` with browser-safe production values required by the repository's own deployment-readiness validator.
8. **Node version drift risk** — package engine is pinned to `22.22.2`, matching `.nvmrc`, `.node-version`, and GitHub deployment workflows.
9. **Deployment workflow** — added the homepage convergence gate before the production build/Vercel deployment.

## Vercel diagnosis

The repository's production workflow runs `validate:deployment-readiness` before building and deploying to Vercel. Before this correction, that validator failed because `.env.production.example` was absent. The sandbox also runs Node 22.16.0, while the project contract requires Node 22.22.2, so a local build cannot be truthfully certified here. The GitHub production workflow already provisions Node 22.22.2.

No claim is made about a live Vercel deployment until the repository's production workflow or a Vercel deployment log confirms it.

## Certification

- Homepage convergence: **PASS**
- Deployment readiness: **PASS**
- Canonical architecture: **PASS**
- Frontend runtime contracts: **PASS**
- UI surface convergence: **9/9 PASS**
- Premium presentation: **16/16 PASS**

## Deliberate non-changes

- No new homepage feature engine.
- No new marketplace data source.
- No new vehicle/auction/escrow engine.
- No redesign of the existing page layout.
- No invented inventory, auction, customer, escrow or performance data.
