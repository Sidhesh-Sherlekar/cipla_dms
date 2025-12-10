# Server Startup Guide

Follow these steps in order to start the Cipla DMS with WebSocket support.

## Prerequisites

Make sure you have installed:
- Python 3.11+ with all backend dependencies
- Node.js 18+ with frontend dependencies
- Redis server
- Docker (optional, for Redis)

## Step-by-Step Startup

### 1. Start Redis (REQUIRED for WebSockets)

**Option A: Local Redis**
```bash
# Terminal 1
redis-server
```

**Option B: Docker Redis**
```bash
docker run -d -p 6379:6379 --name redis redis:latest
```

**Option C: Homebrew (macOS)**
```bash
brew services start redis
```

### 2. Verify Redis is Running

```bash
redis-cli ping
# Should return: PONG
```

If you don't get `PONG`, WebSockets won't work!

### 3. Start Backend with Daphne

⚠️ **IMPORTANT: Use Daphne, NOT Django's dev server!**

```bash
# Terminal 2 (or new terminal if Redis is in Terminal 1)
cd backend
daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

You should see:
```
INFO     Starting server at tcp:port=8000:interface=0.0.0.0
INFO     Listening on TCP address 0.0.0.0:8000
```

### 4. Start Frontend

```bash
# Terminal 3
cd frontend
npm run dev
```

You should see:
```
VITE ready in XXX ms
Local:   http://localhost:5173/
```

## 🎯 Quick Checklist

Before accessing the app, verify:

- [ ] Redis is running: `redis-cli ping` returns `PONG`
- [ ] Backend is running with Daphne on port 8000
- [ ] Frontend is running on port 5173
- [ ] No error messages in any terminal

## 🌐 Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

After logging in, you should see:
- Green "Live" badge in the header (indicates WebSocket connected)
- Browser console shows: "WebSocket connected"

## 🛑 Stopping Services

### Stop All Services
```bash
# Stop frontend (Terminal 3)
Ctrl+C

# Stop backend (Terminal 2)
Ctrl+C

# Stop Redis (Terminal 1)
Ctrl+C

# Or if using Docker Redis
docker stop redis
docker rm redis

# Or if using Homebrew Redis
brew services stop redis
```

## 🔧 Troubleshooting

### Redis Won't Start
```bash
# Check if Redis is already running
ps aux | grep redis

# Kill existing Redis process
pkill redis-server

# Start fresh
redis-server
```

### Port 8000 Already in Use
```bash
# Find what's using port 8000
lsof -i :8000

# Kill the process (replace PID with actual process ID)
kill -9 PID

# Or use a different port
daphne -b 0.0.0.0 -p 8001 config.asgi:application
```

### Port 5173 Already in Use
```bash
# Find what's using port 5173
lsof -i :5173

# Kill the process
kill -9 PID

# Or Vite will automatically use the next available port
```

### WebSocket Won't Connect
1. Verify Redis is running: `redis-cli ping`
2. Check backend is using Daphne (not `python manage.py runserver`)
3. Check browser console for error messages
4. Verify JWT token is not expired (logout and login again)

## 📊 Monitor Services

### Monitor Redis
```bash
# In a new terminal
redis-cli MONITOR
```

This shows all Redis commands in real-time, including WebSocket channel operations.

### Monitor Backend Logs
Backend logs appear directly in the terminal where Daphne is running.

### Monitor Frontend
Browser console (F12) shows:
- WebSocket connection status
- Data update events
- Any errors

## 🎨 Development Tips

### Auto-reload on Changes

**Backend with Daphne:**
```bash
daphne -b 0.0.0.0 -p 8000 config.asgi:application --reload
```

**Frontend with Vite:**
Vite automatically reloads on file changes (already enabled)

### Run in Background

If you want to run services in the background:

```bash
# Redis in background (Docker)
docker run -d -p 6379:6379 --name redis redis:latest

# Backend in background (not recommended for development)
nohup daphne -b 0.0.0.0 -p 8000 config.asgi:application > backend.log 2>&1 &

# Frontend in background (not recommended for development)
cd frontend && nohup npm run dev > frontend.log 2>&1 &
```

## 🚀 Production Deployment

For production, see `WEBSOCKET_IMPLEMENTATION.md` for:
- Nginx configuration for WebSocket proxying
- SSL/TLS setup (wss://)
- Redis clustering for high availability
- Process management with systemd or supervisord
- Environment variable configuration

## 📝 Quick Start Script

Create a file `start.sh`:

```bash
#!/bin/bash

# Check if Redis is running
if ! redis-cli ping > /dev/null 2>&1; then
    echo "Starting Redis..."
    redis-server &
    sleep 2
fi

# Start backend
echo "Starting backend..."
cd backend
daphne -b 0.0.0.0 -p 8000 config.asgi:application &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Start frontend
echo "Starting frontend..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ All services started!"
echo "🌐 Access the app at: http://localhost:5173"
echo ""
echo "To stop all services, press Ctrl+C"

# Wait for user interrupt
trap "kill $BACKEND_PID $FRONTEND_PID; redis-cli shutdown; exit" INT
wait
```

Make it executable:
```bash
chmod +x start.sh
./start.sh
```

## 🎯 Verification Steps

After starting all services:

1. **Check Redis**: `redis-cli ping` → `PONG`
2. **Check Backend**: `curl http://localhost:8000` → Should return HTML or JSON
3. **Check Frontend**: Open `http://localhost:5173` → Should load the app
4. **Check WebSocket**: After login, see green "Live" badge in header

If all checks pass, you're ready to use the real-time features! 🎉
