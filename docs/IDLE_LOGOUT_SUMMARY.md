# Idle Logout Feature - Quick Summary

## What Was Implemented

Automatic logout functionality that detects user inactivity and logs out users after the configured session timeout period.

## Key Features

✅ **Idle Detection**
- Monitors mouse, keyboard, touch, and scroll events
- Uses session timeout configured in Security Policies (5-30 minutes)
- Timer resets on any user activity

✅ **Warning System**
- Shows toast notification 1 minute before logout
- Gives user chance to stay active

✅ **Automatic Logout**
- Logs out user when idle timeout reached
- Clears authentication tokens
- Redirects to login page with context

✅ **Session Expiry Handling**
- Intercepts 401 responses from API
- Attempts token refresh
- Shows expiry message if refresh fails
- Graceful error handling

## How It Works

### For Users
1. Login to system
2. Work normally - timer resets on any interaction
3. If idle for (timeout - 1 minute), see warning toast
4. If still idle after 1 more minute, automatic logout occurs
5. Shown clear message about reason for logout

### For Admins
1. Configure timeout in **User Management** → **Admin** → **Security Policies**
2. Choose from 5-30 minute options
3. Changes apply to idle detection immediately

## Files Created

- `Frontend/src/hooks/useIdleTimeout.ts` - Idle detection hook

## Files Modified

- `Frontend/src/App.tsx` - Integrated idle timeout
- `Frontend/src/services/api.ts` - Added session expiry handling

## Technical Implementation

### useIdleTimeout Hook
```typescript
useIdleTimeout({
  timeoutMinutes: sessionTimeout,  // From security policies
  enabled: isAuthenticated && !!user,  // Only when logged in
})
```

**Monitors these events:**
- mousedown, mousemove
- keypress, click
- scroll, touchstart

**Timer behavior:**
- Starts when user logs in
- Resets on any tracked event
- Warning at (timeout - 1 minute)
- Logout at timeout

### Integration in App.tsx
```typescript
const { data: securityPolicies } = useSecurityPolicies();
const sessionTimeout = securityPolicies?.session_policy?.session_timeout_minutes || 30;

useIdleTimeout({
  timeoutMinutes: sessionTimeout,
  enabled: isAuthenticated && !!user,
});
```

### API Session Expiry
```typescript
// In api.ts response interceptor
catch (refreshError) {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');

  toast.error('Your session has expired. Please login again.');

  setTimeout(() => {
    window.location.href = '/login';
  }, 500);
}
```

## User Experience

### Scenario 1: Active User
```
User logs in
    ↓
Works continuously
    ↓
[Timer keeps resetting]
    ↓
No interruption
```

### Scenario 2: Idle User
```
User logs in
    ↓
Works for 5 minutes
    ↓
Becomes idle (no interaction)
    ↓
[Timeout - 1 minute] → ⏰ Warning Toast
    ↓
[1 minute later] → 🚪 Automatic Logout
    ↓
❌ "Session expired due to inactivity"
    ↓
Redirected to login
```

### Scenario 3: User Returns Before Timeout
```
User becomes idle
    ↓
[14 minutes pass]
    ↓
⏰ Warning appears
    ↓
👆 User moves mouse
    ↓
✓ Timer resets
    ↓
User continues working
```

## Toast Notifications

| Type | Message | Duration | Color |
|------|---------|----------|-------|
| Warning | "Your session will expire in 1 minute due to inactivity." | 60s | Yellow |
| Idle Timeout | "Session expired due to inactivity. Please login again." | 5s | Red |
| API Expiry | "Your session has expired. Please login again." | 5s | Red |

## Security Benefits

1. **Prevents Unauthorized Access**
   - Abandoned sessions automatically closed
   - Reduces session hijacking risk

2. **Compliance**
   - Meets security standards for automatic logout
   - All logouts logged in audit trail

3. **Resource Management**
   - Cleans up idle sessions
   - Manages concurrent session limits

## Testing

### Quick Test
1. Login with short timeout (5 minutes for testing)
2. Don't interact with system
3. After 4 minutes → verify warning appears
4. After 5 minutes → verify automatic logout
5. Verify redirected to login with message

### Activity Reset Test
1. Login with 5-minute timeout
2. Wait 4 minutes (warning appears)
3. Move mouse or click
4. Verify timer resets (no logout)
5. Continue working normally

## Configuration

Admins can adjust timeout in Security Policies:
- **5 minutes** - Very high security
- **10 minutes** - High security
- **15 minutes** - Elevated security
- **20 minutes** - Moderate security
- **25 minutes** - Standard security
- **30 minutes** - Default

## Status

✅ **COMPLETE** - Production Ready

All components:
- ✅ Implemented
- ✅ Integrated with authentication
- ✅ Respects admin-configured timeout
- ✅ User-friendly warnings
- ✅ Comprehensive error handling
- ✅ Fully documented

## Related Documentation

- [IDLE_LOGOUT_FEATURE.md](IDLE_LOGOUT_FEATURE.md) - Detailed technical documentation
- [SESSION_TIMEOUT_SUMMARY.md](SESSION_TIMEOUT_SUMMARY.md) - Session timeout configuration
- [IDLE_LOGOUT_FEATURE.md](IDLE_LOGOUT_FEATURE.md) - Full implementation guide

## Summary

The automatic idle logout feature provides enhanced security by:
- Detecting user inactivity automatically
- Warning users before logout (1 minute)
- Logging out idle sessions securely
- Respecting admin-configured timeouts
- Handling session expiry gracefully

All three user requests have been successfully implemented:
1. ✅ Session timeout management with admin UI
2. ✅ Timeout options adjusted to 5-30 minutes
3. ✅ Automatic idle logout functionality
