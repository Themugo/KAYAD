@echo off
:: Start backend in a new window, then start frontend in this window
echo Starting KAYAD Backend in a new window...
start "KAYAD Backend" cmd /k "cd /d %~dp0backend && npm run dev"

echo Waiting 3 seconds for backend to initialise...
timeout /t 3 /nobreak > nul

echo Starting KAYAD Frontend...
cd /d "%~dp0frontend"
npm run dev
