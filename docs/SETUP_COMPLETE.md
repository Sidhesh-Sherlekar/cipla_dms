# Cipla Document Management System - Setup Complete

## Database Setup Status ✅

The database has been successfully set up according to the ER diagram with all models and relationships.

### Created Models:

#### Auth App (apps/auth/)
- **Role**: User roles (Section Head, Head QC, Document Store, Admin)
- **User**: Custom user model extending AbstractUser with 21 CFR Part 11 compliance
- **Unit**: Organizational units (facilities/plants)
- **Department**: Departments within units
- **Section**: Sections within departments
- **UserUnit**: Many-to-many relationship between users and units
- **DeptUser**: Many-to-many relationship between users and departments
- **SectionUser**: Many-to-many relationship between users and sections

#### Storage App (apps/storage/)
- **Storage**: Physical storage hierarchy (Unit → Room → Rack → Compartment → Shelf)

#### Documents App (apps/documents/)
- **Document**: Document metadata (name, number, type)
- **Crate**: Container for multiple documents with destruction date tracking
- **CrateDocument**: Junction table between crates and documents

#### Requests App (apps/requests/)
- **Request**: Storage/Withdrawal/Destruction workflow requests
- **RequestDocument**: Junction table for partial withdrawals
- **SendBack**: Return acknowledgements

#### Audit App (apps/audit/)
- **AuditTrail**: Immutable audit log for 21 CFR Part 11 compliance

## Database Schema
All models match the ER diagram provided, with proper relationships and indexes.

## Migrations Applied
All database migrations have been successfully created and applied to SQLite database.

## Next Steps

### 1. Create a Superuser
```bash
cd backend
python manage.py createsuperuser
```

### 2. Access Django Admin
```bash
python manage.py runserver
# Visit http://localhost:8000/admin
```

### 3. Install Required Packages
When ready to use full functionality, install:
```bash
pip install -r requirements.txt
```

Then uncomment in `config/settings.py`:
- `rest_framework_simplejwt`
- `django_filters`
- `whitenoise.middleware.WhiteNoiseMiddleware`

And in `config/urls.py`:
- JWT authentication endpoints

### 4. Switch to PostgreSQL (Production)
Create `.env` file:
```env
USE_POSTGRES=True
DB_NAME=cipla_dms
DB_USER=cipla_user
DB_PASSWORD=your_secure_password
DB_HOST=localhost
DB_PORT=5432
```

Then run:
```bash
python manage.py migrate
```

### 5. Create Audit Trail Trigger (PostgreSQL only)
When using PostgreSQL, run the migration to create immutability trigger:
```sql
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit trail records cannot be modified or deleted';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_trail_immutable
BEFORE UPDATE OR DELETE ON audit_trail
FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();
```

## File Structure
```
backend/
├── config/                 # Django settings
│   ├── settings.py        # Main settings (21 CFR Part 11 compliant)
│   ├── urls.py            # URL routing
│   ├── wsgi.py
│   └── asgi.py
├── apps/
│   ├── auth/              # User & organization models
│   ├── storage/           # Storage hierarchy
│   ├── documents/         # Documents & crates
│   ├── requests/          # Workflow requests
│   ├── audit/             # Audit trail
│   └── reports/           # Reporting (models to be added)
├── manage.py
├── requirements.txt       # All dependencies
├── .env.example           # Environment variables template
└── db.sqlite3             # SQLite database (dev)
```

## Security Features Configured
- ✅ Custom User model with role-based access
- ✅ Password validation (12+ characters)
- ✅ Session timeout (15 minutes)
- ✅ CSRF protection
- ✅ Secure headers configuration
- ✅ Audit trail with Django-level immutability
- ⏳ Database-level immutability trigger (pending PostgreSQL setup)
- ⏳ Digital signature decorator (to be implemented)
- ⏳ JWT authentication (pending package installation)

## Admin Interface
All models are registered in Django admin with:
- Read-only audit trail
- Search and filter capabilities
- Proper relationships displayed

## Compliance Status
- ✅ Database schema matches requirements
- ✅ Immutable audit trail model
- ✅ User role management
- ✅ Storage lifecycle tracking
- ⏳ Digital signatures (implementation pending)
- ⏳ Email notifications (Celery setup pending)
- ⏳ API endpoints (implementation pending)

## Testing the Setup
```bash
# Check for issues
python manage.py check

# Run development server
python manage.py runserver

# Create sample data via admin interface
# http://localhost:8000/admin
```

## Ready for Development
The database foundation is complete. Next phases:
1. API endpoints implementation
2. Digital signature decorator
3. Audit logging utilities
4. Celery task configuration
5. Frontend integration
