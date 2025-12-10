# Immediate Withdrawal Status Change Implementation

## Overview
Modified the withdrawal request workflow so that crate status changes to "Withdrawn" immediately when the withdrawal request is created, rather than waiting until the request is approved and issued.

## Status Change Timeline

### Before (Old Behavior)
```
1. Withdrawal request created → Crate status: Active
2. Request approved → Crate status: Active
3. Request issued → Crate status: Withdrawn ❌ (Too late!)
```

### After (New Behavior)
```
1. Withdrawal request created → Crate status: Withdrawn ✓ (Immediate!)
2. Request approved → Crate status: Withdrawn
3. Request issued → Crate status: Withdrawn
4. Request rejected → Crate status: Active (Restored)
```

## Implementation Details

### 1. Create Withdrawal Request - Immediate Status Change
**File**: `backend/apps/requests/views.py:327-393`

**Changes Made**:

#### Updated Validation
```python
# OLD: Only allowed Active crates
if crate.status != 'Active':
    return Response({'error': 'Crate is not active'}, ...)

# NEW: Allow Active or Archived crates
if crate.status not in ['Active', 'Archived']:
    return Response({
        'error': f'Crate cannot be withdrawn (current status: {crate.status}). '
                f'Only Active or Archived crates can be withdrawn.'
    }, status=status.HTTP_400_BAD_REQUEST)
```

#### Immediate Status Change
```python
with transaction.atomic():
    # Create withdrawal request
    withdrawal_request = Request.objects.create(
        request_type='Withdrawal',
        crate=crate,
        unit=unit,
        status='Pending',
        purpose=serializer.validated_data.get('purpose', ''),
        full_withdrawal=full_withdrawal,
        expected_return_date=expected_return_date
    )

    # SET CRATE STATUS TO WITHDRAWN IMMEDIATELY
    old_status = crate.status
    crate.status = 'Withdrawn'
    crate.save()

    # Log crate status change
    log_audit_event(
        user=request.user,
        action='Updated',
        message=f'Crate #{crate.id} status changed from {old_status} to Withdrawn '
                f'due to withdrawal request #{withdrawal_request.id}',
        model_name='Crate',
        model_id=crate.id,
        unit=unit
    )
```

**Response Updated**:
```python
return Response({
    'message': 'Withdrawal request created successfully. Crate is now marked as Withdrawn.',
    'request_id': withdrawal_request.id,
    'crate_status': crate.status  # Returns "Withdrawn"
}, status=status.HTTP_201_CREATED)
```

### 2. Reject Request - Status Restoration
**File**: `backend/apps/requests/views.py:191-239`

**Added Logic**:
```python
@api_view(['POST'])
@permission_classes([IsAuthenticated, CanApproveRequests, IsActiveUser])
@require_digital_signature
def reject_request(request, pk):
    # ... existing rejection logic ...

    # NEW: If this is a withdrawal request, restore crate status to Active
    if request_obj.request_type == 'Withdrawal' and request_obj.crate.status == 'Withdrawn':
        request_obj.crate.status = 'Active'
        request_obj.crate.save()

        log_audit_event(
            user=request.user,
            action='Updated',
            message=f'Crate #{request_obj.crate.id} status restored to Active '
                    f'after withdrawal request #{request_obj.id} was rejected',
            model_name='Crate',
            model_id=request_obj.crate.id,
            unit=request_obj.unit
        )

    return Response({
        'message': f'{request_obj.request_type} request rejected',
        'request_id': request_obj.id,
        'status': request_obj.status,
        'crate_status': request_obj.crate.status if request_obj.request_type == 'Withdrawal' else None
    }, status=status.HTTP_200_OK)
```

### 3. In Storage Endpoint - Include Archived Crates
**File**: `backend/apps/documents/views.py:221-244`

**Change**:
```python
@action(detail=False, methods=['get'])
def in_storage(self, request):
    """
    Get all Active or Archived crates that are currently in storage
    Excludes Withdrawn and Destroyed crates

    Used for:
    - Withdrawal request crate selection (shows Active/Archived crates)
    - Storage location allocation (shows available crates)
    """
    # OLD: status='Active'
    # NEW: status__in=['Active', 'Archived']
    crates = self.get_queryset().filter(
        status__in=['Active', 'Archived'],
        storage__isnull=False
    )

    # Apply unit-based filtering
    user = request.user
    user_units = UserUnit.objects.filter(user=user).values_list('unit_id', flat=True)

    if user_units:
        crates = crates.filter(unit_id__in=user_units)

    serializer = self.get_serializer(crates, many=True)
    return Response(serializer.data)
```

