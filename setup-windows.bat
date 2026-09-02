@echo off
setlocal
:: =====================================================================
::  KAYAD — Windows Development Setup
::  Run once from the KAYAD-main root folder in CMD
::  Usage: setup-windows.bat
:: =====================================================================

echo.
echo ================================================
echo   KAYAD — Windows Development Setup
echo ================================================
echo.

if not exist package.json (
    echo ERROR: Run this script from the KAYAD-main repository root.
    exit /b 1
)
if not exist backend\package.json (
    echo ERROR: backend\package.json was not found.
    exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
    echo ERROR: Node.js is required. Use Node 22.22.2 or newer.
    exit /b 1
)

for /f "tokens=1" %%V in ('node -p "process.versions.node"') do set NODE_VERSION=%%V
for /f "tokens=1 delims=." %%M in ("%NODE_VERSION%") do set NODE_MAJOR=%%M
if %NODE_MAJOR% LSS 22 (
    echo ERROR: KAYAD requires Node.js 22.22.2 or newer. Detected %NODE_VERSION%.
    exit /b 1
)

echo [1/3] Installing backend dependencies with npm ci...
cd /d "%~dp0backend"
call npm ci
if errorlevel 1 exit /b 1
cd /d "%~dp0"

echo [2/3] Installing frontend dependencies with npm ci...
call npm ci
if errorlevel 1 exit /b 1

echo [3/3] Environment configuration reminder...
echo.
echo   Backend environment: copy backend\.env.example to backend\.env
if not exist backend\.env (
    echo   backend\.env does not exist yet. Create it and configure real local values.
)
echo   Frontend environment: create .env.local with VITE_API_URL and, when Realtime is enabled,
echo   VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
echo.
echo   Local frontend: http://localhost:3000
echo   Local backend:  http://localhost:5000
echo.
echo Setup complete.
endlocal
