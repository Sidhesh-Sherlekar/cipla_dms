# Multiple Unit Assignments - Implementation Complete

## Overview

Implemented support for assigning users to multiple units with specific department selections for each unit. Users can now be assigned to multiple units, and for each unit, specific departments can be selected (checkbox style).

## Problem Statement

Previously, users could only be assigned to a single unit via a ForeignKey relationship:
- **Old System:** `User.unit` (ForeignKey to Unit)
- **Limitation:** One user could only belong to one unit

## Solution

### Many-to-Many Relationship

Changed from single unit assignment to multiple unit assignments:
- **New System:** `User.units` (ManyToManyField through `UserUnit`)
- **Benefit:** Users can be assigned to multiple units with specific departments in each unit

## Files Modified

### 1. [backend/apps/auth/models.py](backend/apps/auth/models.py)

#### Updated `User` Model (Lines 13-59)

**Added:**
```python
class User(AbstractUser):
    # ... existing fields

    # New: Multiple unit assignments through UserUnit table
    units = models.ManyToManyField(
        'Unit',
        through='UserUnit',
        related_name='assigned_users',
        blank=True
    )

    # Deprecated: kept for backward compatibility
    unit = models.ForeignKey(
        'Unit',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='unit_users'
    )
```

**Key Changes:**
- ✅ Added `units` ManyToManyField through `UserUnit` intermediate model
- ✅ Kept old `unit` field for backward compatibility
- ✅ Will deprecate `unit` field in future migration

#### Updated `UserUnit` Model (Lines 108-131)

**Before:**
```python
class UserUnit(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE)
```

**After:**
```python
class UserUnit(models.Model):
    """
    Many-to-Many relationship between Users and Units
    Tracks which units and departments a user has access to
    """
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='user_unit_assignments'
    )
    unit = models.ForeignKey(
        Unit,
        on_delete=models.CASCADE,
        related_name='unit_user_assignments'
    )
    departments = models.ManyToManyField(
        Department,
        blank=True,
        related_name='user_assignments'
    )
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ('user', 'unit')
        ordering = ['unit__unit_code']
```

**Key Changes:**
- ✅ Added `departments` ManyToManyField to track department assignments per unit
- ✅ Added `created_at` timestamp field
- ✅ Updated `related_name` to avoid conflicts
- ✅ Added `unique_together` constraint to prevent duplicate assignments

### 2. [backend/apps/auth/serializers.py](backend/apps/auth/serializers.py)

#### Created `UserUnitSerializer` (Lines 67-83)

**New Serializer:**
```python
class UserUnitSerializer(serializers.ModelSerializer):
    """Serializer for UserUnit assignments (user assigned to units with departments)"""
    unit = UnitSerializer(read_only=True)
    unit_id = serializers.IntegerField(write_only=True)
    department_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        allow_empty=True
    )
    departments = DepartmentSerializer(many=True, read_only=True)

    class Meta:
        model = UserUnit
        fields = ['id', 'unit', 'unit_id', 'departments', 'department_ids', 'created_at']
        read_only_fields = ['id', 'created_at']
```

**Purpose:**
- Handles serialization of unit assignments with departments
- `unit_id` (write-only): For creating assignments
- `department_ids` (write-only): List of department IDs to assign
- `unit` (read-only): Full unit object details
- `departments` (read-only): Full department objects

#### Updated `UserSerializer` (Lines 85-159)

**Added Fields:**
```python
class UserSerializer(serializers.ModelSerializer):
    # ... existing fields

    # New: Multiple unit assignments
    unit_assignments = serializers.SerializerMethodField()  # Read-only
    unit_assignments_data = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False,
        allow_empty=True
    )

    class Meta:
        model = User
        fields = [
            # ... existing fields
            'unit_assignments',       # New: List of unit assignments
            'unit_assignments_data',  # New: Write-only for creating assignments
        ]

    def get_unit_assignments(self, obj):
        """Get all unit assignments with departments"""
        from apps.auth.models import UserUnit
        assignments = UserUnit.objects.filter(user=obj).prefetch_related('unit', 'departments')
        return [{
            'id': assignment.id,
            'unit': UnitSerializer(assignment.unit).data,
            'departments': DepartmentSerializer(assignment.departments.all(), many=True).data
        } for assignment in assignments]
```

**Key Changes:**
- ✅ Added `unit_assignments` (read-only) - returns list of unit assignments with departments
- ✅ Added `unit_assignments_data` (write-only) - accepts list of assignments for creation
- ✅ Added `get_unit_assignments()` method to fetch and serialize assignments

