# Return Functionality Implementation

## Overview
Implemented a complete return workflow for withdrawal requests where Store Heads can:
1. Click RETURN button on issued withdrawal requests
2. Select a storage location for the returned crate
3. Confirm with password
4. System updates crate status from 'Withdrawn' back to 'Active' and assigns new storage location

## Backend Implementation

### 1. Models - Crate Status
**File**: `backend/apps/documents/models.py`

The Crate model already includes 'Withdrawn' status:
```python
status = models.CharField(
    max_length=50,
    choices=[
        ('Active', 'Active'),
        ('Withdrawn', 'Withdrawn'),  # ✓ Already exists
        ('Archived', 'Archived'),
        ('Destroyed', 'Destroyed')
    ],
    default='Active'
)
```

**Migration**: `backend/apps/documents/migrations/0002_add_withdrawn_status.py` ✓ Applied

### 2. Serializer Updates
**File**: `backend/apps/requests/serializers.py:137-141`

Updated `ReturnDocumentsSerializer` to require storage location:
```python
class ReturnDocumentsSerializer(serializers.Serializer):
    """Serializer for returning documents"""
    reason = serializers.CharField(required=False, allow_blank=True)
    storage = serializers.IntegerField(required=True)  # Storage location ID
    digital_signature = serializers.CharField(write_only=True)
```

### 3. API Endpoint - Return Documents
**File**: `backend/apps/requests/views.py:376-449`

The `return_documents` endpoint:
- **URL**: `POST /api/requests/{pk}/return/`
- **Permissions**: IsAuthenticated, CanAllocateStorage, IsActiveUser
- **Requires**: Password verification via @require_digital_signature decorator

**Workflow**:
1. Validates request exists and is a Withdrawal request
2. Validates request status is 'Issued'
3. Validates storage location exists
4. Updates request status to 'Returned'
5. Updates crate status from 'Withdrawn' to 'Active'
6. Assigns storage location to crate
7. Creates SendBack record if reason provided
8. Logs return event and storage allocation event
9. Returns success response with storage location

**Code**:
```python
@api_view(['POST'])
@permission_classes([IsAuthenticated, CanAllocateStorage, IsActiveUser])
@require_digital_signature
def return_documents(request, pk):
    # Validate storage location
    storage = Storage.objects.get(id=storage_id)

    # Update request status
    request_obj.status = 'Returned'
    request_obj.return_date = timezone.now()
    request_obj.save()

    # Update crate: set status back to Active and assign storage location
    crate = request_obj.crate
    old_storage = crate.storage
    crate.status = 'Active'
    crate.storage = storage
    crate.save()

    # Audit logging
    log_document_returned(request.user, request_obj, request)
    log_audit_event(user=request.user, action='Allocated', ...)
```

### 4. Complete Workflow
**Issue → Withdrawn → Return → Active**

**Issue Documents** (`views.py:334-373`):
```python
# When documents are issued
crate.status = 'Withdrawn'  # Crate is out
crate.save()
```

**Return Documents** (`views.py:376-449`):
```python
# When documents are returned
crate.status = 'Active'     # Crate is back in storage
crate.storage = storage     # Assign new storage location
crate.save()
```

## Frontend Implementation

### 1. TypeScript Types
**File**: `Frontend/src/types/index.ts:197-201`

Updated `ReturnDocumentsPayload`:
```typescript
export interface ReturnDocumentsPayload {
  storage: number;
  reason?: string;
  digital_signature: string;
}
```

### 2. API Hook
**File**: `Frontend/src/hooks/useRequests.ts:227-260`

Updated `useReturnDocuments` mutation:
```typescript
mutationFn: async ({
  request_id,
  storage,
  reason,
  digital_signature,
}) => {
  const { data } = await api.post(`/requests/${request_id}/return/`, {
    storage,
    reason,
    digital_signature,
  });
  return data;
}
```

### 3. UI Components
**File**: `Frontend/src/components/Transaction.tsx`

#### RETURN Button (lines 1624-1633):
Replaces "Issued - Awaiting Return" text with clickable button:
```typescript
{request.request_type === "Withdrawal" && request.status === "Issued" && (
  <Button
    size="sm"
    className="bg-orange-600 hover:bg-orange-700"
    onClick={() => toggleRequestExpansion(request.id.toString())}
  >
    <ArrowLeft className="h-4 w-4 mr-1" />
    Return
  </Button>
)}
```

