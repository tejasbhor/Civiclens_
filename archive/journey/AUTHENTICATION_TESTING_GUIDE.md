# 🧪 Authentication Testing Guide

## 🚀 **Quick Start**

### **Step 1: Start Backend**

```bash
cd civiclens-backend
source .venv/bin/activate  # Windows: .venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Expected Output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

### **Step 2: Start Client**

```bash
cd civiclens-client
npm run dev
```

**Expected Output:**
```
VITE v5.4.19  ready in 661 ms
➜  Local:   http://localhost:8080/
```

### **Step 3: Open Browser**

Go to: **http://localhost:8080/citizen/login**

---

## 🧪 **Test Case 1: Quick OTP Login**

### **Scenario:** New citizen wants to file a report quickly without creating an account

**Steps:**

1. **Open Login Page**
   - Go to: http://localhost:8080/citizen/login
   - Should see three options

2. **Select "Quick Login with OTP"**
   - Click the "Quick Login with OTP" card

3. **Enter Phone Number**
   - Enter: `9876543210`
   - Click "Send OTP"

4. **Check Console for OTP**
   - Open browser DevTools (F12)
   - Go to Console tab
   - Look for toast message with OTP
   - Example: "OTP Sent! OTP sent successfully (Dev OTP: 123456)"

5. **Enter OTP**
   - Enter the 6-digit OTP from console
   - Click "Verify"

6. **Verify Success**
   - Should see "Quick Login Successful!" toast
   - Should redirect to `/citizen/dashboard`
   - Check localStorage:
     - `authToken` should exist
     - `refreshToken` should exist
     - `user` should exist

**Expected Backend Logs:**
```
INFO: OTP requested for phone: 9876543210
INFO: OTP: 123456 (expires in 5 minutes)
INFO: OTP verified for phone: 9876543210
INFO: Created minimal user with ID: 1
INFO: Session created for user: 1
```

**Expected User Profile:**
```json
{
  "id": 1,
  "phone": "9876543210",
  "full_name": null,
  "email": null,
  "role": "citizen",
  "profile_completion": "minimal",
  "account_created_via": "otp",
  "phone_verified": true
}
```

---

## 🧪 **Test Case 2: Full Registration**

### **Scenario:** New citizen wants a complete account with all features

**Steps:**

1. **Open Login Page**
   - Go to: http://localhost:8080/citizen/login
   - Click "Back" if already in a flow

2. **Select "Create Full Account"**
   - Click the "Create Full Account" card

3. **Enter Registration Details**
   - Phone: `9876543211`
   - Full Name: `Test User`
   - Email: `test@example.com` (optional)
   - Password: `Test@123`
   - Click "Register"

4. **Check Console for OTP**
   - Open DevTools Console
   - Look for OTP in toast message

5. **Enter OTP**
   - Enter the 6-digit OTP
   - Click "Verify"

6. **Verify Success**
   - Should see "Account Verified!" toast
   - Should redirect to `/citizen/dashboard`
   - Check localStorage for tokens

**Expected Backend Logs:**
```
INFO: Signup request for phone: 9876543211
INFO: Password validated successfully
INFO: User created with ID: 2
INFO: OTP sent for phone verification: 123456
INFO: Phone verified for user: 2
INFO: Session created for user: 2
```

**Expected User Profile:**
```json
{
  "id": 2,
  "phone": "9876543211",
  "full_name": "Test User",
  "email": "test@example.com",
  "role": "citizen",
  "profile_completion": "complete",
  "account_created_via": "password",
  "phone_verified": true
}
```

---

## 🧪 **Test Case 3: Password Login**

### **Scenario:** Existing user wants to login with password

**Steps:**

1. **Open Login Page**
   - Go to: http://localhost:8080/citizen/login

2. **Select "Login with Password"**
   - Click the "Login with Password" card

3. **Enter Credentials**
   - Phone: `9876543211` (from Test Case 2)
   - Password: `Test@123`
   - Click "Login"

4. **Verify Success**
   - Should see "Login Successful!" toast
   - Should redirect to `/citizen/dashboard`
   - Check localStorage for tokens

**Expected Backend Logs:**
```
INFO: Login attempt for phone: 9876543211
INFO: User authenticated successfully
INFO: Session created for user: 2
```

---

## 🧪 **Test Case 4: Token Refresh**

### **Scenario:** Access token expires, should auto-refresh

**Steps:**

1. **Login Successfully** (use any method)

2. **Manually Expire Token**
   - Open DevTools Console
   - Run: `localStorage.setItem('authToken', 'invalid_token')`

3. **Make an API Call**
   - Navigate to any protected page
   - Or refresh the page

4. **Verify Auto-Refresh**
   - Should see 401 error in Network tab
   - Should see refresh token request
   - Should get new access token
   - Original request should retry successfully

**Expected Network Requests:**
```
1. GET /users/me → 401 Unauthorized
2. POST /auth/refresh → 200 OK (new tokens)
3. GET /users/me → 200 OK (retry with new token)
```

---

## 🧪 **Test Case 5: Logout**

### **Scenario:** User wants to logout

**Steps:**

1. **Login Successfully**

2. **Logout**
   - Click logout button (when implemented)
   - Or run in console: `localStorage.clear(); window.location.href = '/'`

3. **Verify Logout**
   - localStorage should be empty
   - Should redirect to landing page
   - Trying to access protected pages should redirect to login

---

## 🔍 **Debugging Checklist**

### **If OTP Not Received:**

1. Check backend logs for OTP generation
2. Check if DEBUG mode is enabled in backend
3. Check browser console for toast messages
4. Verify phone number format (10 digits)

### **If Login Fails:**

1. Check Network tab for API errors
2. Check backend logs for error messages
3. Verify credentials are correct
4. Check if account is locked (too many failed attempts)

### **If Token Refresh Fails:**

1. Check if refresh token exists in localStorage
2. Check Network tab for refresh request
3. Verify refresh token hasn't expired
4. Check backend session validity

### **If Redirects Don't Work:**

1. Check browser console for errors
2. Verify AuthContext is working
3. Check if user state is being set
4. Verify navigation paths are correct

---

## 📊 **API Endpoints to Monitor**

### **In Browser DevTools → Network Tab:**

**Quick OTP Login:**
```
1. POST /api/v1/auth/request-otp
2. POST /api/v1/auth/verify-otp
3. GET /api/v1/users/me
```

**Full Registration:**
```
1. POST /api/v1/auth/signup
2. POST /api/v1/auth/verify-phone
3. GET /api/v1/users/me
```

**Password Login:**
```
1. POST /api/v1/auth/login
2. GET /api/v1/users/me
```

**Token Refresh:**
```
1. POST /api/v1/auth/refresh
```

---

## ✅ **Success Criteria**

### **Authentication Working If:**

- [x] Can request OTP successfully
- [x] Can verify OTP and login
- [x] Can create full account with signup
- [x] Can verify phone after signup
- [x] Can login with password
- [x] Tokens stored in localStorage
- [x] User profile fetched successfully
- [x] Redirects to dashboard after login
- [x] Token auto-refreshes on 401
- [x] Can logout successfully

---

## 🐛 **Common Issues & Solutions**

### **Issue 1: CORS Error**

**Error:** `Access to XMLHttpRequest blocked by CORS policy`

**Solution:**
```python
# In backend main.py, verify CORS settings:
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### **Issue 2: 422 Validation Error**

