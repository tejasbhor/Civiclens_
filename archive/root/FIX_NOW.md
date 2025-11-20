# 🔧 Fix Your Setup NOW

## The Problem

Your backend is running on **localhost only**, which means your phone can't access it!

## The Solution (2 Steps)

### Step 1: Stop Current Backend

Press `Ctrl+C` in the terminal where the backend is running.

### Step 2: Restart Backend Properly

```powershell
.\start-backend.ps1
```

**OR** manually:

```powershell
cd civiclens-backend
.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The key is `--host 0.0.0.0` which makes it accessible from your phone!

## Verify It Works

```powershell
.\test-connection.ps1
```

You should see all tests pass!

## Then Start Mobile App

```powershell
.\start-mobile.ps1
```

Or use the all-in-one command:

```powershell
.\start-dev.ps1
```

## Why This Happened

When you start uvicorn without `--host 0.0.0.0`, it defaults to `127.0.0.1` (localhost only).

**Wrong** (only accessible from same computer):
```bash
uvicorn app.main:app --reload
```

**Correct** (accessible from phone on same WiFi):
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Quick Test

After restarting backend, test from PowerShell:

```powershell
# Get your IP
ipconfig | findstr /i "IPv4"

# Test (replace with your IP)
curl http://192.168.1.34:8000/health
```

Should return: `{"status":"healthy","timestamp":"..."}`

## All Fixed? Start Developing!

1. Backend running with `--host 0.0.0.0` ✅
2. Mobile app auto-detects IP ✅
3. Scan QR code with Expo Go ✅
4. Login with: `9876543210` / `password123` ✅

## Still Not Working?

### Check Firewall

```powershell
# Run as Administrator
New-NetFirewallRule -DisplayName "CivicLens Backend" `
  -Direction Inbound `
  -LocalPort 8000 `
  -Protocol TCP `
  -Action Allow
```

### Verify Same WiFi

- Computer and phone must be on the same WiFi network
- Some corporate/public WiFi blocks device-to-device communication

### Check Backend Logs

Look for this line when backend starts:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

NOT this:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

## Summary

**The fix is simple**: Restart backend with `--host 0.0.0.0`

Use the provided scripts to make it automatic!
