# Role-Based Access Control (RBAC) - 4 Roles System

## Overview

The Cipla Document Management System uses a 4-role RBAC system to ensure proper separation of duties and 21 CFR Part 11 compliance.

## The 4 Core Roles

### 1. System Admin
**Primary Responsibilities:**
- Setup and manage storage units, departments, and sections
- User management and role assignment
- System configuration
- View reports and audit trails

**Can:**
- ✅ Create, edit, delete units, departments, sections
- ✅ Create, edit, activate/deactivate users
- ✅ Assign roles to users
- ✅ Reset user passwords
- ✅ View all reports and audit trails (system-wide)
- ✅ Manage storage locations
- ✅ View dashboard (all units)

**Cannot:**
- ❌ Create requests
- ❌ Approve or reject requests
- ❌ Allocate storage to crates
- ❌ Execute any document-related operations

**Data Scope:** All units (system-wide)

---

### 2. Section Head
**Primary Responsibilities:**
- Approve or reject document requests
- Send back requests for revision
- Apply digital signatures for approvals

**Can:**
- ✅ Approve storage requests
- ✅ Approve withdrawal requests
- ✅ Approve destruction requests
- ✅ Reject requests with reason
- ✅ Apply digital signatures (password verification)
- ✅ View requests (own unit only)
- ✅ View audit trails (own unit only)
- ✅ View reports (own unit only)
- ✅ View dashboard (own unit only)

**Cannot:**
- ❌ Create requests
- ❌ Allocate storage
- ❌ Manage users
- ❌ Manage master data

**Data Scope:** Own unit only

---

### 3. Store Head
**Primary Responsibilities:**
- Allocate crate storage locations
- Reallocate crates
- Issue and return documents
- Manage physical document storage

**Can:**
- ✅ Allocate storage to approved requests
- ✅ Reallocate crates to different storage locations
- ✅ Issue documents for withdrawal
- ✅ Return documents after withdrawal
- ✅ Confirm document destruction
- ✅ View and manage storage locations
- ✅ Use barcode scanner
- ✅ View requests (own unit only)
- ✅ View crates (own unit only)
- ✅ View reports (own unit only)

**Cannot:**
- ❌ Create requests
- ❌ Approve or reject requests
- ❌ Manage users
- ❌ Manage master data (units, departments, sections)

**Data Scope:** Own unit only

---

### 4. User
**Primary Responsibilities:**
- Create document-related requests
- View own requests and crates
- Use barcode scanner

**Can:**
- ✅ Create storage requests
- ✅ Create withdrawal requests
- ✅ Create destruction requests
- ✅ View own requests
- ✅ View own crates
- ✅ Use barcode scanner
- ✅ View dashboard (own unit only)
- ✅ View reports (own unit only)

**Cannot:**
- ❌ Approve or reject requests
- ❌ Allocate storage
- ❌ Manage users
- ❌ Manage master data

**Data Scope:** Own unit only

---

## Access Control Matrix

| Feature | System Admin | Section Head | Store Head | User |
|---------|-------------|--------------|------------|------|
| **User Management** | ✅ Full | ❌ | ❌ | ❌ |
| **Master Data (Units/Depts/Sections)** | ✅ Full | ❌ | ❌ | ❌ |
| **Storage Location Management** | ✅ Full | ❌ | ✅ View | ❌ |
| **Create Requests** | ❌ | ❌ | ❌ | ✅ |
| **Approve/Reject Requests** | ❌ | ✅ | ❌ | ❌ |
| **Allocate Storage** | ❌ | ❌ | ✅ | ❌ |
| **Issue/Return Documents** | ❌ | ❌ | ✅ | ❌ |
| **Relocate Crates** | ❌ | ❌ | ✅ | ❌ |
| **Digital Signature** | ❌ | ✅ | ❌ | ❌ |
| **Barcode Scanner** | ❌ | ❌ | ✅ | ✅ |
| **View Dashboard** | ✅ All Units | ✅ Own Unit | ✅ Own Unit | ✅ Own Unit |
| **View Reports** | ✅ All Units | ✅ Own Unit | ✅ Own Unit | ✅ Own Unit |
| **View Audit Trails** | ✅ All Units | ✅ Own Unit | ✅ Own Unit | ✅ Own Unit |
| **Export Reports** | ✅ | ❌ | ❌ | ❌ |

