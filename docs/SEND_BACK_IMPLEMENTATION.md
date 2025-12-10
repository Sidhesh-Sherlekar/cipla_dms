# Send Back Functionality Implementation

## Overview
Implemented a "Send Back" feature that allows approvers (Head QC) to send a pending request back to the requester with feedback for corrections/modifications.

## Backend Implementation

### 1. Request Model Updates
**File**: `backend/apps/requests/models.py:44-56`

Added "Sent Back" status to Request model:
```python
status = models.CharField(
    max_length=50,
    choices=[
        ('Pending', 'Pending'),
        ('Sent Back', 'Sent Back'),      # NEW
        ('Approved', 'Approved'),
        ('Issued', 'Issued'),
        ('Returned', 'Returned'),
        ('Rejected', 'Rejected'),
        ('Completed', 'Completed')       # NEW
    ],
    default='Pending'
)
```

### 2. SendBack Model Updates
**File**: `backend/apps/requests/models.py:123-157`

Enhanced SendBack model to support both change requests and return notes:
```python
class SendBack(models.Model):
    """
    SendBack model for requesting changes to a request
    Used when an approver sends a request back to the requester for corrections/modifications
    Also used for tracking return acknowledgements when documents are returned
    """
    id = models.AutoField(primary_key=True)
    request = models.ForeignKey(Request, on_delete=models.CASCADE, related_name='sendbacks')
    reason = models.TextField(help_text='Reason for sending back or return notes')
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(...)
    sendback_type = models.CharField(
        max_length=50,
        choices=[
            ('Change Request', 'Change Request'),   # NEW: For sending back
            ('Return Note', 'Return Note')          # Existing: For return notes
        ],
        default='Change Request',
        help_text='Type of sendback: Change Request or Return Note'
    )
```

### 3. Serializers
**File**: `backend/apps/requests/serializers.py:17-30`

Created SendBackCreateSerializer:
```python
class SendBackCreateSerializer(serializers.Serializer):
    """Serializer for sending a request back for changes"""
    reason = serializers.CharField(min_length=10, help_text='Reason for sending back (minimum 10 characters)')
    digital_signature = serializers.CharField(write_only=True)
```

### 4. Send Back Endpoint
**File**: `backend/apps/requests/views.py:227-274`

**URL**: `POST /api/requests/{pk}/send-back/`
**Permissions**: IsAuthenticated, CanApproveRequests, IsActiveUser
**Requires**: Password verification via @require_digital_signature

```python
@api_view(['POST'])
@permission_classes([IsAuthenticated, CanApproveRequests, IsActiveUser])
@require_digital_signature
def send_back_request(request, pk):
    """Send a pending request back to requester for changes/corrections"""
    # Validate request is Pending or already Sent Back
    if request_obj.status not in ['Pending', 'Sent Back']:
        return Response({'error': 'Request cannot be sent back'}, ...)

    # Update request status to Sent Back
    request_obj.status = 'Sent Back'
    request_obj.save()

    # Create sendback record for change request
    SendBack.objects.create(
        request=request_obj,
        reason=serializer.validated_data['reason'],
        sendback_type='Change Request',
        created_by=request.user
    )

    # Log audit event
    log_audit_event(
        user=request.user,
        action='Sent Back',
        message=f'Request #{request_obj.id} sent back for changes. Reason: {reason}',
        ...
    )
```

### 5. URL Route
**File**: `backend/apps/requests/urls.py:17`

```python
path('<int:pk>/send-back/', views.send_back_request, name='request-send-back'),
```

### 6. Migration
**File**: `backend/apps/requests/migrations/0002_add_sent_back_status_and_sendback_type.py`

- Added `sendback_type` field to SendBack model
- Added 'Sent Back' and 'Completed' to Request status choices
- Updated Meta options on SendBack

## Frontend Implementation

### 1. TypeScript Types
**File**: `Frontend/src/types/index.ts`

**Request interface** (line 107):
```typescript
status: 'Pending' | 'Sent Back' | 'Approved' | 'Issued' | 'Returned' | 'Rejected' | 'Completed';
```

**SendBack interface** (lines 128-136):
```typescript
export interface SendBack {
  id: number;
  request: Request;
  reason: string;
  sendback_type: 'Change Request' | 'Return Note';
  created_at: string;
  created_by: number;
  created_by_name?: string;
}
```

**SendBackPayload** (lines 194-197):
```typescript
export interface SendBackPayload {
  reason: string;
  digital_signature: string;
}
```

### 2. API Hook
**File**: `Frontend/src/hooks/useRequests.ts:172-201`

