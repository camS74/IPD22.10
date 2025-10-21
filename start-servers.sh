#!/bin/bash

# IPDash Start Script for macOS
# This script starts both the frontend and backend servers

echo "=== Starting IPDash Servers ==="

# Kill any existing processes on the required ports
echo "Stopping any existing servers..."

# Check for processes on port 3000 (frontend)
PID_3000=$(lsof -ti:3000)
if [ ! -z "$PID_3000" ]; then
    echo "Killing process on port 3000 (PID: $PID_3000)"
    kill -9 $PID_3000
fi

# Check for processes on port 3001 (backend)
PID_3001=$(lsof -ti:3001)
if [ ! -z "$PID_3001" ]; then
    echo "Killing process on port 3001 (PID: $PID_3001)"
    kill -9 $PID_3001
fi

# Start the backend server in a new Terminal window
echo "Starting backend server..."
osascript -e 'tell application "Terminal" to do script "cd '"$PWD/server"' && node server.js"'

# Wait a moment for the backend to start
sleep 2

# Start the frontend server in a new Terminal window
echo "Starting frontend server..."
osascript -e 'tell application "Terminal" to do script "cd '"$PWD"' && npm start"'

echo "Servers are starting..."
echo "Backend: http://localhost:3001"
echo "Frontend: http://localhost:3000"
echo ""
echo "The servers are running in separate Terminal windows."
echo "Close those windows to stop the servers."