# 🔧 Officer Login - Troubleshooting Guide

## ✅ **What I Fixed**

I've enhanced the officer login with better validation, error messages, and debugging to help identify why login might be failing.

---

## 🎯 **Key Changes**

### **1. Phone Number Validation**
```typescript
// Now validates phone format BEFORE API call
if (phone.length !== 10 || !/^\d{10}$/.test(phone)) {
  toast({
    title: "Invalid Phone Number",
    description: "Please enter a valid 10-digit phone number (without country code)",
    variant: "destructive"
  });
  return;
}
```

### **2. Detailed Console Logging**
```typescript
console.log('🔐 Attempting officer login with phone:', phone);
console.log('✅ Login response received:', { hasAccessToken, hasRefreshToken, role });
console.log('✅ Tokens stored, navigating to dashboard');
```

### **3. Better Error Messages**
- **401** - Invalid credentials
- **429** - Too many attempts (rate limited)
- **423** - Account locked
- **Network Error** - Backend not running

### **4. UI Improvements**
- Phone input limited to 10 digits
- Helper text: "Enter phone number without country code"
- Clearer placeholder: "Enter 10-digit phone (e.g., 9876543210)"

---

## 🧪 **How to Test**

### **Step 1: Open Browser Console**
1. Press **F12** to open DevTools
2. Go to **Console** tab
3. Keep it open while testing

### **Step 2: Try to Login**
1. Go to: http://localhost:8080/officer/login
2. Enter phone: `9876543210` (10 digits, no +91)
3. Enter password: Your officer password
4. Click "Sign In"

### **Step 3: Check Console Logs**

**If login is working:**
```
🔐 Attempting officer login with phone: 9876543210
✅ Login response received: {hasAccessToken: true, hasRefreshToken: true, role: "NODAL_OFFICER"}
✅ Tokens stored, navigating to dashboard
```

**If login fails:**
```
🔐 Attempting officer login with phone: 9876543210
❌ Login error: AxiosError {...}
Error details: {status: 401, data: {...}, message: "..."}
```

---

## 🔍 **Common Issues & Solutions**

### **Issue 1: "Invalid phone number or password"**

**Possible Causes:**
1. ❌ Phone number format wrong
2. ❌ Password incorrect
3. ❌ Officer account doesn't exist
4. ❌ Account not activated

**Solutions:**
```bash
# Check if officer exists in database
# In backend:
SELECT * FROM users WHERE phone = '9876543210';

# Should return:
# - role: 'NODAL_OFFICER' or 'ADMIN'
# - hashed_password: (not null)
# - is_active: true
```

### **Issue 2: "Cannot connect to server"**

**Possible Causes:**
1. ❌ Backend not running
2. ❌ Wrong API URL
3. ❌ CORS issues

**Solutions:**
```bash
# 1. Check if backend is running
curl http://localhost:8000/api/v1/health

# 2. Check .env file
cat civiclens-client/.env
# Should have: VITE_API_URL=http://localhost:8000/api/v1

# 3. Start backend
cd civiclens-backend
uvicorn app.main:app --reload
```

### **Issue 3: "Too many login attempts"**

**Possible Causes:**
1. ❌ Rate limit exceeded (5 attempts per hour)

**Solutions:**
```bash
# Clear rate limit in Redis
redis-cli
> DEL rate_limit:login:9876543210
> DEL failed_login:9876543210
```

### **Issue 4: "Account is locked"**

**Possible Causes:**
1. ❌ Too many failed login attempts
2. ❌ Account manually locked

**Solutions:**
```bash
# Clear account lockout in Redis
redis-cli
> DEL account_lockout:9876543210
> DEL failed_login:9876543210

# Or wait 30 minutes for auto-unlock
```

### **Issue 5: Phone Format Issues**

**Wrong Formats:**
```
❌ +919876543210  (has country code)
❌ 09876543210    (has leading 0)
❌ 98765-43210    (has dash)
❌ 987 654 3210   (has spaces)
```

**Correct Format:**
```
✅ 9876543210     (10 digits, no prefix)
```

---

## 🔐 **Backend Authentication Flow**

```
Frontend: authService.login(phone, password)
   ↓
POST /api/v1/auth/login
Body: { phone: "9876543210", password: "..." }
   ↓
Backend: Check rate limit
   ↓
Backend: Check account lockout
   ↓
Backend: Find user by phone
   ↓
Backend: Verify password hash
   ↓
Backend: Generate JWT tokens
   ↓
Backend: Create session
   ↓
Response: {
  access_token: "eyJ...",
  refresh_token: "eyJ...",
  user_id: 123,
  role: "NODAL_OFFICER"
}
   ↓
Frontend: Store tokens in localStorage
   ↓
Frontend: Fetch user data (GET /users/me)
   ↓
Frontend: Navigate to /officer/dashboard
```

