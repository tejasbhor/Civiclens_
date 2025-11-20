# Start CivicLens Mobile App with auto IP detection
Write-Host "`n📱 Starting CivicLens Mobile App..." -ForegroundColor Cyan

# Get WiFi IP
$wifiIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -like "*Wi-Fi*" -or $_.InterfaceAlias -like "*Wireless*"} | Select-Object -First 1).IPAddress

if (-not $wifiIP) {
    # Fallback to first non-loopback IPv4
    $wifiIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -ne "127.0.0.1"} | Select-Object -First 1).IPAddress
}

Write-Host "📡 Your WiFi IP: $wifiIP" -ForegroundColor Green
Write-Host "🔗 App will connect to: http://${wifiIP}:8000/api/v1" -ForegroundColor Green

# Check if backend is running
try {
    $response = Invoke-WebRequest -Uri "http://${wifiIP}:8000/health" -TimeoutSec 3 -ErrorAction Stop
    Write-Host "✅ Backend is running!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Backend not detected at http://${wifiIP}:8000" -ForegroundColor Yellow
    Write-Host "`nTo start backend, run in another terminal:" -ForegroundColor Yellow
    Write-Host "  .\start-backend.ps1`n" -ForegroundColor Cyan
    
    $continue = Read-Host "Continue anyway? (y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        Write-Host "Exiting..." -ForegroundColor Red
        exit 0
    }
}

# Change to mobile directory
Set-Location civiclens-mobile

Write-Host "`n🎯 Starting Expo development server..." -ForegroundColor Cyan
Write-Host "📱 Scan QR code with Expo Go app`n" -ForegroundColor Green

# Start Expo
npm start
