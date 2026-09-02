@echo off
setlocal
set "TARGET=C:\Users\hp\Desktop\KAYAD-main"
if not exist "%TARGET%\package.json" (
  echo ERROR: KAYAD repo not found at %TARGET%
  exit /b 1
)
copy /Y "%~dp0src\services\vehicleApi.ts" "%TARGET%\src\services\vehicleApi.ts" >nul || exit /b 1
copy /Y "%~dp0src\types\index.ts" "%TARGET%\src\types\index.ts" >nul || exit /b 1
copy /Y "%~dp0src\components\detail\VehicleDetailPage.tsx" "%TARGET%\src\components\detail\VehicleDetailPage.tsx" >nul || exit /b 1
copy /Y "%~dp0scripts\validate-phase43.mjs" "%TARGET%\scripts\validate-phase43.mjs" >nul || exit /b 1
copy /Y "%~dp0PHASE_43_COMPLETE.md" "%TARGET%\PHASE_43_COMPLETE.md" >nul || exit /b 1
copy /Y "%~dp0APPLY_PHASE_43_TO_REPO.cmd" "%TARGET%\APPLY_PHASE_43_TO_REPO.cmd" >nul || exit /b 1
cd /d "%TARGET%"
node scripts\validate-phase43.mjs
endlocal
