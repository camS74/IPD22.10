#Requires -Version 5.1
[CmdletBinding()]
param(
  [switch]$KeepOpen
)

function Write-Header {
  Write-Host ""
  Write-Host " IPDash Server Startup Script" -ForegroundColor Cyan
  Write-Host "================================" -ForegroundColor Cyan
}

function Stop-Node {
  Write-Host "Stopping existing Node.js processes..." -ForegroundColor Yellow
  try {
    $procs = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($procs) {
      $procs | Stop-Process -Force
      Start-Sleep -Seconds 2
      Write-Host "Existing Node.js processes stopped." -ForegroundColor Green
    } else {
      Write-Host "No Node.js processes found." -ForegroundColor DarkYellow
    }
  } catch {
    Write-Host "Warning: $_" -ForegroundColor DarkYellow
  }
}

function Ensure-Npm {
  if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw "npm is not available in PATH. Install Node.js (which includes npm) and try again."
  }
}

function Start-App {
  param(
    [Parameter(Mandatory=$true)][string]$Name,
    [Parameter(Mandatory=$true)][string]$Dir,
    [Parameter(Mandatory=$true)][string]$NpmScript
  )

  if (-not (Test-Path -LiteralPath $Dir)) {
    Write-Host "Missing $Name directory: $Dir" -ForegroundColor Red
    return $false
  }

  Push-Location $Dir
  try {
    if (-not (Test-Path -LiteralPath "package.json")) {
      Write-Host "package.json not found in $Dir" -ForegroundColor Red
      return $false
    }

    if (-not (Test-Path -LiteralPath "node_modules")) {
      Write-Host "${Name}: installing dependencies (npm ci)..." -ForegroundColor Yellow
      npm ci
      if ($LASTEXITCODE -ne 0) {
        Write-Host "${Name}: npm ci failed with code $LASTEXITCODE" -ForegroundColor Red
        return $false
      }
    }

    Write-Host "Starting $Name (npm $NpmScript)..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Dir'; npm $NpmScript" -WindowStyle Normal
    return $true
  } finally {
    Pop-Location
  }
}

try {
  $ErrorActionPreference = "Stop"
  Write-Header
  Ensure-Npm
  Stop-Node

  # Resolve folders relative to this .ps1
  $root = Split-Path -Parent $PSCommandPath
  $backendDir  = Join-Path $root "server"
  $frontendDir = $root

  # Start backend first, then frontend
  $ok1 = Start-App -Name "Backend"  -Dir $backendDir  -NpmScript "start"
  Start-Sleep -Seconds 5
  $ok2 = Start-App -Name "Frontend" -Dir $frontendDir -NpmScript "start"

  Write-Host ""
  Write-Host "Servers start command(s) issued." -ForegroundColor Cyan
  Write-Host "Backend (expected): http://localhost:3001" -ForegroundColor DarkCyan
  Write-Host "Frontend (expected): http://localhost:3000" -ForegroundColor DarkCyan
  Write-Host ""

  if (-not ($ok1 -and $ok2)) {
    Write-Host "One or more start commands failed. Check the package.json scripts and paths." -ForegroundColor Red
    exit 1
  }

} catch {
  Write-Host ""
  Write-Host "FATAL: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "STACK: $($_.ScriptStackTrace)" -ForegroundColor DarkGray
  if ($KeepOpen) {
    Write-Host ""
    Write-Host "Press any key to close..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
  }
  exit 1
}

if ($KeepOpen) {
  Write-Host ""
  Write-Host "Press any key to close this window (servers keep running in their own windows)..." -ForegroundColor Yellow
  $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}
exit 0
