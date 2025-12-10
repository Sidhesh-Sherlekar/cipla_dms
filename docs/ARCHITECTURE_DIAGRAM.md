# Cipla DMS Architecture - WebSocket Integration Points

## Current Architecture (Before WebSocket)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React + Vite)                      │
│                                                                       │
│  Components (Transaction, Dashboard, AuditTrail, etc.)              │
│         │                                                             │
│         ├─────────────→ useRequests() hook                          │
│         │                   │                                         │
│         │                   ├─→ useQuery (TanStack React Query)      │
│         │                   └─→ Manual refetch on mutation success   │
│         │                                                             │
│         ├─────────────→ useCrates() hook                            │
│         │                   │                                         │
│         │                   ├─→ useQuery                             │
│         │                   └─→ Manual refetch                       │
│         │                                                             │
│         └─────────────→ Mutation Hooks (useApproveRequest, etc.)    │
│                             │                                         │
│                             └─→ axios.post/patch                     │
│                                  │                                    │
│                                  └─→ invalidateQueries (on success)   │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                          HTTP/HTTPS (REST)
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    BACKEND (Django REST API)                         │
│                                                                       │
│  Settings: Django 5.1, DRF 3.15                                     │
│                                                                       │
│  Routes:                                                             │
│    ├─ /api/requests/           ◄─── POST/PATCH/GET                 │
│    │   ├─ approve/             ◄─── Requires digital signature      │
│    │   ├─ reject/              ◄─── Requires digital signature      │
│    │   ├─ send-back/           ◄─── Requires digital signature      │
│    │   ├─ allocate-storage/                                          │
│    │   ├─ issue/               ◄─── Issue documents (withdrawal)    │
│    │   └─ return/              ◄─── Return documents                │
│    │                                                                  │
│    ├─ /api/documents/crates/   ◄─── POST/PUT/DELETE                │
│    │   └─ relocate/            ◄─── Move crate to new storage       │
│    │                                                                  │
│    ├─ /api/storage/            ◄─── POST/PUT/DELETE                │
│    │   └─ bulk-create/         ◄─── Create multiple locations       │
│    │                                                                  │
│    └─ /api/auth/, /api/audit/, /api/reports/                       │
│                                                                       │
│  Database:                                                           │
│    ├─ Request (Status: Pending → Approved → Issued → Returned)     │
│    ├─ Crate (Status: Active → Withdrawn → Archived → Destroyed)    │
│    ├─ SendBack (Notifications for request modifications)           │
│    ├─ User (Unit-filtered access)                                   │
│    ├─ Unit (Data isolation boundary)                                │
│    └─ AuditTrail (Immutable logs)                                   │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Target Architecture (After WebSocket Integration)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React + Vite)                      │
│                                                                       │
│  Components (Transaction, Dashboard, AuditTrail, etc.)              │
│         │                                                             │
│         ├─────────────→ useRequests() hook                          │
│         │                   │                                         │
│         │                   ├─→ useQuery (TanStack React Query)      │
│         │                   └─→ useRequestUpdates() ◄─── NEW        │
│         │                        └─→ WebSocket listener              │
│         │                                                             │
│         ├─────────────→ useCrates() hook                            │
│         │                   │                                         │
│         │                   ├─→ useQuery                             │
│         │                   └─→ useCrateUpdates() ◄─── NEW          │
│         │                        └─→ WebSocket listener              │
│         │                                                             │
│         └─────────────→ Mutation Hooks                               │
│                             │                                         │
│                             └─→ axios.post/patch                     │
│                                  │                                    │
│                                  └─→ Auto-invalidates on message     │
│                                                                       │
│  useWebSocket() Hook (NEW)                                           │
│    ├─ Connect on mount                                               │
│    ├─ JWT authentication in handshake                                │
│    ├─ Exponential backoff reconnection                               │
│    ├─ Unit-based channel subscription                                │
│    └─ Disconnect on logout                                           │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                       HTTP (REST) + WebSocket (Real-time)
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
        REST Endpoints              WebSocket Channels
        (CRUD Operations)           (Real-time Updates)
                                    │
