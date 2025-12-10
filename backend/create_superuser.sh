#!/bin/bash
# Helper script to create superuser for Cipla DMS

echo "Creating superuser for Cipla Document Management System"
echo "========================================================"
echo ""

# Navigate to backend directory
cd backend

# Initialize roles first
echo "Step 1: Initializing roles..."
python manage.py shell << 'PYTHON_SHELL'
from apps.auth.models import Role

roles_data = [
    ('Admin', 'System Administrator with full access to all features'),
    ('Section Head', 'Can create storage, withdrawal, and destruction requests'),
    ('Head QC', 'Can approve or reject requests'),
    ('Document Store', 'Can allocate storage and issue/receive documents'),
]

for role_name, description in roles_data:
    role, created = Role.objects.get_or_create(
        role_name=role_name,
        defaults={'description': description}
    )
    if created:
        print(f"✓ Created role: {role_name}")
PYTHON_SHELL

echo ""
echo "Step 2: Creating superuser..."
echo ""

# Get user input
read -p "Username [admin]: " username
username=${username:-admin}

read -p "Email [admin@cipla.com]: " email
email=${email:-admin@cipla.com}

read -p "Full Name [System Administrator]: " full_name
full_name=${full_name:-System Administrator}

# Get password securely
read -s -p "Password: " password
echo ""
read -s -p "Password (again): " password2
echo ""

if [ "$password" != "$password2" ]; then
    echo "Error: Passwords do not match!"
    exit 1
fi

# Create the superuser
python manage.py shell << PYTHON_SHELL
from apps.auth.models import User, Role

admin_role = Role.objects.get(role_name='Admin')
username = '${username}'
email = '${email}'
password = '${password}'
full_name = '${full_name}'

if User.objects.filter(username=username).exists():
    print(f"Error: User '{username}' already exists!")
else:
    user = User.objects.create_superuser(
        username=username,
        email=email,
        password=password,
        full_name=full_name,
        role=admin_role,
        status='Active'
    )
    print(f"\n✓ Superuser '{username}' created successfully!")
    print(f"  Email: {email}")
    print(f"  Role: Admin")
    print(f"\nYou can now login at http://localhost:8000/admin")
PYTHON_SHELL

echo ""
echo "Done!"
