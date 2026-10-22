@echo off
setlocal
set "SOURCE=%~dp0"
set "TARGET=C:\Users\hp\Desktop\KAYAD-main"

echo ================================================
echo KAYAD RECOVERY PACKAGE APPLY
echo ================================================
echo Source: %SOURCE%
echo Target: %TARGET%
echo.

if not exist "%TARGET%\.git" (
  echo ERROR: Target does not contain .git. Aborting to protect repository history.
  exit /b 1
)

robocopy "%SOURCE%" "%TARGET%" /E /XD ".git" "node_modules" >nul
if errorlevel 8 (
  echo ERROR: File copy failed.
  exit /b 1
)

for %%F in (
  "backend\controllers\escrowVaultController.js"
  "backend\models\EscrowVault.js"
  "backend\routes\escrowVaultRoutes.js"
  "backend\utils\supabaseSession.js"
  "src\__tests__\pages\AuctionCalendar.test.jsx"
  "src\pages\EscrowVault.tsx"
  "src\pages\admin\AdminEscrowVault.jsx"
) do (
  if exist "%TARGET%\%%~F" del /f /q "%TARGET%\%%~F"
)

echo.
echo Recovery source copied and exact recovered deletions applied.
echo Git history was not modified.
echo Next: cd /d "%TARGET%" ^&^& npm install ^&^& npm run lint ^&^& npm run build ^&^& cd backend ^&^& npm install ^&^& npm test
exit /b 0
