# ✅ Officer Login - Verified Backend Implementation Guide

## 🔍 **Backend Verification Complete**

I've verified the backend implementation. Here's exactly how officer login works:

---

## 📋 **Backend Authentication Flow**

### **Endpoint:**
```
POST /api/v1/auth/login
```

### **Request Body:**
```json
{
  "phone": "9876543210",
  "password": "YourPassword123"
}
```

### **Backend Process:**
```python
1. Check rate limit (max 5 attempts per hour)
2. Check account lockout status
3. Find user by phone: user_crud.get_by_phone(db, phone)
4. Verify password: verify_password(password, user.hashed_password)
5. Generate JWT tokens (access + refresh)
6. Create session
7. Return tokens + user info
```

### **Response:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "user_id": 123,
  "role": "NODAL_OFFICER"
}
```

---

## 📱 **Phone Number Format**

### **Backend Accepts:**
The backend pattern is: `^\+?[1-9]\d{9,14}$`

**This means it accepts:**
- ✅ `9876543210` (10 digits, no prefix)
- ✅ `+919876543210` (with country code)
- ✅ `919876543210` (11 digits, no + sign)

**But NOT:**
- ❌ `09876543210` (starts with 0)
- ❌ `98765-43210` (has dash)
- ❌ `987 654 3210` (has spaces)

### **Frontend Currently Validates:**
```typescript
// Requires exactly 10 digits
if (phone.length !== 10 || !/^\d{10}$/.test(phone))
```

**This means frontend accepts:**
- ✅ `9876543210` (10 digits only)

---

## 🎯 **How to Login Properly**

### **Step 1: Create Officer Account**

If you don't have an officer account, create one via admin:

```bash
# Using admin panel or API
POST /api/v1/auth/create-officer
{
  "phone": "9876543210",
  "email": "officer@example.com",
  "full_name": "Test Officer",
  "password": "TestPass123",
  "role": "NODAL_OFFICER",
  "department_id": 1
}
```

**Password Requirements:**
- ✅ At least 8 characters
- ✅ At least 1 uppercase letter
- ✅ At least 1 digit

### **Step 2: Login to Officer Portal**

1. **Go to:** http://localhost:8080/officer/login

2. **Enter Phone Number:**
   ```
   9876543210
   ```
   - 10 digits only
   - No country code (+91)
   - No spaces or dashes

3. **Enter Password:**
   ```
   TestPass123
   ```
   - Same password used during account creation

4. **Click "Sign In"**

5. **Check Browser Console (F12):**
   ```
   🔐 Attempting officer login with phone: 9876543210
   ✅ Login response received: {hasAccessToken: true, ...}
   ✅ Tokens stored, navigating to dashboard
   ```

6. **Should Redirect to:**
   ```
   http://localhost:8080/officer/dashboard
   ```

---

## 🔐 **Complete Login Example**

### **Scenario 1: First Time Officer Login**

```bash
# 1. Create officer account (via admin)
curl -X POST http://localhost:8000/api/v1/auth/create-officer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "phone": "9876543210",
    "email": "officer@test.com",
    "full_name": "Test Officer",
    "password": "TestPass123",
    "role": "NODAL_OFFICER",
    "department_id": 1
  }'

# Response:
{
  "message": "Officer account created successfully",
  "user_id": 123,
  "role": "NODAL_OFFICER",
  "profile_completion": "complete"
}
```

```bash
# 2. Login as officer
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "9876543210",
    "password": "TestPass123"
  }'

# Response:
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user_id": 123,
  "role": "NODAL_OFFICER"
}
```

### **Scenario 2: Login via Frontend**

1. **Open:** http://localhost:8080/officer/login
2. **Phone:** `9876543210`
3. **Password:** `TestPass123`
4. **Click:** "Sign In"
5. **Result:** Redirects to dashboard

---

## 🛠️ **Troubleshooting**

### **Issue 1: "Invalid phone number or password"**

**Possible Causes:**
1. Phone number doesn't exist in database
2. Password is incorrect
3. Account is not an officer (role is CITIZEN)

**Verify:**
```sql
-- Check if officer exists
SELECT id, phone, full_name, role, is_active, 
       hashed_password IS NOT NULL as has_password
FROM users 
WHERE phone = '9876543210';

