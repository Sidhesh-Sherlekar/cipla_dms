@echo off
REM Cipla DMS - Role and Permission Setup Script (Windows)
REM This script sets up roles, permissions, and creates a test admin account
REM
REM Usage: setup_roles.bat

setlocal enabledelayedexpansion

echo =====================================================================
echo           Cipla DMS - Role ^& Permission Setup Script
echo =====================================================================
echo.

REM Get script directory
set "SCRIPT_DIR=%~dp0"
set "BACKEND_DIR=%SCRIPT_DIR%backend"

REM Check if backend directory exists
if not exist "%BACKEND_DIR%" (
    echo [ERROR] Backend directory not found!
    echo Please run this script from the project root directory.
    pause
    exit /b 1
)

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH!
    echo Please install Python 3 before running this script.
    pause
    exit /b 1
)

echo [OK] Python detected:
python --version
echo.

REM Navigate to backend directory
cd /d "%BACKEND_DIR%"

REM Check if manage.py exists
if not exist "manage.py" (
    echo [ERROR] manage.py not found in backend directory!
    pause
    exit /b 1
)

echo [OK] Django project detected
echo.

REM Check if virtual environment exists
if exist "..\env\Scripts\activate.bat" (
    set "VENV_DIR=..\env"
) else if exist "..\venv\Scripts\activate.bat" (
    set "VENV_DIR=..\venv"
) else (
    set "VENV_DIR="
)

if defined VENV_DIR (
    echo [INFO] Virtual environment detected: !VENV_DIR!
    echo [INFO] Activating virtual environment...
    call "!VENV_DIR!\Scripts\activate.bat"
    if errorlevel 1 (
        echo [WARNING] Could not activate virtual environment
        echo Continuing with system Python...
    ) else (
        echo [OK] Virtual environment activated
    )
    echo.
)

REM Step 1: Run migrations
echo =====================================================================
echo [1/3] Running database migrations...
echo =====================================================================
python manage.py migrate --noinput

if errorlevel 1 (
    echo [ERROR] Migration failed!
    pause
    exit /b 1
)

echo [OK] Migrations completed successfully
echo.

REM Step 2: Setup roles and permissions
echo =====================================================================
echo [2/3] Setting up roles and permissions...
echo =====================================================================
python manage.py setup_roles

if errorlevel 1 (
    echo [ERROR] Role setup failed!
    pause
    exit /b 1
)

echo [OK] Roles and permissions setup completed
echo.

REM Step 3: Collect static files
echo =====================================================================
echo [3/3] Collecting static files...
echo =====================================================================
python manage.py collectstatic --noinput --clear

if errorlevel 1 (
    echo [WARNING] Static files collection had warnings (non-critical)
) else (
    echo [OK] Static files collected
)
echo.

REM Final summary
echo =====================================================================
echo           Setup Completed Successfully!
echo =====================================================================
echo.
echo Test Admin Account Created:
echo   Username: admin
echo   Password: Admin@123456
echo.
echo Roles Created:
echo   1. Admin - Full system access
echo   2. Section Head - Document and section management
echo   3. Head QC - Quality control and approval
echo   4. Document Store - Storage and retrieval operations
echo.
echo [IMPORTANT] Change the admin password in production!
echo.
echo To start the development server:
echo   cd backend
echo   python manage.py runserver
echo.
echo =====================================================================
echo.
pause
