# Cipla DMS - Recent Changes Summary

## Session Timeout Management Feature

### Overview
Implemented a dynamic session timeout management system that allows administrators to configure system-wide session timeouts without server restart.

### Key Features
✅ **6 Predefined Timeout Options**: 5, 10, 15, 20, 25, 30 minutes (5-minute intervals)
✅ **No Server Restart Required**: Changes apply immediately to new sessions
✅ **Admin-Only Access**: Requires `CanManageUsers` permission
✅ **Full Audit Trail**: All changes logged with user, timestamp, old/new values
✅ **Database-Driven**: Settings stored in database, not config files
✅ **Custom Middleware**: Enforces timeout dynamically on every request

### How to Use
**Admin users:**
1. Go to **User Management** → **Admin** tab → **Security Policies**
2. Find **Session Policy** card
3. Select desired timeout from dropdown (5-30 minutes)
4. Change applies instantly to all new logins

### Timeout Options
- **5 minutes** - Very high security
- **10 minutes** - High security
- **15 minutes** - Elevated security
- **20 minutes** - Moderate security
- **25 minutes** - Standard security
- **30 minutes** - Default, balanced security (recommended)

---

## Digital Signature Password Field Fix

### Issue
When the digital signature confirmation modal was reopened, the password field retained the previously entered password.

### Fix
Added automatic password field clearing when modal opens.

### Implementation
```typescript
// Clears password when modal opens
useEffect(() => {
  if (isOpen) {
    setPassword('');
    setLocalError('');
  }
}, [isOpen]);
```

### Result
- ✅ Password field always starts empty
- ✅ Better security (no password retention)
- ✅ Better user experience (clear visual state)

---

## Technical Implementation

### Backend (Django)

**New Components:**
1. **SessionPolicy Model** - Stores timeout setting in database
2. **DynamicSessionTimeoutMiddleware** - Enforces timeout on every request
3. **API Endpoint** - `POST /api/auth/session-timeout/` for updates
4. **Audit Logging** - Tracks all timeout changes

**Files Modified:**
- `apps/auth/models.py` - Added SessionPolicy model
- `apps/auth/serializers.py` - Added SessionPolicySerializer
- `apps/auth/views.py` - Added update_session_timeout endpoint
- `apps/auth/urls.py` - Added session-timeout route
- `apps/auth/middleware.py` - Created DynamicSessionTimeoutMiddleware
- `config/settings.py` - Registered middleware

**Migrations:**
- `0010_sessionpolicy.py` - Created session_policy table
- `0011_update_session_timeout_choices.py` - Updated timeout choices to 5-30 min range

### Frontend (React + TypeScript)

**Components Modified:**
1. **DigitalSignatureModal.tsx** - Added useEffect to clear password
2. **UserManagement.tsx** - Added timeout dropdown selector

**Hooks Added:**
- `useUpdateSessionTimeout()` - Mutation hook for updating timeout

**Files Modified:**
- `src/hooks/useGroups.ts` - Added useUpdateSessionTimeout hook, updated types
- `src/components/UserManagement.tsx` - Added dropdown UI in Security Policies
- `src/components/DigitalSignatureModal.tsx` - Added password clearing logic

---

## Security & Compliance

### Permission-Based Access
- Only users with `CanManageUsers` permission can update timeout
- Typically Admin or System Administrator roles

### Audit Trail
Every timeout change is logged:
```
Action: Updated
User: admin@example.com
Message: Session timeout changed from 15 minutes to 25 minutes by admin
Timestamp: 2025-11-11 18:00:00
IP: 192.168.1.100
```

### Session Behavior
- **New Sessions**: Immediately use new timeout
- **Existing Sessions**: Keep original timeout until expiry
- **Security**: Shorter timeouts reduce session hijacking risk

---

## API Reference

### Get Security Policies (Including Timeout Options)
```
GET /api/auth/security-policies/
Authorization: Bearer <token>
```

**Response:**
```json
{
  "session_policy": {
    "session_timeout_minutes": 30,
    "max_concurrent_sessions": 1,
    "timeout_options": [
      {"value": 5, "label": "5 minutes"},
      {"value": 10, "label": "10 minutes"},
      {"value": 15, "label": "15 minutes"},
      {"value": 20, "label": "20 minutes"},
      {"value": 25, "label": "25 minutes"},
      {"value": 30, "label": "30 minutes"}
    ],
    "can_update": true
  }
}
```

