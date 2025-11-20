# Start Testing Now

## Your Configuration

IP Address: 192.168.1.34
API URL: http://192.168.1.34:8000/api/v1

## Step 1: Start Backend

```bash
cd civiclens-backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Wait for:
- PostgreSQL - Connected
- Redis - Connected

## Step 2: Test Backend from Phone

Open browser on your phone and visit:
```
http://192.168.1.34:8000/docs
```

You should see FastAPI documentation page.

## Step 3: Start Mobile App

```bash
npm start
```

Scan QR code with Expo Go app on your phone.

## Step 4: Test Login

### Test Citizen Login
1. Tap "I am a Citizen"
2. Tap "Login with Password"
3. Enter:
   - Phone: 9876543210
   - Password: password123
4. Tap "Login"

### Test Officer Login
1. Tap "Nodal Officer"
2. Enter:
   - Phone: 9876543210
   - Password: officer123
3. Tap "Sign In"

## Expected Result

After successful login:
- "Login Successful" alert
- Success screen showing:
  - Phone number
  - Role
  - Name
  - Email
- Logout button

## If Login Fails

Check console logs for:
- API Client initialized with base URL: http://192.168.1.34:8000/api/v1
- API Request: POST /auth/login
- Any error messages

Common issues:
- Backend not running
- Firewall blocking port 8000
- Not on same WiFi network
- Wrong credentials

## Backend Logs

Watch backend terminal for incoming requests:
```
INFO: 192.168.1.34:xxxxx - "POST /api/v1/auth/login HTTP/1.1" 200 OK
```

## Ready to Test!

Everything is configured. Just start the backend and mobile app, then test login.
