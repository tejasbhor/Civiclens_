# CivicLens Mobile - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Start the Backend
```bash
cd civiclens-backend
source .venv/bin/activate  # Windows: .venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Wait for: `✅ PostgreSQL - Connected` and `✅ Redis - Connected`

### Step 2: Start the Mobile App
```bash
cd civiclens-mobile
npm start
```

Press:
- `a` for Android emulator
- `i` for iOS simulator
- Scan QR code for physical device

### Step 3: Test Authentication

#### For Citizens (3 ways to login):

**Option A: Quick Report (Fastest)**
1. Tap "I am a Citizen"
2. Tap "📱 Quick Report"
3. Enter phone: `9876543210`
4. Tap "Request OTP"
5. Copy OTP from alert (e.g., `123456`)
6. Enter OTP and tap "Verify & Continue"
7. ✅ Done!

**Option B: Create Full Account**
1. Tap "I am a Citizen"
2. Tap "👤 Create Full Account"
3. Fill form:
   - Phone: `9876543210`
   - Name: `John Doe`
   - Email: `john@example.com` (optional)
   - Password: `password123`
4. Tap "Create Account"
5. Enter OTP from alert
6. ✅ Done!

**Option C: Login with Password**
1. Tap "I am a Citizen"
2. Tap "🔒 Login with Password"
3. Enter phone: `9876543210`
4. Enter password: `password123`
5. Tap "Login"
6. ✅ Done!

#### For Officers:
1. Tap "Nodal Officer"
2. Enter phone: `9876543210`
3. Enter password: `officer123`
4. Tap "Sign In"
5. ✅ Done!

## 📱 Testing on Physical Device

If using a physical device, update the API URL:

1. Find your computer's IP address:
   ```bash
   # Windows
   ipconfig
   
   # Mac/Linux
   ifconfig
   ```

2. Edit `civiclens-mobile/src/shared/config/env.ts`:
   ```typescript
   const devConfig: EnvConfig = {
     API_BASE_URL: 'http://YOUR_IP:8000/api/v1',
     // Example: 'http://192.168.1.100:8000/api/v1'
   };
   ```

3. Restart the app

## 🐛 Troubleshooting

### Backend not connecting?
- Check backend is running: `curl http://localhost:8000/health`
- Verify port 8000 is not in use
- Check firewall settings

### OTP not working?
- Ensure Redis is running
- Check backend logs for OTP generation
- OTP expires in 5 minutes

### App crashes?
- Clear cache: `npm start -- --clear`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check console logs in Expo

## 📚 Full Documentation

See [AUTHENTICATION_TESTING.md](./AUTHENTICATION_TESTING.md) for detailed testing guide.

## ✅ What's Working

- ✅ Role selection (Citizen/Officer)
- ✅ Citizen: Quick OTP login
- ✅ Citizen: Full account registration
- ✅ Citizen: Password login
- ✅ Officer: Password login
- ✅ Phone number validation
- ✅ OTP verification
- ✅ Token management
- ✅ Secure storage
- ✅ Auto token refresh
- ✅ Network error handling

## 🚧 Coming Next

- Dashboard screens
- Report submission
- Task management
- Offline sync
- Push notifications

---

**Need Help?** Check the logs in Expo and backend terminal!
