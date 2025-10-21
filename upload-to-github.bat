@echo off
echo 🚀 Starting GitHub Upload Process...
echo.

REM Check if PowerShell is available
powershell -Command "& {Write-Host '✅ PowerShell is available' -ForegroundColor Green}"

REM Run the PowerShell script
echo 📝 Executing upload script...
powershell -ExecutionPolicy Bypass -File "upload-to-github.ps1"

echo.
echo 📋 Upload process completed!
pause
