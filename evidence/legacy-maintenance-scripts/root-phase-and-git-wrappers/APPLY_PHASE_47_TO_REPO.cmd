@echo off
setlocal
cd /d C:\Users\hp\Desktop\KAYAD-main
powershell -NoProfile -Command "Expand-Archive -LiteralPath 'KAYAD-PHASE-47-COMPLETE.zip' -DestinationPath 'C:\Users\hp\Desktop\KAYAD-main' -Force"
echo Phase 47 files extracted into KAYAD-main.
endlocal
