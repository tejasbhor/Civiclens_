# Verify CivicLens Development Setup
Write-Host "`n🔍 CivicLens Setup Verification`n" -ForegroundColor Cyan

$allGood = $true

# Check 1: Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found" -ForegroundColor Red
    $allGood = $false
}

# Check 2: Python
Write-Host "Checking Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version
    Write-Host "✅ Python installed: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python not found" -ForegroundColor Red
    $allGood = $false
}

# Check 3: Backend directory
Write-Host "Checking backend directory..." -ForegroundColor Yellow
if (Test-Path "civiclens-backend") {
    Write-Host "✅ Backend directory exists" -ForegroundColor Green
    
    # Check virtual environment
    if (Test-Path "civiclens-backend\.venv") {
        Write-Host "✅ Virtual environment exists" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Virtual environment not found" -ForegroundColor Yellow
        Write-Host "   Run: cd civiclens-backend; python -m venv .venv" -ForegroundColor Gray
        $allGood = $false
    }
} else {
    Write-Host "❌ Backend directory not found" -ForegroundColor Red
    $allGood = $false
}

# Check 4: Mobile directory
Write-Host "Checking mobile directory..." -ForegroundColor Yellow
if (Test-Path "civiclens-mobile") {
    Write-Host "✅ Mobile directory exists" -ForegroundColor Green
    
    # Check node_modules
    if (Test-Path "civiclens-mobile\node_modules") {
        Write-Host "✅ Node modules installed" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Node modules not found" -ForegroundColor Yellow
        Write-Host "   Run: cd civiclens-mobile; npm install" -ForegroundColor Gray
        $allGood = $false
    }
} else {
    Write-Host "❌ Mobile directory not found" -ForegroundColor Red
    $allGood = $false
}

# Check 5: PostgreSQL
Write-Host "Checking PostgreSQL..." -ForegroundColor Yellow
try {
    $pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
    if ($pgService) {
        if ($pgService.Status -eq "Running") {
            Write-Host "✅ PostgreSQL is running" -ForegroundColor Green
        } else {
            Write-Host "⚠️  PostgreSQL is installed but not running" -ForegroundColor Yellow
            Write-Host "   Start it from Services or pgAdmin" -ForegroundColor Gray
        }
    } else {
        Write-Host "⚠️  PostgreSQL service not found" -ForegroundColor Yellow
        Write-Host "   Make sure PostgreSQL is installed and running" -ForegroundColor Gray
    }
} catch {
    Write-Host "⚠️  Could not check PostgreSQL status" -ForegroundColor Yellow
}

# Check 6: Redis
Write-Host "Checking Redis..." -ForegroundColor Yellow
try {
    $redisService = Get-Service -Name "Redis" -ErrorAction SilentlyContinue
    if ($redisService) {
        if ($redisService.Status -eq "Running") {
            Write-Host "✅ Redis is running" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Redis is installed but not running" -ForegroundColor Yellow
            Write-Host "   Start it from Services" -ForegroundColor Gray
        }
    } else {
        Write-Host "⚠️  Redis service not found" -ForegroundColor Yellow
        Write-Host "   Install Redis for Windows or use WSL" -ForegroundColor Gray
    }
} catch {
    Write-Host "⚠️  Could not check Redis status" -ForegroundColor Yellow
}

# Check 7: Network
Write-Host "Checking network..." -ForegroundColor Yellow
$wifiIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -like "*Wi-Fi*" -or $_.InterfaceAlias -like "*Wireless*"} | Select-Object -First 1).IPAddress

if ($wifiIP) {
    Write-Host "✅ WiFi IP detected: $wifiIP" -ForegroundColor Green
} else {
    $anyIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -ne "127.0.0.1"} | Select-Object -First 1).IPAddress
    if ($anyIP) {
        Write-Host "✅ Network IP detected: $anyIP" -ForegroundColor Green
    } else {
        Write-Host "⚠️  No network IP found" -ForegroundColor Yellow
        $allGood = $false
    }
}

# Check 8: Firewall
Write-Host "Checking firewall..." -ForegroundColor Yellow
try {
    $firewallRule = Get-NetFirewallRule -DisplayName "CivicLens Backend" -ErrorAction SilentlyContinue
    if ($firewallRule) {
        Write-Host "✅ Firewall rule exists" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Firewall rule not found" -ForegroundColor Yellow
        Write-Host "   Run as admin: New-NetFirewallRule -DisplayName 'CivicLens Backend' -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow" -ForegroundColor Gray
    }
} catch {
    Write-Host "⚠️  Could not check firewall (run as admin to check)" -ForegroundColor Yellow
}

# Summary
Write-Host "`n" -NoNewline
if ($allGood) {
    Write-Host "🎉 Setup looks good! Ready to start development." -ForegroundColor Green
    Write-Host "`nNext steps:" -ForegroundColor Cyan
    Write-Host "  1. Start development: .\start-dev.ps1" -ForegroundColor White
    Write-Host "  2. Or test connection: .\test-connection.ps1`n" -ForegroundColor White
} else {
    Write-Host "⚠️  Some issues found. Please fix them before starting." -ForegroundColor Yellow
    Write-Host "`nCommon fixes:" -ForegroundColor Cyan
    Write-Host "  Backend: cd civiclens-backend; python -m venv .venv; .venv\Scripts\Activate.ps1; pip install -r requirements.txt" -ForegroundColor White
    Write-Host "  Mobile: cd civiclens-mobile; npm install`n" -ForegroundColor White
}
