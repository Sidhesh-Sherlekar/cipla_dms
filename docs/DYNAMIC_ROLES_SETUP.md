# Dynamic Roles Management System

## Overview

This document describes the dynamic roles management system implemented for the Cipla Document Management System. The system allows a System Admin to create, modify, and delete custom roles with specific permissions after deployment.

## Architecture

### Backend (Django)

1. **Django Groups** - Primary mechanism for role-based access control (RBAC)
2. **Role Model** - Legacy model maintained for backward compatibility
3. **Permissions** - Django's built-in permission system
4. **Utility Functions** - Helper functions in `role_utils.py` for role management

### Frontend (React/TypeScript)

1. **RoleManagement Component** - Full CRUD interface for roles
2. **Custom Hooks** - React Query hooks for API integration
3. **Master Component Integration** - Roles tab in the master data section

## Core Roles (Cannot be Deleted)

The system has 4 core roles that cannot be deleted or renamed:

1. **System Admin** - Full system access, manage users, roles, and master data
2. **Section Head** - Approve/reject document storage requests
3. **Store Head** - Manage document storage and crate allocation
4. **User** - Create document storage, withdrawal, and destruction requests

## Setup Instructions

### 1. Initial System Deployment

After deploying the application for the first time, run the initialization command to create the System Admin user:

```bash
cd backend
python manage.py init_system_admin
```

**Interactive Mode:**
The command will prompt you for:
- Username (default: systemadmin)
- Email (default: admin@cipla.com)
- Password (will prompt securely)
- Full Name (default: System Administrator)

**Non-Interactive Mode:**
```bash
python manage.py init_system_admin \
  --username admin \
  --email admin@example.com \
  --password "SecurePassword123!" \
  --full-name "System Administrator"
```

**Skip if Exists:**
```bash
python manage.py init_system_admin --skip-if-exists
```

### 2. What the Command Does

The initialization command performs the following:

1. **Creates 4 Core Django Groups:**
   - System Admin
   - Section Head
   - Store Head
   - User

2. **Creates Corresponding Role Entries** (for backward compatibility)

3. **Assigns Permissions:**
   - **System Admin**: All permissions for auth, documents, storage, requests, audit, reports
   - **Section Head**: View and change permissions for requests, view documents and audit logs
   - **Store Head**: Manage storage units, crates, view and change requests, view audit logs
   - **User**: Create and view requests, view documents

4. **Creates System Admin User:**
   - Username, email, full name as specified
   - Assigned to System Admin role/group
   - Marked as superuser and staff
   - Active status

### 3. Run Migrations

Make sure all migrations are applied:

```bash
python manage.py makemigrations
python manage.py migrate
```

## Using the Dynamic Roles System

### Backend API Endpoints

#### 1. List All Roles
```http
GET /api/auth/roles/
```

**Response:**
```json
{
  "count": 5,
  "results": [
    {
      "id": 1,
      "role_name": "System Admin",
      "description": "Full system access",
      "user_count": 2,
      "permission_count": 156,
      "is_core_role": true
    },
    {
      "id": 5,
      "role_name": "Quality Auditor",
      "description": "Can audit quality documents",
      "user_count": 3,
      "permission_count": 12,
      "is_core_role": false
    }
  ]
}
```

#### 2. Create New Role (System Admin Only)
```http
POST /api/auth/roles/
Content-Type: application/json

{
  "role_name": "Quality Auditor",
  "description": "Can audit quality documents",
  "permission_ids": [45, 46, 47, 89, 90]
}
```

#### 3. Get Role Details
```http
GET /api/auth/roles/{id}/
```

**Response:**
```json
{
  "id": 5,
  "role_name": "Quality Auditor",
  "description": "Can audit quality documents",
  "user_count": 3,
  "permission_count": 12,
  "is_core_role": false,
  "permission_ids": [45, 46, 47, 89, 90],
  "users": [
    {"id": 10, "username": "john", "full_name": "John Doe", "email": "john@example.com"},
    {"id": 11, "username": "jane", "full_name": "Jane Smith", "email": "jane@example.com"}
  ]
}
```

