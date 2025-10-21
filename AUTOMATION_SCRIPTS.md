# IPDash Automation Scripts

This document provides an overview of the automation scripts created to simplify the setup and running of the IPDash application.

## Available Scripts

### 1. `setup.sh`

**Purpose**: Automates the installation of dependencies for the IPDash application without requiring PostgreSQL.

**What it does**:
- Checks if Node.js is installed
- Skips PostgreSQL check (assumes it will be installed later)
- Installs frontend dependencies
- Installs backend dependencies
- Creates environment files from examples if they don't exist
- Checks for required data files
- Provides instructions for installing PostgreSQL later

**Usage**:
```bash
./setup.sh
```

### 2. `start-servers.sh`

**Purpose**: Starts both the frontend and backend servers.

**What it does**:
- Kills any existing processes on ports 3000 and 3001
- Starts the backend server in a new Terminal window
- Starts the frontend server in a new Terminal window

**Usage**:
```bash
./start-servers.sh
```

### 3. `setup-database.sh`

**Purpose**: Sets up the PostgreSQL database for IPDash.

**What it does**:
- Loads database configuration from server/.env
- Tests database connection
- Checks if fp_data table exists
- Creates fp_data table if it doesn't exist
- Offers to import data from Excel files
- Runs data cleanup scripts if available

**Usage**:
```bash
./setup-database.sh
```

### 4. `check-environment.sh`

**Purpose**: Checks if the environment is properly set up for running IPDash.

**What it does**:
- Checks if Node.js is installed
- Checks if PostgreSQL is installed
- Checks for environment files (.env)
- Checks if environment variables are properly configured
- Checks for required data files
- Checks if dependencies are installed
- Provides a summary of any issues found

**Usage**:
```bash
./check-environment.sh
```

### 5. `start-frontend-only.sh`

**Purpose**: Starts only the frontend server without requiring the backend or database.

**What it does**:
- Kills any existing processes on port 3000
- Checks if frontend dependencies are installed
- Starts the React frontend server

**Usage**:
```bash
./start-frontend-only.sh
```

## Making Scripts Executable

Before using these scripts, make them executable with the following command:

```bash
chmod +x setup.sh start-servers.sh setup-database.sh check-environment.sh start-frontend-only.sh
```

## Script Dependencies

These scripts require:

- Bash shell
- Node.js (v14 or higher)
- npm package manager
- PostgreSQL (optional, but required for full functionality)

## Troubleshooting

### Permission Denied

If you get a "Permission denied" error when trying to run a script, make sure it's executable:

```bash
chmod +x script_name.sh
```

### PostgreSQL Not Installed

The setup script is designed to work without PostgreSQL initially. If PostgreSQL is not installed:

1. Run the setup script to install dependencies:
   ```bash
   ./setup.sh
   ```

2. Start the frontend-only version of the application:
   ```bash
   ./start-frontend-only.sh
   ```

3. When you're ready to install PostgreSQL:
   - Install PostgreSQL from https://www.postgresql.org/download/
   - Update the server/.env file with your database credentials
   - Run ./setup-database.sh to set up the database
   - Use ./start-servers.sh to start both frontend and backend

Note: Database-dependent features will not work until PostgreSQL is properly installed and configured.

### Node.js Version Issues

If you encounter issues with Node.js versions, make sure you have Node.js v14 or higher installed:

```bash
node -v
```

### Script Modifications

If you need to modify these scripts for your environment:

1. Open the script in a text editor
2. Make your changes
3. Save the file
4. Make it executable again if needed: `chmod +x script_name.sh`