#### Storage Allocation UI (lines 1830-2002):
Expandable section with cascading dropdowns:
- Unit selector (pre-selected to user's unit)
- Room dropdown
- Rack dropdown (disabled until room selected)
- Compartment dropdown (disabled until rack selected)
- Shelf dropdown (disabled until compartment selected, only if 4-level storage)
- "Return & Allocate Storage" button

```typescript
{request.request_type === "Withdrawal" && request.status === "Issued" && (
  <div className="space-y-4">
    <h5 className="font-medium text-sm">
      Assign Return Storage Location:
    </h5>
    <div className="grid grid-cols-5 gap-4">
      {/* Unit, Room, Rack, Compartment, Shelf dropdowns */}
    </div>
    <Button
      className="bg-orange-600 hover:bg-orange-700"
      onClick={() => handleReturnDocuments(request.id)}
    >
      Return & Allocate Storage
    </Button>
  </div>
)}
```

#### Handler Function (lines 467-535):
```typescript
const handleReturnDocuments = async (requestId: number) => {
  // Validate storage location selection
  if (!selectedUnit || !selectedRoom || !selectedRack || !selectedCompartment) {
    toast.error('Please select room, rack, and compartment');
    return;
  }

  // Find storage location
  const existingStorage = storageLocations.find(s => ...);

  // Open password confirmation modal
  setSignatureModal({
    isOpen: true,
    action: 'Return Documents & Allocate Storage',
    onConfirm: async (password: string) => {
      await returnDocuments.mutateAsync({
        request_id: requestId,
        storage: existingStorage.id,
        digital_signature: password
      });

      toast.success('Documents returned and storage allocated successfully');
      // Reset form and close expansion
    }
  });
};
```

## User Flow

### Store Head Perspective

1. **View Issued Requests**
   - Store Head section shows withdrawal requests with status 'Issued'
   - Storage location is displayed for reference

2. **Click RETURN Button**
   - Orange "Return" button appears for issued withdrawal requests
   - Clicking expands the row to show storage allocation form

3. **Select Storage Location**
   - Unit dropdown (pre-selected)
   - Room dropdown loads available rooms
   - Rack dropdown (cascading from room)
   - Compartment dropdown (cascading from rack)
   - Shelf dropdown (cascading from compartment, if 4-level storage)

4. **Submit Return**
   - Click "Return & Allocate Storage" button
   - Password confirmation modal appears
   - Enter password and click "Confirm"

5. **System Processing**
   - Backend validates password
   - Validates storage location exists
   - Updates request status: Issued → Returned
   - Updates crate status: Withdrawn → Active
   - Assigns new storage location to crate
   - Logs audit trail events
   - Request removed from Store Head queue

6. **Result**
   - Success toast notification
   - Form resets
   - Crate is now available for new withdrawal requests

## Data Flow

```
User Action: Click RETURN
    ↓
Expand storage allocation UI
    ↓
User selects: Unit → Room → Rack → Compartment → [Shelf]
    ↓
User clicks: "Return & Allocate Storage"
    ↓
Password modal appears
    ↓
User enters password
    ↓
Frontend: POST /api/requests/{id}/return/
    {
      storage: storage_id,
      reason: "optional",
      digital_signature: "password"
    }
    ↓
Backend: @require_digital_signature validates password
    ↓
Backend: Validates request is Withdrawal & Issued
    ↓
Backend: Validates storage exists
    ↓
Backend: Updates request.status = 'Returned'
Backend: Updates request.return_date = now()
    ↓
Backend: Updates crate.status = 'Active'
Backend: Updates crate.storage = new_storage
    ↓
Backend: Logs audit events (Returned, Allocated)
    ↓
Frontend: Invalidates queries, shows success toast
    ↓
Crate is back in storage and available for withdrawal
```

## Database State Changes

### Before Return
```
Request:
  id: 123
  request_type: 'Withdrawal'
  status: 'Issued'
  issue_date: '2024-01-15'
  return_date: null

Crate:
  id: 456
  status: 'Withdrawn'
  storage: Storage(id=10, location="Room-A-Rack-1-Comp-2")
```

### After Return
```
Request:
  id: 123
  request_type: 'Withdrawal'
  status: 'Returned'
  issue_date: '2024-01-15'
  return_date: '2024-01-20'

Crate:
  id: 456
  status: 'Active'
  storage: Storage(id=25, location="Room-B-Rack-5-Comp-3-Shelf-2")
```

## Audit Trail Events

Two audit events are logged for each return:

1. **Document Returned Event**
```python
Action: 'Returned'
Message: 'Documents from Crate #456 returned'
User: Store Head user
IP: Client IP address
Timestamp: 2024-01-20 10:30:00
```

2. **Storage Allocated Event**
```python
Action: 'Allocated'
Message: 'Crate #456 storage updated on return from Room-A-Rack-1-Comp-2 to Room-B-Rack-5-Comp-3-Shelf-2'
User: Store Head user
IP: Client IP address
Timestamp: 2024-01-20 10:30:00
```

## Security Features

1. **Password Verification**: All return operations require password re-entry
2. **Permission Checks**: Only users with CanAllocateStorage permission can return documents
3. **Active User Check**: Account must be active (not suspended/locked)
4. **Immutable Audit Trail**: All actions logged and cannot be modified
5. **Status Validation**: System validates request is in correct state before processing

## Testing Checklist

- [x] Backend serializer accepts storage parameter
- [x] Backend endpoint validates storage exists
- [x] Backend updates request status to Returned
- [x] Backend updates crate status to Active
- [x] Backend assigns storage location to crate
- [x] Backend logs audit trail events
- [x] Frontend displays RETURN button for issued withdrawals
- [x] Frontend shows storage allocation UI on expand
- [x] Frontend validates storage location selection
- [x] Frontend opens password confirmation modal
- [x] Frontend calls API with correct parameters
- [x] Frontend refreshes data after successful return
- [x] Migration applied for Withdrawn status
- [x] Crate model includes Withdrawn in status choices

## Files Modified

### Backend
1. `backend/apps/requests/serializers.py` - Added storage parameter
2. `backend/apps/requests/views.py` - Implemented return logic, added import
3. `backend/apps/documents/models.py` - Already has Withdrawn status
4. `backend/apps/documents/migrations/0002_add_withdrawn_status.py` - Already applied

### Frontend
5. `Frontend/src/types/index.ts` - Updated ReturnDocumentsPayload
6. `Frontend/src/hooks/useRequests.ts` - Updated useReturnDocuments hook
7. `Frontend/src/components/Transaction.tsx` - Added RETURN button, storage UI, handler

## Status: ✓ COMPLETE

All backend and frontend components are implemented and tested. The return functionality is fully operational and follows the same pattern as storage allocation for consistency.
