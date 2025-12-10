# Session Timeout Feature - Flow Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User Management Component                                       │
│  └─ Security Policies Tab                                        │
│      └─ Session Policy Card                                      │
│          └─ [Dropdown Selector]  ◄─── Timeout Options           │
│                 │                                                │
│                 │ onChange                                       │
│                 ▼                                                │
│          useUpdateSessionTimeout()                              │
│                 │                                                │
│                 │ POST /api/auth/session-timeout/               │
│                 │ { session_timeout_minutes: 60 }               │
│                 ▼                                                │
└─────────────────────────────────────────────────────────────────┘
                  │
                  │ HTTP Request
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND (Django)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  API Endpoint: update_session_timeout()                         │
│  └─ Validates user has CanManageUsers permission                │
│  └─ Validates timeout is one of predefined choices              │
│  └─ Updates SessionPolicy in database                           │
│  └─ Logs change in audit trail                                  │
│                 │                                                │
│                 ▼                                                │
│  ┌──────────────────────────────────────────────────┐          │
│  │         SessionPolicy Model (Database)            │          │
│  │  ┌────────────────────────────────────────────┐  │          │
│  │  │ id: 1                                      │  │          │
│  │  │ session_timeout_minutes: 60                │  │          │
│  │  │ updated_at: 2025-11-11 17:00:00           │  │          │
│  │  │ updated_by: admin (User ID 1)             │  │          │
│  │  └────────────────────────────────────────────┘  │          │
│  └──────────────────────────────────────────────────┘          │
│                 │                                                │
└─────────────────┼────────────────────────────────────────────────┘
                  │
                  │ On Every Request
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                   MIDDLEWARE LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  DynamicSessionTimeoutMiddleware                                │
│  ├─ Runs on EVERY incoming request                              │
│  ├─ Queries SessionPolicy.objects.first()                       │
│  ├─ Gets current timeout (e.g., 60 minutes)                     │
│  ├─ Converts to seconds (60 * 60 = 3600)                        │
│  └─ Sets request.session.set_expiry(3600)                       │
│                 │                                                │
│                 ▼                                                │
│  User's Session Updated with New Timeout                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## User Flow - Admin Changes Timeout

```
┌──────────────────────────────────────────────────────────────────┐
│                      ADMIN CHANGES TIMEOUT                        │
└──────────────────────────────────────────────────────────────────┘

1. Admin User                    2. Frontend                3. Backend
   ┌──────────┐                    ┌──────────┐              ┌──────────┐
   │          │                    │          │              │          │
   │  Clicks  │ ──────────────────►│ Dropdown │              │          │
   │ Dropdown │                    │  Opens   │              │          │
   │          │                    │          │              │          │
   │          │                    │ Shows:   │              │          │
   │          │                    │ • 15 min │              │          │
   │          │                    │ • 30 min │              │          │
   │          │                    │ • 60 min │◄──── Current │          │
   │          │                    │ • 2 hrs  │              │          │
   │          │                    │ • 4 hrs  │              │          │
   │          │                    │ • 8 hrs  │              │          │
   │          │                    │          │              │          │
   │ Selects  │ ──────────────────►│          │              │          │
   │ "2 hours"│                    │ Calls    │──────────────►│ Receives │
   │          │                    │ API Hook │ POST Request │ Request  │
   │          │                    │          │              │          │
   │          │                    │          │              │ Validates│
   │          │                    │          │              │ • Auth   │
   │          │                    │          │              │ • Perms  │
   │          │                    │          │              │ • Value  │
   │          │                    │          │              │          │
   │          │                    │          │              │ Updates  │
   │          │                    │          │              │ Database │
   │          │                    │          │              │          │
   │          │                    │          │              │ Logs to  │
   │          │                    │          │              │ Audit    │
   │          │                    │          │              │ Trail    │
   │          │                    │          │              │          │
   │          │                    │ Success! │◄──────────────│ Returns  │
   │ Sees     │◄───────────────────│ Toast    │              │ Success  │
   │ Toast    │  "Timeout updated  │ Shown    │              │          │
   │ Message  │   successfully"    │          │              │          │
   │          │                    │          │              │          │
   └──────────┘                    └──────────┘              └──────────┘
```

## Session Behavior Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                   BEFORE TIMEOUT CHANGE                           │
│                   (Timeout = 30 minutes)                          │
└──────────────────────────────────────────────────────────────────┘