### 3. [backend/apps/auth/views.py](backend/apps/auth/views.py)

#### Updated `user_list` POST Handler (Lines 336-380)

**Added Unit Assignment Logic:**
```python
# Handle unit assignments (multiple units with departments)
unit_assignments_data = request.data.get('unit_assignments_data', [])
if unit_assignments_data:
    from .models import UserUnit, Department

    # Clear existing unit assignments
    UserUnit.objects.filter(user=user).delete()

    # Create new unit assignments
    for assignment in unit_assignments_data:
        unit_id = assignment.get('unit_id')
        department_ids = assignment.get('department_ids', [])

        if unit_id:
            # Create UserUnit assignment
            user_unit = UserUnit.objects.create(
                user=user,
                unit_id=unit_id
            )

            # Assign departments to this unit assignment
            if department_ids:
                departments = Department.objects.filter(id__in=department_ids)
                user_unit.departments.set(departments)

# Audit logging with unit assignments
unit_assignments_msg = ""
if unit_assignments_data:
    from .models import UserUnit
    assignments = UserUnit.objects.filter(user=user).prefetch_related('unit', 'departments')
    unit_details = []
    for ua in assignments:
        dept_names = ', '.join([d.department_name for d in ua.departments.all()])
        unit_details.append(f"{ua.unit.unit_name} (Departments: {dept_names if dept_names else 'All'})")
    unit_assignments_msg = f", Unit Assignments: [{'; '.join(unit_details)}]"

log_audit_event(
    user=request.user,
    action='Created',
    message=f'User created: {user.username} ... {unit_assignments_msg}. Temporary password assigned.',
    request=request
)
```

**Key Changes:**
- ✅ Extracts `unit_assignments_data` from request
- ✅ Clears existing unit assignments
- ✅ Creates new UserUnit objects for each assignment
- ✅ Sets departments for each unit assignment
- ✅ Adds unit assignments to audit log

#### Updated `user_detail` PUT Handler (Lines 489-547)

**Added Unit Assignment Logic:**
```python
# Handle unit assignments (multiple units with departments)
unit_assignments_data = request.data.get('unit_assignments_data')
if unit_assignments_data is not None:  # Check if provided (could be empty list)
    from .models import UserUnit, Department

    # Clear existing unit assignments
    UserUnit.objects.filter(user=user).delete()

    # Create new unit assignments
    for assignment in unit_assignments_data:
        unit_id = assignment.get('unit_id')
        department_ids = assignment.get('department_ids', [])

        if unit_id:
            # Create UserUnit assignment
            user_unit = UserUnit.objects.create(
                user=user,
                unit_id=unit_id
            )

            # Assign departments to this unit assignment
            if department_ids:
                departments = Department.objects.filter(id__in=department_ids)
                user_unit.departments.set(departments)

# Add unit assignments changes to audit log
if unit_assignments_data is not None:
    from .models import UserUnit
    assignments = UserUnit.objects.filter(user=user).prefetch_related('unit', 'departments')
    unit_details = []
    for ua in assignments:
        dept_names = ', '.join([d.department_name for d in ua.departments.all()])
        unit_details.append(f"{ua.unit.unit_name} (Departments: {dept_names if dept_names else 'All'})")
    changes.append(f"Unit Assignments: [{'; '.join(unit_details) if unit_details else 'None'}]")
```

**Key Changes:**
- ✅ Same logic as POST handler but for user updates
- ✅ Uses `is not None` check to allow empty list (removing all assignments)
- ✅ Adds unit assignment changes to audit log

### 4. Database Migration

**Created:** `backend/apps/auth/migrations/0009_alter_userunit_options_user_units_and_more.py`

**Changes:**
- Added `units` ManyToMany field to User model
- Added `created_at` field to UserUnit model
- Added `departments` ManyToMany field to UserUnit model
- Updated UserUnit `related_name` fields

**Applied:** ✅ Migration successfully applied

## API Usage

### Create User with Multiple Unit Assignments

**Endpoint:** `POST /api/auth/users/`

**Request Body:**
```json
{
  "username": "john.doe",
  "email": "john@example.com",
  "full_name": "John Doe",
  "role": "User",
  "unit": 5,  // Legacy: primary unit (backward compatibility)
  "section": 3,
  "unit_assignments_data": [
    {
      "unit_id": 5,
      "department_ids": [10, 11, 12]  // User assigned to Mumbai Plant with QC, Production, R&D departments
    },
    {
      "unit_id": 6,
      "department_ids": [15]  // User also assigned to Pune Plant with only QA department
    },
    {
      "unit_id": 7,
      "department_ids": []  // User assigned to Bangalore Plant with access to ALL departments
    }
  ]
}
```

