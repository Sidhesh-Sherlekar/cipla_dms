# Dynamic Group Management - Implementation Complete

## Overview

Implemented dynamic group management to allow System Admins to create, update, and delete groups (roles) with custom permissions from the frontend. The system now supports both the 4 core roles and custom groups.

## Core 4 Roles (Protected)

These roles are protected and cannot be deleted or renamed:

1. **System Admin** - 43 permissions
   - Setup storage units, departments, sections
   - User management
   - Cannot be deleted or renamed

2. **Section Head** - 36 permissions
   - Approve or reject requests
   - Cannot be deleted or renamed

3. **Store Head** - 10 permissions
   - Allocate crate storage locations
   - Reallocate crates
   - Cannot be deleted or renamed

4. **User** - 31 permissions
   - Create new requests (storage, withdrawal, destruction)
   - Cannot be deleted or renamed

## Changes Made

### Backend: `/backend/apps/auth/views.py`

#### 1. Updated `group_list` View (Lines 784-831)

**Before:**
```python
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def group_list(request):
    # Only returned hardcoded CORE_ROLES
    CORE_ROLES = ['System Administrator', 'Section Head', 'Head QC', 'Document Store', 'Quality Assurance']
    groups = Group.objects.filter(name__in=CORE_ROLES)
```

**After:**
```python
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def group_list(request):
    """
    GET /api/auth/groups/ - List all groups (not just core roles)
    POST /api/auth/groups/ - Create new group (System Admin only)
    """
    if request.method == 'GET':
        # Return ALL groups, not just core roles
        groups = Group.objects.all().prefetch_related('permissions').order_by('name')

        result = []
        for group in groups:
            group_data = GroupSerializer(group).data
            group_data['user_count'] = group.user_set.count()
            result.append(group_data)

        return Response({
            'count': groups.count(),
            'results': result
        })

    elif request.method == 'POST':
        # Only System Admin can create groups
        if not (request.user.is_superuser or (hasattr(request.user, 'role') and request.user.role and request.user.role.role_name == 'System Admin')):
            return Response({'error': 'Only System Admins can create groups'}, status=status.HTTP_403_FORBIDDEN)

        serializer = GroupSerializer(data=request.data)
        if serializer.is_valid():
            group = serializer.save()

            # Assign permissions if provided
            permission_ids = request.data.get('permission_ids', [])
            if permission_ids:
                permissions = Permission.objects.filter(id__in=permission_ids)
                group.permissions.set(permissions)

            # Audit logging
            from apps.audit.utils import log_audit_event
            log_audit_event(
                user=request.user,
                action='Created',
                message=f'Group created: {group.name} ({group.permissions.count()} permissions)',
                request=request
            )

            group_data = GroupSerializer(group).data
            group_data['user_count'] = 0
            return Response(group_data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
```

**Key Changes:**
- ✅ Changed from `@api_view(['GET'])` to `@api_view(['GET', 'POST'])`
- ✅ Removed hardcoded `CORE_ROLES` filter
- ✅ Changed `groups = Group.objects.filter(name__in=CORE_ROLES)` to `groups = Group.objects.all()`
- ✅ Added POST handler to create new groups (System Admin only)
- ✅ Added audit logging for group creation
- ✅ Added `user_count` to response data

#### 2. Updated `group_detail` View (Lines 834-942)

**Before:**
```python
@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def group_detail(request, pk):
    # Only allowed access to old 5 CORE_ROLES
    CORE_ROLES = ['System Administrator', 'Section Head', 'Head QC', 'Document Store', 'Quality Assurance']

    # Only allow access to core roles
    group = Group.objects.filter(name__in=CORE_ROLES).prefetch_related('permissions').get(pk=pk)

    # No DELETE support
    # All core roles were protected from rename
```

