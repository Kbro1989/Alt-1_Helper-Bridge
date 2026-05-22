# Host and Launch Aegis in Alt1
# This script automates building the project, hosting it locally on port 8080, and launching Alt1 for testing.

$ErrorActionPreference = "Stop"

# 1. Build Verification
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Aegis Alt1-AI: Diagnostic Build & Host Substrate " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

if (-not (Test-Path "dist\index.html")) {
    Write-Host "[BUILD] dist directory or index.html not found. Running compilation..." -ForegroundColor Yellow
    npm run build
} else {
    Write-Host "[BUILD] Found existing production build in dist/." -ForegroundColor Green
    Write-Host "[BUILD] Rebuilding to ensure latest updates are included..." -ForegroundColor Yellow
    npm run build
}

# 2. Port Check
$port = 8080
Write-Host "[PORT] Verifying if port $port is available..." -ForegroundColor Cyan
$portActive = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($portActive) {
    Write-Host "[PORT] Port $port is already in use by process ID $($portActive.OwningProcess[0])." -ForegroundColor Red
    Write-Host "[PORT] Please terminate that process or modify the port configuration." -ForegroundColor Red
    Exit 1
}

# 3. Host Selection (npx serve or python)
$serverJob = $null
if (Get-Command "npx" -ErrorAction SilentlyContinue) {
    Write-Host "[HOST] Launching background server via 'npx serve'..." -ForegroundColor Green
    $serverJob = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npx serve dist -p $port" -NoNewWindow -PassThru
} elseif (Get-Command "python" -ErrorAction SilentlyContinue) {
    Write-Host "[HOST] Launching background server via Python http.server..." -ForegroundColor Green
    $serverJob = Start-Process -FilePath "python" -ArgumentList "-m", "http.server", "$port", "--directory", "dist" -NoNewWindow -PassThru
} else {
    Write-Host "[HOST] Error: Neither npx nor python found in PATH. Cannot host the app." -ForegroundColor Red
    Exit 1
}

# Wait for server to initialize
Start-Sleep -Seconds 2
Write-Host "[HOST] Local server running at http://localhost:$port/" -ForegroundColor Green

# 4. Register app config URL to Alt1 protocol
$alt1Url = "alt1://addapp/http://localhost:$port/appconfig.json"
Write-Host "[ALT1] Launching Alt1 custom protocol registration: $alt1Url" -ForegroundColor Cyan
try {
    Start-Process $alt1Url
    Write-Host "[ALT1] Alt1 app installation prompt triggered successfully." -ForegroundColor Green
} catch {
    Write-Host "[ALT1] Failed to launch alt1:// protocol. Ensure Alt1 Toolkit is installed and running." -ForegroundColor Red
}

Write-Host "`nServer is running in background (PID: $($serverJob.Id))." -ForegroundColor Magenta
Write-Host "Press any key to stop hosting and terminate the server..." -ForegroundColor Yellow
$null = [Console]::ReadKey($true)

Write-Host "`n[STOP] Shutting down host server process $($serverJob.Id)..." -ForegroundColor Yellow
Stop-Process -Id $serverJob.Id -Force
Write-Host "[STOP] Cleanup complete." -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
