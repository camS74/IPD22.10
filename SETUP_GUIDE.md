# IPDash Setup Guide

This guide will help you set up and run the IPDash application on your macOS system.

## Prerequisites

Before you begin, make sure you have the following installed:

1. **Node.js** (v14 or higher) - Required
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify with `node -v`

2. **PostgreSQL** - Can be installed later
   - Download from [postgresql.org](https://www.postgresql.org/download/macosx/)
   - Or install with Homebrew: `brew install postgresql`
   - Start PostgreSQL: `brew services start postgresql`
   - Note: You can proceed with frontend-only setup without PostgreSQL initially

3. **Git** (optional, for version control)
   - Download from [git-scm.com](https://git-scm.com/download/mac)
   - Or install with Homebrew: `brew install git`

## Setup Process

We've created several scripts to automate the setup process. Follow these steps:

### Step 1: Make Scripts Executable

Open Terminal and navigate to the project directory, then make the scripts executable:

```bash
chmod +x setup.sh start-servers.sh setup-database.sh check-environment.sh start-frontend-only.sh
```

### Step 2: Run the Setup Script

This script will install all necessary dependencies for both frontend and backend:

```bash
./setup.sh
```

The script will:
- Check if Node.js is installed
- Install frontend and backend dependencies
- Create environment files from examples if they don't exist
- Check for required data files

Note: You can install dependencies first and PostgreSQL later. The setup script will proceed even if PostgreSQL is not installed.

### Step 3: Configure Environment Variables

Edit the following files with your actual configuration:

1. `.env` in the root directory:
   - Set `REACT_APP_GOOGLE_MAPS_API_KEY` if you're using Google Maps

2. `server/.env`:
   - Set database credentials (host, port, username, password)
   - Default values are provided but should be updated for security

### Step 4: Set Up the Database (After PostgreSQL Installation)

Once PostgreSQL is installed, run the database setup script:

```bash
./setup-database.sh
```

This script will:
- Test the database connection using credentials from `server/.env`
- Create the `fp_data` table if it doesn't exist
- Offer to import data from Excel files (requires manual steps)
- Run data cleanup scripts if available

Note: Skip this step if you haven't installed PostgreSQL yet. You can come back to it later.

### Step 5: Import Data (After PostgreSQL Installation)

After PostgreSQL is installed, for importing data from Excel files, follow the instructions in `DBeaver_Setup_Guide.md`. This involves:

1. Installing DBeaver or pgAdmin
2. Connecting to your PostgreSQL database
3. Importing data from `fp_data.xlsx` into the `fp_data` table

Note: Skip this step if you haven't installed PostgreSQL yet. You can come back to it later.

### Step 6: Check Your Environment

Before starting the application, you can check if your environment is properly set up:

```bash
./check-environment.sh
```

This script will check:
- If Node.js and PostgreSQL are installed
- If environment files are properly configured
- If required data files exist
- If dependencies are installed

### Step 7: Start the Application

You have several options to start the application:

**Option 1: Start both frontend and backend (requires PostgreSQL)**

```bash
./start-servers.sh
```

This will open two Terminal windows:
- One running the backend server on port 3001
- One running the frontend server on port 3000

**Option 2: Start frontend only (recommended if PostgreSQL is not installed yet)**

```bash
./start-frontend-only.sh
```

This will start only the React frontend. This is the recommended option if you haven't installed PostgreSQL yet.

Note: Database-dependent features will not work in this mode, but you can still explore the frontend interface.

Access the application at [http://localhost:3000](http://localhost:3000)

## Troubleshooting

### Database Connection Issues

- Verify PostgreSQL is running: `brew services list`
- Check credentials in `server/.env`
- Test connection: `psql -h localhost -U postgres -d postgres`

### Missing Data Files

Ensure these files exist in the `server/data` directory:
- `fp_data.xlsx`
- `Sales.xlsx`
- `financials.xlsx`

### Port Conflicts

If ports 3000 or 3001 are already in use:
- The start script will attempt to kill existing processes
- If issues persist, manually find and kill the processes:
  ```bash
  lsof -i :3000  # Find process on port 3000
  kill -9 <PID>  # Kill the process
  ```

## Manual Setup (Alternative)

If the scripts don't work for you, follow these manual steps:

1. Install dependencies:
   ```bash
   # Frontend
   npm install
   
   # Backend
   cd server
   npm install
   cd ..
   ```

2. Create and configure `.env` files

3. Set up the PostgreSQL database and import data

4. Start the servers:
   ```bash
   # Start backend
   cd server
   node server.js
   
   # Start frontend (in a new terminal)
   npm start
   ```

## Need Help?

Refer to the following documentation:
- `README.md` - General project information
- `DATABASE_SETUP.md` - Detailed database setup instructions
- `DBeaver_Setup_Guide.md` - Guide for importing data using DBeaver
- `DATA_IMPORT_GUIDE.md` - Best practices for data import