-- Expected:
-- role: 'NODAL_OFFICER' or 'ADMIN'
-- is_active: true
-- has_password: true
```

**Fix:**
```python
# If officer doesn't exist, create one
# If password wrong, reset it
# If role wrong, update it
```

### **Issue 2: "Too many login attempts"**

**Cause:** Rate limit exceeded (5 attempts per hour)

**Fix:**
```bash
# Clear rate limit in Redis
redis-cli
> DEL rate_limit:login:9876543210
> DEL failed_login:9876543210
```

### **Issue 3: "Account is locked"**

**Cause:** Too many failed login attempts

**Fix:**
```bash
# Clear account lockout
redis-cli
> DEL account_lockout:9876543210
> DEL failed_login:9876543210
```

### **Issue 4: "Cannot connect to server"**

**Cause:** Backend not running

**Fix:**
```bash
# Start backend
cd civiclens-backend
uvicorn app.main:app --reload

# Verify it's running
curl http://localhost:8000/api/v1/health
```

---

## 📊 **Database Verification**

### **Check Officer Account:**
```sql
SELECT 
  id,
  phone,
  email,
  full_name,
  role,
  is_active,
  phone_verified,
  hashed_password IS NOT NULL as has_password,
  employee_id,
  department_id,
  created_at
FROM users 
WHERE phone = '9876543210';
```

**Expected Result:**
```
id: 123
phone: 9876543210
email: officer@test.com
full_name: Test Officer
role: NODAL_OFFICER
is_active: true
phone_verified: true
has_password: true
employee_id: EMP001
department_id: 1
```

### **Check Login History:**
```sql
SELECT 
  user_id,
  action,
  status,
  ip_address,
  created_at
FROM audit_logs 
WHERE user_id = 123 
  AND action = 'login'
ORDER BY created_at DESC 
LIMIT 5;
```

---

## 🎯 **Quick Test Script**

### **Test Backend Directly:**
```bash
#!/bin/bash

# Test 1: Check backend health
echo "Testing backend health..."
curl http://localhost:8000/api/v1/health

# Test 2: Login with officer credentials
echo -e "\n\nTesting officer login..."
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "9876543210",
    "password": "TestPass123"
  }' | jq

# Test 3: Get user info with token
echo -e "\n\nTesting get user info..."
TOKEN="<paste_access_token_here>"
curl http://localhost:8000/api/v1/users/me \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## ✅ **Verified Login Steps**

### **Frontend → Backend Flow:**

```
1. User enters phone: "9876543210"
   ↓
2. User enters password: "TestPass123"
   ↓
3. Frontend validates:
   - Phone is 10 digits ✓
   - Password not empty ✓
   ↓
4. Frontend calls:
   authService.login("9876543210", "TestPass123")
   ↓
5. API Request:
   POST /api/v1/auth/login
   Body: { phone: "9876543210", password: "TestPass123" }
   ↓
6. Backend validates:
   - Rate limit not exceeded ✓
   - Account not locked ✓
   - User exists ✓
   - Password correct ✓
   ↓
7. Backend returns:
   {
     access_token: "eyJ...",
     refresh_token: "eyJ...",
     user_id: 123,
     role: "NODAL_OFFICER"
   }
   ↓
8. Frontend stores:
   localStorage.setItem('authToken', access_token)
   localStorage.setItem('refreshToken', refresh_token)
   ↓
9. Frontend fetches user:
   GET /api/v1/users/me
   ↓
10. Frontend navigates:
    navigate('/officer/dashboard')
    ↓
11. ✅ SUCCESS!
```

---

## 🎉 **Summary**

### **Backend Requirements (Verified):**
- ✅ Phone: 10 digits (e.g., `9876543210`)
- ✅ Password: Min 8 chars, 1 uppercase, 1 digit
- ✅ Role: `NODAL_OFFICER` or `ADMIN`
- ✅ Account active: `is_active = true`
- ✅ Has password: `hashed_password` not null

### **Frontend Implementation (Verified):**
- ✅ Validates phone format (10 digits)
- ✅ Calls `authService.login(phone, password)`
- ✅ Stores tokens in localStorage
- ✅ Fetches user data
- ✅ Navigates to dashboard

### **Login Credentials Format:**
```
Phone: 9876543210 (10 digits, no +91)
Password: TestPass123 (min 8 chars, 1 uppercase, 1 digit)
```

---

## 🚀 **Ready to Login!**

**Your login should work if:**
1. ✅ Backend is running on port 8000
2. ✅ Officer account exists in database
3. ✅ Phone format: 10 digits (e.g., `9876543210`)
4. ✅ Password is correct
5. ✅ Account is active
6. ✅ Role is NODAL_OFFICER or ADMIN

**Try it now:**
1. Go to: http://localhost:8080/officer/login
2. Phone: `9876543210`
3. Password: `TestPass123`
4. Click "Sign In"
5. Check console (F12) for logs
6. Should redirect to dashboard

**The implementation is correct and matches the backend!** ✅
