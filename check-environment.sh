#!/bin/bash

# IPDash Environment Check Script
# This script checks if all necessary files and configurations are in place

echo "=== IPDash Environment Check ==="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v14 or higher."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
echo "✅ Node.js $(node -v) is installed."

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "⚠️ PostgreSQL is not installed. Database features will not work."
    echo "You can download it from https://www.postgresql.org/download/"
    POSTGRES_MISSING=true
else
    echo "✅ PostgreSQL is installed."
    POSTGRES_MISSING=false
fi

# Check for .env files
echo "Checking environment files..."
ENV_ISSUES=false

if [ ! -f ".env" ]; then
    echo "⚠️ Missing .env file in root directory."
    ENV_ISSUES=true
else
    echo "✅ Found .env file in root directory."
    
    # Check for Google Maps API Key
    if grep -q "REACT_APP_GOOGLE_MAPS_API_KEY=YOUR_API_KEY_HERE" .env; then
        echo "⚠️ Google Maps API Key not set in .env file."
        ENV_ISSUES=true
    fi
fi

if [ ! -f "server/.env" ]; then
    echo "⚠️ Missing .env file in server directory."
    ENV_ISSUES=true
else
    echo "✅ Found .env file in server directory."
    
    # Check for database credentials
    if grep -q "DB_PASSWORD=your_password_here" server/.env; then
        echo "⚠️ Database password not set in server/.env file."
        ENV_ISSUES=true
    fi
fi

# Check for data files
echo "Checking data files..."
DATA_ISSUES=false

DATA_FILES=("fp_data.xlsx" "Sales.xlsx" "financials.xlsx")
for file in "${DATA_FILES[@]}"; do
    if [ ! -f "server/data/$file" ]; then
        echo "⚠️ Missing data file: server/data/$file"
        DATA_ISSUES=true
    else
        echo "✅ Found data file: server/data/$file"
    fi
done

# Check for node_modules
echo "Checking dependencies..."
DEP_ISSUES=false

if [ ! -d "node_modules" ]; then
    echo "⚠️ Frontend dependencies not installed. Run setup.sh first."
    DEP_ISSUES=true
else
    echo "✅ Frontend dependencies installed."
fi

if [ ! -d "server/node_modules" ]; then
    echo "⚠️ Backend dependencies not installed. Run setup.sh first."
    DEP_ISSUES=true
else
    echo "✅ Backend dependencies installed."
fi

# Summary
echo ""
echo "=== Environment Check Summary ==="

if [ "$ENV_ISSUES" = true ]; then
    echo "⚠️ Environment file issues detected. Please update your .env files."
fi

if [ "$DATA_ISSUES" = true ]; then
    echo "⚠️ Data file issues detected. Please add the missing data files."
fi

if [ "$DEP_ISSUES" = true ]; then
    echo "⚠️ Dependency issues detected. Please run setup.sh first."
fi

if [ "$POSTGRES_MISSING" = true ]; then
    echo "⚠️ PostgreSQL is not installed. Database features will not work."
fi

if [ "$ENV_ISSUES" = false ] && [ "$DATA_ISSUES" = false ] && [ "$DEP_ISSUES" = false ] && [ "$POSTGRES_MISSING" = false ]; then
    echo "✅ All checks passed! You're ready to start the application."
    echo "Run ./start-servers.sh to start the application."
else
    echo ""
    echo "Some issues were detected. Please fix them before starting the application."
    echo "See SETUP_GUIDE.md for more information."
fi