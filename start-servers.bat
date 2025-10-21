@echo off
echo Starting IPDash Servers...
cd /d "D:\IPD 9.10"
powershell -ExecutionPolicy Bypass -File "start-servers-win.ps1"
pause

