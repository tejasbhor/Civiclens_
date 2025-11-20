# Final Authentication Test

## Fixed Issues

1. Removed circular dependency between authApi and authStore
2. authApi now only stores data in SecureStorage
3. Screens handle calling setTokens on authStore
4. Proper error handling throughout

## Setup Steps

### 1. Find Your IP
```bash
npm run find-ip
```

### 2. Update Configuration
Edit `src/shared/config/env.ts`:
```typescript
const COMPUTER_IP = '192.168.1.100'; // YOUR IP HERE
```

### 3. Start Backend
```bash
cd ../civiclens-backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Verify Backend
From phone browser, visit:
```
http://YOUR_IP:8000/docs
```

### 5. Start Mobile App
```bash
npm start
```

Scan QR code with Expo Go

## Test Login

### Citizen Password Login
1. Select "I am a Citizen"
2. Tap "Login with Password"
3. Phone: 9876543210
4. Password: password123
5. Tap "Login"

Expected: Success screen with user details

### Officer Password Login
1. Select "Nodal Officer"
2. Phone: 9876543210
3. Password: officer123
4. Tap "Sign In"

Expected: Success screen with user details

## What Should Happen

1. Login button pressed
2. API call to backend at http://YOUR_IP:8000/api/v1/auth/login
3. Backend returns tokens
4. App fetches user data from /users/me
5. Tokens and user stored in SecureStorage
6. Auth store updated
7. Success screen shows:
   - "Login Successful"
   - Phone number
   - Role
   - Name (if available)
   - Email (if available)
   - Logout button

## Debugging

### Check Console Logs
Look for:
- "API Client initialized with base URL: http://YOUR_IP:8000/api/v1"
- "API Request: POST /auth/login"
- "API Response: 200 /auth/login"

### Common Errors

**"Cannot read property 'login' of undefined"**
- Fixed: authApi is now properly exported

**"Network request failed"**
- Backend not running
- Wrong IP in env.ts
- Not on same WiFi
- Firewall blocking port 8000

**"Invalid credentials"**
- User doesn't exist in database
- Wrong password
- Check backend logs

## Success Criteria

- Login completes without errors
- Success screen appears
- User details displayed correctly
- Logout button works
- Can login again after logout

Ready to test!
