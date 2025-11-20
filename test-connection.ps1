# Test CivicLens Backend Connection
Write-Host ""
Write-Host "Testing CivicLens Backend Connection" -ForegroundColor Cyan
Write-Host ""

# Get WiFi IP
$wifiIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -like "*Wi-Fi*" -or $_.InterfaceAlias -like "*Wireless*"} | Select-Object -First 1).IPAddress

if (-not $wifiIP) {
    $wifiIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -ne "127.0.0.1"} | Select-Object -First 1).IPAddress
}

Write-Host "Your WiFi IP: $wifiIP" -ForegroundColor Green
Write-Host ""

# Test 1: Health Check
Write-Host "Test 1: Health Check" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://${wifiIP}:8000/health" -Method Get
    Write-Host "SUCCESS: Backend is healthy!" -ForegroundColor Green
    Write-Host "   Status: $($response.status)" -ForegroundColor Gray
    Write-Host "   Timestamp: $($response.timestamp)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "FAILED: Backend not accessible at http://${wifiIP}:8000" -ForegroundColor Red
    Write-Host "   Make sure backend is running with: .\start-backend.ps1" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Test 2: API Docs
Write-Host "Test 2: API Documentation" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://${wifiIP}:8000/docs" -Method Get
    Write-Host "SUCCESS: API docs accessible!" -ForegroundColor Green
    Write-Host "   URL: http://${wifiIP}:8000/docs" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "WARNING: API docs not accessible" -ForegroundColor Yellow
    Write-Host ""
}

# Test 3: Request OTP
Write-Host "Test 3: Auth API - Request OTP" -ForegroundColor Yellow
try {
    $body = @{
        phone = "+919876543210"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "http://${wifiIP}:8000/api/v1/auth/request-otp" `
        -Method Post `
        -ContentType "application/json" `
        -Body $body

    Write-Host "SUCCESS: OTP request successful!" -ForegroundColor Green
    Write-Host "   Message: $($response.message)" -ForegroundColor Gray
    if ($response.otp) {
        Write-Host "   Debug OTP: $($response.otp)" -ForegroundColor Cyan
    }
    Write-Host "   Expires in: $($response.expires_in_minutes) minutes" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "FAILED: OTP request failed" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# Test 4: Login
Write-Host "Test 4: Auth API - Login" -ForegroundColor Yellow
try {
    $body = @{
        phone = "9876543210"
        password = "password123"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "http://${wifiIP}:8000/api/v1/auth/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $body

    Write-Host "SUCCESS: Login successful!" -ForegroundColor Green
    Write-Host "   User ID: $($response.user_id)" -ForegroundColor Gray
    Write-Host "   Role: $($response.role)" -ForegroundColor Gray
    Write-Host "   Token: $($response.access_token.Substring(0, 20))..." -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "FAILED: Login failed" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

Write-Host "Connection tests complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Start mobile app: .\start-mobile.ps1" -ForegroundColor White
Write-Host "  2. Scan QR code with Expo Go" -ForegroundColor White
Write-Host "  3. Login with phone: 9876543210 and password: password123" -ForegroundColor White
Write-Host ""
