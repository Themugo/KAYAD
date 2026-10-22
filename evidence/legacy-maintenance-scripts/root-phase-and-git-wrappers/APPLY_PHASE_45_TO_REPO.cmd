@echo off
setlocal
set "SRC=%~dp0"
set "DST=C:\Users\hp\Desktop\KAYAD-main"
if not exist "%DST%\.git" (
  echo ERROR: KAYAD repository not found at %DST%
  exit /b 1
)
robocopy "%SRC%src" "%DST%\src" /E /COPY:DAT /DCOPY:DAT /R:2 /W:1 >nul
copy /Y "%SRC%scripts\validate-phase45.mjs" "%DST%\scripts\validate-phase45.mjs" >nul
copy /Y "%SRC%PHASE_45_COMPLETE.md" "%DST%\PHASE_45_COMPLETE.md" >nul
if errorlevel 1 exit /b 1
echo Phase 45 files applied to %DST%
exit /b 0