┌─────────────────────────────────────────────────────────────────────┐
│           BACKEND (Django + Channels + ASGI Server)                  │
│                                                                       │
│  ASGI Application (NEW)                                              │
│    ├─ ProtocolTypeRouter                                             │
│    ├─ WebSocket Protocol Handler                                     │
│    └─ AuthMiddlewareStack (JWT token validation)                    │
│                                                                       │
│  WebSocket Consumers (NEW)                                           │
│    │                                                                  │
│    ├─ RequestConsumer (/ws/requests/{unit_id}/)                      │
│    │   ├─ on_connect: Validate token, join unit group               │
│    │   ├─ on_disconnect: Leave group                                 │
│    │   ├─ on_receive: Handle incoming messages                       │
│    │   └─ receive_update: Channel layer receiver                     │
│    │                                                                  │
│    ├─ CrateConsumer (/ws/crates/{unit_id}/)                          │
│    │   └─ Similar pattern for crate updates                          │
│    │                                                                  │
│    └─ NotificationConsumer (/ws/notifications/{user_id}/)            │
│        └─ SendBack notifications, status changes                     │
│                                                                       │
│  Channel Routing (NEW: /backend/config/routing.py)                   │
│    ├─ ws/requests/{unit_id}/ → RequestConsumer                      │
│    ├─ ws/crates/{unit_id}/ → CrateConsumer                          │
│    └─ ws/notifications/{user_id}/ → NotificationConsumer            │
│                                                                       │
│  Signal Handlers (NEW: Broadcast on model changes)                   │
│    │                                                                  │
│    ├─ Request.post_save()                                            │
│    │   └─ Send message to: group_request_{unit_id}                   │
│    │        └─ {"type": "request.updated", "data": {...}}           │
│    │                                                                  │
│    ├─ Crate.post_save()                                              │
│    │   └─ Send message to: group_crate_{unit_id}                     │
│    │        └─ {"type": "crate.updated", "data": {...}}             │
│    │                                                                  │
│    └─ SendBack.post_save()                                           │
│        └─ Send notification to affected users                        │
│                                                                       │
│  REST API (Unchanged)                                                │
│    ├─ /api/requests/                                                 │
│    ├─ /api/documents/                                                │
│    ├─ /api/storage/                                                  │
│    └─ ... (All existing endpoints)                                   │
│                                                                       │
│  Database (Unchanged)                                                │
│    └─ PostgreSQL/SQLite                                              │
│                                                                       │
│  Message Broker (NEW usage)                                          │
│    └─ Redis (for Django Channels layer)                              │
│        ├─ Already configured for Celery                              │
│        └─ New: Channel layer backend                                 │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow: Request Approval (Real-time Example)

### CURRENT FLOW (Manual Refetch)
```
User A (Browser 1)          User B (Browser 2)
    │                             │
    ├─ Click "Approve Request"    │
    ├─ POST /api/requests/1/approve/ (with password)
    │                         ────→ Backend
    │                             │
    │                             ├─ Validate signature
    │                             ├─ Update Request.status = "Approved"
    │                             ├─ Log to audit trail
    │                             └─ Return 200 OK
    │
    ├─ Show "Request Approved" toast
    ├─ invalidateQueries(['requests'])
    ├─ refetch()
    │
    │ User B still sees: "Pending" (STALE DATA!)
    │                             │
    │                             ├─ Manually refresh page
    │                             ├─ Reload all data
    │                             ├─ Now sees "Approved"
    │                             └─ (15 second delay + poor UX)
```

### NEW FLOW (WebSocket Real-time)
```
User A (Browser 1)          User B (Browser 2)     Backend
    │                             │                    │
    ├─ Click "Approve Request"    │                    │
    ├──────────────── HTTP POST ──────────────────────→ │
    │                             │                    │
    │                             │                    ├─ Validate
    │                             │                    ├─ Update Request
    │                             │                    ├─ Emit signal
    │                             │                    │
    │                             │                ┌───┴─────────────┐
    │                             │                │  Signal Handler │
    │                             │                └─────┬───────────┘
    │                             │                      │
    │                             │                 ┌────▼──────────┐
    │                             │                 │ Redis Channel │
    │                             │                 │ Layer         │
    │                             │                 └─┬──────────┬──┘
    │                             │                   │          │
    │← OK + invalidateQueries ←───┤                   │          │
    │                             │                   │          │
    │                             ├─WebSocket Message ←│          │
    │                             │  (request.updated)│          │
    │                             │                   │          │
    │                             ├─ Auto-invalidateQueries
    │                             ├─ useQuery refetch (in background)
    │                             ├─ Update UI immediately
    │                             ├─ Show toast: "Request Approved"
    │                             │
    │                             └─ BOTH USERS NOW SEE UPDATED DATA
    │                                  (Real-time, 50-100ms latency)
```

## File Structure: Current vs. New

### BACKEND

