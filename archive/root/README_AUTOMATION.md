# 🤖 CivicLens Automated Development Setup

## 🎯 Problem Solved

**Before**: Manual IP configuration, backend not accessible from phone, connection errors

**After**: Fully automated setup with dynamic IP detection, one-command start, everything just works!

## 🚀 Quick Start (3 Steps)

### 1. Verify Setup
```powershell
.\verify-setup.ps1
```

### 2. Start Development
```powershell
.\start-dev.ps1
```

### 3. Scan QR Code
Open Expo Go on your phone and scan the QR code!

## 📱 What's Automated

### ✅ Mobile App
- **Auto IP Detection**: Uses Expo's `Constants.expoConfig.hostUri`
- **Smart Fallbacks**: Works with emulators and simulators
- **No Manual Config**: IP changes are handled automatically

### ✅ Backend
- **All Interfaces**: Listens on `0.0.0.0` (accessible from phone)
- **Health Checks**: Automatic verification
- **Easy Start**: One command to rule them all

### ✅ Scripts

| Script | Purpose |
|--------|---------|
| `verify-setup.ps1` | Check if everything is installed |
| `start-dev.ps1` | Start both backend and mobile |
| `start-backend.ps1` | Start backend only |
| `start-mobile.ps1` | Start mobile only |
| `test-connection.ps1` | Test backend API endpoints |

## 🔧 How It Works

### Mobile App Auto-Detection

```typescript
// src/shared/config/env.ts
const getApiBaseUrl = (): string => {
  // Auto-detect from Expo
  const debuggerHost = Constants.expoConfig?.hostUri?.split(':')[0];
  
  if (debuggerHost) {
    console.log('🔗 Auto-detected API host:', debuggerHost);
    return `http://${debuggerHost}:8000/api/v1`;
  }
  
  // Fallbacks for emulators
  if (Platform.OS === 'android') return 'http://10.0.2.2:8000/api/v1';
  return 'http://localhost:8000/api/v1';
};
```

### Backend Network Access

```powershell
# start-backend.ps1
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
#                                      ^^^^^^^^
#                                      This makes it accessible from phone!
```

## 🐛 Troubleshooting

### Issue: "Cannot read property 'login' of undefined"

**Cause**: Auth API not properly imported

**Fixed**: ✅ Now correctly imports from `@shared/services/api`

```typescript
// LoginScreen.tsx
import { authApi } from '@shared/services/api'; // ✅ Correct
```

### Issue: Backend not accessible from phone

**Cause**: Backend listening on localhost only

**Fixed**: ✅ Scripts start backend with `--host 0.0.0.0`

```powershell
# Use this script
.\start-backend.ps1

# Or manually
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Issue: IP address changes

**Cause**: Switching WiFi networks

**Fixed**: ✅ App auto-detects new IP, just restart Expo

```powershell
# In civiclens-mobile directory
npm start
```

### Issue: Firewall blocking connections

**Solution**: Add firewall rule (run as admin)

```powershell
New-NetFirewallRule -DisplayName "CivicLens Backend" `
  -Direction Inbound `
  -LocalPort 8000 `
  -Protocol TCP `
  -Action Allow
```

## 📊 Testing

### 1. Verify Setup
```powershell
.\verify-setup.ps1
```

Checks:
- ✅ Node.js installed
- ✅ Python installed
- ✅ Directories exist
- ✅ Dependencies installed
- ✅ Services running
- ✅ Network configured

### 2. Test Connection
```powershell
.\test-connection.ps1
```

Tests:
- ✅ Backend health
- ✅ API documentation
- ✅ OTP request
- ✅ Login endpoint

### 3. Manual Test
```powershell
# Get your IP
ipconfig | findstr /i "IPv4"

# Test health
curl http://YOUR_IP:8000/health

# Test login
curl -X POST http://YOUR_IP:8000/api/v1/auth/login `
  -H "Content-Type: application/json" `
  -d '{"phone": "9876543210", "password": "password123"}'
```

## 🎨 Development Workflow

```powershell
# Morning routine
.\verify-setup.ps1    # Check everything is ready
.\start-dev.ps1       # Start development

# Scan QR code with Expo Go

# Make changes - hot reload works!

# Evening
# Ctrl+C to stop
```

## 📝 Test Accounts

| Role | Phone | Password |
|------|-------|----------|
| Citizen | 9876543210 | password123 |
| Officer | 9876543210 | officer123 |
| Admin | 9876543212 | admin123 |

## 🔐 Security Notes

- Backend runs on `0.0.0.0` for development only
- In production, use proper firewall rules
- Test accounts are for development only
- Never commit real credentials

## 💡 Pro Tips

1. **Keep backend window open** - See API requests in real-time
2. **Use Expo Go** - Faster than building native apps
3. **Check logs** - Both backend and mobile show useful info
4. **Restart Expo** - If something seems off
5. **Run verify-setup** - Before reporting issues

## 🎉 Benefits

| Before | After |
|--------|-------|
| Manual IP configuration | ✅ Auto-detected |
| Backend on localhost only | ✅ Accessible from phone |
| Connection errors | ✅ Health checks |
| Multiple terminal commands | ✅ One command |
| IP changes break things | ✅ Auto-adapts |

## 📚 Additional Resources

- **API Docs**: `http://YOUR_IP:8000/docs`
- **Quick Start**: See `QUICK_START.md`
- **Backend README**: `civiclens-backend/README.md`
- **Mobile README**: `civiclens-mobile/README.md`

## 🆘 Still Having Issues?

1. Run `.\verify-setup.ps1` - Check what's missing
2. Run `.\test-connection.ps1` - Test backend
3. Check firewall settings
4. Ensure same WiFi network
5. Restart everything

## 🎯 Next Steps

```powershell
# You're ready! Just run:
.\start-dev.ps1

# Then scan QR code and start coding! 🚀
```
