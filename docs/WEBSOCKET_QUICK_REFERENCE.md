# WebSocket Integration - Quick Reference

## At a Glance

**Current Issue**: Manual page reloads and refetches on every POST request.  
**Solution**: Real-time WebSocket updates to keep all connected users in sync.  
**Timeline**: ~2-3 weeks for full implementation.  
**Complexity**: Medium (requires ASGI migration + signal handlers + consumer hooks).

---

## 1. PROBLEM STATEMENT

### Current User Experience (Bad)
```
User A approves request → Backend updates DB → User B still sees old status
User A has to wait for:
  1. POST response (200ms)
  2. Manual invalidateQueries (100ms)
  3. Background refetch (500ms)
  4. New UI render (100ms)
  = 900ms total delay + stale data for other users

OR: Page reloads (hardcoded in App.tsx) = 2-3 seconds + context loss
```

### Expected User Experience (Good)
```
User A approves request → Backend updates DB + broadcasts via WebSocket
User B's browser receives message within 50-100ms
User B's React Query auto-invalidates
User B's UI updates in real-time
= Seamless multi-user experience
```

---

## 2. CRITICAL ENDPOINTS NEEDING REAL-TIME BROADCAST

### Requests App (HIGHEST PRIORITY)
| Endpoint | Method | Broadcast On | Receivers |
|----------|--------|--------------|-----------|
| `/api/requests/*/approve/` | POST | Request.status → Approved | Unit users |
| `/api/requests/*/reject/` | POST | Request.status → Rejected | Unit users |
| `/api/requests/*/send-back/` | POST | SendBack created | Requester + approvers |
| `/api/requests/*/allocate-storage/` | POST | Request.storage updated | Unit users |
| `/api/requests/*/issue/` | POST | Request.status → Issued | Unit users |
| `/api/requests/*/return/` | POST | Request.status → Returned | Unit users |
| `/api/requests/storage/update/` | PATCH | Request updated | Unit users |
| `/api/requests/withdrawal/update/` | PATCH | Request updated | Unit users |
| `/api/requests/destruction/update/` | PATCH | Request updated | Unit users |

### Documents App
| Endpoint | Broadcast On | Receivers |
|----------|--------------|-----------|
| `/api/documents/crates/*/relocate/` | Crate.storage updated | Unit users |
| POST `/api/documents/crates/` | Crate created | Unit users |
| PUT `/api/documents/crates/{id}/` | Crate updated | Unit users |

### Storage App
| Endpoint | Broadcast On | Receivers |
|----------|--------------|-----------|
| POST `/api/storage/` | Storage created | Unit admins |
| PUT `/api/storage/{id}/` | Storage updated | Unit admins |

---

## 3. ARCHITECTURE DECISIONS

### Channel Layer
- **Technology**: Django Channels 4.0
- **Message Broker**: Redis (already configured!)
- **ASGI Server**: Daphne 4.0

### WebSocket URL Patterns
```
/ws/requests/{unit_id}/              # Request updates (any user in unit)
/ws/crates/{unit_id}/                # Crate updates (any user in unit)
/ws/notifications/{user_id}/         # Personal notifications (SendBack, etc.)
```

### Message Format
```json
{
  "type": "request.updated",
  "action": "approved|rejected|issued|returned|sent_back",
  "request_id": 123,
  "status": "Approved",
  "updated_at": "2025-11-14T12:34:56Z",
  "updated_by": "user_name",
  "data": {
    "id": 123,
    "request_type": "Withdrawal",
    "status": "Approved",
    ...
  }
}
```

### Channel Groups
- `requests_unit_{unit_id}` → All requests updates for a unit
- `crates_unit_{unit_id}` → All crates updates for a unit
- `notifications_user_{user_id}` → Personal notifications

### Authentication
- JWT token passed in WebSocket URL query param: `?token=...`
- Validate on consumer `connect()`
- Reject connection if token invalid/expired
- Reuse existing Django JWT settings

---

## 4. IMPLEMENTATION PHASES

### Phase 1: Backend Infrastructure (2-3 days)
1. Add to `requirements.txt`:
   ```
   channels==4.0.0
   daphne==4.0.0
   channels-redis==4.1.0
   ```

2. Create `/backend/config/routing.py` (WebSocket routes)