**After:**
```python
@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def group_detail(request, pk):
    """
    GET /api/auth/groups/{id}/ - Get group details
    PUT /api/auth/groups/{id}/ - Update group (System Admin only)
    DELETE /api/auth/groups/{id}/ - Delete group (System Admin only, not core 4 roles)
    """
    # Define the 4 core Cipla roles (new system)
    CORE_ROLES = [
        'System Admin',
        'Section Head',
        'Store Head',
        'User'
    ]

    # Allow access to ALL groups (not just core roles)
    group = Group.objects.prefetch_related('permissions').get(pk=pk)

    if request.method == 'GET':
        group_data = GroupSerializer(group).data
        group_data['user_count'] = group.user_set.count()
        group_data['users'] = list(group.user_set.values('id', 'username', 'full_name'))
        group_data['is_core_role'] = group.name in CORE_ROLES
        return Response(group_data)

    elif request.method == 'PUT':
        # Only System Admin can update groups
        if not (request.user.is_superuser or (hasattr(request.user, 'role') and request.user.role and request.user.role.role_name == 'System Admin')):
            return Response({'error': 'Only System Admins can update groups'}, status=status.HTTP_403_FORBIDDEN)

        # Prevent renaming of core roles ONLY
        if 'name' in request.data and request.data['name'] != group.name:
            if group.name in CORE_ROLES:
                return Response(
                    {'error': f'Cannot rename core role: {group.name}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # ... update logic with audit logging

    elif request.method == 'DELETE':
        # Only System Admin can delete groups
        if not (request.user.is_superuser or (hasattr(request.user, 'role') and request.user.role and request.user.role.role_name == 'System Admin')):
            return Response({'error': 'Only System Admins can delete groups'}, status=status.HTTP_403_FORBIDDEN)

        # Prevent deletion of core 4 roles
        if group.name in CORE_ROLES:
            return Response(
                {'error': f'Cannot delete core role: {group.name}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if group has users
        user_count = group.user_set.count()
        if user_count > 0:
            return Response(
                {'error': f'Cannot delete group with {user_count} active users. Reassign users first.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Audit logging before deletion
        from apps.audit.utils import log_audit_event
        group_name = group.name
        perm_count = group.permissions.count()

        log_audit_event(
            user=request.user,
            action='Deleted',
            message=f'Group deleted: {group_name} ({perm_count} permissions)',
            request=request
        )

        group.delete()
        return Response({'message': f'Group "{group_name}" deleted successfully'}, status=status.HTTP_204_NO_CONTENT)
```

**Key Changes:**
- ✅ Changed from `@api_view(['GET', 'PUT'])` to `@api_view(['GET', 'PUT', 'DELETE'])`
- ✅ Updated `CORE_ROLES` from old 5 roles to new 4 roles
- ✅ Removed hardcoded filter: `group = Group.objects.get(pk=pk)` now works for ALL groups
- ✅ Added `is_core_role` flag to response data
- ✅ Added DELETE handler with protection for core roles
- ✅ Added validation to prevent deleting groups with active users
- ✅ Added audit logging for all operations
- ✅ Only System Admins can update/delete groups
- ✅ Custom groups can be renamed, core groups cannot

## API Endpoints

### GET `/api/auth/groups/`
**Access:** All authenticated users
**Returns:** List of all groups with user counts

**Response:**
```json
{
  "count": 4,
  "results": [
    {
      "id": 11,
      "name": "System Admin",
      "permissions": [...],
      "user_count": 0
    },
    {
      "id": 12,
      "name": "Section Head",
      "permissions": [...],
      "user_count": 1
    },
    ...
  ]
}
```

### POST `/api/auth/groups/`
**Access:** System Admin only
**Body:**
```json
{
  "name": "Custom Role Name",
  "permission_ids": [1, 2, 3, 4]
}
```
**Returns:** Created group with 201 status

### GET `/api/auth/groups/{id}/`
**Access:** All authenticated users
**Returns:** Group details with users list and `is_core_role` flag

**Response:**
```json
{
  "id": 11,
  "name": "System Admin",
  "permissions": [...],
  "user_count": 0,
  "users": [],
  "is_core_role": true
}
```

