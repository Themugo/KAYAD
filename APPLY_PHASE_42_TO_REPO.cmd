@echo off
setlocal
set "TARGET=C:\Users\hp\Desktop\KAYAD-main"
set "SOURCE=%~dp0"
if not exist "%TARGET%\src\features\VehicleMarketplace\components" (
  echo ERROR: KAYAD repo was not found at %TARGET%
  exit /b 1
)
copy /Y "%SOURCE%src\services\vehicleApi.ts" "%TARGET%\src\services\vehicleApi.ts" >nul
copy /Y "%SOURCE%src\features\VehicleMarketplace\components\VehicleMarketplace.tsx" "%TARGET%\src\features\VehicleMarketplace\components\VehicleMarketplace.tsx" >nul
copy /Y "%SOURCE%scripts\validate-phase42.mjs" "%TARGET%\scripts\validate-phase42.mjs" >nul
copy /Y "%SOURCE%PHASE_42_COMPLETE.md" "%TARGET%\PHASE_42_COMPLETE.md" >nul
cd /d "%TARGET%"
node scripts\validate-phase42.mjs
if errorlevel 1 exit /b 1
echo Phase 42 files applied and statically validated.
endlocal
