# ============================================================================
# CIVICLENS - COMPLETE STARTUP SCRIPT
# ============================================================================
# Starts all required services in separate terminal windows:
# 1. Docker (Redis, MinIO)
# 2. Backend API Server
# 3. AI Worker Engine
# 4. Admin Dashboard (Next.js)
# 5. Client App (Vite)
# 6. Mobile App (Expo) - Optional
# ============================================================================

Write-Host "`n" -NoNewline
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "  CIVICLENS - COMPLETE DEVELOPMENT ENVIRONMENT" -ForegroundColor Cyan
Write-Host "  Starting all services..." -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"

# ============================================================================
# STEP 1: Start Docker Containers (Redis + MinIO)
# ============================================================================
Write-Host "[1/6] Starting Docker Containers (Redis + MinIO)..." -ForegroundColor Yellow

try {
    # Check if Docker is running
    docker ps | Out-Null
    
    Push-Location D:\docker
    docker compose up -d
    Pop-Location
    
    Write-Host "      Docker Containers: Running" -ForegroundColor Green
    Start-Sleep -Seconds 2
} catch {
    Write-Host "      ERROR: Docker is not running or not installed!" -ForegroundColor Red
    Write-Host "      Please start Docker Desktop and try again." -ForegroundColor Yellow
    exit 1
}

# ============================================================================
# STEP 2: Start Backend API Server
# ============================================================================
Write-Host "`n[2/6] Starting Backend API Server..." -ForegroundColor Yellow

$backendScript = @"
Write-Host '============================================================================' -ForegroundColor Cyan
Write-Host '  BACKEND API SERVER' -ForegroundColor Cyan
Write-Host '============================================================================' -ForegroundColor Cyan
Write-Host ''

Set-Location D:\Civiclens\civiclens-backend
& D:\Civiclens\.venv\Scripts\Activate.ps1

Write-Host 'Starting FastAPI server on http://0.0.0.0:8000...' -ForegroundColor Green
Write-Host 'API Docs: http://localhost:8000/docs' -ForegroundColor Green
Write-Host ''

uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendScript
Write-Host "      Backend API: Starting (Port 8000)" -ForegroundColor Green
Start-Sleep -Seconds 3

# ============================================================================
# STEP 3: Start AI Worker Engine
# ============================================================================
Write-Host "`n[3/6] Starting AI Worker Engine..." -ForegroundColor Yellow

$aiWorkerScript = @"
Write-Host '============================================================================' -ForegroundColor Cyan
Write-Host '  AI WORKER ENGINE' -ForegroundColor Cyan
Write-Host '============================================================================' -ForegroundColor Cyan
Write-Host ''

Set-Location D:\Civiclens\civiclens-backend
& D:\Civiclens\.venv\Scripts\Activate.ps1

Write-Host 'Starting AI processing worker...' -ForegroundColor Green
Write-Host 'Logs: logs/ai_worker.log' -ForegroundColor Green
Write-Host ''

uv run python -m app.workers.ai_worker
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $aiWorkerScript
Write-Host "      AI Worker: Starting" -ForegroundColor Green
Start-Sleep -Seconds 2

# ============================================================================
# STEP 4: Start Admin Dashboard (Next.js)
# ============================================================================
Write-Host "`n[4/6] Starting Admin Dashboard (Next.js)..." -ForegroundColor Yellow

$adminScript = @"
Write-Host '============================================================================' -ForegroundColor Cyan
Write-Host '  ADMIN DASHBOARD (Next.js)' -ForegroundColor Cyan
Write-Host '============================================================================' -ForegroundColor Cyan
Write-Host ''

Set-Location D:\Civiclens\civiclens-admin

Write-Host 'Starting Next.js dev server on http://localhost:3001...' -ForegroundColor Green
Write-Host ''

npm run dev
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $adminScript
Write-Host "      Admin Dashboard: Starting (Port 3001)" -ForegroundColor Green
Start-Sleep -Seconds 2