#### 4. Update Role (System Admin Only)
```http
PUT /api/auth/roles/{id}/
Content-Type: application/json

{
  "description": "Updated description",
  "permission_ids": [45, 46, 47, 89, 90, 91, 92]
}
```

**Note:** Core roles cannot be renamed, but their permissions can be modified.

#### 5. Delete Role (System Admin Only)
```http
DELETE /api/auth/roles/{id}/
```

**Restrictions:**
- Cannot delete core roles
- Cannot delete roles with active users (must reassign users first)

#### 6. List All Permissions
```http
GET /api/auth/permissions/
```

**Response:**
```json
{
  "count": 234,
  "results": [
    {
      "id": 1,
      "name": "Can add user",
      "codename": "add_user",
      "content_type": "auth"
    }
  ],
  "grouped": {
    "auth": [...],
    "documents": [...],
    "storage": [...]
  }
}
```

### Frontend Usage

#### 1. Access Role Management

As a System Admin:
1. Navigate to **Master Data** section
2. Click on the **Roles** tab
3. You'll see a list of all roles with their details

#### 2. Create a New Role

1. Click **Create Role** button
2. Enter role name and description
3. Search and select permissions:
   - Use the search box to filter permissions
   - Expand app sections to see available permissions
   - Check/uncheck individual permissions
   - Use the checkbox next to app name to select all permissions in that app
4. Click **Create Role**

#### 3. Edit a Role

1. Click the **Edit** button (pencil icon) on a role
2. Modify description and/or permissions
3. Core roles: Name is disabled but permissions can be changed
4. Click **Update Role**

#### 4. Delete a Custom Role

1. Click the **Delete** button (trash icon) on a custom role
2. Confirm deletion
3. Note: Button is disabled if role has active users

### Assigning Roles to Users

#### Via User Management Interface:
1. Go to **User Management**
2. Create or edit a user
3. Select the desired role from the dropdown
4. Save the user

#### Via API:
```http
POST /api/auth/users/
Content-Type: application/json

{
  "username": "newuser",
  "email": "user@example.com",
  "full_name": "New User",
  "role": "Quality Auditor",
  "password": "TempPassword123!"
}
```

## Backend Code Structure

### Key Files

1. **`apps/auth/management/commands/init_system_admin.py`**
   - Management command for initial system setup
   - Creates core roles and System Admin user

2. **`apps/auth/role_utils.py`**
   - Utility functions for role management
   - Functions: `is_system_admin()`, `has_role()`, `assign_role_to_user()`, etc.

3. **`apps/auth/permissions.py`**
   - Permission classes for API endpoints
   - Updated to use role utility functions

4. **`apps/auth/views.py`**
   - API endpoints: `role_list()`, `role_detail()`
   - CRUD operations for roles

5. **`apps/auth/urls.py`**
   - URL routing for role endpoints

6. **`apps/auth/serializers.py`**
   - Serializers for Role and Group models

### Database Models

#### Role Model (Legacy - for backward compatibility)
```python
class Role(models.Model):
    id = AutoField(primary_key=True)
    role_name = CharField(max_length=100, unique=True)
    description = TextField(blank=True)
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
```

#### Django Group (Primary RBAC mechanism)
- Built-in Django model
- Many-to-many relationship with User
- Many-to-many relationship with Permission

## Frontend Code Structure

### Key Files

1. **`frontend/src/components/RoleManagement.tsx`**
   - Complete role management UI
   - Create, read, update, delete roles
   - Permission selection interface

2. **`frontend/src/hooks/useRoles.ts`**
   - React Query hooks for role API
   - Hooks: `useRoles()`, `useCreateRole()`, `useUpdateRole()`, `useDeleteRole()`, `usePermissions()`

3. **`frontend/src/components/Master.tsx`**
   - Integration point for role management
   - Added "Roles" tab

## Security Considerations

