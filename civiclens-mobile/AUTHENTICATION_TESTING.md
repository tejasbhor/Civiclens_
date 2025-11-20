# CivicLens Mobile - Authentication Testing Guide

## Overview
This guide will help you test the complete authentication flow for both Citizens and Officers in the CivicLens mobile app.

## Prerequisites

### 1. Backend Setup
Ensure the backend is running on `http://localhost:8000`:

```bash
cd civiclens-backend
# Activate virtual environment
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Run the backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Mobile App Setup
```bash
cd civiclens-mobile

# Install dependencies (if not already done)
npm install

# Start the Expo development server
npm start
```

### 3. Network Configuration
For testing on a physical device or emulator:
- **Android Emulator**: Use `http://10.0.2.2:8000/api/v1` (already configured)
- **iOS Simulator**: Use `http://localhost:8000/api/v1`
- **Physical Device**: Use your computer's IP address (e.g., `http://192.168.1.100:8000/api/v1`)

To update the API URL for physical devices, edit `civiclens-mobile/src/shared/config/env.ts`:
```typescript
const devConfig: EnvConfig = {
  API_BASE_URL: 'http://YOUR_COMPUTER_IP:8000/api/v1',
  // ...
};
```

## Authentication Flows

### Citizen Authentication (3 Options)

#### Option 1: Quick Report (OTP-based, No Account)
1. Launch the app
2. Select "I am a Citizen"
3. Choose "📱 Quick Report"
4. Enter a 10-digit phone number (e.g., `9876543210`)
5. Click "Request OTP"
6. Check the alert for the development OTP
7. Enter the 6-digit OTP
8. Click "Verify & Continue"
9. ✅ You're logged in with a minimal account!

**Backend Endpoints Used:**
- `POST /api/v1/auth/request-otp` - Request OTP
- `POST /api/v1/auth/verify-otp` - Verify OTP and create minimal account

#### Option 2: Create Full Account (Registration)
1. Launch the app
2. Select "I am a Citizen"
3. Choose "👤 Create Full Account"
4. Fill in the registration form:
   - Phone: `9876543210`
   - Full Name: `John Doe`
   - Email: `john@example.com` (optional)
   - Password: `password123` (min 8 characters)
5. Click "Create Account"
6. Check the alert for the development OTP
7. Enter the 6-digit OTP
8. Click "Verify & Continue"
9. ✅ You're logged in with a full account!

**Backend Endpoints Used:**
- `POST /api/v1/auth/signup` - Create account and send OTP
- `POST /api/v1/auth/verify-phone` - Verify phone and complete registration

#### Option 3: Login with Password (Existing Account)
1. Launch the app
2. Select "I am a Citizen"
3. Choose "🔒 Login with Password"
4. Enter your credentials:
   - Phone: `9876543210`
   - Password: `password123`
5. Click "Login"
6. ✅ You're logged in!

**Backend Endpoints Used:**
- `POST /api/v1/auth/login` - Login with phone and password

### Officer Authentication (Password Only)

1. Launch the app
2. Select "Nodal Officer"
3. Enter your credentials:
   - Phone: `9876543210` (use a seeded officer account)
   - Password: `officer123`
4. Optional: Check "Remember me"
5. Click "Sign In"
6. ✅ You're logged in as an officer!

**Backend Endpoints Used:**
- `POST /api/v1/auth/login` - Login with phone and password

## Testing Scenarios

### Test Case 1: Quick Login Flow
```
1. Select Citizen role
2. Choose Quick Report
3. Enter phone: 9876543210
4. Request OTP
5. Enter OTP from alert
6. Verify OTP
Expected: Logged in with minimal account
```

### Test Case 2: Full Registration Flow
```
1. Select Citizen role
2. Choose Create Full Account
3. Fill all fields
4. Create account
5. Enter OTP from alert
6. Verify phone
Expected: Logged in with complete profile
```

### Test Case 3: Password Login Flow
```
1. Select Citizen role
2. Choose Login with Password
3. Enter existing credentials
4. Login
Expected: Logged in successfully
```

### Test Case 4: Officer Login Flow
```
1. Select Nodal Officer role
2. Enter officer credentials
3. Sign in
Expected: Logged in as officer
```

### Test Case 5: Validation Errors
```
Test invalid inputs:
- Phone starting with 0
- Phone less than 10 digits
- Password less than 8 characters
- Invalid OTP
Expected: Appropriate error messages
```

### Test Case 6: Network Errors
```
1. Stop the backend server
2. Try to login
Expected: Network error message
```

## Development OTP

In development mode, the backend returns the OTP in the API response for testing purposes. The mobile app displays this in an Alert dialog.

**Example Response:**
```json
{
  "message": "OTP sent successfully",
  "otp": "123456",
  "expires_in_minutes": 5
}
```

## Debugging

### Enable Detailed Logging
The app already has logging enabled in development mode. Check the console for:
- API requests and responses
- Authentication state changes
- Error messages

### Common Issues

#### 1. "Network Error" or "No response from server"
- Ensure backend is running on port 8000
- Check if you're using the correct IP address for physical devices
- Verify CORS settings in backend allow your device's IP

#### 2. "Invalid phone number format"
- Phone must be exactly 10 digits
- Cannot start with 0
- Only digits allowed

#### 3. "Invalid OTP"
- OTP expires after 5 minutes
- OTP is case-sensitive (though it's all numbers)
- Check the alert for the correct OTP in development mode

#### 4. Token Refresh Issues
- The app automatically refreshes expired tokens
- If refresh fails, you'll be logged out
- Check secure storage for token persistence

## Backend Test Accounts

### Seeded Accounts (if backend has seed data)

**Citizen Account:**
- Phone: `+919876543210`
- Password: `citizen123`

**Officer Account:**
- Phone: `+919876543211`
- Password: `officer123`

**Admin Account:**
- Phone: `+919876543212`
- Password: `admin123`

## API Endpoints Reference

### Authentication Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/auth/request-otp` | POST | Request OTP for phone |
| `/api/v1/auth/verify-otp` | POST | Verify OTP (quick login) |
| `/api/v1/auth/signup` | POST | Create new account |
| `/api/v1/auth/verify-phone` | POST | Verify phone after signup |
| `/api/v1/auth/login` | POST | Login with password |
| `/api/v1/auth/refresh` | POST | Refresh access token |
| `/api/v1/auth/logout` | POST | Logout user |
| `/api/v1/users/me` | GET | Get current user profile |

## Next Steps

After successful authentication:
1. The app will show "✅ Welcome to CivicLens! You are logged in"
2. Next implementation phase will add:
   - Citizen Dashboard
   - Officer Dashboard
   - Report submission
   - Task management

## Troubleshooting Commands

### Check Backend Health
```bash
curl http://localhost:8000/health
```

### Test OTP Request
```bash
curl -X POST http://localhost:8000/api/v1/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210"}'
```

### Test Login
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210", "password": "password123"}'
```

## Support

If you encounter issues:
1. Check the console logs in Expo
2. Check the backend logs
3. Verify network connectivity
4. Ensure all dependencies are installed
5. Try restarting both backend and mobile app

---

**Happy Testing! 🚀**
