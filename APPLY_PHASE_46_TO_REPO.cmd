@echo off
setlocal
cd /d C:\Users\hp\Desktop\KAYAD-main
powershell -NoProfile -Command "Expand-Archive -LiteralPath 'KAYAD-PHASE-46-COMPLETE.zip' -DestinationPath 'C:\Users\hp\Desktop\KAYAD-main' -Force"
echo Phase 46 files extracted into KAYAD-main.
endlocal