3. Create `/backend/apps/requests/consumers.py` (RequestConsumer)

4. Create `/backend/apps/documents/consumers.py` (CrateConsumer)

5. Update `/backend/config/asgi.py` (ASGI routing)

6. Update `/backend/config/settings.py`:
   ```python
   INSTALLED_APPS = [
       'daphne',  # MUST be first!
       'channels',
       ...
   ]
   ASGI_APPLICATION = 'config.asgi.application'
   CHANNEL_LAYERS = {
       "default": {
           "BACKEND": "channels_redis.core.RedisChannelLayer",
           "CONFIG": {
               "hosts": [("127.0.0.1", 6379)],
           },
       },
   }
   ```

7. Create signal handlers in:
   - `/backend/apps/requests/signals.py`
   - `/backend/apps/documents/signals.py`

### Phase 2: Frontend WebSocket Connection (1-2 days)
1. Create `/frontend/src/services/websocket.ts` (connection manager)

2. Create `/frontend/src/hooks/useWebSocket.ts` (core hook)

3. Create `/frontend/src/context/WebSocketContext.tsx` (state management)

4. Integrate into `AuthContext` - connect on login, disconnect on logout

### Phase 3: Data Synchronization (2-3 days)
1. Create `/frontend/src/hooks/useRequestUpdates.ts` (subscribe to request changes)

2. Create `/frontend/src/hooks/useCrateUpdates.ts` (subscribe to crate changes)

3. Integrate with existing React Query hooks:
   - `useRequests()` → Listen to WebSocket messages
   - `useCrates()` → Listen to WebSocket messages
   - Mutation hooks → Auto-invalidate on message

4. Create `/frontend/src/hooks/useNotifications.ts` (SendBack notifications)

### Phase 4: UI Updates (1-2 days)
1. Modify `/frontend/src/components/Transaction.tsx`:
   - Remove manual `refetch()` calls
   - Remove page reload workaround
   - Add real-time update indicators

2. Update Dashboard for real-time KPI changes

3. Update AuditTrail for real-time log additions

### Phase 5: Testing & Deployment (2-3 days)
1. Unit tests for consumers
2. Integration tests for broadcasting
3. E2E tests with multiple browsers
4. Load testing
5. Docker compose update for daphne

**Total**: 2-3 weeks

---

## 5. KEY IMPLEMENTATION DETAILS

### Backend: Signal Handler Pattern
```python
# /backend/apps/requests/signals.py
from django.db.models.signals import post_save
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

@receiver(post_save, sender=Request)
def request_changed(sender, instance, created, **kwargs):
    # Broadcast to all users in this unit
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"requests_unit_{instance.unit_id}",
        {
            "type": "request.updated",
            "request_id": instance.id,
            "status": instance.status,
            "data": RequestSerializer(instance).data,
        }
    )
```

### Backend: Consumer Pattern
```python
# /backend/apps/requests/consumers.py
class RequestConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Validate JWT token
        # Extract unit_id from URL
        # Join channel group
        await self.channel_layer.group_add(
            f"requests_unit_{self.unit_id}",
            self.channel_name
        )
        await self.accept()
    
    async def request_updated(self, event):
        # Send message to WebSocket
        await self.send(json.dumps(event))
```

### Frontend: Hook Pattern
```typescript
// /frontend/src/hooks/useRequestUpdates.ts
export function useRequestUpdates(unitId?: number) {
  const queryClient = useQueryClient();
  const { ws } = useWebSocket();
  
  useEffect(() => {
    if (!unitId || !ws) return;
    
    const handleMessage = (event: MessageEvent) => {
      const message = JSON.parse(event.data);
      
      if (message.type === "request.updated") {
        // Invalidate React Query cache
        queryClient.invalidateQueries({ 
          queryKey: ['requests'] 
        });
      }
    };
    
    ws.addEventListener('message', handleMessage);
    return () => ws.removeEventListener('message', handleMessage);
  }, [unitId, ws, queryClient]);
}
```

---

## 6. FILE CHECKLIST

