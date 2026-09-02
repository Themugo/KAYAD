@echo off
setlocal
set "REPO=C:\Users\hp\Desktop\KAYAD-main"
set "ROOT=%~dp0"
copy /Y "%ROOT%src\features\VehicleMarketplace\components\VehicleMarketplace.tsx" "%REPO%\src\features\VehicleMarketplace\components\VehicleMarketplace.tsx" >nul
copy /Y "%ROOT%scripts\validate-phase44.mjs" "%REPO%\scripts\validate-phase44.mjs" >nul
copy /Y "%ROOT%PHASE_44_COMPLETE.md" "%REPO%\PHASE_44_COMPLETE.md" >nul
echo Phase 44 files copied to %REPO%
cd /d "%REPO%"
node scripts\validate-phase44.mjs
if errorlevel 1 exit /b 1