```typescript
export const useSendBackRequest = (): UseMutationResult<
  any,
  Error,
  { request_id: number } & SendBackPayload
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      request_id,
      reason,
      digital_signature,
    }) => {
      const { data } = await api.post(`/requests/${request_id}/send-back/`, {
        reason,
        digital_signature,
      });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['request', variables.request_id] });
    },
  });
};
```

### 3. UI Implementation (To be added to Transaction.tsx)

The UI should be added in the Head QC section where pending requests are displayed. Here's the implementation pattern:

**Import the hook**:
```typescript
import {
  useRequests,
  useApproveRequest,
  useRejectRequest,
  useSendBackRequest,  // NEW
  ...
} from '../hooks/useRequests';
```

**Initialize the hook**:
```typescript
const approveRequest = useApproveRequest();
const rejectRequest = useRejectRequest();
const sendBackRequest = useSendBackRequest();  // NEW
```

**Add Send Back button** (alongside Approve/Reject):
```typescript
{request.status === 'Pending' && (
  <div className="flex gap-2">
    <Button
      size="sm"
      className="bg-green-600 hover:bg-green-700"
      onClick={() => handleApprove(request.id)}
    >
      <CheckCircle className="h-4 w-4 mr-1" />
      Approve
    </Button>

    <Button
      size="sm"
      className="bg-yellow-600 hover:bg-yellow-700"
      onClick={() => {
        setSelectedRequest(request.id);
        setSendBackReason('');
        setShowSendBackModal(true);
      }}
    >
      <ArrowLeft className="h-4 w-4 mr-1" />
      Send Back
    </Button>

    <Button
      size="sm"
      variant="destructive"
      onClick={() => handleReject(request.id)}
    >
      <X className="h-4 w-4 mr-1" />
      Reject
    </Button>
  </div>
)}
```

**Send Back Modal**:
```typescript
{showSendBackModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
    <div className="bg-white p-6 rounded-lg w-full max-w-md">
      <h3 className="text-lg font-semibold mb-4">Send Back Request</h3>
      <p className="text-sm text-gray-600 mb-4">
        Provide feedback for the requester to make corrections
      </p>

      <Label>Reason for sending back *</Label>
      <Textarea
        value={sendBackReason}
        onChange={(e) => setSendBackReason(e.target.value)}
        placeholder="Enter detailed feedback (minimum 10 characters)"
        rows={4}
        className="mb-4"
      />

      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          onClick={() => setShowSendBackModal(false)}
        >
          Cancel
        </Button>
        <Button
          className="bg-yellow-600 hover:bg-yellow-700"
          onClick={() => {
            if (sendBackReason.length < 10) {
              toast.error('Reason must be at least 10 characters');
              return;
            }

            // Open password confirmation modal
            setSignatureModal({
              isOpen: true,
              action: 'Send Back Request',
              onConfirm: async (password: string) => {
                setIsSignatureLoading(true);
                setSignatureError(null);
                try {
                  await sendBackRequest.mutateAsync({
                    request_id: selectedRequest,
                    reason: sendBackReason,
                    digital_signature: password
                  });
                  toast.success('Request sent back successfully');
                  await refetchRequests();
                  setShowSendBackModal(false);
                  setSignatureModal({ isOpen: false, action: '', onConfirm: () => {} });
                } catch (error: any) {
                  const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.message;
                  setSignatureError(errorMessage);
                } finally {
                  setIsSignatureLoading(false);
                }
              }
            });
          }}
        >
          Send Back
        </Button>
      </div>
    </div>
  </div>
)}
```

**Display "Sent Back" requests**:
```typescript
{request.status === 'Sent Back' && (
  <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
    <div className="flex items-center gap-2 mb-2">
      <AlertTriangle className="h-4 w-4 text-yellow-600" />
      <span className="font-medium text-yellow-900">Sent Back for Changes</span>
    </div>

    {request.sendbacks && request.sendbacks.length > 0 && (
      <div className="text-sm text-gray-700">
        <p className="font-medium mb-1">Feedback:</p>
        <p className="italic">{request.sendbacks[0].reason}</p>
        <p className="text-xs text-gray-500 mt-1">
          By: {request.sendbacks[0].created_by_name} on {new Date(request.sendbacks[0].created_at).toLocaleString()}
        </p>
      </div>
    )}
  </div>
)}
```

## Workflow

### Status Lifecycle

```
1. Section Head creates request
   → Status: Pending

2a. Head QC approves request
    → Status: Approved

2b. Head QC sends back request
    → Status: Sent Back
    → SendBack record created (type='Change Request')
    → Section Head can see feedback and resubmit

2c. Head QC rejects request
    → Status: Rejected
    → Request permanently rejected

3. If sent back, Section Head can:
   - View the feedback
   - Make corrections
   - Resubmit (status stays Sent Back until approved)
   - Head QC can approve or send back again
```

