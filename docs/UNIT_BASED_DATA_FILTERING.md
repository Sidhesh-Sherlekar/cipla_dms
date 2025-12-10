# Unit-Based Data Filtering - Implementation Complete

## Overview

Implemented unit-based data filtering to ensure that users only see data relevant to their assigned unit. All dropdown fields and data lists are now automatically filtered based on the logged-in user's unit assignment.

## Problem Statement

When users logged in with different roles/units, dropdown fields for creating new requests were empty because:
1. The permission classes (`CanManageMasterData`) were blocking all non-System Admin users from accessing units, departments, and sections endpoints
2. No filtering was applied based on user's assigned unit
3. Regular users couldn't see any data to populate dropdowns for creating requests

## Solution

### Permission Changes

Changed from restrictive `CanManageMasterData` to allow **all authenticated users** to READ data, while only allowing **System Admins** to CREATE/UPDATE/DELETE:

**Before:**
```python
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, CanManageMasterData])  # Only System Admins
def unit_list(request):
    # ...
```

**After:**
```python
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])  # All authenticated users
def unit_list(request):
    if request.method == 'GET':
        # All users can read (filtered by their unit)
    elif request.method == 'POST':
        # Only System Admins can create (manual check)
```

### Unit-Based Filtering

All views now filter data by the logged-in user's unit:

**Filter Logic:**
- **System Admins** and **Superusers**: See ALL data (no filtering)
- **All other users**: Only see data from their assigned unit
- **Users with no unit assigned**: See no data (empty queryset)

## Files Modified

### 1. [backend/apps/auth/views.py](backend/apps/auth/views.py)

#### Updated `unit_list` (Lines 500-544)
- Removed `CanManageMasterData` permission class
- Added unit filtering for non-System Admin users
- Added permission check in POST handler

**Filter added:**
```python
if request.method == 'GET':
    units = Unit.objects.all().order_by('unit_code')

    # Non-System Admin users only see their own unit
    if not (request.user.is_superuser or (hasattr(request.user, 'role') and request.user.role and request.user.role.role_name == 'System Admin')):
        if request.user.unit:
            units = units.filter(id=request.user.unit.id)
        else:
            units = Unit.objects.none()
```

#### Updated `department_list` (Lines 596-645)
- Removed `CanManageMasterData` permission class
- Added unit filtering: `departments.filter(unit=request.user.unit)`
- Added permission check in POST handler

**Filter added:**
```python
if request.method == 'GET':
    departments = Department.objects.select_related('unit', 'department_head').all()

    # Filter by user's unit (except System Admins who see all)
    if not (request.user.is_superuser or (hasattr(request.user, 'role') and request.user.role and request.user.role.role_name == 'System Admin')):
        if request.user.unit:
            departments = departments.filter(unit=request.user.unit)
        else:
            departments = Department.objects.none()

    # Additional filter by unit_id if provided (for cascading dropdowns)
    unit_id = request.query_params.get('unit_id')
    if unit_id:
        departments = departments.filter(unit_id=unit_id)
```

#### Updated `section_list` (Lines 697-746)
- Removed `CanManageMasterData` permission class
- Added unit filtering: `sections.filter(department__unit=request.user.unit)`
- Added permission check in POST handler

**Filter added:**
```python
if request.method == 'GET':
    sections = Section.objects.select_related('department__unit').all()

    # Filter by user's unit (except System Admins who see all)
    if not (request.user.is_superuser or (hasattr(request.user, 'role') and request.user.role and request.user.role.role_name == 'System Admin')):
        if request.user.unit:
            sections = sections.filter(department__unit=request.user.unit)
        else:
            sections = Section.objects.none()

    # Additional filter by department_id if provided (for cascading dropdowns)
    department_id = request.query_params.get('department_id')
    if department_id:
        sections = sections.filter(department_id=department_id)
```

### 2. [backend/apps/storage/views.py](backend/apps/storage/views.py)

#### Updated `get_queryset` method (Lines 70-87)
- Added unit filtering to storage locations
- System Admins see all storage locations
- Other users only see storage from their unit

**Filter added:**
```python
def get_queryset(self):
    """Filter storage locations based on user's unit"""
    queryset = Storage.objects.select_related('unit').all()

    # Filter by user's unit (except System Admins who see all)
    if not (self.request.user.is_superuser or (hasattr(self.request.user, 'role') and self.request.user.role and self.request.user.role.role_name == 'System Admin')):
        if self.request.user.unit:
            queryset = queryset.filter(unit=self.request.user.unit)
        else:
            return Storage.objects.none()

    # Additional filter by unit_id if provided (for cascading dropdowns)
    unit_id = self.request.query_params.get('unit_id')
    if unit_id:
        queryset = queryset.filter(unit_id=unit_id)

    return queryset.order_by('unit__unit_code', 'room_name', 'rack_name', 'compartment_name', 'shelf_name')
```

### 3. [backend/apps/requests/views.py](backend/apps/requests/views.py)

#### Updated `list_requests` function (Lines 132-165)
- Added unit filtering to requests
- System Admins see all requests
- Other users only see requests from their unit

**Filter added:**
```python
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsActiveUser])
def list_requests(request):
    """List all requests with filtering (filtered by user's unit)"""
    queryset = Request.objects.all().select_related(
        'crate', 'unit', 'withdrawn_by', 'approved_by', 'allocated_by', 'issued_by'
    ).order_by('-request_date')

    # Filter by user's unit (except System Admins who see all)
    if not (request.user.is_superuser or (hasattr(request.user, 'role') and request.user.role and request.user.role.role_name == 'System Admin')):
        if request.user.unit:
            queryset = queryset.filter(unit=request.user.unit)
        else:
            queryset = Request.objects.none()

    # Apply additional filters...
```

