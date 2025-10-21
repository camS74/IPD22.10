@echo off
REM === One-click runner for: D:\IPD16.9\transform fp excel to sql - FIXED.ps1 ===
REM FIXED VERSION - NO MERGING, PRESERVES ALL ROWS
setlocal

REM ---- Database config (use environment variables for security) ----
REM Set these as environment variables instead of hardcoding:
REM set FP_DB_HOST=localhost
REM set FP_DB_PORT=5432  
REM set FP_DB_NAME=fp_database
REM set FP_DB_USER=postgres
REM set FP_DB_PASSWORD=your_secure_password

REM Fallback values if environment variables not set
if not defined FP_DB_HOST set "FP_DB_HOST=localhost"
if not defined FP_DB_PORT set "FP_DB_PORT=5432"
if not defined FP_DB_NAME set "FP_DB_NAME=fp_database"
if not defined FP_DB_USER set "FP_DB_USER=postgres"
if not defined FP_DB_PASSWORD set "FP_DB_PASSWORD=654883"
set "EXCEL=D:\IPD16.9\server\data\fp_data main.xlsx"
set "SCRIPT=D:\IPD16.9\transform fp excel to sql - FIXED.ps1"
set "PSQL_BIN=C:\Program Files\PostgreSQL\17\bin"
REM --------------------------------------------------------

REM Ensure psql is reachable
if exist "%PSQL_BIN%\psql.exe" set "PATH=%PATH%;%PSQL_BIN%"

REM Map FP_* env vars to the parameters the PS1 expects
set "PGHOST=%FP_DB_HOST%"
set "PGPORT=%FP_DB_PORT%"
set "PGDATABASE=%FP_DB_NAME%"
set "PGUSER=%FP_DB_USER%"
set "PGPASSWORD=%FP_DB_PASSWORD%"

REM Prefer PowerShell 7 (x64) EXE (same target as the .lnk you referenced)
set "PWSH_EXE=C:\Program Files\PowerShell\7\pwsh.exe"

REM Unblock the PowerShell script (remove Mark-of-the-Web) before running
powershell -NoLogo -NoProfile -ExecutionPolicy Bypass ^
  -Command "if (Test-Path -LiteralPath '%SCRIPT%') { Unblock-File -LiteralPath '%SCRIPT%' }"

if exist "%PWSH_EXE%" (
  "%PWSH_EXE%" -NoLogo -NoProfile -ExecutionPolicy Bypass -NoExit -File "%SCRIPT%" ^
    -PgHost "%PGHOST%" -PgPort %PGPORT% -PgDatabase "%PGDATABASE%" ^
    -PgUser "%PGUSER%" -PgPassword "%PGPASSWORD%" ^
    -ExcelPath "%EXCEL%"
) else (
  REM Fallback to pwsh in PATH with ExecutionPolicy Bypass
  where pwsh >nul 2>&1
  if %ERRORLEVEL% EQU 0 (
    pwsh -NoLogo -NoProfile -ExecutionPolicy Bypass -NoExit -File "%SCRIPT%" ^
      -PgHost "%PGHOST%" -PgPort %PGPORT% -PgDatabase "%PGDATABASE%" ^
      -PgUser "%PGUSER%" -PgPassword "%PGPASSWORD%" ^
      -ExcelPath "%EXCEL%"
  ) else (
    REM Fallback: Windows PowerShell (compatible with 5.1+)
    powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -NoExit -File "%SCRIPT%" ^
      -PgHost "%PGHOST%" -PgPort %PGPORT% -PgDatabase "%PGDATABASE%" ^
      -PgUser "%PGUSER%" -PgPassword "%PGPASSWORD%" ^
      -ExcelPath "%EXCEL%"
  )
)

echo.
echo Done. Press any key to close
pause >nul
endlocal
