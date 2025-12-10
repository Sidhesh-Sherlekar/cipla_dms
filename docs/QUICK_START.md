# Cipla DMS - Quick Start Guide

## ✅ Setup Complete!

Your Cipla Document Management System database is fully configured and ready to use.

## 🚀 Access the Admin Panel

### 1. Start the Development Server
```bash
cd backend
python manage.py runserver
```

### 2. Login Credentials
- **URL**: http://localhost:8000/admin
- **Username**: `admin`
- **Password**: `admin123456`

⚠️ **Change this password immediately after first login!**

## 📊 What's Available

### Models in Admin Panel
- **Users** - Manage system users
- **Roles** - 4 predefined roles (Admin, Section Head, Head QC, Document Store)
- **Units** - Organizational units/facilities
- **Departments** - Departments within units
- **Sections** - Sections within departments
- **Storage** - Physical storage locations (Room → Rack → Compartment → Shelf)
- **Documents** - Document metadata
- **Crates** - Document containers with destruction dates
- **Requests** - Storage/Withdrawal/Destruction workflows
- **Audit Trail** - Immutable activity log (read-only)

### System Roles
1. **Admin** - Full system access
2. **Section Head** - Create requests
3. **Head QC** - Approve/reject requests
4. **Document Store** - Allocate storage, issue documents

## 📝 Common Tasks

### Create Test Data

1. **Create a Unit**:
   - Go to Units → Add Unit
   - Enter unit code (e.g., "MFG-01") and name

2. **Create Storage Locations**:
   - Go to Storages → Add Storage
   - Select unit and enter: Room, Rack, Compartment, Shelf

3. **Create a Document**:
   - Go to Documents → Add Document
   - Enter document name and unique document number

4. **Create a Crate**:
   - Go to Crates → Add Crate
   - Select unit, set destruction date
   - Assign to storage location

5. **Link Documents to Crate**:
   - Go to Crate Documents → Add
   - Select crate and document

### Create Additional Users

**Option 1: Via Admin Panel**
1. Go to Users → Add User
2. Fill in username, password
3. **Important**: Select a Role (required!)
4. Add full name, email, status
5. Save

**Option 2: Via Shell Script**
```bash
./create_superuser.sh
```

**Option 3: Via Django Shell**
```bash
cd backend
python manage.py shell
```
```python
from apps.auth.models import User, Role

role = Role.objects.get(role_name='Section Head')
user = User.objects.create_user(
    username='testuser',
    email='test@cipla.com',
    password='password123',
    full_name='Test User',
    role=role,
    status='Active'
)
```

## 🔐 Security Features Active

- ✅ Custom user model with role-based access
- ✅ Password validation (12+ characters required)
- ✅ Session timeout (15 minutes)
- ✅ CSRF protection
- ✅ Secure headers
- ✅ Immutable audit trail (cannot be modified/deleted)

## 📁 Project Structure

```
backend/
├── config/              # Django configuration
│   ├── settings.py     # Main settings
│   └── urls.py         # URL routing
├── apps/
│   ├── auth/           # Users, roles, organization
│   ├── storage/        # Storage hierarchy
│   ├── documents/      # Documents & crates
│   ├── requests/       # Workflows
│   ├── audit/          # Audit trail
│   └── reports/        # Reporting
└── db.sqlite3          # Database
```

## 🛠️ Development Commands

```bash
# Check for issues
python manage.py check

# Create migrations (after model changes)
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Run development server
python manage.py runserver

# Open Django shell
python manage.py shell

# Create superuser (use helper script instead)
./create_superuser.sh
```

## 📖 Next Steps

1. **Change default password** in admin panel
2. **Create test data** for your workflows
3. **Install full dependencies**: `pip install -r requirements.txt`
4. **Implement API endpoints** (see agent.md)
5. **Set up PostgreSQL** for production (see .env.example)
6. **Configure Celery** for email notifications
7. **Implement digital signatures** for compliance

## 📚 Documentation

- [SETUP_COMPLETE.md](SETUP_COMPLETE.md) - Full setup documentation
- [SUPERUSER_CREATION.md](SUPERUSER_CREATION.md) - Superuser guide
- [agent.md](../agent.md) - Complete system specifications

## 🐛 Troubleshooting

### Can't create user: "role_id cannot be null"
Users require a role. Create roles first or use the helper script.

### Admin panel not accessible
Make sure server is running: `python manage.py runserver`

### Database errors
Delete db.sqlite3 and run `python manage.py migrate` again

### Import errors
Make sure you're in the backend directory

## ✨ You're All Set!

The database foundation is complete. You can now:
1. Access the admin panel at http://localhost:8000/admin
2. Create organizational structure (Units, Departments, Sections)
3. Set up storage locations
4. Create documents and crates
5. Test workflows

**Happy coding! 🚀**
