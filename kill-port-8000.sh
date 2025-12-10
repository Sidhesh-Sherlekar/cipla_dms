#!/bin/bash

# Script to find and kill process using port 8000

echo "🔍 Finding process using port 8000..."

# For macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    PID=$(lsof -ti:8000)

    if [ -z "$PID" ]; then
        echo "✅ Port 8000 is free"
        exit 0
    fi

    echo "📋 Process details:"
    lsof -i:8000

    echo ""
    echo "❌ Port 8000 is in use by PID: $PID"
    echo ""
    read -p "Kill this process? (y/n) " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kill -9 $PID
        echo "✅ Process killed"
        sleep 1

        # Verify it's free
        if lsof -ti:8000 > /dev/null 2>&1; then
            echo "⚠️  Port still in use, trying harder..."
            sudo kill -9 $PID
        else
            echo "✅ Port 8000 is now free"
        fi
    else
        echo "❌ Process not killed"
        exit 1
    fi

# For Linux
else
    PID=$(sudo netstat -tulpn | grep :8000 | awk '{print $7}' | cut -d'/' -f1)

    if [ -z "$PID" ]; then
        echo "✅ Port 8000 is free"
        exit 0
    fi

    echo "📋 Process details:"
    sudo netstat -tulpn | grep :8000

    echo ""
    echo "❌ Port 8000 is in use by PID: $PID"
    echo ""
    read -p "Kill this process? (y/n) " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo kill -9 $PID
        echo "✅ Process killed"
        sleep 1

        # Verify it's free
        if sudo netstat -tulpn | grep :8000 > /dev/null 2>&1; then
            echo "⚠️  Port still in use"
        else
            echo "✅ Port 8000 is now free"
        fi
    else
        echo "❌ Process not killed"
        exit 1
    fi
fi
