@echo off
:: =====================================================================
::  KAYAD — Windows Setup Script
::  Run this once from the KAYAD-main root folder in CMD or PowerShell
::  Usage: setup-windows.bat
:: =====================================================================

echo.
echo ================================================
echo   KAYAD — Drive Your Dream Today
echo   Windows Setup Script
echo ================================================
echo.

:: ── BACKEND SETUP ──────────────────────────────────────────────────
echo [1/4] Setting up backend...
cd backend

if not exist .env (
    copy .env.development .env
    echo   Created backend\.env from .env.development
    echo   IMPORTANT: Open backend\.env and set your MONGO_URI
) else (
    echo   backend\.env already exists - skipping copy
)

echo   Installing backend dependencies...
call npm install
echo   Backend dependencies installed.
cd ..

:: ── FRONTEND SETUP ─────────────────────────────────────────────────
echo.
echo [2/4] Setting up frontend...
cd frontend

if not exist .env (
    copy .env.development .env
    echo   Created frontend\.env from .env.development
    echo   IMPORTANT: Open frontend\.env and set your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
) else (
    echo   frontend\.env already exists - skipping copy
)

echo   Installing frontend dependencies...
call npm install
echo   Frontend dependencies installed.
cd ..

:: ── SUMMARY ────────────────────────────────────────────────────────
echo.
echo ================================================
echo   Setup complete!
echo ================================================
echo.
echo   Next steps:
echo.
echo   1. Set your MongoDB URI in backend\.env
echo      - For local MongoDB:  MONGO_URI=mongodb://127.0.0.1:27017/kayad
echo      - For Atlas:          MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/kayad
echo.
echo   2. Set your Supabase keys in frontend\.env
echo      Get them from: https://supabase.com/dashboard/project/_/settings/api
echo.
echo   3. Run the backend:
echo      cd backend
echo      npm run dev
echo.
echo   4. Run the frontend (new CMD window):
echo      cd frontend
echo      npm run dev
echo.
echo   Backend will be at:  http://localhost:5000
echo   Frontend will be at: http://localhost:3000
echo.
pause