User A                          User B                    User C
Logged in 10 min ago           Logged in 5 min ago       Not logged in yet
┌──────────────┐               ┌──────────────┐          ┌──────────────┐
│ Session      │               │ Session      │          │              │
│ Timeout: 30  │               │ Timeout: 30  │          │  No session  │
│ Expires in:  │               │ Expires in:  │          │     yet      │
│   20 min     │               │   25 min     │          │              │
└──────────────┘               └──────────────┘          └──────────────┘

       │                              │                          │
       │                              │                          │
       ▼                              ▼                          ▼

┌──────────────────────────────────────────────────────────────────┐
│           ADMIN CHANGES TIMEOUT TO 120 MINUTES (2 HOURS)          │
└──────────────────────────────────────────────────────────────────┘

       │                              │                          │
       │                              │                          │
       ▼                              ▼                          ▼

┌──────────────────────────────────────────────────────────────────┐
│                    AFTER TIMEOUT CHANGE                           │
│                   (Timeout = 120 minutes)                         │
└──────────────────────────────────────────────────────────────────┘

User A                          User B                    User C
Still using old session        Still using old session   Now logs in
┌──────────────┐               ┌──────────────┐          ┌──────────────┐
│ Session      │               │ Session      │          │ NEW Session  │
│ Timeout: 30  │  ◄───┐        │ Timeout: 30  │  ◄───┐   │ Timeout: 120 │
│ (unchanged)  │      │        │ (unchanged)  │      │   │ (new value!) │
│ Expires in:  │      │        │ Expires in:  │      │   │ Expires in:  │
│   15 min     │      │        │   20 min     │      │   │   120 min    │
└──────────────┘      │        └──────────────┘      │   └──────────────┘
                      │                              │
             Keeps original timeout        Keeps original timeout
                      │                              │
                      ▼                              ▼
           Will expire in 15 min         Will expire in 20 min
                      │                              │
                      ▼                              ▼
              Must log out/in to                Must log out/in to
              get 120 min timeout               get 120 min timeout
```

## Request Lifecycle with Middleware

```
┌──────────────────────────────────────────────────────────────────┐
│               EVERY INCOMING HTTP REQUEST                         │
└──────────────────────────────────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │   Django Request Handler     │
        └──────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  SessionMiddleware           │
        │  (Django built-in)           │
        │  • Loads session data        │
        │  • Creates session object    │
        └──────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │ DynamicSessionTimeout        │
        │ Middleware (CUSTOM)          │
        │                              │
        │ 1. Query database:           │
        │    SessionPolicy.first()     │
        │                              │
        │ 2. Get timeout_minutes: 120  │
        │                              │
        │ 3. Convert to seconds:       │
        │    120 × 60 = 7200 sec       │
        │                              │
        │ 4. Update session:           │
        │    set_expiry(7200)          │
        └──────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  Other Middleware...         │
        │  • CORS                      │
        │  • CSRF                      │
        │  • Auth                      │
        └──────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │     View/API Endpoint        │
        └──────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │    Response with Session     │
        │    Cookie (Max-Age: 7200)    │
        └──────────────────────────────┘
```

## Database Schema Relationship

```
┌─────────────────────────────────────────────────────────────┐
│                      DATABASE TABLES                         │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────┐              ┌──────────────────────┐
│   auth_user          │              │  session_policy      │
├──────────────────────┤              ├──────────────────────┤
│ id (PK)              │◄─────────────│ id (PK)              │
│ username             │  FK          │ session_timeout_min  │
│ full_name            │              │ updated_at           │
│ email                │              │ updated_by_id (FK) ──┘
│ is_superuser         │              └──────────────────────┘
│ ...                  │
└──────────────────────┘                        │
        │                                       │
        │                                       │
        │                                       ▼
        │                         ┌──────────────────────────┐
        │                         │ Single Row (Singleton)   │
        │                         │ ┌──────────────────────┐ │
        │                         │ │ id: 1                │ │
        │                         │ │ timeout: 120         │ │
        │                         │ │ updated: 2025-11-11  │ │
        │                         │ │ by: admin            │ │
        │                         │ └──────────────────────┘ │
        │                         └──────────────────────────┘
        │
        ▼
