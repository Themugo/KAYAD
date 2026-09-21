@echo off
setlocal
cd /d "%~dp0"
echo Starting KAYAD Frontend...
call npm run dev
endlocal