### Update Session Timeout
```
POST /api/auth/session-timeout/
Authorization: Bearer <token>
Content-Type: application/json

{
  "session_timeout_minutes": 25
}
```

**Success Response (200 OK):**
```json
{
  "message": "Session timeout updated successfully",
  "old_timeout": 30,
  "new_timeout": 25,
  "note": "New timeout will apply to all new sessions..."
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "Invalid timeout value. Must be one of: [5, 10, 15, 20, 25, 30]"
}
```

---

## Database Schema

### session_policy Table
```sql
CREATE TABLE session_policy (
    id SERIAL PRIMARY KEY,
    session_timeout_minutes INTEGER NOT NULL
        CHECK (session_timeout_minutes IN (5, 10, 15, 20, 25, 30)),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_by_id INTEGER REFERENCES auth_user(id) ON DELETE SET NULL
);
```

**Constraints:**
- Only one row allowed (singleton pattern)
- Timeout must be one of: 5, 10, 15, 20, 25, 30
- Default: 30 minutes

---

## Testing Completed

### Backend Tests
✅ SessionPolicy model creation
✅ Singleton pattern enforcement
✅ Timeout retrieval (get_current_timeout)
✅ API endpoint validation
✅ Permission checking
✅ Audit trail logging

### Frontend Tests
✅ Dropdown displays correct options
✅ Selection updates timeout
✅ Toast notifications work
✅ Password field clears on modal open
✅ Error handling works correctly

### Integration Tests
✅ New sessions use updated timeout
✅ Existing sessions unaffected
✅ Middleware enforces timeout correctly
✅ Database updates persist
✅ Audit logs created properly

---

## Documentation

Comprehensive documentation created:

1. **SESSION_TIMEOUT_FEATURE.md** - Complete technical documentation
2. **SESSION_TIMEOUT_SUMMARY.md** - Quick reference guide
3. **SESSION_TIMEOUT_FLOW.md** - Visual flow diagrams
4. **SESSION_TIMEOUT_UPDATES.md** - Recent changes and migration notes
5. **CHANGES_SUMMARY.md** - This document

---

## Status: ✅ PRODUCTION READY

All features have been:
- ✅ Fully implemented
- ✅ Thoroughly tested
- ✅ Database migrated
- ✅ Documented
- ✅ Verified working

---

## Quick Start Guide

### For Administrators

**To change session timeout:**
1. Login as admin
2. Navigate to: User Management → Admin → Security Policies
3. Find "Session Policy" card
4. Select desired timeout from dropdown
5. Done! New sessions will use the new timeout

**Recommended settings:**
- **High security environments**: 5-10 minutes
- **Standard use**: 15-20 minutes
- **Balanced (default)**: 30 minutes

### For Developers

**To get current timeout in code:**
```python
from apps.auth.models import SessionPolicy
timeout_seconds = SessionPolicy.get_current_timeout()
```

**To update timeout programmatically:**
```python
policy = SessionPolicy.objects.first()
policy.session_timeout_minutes = 15
policy.updated_by = request.user
policy.save()
```

---

## Support & Troubleshooting

### Common Issues

**Issue**: "Invalid timeout value" error
**Solution**: Only use values: 5, 10, 15, 20, 25, 30

**Issue**: Changes don't affect my current session
**Solution**: Expected behavior. Log out and back in to get new timeout

**Issue**: Password field shows old password
**Solution**: Fixed in this update. Clear browser cache if issue persists

**Issue**: Permission denied when trying to update
**Solution**: Requires CanManageUsers permission. Contact admin

---

## Future Enhancements (Roadmap)

Potential future additions:
- Per-role timeout settings
- Auto-extend session on user activity
- Inactivity warning popup (e.g., "Session expires in 2 minutes")
- Session analytics dashboard
- Custom timeout values (not just predefined)
- Time-based policies (different timeouts by time of day)

---

## Version Information

**Feature Version**: 1.0
**Last Updated**: 2025-11-11
**Django Version**: 4.2+
**React Version**: 18+
**Database**: PostgreSQL

---

## Credits

Developed for Cipla Document Management System (DMS)
Implements 21 CFR Part 11 compliance features
Enhances security and audit capabilities
