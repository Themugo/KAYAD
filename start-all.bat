@echo off
setlocal
:: Start backend in a new window, then start the root Vite frontend in this window.
cd /d "%~dp0"

echo Starting KAYAD Backend in a new window...
start "KAYAD Backend" cmd /k "cd /d %~dp0backend && npm run dev"

echo Waiting 3 seconds for backend to initialise...
timeout /t 3 /nobreak > nul

echo Starting KAYAD Frontend...
call npm run dev
endlocal
