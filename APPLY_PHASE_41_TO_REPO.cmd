@echo off
setlocal

set "TARGET=C:\Users\hp\Desktop\KAYAD-main"
set "SOURCE=%~dp0"

if not exist "%TARGET%\package.json" (
  echo ERROR: KAYAD repository not found at %TARGET%
  exit /b 1
)

if not exist "%SOURCE%src\App.tsx" (
  echo ERROR: Phase 41 source files not found beside this script.
  exit /b 1
)

copy /Y "%SOURCE%src\App.tsx" "%TARGET%\src\App.tsx" >nul || exit /b 1
copy /Y "%SOURCE%src\hooks\useVehicleCollections.ts" "%TARGET%\src\hooks\useVehicleCollections.ts" >nul || exit /b 1
copy /Y "%SOURCE%src\__tests__\hooks\useVehicleCollections.test.ts" "%TARGET%\src\__tests__\hooks\useVehicleCollections.test.ts" >nul || exit /b 1
copy /Y "%SOURCE%scripts\validate-phase41.mjs" "%TARGET%\scripts\validate-phase41.mjs" >nul || exit /b 1
copy /Y "%SOURCE%PHASE_41_COMPLETE.md" "%TARGET%\PHASE_41_COMPLETE.md" >nul || exit /b 1

pushd "%TARGET%"
node scripts\validate-phase41.mjs
if errorlevel 1 (
  echo ERROR: Phase 41 validation failed. Changes were copied but are NOT certified.
  popd
  exit /b 1
)
popd

echo.
echo Phase 41 files applied successfully.
echo Next: run npm run lint, npm run build, and the Phase 40 validator.
exit /b 0
