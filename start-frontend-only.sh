#!/bin/bash

# IPDash Frontend-Only Start Script
# This script starts only the frontend server without requiring the database

echo "=== Starting IPDash Frontend Only ==="
echo "This mode will start only the React frontend without the backend server."
echo "Note: Database-dependent features will not work in this mode."
echo ""

# Kill any existing processes on port 3000 (frontend)
PID_3000=$(lsof -ti:3000)
if [ ! -z "$PID_3000" ]; then
    echo "Killing process on port 3000 (PID: $PID_3000)"
    kill -9 $PID_3000
fi

# Check if frontend dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "❌ Frontend dependencies not installed. Running npm install..."
    npm install --legacy-peer-deps
fi

# Start the frontend server
echo "Starting frontend server..."
echo "The application will be available at http://localhost:3000"
echo "Note: Some features requiring the backend will not work."
echo ""

# Start React app
npm start