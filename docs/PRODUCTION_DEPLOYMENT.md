# Cipla DMS - Production Deployment Guide

Complete guide for deploying Cipla DMS on-premises for 200 concurrent users.

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Installation Steps](#installation-steps)
4. [Configuration](#configuration)
5. [SSL/TLS Setup](#ssltls-setup)
6. [Database Setup](#database-setup)
7. [Initial System Setup](#initial-system-setup)
8. [Performance Tuning](#performance-tuning)
9. [Monitoring & Maintenance](#monitoring--maintenance)
10. [Backup & Recovery](#backup--recovery)
11. [Troubleshooting](#troubleshooting)

---

## System Requirements

### Minimum Hardware (200 Concurrent Users)

- **CPU**: 8 cores (16 threads recommended)
- **RAM**: 16GB (32GB recommended)
- **Storage**:
  - System: 100GB SSD
  - Database: 500GB (depending on document volume)
  - Logs: 100GB
- **Network**: 1Gbps network interface

### Software Requirements

- **OS**: Ubuntu 20.04 LTS / 22.04 LTS or RHEL 8+
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Git**: 2.x

### Network Requirements

- **Inbound Ports**:
  - 80 (HTTP - redirects to HTTPS)
  - 443 (HTTPS)
- **Outbound Ports**:
  - 443 (for package updates)
  - 25/587 (SMTP for emails)

---

## Pre-Deployment Checklist

### 1. Infrastructure Preparation

- [ ] Server provisioned with required specs
- [ ] Static IP address assigned
- [ ] DNS records configured
- [ ] Firewall rules configured
- [ ] SSL/TLS certificates obtained
- [ ] SMTP server details available
- [ ] Backup storage configured

### 2. System Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installations
docker --version
docker-compose --version

# Log out and back in for group changes to take effect
```

### 3. Security Hardening

```bash
# Configure firewall
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable

# Disable root login (recommended)
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart sshd

# Install fail2ban
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
```

---

## Installation Steps

### 1. Clone Repository

```bash
# Create application directory
sudo mkdir -p /opt/cipla_dms
sudo chown $USER:$USER /opt/cipla_dms
cd /opt/cipla_dms

# Clone repository
git clone <repository-url> .
git checkout main  # or your production branch
```

### 2. Create Environment File

```bash
cp .env.production.example .env.production
```

Edit `.env.production` with your values:

```bash
# Django Settings
SECRET_KEY="<generate-with-django-secret-key-generator>"
DEBUG=False
ALLOWED_HOSTS=your-domain.com,www.your-domain.com
DJANGO_SETTINGS_MODULE=config.settings_production

# CORS
CORS_ALLOWED_ORIGINS=https://your-domain.com

# Database (PostgreSQL)
USE_POSTGRES=True
DB_NAME=cipla_dms
DB_USER=cipla_user
DB_PASSWORD="<strong-password>"
DB_HOST=db
DB_PORT=5432

# Redis
REDIS_URL=redis://redis:6379/1
REDIS_CACHE_URL=redis://redis:6379/2
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0

# Email Configuration
EMAIL_HOST=smtp.your-company.com
EMAIL_PORT=587
EMAIL_HOST_USER=noreply@your-company.com
EMAIL_HOST_PASSWORD="<email-password>"
DEFAULT_FROM_EMAIL=noreply@your-company.com

# Frontend URLs
VITE_API_URL=https://your-domain.com
VITE_WS_URL=wss://your-domain.com

# Timezone
TIME_ZONE=Asia/Kolkata
```

### 3. Generate Secret Key

```bash
# Generate Django secret key
python3 -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
```

Add this to SECRET_KEY in `.env.production`

---

## SSL/TLS Setup

### Option 1: Let's Encrypt (Free, Recommended)

```bash
# Install Certbot
sudo apt install certbot -y

# Generate certificate
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Certificates will be in /etc/letsencrypt/live/your-domain.com/

# Copy to project
sudo mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/key.pem
sudo chown -R $USER:$USER nginx/ssl

# Setup auto-renewal
sudo crontab -e
# Add: 0 0 * * * certbot renew --quiet && docker-compose -f /opt/cipla_dms/docker-compose.production.yml restart nginx
```

### Option 2: Self-Signed Certificate (Development/Testing)

```bash
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/C=IN/ST=State/L=City/O=Organization/CN=your-domain.com"
```

### Option 3: Commercial Certificate

Place your certificate files as:
- `nginx/ssl/cert.pem` (certificate + intermediate chain)
- `nginx/ssl/key.pem` (private key)

---

## Database Setup

### 1. Build and Start Database

```bash
# Load environment variables
set -a
source .env.production
set +a

# Start database only
docker-compose -f docker-compose.production.yml up -d db

# Wait for database to be ready
docker-compose -f docker-compose.production.yml logs -f db
# Wait for "database system is ready to accept connections"
```

### 2. Initialize Database

```bash
# Run migrations
docker-compose -f docker-compose.production.yml run --rm backend python manage.py migrate

# Collect static files
docker-compose -f docker-compose.production.yml run --rm backend python manage.py collectstatic --noinput
```

---

## Initial System Setup

### 1. Create Initial Roles and Admin User

```bash
# Run initial setup command
docker-compose -f docker-compose.production.yml run --rm backend python manage.py initial_setup

# This will:
# - Create default groups (System Administrator, Unit Admin, Document Manager, etc.)
# - Set up permissions
# - Create admin user (follow prompts)
# - Create sample organizational units
# - Create sample storage locations
```

### 2. Start All Services

```bash
# Start all services
docker-compose -f docker-compose.production.yml up -d

# Verify all containers are running
docker-compose -f docker-compose.production.yml ps

# Check logs
docker-compose -f docker-compose.production.yml logs -f
```

### 3. Verify Deployment

```bash
# Check backend health
curl https://your-domain.com/health

# Check API
curl https://your-domain.com/api/

# Check WebSocket (should return 400/404, means it's listening)
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" https://your-domain.com/ws/updates/
```

---

## Performance Tuning

### 1. PostgreSQL Optimization

Edit `docker-compose.production.yml` PostgreSQL environment based on available RAM:

**For 16GB RAM Server:**
```yaml
POSTGRES_SHARED_BUFFERS: "512MB"
POSTGRES_EFFECTIVE_CACHE_SIZE: "4GB"
POSTGRES_WORK_MEM: "16MB"
POSTGRES_MAINTENANCE_WORK_MEM: "256MB"
```

**For 32GB RAM Server:**
```yaml
POSTGRES_SHARED_BUFFERS: "1GB"
POSTGRES_EFFECTIVE_CACHE_SIZE: "8GB"
POSTGRES_WORK_MEM: "32MB"
POSTGRES_MAINTENANCE_WORK_MEM: "512MB"
```

### 2. Redis Optimization

```yaml
# In docker-compose.production.yml, adjust maxmemory based on available RAM
--maxmemory 1gb  # For 16GB server
--maxmemory 2gb  # For 32GB server
```

### 3. Backend Scaling

For higher concurrency, add more backend instances:

```yaml
# docker-compose.production.yml
backend:
  deploy:
    replicas: 2  # Run 2 backend instances
```

Update Nginx upstream:

```nginx
upstream backend {
    least_conn;
    server backend_1:8000 max_fails=3 fail_timeout=30s;
    server backend_2:8000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}
```

---

## Monitoring & Maintenance

### 1. Log Monitoring

```bash
# View logs
docker-compose -f docker-compose.production.yml logs -f

# View specific service logs
docker-compose -f docker-compose.production.yml logs -f backend
docker-compose -f docker-compose.production.yml logs -f nginx

# Application logs location
tail -f backend/logs/app.log
tail -f backend/logs/audit.log
tail -f backend/logs/websocket.log
```

### 2. Resource Monitoring

```bash
# Monitor container resources
docker stats

# Monitor system resources
htop
```

### 3. Redis Monitoring (Optional)

```bash
# Start Redis Insight
docker-compose -f docker-compose.production.yml --profile monitoring up -d redis-insight

# Access at: http://your-server-ip:8001
```

### 4. Database Monitoring

```bash
# Connect to PostgreSQL
docker-compose -f docker-compose.production.yml exec db psql -U cipla_user -d cipla_dms

# Check connection count
SELECT count(*) FROM pg_stat_activity;

# Check database size
SELECT pg_size_pretty(pg_database_size('cipla_dms'));

# Check slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

---

## Backup & Recovery

### 1. Database Backup

Create backup script `/opt/cipla_dms/backup.sh`:

```bash
#!/bin/bash
set -e

BACKUP_DIR="/opt/cipla_dms/backend/db_backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/cipla_dms_$DATE.sql.gz"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
docker-compose -f /opt/cipla_dms/docker-compose.production.yml exec -T db \
  pg_dump -U cipla_user cipla_dms | gzip > $BACKUP_FILE

# Keep only last 30 days of backups
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "✅ Backup completed: $BACKUP_FILE"
```

```bash
chmod +x backup.sh

# Schedule daily backups
crontab -e
# Add: 0 2 * * * /opt/cipla_dms/backup.sh >> /opt/cipla_dms/backup.log 2>&1
```

### 2. Database Restore

```bash
# Restore from backup
gunzip < /path/to/backup.sql.gz | \
docker-compose -f docker-compose.production.yml exec -T db \
  psql -U cipla_user cipla_dms
```

### 3. Media Files Backup

```bash
# Backup media files
tar -czf media_backup_$(date +%Y%m%d).tar.gz backend/media/

# Restore media files
tar -xzf media_backup_YYYYMMDD.tar.gz
```

---

## Troubleshooting

### Common Issues

#### 1. Containers Won't Start

```bash
# Check logs
docker-compose -f docker-compose.production.yml logs

# Check if ports are in use
sudo netstat -tulpn | grep -E ':(80|443|5432|6379)'

# Restart services
docker-compose -f docker-compose.production.yml restart
```

#### 2. WebSocket Connection Fails

```bash
# Check Redis is running
docker-compose -f docker-compose.production.yml exec redis redis-cli ping

# Check backend logs for WebSocket errors
docker-compose -f docker-compose.production.yml logs backend | grep -i websocket

# Verify Nginx WebSocket configuration
docker-compose -f docker-compose.production.yml exec nginx nginx -t
```

#### 3. High Memory Usage

```bash
# Check resource usage
docker stats

# Restart services
docker-compose -f docker-compose.production.yml restart

# Clear Redis cache
docker-compose -f docker-compose.production.yml exec redis redis-cli FLUSHDB
```

#### 4. Slow Performance

```bash
# Check PostgreSQL query performance
docker-compose -f docker-compose.production.yml exec db psql -U cipla_user -d cipla_dms
# Run: SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;

# Clear Django cache
docker-compose -f docker-compose.production.yml exec backend python manage.py clear_cache

# Restart all services
docker-compose -f docker-compose.production.yml restart
```

---

## Updating the Application

```bash
# 1. Backup database
./backup.sh

# 2. Pull latest code
git pull origin main

# 3. Rebuild containers
docker-compose -f docker-compose.production.yml build

# 4. Run migrations
docker-compose -f docker-compose.production.yml run --rm backend python manage.py migrate

# 5. Collect static files
docker-compose -f docker-compose.production.yml run --rm backend python manage.py collectstatic --noinput

# 6. Restart services
docker-compose -f docker-compose.production.yml up -d

# 7. Verify
docker-compose -f docker-compose.production.yml ps
```

---

## Security Best Practices

1. **Change default passwords** for admin and database
2. **Enable firewall** and only open required ports
3. **Regular updates**: Keep system and Docker images updated
4. **SSL/TLS**: Use valid certificates, enforce HTTPS
5. **Backup**: Automated daily backups with offsite storage
6. **Monitoring**: Set up log monitoring and alerting
7. **Access control**: Use strong passwords, limit SSH access
8. **Audit logs**: Regular review of audit trails
9. **Secrets management**: Never commit secrets to Git
10. **Network segmentation**: Use Docker networks for isolation

---

## Support & Resources

- **Documentation**: See `WEBSOCKET_IMPLEMENTATION.md` for WebSocket details
- **Docker Guide**: See `DOCKER_GUIDE.md` for Docker usage
- **Issue Tracking**: Use GitHub Issues for bug reports

---

## Quick Reference

### Start Services
```bash
docker-compose -f docker-compose.production.yml up -d
```

### Stop Services
```bash
docker-compose -f docker-compose.production.yml down
```

### View Logs
```bash
docker-compose -f docker-compose.production.yml logs -f
```

### Restart Service
```bash
docker-compose -f docker-compose.production.yml restart <service-name>
```

### Database Shell
```bash
docker-compose -f docker-compose.production.yml exec db psql -U cipla_user -d cipla_dms
```

### Django Shell
```bash
docker-compose -f docker-compose.production.yml exec backend python manage.py shell
```

### Create Backup
```bash
./backup.sh
```

---

**Deployment Complete!** 🎉

Your Cipla DMS is now ready to serve 200 concurrent users in production.