## Workflow Examples

### Example 1: Successful Withdrawal
```
Step 1: Section Head creates withdrawal request for Crate #123 (Active)
        → Request created with status: Pending
        → Crate status immediately changed: Active → Withdrawn
        → Audit log: "Crate #123 status changed from Active to Withdrawn..."

Step 2: Head QC approves request
        → Request status: Approved
        → Crate status: Withdrawn (unchanged)

Step 3: Store Head issues documents
        → Request status: Issued
        → Crate status: Withdrawn (unchanged)

Step 4: Documents returned
        → Request status: Returned
        → Crate status: Active (with storage location assigned)
```

### Example 2: Rejected Withdrawal
```
Step 1: Section Head creates withdrawal request for Crate #456 (Active)
        → Request created with status: Pending
        → Crate status immediately changed: Active → Withdrawn
        → Audit log: "Crate #456 status changed from Active to Withdrawn..."

Step 2: Head QC rejects request
        → Request status: Rejected
        → Crate status immediately restored: Withdrawn → Active
        → Audit log: "Crate #456 status restored to Active after rejection..."
```

### Example 3: Archived Crate Withdrawal
```
Step 1: Section Head creates withdrawal request for Crate #789 (Archived)
        → Request created with status: Pending
        → Crate status changed: Archived → Withdrawn
        → Audit log: "Crate #789 status changed from Archived to Withdrawn..."

Step 2: Head QC approves and Store Head issues
        → Request status: Issued
        → Crate status: Withdrawn

Step 3: Documents returned
        → Request status: Returned
        → Crate status: Active (with storage location assigned)
```

## Validation Rules

### Crate Selection for Withdrawal Requests
**Allowed Statuses**: Active, Archived
**Excluded Statuses**: Withdrawn, Destroyed

```python
# Validation in create_withdrawal_request
if crate.status not in ['Active', 'Archived']:
    return Response({
        'error': f'Crate cannot be withdrawn (current status: {crate.status}). '
                f'Only Active or Archived crates can be withdrawn.'
    }, status=status.HTTP_400_BAD_REQUEST)
```

### in_storage Endpoint Filter
```python
# Returns crates with status Active or Archived that have storage locations
crates = Crate.objects.filter(
    status__in=['Active', 'Archived'],
    storage__isnull=False
)
```

## Benefits

### 1. Prevents Double Withdrawals
- Once a withdrawal request is created, crate is marked as Withdrawn
- Other users cannot create duplicate withdrawal requests for the same crate
- in_storage endpoint excludes Withdrawn crates from dropdown

### 2. Accurate Inventory Status
- Crate status reflects reality immediately
- No delay between request creation and status update
- Clear audit trail of status changes

### 3. Proper Status Restoration
- Rejected requests automatically restore crate to Active status
- Prevents "stuck" Withdrawn crates when requests are rejected
- Maintains data integrity

### 4. Support for Archived Crates
- Allows withdrawal of archived documents when needed
- Archived crates visible in dropdown alongside Active crates
- Status transitions properly from Archived → Withdrawn → Active

## Audit Trail

All status changes are logged in the audit trail:

### Withdrawal Request Created
```
Action: Updated
Message: Crate #123 status changed from Active to Withdrawn due to withdrawal request #456
Model: Crate
Model ID: 123
Unit: MUM-01
User: section_head@example.com
```

### Withdrawal Request Rejected
```
Action: Updated
Message: Crate #123 status restored to Active after withdrawal request #456 was rejected
Model: Crate
Model ID: 123
Unit: MUM-01
User: head_qc@example.com
```

## API Changes

### Create Withdrawal Request
**Endpoint**: `POST /api/requests/withdrawal/create/`

**Response Updated**:
```json
{
  "message": "Withdrawal request created successfully. Crate is now marked as Withdrawn.",
  "request_id": 123,
  "crate_status": "Withdrawn"
}
```

### Reject Request
**Endpoint**: `POST /api/requests/{pk}/reject/`

**Response Updated** (for withdrawal requests):
```json
{
  "message": "Withdrawal request rejected",
  "request_id": 123,
  "status": "Rejected",
  "crate_status": "Active"
}
```

### In Storage Endpoint
**Endpoint**: `GET /api/crates/in_storage/`

**Response**: Now includes both Active and Archived crates
```json
[
  {
    "id": 123,
    "status": "Active",
    "storage": {...},
    ...
  },
  {
    "id": 456,
    "status": "Archived",
    "storage": {...},
    ...
  }
]
```