1. **Role Creation** - Only System Admins can create/modify/delete roles
2. **Core Roles** - Protected from deletion and renaming
3. **User Assignment** - Roles with active users cannot be deleted
4. **Audit Trail** - All role operations are logged in audit trail
5. **Permission Validation** - Backend validates all permission assignments

## Testing Guide

### 1. Test System Initialization

```bash
# Test with default values
python manage.py init_system_admin

# Verify System Admin created
python manage.py shell
>>> from django.contrib.auth import get_user_model
>>> User = get_user_model()
>>> admin = User.objects.get(username='systemadmin')
>>> print(f"Admin: {admin.full_name}, Groups: {list(admin.groups.values_list('name', flat=True))}")
```

### 2. Test Role Creation (API)

```bash
# Login as System Admin
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "systemadmin", "password": "your_password"}'

# Create a custom role
curl -X POST http://localhost:8000/api/auth/roles/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "role_name": "Document Reviewer",
    "description": "Can review and comment on documents",
    "permission_ids": [45, 46, 47]
  }'
```

### 3. Test Permission Checks

```python
# In Django shell
from apps.auth.role_utils import has_role, is_system_admin
from django.contrib.auth import get_user_model

User = get_user_model()
user = User.objects.get(username='testuser')

# Check role
print(has_role(user, 'Quality Auditor'))  # True/False
print(is_system_admin(user))  # True/False

# Check permissions
print(user.has_perm('documents.add_documentstorage'))  # True/False
```

### 4. Test Frontend

1. Login as System Admin
2. Navigate to Master Data → Roles
3. Verify all 4 core roles are listed
4. Create a new custom role
5. Edit the custom role
6. Try to delete a core role (should be prevented)
7. Try to delete custom role with users (should be prevented)
8. Delete custom role without users (should succeed)

## Common Issues and Solutions

### Issue 1: "System Admin already exists"
**Solution:** Use `--skip-if-exists` flag or manually check/delete the existing user first.

### Issue 2: Cannot delete custom role
**Cause:** Role has active users assigned
**Solution:** Reassign users to another role first, then delete

### Issue 3: Core role accidentally deleted
**Solution:** Core roles are protected at API level. If database is corrupted, re-run `init_system_admin` command.

### Issue 4: Permissions not working after role creation
**Cause:** Permissions not properly assigned or user not added to group
**Solution:**
```python
# Verify user's groups and permissions
user = User.objects.get(username='username')
print(list(user.groups.values_list('name', flat=True)))
print(list(user.get_all_permissions()))
```

## Best Practices

1. **Always use init_system_admin** for first-time setup
2. **Never manually edit core roles** in the database
3. **Test custom roles** with a test user before production use
4. **Document custom roles** and their purpose in your organization
5. **Review permissions regularly** to ensure least privilege principle
6. **Backup database** before major role/permission changes
7. **Use audit trail** to track who created/modified roles

## Migration from Existing System

If you have existing users with the old Role model:

```python
# Migration script (run in Django shell)
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from apps.auth.models import Role

User = get_user_model()

for user in User.objects.all():
    if user.role:
        # Get or create corresponding group
        group, _ = Group.objects.get_or_create(name=user.role.role_name)
        # Add user to group
        user.groups.clear()
        user.groups.add(group)
        print(f"Migrated {user.username} to group {group.name}")
```

## Support and Troubleshooting

For issues or questions:
1. Check audit logs: `/api/audit/logs/`
2. Verify user permissions: `/api/auth/permissions/`
3. Check Django admin panel: `/admin/`
4. Review server logs for errors

## Summary

The dynamic roles system provides:
- ✅ Flexible role creation by System Admin
- ✅ Granular permission control
- ✅ Protected core roles
- ✅ Full audit trail
- ✅ User-friendly frontend interface
- ✅ Backward compatibility with existing Role model
- ✅ RESTful API for programmatic access

This system ensures that your organization can adapt roles to your specific needs without requiring code changes or redeployment.