---

## Workflow Example

### Document Storage Request Workflow

1. **User** (e.g., Lab Technician) creates a storage request
   - Fills in document details, department, section
   - System generates request with "Pending" status

2. **Section Head** (e.g., Department Head) reviews and approves
   - Reviews request details
   - Re-enters password for digital signature
   - Approves or rejects with reason
   - System updates request to "Approved" status

3. **Store Head** (e.g., Archive Manager) allocates storage
   - Views approved requests
   - Selects appropriate storage location (Unit/Room/Rack/Compartment/Shelf)
   - Allocates crate to storage
   - System updates request to "In Storage" status
   - Barcode can be generated for crate

---

## Backend Implementation

### Permission Classes

Location: `backend/apps/auth/permissions.py`

**Role-Specific Classes:**
- `IsSystemAdmin` - System Admin role check
- `IsSectionHead` - Section Head role check
- `IsStoreHead` - Store Head role check
- `IsUser` - User role check

**Action-Specific Classes:**
- `CanManageUsers` - User management (System Admin only)
- `CanManageMasterData` - Master data management (System Admin only)
- `CanCreateRequests` - Create requests (User only)
- `CanApproveRequests` - Approve/reject requests (Section Head only)
- `CanAllocateStorage` - Allocate storage (Store Head only)

### Applied Permissions

**User Management:**
```python
@permission_classes([IsAuthenticated, CanManageUsers])
def user_list(request):  # System Admin only
```

**Master Data:**
```python
@permission_classes([IsAuthenticated, CanManageMasterData])
def unit_list(request):  # System Admin only
```

**Request Creation:**
```python
@permission_classes([IsAuthenticated, CanCreateRequests, IsActiveUser])
@require_digital_signature
def create_storage_request(request):  # User only
```

**Request Approval:**
```python
@permission_classes([IsAuthenticated, CanApproveRequests, IsActiveUser])
@require_digital_signature
def approve_request(request, pk):  # Section Head only
```

**Storage Allocation:**
```python
@permission_classes([IsAuthenticated, CanAllocateStorage, IsActiveUser])
def allocate_storage(request, pk):  # Store Head only
```

---

## Frontend Implementation

### Permission Hook

Location: `frontend/src/hooks/usePermissions.ts`

**Usage:**
```typescript
import { usePermissions } from '../hooks/usePermissions';

function MyComponent() {
  const permissions = usePermissions();

  // Check specific permissions
  if (permissions.canManageUsers) {
    // Show user management UI
  }

  if (permissions.canApproveRequests) {
    // Show approve button
  }

  if (permissions.canAllocateStorage) {
    // Show allocate storage UI
  }
}
```

**Available Permission Flags:**
- `canManageUsers` - User management
- `canManageMasterData` - Master data management
- `canCreateStorageRequest` - Create storage request
- `canApproveRequests` - Approve requests
- `canAllocateStorage` - Allocate storage
- `canViewAllUnits` - View all units (System Admin only)
- `canViewOwnUnitOnly` - View only own unit

**Role Flags:**
- `isSystemAdmin` - Is System Admin
- `isSectionHead` - Is Section Head
- `isStoreHead` - Is Store Head
- `isUser` - Is User

---

## Migration from 5 Roles to 4 Roles

The system was migrated from the previous 5-role structure:

**Old Role Mapping:**
1. `System Administrator` → `System Admin`
2. `Head QC` → `Section Head` (they approved requests)
3. `Document Store` → `Store Head` (they allocated storage)
4. `Section Head` (old) → `User` (they created requests)
5. `Quality Assurance` → `User` (read-only role removed)

