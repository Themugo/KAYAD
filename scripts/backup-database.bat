@echo off
REM scripts/backup-database.bat
REM Supabase/PostgreSQL backup helper for KAYAD

setlocal
set BACKUP_DIR=.\backups\supabase
set TIMESTAMP=%date:~-4,4%%date:~-7,2%%date:~-10,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set BACKUP_NAME=kayad_backup_%TIMESTAMP%.sql

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

where supabase >nul 2>&1
if %errorlevel% neq 0 (
  echo ERROR: Supabase CLI is required for database backups.
  exit /b 1
)

if "%SUPABASE_DB_URL%"=="" (
  echo ERROR: SUPABASE_DB_URL is not set.
  echo Set it only in your local shell/secret store; never commit it.
  exit /b 1
)

echo Starting KAYAD Supabase/PostgreSQL backup...
supabase db dump --db-url "%SUPABASE_DB_URL%" --file "%BACKUP_DIR%\%BACKUP_NAME%"
if %errorlevel% neq 0 (
  echo ERROR: Supabase database backup failed.
  exit /b 1
)

echo Backup completed: %BACKUP_DIR%\%BACKUP_NAME%
powershell -NoProfile -Command "Get-ChildItem '%BACKUP_DIR%' -Filter '*.sql' | Where-Object {$_.LastWriteTime -lt (Get-Date).AddDays(-7)} | Remove-Item -Force"
dir "%BACKUP_DIR%" /B /O-D
exit /b 0
