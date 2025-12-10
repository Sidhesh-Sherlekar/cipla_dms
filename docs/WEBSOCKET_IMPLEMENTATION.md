# WebSocket Real-Time Updates Implementation

## Overview

This document describes the WebSocket real-time updates implementation for the Cipla Document Management System. The system now supports true multi-user real-time synchronization, where all connected clients automatically receive updates when any user makes changes.

## Architecture

### Backend (Django Channels)

The backend uses Django Channels to provide WebSocket support:

1. **ASGI Application** (`backend/config/asgi.py`)
   - Routes both HTTP and WebSocket connections
   - Uses `ProtocolTypeRouter` to handle different protocol types
   - Includes authentication middleware for WebSocket connections

2. **Channel Layers** (`backend/config/settings.py`)
   - Redis-backed channel layer for message passing
   - Uses database 1 to separate from Celery (database 0)
   - Enables broadcasting to groups of connected clients

3. **WebSocket Consumer** (`backend/apps/requests/consumers.py`)
   - `UpdatesConsumer`: Handles WebSocket connections
   - Authenticates users via JWT tokens from query string
   - Groups clients by their unit (unit-based isolation)
   - Handles ping/pong for connection health

4. **Signal Handlers** (`backend/apps/requests/signals.py`)
   - Listens to model changes (create, update, delete)
   - Broadcasts updates to relevant unit groups
   - Supports: WithdrawalRequest, DestructionRequest, TransferRequest, SendBackRecord, Crate

5. **Routing Configuration** (`backend/config/routing.py`)
   - Defines WebSocket URL patterns
   - Routes `ws/updates/` to UpdatesConsumer

### Frontend (React + WebSocket)

The frontend automatically connects to WebSocket and handles real-time updates:

1. **WebSocket Context** (`frontend/src/contexts/WebSocketContext.tsx`)
   - Manages WebSocket connection lifecycle
   - Handles authentication via JWT tokens
   - Automatic reconnection with exponential backoff
   - Invalidates React Query cache when updates are received

2. **App Integration** (`frontend/src/App.tsx`)
   - WebSocketProvider wraps the entire app
   - Real-time connection indicator in the header
   - Removed manual page reloads and POST interception

## How It Works

### Connection Flow

1. User logs in and receives JWT access token
2. WebSocketProvider establishes connection to `ws://localhost:8000/ws/updates/?token={accessToken}`
3. Backend authenticates the token and subscribes user to their unit group
4. Connection established message sent to client
5. Heartbeat pings sent every 30 seconds to keep connection alive

### Update Flow

1. Any user makes a change (create/update/delete a request, crate, etc.)
2. Django model signal fires (post_save or post_delete)
3. Signal handler broadcasts update to the unit's channel group
4. All connected WebSocket clients in that unit receive the update
5. Frontend invalidates relevant React Query caches
6. UI automatically refetches and updates

### Unit-Based Isolation

- Each user belongs to a unit (organization)
- WebSocket groups are created per unit: `unit_{unit_id}`
- Users only receive updates for their own unit
- Transfer requests broadcast to both source and destination units

## Features

### Real-Time Updates For

- **Withdrawal Requests**: Create, update, delete, approve, reject, send-back
- **Destruction Requests**: Create, update, delete, approve, reject, send-back
- **Transfer Requests**: Create, update, delete (broadcasts to both units)
- **SendBack Records**: When requests are sent back for modifications
- **Crates**: Status changes, relocations, updates

### Connection Management

- **Automatic reconnection**: Up to 10 attempts with exponential backoff
- **Connection indicator**: Visual badge showing "Live" (green) or "Syncing" (yellow)
- **Heartbeat**: Keeps connection alive with ping/pong every 30 seconds
- **Graceful disconnection**: Cleanup on logout or page close

### Cache Invalidation

When an update is received, the following React Query caches are invalidated:

- `withdrawal-requests`, `withdrawal-request`
- `destruction-requests`, `destruction-request`
- `transfer-requests`, `transfer-request`
- `sendback-records`
- `crates`, `crate`
- `dashboard`
- `summary`

## Installation & Setup

### Backend Dependencies

Add to `backend/requirements.txt`:
```
channels==4.0.0
daphne==4.0.0
channels-redis==4.1.0
```

Install:
```bash
cd backend
pip install -r requirements.txt
```

### Redis Requirement

Redis must be running for channel layers:
```bash
# Start Redis (if not already running)
redis-server

# Or using Docker
docker run -d -p 6379:6379 redis:latest
```

### Running the Server

Use Daphne (ASGI server) instead of Django's development server:

```bash
cd backend
daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

Or for development with auto-reload:
```bash
daphne -b 0.0.0.0 -p 8000 config.asgi:application --reload
```

### Environment Variables

Optional Redis configuration in `.env`:
```
REDIS_URL=redis://localhost:6379/1
```

## Testing

### Manual Testing

1. **Single User Test**:
   - Open the application in one browser
   - Make a change (create/update a request)
   - Verify the UI updates automatically

2. **Multi-User Test**:
   - Open the application in two different browsers (or incognito)
   - Log in as users from the same unit
   - Make a change in one browser
   - Verify the other browser updates automatically

3. **Connection Test**:
   - Check the "Live" badge in the header (green = connected)
   - Open browser console and look for "WebSocket connected" message
   - Stop Redis or backend server
   - Verify the badge changes to "Syncing" (yellow)
   - Restart services and verify reconnection

### Browser Console

Check for these messages:
```
WebSocket connected
WebSocket connection established: Connected to unit {unit_id} updates
Data update received: {entity: "withdrawal", action: "created", ...}
```

## Security

### Authentication

- JWT tokens passed via query string: `?token={accessToken}`
- Tokens validated on connection
- Invalid tokens result in connection rejection (code 4001)

### Authorization

- Users only receive updates for their own unit
- Unit-based channel groups ensure data isolation
- No sensitive data sent in WebSocket messages (only IDs and status)

### Origin Validation

- `AllowedHostsOriginValidator` checks WebSocket origin
- Only allowed hosts can establish connections
- Configured via Django's `ALLOWED_HOSTS` setting

## Performance

### Scalability

- Redis channel layer supports horizontal scaling
- Multiple backend servers can share the same Redis instance
- Channel groups efficiently broadcast to many clients

### Bandwidth

- Minimal data sent per update (~100-200 bytes)
- Only metadata sent (entity type, action, ID, status)
- Full data fetched via REST API only when needed

### Connection Limits

- Default: Unlimited concurrent connections per unit
- Can be limited via Daphne configuration or load balancer
- Recommended: Monitor Redis memory usage in production

## Troubleshooting

### WebSocket won't connect

1. Check Redis is running: `redis-cli ping` (should return PONG)
2. Check Daphne is running (not Django dev server)
3. Check browser console for error messages
4. Verify JWT token is valid and not expired

### Updates not received

1. Check signal handlers are loaded (verify apps.py ready() method)
2. Check Redis channel layer configuration in settings.py
3. Verify users are in the same unit
4. Check browser console for "Data update received" messages

### Connection keeps dropping

1. Check firewall/proxy settings (WebSocket ports)
2. Verify heartbeat is working (check console for ping/pong)
3. Check Redis connection stability
4. Review Daphne logs for errors

### High memory usage

1. Monitor Redis memory: `redis-cli info memory`
2. Check number of connected clients: `redis-cli CLIENT LIST`
3. Configure Redis maxmemory and eviction policies
4. Consider using Redis Cluster for large deployments

## Production Considerations

### Deployment

1. **Use a production ASGI server**: Daphne, Uvicorn, or Hypercorn
2. **Use SSL/TLS**: Configure `wss://` instead of `ws://`
3. **Redis persistence**: Configure RDB or AOF for reliability
4. **Load balancing**: Use sticky sessions or Redis Pub/Sub
5. **Monitoring**: Track WebSocket connections, message rates, errors

### Configuration

```python
# Production settings.py
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [('redis.example.com', 6379)],
            "capacity": 1500,  # Max messages per channel
            "expiry": 10,      # Message expiry in seconds
        },
    },
}
```

### Nginx Configuration

```nginx
location /ws/ {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 86400;
}
```

## Future Enhancements

### Potential Improvements

1. **Presence indicators**: Show which users are currently online
2. **Typing indicators**: Show when users are editing forms
3. **Conflict resolution**: Handle simultaneous edits by multiple users
4. **Selective updates**: Subscribe to specific entities only
5. **Update batching**: Batch multiple updates to reduce messages
6. **Compression**: Use permessage-deflate for large messages
7. **Analytics**: Track user activity and engagement metrics

### Additional Features

1. **Real-time chat**: In-app messaging between users
2. **Notifications**: Push notifications for important events
3. **Collaboration**: Multi-user editing with operational transforms
4. **Activity feed**: Live feed of all system activities
5. **Alerts**: Real-time alerts for critical events

## API Reference

### WebSocket URL

```
ws://localhost:8000/ws/updates/?token={JWT_ACCESS_TOKEN}
```

### Message Types

#### From Server to Client

**Connection Established**
```json
{
  "type": "connection_established",
  "message": "Connected to unit {unit_id} updates"
}
```

**Data Update**
```json
{
  "type": "data_update",
  "entity": "withdrawal|destruction|transfer|sendback|crate",
  "action": "created|updated|deleted",
  "data": {
    "id": "uuid",
    "status": "pending|approved|rejected|...",
    "request_number": "WR-2024-001",
    "crate_number": "CR-2024-001"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Pong**
```json
{
  "type": "pong",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### From Client to Server

**Ping**
```json
{
  "type": "ping",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Support

For issues or questions about the WebSocket implementation:

1. Check this documentation first
2. Review browser console and Django logs
3. Verify Redis is running and accessible
4. Check Django Channels documentation: https://channels.readthedocs.io/

## License

This implementation is part of the Cipla Document Management System and follows the same license terms.