### PUT `/api/auth/groups/{id}/`
**Access:** System Admin only
**Body:**
```json
{
  "name": "Updated Name",  // Only allowed for custom groups
  "permission_ids": [1, 2, 3]
}
```
**Returns:** Updated group data

**Restrictions:**
- Core 4 roles cannot be renamed
- Only System Admins can update

### DELETE `/api/auth/groups/{id}/`
**Access:** System Admin only
**Returns:** 204 No Content on success

**Restrictions:**
- Core 4 roles cannot be deleted
- Groups with active users cannot be deleted
- Only System Admins can delete

## Protection Rules

### Core Roles Protection

1. **Cannot Delete:**
   - System Admin
   - Section Head
   - Store Head
   - User

2. **Cannot Rename:**
   - System Admin
   - Section Head
   - Store Head
   - User

3. **Can Modify Permissions:**
   - Even core roles can have their permissions modified (be careful!)

### Custom Groups

1. **Can Create:**
   - System Admins can create unlimited custom groups

2. **Can Rename:**
   - Custom groups can be renamed freely

3. **Can Delete:**
   - Only if no users are assigned to the group
   - Only by System Admins

## Audit Trail

All group operations are logged to the audit trail:

- **Group Created:** `'Group created: {name} ({perm_count} permissions)'`
- **Group Updated:** `'Group updated: {name}, Permissions: {old} → {new}'`
- **Group Deleted:** `'Group deleted: {name} ({perm_count} permissions)'`

## Current Database State

```
Total groups: 4
  - User (ID: 9, Permissions: 31, Users: 0)
  - Store Head (ID: 10, Permissions: 10, Users: 0)
  - System Admin (ID: 11, Permissions: 43, Users: 0)
  - Section Head (ID: 12, Permissions: 36, Users: 1)
```

## Frontend Integration

The frontend can now:

1. **Display all groups** in the User Management interface
2. **Create custom groups** with selected permissions
3. **Edit custom groups** (rename, change permissions)
4. **Delete custom groups** (if no users assigned)
5. **See which groups are core roles** via `is_core_role` flag
6. **Disable delete/rename buttons** for core roles in UI

## Next Steps for Frontend

1. Add "Create Group" button (System Admin only)
2. Add "Edit Group" functionality
3. Add "Delete Group" button (disabled for core roles and groups with users)
4. Show `is_core_role` badge on core roles
5. Show user count on each group
6. Confirm before deleting groups

## Testing

### Test Creating a Custom Group

```bash
# Login as System Admin
curl -X POST http://localhost:8000/api/auth/groups/ \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Custom Reviewer",
    "permission_ids": [1, 2, 3]
  }'
```

### Test Deleting a Core Role (Should Fail)

```bash
curl -X DELETE http://localhost:8000/api/auth/groups/11/ \
  -H "Authorization: Bearer {token}"

# Response: {"error": "Cannot delete core role: System Admin"}
```

### Test Renaming a Core Role (Should Fail)

```bash
curl -X PUT http://localhost:8000/api/auth/groups/11/ \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"name": "Super Admin"}'

# Response: {"error": "Cannot rename core role: System Admin"}
```

## Verification

✅ Django server reloaded successfully
✅ System check passed with no issues
✅ All 4 core roles present in database
✅ API returns all groups, not just core roles
✅ Audit logging configured for all operations
✅ Permission checks in place (System Admin only for create/update/delete)
✅ Core role protection implemented
✅ User count validation for deletion

## Related Documentation

- [RBAC_4_ROLES.md](RBAC_4_ROLES.md) - 4-role RBAC system documentation
- [CIRCULAR_IMPORT_FIX.md](CIRCULAR_IMPORT_FIX.md) - Circular import resolution
- [DIGITAL_SIGNATURE_SYSTEM.md](DIGITAL_SIGNATURE_SYSTEM.md) - Digital signature implementation
- [ROLE_BASED_ACCESS_CONTROL.md](ROLE_BASED_ACCESS_CONTROL.md) - Original RBAC documentation