### User Flow - Head QC

1. **View Pending Requests**
   - Head QC sees list of pending requests
   - Each request shows: Approve | Send Back | Reject buttons

2. **Click Send Back**
   - Modal opens asking for reason
   - Reason must be at least 10 characters
   - Provide detailed feedback for corrections

3. **Enter Password**
   - Password confirmation modal appears
   - Enter password to authenticate action

4. **Request Sent Back**
   - Request status changes to "Sent Back"
   - SendBack record created with feedback
   - Section Head notified (or can see status change)
   - Audit trail logged

### User Flow - Section Head

1. **View Sent Back Requests**
   - Section Head sees requests with "Sent Back" status
   - Can view feedback from Head QC

2. **Make Corrections**
   - Review feedback
   - Make necessary corrections to documents/details
   - Can resubmit or create new request

3. **Resubmit**
   - After corrections, request can be resubmitted
   - Goes back to "Sent Back" status (awaiting approval)
   - Head QC can review again and approve or send back again

## Database Changes

**Before**:
```
Request status choices: Pending, Approved, Issued, Returned, Rejected
SendBack: Only for return acknowledgements
```

**After**:
```
Request status choices: Pending, Sent Back, Approved, Issued, Returned, Rejected, Completed
SendBack: Two types:
  - Change Request (for sending back)
  - Return Note (for return acknowledgements)
```

## Security Features

1. **Password Verification**: All send back operations require password re-entry
2. **Permission Checks**: Only users with CanApproveRequests permission can send back
3. **Active User Check**: Account must be active
4. **Minimum Reason Length**: Feedback must be at least 10 characters
5. **Immutable Audit Trail**: All actions logged
6. **Status Validation**: Can only send back Pending or already Sent Back requests

## API Endpoint Details

### Send Back Request
**Endpoint**: `POST /api/requests/{pk}/send-back/`

**Request Body**:
```json
{
  "reason": "Please update the destruction date to next year. Current date has already passed.",
  "digital_signature": "user_password"
}
```

**Success Response** (200):
```json
{
  "message": "Storage request sent back for changes",
  "request_id": 123,
  "status": "Sent Back",
  "reason": "Please update the destruction date..."
}
```

**Error Responses**:

400 - Invalid Data:
```json
{
  "reason": ["Ensure this field has at least 10 characters."]
}
```

400 - Invalid Status:
```json
{
  "error": "Request cannot be sent back (current status: Approved). Only Pending or Sent Back requests can be sent back."
}
```

403 - Invalid Password:
```json
{
  "error": "Authentication failed",
  "detail": "Invalid password. Please try again."
}
```

404 - Not Found:
```json
{
  "error": "Request not found"
}
```

## Testing

### Backend Test
```python
# Test send back functionality
from apps.requests.models import Request, SendBack

# Get a pending request
request = Request.objects.filter(status='Pending').first()

# Send it back
# POST /api/requests/{request.id}/send-back/
# {
#   "reason": "Test feedback",
#   "digital_signature": "password"
# }

# Verify
assert request.status == 'Sent Back'
assert SendBack.objects.filter(request=request, sendback_type='Change Request').exists()
```

### Frontend Test
1. Login as Head QC user
2. Navigate to pending requests
3. Click "Send Back" button on a request
4. Enter feedback (at least 10 characters)
5. Click "Send Back" button in modal
6. Enter password in confirmation modal
7. Verify request status changes to "Sent Back"
8. Verify feedback is displayed
9. Login as Section Head
10. Verify can see "Sent Back" status and feedback

## Status: ✓ BACKEND COMPLETE, FRONTEND UI PENDING

**Completed**:
- ✓ Request model with "Sent Back" status
- ✓ SendBack model with sendback_type field
- ✓ Migration applied successfully
- ✓ Send back endpoint implemented
- ✓ URL route added
- ✓ Serializers created
- ✓ Password verification enabled
- ✓ Audit logging implemented
- ✓ TypeScript types updated
- ✓ useSendBackRequest hook created

**Pending**:
- [ ] Add Send Back button to Transaction.tsx
- [ ] Create Send Back modal with reason textarea
- [ ] Display "Sent Back" status and feedback
- [ ] Handle resubmission workflow
- [ ] Test complete workflow

## Next Steps

1. Add the UI components to Transaction.tsx as shown above
2. Test the complete workflow
3. Add visual indicators for "Sent Back" requests
4. Consider adding email notifications (future enhancement)
5. Add bulk send back capability (future enhancement)