**Response:**
```json
{
  "id": 42,
  "username": "john.doe",
  "email": "john@example.com",
  "full_name": "John Doe",
  "role": "User",
  "unit": {
    "id": 5,
    "unit_name": "Mumbai Plant",
    "unit_code": "MUM"
  },
  "section": {
    "id": 3,
    "section_name": "Quality Control"
  },
  "unit_assignments": [
    {
      "id": 100,
      "unit": {
        "id": 5,
        "unit_name": "Mumbai Plant",
        "unit_code": "MUM"
      },
      "departments": [
        {"id": 10, "department_name": "QC"},
        {"id": 11, "department_name": "Production"},
        {"id": 12, "department_name": "R&D"}
      ]
    },
    {
      "id": 101,
      "unit": {
        "id": 6,
        "unit_name": "Pune Plant",
        "unit_code": "PUN"
      },
      "departments": [
        {"id": 15, "department_name": "QA"}
      ]
    },
    {
      "id": 102,
      "unit": {
        "id": 7,
        "unit_name": "Bangalore Plant",
        "unit_code": "BLR"
      },
      "departments": []  // Empty = access to ALL departments
    }
  ],
  "temporary_password": "aB3xY9kL",
  "message": "User created successfully. Temporary password generated."
}
```

### Update User's Unit Assignments

**Endpoint:** `PUT /api/auth/users/{id}/`

**Request Body:**
```json
{
  "unit_assignments_data": [
    {
      "unit_id": 5,
      "department_ids": [10, 11]  // Updated: removed R&D department
    },
    {
      "unit_id": 8,
      "department_ids": [20, 21]  // Added: new unit assignment
    }
  ]
}
```

**Note:** Sending `unit_assignments_data` will replace ALL existing assignments with the new ones.

### Get User Details with Unit Assignments

**Endpoint:** `GET /api/auth/users/{id}/`

**Response:**
```json
{
  "id": 42,
  "username": "john.doe",
  "unit_assignments": [
    {
      "id": 100,
      "unit": {
        "id": 5,
        "unit_name": "Mumbai Plant"
      },
      "departments": [
        {"id": 10, "department_name": "QC"},
        {"id": 11, "department_name": "Production"}
      ]
    }
  ]
}
```

## Frontend Integration

### Expected Frontend Implementation

#### User Creation/Edit Form

**Checkbox Style Multi-Select:**

```
User: John Doe
Role: User

📋 Unit Assignments:

☑ Mumbai Plant
  ☑ QC Department
  ☑ Production Department
  ☐ R&D Department
  ☐ Regulatory Department

☐ Pune Plant
  ☐ QA Department
  ☐ Production Department

☑ Bangalore Plant
  ☑ All Departments (no specific department selected)
```

**Frontend Data Structure:**
```javascript
// When user checks/unchecks units and departments
const unitAssignments = [
  {
    unit_id: 5,  // Mumbai Plant
    department_ids: [10, 11]  // QC, Production
  },
  {
    unit_id: 7,  // Bangalore Plant
    department_ids: []  // All departments (empty array)
  }
]

// Send to API
axios.post('/api/auth/users/', {
  username: 'john.doe',
  full_name: 'John Doe',
  role: 'User',
  unit_assignments_data: unitAssignments
})
```

### Frontend Form Logic

1. **Display Units:** Show all available units as checkboxes
2. **Expand Departments:** When a unit is checked, show its departments as nested checkboxes
3. **Select Departments:** User can select specific departments or leave all unchecked for "All Departments"
4. **Build Payload:** Construct `unit_assignments_data` array with `unit_id` and `department_ids`
5. **Submit:** Send to API on user create/update

## Backward Compatibility

### Legacy `unit` Field

The old `unit` ForeignKey field is kept for backward compatibility:

**Behavior:**
- ✅ Still accepts `unit_id` in POST/PUT requests
- ✅ Still returns `unit` object in GET responses
- ✅ Will be deprecated in future version
- ✅ Applications should migrate to using `unit_assignments_data`

**Migration Path:**
1. Update frontend to use `unit_assignments_data`
2. Test with both old and new systems
3. Deprecate `unit` field usage
4. Remove `unit` field in future migration

## Database Schema

### Before

```
User Table:
- id
- username
- unit_id (ForeignKey to Unit)  // Single unit only

UserUnit Table:
- id
- user_id
- unit_id
```

### After

