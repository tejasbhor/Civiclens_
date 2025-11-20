# CivicLens Mobile - Testing Guide

## Prerequisites

### Backend Setup
```bash
cd civiclens-backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Mobile App Setup
```bash
cd civiclens-mobile
npm install
npm start
```

## Testing Authentication

### Citizen Login - Quick Report (OTP Only)
1. Launch app and select "I am a Citizen"
2. Tap "Quick Report"
3. Enter phone number: 9876543210
4. Tap "Request OTP"
5. Check alert for OTP (development mode)
6. Enter OTP and verify
7. Expected: Logged in successfully

### Citizen Login - Full Registration
1. Launch app and select "I am a Citizen"
2. Tap "Create Full Account"
3. Fill registration form:
   - Phone: 9876543210
   - Name: John Doe
   - Email: john@example.com (optional)
   - Password: password123
4. Tap "Create Account"
5. Check alert for OTP
6. Enter OTP and verify
7. Expected: Account created and logged in

### Citizen Login - Password Login
1. Launch app and select "I am a Citizen"
2. Tap "Login with Password"
3. Enter credentials:
   - Phone: 9876543210
   - Password: password123
4. Tap "Login"
5. Expected: Logged in successfully

### Officer Login
1. Launch app and select "Nodal Officer"
2. Enter credentials:
   - Phone: 9876543210
   - Password: officer123
3. Tap "Sign In"
4. Expected: Logged in as officer

## Validation Testing

### Invalid Phone Number
- Test with phone starting with 0
- Test with less than 10 digits
- Expected: Validation error displayed

### Invalid Password
- Test with password less than 8 characters
- Expected: Validation error displayed

### Invalid OTP
- Test with wrong OTP
- Expected: Error message displayed

## Network Configuration

### Android Emulator
Uses: http://10.0.2.2:8000/api/v1

### iOS Simulator
Uses: http://localhost:8000/api/v1

### Physical Device
Update `src/shared/config/env.ts` with your computer's IP address

## Troubleshooting

### Cannot read property 'login' of undefined
Fixed: Auth store now properly fetches user data after setting tokens

### Network errors
- Verify backend is running on port 8000
- Check firewall settings
- Ensure correct IP address for physical devices

### OTP not received
- Verify Redis is running
- Check backend logs
- OTP expires in 5 minutes

## API Endpoints

- POST /api/v1/auth/request-otp
- POST /api/v1/auth/verify-otp
- POST /api/v1/auth/signup
- POST /api/v1/auth/verify-phone
- POST /api/v1/auth/login
- POST /api/v1/auth/refresh
- GET /api/v1/users/me

## Production Readiness

- No emojis in production UI
- Professional styling
- Proper error handling
- Token management
- Secure storage
- Auto token refresh
- Network error handling