## Database Impact

### Request Table
No changes to schema. Only workflow logic updated.

### Crate Table
No changes to schema. Status values already supported:
- Active
- Archived
- Withdrawn
- Destroyed

### Audit Trail Table
Additional audit entries created for:
- Crate status change when withdrawal request created
- Crate status restoration when withdrawal request rejected

## Testing

### Test Scenario 1: Create Withdrawal Request
```bash
# 1. Get an active crate
GET /api/crates/in_storage/
# Returns crates with status Active or Archived

# 2. Create withdrawal request
POST /api/requests/withdrawal/create/
{
  "crate": 123,
  "unit": 1,
  "full_withdrawal": true,
  "purpose": "Review documents",
  "expected_return_date": "2025-12-31T00:00:00Z"
}

# 3. Verify crate status changed to Withdrawn
GET /api/crates/123/
# Response: { "id": 123, "status": "Withdrawn", ... }

# 4. Verify crate no longer appears in in_storage
GET /api/crates/in_storage/
# Crate #123 should not be in the list
```

### Test Scenario 2: Reject Withdrawal Request
```bash
# 1. Create withdrawal request (crate becomes Withdrawn)
POST /api/requests/withdrawal/create/
{
  "crate": 123,
  "unit": 1,
  "full_withdrawal": true
}

# 2. Reject the request
POST /api/requests/{request_id}/reject/
{
  "reason": "Documents not ready for withdrawal",
  "digital_signature": "password"
}

# 3. Verify crate status restored to Active
GET /api/crates/123/
# Response: { "id": 123, "status": "Active", ... }

# 4. Verify crate appears in in_storage again
GET /api/crates/in_storage/
# Crate #123 should be in the list
```

### Test Scenario 3: Archived Crate Withdrawal
```bash
# 1. Get archived crate from in_storage
GET /api/crates/in_storage/
# Should include crates with status "Archived"

# 2. Create withdrawal request for archived crate
POST /api/requests/withdrawal/create/
{
  "crate": 456,
  "unit": 1,
  "full_withdrawal": true
}

# 3. Verify crate status changed to Withdrawn
GET /api/crates/456/
# Response: { "id": 456, "status": "Withdrawn", ... }
```

## Status: ✓ COMPLETE

**Changes Made**:
- ✓ Modified create_withdrawal_request to immediately set crate status to Withdrawn
- ✓ Updated validation to accept Active or Archived crates
- ✓ Added crate status restoration when withdrawal request is rejected
- ✓ Updated in_storage endpoint to filter for Active and Archived crates
- ✓ Added audit logging for all status changes
- ✓ Updated API response messages to indicate new behavior
- ✓ Verified implementation with `python manage.py check`
- ✓ Created comprehensive documentation
- ✓ **CRITICAL FIX**: Fixed transaction.atomic() block - moved return statement outside the transaction block so changes commit properly to database
- ✓ Tested and verified crate status correctly saves to database

**Result**: Crate status now changes to Withdrawn immediately when withdrawal request is created, preventing duplicate withdrawals and maintaining accurate inventory status. Rejected requests automatically restore crate status to Active.

## Critical Bug Fix

### Issue Found
The initial implementation had the `return Response(...)` statement INSIDE the `with transaction.atomic():` block, which prevented the transaction from committing properly. The crate status change was not being saved to the database.

### Fix Applied
**File**: `backend/apps/requests/views.py:361-408`

**Before** (WRONG - return inside transaction block):
```python
with transaction.atomic():
    # ... create request ...
    crate.status = 'Withdrawn'
    crate.save()
    # ... logging ...

    return Response({...})  # ❌ WRONG - prevents transaction commit
```

**After** (CORRECT - return outside transaction block):
```python
with transaction.atomic():
    # ... create request ...
    crate.status = 'Withdrawn'
    crate.save()
    # ... logging ...

return Response({...})  # ✅ CORRECT - transaction commits before return
```

### Verification
Created and ran test script `test_withdrawal_fix.py` which confirmed:
- ✅ Crate status changes from Active to Withdrawn
- ✅ Status is properly saved to database
- ✅ Direct database query confirms status is 'Withdrawn'
- ✅ Transaction commits successfully

## Next Steps

1. **Frontend Update**: Update withdrawal request creation UI to show immediate status change feedback
2. **User Notification**: Consider adding toast notification: "Crate #123 is now marked as Withdrawn"
3. **Testing**: Complete end-to-end testing of the new workflow
4. **User Training**: Update user documentation to reflect new behavior
