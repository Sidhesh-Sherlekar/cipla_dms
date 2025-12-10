# Quick Start Guide - Dynamic Roles

## Initial Setup (One-Time)

### 1. Run the Initialization Command

```bash
cd backend
python manage.py init_system_admin
```

Follow the prompts to create your System Admin account.

### 2. Login as System Admin

Use the credentials you just created to login to the application.

## Creating Custom Roles

### Via Frontend (Recommended)

1. **Login** as System Admin
2. Go to **Master Data** → **Roles** tab
3. Click **Create Role**
4. Fill in:
   - Role Name (e.g., "Quality Auditor")
   - Description (e.g., "Can audit quality documents")
   - Select Permissions from the list
5. Click **Create Role**

### Via API

```bash
# Get your access token first
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "systemadmin", "password": "YOUR_PASSWORD"}'

# Create role
curl -X POST http://localhost:8000/api/auth/roles/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "role_name": "Quality Auditor",
    "description": "Can audit quality documents",
    "permission_ids": [45, 46, 47]
  }'
```

## Assigning Roles to Users

### When Creating a New User

1. Go to **User Management**
2. Click **Create User**
3. Fill in user details
4. Select **Role** from dropdown (includes core + custom roles)
5. Click **Create**

### When Editing Existing User

1. Go to **User Management**
2. Click **Edit** on the user
3. Change the **Role** dropdown
4. Click **Update**

## Common Role Examples

### Example 1: Document Reviewer
**Purpose:** Can view and comment on documents but not create or delete

**Permissions:**
- `documents.view_documentstorage`
- `documents.view_documentmetadata`
- `audit.view_auditlog`

### Example 2: Quality Auditor
**Purpose:** Can audit quality-related documents and view audit trails

**Permissions:**
- `documents.view_documentstorage`
- `audit.view_auditlog`
- `requests.view_storagerequestheader`
- `requests.view_withdrawalrequestheader`
- `requests.view_destructionrequestheader`

### Example 3: Storage Manager
**Purpose:** Can manage storage locations but not approve requests

**Permissions:**
- `storage.add_storageunit`
- `storage.change_storageunit`
- `storage.view_storageunit`
- `storage.delete_storageunit`
- `storage.add_crate`
- `storage.change_crate`
- `storage.view_crate`

### Example 4: Read-Only Auditor
**Purpose:** Can view everything but cannot make any changes

**Permissions:**
- All `view_*` permissions across all apps

## Important Notes

### Core Roles (Cannot Delete)
- System Admin
- Section Head
- Store Head
- User

### Restrictions
- Only System Admin can create/edit/delete roles
- Core roles cannot be deleted or renamed
- Roles with active users cannot be deleted
- All role operations are logged in audit trail

## Troubleshooting

### Can't create role
**Check:** Are you logged in as System Admin?

### Can't delete role
**Check:** Does the role have active users? Reassign them first.

### Permissions not working
**Check:**
1. User is assigned to correct role
2. Role has required permissions
3. User has logged out and back in

## Quick Commands

```bash
# Initialize system
python manage.py init_system_admin

# Apply migrations
python manage.py makemigrations
python manage.py migrate

# Check user's permissions (Django shell)
python manage.py shell
>>> from django.contrib.auth import get_user_model
>>> User = get_user_model()
>>> user = User.objects.get(username='username')
>>> print(list(user.get_all_permissions()))

# Check user's groups
>>> print(list(user.groups.values_list('name', flat=True)))
```

## API Endpoints Quick Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/roles/` | List all roles |
| POST | `/api/auth/roles/` | Create role (System Admin only) |
| GET | `/api/auth/roles/{id}/` | Get role details |
| PUT | `/api/auth/roles/{id}/` | Update role (System Admin only) |
| DELETE | `/api/auth/roles/{id}/` | Delete role (System Admin only) |
| GET | `/api/auth/permissions/` | List all permissions |
| GET | `/api/auth/groups/` | List all groups (alternative) |

## Next Steps

1. ✅ Initialize system with `init_system_admin`
2. ✅ Login as System Admin
3. ✅ Create organizational units, departments, sections
4. ✅ Create custom roles as needed
5. ✅ Create users and assign roles
6. ✅ Test permissions with different role users

For detailed documentation, see [DYNAMIC_ROLES_SETUP.md](./DYNAMIC_ROLES_SETUP.md)
