@echo off
echo ========================================
echo   KAYAD - Starting Backend + Frontend
echo ========================================
echo.

echo [1/2] Starting backend on port 5000...
start "KAYAD Backend" cmd /k "cd backend && npm run dev"
timeout /t 3 /nobreak >nul

echo [2/2] Starting frontend on port 3000...
start "KAYAD Frontend" cmd /k "npm run dev"

echo.
echo Both servers starting...
echo   Backend:  http://localhost:5000
echo   Frontend: http://localhost:3000
echo.
echo Press any key to close this window...
pause >nul