**Error:** `Unprocessable Entity`

**Solution:**
- Check request payload format
- Verify phone number format (should be 10 digits)
- Verify password meets requirements (8+ chars, uppercase, digit)

### **Issue 3: 401 Unauthorized**

**Error:** `Unauthorized`

**Solution:**
- Check if token exists in localStorage
- Verify token format (should start with "eyJ")
- Check if token has expired
- Try logging in again

### **Issue 4: OTP Not Showing**

**Error:** OTP not visible in console

**Solution:**
- Check if backend is in DEBUG mode
- Check backend logs for OTP
- Look in toast notifications
- Check browser console for errors

---

## 📝 **Test Data**

### **Valid Test Phones:**
```
9876543210
9876543211
9876543212
9876543213
9876543214
```

### **Valid Test Passwords:**
```
Test@123
Secure@456
Password@789
Admin@2024
```

### **Valid Test Emails:**
```
test@example.com
user@test.com
citizen@civiclens.com
```

---

## 🎯 **Next Steps After Authentication Works**

1. ✅ Authentication Complete
2. 🔄 Implement Submit Report
3. 🔄 Implement My Reports
4. 🔄 Implement Track Report
5. 🔄 Implement Dashboard
6. 🔄 Implement Profile

---

## 🚀 **Ready to Test!**

**Start both servers and begin testing with Test Case 1!**

**Report any errors you encounter and I'll help fix them immediately!** 🎉
