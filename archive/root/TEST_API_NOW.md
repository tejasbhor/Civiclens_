# 🧪 Test API Connection NOW

## The Issue

You're getting "cannot read property 'login' of undefined" which means either:
1. `authApi` is undefined
2. `authApi.login` doesn't exist
3. Module import is failing

## Quick Fix Steps

### 1. Restart Expo (IMPORTANT!)

Since we just installed `expo-constants`, you MUST restart Expo:

```bash
# In the Expo terminal, press Ctrl+C to stop

# Then restart
cd civiclens-mobile
npm start

# Clear cache if needed
npm start -- --clear
```

### 2. Test the API

I've created a diagnostic screen. Add it to your App.tsx temporarily:

```typescript
// In App.tsx or wherever your main navigation is
import { TestAPIScreen } from './src/features/auth/screens/TestAPIScreen';

// Use it as your initial screen temporarily
<TestAPIScreen />
```

### 3. Check Console Logs

When the app loads, check the Expo console for:
- `🔗 Auto-detected API host: 192.168.1.34`
- `API Base URL: http://192.168.1.34:8000/api/v1`

### 4. Test from the Screen

The TestAPIScreen has buttons to:
- Test if authApi object exists
- Test login API call
- Test OTP API call

## Alternative: Quick Manual Test

Add this to your LoginScreen temporarily to debug:

```typescript
// At the top of handleContinue function
console.log('ENV:', ENV);
console.log('authApi:', authApi);
console.log('authApi.requestOTP:', authApi.requestOTP);
console.log('typeof authApi.requestOTP:', typeof authApi.requestOTP);

if (!authApi || typeof authApi.requestOTP !== 'function') {
  Alert.alert('Error', 'authApi is not properly loaded!');
  return;
}
```

## Most Likely Cause

**You need to restart Expo after installing `expo-constants`!**

The app is probably still running with the old code that doesn't have `expo-constants` installed.

## Steps to Fix:

1. **Stop Expo** (Ctrl+C in terminal)
2. **Clear cache and restart**:
   ```bash
   cd civiclens-mobile
   npm start -- --clear
   ```
3. **Reload app** on your phone (shake device → Reload)
4. **Try login again**

## Verify Backend is Accessible

From PowerShell:

```powershell
# Test health
curl http://192.168.1.34:8000/health

# Test login
curl -X POST http://192.168.1.34:8000/api/v1/auth/login `
  -H "Content-Type: application/json" `
  -d '{"phone": "9876543210", "password": "password123"}'
```

Both should work!

## Check Expo Logs

When you start Expo, you should see:

```
🔗 Auto-detected API host: 192.168.1.34
API Client initialized with base URL: http://192.168.1.34:8000/api/v1
```

If you don't see this, the env.ts file isn't being loaded correctly.

## If Still Not Working

1. **Check the import path**:
   ```typescript
   import { authApi } from '@shared/services/api';
   ```

2. **Verify the file exists**:
   ```
   civiclens-mobile/src/shared/services/api/authApi.ts
   civiclens-mobile/src/shared/services/api/index.ts
   ```

3. **Check for TypeScript errors**:
   ```bash
   cd civiclens-mobile
   npm run type-check
   ```

4. **Rebuild**:
   ```bash
   cd civiclens-mobile
   rm -rf node_modules
   npm install
   npm start -- --clear
   ```

## Expected Behavior

After restarting Expo:
1. App loads
2. Console shows: `🔗 Auto-detected API host: 192.168.1.34`
3. Login screen works
4. Clicking login sends request to backend
5. Backend logs show the request

## Debug Output

Add this to see what's happening:

```typescript
// In LoginScreen.tsx, before the try block
console.log('=== DEBUG INFO ===');
console.log('ENV.API_BASE_URL:', ENV.API_BASE_URL);
console.log('authApi:', authApi);
console.log('authApi keys:', Object.keys(authApi));
console.log('==================');
```

This will show you exactly what's available!

## TL;DR

**Just restart Expo with cache clear:**

```bash
cd civiclens-mobile
npm start -- --clear
```

Then reload the app on your phone and try again!