```
/backend
├── config/
│   ├── settings.py              (Add INSTALLED_APPS: 'daphne', 'channels')
│   ├── asgi.py                  (REPLACE with WebSocket support)
│   ├── urls.py                  (Unchanged)
│   ├── wsgi.py                  (Keep as fallback)
│   └── routing.py               (NEW - WebSocket routing)
│
├── apps/
│   ├── requests/
│   │   ├── models.py            (Unchanged)
│   │   ├── views.py             (Unchanged - signal handlers trigger broadcasts)
│   │   ├── serializers.py       (Unchanged)
│   │   ├── urls.py              (Unchanged)
│   │   ├── consumers.py         (NEW - RequestConsumer)
│   │   ├── signals.py           (NEW or modified - broadcast on Request save)
│   │   └── migrations/
│   │
│   ├── documents/
│   │   ├── models.py            (Unchanged)
│   │   ├── views.py             (Unchanged)
│   │   ├── consumers.py         (NEW - CrateConsumer)
│   │   └── signals.py           (NEW - broadcast on Crate save)
│   │
│   ├── storage/
│   │   ├── models.py            (Unchanged)
│   │   ├── views.py             (Unchanged)
│   │   └── signals.py           (NEW or modified)
│   │
│   └── auth/
│       ├── models.py            (Unchanged)
│       ├── views.py             (Unchanged)
│       ├── auth_middleware.py   (NEW - WebSocket JWT validation)
│       └── signals.py           (Modified - broadcast on User/Unit changes)
│
├── requirements.txt             (Add: channels, daphne, channels-redis)
├── manage.py                    (Unchanged)
└── middleware/
    └── websocket_auth.py        (NEW - JWT validation for WebSocket)
```

### FRONTEND

```
/frontend/src
├── services/
│   ├── api.ts                   (Unchanged)
│   ├── auth.ts                  (Unchanged)
│   └── websocket.ts             (NEW - WebSocket client)
│
├── hooks/
│   ├── useRequests.ts           (Modified - add useRequestUpdates hook)
│   ├── useCrates.ts             (Modified - add useCrateUpdates hook)
│   ├── useWebSocket.ts          (NEW - Core WebSocket connection)
│   ├── useRequestUpdates.ts     (NEW - Subscribe to request updates)
│   ├── useCrateUpdates.ts       (NEW - Subscribe to crate updates)
│   └── useNotifications.ts      (NEW - Handle SendBack/notifications)
│
├── context/
│   ├── AuthContext.tsx          (Unchanged)
│   └── WebSocketContext.tsx     (NEW - WebSocket connection state)
│
├── components/
│   ├── Transaction.tsx          (Modified - remove manual refetch)
│   ├── Dashboard.tsx            (Modified - subscribe to KPI updates)
│   ├── AuditTrail.tsx           (Modified - real-time audit log)
│   └── ...
│
├── types/
│   ├── index.ts                 (Add: WebSocketMessage, UpdateEvent types)
│   └── websocket.ts             (NEW - WebSocket message types)
│
└── utils/
    └── websocket-client.ts      (NEW - Connection manager, reconnection logic)
```

## Key Files to Create/Modify

### Priority 1 (Core WebSocket)
1. `/backend/config/routing.py` (NEW)
2. `/backend/apps/requests/consumers.py` (NEW)
3. `/backend/config/asgi.py` (MODIFY)
4. `/frontend/src/hooks/useWebSocket.ts` (NEW)
5. `/backend/requirements.txt` (MODIFY - add packages)

### Priority 2 (Data Sync)
6. `/backend/apps/requests/signals.py` (NEW/MODIFY)
7. `/backend/apps/documents/signals.py` (NEW/MODIFY)
8. `/frontend/src/hooks/useRequestUpdates.ts` (NEW)
9. `/frontend/src/hooks/useCrateUpdates.ts` (NEW)

### Priority 3 (Enhancement)
10. `/frontend/src/context/WebSocketContext.tsx` (NEW)
11. `/frontend/src/components/Transaction.tsx` (MODIFY)
12. `/backend/middleware/websocket_auth.py` (NEW)
13. `/frontend/src/utils/websocket-client.ts` (NEW)

## Testing Strategy

1. **Unit Tests**:
   - WebSocket consumer authentication
   - Channel group management
   - Message formatting

2. **Integration Tests**:
   - Multiple browser tabs same unit
   - Multiple users different units
   - Data isolation verification
   - Reconnection after network failure

3. **E2E Tests**:
   - Request approval flow (real-time for all users)
   - Crate relocation (Storage head sees update immediately)
   - SendBack notifications
   - Audit trail updates

4. **Performance Tests**:
   - Message throughput
   - Latency measurement
   - Memory usage under load
   - Reconnection overhead
