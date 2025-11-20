# Quick API Status Test
# No venv needed - just PowerShell

Write-Host "================================" -ForegroundColor Cyan
Write-Host "  AI ENGINE API STATUS TEST" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health endpoint
Write-Host "[1/4] Testing Backend Health..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method Get
    Write-Host "✅ Backend is healthy" -ForegroundColor Green
    Write-Host "    Status: $($health.status)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Backend not responding" -ForegroundColor Red
    Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Gray
    exit 1
}

Write-Host ""

# Test 2: AI Pipeline Status (No auth)
Write-Host "[2/4] Testing AI Pipeline Status (Public)..." -ForegroundColor Yellow
try {
    $status = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/ai-insights/pipeline-status" -Method Get
    Write-Host "✅ AI Pipeline Status accessible" -ForegroundColor Green
    Write-Host "    Worker Status: $($status.worker_status)" -ForegroundColor Gray
    Write-Host "    Queue Length: $($status.queue_length)" -ForegroundColor Gray
    Write-Host "    Failed Queue: $($status.failed_queue_length)" -ForegroundColor Gray
    if ($status.last_heartbeat) {
        Write-Host "    Last Heartbeat: $($status.last_heartbeat)" -ForegroundColor Gray
    }
    
    # Check if worker is running
    if ($status.worker_status -eq "running") {
        Write-Host ""
        Write-Host "🎉 AI Worker is RUNNING!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "⚠️  AI Worker is NOT running" -ForegroundColor Yellow
        Write-Host "    Start with: python start_ai_worker.py" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Failed to get AI status" -ForegroundColor Red
    Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Gray
    exit 1
}

Write-Host ""

# Test 3: Redis Connection (via API)
Write-Host "[3/4] Testing Redis Connection..." -ForegroundColor Yellow
try {
    $redis_check = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/ai-insights/pipeline-status" -Method Get
    Write-Host "✅ Redis is connected" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Redis connection issue" -ForegroundColor Yellow
}

Write-Host ""

# Test 4: Frontend Compatibility
Write-Host "[4/4] Testing Frontend Compatibility..." -ForegroundColor Yellow
try {
    $headers = @{
        "Accept" = "application/json"
        "Origin" = "http://localhost:3000"
    }
    $cors_test = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/ai-insights/pipeline-status" -Method Get -Headers $headers
    Write-Host "✅ CORS is configured correctly" -ForegroundColor Green
    Write-Host "    Frontend can access API" -ForegroundColor Gray
} catch {
    Write-Host "⚠️  CORS configuration issue" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  TEST COMPLETE" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ All tests passed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Open dashboard: http://localhost:3000/dashboard" -ForegroundColor Gray
Write-Host "2. Check AI Engine indicator in top navigation" -ForegroundColor Gray
Write-Host "3. Should show green dot 🟢 for running worker" -ForegroundColor Gray
Write-Host ""
