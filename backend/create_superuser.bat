@echo off
REM ===========================================================
REM  Helper Script: Create Superuser for Cipla DMS (Windows)
REM ===========================================================

echo ================================================
echo   Creating superuser for Cipla Document Management System
echo ================================================
echo.

REM Change directory to backend
cd backend

echo Step 1: Initializing roles...
echo.

REM Write temporary Python script for roles
(
    echo from apps.auth.models import Role
    echo
    echo roles_data = [
    echo     ('Admin', 'System Administrator with full access to all features'),
    echo     ('Section Head', 'Can create storage, withdrawal, and destruction requests'),
    echo     ('Head QC', 'Can approve or reject requests'),
    echo     ('Document Store', 'Can allocate storage and issue/receive documents'),
    echo ]
    echo
    echo for role_name, description in roles_data:
    echo     role, created = Role.objects.get_or_create(
    echo         role_name=role_name,
    echo         defaults={'description': description}
    echo     )
    echo     if created:
    echo         print(f"✓ Created role: {role_name}")
) > init_roles.py

python manage.py shell < init_roles.py
del init_roles.py

echo.
echo Step 2: Creating superuser...
echo.

set /p username=Username [admin]: 
if "%username%"=="" set username=admin

set /p email=Email [admin@cipla.com]: 
if "%email%"=="" set email=admin@cipla.com

set /p fullname=Full Name [System Administrator]: 
if "%fullname%"=="" set fullname=System Administrator

REM Secure password input using PowerShell
powershell -Command ^
  "$p1 = Read-Host 'Password' -AsSecureString; " ^
  "$p2 = Read-Host 'Password (again)' -AsSecureString; " ^
  "if (([Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($p1))) -ne ([Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($p2)))) { Write-Host 'Error: Passwords do not match!'; exit 1 } else { $pass = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($p1)); Set-Content -Path tmp_pass.txt -Value $pass }"

if not exist tmp_pass.txt (
    echo Passwords did not match. Exiting...
    exit /b 1
)

set /p password=<tmp_pass.txt
del tmp_pass.txt

REM Write temporary Python for superuser creation
(
    echo from apps.auth.models import User, Role
    echo admin_role = Role.objects.get(role_name='Admin')
    echo username = '%username%'
    echo email = '%email%'
    echo password = '%password%'
    echo full_name = '%fullname%'
    echo
    echo if User.objects.filter(username=username).exists():
    echo     print(f"Error: User '{username}' already exists!")
    echo else:
    echo     user = User.objects.create_superuser(
    echo         username=username,
    echo         email=email,
    echo         password=password,
    echo         full_name=full_name,
    echo         role=admin_role,
    echo         status='Active'
    echo     )
    echo     print(f"\n✓ Superuser '{username}' created successfully!")
    echo     print(f"  Email: {email}")
    echo     print(f"  Role: Admin")
    echo     print(f"\nYou can now login at http://localhost:8000/admin")
) > create_superuser.py

python manage.py shell < create_superuser.py
del create_superuser.py

echo.
echo Done!
pause