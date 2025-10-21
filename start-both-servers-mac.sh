#!/bin/bash

# Kill any existing servers
echo "🔥 Killing existing servers..."
lsof -ti :3000 | xargs kill -9 2>/dev/null
lsof -ti :3001 | xargs kill -9 2>/dev/null
pkill -f "node.*server" 2>/dev/null
pkill -f "react-scripts" 2>/dev/null
pkill -f "npm.*start" 2>/dev/null

# Wait for processes to terminate
sleep 2

echo "🚀 Starting servers in new Terminal windows..."

# Get the absolute path of the IPDash directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Start backend server in a new Terminal window
osascript -e "tell application \"Terminal\" to do script \"cd \\\"$SCRIPT_DIR/server\\\" && echo \\\"Starting Backend Server...\\\" && npm start\""

# Brief delay
sleep 1

# Start frontend server in a new Terminal window
osascript -e "tell application \"Terminal\" to do script \"cd \\\"$SCRIPT_DIR\\\" && echo \\\"Starting Frontend Server...\\\" && npm start\""

echo "✅ Both servers are starting in separate Terminal windows"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend: http://localhost:3001" 