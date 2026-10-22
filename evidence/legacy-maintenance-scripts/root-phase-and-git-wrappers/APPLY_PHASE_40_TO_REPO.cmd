@echo off
setlocal
set "SOURCE=%~dp0"
set "TARGET=C:\Users\hp\Desktop\KAYAD-main"

if not exist "%TARGET%\.git" (
  echo ERROR: Target repository was not found at %TARGET%\.git
  exit /b 1
)

echo Applying KAYAD Phase 40 files to:
 echo %TARGET%
echo.

robocopy "%SOURCE%" "%TARGET%" /E /XD .git node_modules dist /XF .gitignore /R:2 /W:2
set "RC=%ERRORLEVEL%"
if %RC% GEQ 8 (
  echo ERROR: robocopy failed with code %RC%.
  exit /b %RC%
)

for %%F in (
  "src\features\BankFinancingPortal.tsx"
  "src\features\FinancingView\components\BankFinancingPortal.tsx"
) do (
  if exist "%TARGET%\%%~F" del /F /Q "%TARGET%\%%~F"
)

echo.
echo Phase 40 files applied successfully.
echo Review git diff before committing. No destructive git command was used.
exit /b 0