┌──────────────────────┐
│   audit_trail        │
├──────────────────────┤
│ id (PK)              │
│ user_id (FK)         │
│ action               │──► "Updated"
│ message              │──► "Session timeout changed from 30 to 120"
│ ip_address           │──► "192.168.1.100"
│ created_at           │──► "2025-11-11 17:00:00"
└──────────────────────┘
```

## Security & Audit Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    SECURITY & AUDIT FLOW                          │
└──────────────────────────────────────────────────────────────────┘

Admin attempts to change timeout
         │
         ▼
┌──────────────────────┐
│ Authentication Check │ ──► Not authenticated? ──► 401 Unauthorized
└──────────────────────┘
         │
         │ Authenticated ✓
         ▼
┌──────────────────────┐
│ Permission Check     │ ──► No CanManageUsers? ──► 403 Forbidden
└──────────────────────┘
         │
         │ Has permission ✓
         ▼
┌──────────────────────┐
│ Value Validation     │ ──► Invalid timeout? ──────► 400 Bad Request
└──────────────────────┘
         │
         │ Valid value ✓
         ▼
┌──────────────────────┐
│ Update Database      │
│ • Get old value: 30  │
│ • Set new value: 120 │
│ • Set updated_by     │
│ • Set updated_at     │
└──────────────────────┘
         │
         ▼
┌──────────────────────┐
│ Log Audit Event      │
│ ┌────────────────┐   │
│ │ User: admin    │   │
│ │ Action: Update │   │
│ │ Old: 30 min    │   │
│ │ New: 120 min   │   │
│ │ IP: 192...     │   │
│ │ Time: 17:00    │   │
│ └────────────────┘   │
└──────────────────────┘
         │
         ▼
┌──────────────────────┐
│ Return Success       │ ──► 200 OK + Details
└──────────────────────┘
```

## Complete System Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                      COMPLETE SYSTEM FLOW                           │
└────────────────────────────────────────────────────────────────────┘

                                START
                                  │
                                  ▼
                     ┌────────────────────────┐
                     │  Admin Opens UI        │
                     │  Security Policies Tab │
                     └────────────────────────┘
                                  │
                                  ▼
                     ┌────────────────────────┐
                     │  Frontend Fetches      │
                     │  Current Policies      │
                     │  GET /security-...     │
                     └────────────────────────┘
                                  │
                                  ▼
                     ┌────────────────────────┐
                     │  Backend Returns       │
                     │  • Current: 30 min     │
                     │  • Options: 15,30,60.. │
                     └────────────────────────┘
                                  │
                                  ▼
                     ┌────────────────────────┐
                     │  UI Displays Dropdown  │
                     │  Shows: 30 minutes ▼   │
                     └────────────────────────┘
                                  │
                                  ▼
                     ┌────────────────────────┐
                     │  Admin Selects         │
                     │  "2 hours (120 min)"   │
                     └────────────────────────┘
                                  │
                                  ▼
                     ┌────────────────────────┐
                     │  Frontend Sends        │
                     │  POST /session-timeout │
                     │  {timeout: 120}        │
                     └────────────────────────┘
                                  │
                                  ▼
                     ┌────────────────────────┐
                     │  Backend Validates     │
                     │  • Auth ✓              │
                     │  • Perms ✓             │
                     │  • Value ✓             │
                     └────────────────────────┘
                                  │
                                  ▼
                     ┌────────────────────────┐
                     │  Database Updated      │
                     │  timeout: 30 → 120     │
                     └────────────────────────┘
                                  │
                                  ▼
                     ┌────────────────────────┐
                     │  Audit Trail Logged    │
                     │  "30 min → 120 min"    │
                     └────────────────────────┘
                                  │
                                  ▼
                     ┌────────────────────────┐
                     │  Success Response      │
                     │  200 OK                │
                     └────────────────────────┘
                                  │
                                  ▼
                     ┌────────────────────────┐
                     │  UI Shows Toast        │
                     │  "Timeout updated!"    │
                     └────────────────────────┘
                                  │
                                  ▼
                     ┌────────────────────────┐
                     │  NEW USER LOGS IN      │
                     │                        │
                     └────────────────────────┘
                                  │
                                  ▼
                     ┌────────────────────────┐
                     │  Middleware Runs       │
                     │  • Reads DB: 120 min   │
                     │  • Sets session expiry │
                     └────────────────────────┘
                                  │
                                  ▼
                     ┌────────────────────────┐
                     │  User's Session        │
                     │  Expires in 120 min    │
                     └────────────────────────┘
                                  │
                                  ▼
                                 END
```

## Key Takeaways

1. **Database-Driven**: Timeout stored in database, not config files
2. **Middleware Magic**: Every request gets the latest timeout
3. **Instant Effect**: New logins immediately use new timeout
4. **Existing Sessions**: Keep their original timeout until expiry
5. **Full Audit**: All changes logged with who, what, when, where
6. **Admin Only**: Requires CanManageUsers permission
7. **No Restart**: Changes apply without server restart
