@echo off
setlocal
set SCRIPT=%~dp0upload-to-github.ps1
if not exist "%SCRIPT%" (
  echo [FAIL] Cannot find Upload-To-GitHub.ps1 next to this file.
  pause
  exit /b 1
)
:: Open PowerShell and KEEP the window open (-NoExit) so you can see output
powershell -NoProfile -NoExit -ExecutionPolicy Bypass -File "%SCRIPT%"
endlocal
