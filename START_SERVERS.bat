@echo off
REM ============================================
REM IPDash Server Startup Script
REM ============================================
REM 
REM This script uses the official server restart method
REM as specified in project documentation:
REM - SALES_BY_CUSTOMER_IMPLEMENTATION_GUIDE.md
REM - TESTING_GUIDE.md
REM 
REM IMPORTANT: Always use start-servers-win.ps1 to restart servers
REM ============================================

echo.
echo ============================================
echo   IPDash Server Startup
echo ============================================
echo.

REM Get the directory where this batch file is located
SET SCRIPT_DIR=%~dp0

REM Use the official PowerShell script as per project rules
echo Using official server restart method: start-servers-win.ps1
echo.

REM Check if the PowerShell script exists
if not exist "%SCRIPT_DIR%start-servers-win.ps1" (
    echo ERROR: start-servers-win.ps1 not found!
    echo Please ensure the PowerShell script is in the project root.
    echo.
    pause
    exit /b 1
)

REM Execute the official PowerShell startup script
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%start-servers-win.ps1" -KeepOpen

echo.
echo Script execution completed.
echo.
pause
