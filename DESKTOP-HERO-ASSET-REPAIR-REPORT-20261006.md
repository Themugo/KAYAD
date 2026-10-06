# KAYAD Desktop Hero Asset Repair — 2026-10-06

## Root cause
The canonical showcase configuration was still using the low-resolution legacy desktop assets:
- `/hero/kayad-land-cruiser-clean.png` — 390×226
- `/hero/kayad-mercedes-gle-clean.png` — 358×195

The mobile path was already using the high-resolution WebP assets, which is why mobile rendered correctly while desktop remained visually degraded.

## Repair
Desktop showcase configuration now uses:
- Land Cruiser → `/hero/kayad-land-cruiser-cutout.png` — 1021×634 RGBA
- Mercedes GLE → `/hero/kayad-mercedes-gle-cutout.png` — 1028×610 RGBA

Mobile remains unchanged:
- Land Cruiser → `/hero/kayad-land-cruiser-mobile.webp`
- Mercedes GLE → `/hero/kayad-mercedes-gle-mobile.webp`

## Legacy configuration safety
Only the two exact known legacy canonical URLs are normalized to their matching vehicle's high-resolution desktop asset. Custom admin image URLs remain untouched, and cross-vehicle pairing is prevented by matching both vehicle ID and exact legacy URL.

## Validation
- `validate:hero-mobile-assets`: PASS
- `validate:hero-desktop-assets`: PASS
- `validate-home-hero-premium.mjs`: PASS — 12/12
- `validate:hero-admin-control`: PASS
- `validate:canonical-architecture`: PASS
- `validate:frontend-runtime-contracts`: PASS
- `validate:deployment-readiness`: PASS
- Full npm install/typecheck/build/test suite: BLOCKED in this Linux environment because the repository requires Node >=22.22.2 and the available runtime is Node 22.16.0.
- Real browser visual verification: NOT PERFORMED in this environment.

## Changed files
- `src/features/VehicleMarketplace/components/VehicleMarketplace.tsx`
- `src/features/VehicleMarketplace/hooks/useHomePageConfig.ts`
- `src/__tests__/components/VehicleMarketplace.test.tsx`
- `scripts/validate-hero-mobile-assets.mjs`
- `scripts/validate-hero-desktop-assets.mjs`
- `scripts/validate-home-hero-premium.mjs`
- `package.json`
- `.github/workflows/deploy.yml`

## Next verification
Run on Windows with Node 22.22.2+: `npm ci`, typecheck, build, tests, then visually inspect desktop at 1024/1280/1366/1440/1536/1920px and mobile at 320/360/375/390/412/430px.
