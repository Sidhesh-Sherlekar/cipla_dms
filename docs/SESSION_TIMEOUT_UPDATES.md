# Session Timeout Feature - Updates

## Recent Changes

### 1. Updated Timeout Options

**Changed**: Session timeout range from 15 minutes - 8 hours
**To**: 5 minutes - 30 minutes in 5-minute intervals

#### New Timeout Options
- **5 minutes** - Very high security, frequent re-authentication
- **10 minutes** - High security
- **15 minutes** - Elevated security
- **20 minutes** - Moderate security
- **25 minutes** - Standard security
- **30 minutes** - Default, balanced security

#### Rationale
- Maximum session length capped at 30 minutes for security compliance
- 5-minute intervals provide granular control
- Shorter timeouts reduce security risks from abandoned sessions
- More appropriate for enterprise document management systems

### 2. Fixed Digital Signature Password Field

**Issue**: Password field retained previously entered password when modal reopened

**Fix**: Added `useEffect` hook to clear password field when modal opens

**Implementation**:
```typescript
// Clear password field when modal opens
useEffect(() => {
  if (isOpen) {
    setPassword('');
    setLocalError('');
  }
}, [isOpen]);
```

**Result**: Password field now always starts empty when digital signature modal opens

## Technical Changes

### Backend

**File**: `backend/apps/auth/models.py`
```python
TIMEOUT_CHOICES = [
    (5, '5 minutes'),    # NEW
    (10, '10 minutes'),  # NEW
    (15, '15 minutes'),
    (20, '20 minutes'),  # NEW
    (25, '25 minutes'),  # NEW
    (30, '30 minutes'),
    # Removed: 60, 120, 240, 480
]
```

**Migration**: `backend/apps/auth/migrations/0011_update_session_timeout_choices.py`
- Alters `session_timeout_minutes` field choices
- Existing values outside new range will need to be updated manually

### Frontend

**File**: `Frontend/src/components/DigitalSignatureModal.tsx`
```typescript
import { useState, useEffect } from 'react';  // Added useEffect

// Clear password field when modal opens
useEffect(() => {
  if (isOpen) {
    setPassword('');
    setLocalError('');
  }
}, [isOpen]);
```

## Migration Notes

### Existing Session Policies

If you have an existing session policy with a timeout value outside the new range (e.g., 60, 120, 240, 480 minutes), you should update it:

**Option 1: Using Django Shell**
```python
from apps.auth.models import SessionPolicy

policy = SessionPolicy.objects.first()
if policy and policy.session_timeout_minutes > 30:
    policy.session_timeout_minutes = 30  # Set to max allowed
    policy.save()
    print(f'Updated timeout from {policy.session_timeout_minutes} to 30 minutes')
```

**Option 2: Using Admin Interface**
1. Navigate to User Management → Security Policies
2. Select new timeout from dropdown (max 30 minutes)
3. Change will be saved automatically

## Testing

### Test Updated Timeout Options
```bash
# Backend shell
python manage.py shell

from apps.auth.models import SessionPolicy

# View available options
print(SessionPolicy.TIMEOUT_CHOICES)
# [(5, '5 minutes'), (10, '10 minutes'), (15, '15 minutes'),
#  (20, '20 minutes'), (25, '25 minutes'), (30, '30 minutes')]

# Get current timeout
policy = SessionPolicy.objects.first()
print(f'Current: {policy.session_timeout_minutes} minutes')

# Test update
policy.session_timeout_minutes = 15
policy.save()
print(f'Updated to: {policy.session_timeout_minutes} minutes')
```

### Test Digital Signature Password Clear
1. Navigate to any action requiring digital signature
2. Click action button (e.g., Approve, Reject, Send Back)
3. Digital Signature modal opens
4. **Verify**: Password field is empty
5. Enter password and submit
6. Action completes, modal closes
7. Click another action button
8. Digital Signature modal opens again
9. **Verify**: Password field is empty again (not showing previous password)

## UI Changes

### Dropdown Options Display
Before:
```
Session Timeout:
- 15 minutes
- 30 minutes
- 1 hour
- 2 hours
- 4 hours
- 8 hours
```

After:
```
Session Timeout:
- 5 minutes
- 10 minutes
- 15 minutes
- 20 minutes
- 25 minutes
- 30 minutes
```

### Default Value
- Default timeout remains: **30 minutes**
- Recommended for most use cases
- Can be changed by admin as needed

## Security Implications

### Shorter Sessions = Higher Security
- **5-10 minutes**: Recommended for high-security areas
- **15-20 minutes**: Standard for most users
- **25-30 minutes**: Acceptable for trusted environments

### Considerations
- Shorter timeouts may impact user experience
- Users must re-authenticate more frequently
- Balance security with usability
- Monitor user feedback on timeout settings

## API Changes

### Request Validation
The API endpoint now validates against new choices:

**Valid Values**: `[5, 10, 15, 20, 25, 30]`

**Invalid Values**: `[60, 120, 240, 480, ...]`

**Example Error Response**:
```json
{
  "error": "Invalid timeout value. Must be one of: [5, 10, 15, 20, 25, 30]"
}
```

## Rollback Instructions

If you need to revert to the previous timeout options:

1. **Update Model**:
```python
# backend/apps/auth/models.py
TIMEOUT_CHOICES = [
    (15, '15 minutes'),
    (30, '30 minutes'),
    (60, '1 hour'),
    (120, '2 hours'),
    (240, '4 hours'),
    (480, '8 hours'),
]
```

2. **Create New Migration**:
```bash
python manage.py makemigrations auth_custom --name revert_session_timeout_choices
python manage.py migrate
```

3. **Update Existing Policy**:
```python
from apps.auth.models import SessionPolicy
policy = SessionPolicy.objects.first()
policy.session_timeout_minutes = 30  # Or another valid value
policy.save()
```

## Files Modified

### Backend
- ✓ `backend/apps/auth/models.py` - Updated TIMEOUT_CHOICES
- ✓ `backend/apps/auth/migrations/0011_update_session_timeout_choices.py` - Created

### Frontend
- ✓ `Frontend/src/components/DigitalSignatureModal.tsx` - Added useEffect to clear password

## Status: ✓ COMPLETE

All changes have been:
- ✓ Implemented
- ✓ Migrated
- ✓ Tested
- ✓ Documented

## Summary

### What Changed
1. Session timeout options reduced from 8 hours max to 30 minutes max
2. New options: 5, 10, 15, 20, 25, 30 minutes (5-minute intervals)
3. Digital signature password field now clears automatically when modal opens

### Why
1. Enhanced security with shorter maximum session timeout
2. Better compliance with document management security standards
3. Improved user experience with auto-clearing password fields

### Impact
- **Users**: May need to re-authenticate more frequently
- **Admins**: Can choose from more granular timeout options (5-min intervals)
- **Security**: Reduced risk from abandoned or hijacked sessions
- **Compliance**: Better alignment with security best practices
