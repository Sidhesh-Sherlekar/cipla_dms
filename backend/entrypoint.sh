#!/bin/bash

# Entrypoint script for Django backend
set -e

echo "🚀 Starting Cipla DMS Backend..."

# Wait for Redis to be ready
echo "⏳ Waiting for Redis..."
while ! nc -z redis 6379; do
  sleep 1
done
echo "✅ Redis is ready!"

# Run database migrations
echo "📊 Running database migrations..."
python manage.py migrate --noinput

# Create logs directory if it doesn't exist
mkdir -p logs

# Collect static files
echo "📦 Collecting static files..."
python manage.py collectstatic --noinput --clear || true

# Initial system admin setup (runs only once)
INIT_FLAG="/app/.initialized"
if [ ! -f "$INIT_FLAG" ]; then
    echo "🔧 Running initial system setup..."

    # Setup roles and privileges
    python manage.py setup_roles || echo "⚠️ setup_roles may have already been run"

    # Create system admin with default credentials (change in production!)
    # Uses environment variables or defaults
    ADMIN_USERNAME="${ADMIN_USERNAME:-systemadmin}"
    ADMIN_EMAIL="${ADMIN_EMAIL:-admin@cipla.com}"
    ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin@123456}"

    python manage.py init_system_admin \
        --username "$ADMIN_USERNAME" \
        --email "$ADMIN_EMAIL" \
        --password "$ADMIN_PASSWORD" \
        --skip-if-exists || echo "⚠️ System admin setup skipped or already exists"

    touch "$INIT_FLAG"
    echo "✅ Initial system setup complete!"
    echo ""
    echo "=========================================="
    echo "  DEFAULT ADMIN CREDENTIALS"
    echo "=========================================="
    echo "  Username: $ADMIN_USERNAME"
    echo "  Password: $ADMIN_PASSWORD"
    echo "=========================================="
    echo "  ⚠️  CHANGE PASSWORD AFTER FIRST LOGIN!"
    echo "=========================================="
    echo ""
else
    echo "⏭️  Initial setup already completed"
fi

echo "✅ Backend initialization complete!"
echo "🌐 Starting Daphne ASGI server..."

# Execute the main command (Daphne)
exec "$@"