### Create These Files
- [ ] `/backend/config/routing.py`
- [ ] `/backend/apps/requests/consumers.py`
- [ ] `/backend/apps/documents/consumers.py`
- [ ] `/backend/apps/requests/signals.py`
- [ ] `/backend/apps/documents/signals.py`
- [ ] `/frontend/src/services/websocket.ts`
- [ ] `/frontend/src/hooks/useWebSocket.ts`
- [ ] `/frontend/src/hooks/useRequestUpdates.ts`
- [ ] `/frontend/src/hooks/useCrateUpdates.ts`
- [ ] `/frontend/src/hooks/useNotifications.ts`
- [ ] `/frontend/src/context/WebSocketContext.tsx`
- [ ] `/frontend/src/utils/websocket-client.ts`
- [ ] `/frontend/src/types/websocket.ts`

### Modify These Files
- [ ] `/backend/requirements.txt` - Add channels, daphne, channels-redis
- [ ] `/backend/config/settings.py` - Add INSTALLED_APPS, CHANNEL_LAYERS
- [ ] `/backend/config/asgi.py` - Add WebSocket support
- [ ] `/backend/config/urls.py` - (No changes needed)
- [ ] `/frontend/src/context/AuthContext.tsx` - Initialize WebSocket on login
- [ ] `/frontend/src/components/Transaction.tsx` - Remove manual refetch
- [ ] `/frontend/src/components/Dashboard.tsx` - Real-time KPI updates
- [ ] `/frontend/src/types/index.ts` - Add WebSocket types

---

## 7. COMMON ISSUES & SOLUTIONS

| Issue | Cause | Solution |
|-------|-------|----------|
| "No channel layer" error | Redis not running | `redis-server` or Docker redis |
| WebSocket 404 | routing.py not created | Check ASGI ProtocolTypeRouter |
| Data not syncing | signal not registered | Add to `apps.py` `ready()` method |
| "Permission denied" | JWT invalid | Pass valid token in query param |
| Messages not received | Not in channel group | Check group_send unit_id matches |
| High latency | Network issue | Check Redis connection, firewall |
| Memory leak | Consumer not disconnecting | Verify group_discard in disconnect() |

---

## 8. TESTING CHECKLIST

### Unit Tests
- [ ] Consumer authentication with valid/invalid tokens
- [ ] Consumer group join/leave
- [ ] Message serialization
- [ ] Signal triggers on model save

### Integration Tests
- [ ] Two browsers, same unit, request approval → both get update
- [ ] Two users, different units → no cross-unit updates
- [ ] Connection drops → auto-reconnect with exponential backoff
- [ ] Logout → connection closes

### E2E Tests
- [ ] User A approves request → User B sees update immediately
- [ ] Storage allocation → Store Head sees location assigned
- [ ] SendBack created → Requester notified in real-time
- [ ] Crate relocation → Unit admins see new location

### Load Tests
- [ ] 100 concurrent connections, 1 request/second broadcasts
- [ ] Memory usage stable
- [ ] Message latency < 200ms (p95)

---

## 9. DEPLOYMENT CHANGES

### Docker Compose Update
```yaml
services:
  backend:
    build: ./backend
    command: daphne -b 0.0.0.0 -p 8000 config.asgi:application
    # Instead of: python manage.py runserver
```

### Environment Variables
```
# Already exists
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0

# These will be used for Django Channels
# (uses same Redis, different DB/namespace)
```

### Production Deployment
- Use Daphne in production (not manage.py runserver)
- Ensure Redis is highly available
- Monitor WebSocket connection count
- Set connection timeout (e.g., 30 minutes)

---

## 10. SUCCESS METRICS

After implementation, you should see:

1. **Performance**: Request approval updates all connected users within 100ms
2. **UX**: No page reloads, no manual refetch needed
3. **Scalability**: Support 100+ concurrent WebSocket connections per server
4. **Reliability**: 99%+ message delivery with automatic reconnection
5. **Compliance**: All changes logged in audit trail
6. **Unit Isolation**: Data strictly isolated by unit (no cross-unit leakage)

---

## QUICK START COMMAND REFERENCE

```bash
# Start backend with WebSocket support
cd backend
daphne -b 0.0.0.0 -p 8000 config.asgi:application

# Or with development server
python manage.py runserver --settings=config.settings

# Ensure Redis is running
redis-server

# Start frontend
cd frontend
npm run dev
```

---

## References
- Django Channels: https://channels.readthedocs.io/
- Daphne: https://github.com/django/daphne
- Channels Redis: https://github.com/django/channels_redis
- React Query Invalidation: https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults
