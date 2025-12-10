#!/bin/bash

# Cipla DMS - Docker Compose Quick Start Script
# This script starts all services with Docker Compose

set -e

echo "🚀 Starting Cipla DMS with Docker Compose..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose not found. Please install Docker Compose."
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Stop any existing containers
echo "🛑 Stopping any existing containers..."
docker-compose down 2>/dev/null || true
echo ""

# Build and start services
echo "🔨 Building and starting services..."
echo "   This may take a few minutes on first run..."
echo ""

docker-compose up --build -d

echo ""
echo "⏳ Waiting for services to be ready..."
echo ""

# Wait for Redis
echo "   Checking Redis..."
for i in {1..30}; do
    if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
        echo "   ✅ Redis is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "   ❌ Redis failed to start"
        docker-compose logs redis
        exit 1
    fi
    sleep 1
done

# Wait for Backend
echo "   Checking Backend..."
for i in {1..60}; do
    if curl -s http://localhost:8000 > /dev/null 2>&1; then
        echo "   ✅ Backend is ready"
        break
    fi
    if [ $i -eq 60 ]; then
        echo "   ❌ Backend failed to start"
        docker-compose logs backend
        exit 1
    fi
    sleep 2
done

# Frontend check (Vite starts quickly)
echo "   Checking Frontend..."
sleep 3
echo "   ✅ Frontend should be ready"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎉 All services are running!"
echo ""
echo "📊 Service URLs:"
echo "   Frontend:  http://localhost:5173"
echo "   Backend:   http://localhost:8000"
echo "   Redis:     localhost:6379"
echo ""
echo "📋 Useful Commands:"
echo "   View logs:          docker-compose logs -f"
echo "   Stop services:      docker-compose down"
echo "   Restart services:   docker-compose restart"
echo "   View status:        docker-compose ps"
echo ""
echo "🔍 After logging in, look for the green 'Live' badge"
echo "   in the header to confirm WebSocket is connected."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Optional: Open browser
if command -v open &> /dev/null; then
    echo "🌐 Opening browser..."
    sleep 2
    open http://localhost:5173
elif command -v xdg-open &> /dev/null; then
    echo "🌐 Opening browser..."
    sleep 2
    xdg-open http://localhost:5173
fi

# Follow logs
echo "📜 Following logs (Ctrl+C to exit)..."
echo ""
docker-compose logs -f
