# Docker Compose Quick Start Guide

This guide shows you how to run the entire Cipla DMS application stack using Docker Compose with a single command.

## 🚀 Quick Start

### Prerequisites

- Docker Desktop installed (includes Docker Compose)
  - **macOS/Windows**: [Download Docker Desktop](https://www.docker.com/products/docker-desktop/)
  - **Linux**: Install Docker Engine and Docker Compose

### Start Everything

```bash
# Start all services (Redis, Backend, Frontend, Celery)
docker-compose up
```

That's it! 🎉

### Access the Application

After all services start (takes 1-2 minutes first time):

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **Redis**: localhost:6379

You should see the green "Live" badge indicating WebSocket is connected.

## 📋 Common Commands

### Start Services

```bash
# Start in foreground (see logs)
docker-compose up

# Start in background (detached mode)
docker-compose up -d

# Start specific service
docker-compose up backend
docker-compose up frontend
```

### Stop Services

```bash
# Stop all services (keeps containers)
docker-compose stop

# Stop and remove containers
docker-compose down

# Stop and remove everything (including volumes)
docker-compose down -v
```

### View Logs

```bash
# View logs from all services
docker-compose logs

# Follow logs in real-time
docker-compose logs -f

# View logs from specific service
docker-compose logs backend
docker-compose logs frontend
docker-compose logs redis

# Follow logs from specific service
docker-compose logs -f backend
```

### Restart Services

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart backend
docker-compose restart frontend
```

### Rebuild Containers

```bash
# Rebuild all containers (after code changes)
docker-compose build

# Rebuild specific service
docker-compose build backend
docker-compose build frontend

# Rebuild and start
docker-compose up --build
```

## 🔧 Service Details

### Services Included

1. **redis**: Redis server for WebSocket channel layer and Celery
2. **backend**: Django application with Daphne (ASGI server)
3. **frontend**: React application with Vite dev server
4. **celery**: Celery worker for background tasks

### Ports Exposed

- **5173**: Frontend (Vite dev server)
- **8000**: Backend (Django with Daphne)
- **6379**: Redis

### Volumes

- **redis_data**: Persistent Redis data
- **backend_static**: Django static files
- **backend_media**: Django media files

## 🛠️ Development Workflow

### Making Code Changes

**Backend Changes:**
1. Edit files in `backend/` directory
2. Changes are automatically detected (hot reload)
3. If you add new dependencies:
   ```bash
   docker-compose build backend
   docker-compose restart backend
   ```

**Frontend Changes:**
1. Edit files in `frontend/src/` directory
2. Vite automatically reloads the page
3. If you add new dependencies:
   ```bash
   docker-compose build frontend
   docker-compose restart frontend
   ```

### Running Django Management Commands

```bash
# Run migrations
docker-compose exec backend python manage.py migrate

# Create superuser
docker-compose exec backend python manage.py createsuperuser

# Collect static files
docker-compose exec backend python manage.py collectstatic

# Run custom management command
docker-compose exec backend python manage.py <command>
```

### Accessing Django Shell

```bash
docker-compose exec backend python manage.py shell
```

### Accessing Database Shell

```bash
# SQLite (default)
docker-compose exec backend python manage.py dbshell

# PostgreSQL (if enabled)
docker-compose exec db psql -U cipla_user -d cipla_dms
```

### Accessing Redis CLI

```bash
docker-compose exec redis redis-cli
```

### Running Tests

```bash
# Backend tests
docker-compose exec backend python manage.py test

# Frontend tests (if configured)
docker-compose exec frontend npm test
```

## 🔍 Troubleshooting

### Services Won't Start

**Check if ports are already in use:**
```bash
# Check port 5173 (frontend)
lsof -i :5173

# Check port 8000 (backend)
lsof -i :8000

# Check port 6379 (redis)
lsof -i :6379
```

**Solution**: Stop the conflicting service or change ports in `docker-compose.yml`

### Backend Won't Connect to Redis

**Check Redis is healthy:**
```bash
docker-compose ps
```

Should show `redis` with status `Up (healthy)`

**Check Redis logs:**
```bash
docker-compose logs redis
```

**Restart Redis:**
```bash
docker-compose restart redis
```

### Frontend Can't Reach Backend

**Check backend is running:**
```bash
docker-compose logs backend
```

**Test backend endpoint:**
```bash
curl http://localhost:8000
```

**Check network:**
```bash
docker-compose exec frontend ping backend
```

### WebSocket Won't Connect

**Check backend is using Daphne:**
```bash
docker-compose logs backend | grep Daphne
```

Should see: "Starting server at tcp:port=8000"

**Check Redis connection:**
```bash
docker-compose exec backend python -c "import redis; r = redis.from_url('redis://redis:6379/1'); print(r.ping())"
```

Should print: `True`

**Restart backend:**
```bash
docker-compose restart backend
```

### Database Errors

**Reset database (⚠️ destroys all data):**
```bash
docker-compose down -v
docker-compose up
```

**Run migrations:**
```bash
docker-compose exec backend python manage.py migrate
```

### "Port already allocated" Error

**Find and stop the conflicting container:**
```bash
docker ps
docker stop <container_id>
```

**Or change the port in docker-compose.yml:**
```yaml
ports:
  - "8001:8000"  # Use 8001 instead of 8000
```

### Container Keeps Restarting

**Check logs for errors:**
```bash
docker-compose logs <service_name>
```

**Check container status:**
```bash
docker-compose ps
```

### Permission Errors

**Fix ownership (on Linux):**
```bash
sudo chown -R $USER:$USER .
```

## 🎨 Environment Variables

You can customize settings using environment variables in `docker-compose.yml`:

### Backend Environment Variables

```yaml
environment:
  - DEBUG=True                    # Enable debug mode
  - SECRET_KEY=your-secret-key    # Django secret key
  - ALLOWED_HOSTS=localhost,...   # Allowed hosts
  - REDIS_URL=redis://redis:6379/1
  - USE_POSTGRES=False            # Use PostgreSQL instead of SQLite
```

### Frontend Environment Variables

```yaml
environment:
  - VITE_API_URL=http://localhost:8000
  - VITE_WS_URL=ws://localhost:8000
```

## 🗄️ Using PostgreSQL (Optional)

By default, the application uses SQLite. To use PostgreSQL:

1. **Uncomment PostgreSQL service in docker-compose.yml:**
   ```yaml
   db:
     image: postgres:15-alpine
     # ... (uncomment entire block)
   ```

2. **Update backend environment:**
   ```yaml
   backend:
     environment:
       - USE_POSTGRES=True
       - DB_NAME=cipla_dms
       - DB_USER=cipla_user
       - DB_PASSWORD=secure_password
       - DB_HOST=db
       - DB_PORT=5432
   ```

3. **Update backend depends_on:**
   ```yaml
   backend:
     depends_on:
       db:
         condition: service_healthy
   ```

4. **Restart:**
   ```bash
   docker-compose down
   docker-compose up --build
   ```

## 🚀 Production Deployment

For production, see `docker-compose.prod.yml` (if available) or:

1. **Set DEBUG=False**
2. **Use strong SECRET_KEY**
3. **Configure ALLOWED_HOSTS properly**
4. **Use PostgreSQL instead of SQLite**
5. **Set up SSL/TLS for WebSocket (wss://)**
6. **Use environment files (.env) for secrets**
7. **Configure reverse proxy (Nginx)**
8. **Set up proper logging and monitoring**

### Production Example

```bash
# Create production environment file
cat > .env.prod <<EOF
DEBUG=False
SECRET_KEY=$(python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())')
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
USE_POSTGRES=True
DB_PASSWORD=your-secure-password
EOF

# Start with production settings
docker-compose -f docker-compose.prod.yml up -d
```

## 📊 Monitoring

### Check Service Health

```bash
docker-compose ps
```

### View Resource Usage

```bash
docker stats
```

### Check Redis Statistics

```bash
docker-compose exec redis redis-cli info stats
```

### Monitor WebSocket Connections

```bash
docker-compose exec redis redis-cli CLIENT LIST
```

## 🧹 Cleanup

### Remove Stopped Containers

```bash
docker-compose down
```

### Remove All Data (⚠️ Destructive)

```bash
docker-compose down -v
```

### Remove Docker Images

```bash
docker-compose down --rmi all
```

### Clean Everything

```bash
# Stop and remove containers, networks, volumes, images
docker-compose down -v --rmi all

# Remove unused Docker resources
docker system prune -a --volumes
```

## 🎯 Verification Checklist

After starting services, verify:

- [ ] All services show "Up" status: `docker-compose ps`
- [ ] Redis is healthy: `docker-compose exec redis redis-cli ping`
- [ ] Backend is accessible: `curl http://localhost:8000`
- [ ] Frontend loads: http://localhost:5173
- [ ] WebSocket connects: Green "Live" badge in header
- [ ] No errors in logs: `docker-compose logs`

## 📝 Quick Reference

```bash
# Start everything
docker-compose up -d

# View logs
docker-compose logs -f

# Restart service
docker-compose restart backend

# Run Django command
docker-compose exec backend python manage.py <command>

# Access shell
docker-compose exec backend bash

# Stop everything
docker-compose down

# Clean everything
docker-compose down -v
```

## 🆘 Getting Help

If you encounter issues:

1. Check logs: `docker-compose logs`
2. Verify services are running: `docker-compose ps`
3. Check Redis health: `docker-compose exec redis redis-cli ping`
4. Review this guide
5. Check `WEBSOCKET_IMPLEMENTATION.md` for WebSocket-specific issues

## 🎉 Success!

If everything is working, you should see:

- ✅ All services running: `docker-compose ps` shows 4 services "Up"
- ✅ Frontend accessible at http://localhost:5173
- ✅ Green "Live" badge after login
- ✅ Real-time updates working across multiple browser tabs

Enjoy your fully Dockerized Cipla DMS with real-time WebSocket updates! 🚀
