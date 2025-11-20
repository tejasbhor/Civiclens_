# 🚀 START HERE - CivicLens Development Setup

## ⚡ Quick Fix (If Backend Already Running)

Your backend is currently running on **localhost only**. To fix:

1. **Stop backend** (Ctrl+C in backend terminal)
2. **Restart properly**:
   ```powershell
   .\start-backend.ps1
   ```
3. **Verify**:
   ```powershell
   .\test-connection.ps1
   ```
4. **Start mobile**:
   ```powershell
   .\start-mobile.ps1
   ```

## 🎯 Complete Setup (First Time)

### 1. Verify Everything is Installed

```powershell
.\verify-setup.ps1
```

This checks:
- Node.js ✅
- Python ✅
- Dependencies ✅
- Services ✅

### 2. Start Development Environment

```powershell
.\start-dev.ps1
```

This automatically:
- Detects your WiFi IP
- Starts backend on all interfaces
- Starts mobile app
- Shows QR code

### 3. Open Expo Go on Your Phone

- Install [Expo Go](https://expo.dev/client) from app store
- Scan the QR code shown in terminal
- Wait for app to load

### 4. Login

Use these test credentials:
- **Phone**: `9876543210`
- **Password**: `password123`

## 📁 What Was Automated

### ✅ Mobile App (`civiclens-mobile/src/shared/config/env.ts`)

**Before**:
```typescript
const COMPUTER_IP = '192.168.1.34'; // Manual configuration
const API_BASE_URL = `http://${COMPUTER_IP}:8000/api/v1`;
```

**After**:
```typescript
// Auto-detects IP from Expo!
const debuggerHost = Constants.expoConfig?.hostUri?.split(':')[0];
const API_BASE_URL = `http://${debuggerHost}:8000/api/v1`;
```

### ✅ Backend Scripts

Created PowerShell scripts that:
- Detect your WiFi IP automatically
- Start backend with `--host 0.0.0.0`
- Verify backend is accessible
- Check health endpoints

### ✅ Connection Testing

```powershell
.\test-connection.ps1
```

Tests:
- Backend health ✅
- API documentation ✅
- OTP request ✅
- Login endpoint ✅

## 🐛 Common Issues & Fixes

### Issue 1: "Cannot read property 'login' of undefined"

**Status**: ✅ FIXED

The auth API is now properly exported and imported.

### Issue 2: Backend not accessible from phone

**Status**: ✅ FIXED

Backend now starts with `--host 0.0.0.0` using the provided scripts.

### Issue 3: IP address changes

**Status**: ✅ FIXED

Mobile app auto-detects new IP. Just restart Expo if IP changes.

### Issue 4: No API calls reaching backend

**Cause**: Backend running on localhost only

**Fix**: Use `.\start-backend.ps1` instead of manual start

## 📋 Available Scripts

| Script | Purpose |
|--------|---------|
| `verify-setup.ps1` | Check if everything is ready |
| `start-dev.ps1` | Start both backend and mobile |
| `start-backend.ps1` | Start backend only (on 0.0.0.0) |
| `start-mobile.ps1` | Start mobile only |
| `test-connection.ps1` | Test all API endpoints |

## 🎨 Development Workflow

```powershell
# Morning
.\verify-setup.ps1      # Check setup
.\start-dev.ps1         # Start everything

# Scan QR code with Expo Go

# Code, test, repeat (hot reload works!)

# Evening
# Ctrl+C to stop
```

## 📱 Testing on Expo Go

1. **Ensure same WiFi**: Phone and computer on same network
2. **Scan QR code**: From Expo terminal output
3. **Wait for bundle**: First load takes a moment
4. **Login**: Use test credentials above

## 🔐 Test Accounts

| Role | Phone | Password |
|------|-------|----------|
| Citizen | 9876543210 | password123 |
| Officer | 9876543210 | officer123 |
| Admin | 9876543212 | admin123 |

## 🌐 Useful URLs

Replace `192.168.1.34` with your IP (shown when you run scripts):

- **API Docs**: http://192.168.1.34:8000/docs
- **Health Check**: http://192.168.1.34:8000/health
- **GraphQL**: http://192.168.1.34:8000/graphql

## 💡 Pro Tips

1. **Use the scripts** - They handle everything automatically
2. **Check logs** - Both terminals show useful information
3. **Restart Expo** - If something seems off
4. **Test connection** - Run `.\test-connection.ps1` to verify
5. **Same WiFi** - Critical for phone to reach backend

## 🆘 Still Having Issues?

### Step 1: Verify Setup
```powershell
.\verify-setup.ps1
```

### Step 2: Test Connection
```powershell
.\test-connection.ps1
```

### Step 3: Check Firewall
```powershell
# Run as Administrator
New-NetFirewallRule -DisplayName "CivicLens Backend" `
  -Direction Inbound `
  -LocalPort 8000 `
  -Protocol TCP `
  -Action Allow
```

### Step 4: Verify Backend Host
When backend starts, look for:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

NOT:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

## 📚 More Documentation

- `README_AUTOMATION.md` - Detailed automation guide
- `QUICK_START.md` - Quick start guide
- `FIX_NOW.md` - Quick fixes for common issues

## ✅ Checklist

Before starting development:

- [ ] Backend virtual environment exists
- [ ] Mobile node_modules installed
- [ ] PostgreSQL running
- [ ] Redis running
- [ ] Firewall allows port 8000
- [ ] Phone and computer on same WiFi

Then just run:

```powershell
.\start-dev.ps1
```

## 🎉 You're Ready!

Everything is now automated. Just run the scripts and start coding!

**Next command**:
```powershell
.\start-dev.ps1
```

Then scan QR code and login! 🚀
