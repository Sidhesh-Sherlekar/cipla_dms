# Digital Signature System - Usage Guide

## Overview

The Digital Signature system has been implemented to ensure 21 CFR Part 11 compliance by requiring password re-entry for all critical actions in the Cipla Document Management System.

## How It Works

### Backend Implementation

**Decorator: `@require_digital_signature`**

Location: [backend/apps/auth/decorators.py](backend/apps/auth/decorators.py)

This decorator:
1. Checks if `digital_signature` field (password) is present in the request
2. Verifies the user account is active
3. Re-authenticates the user with their password (two-factor: session + password)
4. Logs the signature attempt in the audit trail
5. Attaches `request.verified_user` and `request.signature_verified_at` to the request

**Applied to 9 Critical Endpoints:**

Location: [backend/apps/requests/views.py](backend/apps/requests/views.py)

1. **Line 39**: `create_storage_request` - Section Head creates storage request
2. **Line 100**: `create_withdrawal_request` - Section Head creates withdrawal request
3. **Line 177**: `create_destruction_request` - Section Head creates destruction request
4. **Line 216**: `approve_request` - Head QC approves request
5. **Line 263**: `reject_request` - Head QC rejects request
6. **Line 319**: `allocate_storage` - Document Store allocates storage
7. **Line 359**: `issue_documents` - Document Store issues documents
8. **Line 406**: `return_documents` - Document Store returns documents
9. **Line 447**: `destroy_documents` - Document Store confirms destruction

### Frontend Implementation

**Component: `DigitalSignatureModal`**

Location: [frontend/src/components/DigitalSignatureModal.tsx](frontend/src/components/DigitalSignatureModal.tsx)

Features:
- Password input with show/hide toggle
- 21 CFR Part 11 compliance notice
- Action description display
- Error handling with detailed messages
- Loading state during verification
- Auto-clear password on close

**Integration Example (Transaction.tsx):**

```typescript
// 1. Import the modal
import { DigitalSignatureModal } from './DigitalSignatureModal';

// 2. Add state variables
const [signatureModal, setSignatureModal] = useState({
  isOpen: false,
  action: '',
  onConfirm: (password: string) => {},
});
const [signatureError, setSignatureError] = useState<string | null>(null);
const [isSignatureLoading, setIsSignatureLoading] = useState(false);

// 3. Update action handlers
const handleApprove = async (requestId: number) => {
  setSignatureModal({
    isOpen: true,
    action: 'Approve Request',
    onConfirm: async (password: string) => {
      setIsSignatureLoading(true);
      setSignatureError(null);

      try {
        await approveRequest.mutateAsync({
          request_id: requestId,
          digital_signature: password
        });

        await refetchRequests();
        setSignatureModal({ isOpen: false, action: '', onConfirm: () => {} });
        alert('Request approved successfully');
      } catch (error: any) {
        const errorMessage = error.response?.data?.error ||
                            error.response?.data?.detail ||
                            error.message;
        setSignatureError(errorMessage);
      } finally {
        setIsSignatureLoading(false);
      }
    }
  });
};

// 4. Add modal component to JSX
<DigitalSignatureModal
  isOpen={signatureModal.isOpen}
  onClose={() => {
    setSignatureModal({ isOpen: false, action: '', onConfirm: () => {} });
    setSignatureError(null);
    setIsSignatureLoading(false);
  }}
  onConfirm={signatureModal.onConfirm}
  action={signatureModal.action}
  isLoading={isSignatureLoading}
  error={signatureError}
/>
```

## User Experience Flow

### 1. User Clicks Action Button (e.g., "Approve")
- Frontend shows the Digital Signature Modal
- Modal displays: "To confirm **Approve Request**, please re-enter your password"

### 2. User Enters Password
- Password field with show/hide toggle
- Real-time error clearing on input change
- 21 CFR Part 11 compliance notice shown

### 3. User Clicks "Confirm & Sign"
- Frontend sends request with `digital_signature` field containing password
- Backend decorator intercepts the request
- Password is verified via Django's authentication system

### 4. Success Response
- Modal closes automatically
- Success message displayed
- Data refreshed to show updated status
- Audit trail entry created with "E-Signature Verified"

### 5. Error Response
- Error message displayed in modal
- User can retry without closing modal
- Audit trail entry created with "E-Signature Failed"

## API Request Format

All critical actions now require the `digital_signature` field:

```typescript
// Approve Request
POST /api/requests/{id}/approve/
{
  "digital_signature": "user_password_here"
}

// Reject Request
POST /api/requests/{id}/reject/
{
  "reason": "rejection reason",
  "digital_signature": "user_password_here"
}

// Allocate Storage
POST /api/requests/{id}/allocate/
{
  "storage_id": 123,
  "digital_signature": "user_password_here"
}

// Create Storage Request
POST /api/requests/storage/create/
{
  "unit": 1,
  "department": 2,
  "section": 3,
  "documents": [...],
  "digital_signature": "user_password_here"
}
```

