# Login Testing Instructions

## Setup

1. Start Backend:
```bash
cd civiclens-backend
uvicorn app.main:app --reload --port 8000
```

2. Start Mobile App:
```bash
cd civiclens-mobile
npm start
```

## Test Cases

### Test 1: Citizen Password Login

1. Launch app
2. Select "I am a Citizen"
3. Tap "Login with Password"
4. Enter:
   - Phone: 9876543210
   - Password: password123
5. Tap "Login"
6. Expected: Success screen showing user details

### Test 2: Officer Password Login

1. Launch app
2. Select "Nodal Officer"
3. Enter:
   - Phone: 9876543210
   - Password: officer123
4. Tap "Sign In"
5. Expected: Success screen showing user details

### Test 3: Citizen Registration (with OTP display)

1. Launch app
2. Select "I am a Citizen"
3. Tap "Create Full Account"
4. Fill form:
   - Phone: 9876543211
   - Name: Test User
   - Email: test@example.com
   - Password: password123
5. Tap "Create Account"
6. Expected: OTP displayed in yellow box
7. Enter OTP
8. Tap "Verify & Continue"
9. Expected: Success screen

### Test 4: Quick Report (with OTP display)

1. Launch app
2. Select "I am a Citizen"
3. Tap "Quick Report"
4. Enter phone: 9876543212
5. Tap "Request OTP"
6. Expected: OTP displayed in yellow box
7. Enter OTP
8. Tap "Verify & Continue"
9. Expected: Success screen

## Success Screen

After successful login, you should see:
- "Login Successful" message
- User details (phone, role, name, email)
- Logout button

## Logout

Tap "Logout" button to return to role selection screen.

## Troubleshooting

### Login fails
- Check backend is running
- Verify credentials exist in database
- Check console logs for errors

### OTP not displayed
- Check backend logs
- Verify Redis is running
- OTP should appear in yellow box

### User details not showing
- Check auth store is fetching user data
- Verify /users/me endpoint works
- Check console logs
