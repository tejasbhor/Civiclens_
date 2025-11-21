#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Rate Limit Management Script

.DESCRIPTION
    Utility script to reset and check rate limits in Redis

.EXAMPLE
    .\Reset-RateLimits.ps1 -Check
    Check current rate limit status

.EXAMPLE
    .\Reset-RateLimits.ps1 -ResetAll
    Reset all rate limits

.EXAMPLE
    .\Reset-RateLimits.ps1 -Phone "+919876543210"
    Reset rate limits for specific phone

.EXAMPLE
    .\Reset-RateLimits.ps1 -Test
    Run functionality tests
#>

param(
    [switch]$Check,
    [switch]$ResetAll,
    [string]$Phone,
    [string]$Type,
    [switch]$Test,
    [switch]$Interactive
)

# Change to script directory
Set-Location $PSScriptRoot

# Activate virtual environment
Write-Host "`n🔧 Activating virtual environment..." -ForegroundColor Cyan
if (Test-Path "..\..\.venv\Scripts\Activate.ps1") {
    & "..\..\.venv\Scripts\Activate.ps1"
} elseif (Test-Path "..\.venv\Scripts\Activate.ps1") {
    & "..\.venv\Scripts\Activate.ps1"
} else {
    Write-Host "⚠️  Virtual environment not found. Continuing anyway..." -ForegroundColor Yellow
}

function Show-Menu {
    Write-Host "`n================================" -ForegroundColor Green
    Write-Host "Rate Limit Management Tool" -ForegroundColor Green
    Write-Host "================================`n" -ForegroundColor Green
    
    Write-Host "Choose an option:" -ForegroundColor Yellow
    Write-Host "  1. Check current rate limits"
    Write-Host "  2. Reset ALL rate limits"
    Write-Host "  3. Reset rate limits for specific phone"
    Write-Host "  4. Reset specific type for a phone"
    Write-Host "  5. Run functionality tests"
    Write-Host "  6. Exit`n"
}

function Invoke-Check {
    param([string]$PhoneNumber)
    
    Write-Host "`n📊 Checking rate limits..." -ForegroundColor Cyan
    if ($PhoneNumber) {
        python scripts/reset_rate_limits.py --check --phone $PhoneNumber
    } else {
        python scripts/reset_rate_limits.py --check
    }
}

function Invoke-ResetAll {
    Write-Host "`n⚠️  WARNING: This will reset ALL rate limits!" -ForegroundColor Red
    $confirm = Read-Host "Are you sure? (yes/no)"
    
    if ($confirm -eq "yes") {
        Write-Host "`n🔄 Resetting all rate limits..." -ForegroundColor Cyan
        python scripts/reset_rate_limits.py --all
    } else {
        Write-Host "❌ Cancelled" -ForegroundColor Yellow
    }
}

function Invoke-ResetPhone {
    param(
        [string]$PhoneNumber,
        [string]$LimitType
    )
    
    if (-not $PhoneNumber) {
        $PhoneNumber = Read-Host "Enter phone number (e.g., +919876543210)"
    }
    
    Write-Host "`n🔄 Resetting rate limits for $PhoneNumber..." -ForegroundColor Cyan
    
    if ($LimitType) {
        python scripts/reset_rate_limits.py --phone $PhoneNumber --type $LimitType
    } else {
        python scripts/reset_rate_limits.py --phone $PhoneNumber
    }
}

function Invoke-Test {
    Write-Host "`n🧪 Running functionality tests..." -ForegroundColor Cyan
    python scripts/reset_rate_limits.py --test
}

# Main execution
if ($Interactive -or (-not $Check -and -not $ResetAll -and -not $Phone -and -not $Test)) {
    # Interactive mode
    do {
        Show-Menu
        $choice = Read-Host "Enter your choice (1-6)"
        
        switch ($choice) {
            "1" { 
                Invoke-Check 
                Read-Host "`nPress Enter to continue"
            }
            "2" { 
                Invoke-ResetAll 
                Read-Host "`nPress Enter to continue"
            }
            "3" { 
                Invoke-ResetPhone 
                Read-Host "`nPress Enter to continue"
            }
            "4" {
                $phoneNum = Read-Host "Enter phone number"
                $limitType = Read-Host "Enter type (otp/login/password_reset/email_verify/phone_verify)"
                Invoke-ResetPhone -PhoneNumber $phoneNum -LimitType $limitType
                Read-Host "`nPress Enter to continue"
            }
            "5" { 
                Invoke-Test 
                Read-Host "`nPress Enter to continue"
            }
            "6" { 
                Write-Host "`n👋 Goodbye!" -ForegroundColor Green
                break 
            }
            default { 
                Write-Host "`n❌ Invalid choice. Please try again." -ForegroundColor Red 
                Start-Sleep -Seconds 1
            }
        }
    } while ($choice -ne "6")
} else {
    # Command-line mode
    if ($Check) {
        Invoke-Check -PhoneNumber $Phone
    } elseif ($ResetAll) {
        Invoke-ResetAll
    } elseif ($Phone) {
        Invoke-ResetPhone -PhoneNumber $Phone -LimitType $Type
    } elseif ($Test) {
        Invoke-Test
    }
}

Write-Host ""