**Migration:** `backend/apps/auth/migrations/0008_update_to_four_roles.py`

---

## Security Features

1. **Permission Enforcement**: All permissions enforced at API level
2. **Frontend Restrictions**: UI elements hidden/disabled based on permissions
3. **Digital Signatures**: Required for critical operations (approve/reject)
4. **Audit Logging**: All actions logged with user, role, timestamp
5. **Role Segregation**: Clear separation of duties
   - Creator (User) ≠ Approver (Section Head) ≠ Executor (Store Head) ≠ Administrator (System Admin)
6. **Data Scoping**: Users see only their own unit's data (except System Admin)

---

## Testing RBAC

### Create Test Users

```bash
# System Admin
python manage.py shell -c "
from apps.auth.models import User, Role
role = Role.objects.get(role_name='System Admin')
user = User.objects.create_user(username='admin_test', email='admin@test.com', role=role)
user.set_password('Test@123')
user.save()
"

# Section Head
python manage.py shell -c "
from apps.auth.models import User, Role
role = Role.objects.get(role_name='Section Head')
user = User.objects.create_user(username='section_test', email='section@test.com', role=role)
user.set_password('Test@123')
user.save()
"

# Store Head
python manage.py shell -c "
from apps.auth.models import User, Role
role = Role.objects.get(role_name='Store Head')
user = User.objects.create_user(username='store_test', email='store@test.com', role=role)
user.set_password('Test@123')
user.save()
"

# User
python manage.py shell -c "
from apps.auth.models import User, Role
role = Role.objects.get(role_name='User')
user = User.objects.create_user(username='user_test', email='user@test.com', role=role)
user.set_password('Test@123')
user.save()
"
```

### Test Scenarios

1. **User** should be able to:
   - ✅ Create storage/withdrawal/destruction requests
   - ❌ Approve requests (403 Forbidden)
   - ❌ Allocate storage (403 Forbidden)
   - ❌ Manage users (403 Forbidden)

2. **Section Head** should be able to:
   - ✅ Approve requests
   - ✅ Reject requests
   - ✅ Apply digital signature
   - ❌ Create requests (403 Forbidden)
   - ❌ Allocate storage (403 Forbidden)
   - ❌ Manage users (403 Forbidden)

3. **Store Head** should be able to:
   - ✅ Allocate storage
   - ✅ Reallocate crates
   - ✅ Issue/return documents
   - ❌ Create requests (403 Forbidden)
   - ❌ Approve requests (403 Forbidden)
   - ❌ Manage users (403 Forbidden)

4. **System Admin** should be able to:
   - ✅ Manage users
   - ✅ Manage master data
   - ✅ View all reports (all units)
   - ❌ Create requests (403 Forbidden)
   - ❌ Approve requests (403 Forbidden)
   - ❌ Allocate storage (403 Forbidden)

---

## Compliance Notes

This 4-role RBAC system ensures:
- ✅ 21 CFR Part 11 compliance through role segregation
- ✅ Clear audit trail of all actions
- ✅ Prevention of unauthorized access
- ✅ Separation of duties: Creator ≠ Approver ≠ Executor ≠ Administrator
- ✅ Digital signature requirements for critical operations
- ✅ System administrator cannot manipulate document data
- ✅ No single user can complete an entire workflow alone

---

## Files Modified

### Backend
1. `backend/apps/auth/permissions.py` - Updated permission classes
2. `backend/apps/auth/migrations/0008_update_to_four_roles.py` - Migration script
3. `backend/apps/auth/views.py` - Permission classes applied to endpoints

### Frontend
1. `frontend/src/hooks/usePermissions.ts` - Updated permission hook

### Documentation
1. `RBAC_4_ROLES.md` - This file
2. `ROLE_BASED_ACCESS_CONTROL.md` - Previous 5-role documentation (archived)
