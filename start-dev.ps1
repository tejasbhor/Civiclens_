# Start Full CivicLens Development Environment
Write-Host "`n🚀 CivicLens Full Development Setup`n" -ForegroundColor Cyan

# Get WiFi IP
$wifiIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -like "*Wi-Fi*" -or $_.InterfaceAlias -like "*Wireless*"} | Select-Object -First 1).IPAddress

if (-not $wifiIP) {
    # Fallback to first non-loopback IPv4
    $wifiIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -ne "127.0.0.1"} | Select-Object -First 1).IPAddress
}

Write-Host "📡 Detected WiFi IP: $wifiIP" -ForegroundColor Green
Write-Host "🔗 API URL: http://${wifiIP}:8000/api/v1" -ForegroundColor Green
Write-Host "📚 API Docs: http://${wifiIP}:8000/docs`n" -ForegroundColor Green

# Start backend in new window
Write-Host "🔧 Starting backend server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "& '.\start-backend.ps1'"

# Wait for backend to start
Write-Host "⏳ Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check if backend is running
$backendReady = $false
for ($i = 0; $i -lt 10; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://${wifiIP}:8000/health" -TimeoutSec 2 -ErrorAction Stop
        $backendReady = $true
        break
    } catch {
        Start-Sleep -Seconds 2
    }
}

if ($backendReady) {
    Write-Host "✅ Backend is ready!`n" -ForegroundColor Green
} else {
    Write-Host "⚠️  Backend taking longer than expected..." -ForegroundColor Yellow
    Write-Host "Check the backend window for errors`n" -ForegroundColor Yellow
}

# Start mobile app
Write-Host "📱 Starting mobile app..." -ForegroundColor Yellow
Set-Location civiclens-mobile
npm start
