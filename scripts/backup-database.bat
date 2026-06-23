@echo off
REM scripts/backup-database.bat
REM MongoDB backup script for KAYAD (Windows)

setlocal enabledelayedexpansion

REM Configuration
set BACKUP_DIR=.\backups\mongodb
set TIMESTAMP=%date:~-4,4%%date:~-7,2%%date:~-10,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set BACKUP_NAME=kayad_backup_%TIMESTAMP%
set RETENTION_DAYS=7

REM Load environment variables
if exist backend\.env (
    for /f "tokens=*" %%a in (backend\.env) do (
        set line=%%a
        REM Skip comments and empty lines
        echo !line! | findstr /r "^#" >nul
        if errorlevel 1 (
            echo !line! | findstr /r "=" >nul
            if not errorlevel 1 (
                for /f "tokens=1,2 delims==" %%b in ("!line!") do (
                    set %%b=%%c
                )
            )
        )
    )
)

REM Create backup directory
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo.
echo ======================================
echo   MongoDB Backup for KAYAD
echo ======================================
echo.
echo Backup name: %BACKUP_NAME%
echo Timestamp: %TIMESTAMP%
echo.

REM Check if mongodump is available
where mongodump >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: mongodump not found. Please install MongoDB tools.
    echo Download from: https://www.mongodb.com/try/download/database-tools
    exit /b 1
)

REM Check if MONGO_URI is set
if "%MONGO_URI%"=="" (
    echo ERROR: MONGO_URI not set in backend\.env
    exit /b 1
)

REM Perform backup
echo Starting MongoDB backup...
mongodump --uri="%MONGO_URI%" --out="%BACKUP_DIR%\%BACKUP_NAME%" --gzip

if %errorlevel% equ 0 (
    echo.
    echo Backup completed successfully: %BACKUP_DIR%\%BACKUP_NAME%
) else (
    echo.
    echo ERROR: Backup failed
    exit /b 1
)

REM Clean up old backups (Windows doesn't have direct equivalent to find -mtime)
REM This is a simplified version - for production, consider using PowerShell
echo.
echo Cleaning up old backups (keeping last %RETENTION_DAYS% days)...
REM Note: Automatic cleanup requires PowerShell or additional tools
echo Manual cleanup may be required on Windows

REM List current backups
echo.
echo Current backups:
dir "%BACKUP_DIR%" /B /O-D

echo.
echo ======================================
echo Backup process completed
echo ======================================
echo.
