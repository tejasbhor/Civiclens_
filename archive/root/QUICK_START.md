# 🚀 CivicLens Quick Start Guide

## Automated Development Setup (Windows)

### ✨ One-Command Start

**Option 1: Full Stack (Recommended)**
```powershell
.\start-dev.ps1
```
This starts both backend and mobile app automatically!

**Option 2: Backend Only**
```powershell
.\start-backend.ps1
```

**Option 3: Mobile Only**
```powershell
.\start-mobile.ps1
```

### 🎯 What's Automated

✅ **Automatic IP Detection** - No manual configuration needed!
✅ **Backend on all interfaces** - Accessible from your phone
✅ **Health checks** - Verifies backend is running
✅ **Smart environment detection** - Works with Expo Go, emulators, simulators

### 📱 Using Expo Go

1. **Start the development environment**:
   ```powershell
   .\start-dev.ps1
   ```

2. **Install Expo Go** on your phone:
   - [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - [iOS](https://apps.apple.com/app/expo-go/id982107779)

3. **Scan the QR code** shown in the terminal

4. **Test login** with these credentials:
   - **Citizen**: Phone `9876543210`, Password `password123`
   - **Officer**: Phone `9876543210`, Password `officer123`

### 🔧 How It Works

The mobile app now **automatically detects your computer's IP** using Expo's built-in detection:

```typescript
// No manual configuration needed!
const debuggerHost = Constants.expoConfig?.hostUri?.split(':')[0];
const API_URL = `http://${debuggerHost}:8000/api/v1`;
```

### 🌐 Backend Configuration

The backend must listen on **all network interfaces** (0.0.0.0) to be accessible from your phone:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

This is automatically handled by `start-backend.ps1`!

### 🐛 Troubleshooting

#### Backend Not Accessible from Phone

**Problem**: Mobile app can't connect to backend

**Solution**:
1. Ensure backend is started with `--host 0.0.0.0`:
   ```powershell
   .\start-backend.ps1
   ```

2. Check Windows Firewall:
   ```powershell
   # Allow port 8000
   New-NetFirewallRule -DisplayName "CivicLens Backend" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
   ```

3. Verify both devices on same WiFi network

#### "Cannot read property 'login' of undefined"

**Problem**: Auth API not properly imported

**Solution**: Already fixed! The app now correctly imports from `@shared/services/api`:
```typescript
import { authApi } from '@shared/services/api';
```

#### IP Address Changes

**Problem**: Your IP changes when switching networks

**Solution**: The app automatically detects the new IP! Just restart Expo:
```powershell
# In civiclens-mobile directory
npm start
```

#### Backend Not Starting

**Problem**: Virtual environment or dependencies missing

**Solution**:
```powershell
cd civiclens-backend

# Create virtual environment
python -m venv .venv

# Activate it
.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Start backend
.\start-backend.ps1
```

### 📊 Testing the Setup

1. **Check backend health**:
   ```powershell
   # Replace with your IP
   curl http://192.168.1.34:8000/health
   ```

2. **Test auth endpoint**:
   ```powershell
   curl -X POST http://192.168.1.34:8000/api/v1/auth/request-otp `
     -H "Content-Type: application/json" `
     -d '{"phone": "+919876543210"}'
   ```

3. **View API docs**:
   Open `http://192.168.1.34:8000/docs` (replace with your IP)

### 🎨 Development Workflow

```powershell
# 1. Start everything
.\start-dev.ps1

# 2. Open Expo Go on your phone and scan QR code

# 3. Make changes to code - hot reload works automatically!

# 4. View logs in terminal

# 5. Stop with Ctrl+C
```

### 📝 Test Accounts

The backend comes with pre-seeded test accounts:

**Citizens:**
- Phone: `9876543210`, Password: `password123`
- Phone: `9876543211`, Password: `password123`

**Officers:**
- Phone: `9876543210`, Password: `officer123`
- Phone: `9876543211`, Password: `officer123`

**Admin:**
- Phone: `9876543212`, Password: `admin123`

### 🔐 Environment Variables

The mobile app automatically configures itself based on the environment:

- **Development (Expo Go)**: Auto-detects your computer's IP
- **Android Emulator**: Uses `10.0.2.2`
- **iOS Simulator**: Uses `localhost`
- **Production**: Uses production API URL

### 💡 Tips

1. **Keep backend window open** - You'll see API requests in real-time
2. **Use Expo Go** - Faster than building native apps during development
3. **Check firewall** - Ensure port 8000 is allowed
4. **Same WiFi network** - Both devices must be on the same network
5. **Restart Expo** - If IP changes, just restart with `npm start`

### 🎉 You're Ready!

Just run `.\start-dev.ps1` and start developing! The setup is now fully automated.

---

## Manual Setup (If Needed)

### Backend

```powershell
cd civiclens-backend
.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Mobile

```powershell
cd civiclens-mobile
npm start
```

### Database

```powershell
# PostgreSQL should be running
# Redis should be running

# Run migrations
cd civiclens-backend
alembic upgrade head

# Seed test data
python -m app.scripts.seed_test_data
```