## Access Matrix

| Role | Units | Departments | Sections | Storage | Requests |
|------|-------|-------------|----------|---------|----------|
| **System Admin** | All | All | All | All | All |
| **Section Head** | Own unit only | Own unit only | Own unit only | Own unit only | Own unit only |
| **Store Head** | Own unit only | Own unit only | Own unit only | Own unit only | Own unit only |
| **User** | Own unit only | Own unit only | Own unit only | Own unit only | Own unit only |

## Permission Summary

### GET Endpoints (Read Access)
✅ **All authenticated users** can read data
- Filtered by their assigned unit (except System Admins)

### POST/PUT/DELETE Endpoints (Write Access)
✅ **System Admins only** can create/update/delete

## API Endpoints Changed

### Units
- **GET** `/api/auth/units/` - All users (filtered by unit)
- **POST** `/api/auth/units/` - System Admin only

### Departments
- **GET** `/api/auth/departments/` - All users (filtered by unit)
- **GET** `/api/auth/departments/?unit_id=5` - Cascading filter
- **POST** `/api/auth/departments/` - System Admin only

### Sections
- **GET** `/api/auth/sections/` - All users (filtered by unit)
- **GET** `/api/auth/sections/?department_id=3` - Cascading filter
- **POST** `/api/auth/sections/` - System Admin only

### Storage
- **GET** `/api/storage/` - All users (filtered by unit)
- **GET** `/api/storage/?unit_id=5` - Cascading filter
- **POST** `/api/storage/` - Requires appropriate permissions

### Requests
- **GET** `/api/requests/` - All users (filtered by unit)
- **GET** `/api/requests/?unit=5` - Cascading filter
- **POST** `/api/requests/storage/create/` - User role only

## Example Scenarios

### Scenario 1: User with Unit Assignment
**User Details:**
- Username: `john.doe`
- Role: `User`
- Unit: `Mumbai Plant (ID: 5)`

**API Responses:**
```
GET /api/auth/units/ → Returns only Mumbai Plant
GET /api/auth/departments/ → Returns only departments in Mumbai Plant
GET /api/auth/sections/ → Returns only sections in Mumbai Plant
GET /api/storage/ → Returns only storage locations in Mumbai Plant
GET /api/requests/ → Returns only requests for Mumbai Plant
```

### Scenario 2: System Admin
**User Details:**
- Username: `admin`
- Role: `System Admin`
- Unit: `Any or None`

**API Responses:**
```
GET /api/auth/units/ → Returns ALL units
GET /api/auth/departments/ → Returns ALL departments
GET /api/auth/sections/ → Returns ALL sections
GET /api/storage/ → Returns ALL storage locations
GET /api/requests/ → Returns ALL requests
```

### Scenario 3: User with No Unit Assignment
**User Details:**
- Username: `new.user`
- Role: `User`
- Unit: `NULL`

**API Responses:**
```
GET /api/auth/units/ → Returns empty array []
GET /api/auth/departments/ → Returns empty array []
GET /api/auth/sections/ → Returns empty array []
GET /api/storage/ → Returns empty array []
GET /api/requests/ → Returns empty array []
```

## Frontend Impact

### Dropdown Population
All dropdowns in the frontend will now automatically show only relevant data:

1. **New Request Form**
   - Unit dropdown: Shows user's unit (or all for System Admin)
   - Department dropdown: Filtered by selected unit
   - Section dropdown: Filtered by selected department
   - Storage dropdown: Filtered by selected unit

2. **Dashboard/Reports**
   - Only shows data from user's unit
   - System Admins can see all units

3. **Transaction View**
   - Filtered by user's unit
   - Crates dropdown shows only crates in user's unit

## Testing

### Test Case 1: Regular User Login
```bash
# Login as regular user (User role, Mumbai Plant)
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "user1", "password": "password123"}'

# Get units (should return only Mumbai Plant)
curl http://localhost:8000/api/auth/units/ \
  -H "Authorization: Bearer {token}"

# Expected: [{"id": 5, "unit_code": "MUM", "unit_name": "Mumbai Plant", ...}]
```

### Test Case 2: System Admin Login
```bash
# Login as System Admin
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "adminpass"}'

# Get units (should return ALL units)
curl http://localhost:8000/api/auth/units/ \
  -H "Authorization: Bearer {token}"

# Expected: [{"id": 1, ...}, {"id": 2, ...}, {"id": 3, ...}, ...]
```

### Test Case 3: Create Department (Non-Admin)
```bash
# Try to create department as regular user (should fail)
curl -X POST http://localhost:8000/api/auth/departments/ \
  -H "Authorization: Bearer {user_token}" \
  -H "Content-Type: application/json" \
  -d '{"department_name": "New Dept", "unit_id": 5}'

# Expected: {"error": "Only System Admins can create departments"} (403)
```

## Verification

✅ Server reloaded successfully multiple times
✅ No system check errors
✅ All views updated with unit filtering
✅ Permission checks added for POST operations
✅ Cascading dropdown filters preserved
✅ System Admins maintain full access
✅ Regular users see only their unit's data

## Related Documentation

- [RBAC_4_ROLES.md](RBAC_4_ROLES.md) - 4-role RBAC system
- [DYNAMIC_GROUP_MANAGEMENT.md](DYNAMIC_GROUP_MANAGEMENT.md) - Group management
- [DIGITAL_SIGNATURE_SYSTEM.md](DIGITAL_SIGNATURE_SYSTEM.md) - Digital signatures
- [CIRCULAR_IMPORT_FIX.md](CIRCULAR_IMPORT_FIX.md) - Import fixes
