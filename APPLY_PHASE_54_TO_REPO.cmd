@echo off
setlocal
set "ZIP=%USERPROFILE%\Desktop\KAYAD-PHASE-54-PAYMENT-HISTORY-RECOVERY-COMPLETE.zip"
set "EXTRACT=%USERPROFILE%\Desktop\KAYAD-PHASE-54-PAYMENT-HISTORY-RECOVERY"
set "REPO=%USERPROFILE%\Desktop\KAYAD-main"

if not exist "%ZIP%" (
  echo ERROR: Package not found: %ZIP%
  exit /b 1
)

powershell -NoProfile -Command "Expand-Archive -LiteralPath '%ZIP%' -DestinationPath '%EXTRACT%' -Force"
if errorlevel 1 exit /b 1

xcopy "%EXTRACT%\KAYAD-main\*" "%REPO%\" /E /I /Y >nul
if errorlevel 1 exit /b 1

echo Phase 54 files copied into %REPO%
echo Next: run the validation/commit command from the phase instructions.
endlocal
