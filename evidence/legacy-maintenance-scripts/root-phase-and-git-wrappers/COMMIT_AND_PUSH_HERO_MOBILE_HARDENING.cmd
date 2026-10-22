@echo off
REM Run from the KAYAD repo root after copying this zip's contents over it.
cd /d "C:\Users\hp\Desktop\KAYAD-main" || exit /b 1

git status
call npm ci || exit /b 1
call npm run typecheck || exit /b 1
call npm run build || exit /b 1
call npm run test || exit /b 1
node scripts/validate-home-hero-premium.mjs || exit /b 1
node scripts/validate-next7-polish.mjs || exit /b 1
node scripts/validate-homepage-convergence.mjs || exit /b 1
node scripts/validate-premium-presentation-pass.mjs || exit /b 1

REM Stage ONLY the files changed in this pass (no git add -A).
git add src/features/VehicleMarketplace/components/VehicleMarketplace.tsx
git add src/components/MobileBottomNav.tsx src/components/Navbar.tsx src/App.tsx
git add src/__tests__/components/MobileBottomNav.test.tsx
git add scripts/validate-home-hero-premium.mjs scripts/validate-homepage-convergence.mjs scripts/validate-premium-presentation-pass.mjs
git status
git commit -m "fix: harden premium hero containment and mobile app navigation"
git push origin main