## Error Responses

### Invalid Password
```json
{
  "error": "Digital signature verification failed",
  "detail": "Invalid password. Please try again."
}
```

### Missing Signature
```json
{
  "error": "Digital signature required",
  "detail": "Please re-enter your password to confirm this action",
  "required_field": "digital_signature"
}
```

### Inactive Account
```json
{
  "error": "Account not active",
  "detail": "Your account is not active. Please contact administrator."
}
```

## Audit Trail Integration

All signature attempts are logged:

**Successful Verification:**
```
Action: E-Signature Verified
Message: Password verification successful for approve_request
Status: Success
User: john.doe
Timestamp: 2025-11-10 21:30:45
```

**Failed Verification:**
```
Action: E-Signature Failed
Message: Failed password verification attempt
Status: Failed
User: john.doe
Timestamp: 2025-11-10 21:30:45
```

## Security Features

1. **Two-Factor Authentication**: Session token + password re-entry
2. **No Password Storage**: Password is verified and discarded immediately
3. **Audit Logging**: All attempts (success and failure) are logged
4. **Active Account Check**: Only active users can sign
5. **Immutable Signatures**: Once created, signature records cannot be modified
6. **Cryptographic Binding**: SHA-256 hashes ensure data integrity

## Testing the System

### Test Case 1: Successful Approval
1. Login as Head QC user
2. Navigate to Transaction > Approval Queue
3. Click "Approve" on a pending request
4. Enter correct password in modal
5. Click "Confirm & Sign"
6. **Expected**: Request approved, modal closes, success message shown

### Test Case 2: Invalid Password
1. Login as Head QC user
2. Navigate to Transaction > Approval Queue
3. Click "Approve" on a pending request
4. Enter incorrect password in modal
5. Click "Confirm & Sign"
6. **Expected**: Error message shown in modal, modal stays open, can retry

### Test Case 3: Cancel Signature
1. Click any action button that requires signature
2. Modal appears
3. Click "Cancel" button
4. **Expected**: Modal closes, no action taken, no audit entry

### Test Case 4: Multiple Retries
1. Click action button
2. Enter wrong password, see error
3. Correct password field
4. Enter correct password
5. Click "Confirm & Sign"
6. **Expected**: Success on second attempt

## Adding Signature to New Actions

To add digital signature requirement to a new action:

### Backend
```python
# In views.py
from apps.auth.decorators import require_digital_signature

@api_view(['POST'])
@permission_classes([IsAuthenticated, YourPermissionClass])
@require_digital_signature  # Add this decorator
def your_new_action(request, pk=None):
    # Your action logic here
    # request.verified_user is available
    # request.signature_verified_at is available
    pass
```

### Frontend
```typescript
// In your component
const handleYourAction = async (id: number) => {
  setSignatureModal({
    isOpen: true,
    action: 'Your Action Name',
    onConfirm: async (password: string) => {
      setIsSignatureLoading(true);
      setSignatureError(null);

      try {
        await yourActionMutation.mutateAsync({
          id: id,
          digital_signature: password,
          // ... other fields
        });

        setSignatureModal({ isOpen: false, action: '', onConfirm: () => {} });
        alert('Action completed successfully');
      } catch (error: any) {
        setSignatureError(error.response?.data?.error || error.message);
      } finally {
        setIsSignatureLoading(false);
      }
    }
  });
};
```

## Compliance Notes

This implementation satisfies 21 CFR Part 11 requirements:

✅ **§11.50 Signature manifestations**: Action is clearly attributed to signer with full audit trail
✅ **§11.70 Signature/record linking**: Cryptographic binding via SHA-256 hashes
✅ **§11.100 General requirements**: Two distinct identification components (session + password)
✅ **§11.200 Electronic signature components**: Unique user ID + private password
✅ **§11.300 Controls for identification codes/passwords**: Password verification at time of signing

## Files Modified

### Backend
- [backend/apps/auth/decorators.py](backend/apps/auth/decorators.py) - Simplified decorator
- [backend/apps/requests/views.py](backend/apps/requests/views.py) - Decorator already applied

### Frontend
- [frontend/src/components/DigitalSignatureModal.tsx](frontend/src/components/DigitalSignatureModal.tsx) - Reusable modal component
- [frontend/src/components/Transaction.tsx](frontend/src/components/Transaction.tsx) - Integrated signature modal

### Documentation
- [DIGITAL_SIGNATURE_SYSTEM.md](DIGITAL_SIGNATURE_SYSTEM.md) - Comprehensive system documentation
- [DIGITAL_SIGNATURE_USAGE_GUIDE.md](DIGITAL_SIGNATURE_USAGE_GUIDE.md) - This file

## Support

For issues or questions:
1. Check audit trail for signature verification logs
2. Verify user account is active
3. Ensure password is correct
4. Check browser console for detailed error messages
5. Review backend logs for decorator execution details
