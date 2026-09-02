@echo off
REM scripts/dev-setup.bat
REM Development environment setup script for KAYAD (Windows)

echo.
echo ======================================
echo   KAYAD Development Environment Setup
echo ======================================
echo.

REM Check Node.js version
echo Checking Node.js version...
node -v
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed. Please install Node.js 22.22.2
    exit /b 1
)

echo.

REM Install frontend dependencies
echo Installing frontend dependencies...
call npm ci
if %errorlevel% neq 0 (
    echo ERROR: Failed to install frontend dependencies
    exit /b 1
)

echo.

REM Install backend dependencies
echo Installing backend dependencies...
cd backend
call npm ci
if %errorlevel% neq 0 (
    echo ERROR: Failed to install backend dependencies
    cd ..
    exit /b 1
)
cd ..

echo.

REM Copy environment files if they don't exist
echo Setting up environment files...

if not exist .env (
    echo Creating .env from .env.example...
    copy .env.example .env
    echo WARNING: Please edit .env with your actual configuration
)

if not exist backend\.env (
    echo Creating backend\.env from backend\.env.example...
    copy backend\.env.example backend\.env
    echo WARNING: Please edit backend\.env with your actual configuration
)

echo.

REM Create necessary directories
echo Creating necessary directories...
if not exist backend\uploads mkdir backend\uploads
if not exist logs mkdir logs

echo.

echo ======================================
echo Development environment setup complete!
echo ======================================
echo.
echo Next steps:
echo 1. Edit .env and backend\.env with your configuration
echo 2. Provision/use Supabase and configure backend\.env with the required Supabase credentials
echo 3. Run 'npm run dev' to start the frontend
echo 4. Run 'cd backend ^&^& npm run dev' to start the backend
echo.
echo For more information, see README.md
echo.
