# Session Timeout Feature - Quick Summary

## What Was Implemented

Added a dynamic session timeout management feature to the Security Policies section that allows administrators to change the system-wide session timeout without restarting the server.

## Key Features

### Predefined Timeout Options
- 15 minutes (high security)
- 30 minutes (default)
- 1 hour
- 2 hours
- 4 hours
- 8 hours (full workday)

### Capabilities
✅ Change timeout without server restart
✅ Immediate effect on new sessions
✅ Admin-only access
✅ Full audit trail logging
✅ User-friendly dropdown UI
✅ Database-driven (not hardcoded)

## How to Use

### For Administrators

1. Navigate to **User Management** → **Admin** tab
2. Click **Security Policies** sub-tab
3. Find **Session Policy** card
4. Use the **Session Timeout** dropdown to select desired timeout
5. Change applies immediately to new sessions

### Visual Location

```
User Management
  └─ Admin Tab
      └─ Security Policies Tab
          └─ Session Policy Card
              └─ Session Timeout Dropdown  <-- HERE
```

## Technical Implementation

### Backend (Django)
- **Model**: `SessionPolicy` - Stores timeout in database
- **Middleware**: `DynamicSessionTimeoutMiddleware` - Enforces timeout on every request
- **API**: `POST /api/auth/session-timeout/` - Updates timeout
- **Migration**: Creates `session_policy` table

### Frontend (React + TypeScript)
- **Hook**: `useUpdateSessionTimeout()` - Mutation hook
- **UI**: Dropdown selector in Security Policies tab
- **Toast**: Success/error notifications

## Session Behavior

### New Sessions (After Change)
- ✅ Use the new timeout immediately
- ✅ No server restart needed
- ✅ Applies to all new logins

### Existing Sessions (Before Change)
- ⏳ Keep their original timeout
- ⏳ Must log out and back in to get new timeout
- ⏳ Will expire based on original setting

## Security

### Permissions Required
- Must be authenticated
- Must have `CanManageUsers` permission
- Typically Admin or System Administrator role

### Audit Trail
All changes logged with:
- Who made the change
- Old and new timeout values
- When the change was made
- IP address of admin

Example audit log:
```
Action: Updated
User: admin@example.com
Message: Session timeout changed from 30 minutes to 60 minutes by admin
Timestamp: 2025-11-11 17:00:00
```

## API Endpoints

### Get Current Settings
```
GET /api/auth/security-policies/
```

Returns timeout options and current value.

### Update Timeout
```
POST /api/auth/session-timeout/
Body: { "session_timeout_minutes": 60 }
```

Updates timeout and returns old/new values.

## Files Modified

### Backend
- `apps/auth/models.py` - SessionPolicy model
- `apps/auth/serializers.py` - SessionPolicySerializer
- `apps/auth/views.py` - API endpoints
- `apps/auth/urls.py` - URL routes
- `apps/auth/middleware.py` - Dynamic timeout middleware
- `config/settings.py` - Middleware registration
- `apps/auth/migrations/0010_sessionpolicy.py` - Database migration

### Frontend
- `src/hooks/useGroups.ts` - API hook
- `src/components/UserManagement.tsx` - UI dropdown

## Testing

### Quick Test
1. Login as admin
2. Go to User Management → Admin → Security Policies
3. Change Session Timeout to "1 hour"
4. Verify success toast
5. Check audit trail for logged change

### Verify Middleware
```python
# Backend shell
from apps.auth.models import SessionPolicy
SessionPolicy.get_current_timeout()  # Returns timeout in seconds
```

## Status

✅ **COMPLETE** - All components implemented and tested
✅ Backend API working
✅ Frontend UI functional
✅ Middleware enforcing timeouts
✅ Audit trail logging
✅ Documentation complete

## Next Steps (Optional Enhancements)

1. Per-user or per-role timeouts
2. Auto-extend session on activity
3. Inactivity warning popup
4. Session analytics dashboard
5. Custom timeout values (not just predefined)

## Support

For detailed technical documentation, see [SESSION_TIMEOUT_FEATURE.md](SESSION_TIMEOUT_FEATURE.md)

For issues or questions:
- Check audit trail for timeout changes
- Verify user has CanManageUsers permission
- Ensure migration was applied
- Confirm SessionPolicy record exists in database
