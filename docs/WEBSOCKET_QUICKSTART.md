# WebSocket Quick Start Guide

## Prerequisites

- Redis server installed and running
- Python dependencies installed
- Node.js and npm installed

## Setup Steps

### 1. Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

This installs:
- `channels==4.0.0` - Django Channels for WebSocket support
- `daphne==4.0.0` - ASGI server
- `channels-redis==4.1.0` - Redis channel layer backend

### 2. Start Redis

**Option A: Local Redis**
```bash
redis-server
```

**Option B: Docker**
```bash
docker run -d -p 6379:6379 redis:latest
```

Verify Redis is running:
```bash
redis-cli ping
# Should return: PONG
```

### 3. Run Database Migrations

```bash
cd backend
python manage.py migrate
```

### 4. Start Backend Server

**Use Daphne (ASGI server) instead of Django dev server:**

```bash
cd backend
daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

For development with auto-reload:
```bash
daphne -b 0.0.0.0 -p 8000 config.asgi:application --reload
```

You should see:
```
2024-01-15 10:30:00 INFO     Starting server at tcp:port=8000:interface=0.0.0.0
2024-01-15 10:30:00 INFO     HTTP/2 support not enabled
2024-01-15 10:30:00 INFO     Configuring endpoint tcp:port=8000:interface=0.0.0.0
2024-01-15 10:30:00 INFO     Listening on TCP address 0.0.0.0:8000
```

### 5. Start Frontend

```bash
cd frontend
npm install  # if not already installed
npm run dev
```

The frontend should start on `http://localhost:5173`

## Testing WebSocket Connection

### 1. Login to the Application

- Open `http://localhost:5173` in your browser
- Login with your credentials
- You should see a green "Live" badge in the header (top right)

### 2. Check Browser Console

Open browser developer tools (F12) and check the Console tab. You should see:

```
WebSocket connected
WebSocket connection established: Connected to unit {your_unit_id} updates
```

### 3. Test Real-Time Updates

**Single User Test:**
1. Navigate to Transactions
2. Create a new withdrawal request
3. After submission, the list should update automatically (no page reload!)

**Multi-User Test:**
1. Open the app in two different browsers (or one incognito window)
2. Login as users from the same unit in both browsers
3. In Browser 1: Create or update a request
4. In Browser 2: Watch the list update automatically!
5. Check the console in Browser 2 for: `Data update received: ...`

### 4. Test Reconnection

1. Stop the Redis server: `redis-cli shutdown`
2. Watch the badge change from "Live" (green) to "Syncing" (yellow)
3. Restart Redis: `redis-server`
4. The badge should turn green again automatically

## Troubleshooting

### WebSocket Won't Connect

**Symptom:** Badge stays yellow "Syncing", no updates received

**Check:**
1. Is Redis running? `redis-cli ping`
2. Is Daphne running (not Django dev server)?
3. Check browser console for errors
4. Check backend logs for WebSocket connection attempts

**Solution:**
```bash
# Restart Redis
redis-server

# Restart backend with Daphne
cd backend
daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

### Connection Refused

**Symptom:** Console shows `WebSocket connection to 'ws://localhost:8000/ws/updates/' failed`

**Check:**
1. Backend is running on port 8000
2. No firewall blocking WebSocket connections
3. CORS settings allow WebSocket connections

**Solution:**
```bash
# Check if port 8000 is in use
lsof -i :8000

# If nothing is running, start Daphne
cd backend
daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

### Updates Not Received

**Symptom:** Connection is "Live" but updates don't appear

**Check:**
1. Are both users in the same unit?
2. Check browser console for "Data update received" messages
3. Check if signal handlers are loaded

**Solution:**
```bash
# Restart backend to reload signal handlers
# Stop Daphne (Ctrl+C)
daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

### Authentication Failed

**Symptom:** WebSocket closes immediately with code 4001

**Check:**
1. JWT token is valid (not expired)
2. Token is being passed correctly in URL

**Solution:**
- Logout and login again to get a fresh token
- Check token expiry settings in `backend/config/settings.py`

## Configuration Options

### Environment Variables (.env)

```bash
# Redis URL for channel layers
REDIS_URL=redis://localhost:6379/1

# CORS settings (include WebSocket origin)
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# JWT token lifetime
JWT_ACCESS_TOKEN_LIFETIME=15  # minutes
```

### Production Settings

For production deployment, see `WEBSOCKET_IMPLEMENTATION.md` for:
- SSL/TLS configuration (wss://)
- Nginx proxy configuration
- Redis clustering
- Performance tuning

## Verify Installation

Run this checklist to ensure everything is working:

- [ ] Redis is running: `redis-cli ping` returns `PONG`
- [ ] Backend is running with Daphne (not Django dev server)
- [ ] Frontend is running on port 5173
- [ ] Can login successfully
- [ ] See green "Live" badge in header
- [ ] Browser console shows "WebSocket connected"
- [ ] Creating a request updates the list automatically
- [ ] Opening two browsers shows real-time sync

## What's Next?

- Read `WEBSOCKET_IMPLEMENTATION.md` for detailed architecture
- Explore the code in:
  - `backend/apps/requests/consumers.py` - WebSocket consumer
  - `backend/apps/requests/signals.py` - Signal handlers
  - `frontend/src/contexts/WebSocketContext.tsx` - Frontend integration
- Test with multiple users in different roles
- Monitor Redis memory usage in production
- Configure SSL/TLS for production deployment

## Support

If you encounter issues:

1. Check browser console for errors
2. Check Daphne logs for WebSocket connection errors
3. Check Redis logs: `redis-cli MONITOR`
4. Review this guide and `WEBSOCKET_IMPLEMENTATION.md`

## Key Files

**Backend:**
- `backend/config/asgi.py` - ASGI application configuration
- `backend/config/routing.py` - WebSocket URL routing
- `backend/config/settings.py` - Channels and Redis configuration
- `backend/apps/requests/consumers.py` - WebSocket consumer
- `backend/apps/requests/signals.py` - Real-time update signals
- `backend/requirements.txt` - Python dependencies

**Frontend:**
- `frontend/src/contexts/WebSocketContext.tsx` - WebSocket context
- `frontend/src/App.tsx` - WebSocket provider integration

**Documentation:**
- `WEBSOCKET_IMPLEMENTATION.md` - Complete implementation guide
- `WEBSOCKET_QUICKSTART.md` - This quick start guide
