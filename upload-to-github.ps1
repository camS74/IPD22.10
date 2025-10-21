<# 
 Upload-To-GitHub.ps1  (Windows PowerShell 5.1 compatible)
 - Uploads the current project folder to your GitHub repo.
 - Keeps the window OPEN at the end so you can see output.
 - Writes a transcript log to .\logs\upload-YYYYMMDD_HHMMSS.txt (best effort)

 Repo: https://github.com/camS74/IPD26.9.git
#>

[CmdletBinding()]
param(
    [string]$Message = "chore: sync upload",
    [string]$RepoUrl = "https://github.com/camS74/IPD26.9.git",
    [switch]$NoPause # if set, do not pause at the end
)

function Write-Info($m) { Write-Host "[INFO] $m" -ForegroundColor Cyan }
function Write-OK($m)   { Write-Host "[ OK ] $m" -ForegroundColor Green }
function Write-Warn($m) { Write-Host "[WARN] $m" -ForegroundColor Yellow }
function Write-Err($m)  { Write-Host "[FAIL] $m" -ForegroundColor Red }

# --- Logging (compatible with Windows PowerShell 5.1) ---
$TranscriptStarted = $false
try {
    $LogDir  = Join-Path -Path $PSScriptRoot -ChildPath "logs"
    if (-not (Test-Path -LiteralPath $LogDir)) { New-Item -ItemType Directory -Force -Path $LogDir | Out-Null }
    $LogPath = Join-Path -Path $LogDir -ChildPath ("upload-{0}.txt" -f (Get-Date -Format "yyyyMMdd_HHmmss"))
    Start-Transcript -Path $LogPath -Append | Out-Null
    $TranscriptStarted = $true
} catch {
    Write-Warn "Could not start transcript logging. Continuing without a log. ($($_.Exception.Message))"
}

try {
    # 0) Ensure Git exists
    try { git --version | Out-Null }
    catch {
        Write-Err "Git is not installed or not on PATH. Install Git for Windows first."
        throw
    }

    # 1) Work from the folder containing this script
    $ProjectPath = $PSScriptRoot
    Set-Location -LiteralPath $ProjectPath
    Write-Info "Working directory: $ProjectPath"

    # 2) Initialize repository if needed; set default init branch to 'main'
    if (-not (Test-Path ".git")) {
        Write-Info "Initializing git repository..."
        git init | Out-Null
        git config --local init.defaultBranch main
    }

    # 3) Ensure commit identity exists (set only if missing)
    $haveName  = (git config --get user.name)  2>$null
    $haveEmail = (git config --get user.email) 2>$null
    if (-not $haveName)  { git config --local user.name  "Cam" | Out-Null }
    if (-not $haveEmail) { git config --local user.email "camsalloum@gmail.com" | Out-Null }
    Write-OK ("Commit identity: {0} <{1}>" -f (git config --get user.name), (git config --get user.email))

    # 4) Ensure current branch is 'main'
    $current = $null
    try {
        $current = (git rev-parse --abbrev-ref HEAD) 2>$null
    } catch {
        # This happens when repo is newly initialized and has no commits
        $current = $null
    }
    
    if (-not $current -or $current -eq "HEAD") {
        # Check if we have any files to commit
        $hasChanges = git status --porcelain 2>$null
        if ($hasChanges) {
            Write-Info "Making initial commit with existing files..."
            git add -A
            git commit -m "chore: initial commit" | Out-Null
        } else {
            Write-Info "Making empty initial commit..."
            git commit --allow-empty -m "chore: init" | Out-Null
        }
        # Now we can safely create and switch to main branch
        git checkout -b main 2>$null | Out-Null
    } elseif ($current -ne "main") {
        git branch -M main | Out-Null
    }
    Write-OK "Current branch: main"

    # 5) Stage & commit any changes (if any)
    $pending = git status --porcelain
    if ($pending) {
        Write-Info "Staging & committing pending changes..."
        git add -A
        git commit -m $Message | Out-Null
    } else {
        Write-Info "No changes to commit."
    }

    # 6) Configure remote 'origin' to your repo URL
    $hasOrigin = (git remote) -contains "origin"
    if ($hasOrigin) {
        $url = (git remote get-url origin)
        if ($url -ne $RepoUrl) {
            Write-Warn "Updating remote 'origin' from $url -> $RepoUrl"
            git remote set-url origin $RepoUrl | Out-Null
        } else {
            Write-OK "Remote 'origin' already set."
        }
    } else {
        Write-Info "Adding remote 'origin'..."
        git remote add origin $RepoUrl | Out-Null
    }

    # 7) Push
    Write-Info "Pushing to origin/main..."
    git push -u origin main
    if ($LASTEXITCODE -eq 0) {
        Write-OK "Push complete. GitHub repo is up to date."
    } else {
        Write-Err "Push failed."
        Write-Host "If the remote isn't empty, try:"
        Write-Host "    git fetch origin"
        Write-Host "    git pull --rebase origin main"
        Write-Host "    git push -u origin main"
        throw "git push failed"
    }
}
catch {
    Write-Err ("Error: {0}" -f $_.Exception.Message)
}
finally {
    if ($TranscriptStarted) {
        try { Stop-Transcript | Out-Null } catch { }
        if (Test-Path -LiteralPath $LogPath) { Write-Host ("Log saved to: {0}" -f $LogPath) }
    }
    if (-not $NoPause) {
        Read-Host "Done. Press ENTER to close this window"
    }
}