---

## 🛠️ **Debug Checklist**

### **Frontend Checks:**
- [ ] Browser console open (F12)
- [ ] No JavaScript errors
- [ ] Phone format: 10 digits
- [ ] Password entered
- [ ] Network tab shows API call
- [ ] API URL correct in .env

### **Backend Checks:**
- [ ] Backend server running
- [ ] Port 8000 accessible
- [ ] Database connected
- [ ] Redis connected
- [ ] Officer account exists
- [ ] Password hash exists
- [ ] Account is active

### **Network Checks:**
- [ ] API call reaches backend
- [ ] Response status code
- [ ] Response body
- [ ] CORS headers present

---

## 📝 **Testing Different Scenarios**

### **Scenario 1: Valid Officer Login**
```
Phone: 9876543210
Password: ValidPass123

Expected:
✅ Console: "Attempting officer login"
✅ Console: "Login response received"
✅ Console: "Tokens stored"
✅ Toast: "Login Successful!"
✅ Redirect to dashboard
```

### **Scenario 2: Wrong Password**
```
Phone: 9876543210
Password: WrongPassword

Expected:
❌ Console: "Login error"
❌ Status: 401
❌ Toast: "Invalid phone number or password"
❌ Stay on login page
```

### **Scenario 3: Non-existent Officer**
```
Phone: 0000000000
Password: AnyPassword

Expected:
❌ Console: "Login error"
❌ Status: 401
❌ Toast: "Invalid phone number or password"
❌ Stay on login page
```

### **Scenario 4: Invalid Phone Format**
```
Phone: +919876543210
Password: ValidPass123

Expected:
❌ Toast: "Invalid Phone Number"
❌ Message: "Please enter a valid 10-digit phone number"
❌ No API call made
```

### **Scenario 5: Backend Down**
```
Phone: 9876543210
Password: ValidPass123
Backend: Not running

Expected:
❌ Console: "Network Error"
❌ Toast: "Cannot connect to server"
❌ Message: "Please check if backend is running"
```

---

## 🎯 **Quick Fix Commands**

### **Create Test Officer:**
```python
# In backend Python shell
from app.models.user import User, UserRole
from app.core.security import get_password_hash
from app.core.database import get_db

async def create_test_officer():
    async for db in get_db():
        officer = User(
            phone="9876543210",
            full_name="Test Officer",
            email="officer@test.com",
            role=UserRole.NODAL_OFFICER,
            hashed_password=get_password_hash("TestPass123"),
            is_active=True,
            phone_verified=True
        )
        db.add(officer)
        await db.commit()
        print(f"Created officer: {officer.id}")
```

### **Reset Officer Password:**
```python
# In backend Python shell
from app.crud.user import user_crud
from app.core.security import get_password_hash

async def reset_password():
    async for db in get_db():
        user = await user_crud.get_by_phone(db, "9876543210")
        if user:
            user.hashed_password = get_password_hash("NewPass123")
            await db.commit()
            print("Password reset!")
```

### **Clear Rate Limits:**
```bash
# In terminal
redis-cli FLUSHDB
```

---

## ✅ **Verification Steps**

After implementing fixes:

1. **Clear browser cache:**
   - Ctrl+Shift+Delete
   - Clear cookies and cache

2. **Restart frontend:**
   ```bash
   cd civiclens-client
   npm run dev
   ```

3. **Check backend logs:**
   ```bash
   # Should see:
   INFO: POST /api/v1/auth/login
   INFO: User authenticated: 9876543210
   ```

4. **Test login:**
   - Open http://localhost:8080/officer/login
   - Enter valid credentials
   - Check console logs
   - Should redirect to dashboard

---

## 🎉 **Summary**

**What's Improved:**
- ✅ Phone validation (10 digits)
- ✅ Detailed console logging
- ✅ Better error messages
- ✅ UI helper text
- ✅ Input maxLength
- ✅ Network error handling
- ✅ Rate limit detection
- ✅ Account lockout detection

**How to Use:**
1. Open browser console (F12)
2. Try to login
3. Check console logs
4. Read error messages
5. Follow troubleshooting guide

**The officer login now has comprehensive debugging to help identify issues!** 🚀
