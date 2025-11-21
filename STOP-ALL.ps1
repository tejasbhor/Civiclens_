# ============================================================================
# CIVICLENS - STOP ALL SERVICES SCRIPT
# ============================================================================
# Stops all CivicLens services gracefully
# ============================================================================

Write-Host "`n" -NoNewline
Write-Host "============================================================================" -ForegroundColor Red
Write-Host "  CIVICLENS - STOPPING ALL SERVICES" -ForegroundColor Red
Write-Host "============================================================================" -ForegroundColor Red
Write-Host ""

$ErrorActionPreference = "Continue"

# ============================================================================
# STEP 1: Stop Node.js processes (Admin + Client + Mobile)
# ============================================================================
Write-Host "[1/3] Stopping Node.js servers (Admin, Client, Mobile)..." -ForegroundColor Yellow

$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    $nodeProcesses | Stop-Process -Force
    Write-Host "      Stopped $($nodeProcesses.Count) Node.js process(es)" -ForegroundColor Green
} else {
    Write-Host "      No Node.js processes running" -ForegroundColor Gray
}

# ============================================================================
# STEP 2: Stop Python processes (Backend API + AI Worker)
# ============================================================================
Write-Host "`n[2/3] Stopping Python servers (Backend API, AI Worker)..." -ForegroundColor Yellow

# Find Python processes running uvicorn or ai_worker
$pythonProcesses = Get-Process -Name python -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*uvicorn*" -or 
    $_.CommandLine -like "*ai_worker*" -or
    $_.Path -like "*Civiclens*"
}

if ($pythonProcesses) {
    $pythonProcesses | Stop-Process -Force
    Write-Host "      Stopped $($pythonProcesses.Count) Python process(es)" -ForegroundColor Green
} else {
    Write-Host "      No Python processes running" -ForegroundColor Gray
}

# ============================================================================
# STEP 3: Stop Docker Containers
# ============================================================================
Write-Host "`n[3/3] Stopping Docker containers (Redis, MinIO)..." -ForegroundColor Yellow

try {
    Push-Location D:\docker
    docker compose down
    Pop-Location
    Write-Host "      Docker containers stopped" -ForegroundColor Green
} catch {
    Write-Host "      Docker not running or error stopping containers" -ForegroundColor Gray
}

# ============================================================================
# CLEANUP COMPLETE
# ============================================================================
Write-Host "`n"
Write-Host "============================================================================" -ForegroundColor Green
Write-Host "  ALL SERVICES STOPPED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "============================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  All CivicLens services have been stopped." -ForegroundColor White
Write-Host "  You can now:" -ForegroundColor White
Write-Host "  - Close all terminal windows" -ForegroundColor Gray
Write-Host "  - Run START-ALL.ps1 to restart everything" -ForegroundColor Gray
Write-Host ""
Write-Host "============================================================================" -ForegroundColor Green
Write-Host ""

Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