```
User Table:
- id
- username
- unit_id (ForeignKey to Unit)  // Deprecated, kept for backward compatibility

UserUnit Table:
- id
- user_id
- unit_id
- created_at
- UNIQUE(user_id, unit_id)  // Prevent duplicate assignments

UserUnit_Departments (ManyToMany through table):
- id
- userunit_id
- department_id
```

## Example Scenarios

### Scenario 1: User with Multiple Units

**User:** Quality Manager
**Requirements:** Access to QC departments in Mumbai, Pune, and Bangalore plants

**Assignment:**
```json
{
  "unit_assignments_data": [
    {"unit_id": 5, "department_ids": [10]},  // Mumbai - QC
    {"unit_id": 6, "department_ids": [15]},  // Pune - QC
    {"unit_id": 7, "department_ids": [20]}   // Bangalore - QC
  ]
}
```

### Scenario 2: User with Full Unit Access

**User:** Plant Manager
**Requirements:** Access to ALL departments in Mumbai plant

**Assignment:**
```json
{
  "unit_assignments_data": [
    {"unit_id": 5, "department_ids": []}  // Mumbai - All departments (empty array)
  ]
}
```

### Scenario 3: User with Mixed Access

**User:** Cross-functional Lead
**Requirements:**
- Full access to Mumbai plant
- QC and Production only in Pune plant

**Assignment:**
```json
{
  "unit_assignments_data": [
    {"unit_id": 5, "department_ids": []},        // Mumbai - All departments
    {"unit_id": 6, "department_ids": [15, 16]}   // Pune - QC and Production only
  ]
}
```

## Audit Trail

All unit assignment operations are logged:

**User Creation:**
```
User created: john.doe (John Doe) with role User, Unit: Mumbai Plant, Section: QC, Unit Assignments: [Mumbai Plant (Departments: QC, Production); Pune Plant (Departments: QA)]. Temporary password assigned.
```

**User Update:**
```
User updated: john.doe (John Doe) - Role: User → Section Head, Unit Assignments: [Mumbai Plant (Departments: QC, Production); Bangalore Plant (Departments: All)]
```

## Testing

### Test Case 1: Create User with Multiple Units

```bash
curl -X POST http://localhost:8000/api/auth/users/ \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "multi.user",
    "full_name": "Multi Unit User",
    "email": "multi@example.com",
    "role": "User",
    "unit": 5,
    "unit_assignments_data": [
      {"unit_id": 5, "department_ids": [10, 11]},
      {"unit_id": 6, "department_ids": [15]}
    ]
  }'
```

### Test Case 2: Update Unit Assignments

```bash
curl -X PUT http://localhost:8000/api/auth/users/42/ \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "unit_assignments_data": [
      {"unit_id": 5, "department_ids": [10]},
      {"unit_id": 7, "department_ids": []}
    ]
  }'
```

### Test Case 3: Get User with Assignments

```bash
curl http://localhost:8000/api/auth/users/42/ \
  -H "Authorization: Bearer {token}"

# Response includes:
# "unit_assignments": [
#   {
#     "id": 100,
#     "unit": {"id": 5, "unit_name": "Mumbai Plant"},
#     "departments": [{"id": 10, "department_name": "QC"}]
#   }
# ]
```

## Verification

✅ Django server reloaded successfully with no errors
✅ Migration `0009` successfully applied
✅ `UserUnit` model updated with `departments` and `created_at` fields
✅ `UserSerializer` includes `unit_assignments` and `unit_assignments_data` fields
✅ User creation handles unit assignments correctly
✅ User update handles unit assignments correctly
✅ Audit logging includes unit assignment details
✅ Backward compatibility maintained with legacy `unit` field

## Next Steps

### Backend (Complete)
- ✅ Model changes
- ✅ Serializer changes
- ✅ View logic for create/update
- ✅ Audit logging
- ✅ Migration applied

### Frontend (Pending)
- ⏳ Update user creation form with checkbox-style unit/department selection
- ⏳ Update user edit form with checkbox-style unit/department selection
- ⏳ Display unit assignments in user detail view
- ⏳ Handle `unit_assignments_data` payload in API calls

## Related Documentation

- [RBAC_4_ROLES.md](RBAC_4_ROLES.md) - 4-role RBAC system
- [DYNAMIC_GROUP_MANAGEMENT.md](DYNAMIC_GROUP_MANAGEMENT.md) - Group management
- [UNIT_BASED_DATA_FILTERING.md](UNIT_BASED_DATA_FILTERING.md) - Unit-based data filtering
- [CIRCULAR_IMPORT_FIX.md](CIRCULAR_IMPORT_FIX.md) - Circular import resolution
