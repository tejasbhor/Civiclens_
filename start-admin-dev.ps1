# Start Admin Dashboard Development Environment
Write-Host "🚀 Starting CivicLens Admin Dashboard Development Environment" -ForegroundColor Cyan
Write-Host ""

# Check if backend is running
Write-Host "Checking backend status..." -ForegroundColor Yellow
try {
    $backendHealth = Invoke-WebRequest -Uri "http://localhost:8000/health" -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($backendHealth.StatusCode -eq 200) {
        Write-Host "✅ Backend is running" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Backend is not running!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Starting backend server..." -ForegroundColor Yellow
    
    # Start backend in new window
    $backendPath = Join-Path $PSScriptRoot "civiclens-backend"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; & '$PSScriptRoot\.venv\Scripts\Activate.ps1'; python -m app.main"
    
    Write-Host "⏳ Waiting for backend to start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
}

Write-Host ""
Write-Host "Starting Admin Dashboard (Next.js)..." -ForegroundColor Yellow

# Navigate to admin directory
cd civiclens-admin

# Start Next.js dev server
npm run dev

Write-Host ""
Write-Host "✅ Admin Dashboard started!" -ForegroundColor Green
Write-Host "   Admin Dashboard: http://localhost:3000" -ForegroundColor Cyan
Write-Host "   Backend API: http://localhost:8000" -ForegroundColor Cyan