# ============================================================================
# STEP 5: Start Client App (Vite)
# ============================================================================
Write-Host "`n[5/6] Starting Client Web App (Vite)..." -ForegroundColor Yellow

$clientScript = @"
Write-Host '============================================================================' -ForegroundColor Cyan
Write-Host '  CLIENT WEB APP (Vite + React)' -ForegroundColor Cyan
Write-Host '============================================================================' -ForegroundColor Cyan
Write-Host ''

Set-Location D:\Civiclens\civiclens-client

Write-Host 'Starting Vite dev server on http://localhost:8080...' -ForegroundColor Green
Write-Host ''

npm run dev
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $clientScript
Write-Host "      Client App: Starting (Port 8080)" -ForegroundColor Green
Start-Sleep -Seconds 2

# ============================================================================
# STEP 6: Start Mobile App (Expo) - OPTIONAL
# ============================================================================
Write-Host "`n[6/6] Start Mobile App? (Y/N)" -ForegroundColor Yellow
$startMobile = Read-Host "      Press Y to start Expo, or N to skip"

if ($startMobile -eq "Y" -or $startMobile -eq "y") {
    $mobileScript = @"
Write-Host '============================================================================' -ForegroundColor Cyan
Write-Host '  MOBILE APP (React Native + Expo)' -ForegroundColor Cyan
Write-Host '============================================================================' -ForegroundColor Cyan
Write-Host ''

Set-Location D:\Civiclens\civiclens-mobile

Write-Host 'Starting Expo dev server...' -ForegroundColor Green
Write-Host ''

npx expo start --clear
"@

    Start-Process powershell -ArgumentList "-NoExit", "-Command", $mobileScript
    Write-Host "      Mobile App: Starting (Expo)" -ForegroundColor Green
} else {
    Write-Host "      Mobile App: Skipped" -ForegroundColor Gray
}

# ============================================================================
# STARTUP COMPLETE
# ============================================================================
Start-Sleep -Seconds 2

Write-Host "`n"
Write-Host "============================================================================" -ForegroundColor Green
Write-Host "  ALL SERVICES STARTED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "============================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Services Running:" -ForegroundColor White
Write-Host "  1. Docker Containers (Redis, MinIO)" -ForegroundColor Cyan
Write-Host "     - Redis: localhost:6379" -ForegroundColor Gray
Write-Host "     - MinIO: http://localhost:9000" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Backend API Server" -ForegroundColor Cyan
Write-Host "     - API: http://localhost:8000" -ForegroundColor Gray
Write-Host "     - Docs: http://localhost:8000/docs" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. AI Worker Engine" -ForegroundColor Cyan
Write-Host "     - Status: Processing reports" -ForegroundColor Gray
Write-Host "     - Logs: civiclens-backend/logs/ai_worker.log" -ForegroundColor Gray
Write-Host ""
Write-Host "  4. Admin Dashboard" -ForegroundColor Cyan
Write-Host "     - URL: http://localhost:3001" -ForegroundColor Gray
Write-Host "     - Login: +919999999999 / Admin123!" -ForegroundColor Gray
Write-Host ""
Write-Host "  5. Client Web App" -ForegroundColor Cyan
Write-Host "     - URL: http://localhost:8080" -ForegroundColor Gray
Write-Host ""
if ($startMobile -eq "Y" -or $startMobile -eq "y") {
    Write-Host "  6. Mobile App (Expo)" -ForegroundColor Cyan
    Write-Host "     - Scan QR code in Expo Go app" -ForegroundColor Gray
    Write-Host ""
}
Write-Host "============================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Press Ctrl+C in each window to stop services" -ForegroundColor Yellow
Write-Host "  Or run STOP-ALL.ps1 to stop everything at once" -ForegroundColor Yellow
Write-Host ""
Write-Host "============================================================================" -ForegroundColor Green
Write-Host ""

# Keep this window open
Write-Host "Press any key to close this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
