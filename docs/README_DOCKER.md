# Cipla DMS - Docker Quick Start

Run the entire application stack with a single command using Docker Compose.

## 🚀 One-Command Start

```bash
# Option 1: Use the start script (recommended)
./docker-start.sh

# Option 2: Use docker-compose directly
docker-compose up
```

That's it! The script will:
- ✅ Start Redis (WebSocket channel layer)
- ✅ Start Backend (Django with Daphne)
- ✅ Start Frontend (React with Vite)
- ✅ Start Celery (background tasks)
- ✅ Configure networking and volumes
- ✅ Wait for all services to be ready

## 📋 What You Get

**Services Started:**
- **Redis** on port 6379
- **Backend** on port 8000 (with WebSocket support)
- **Frontend** on port 5173
- **Celery** worker for background tasks

**Features Enabled:**
- ✨ Real-time WebSocket updates
- ✨ Multi-user synchronization
- ✨ Automatic reconnection
- ✨ Live connection indicator
- ✨ Persistent Redis data

## 🌐 Access the Application

After starting (takes 1-2 minutes first time):

- **Open your browser**: http://localhost:5173
- **Login** with your credentials
- **Look for** the green "Live" badge in the header
- **Test it**: Open two browser tabs and see real-time updates!

## 📊 Common Commands

```bash
# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f redis

# Stop services
docker-compose down

# Restart services
docker-compose restart

# Rebuild after code changes
docker-compose up --build

# Check service status
docker-compose ps

# Run Django commands
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser

# Access Redis CLI
docker-compose exec redis redis-cli
```

## 🛠️ Development

### Making Code Changes

**Backend:**
1. Edit files in `backend/` directory
2. Changes auto-reload (Daphne watches for changes)
3. For new dependencies: `docker-compose build backend && docker-compose restart backend`

**Frontend:**
1. Edit files in `frontend/src/` directory
2. Vite auto-reloads the page
3. For new dependencies: `docker-compose build frontend && docker-compose restart frontend`

### Running Tests

```bash
# Backend tests
docker-compose exec backend python manage.py test

# Frontend tests
docker-compose exec frontend npm test
```

## 🔍 Troubleshooting

### Services won't start

```bash
# Check if ports are in use
lsof -i :5173  # Frontend
lsof -i :8000  # Backend
lsof -i :6379  # Redis

# View detailed logs
docker-compose logs

# Clean restart
docker-compose down -v
docker-compose up --build
```

### WebSocket won't connect

```bash
# Verify Redis is running
docker-compose exec redis redis-cli ping

# Check backend logs
docker-compose logs backend | grep -i websocket

# Restart backend
docker-compose restart backend
```

### Database issues

```bash
# Run migrations
docker-compose exec backend python manage.py migrate

# Reset database (⚠️ destroys data)
docker-compose down -v
docker-compose up
```

## 📚 Documentation

- **DOCKER_GUIDE.md** - Comprehensive Docker guide
- **WEBSOCKET_QUICKSTART.md** - WebSocket setup guide
- **WEBSOCKET_IMPLEMENTATION.md** - Technical details

## 🧹 Cleanup

```bash
# Stop and remove containers
docker-compose down

# Remove all data (⚠️ destructive)
docker-compose down -v

# Remove images too
docker-compose down -v --rmi all
```

## ✅ Verification

After starting, verify everything works:

```bash
# All services should show "Up"
docker-compose ps

# Redis should respond
docker-compose exec redis redis-cli ping

# Backend should respond
curl http://localhost:8000

# Frontend should load
curl http://localhost:5173
```

**In the browser:**
- ✅ Application loads
- ✅ Can login
- ✅ Green "Live" badge appears
- ✅ No console errors

## 🎯 Production Notes

This Docker setup is configured for **development**. For production:

1. Set `DEBUG=False`
2. Use strong `SECRET_KEY`
3. Configure proper `ALLOWED_HOSTS`
4. Use PostgreSQL (uncomment in docker-compose.yml)
5. Set up SSL/TLS for WebSocket (wss://)
6. Use environment files for secrets
7. Configure reverse proxy (Nginx)

See **DOCKER_GUIDE.md** for production deployment details.

## 🆘 Need Help?

1. Check logs: `docker-compose logs`
2. Review **DOCKER_GUIDE.md**
3. Check **WEBSOCKET_IMPLEMENTATION.md**
4. Verify Docker is running: `docker info`

## 🎉 Success Indicators

You know it's working when:

- ✅ All 4 services show "Up (healthy)"
- ✅ Frontend loads at http://localhost:5173
- ✅ Green "Live" badge appears after login
- ✅ Opening two tabs shows real-time sync
- ✅ No errors in `docker-compose logs`

Enjoy your fully Dockerized Cipla DMS! 🚀
