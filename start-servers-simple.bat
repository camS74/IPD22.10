@echo off
setlocal ENABLEDELAYEDEXPANSION

REM ====== Resolve script directory ======
set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%"

REM ====== Ensure PowerShell is available ======
where powershell >nul 2>nul
if errorlevel 1 (
  echo PowerShell is not available in PATH. Aborting.
  echo.
  pause
  exit /b 1
)

REM ====== Call the PowerShell orchestrator with safe flags ======
set "PS1=%SCRIPT_DIR%start-servers-win.ps1"
if not exist "%PS1%" (
  echo Could not find "%PS1%".
  echo.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1%" -KeepOpen
set "ERR=%ERRORLEVEL%"

echo.
if not "%ERR%"=="0" (
  echo PowerShell script returned error code %ERR%.
) else (
  echo PowerShell script completed.
)
echo.
pause
exit /b %ERR%






















