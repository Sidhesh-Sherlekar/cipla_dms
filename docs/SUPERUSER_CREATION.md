# Creating Superuser for Cipla DMS

## Issue
The custom User model requires a `role` field, so the standard `python manage.py createsuperuser` command fails with:
```
sqlite3.IntegrityError: NOT NULL constraint failed: users.role_id
```

## Solutions

### Solution 1: Quick Setup (Already Done!)
A superuser has been created with:
- **Username**: `admin`
- **Password**: `admin123456`
- **Email**: `admin@cipla.com`
- **Role**: Admin

**⚠️ IMPORTANT**: Change this password after first login!

### Solution 2: Create Another Superuser via Django Shell

```bash
cd backend
python manage.py shell
```

Then run:
```python
from apps.auth.models import User, Role

# Get or create Admin role
admin_role, _ = Role.objects.get_or_create(
    role_name='Admin',
    defaults={'description': 'System Administrator'}
)

# Create superuser
user = User.objects.create_superuser(
    username='your_username',
    email='your_email@cipla.com',
    password='your_secure_password',
    full_name='Your Full Name',
    role=admin_role,
    status='Active'
)

print(f"Superuser {user.username} created!")
```

### Solution 3: Using the Helper Script

```bash
./create_superuser.sh
```

This will:
1. Initialize all required roles
2. Prompt for user details
3. Create the superuser

### Solution 4: Manual SQL (Not Recommended)

If you need to recover access:

```bash
cd backend
sqlite3 db.sqlite3
```

```sql
-- Check existing roles
SELECT * FROM roles;

-- Create user (replace values as needed)
-- Note: You'll need to manually hash the password
```

## Available Roles

The system has 4 predefined roles:

1. **Admin** - System Administrator with full access
2. **Section Head** - Can create storage, withdrawal, and destruction requests
3. **Head QC** - Can approve or reject requests
4. **Document Store** - Can allocate storage and issue/receive documents

## Accessing the Admin Panel

```bash
cd backend
python manage.py runserver
```

Visit: http://localhost:8000/admin

Login with:
- Username: `admin`
- Password: `admin123456`

## Testing the Setup

```bash
# Verify roles exist
cd backend
python manage.py shell -c "from apps.auth.models import Role; print(Role.objects.all())"

# Verify superuser exists
python manage.py shell -c "from apps.auth.models import User; print(User.objects.filter(is_superuser=True))"
```

## Changing Default Password

After logging in to admin panel:
1. Go to Users section
2. Click on your username
3. Click "change password form" link
4. Enter new password
5. Save

Or via shell:
```python
from apps.auth.models import User
user = User.objects.get(username='admin')
user.set_password('new_secure_password')
user.save()
```
