# 🚀 Quick Start Guide

**Get your CivicLens system running in 5 minutes!**

---

## ⚡ **Quick Setup**

### **Step 1: Run Migrations (Choose One)**

#### **Option A: Using Alembic (Recommended)**

```bash
cd civiclens-backend

# Install Alembic if not installed
pip install alembic

# Initialize (first time only)
alembic init alembic

# Create migration
alembic revision --autogenerate -m "add_appeals_escalations"

# Run migration
alembic upgrade head
```

#### **Option B: Using SQL Script (Faster)**

```bash
cd civiclens-backend

# Run SQL directly
psql -U postgres -d civiclens -f app/db/migrations/create_appeals_escalations.sql
```

---

### **Step 2: Start Backend**

```bash
cd civiclens-backend
uvicorn app.main:app --reload
```

**Verify:** Open http://localhost:8000/docs

---

### **Step 3: Start Frontend**

```bash
cd civiclens-admin
npm run dev
```

**Verify:** Open http://localhost:3000

---

## 🧪 **Quick Test**

### **Test 1: Check APIs (No Auth Needed)**

```bash
# Health check
curl http://localhost:8000/health

# API info
curl http://localhost:8000/
```

### **Test 2: Login & Get Token**

```bash
# Login (replace with your credentials)
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543210",
    "password": "your_password"
  }'

# Copy the access_token from response
```

### **Test 3: Test Appeals API**

```bash
# Set your token
export TOKEN="paste_your_token_here"

# Get stats
curl http://localhost:8000/api/v1/appeals/stats \
  -H "Authorization: Bearer $TOKEN"

# Get escalations stats
curl http://localhost:8000/api/v1/escalations/stats \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** JSON response with stats (initially empty)

---

## 🎯 **Quick Workflow Test**

### **Scenario: Citizen Appeals Resolution**

```bash
# 1. Create appeal
curl -X POST http://localhost:8000/api/v1/appeals \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "report_id": 1,
    "appeal_type": "resolution",
    "reason": "Work quality is poor",
    "evidence": "Photos show issues"
  }'

# 2. List appeals
curl http://localhost:8000/api/v1/appeals \
  -H "Authorization: Bearer $TOKEN"

# 3. Review appeal (admin)
curl -X POST http://localhost:8000/api/v1/appeals/1/review \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved",
    "review_notes": "Valid appeal. Requiring rework.",
    "requires_rework": true,
    "rework_notes": "Use proper materials"
  }'
```

---

## ✅ **Verification**

### **Backend Working:**
- ✅ http://localhost:8000/docs shows API docs
- ✅ Appeals endpoints visible
- ✅ Escalations endpoints visible
- ✅ Can login and get token

### **Frontend Working:**
- ✅ http://localhost:3000 loads
- ✅ Can navigate to /dashboard/reports/manage
- ✅ See 6 tabs (All, Pending Review, Appeals, Escalations, Manage, Archived)
- ✅ Cards display correctly

### **Database Working:**
- ✅ Appeals table exists
- ✅ Escalations table exists

**Check tables:**
```bash
psql -U postgres -d civiclens -c "\dt"
```

---

## 🐛 **Common Issues**

### **Issue: "Not authenticated"**

**Fix:**
```bash
# Make sure you're logged in and using the token
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210", "password": "password"}' \
  | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

echo "Token: $TOKEN"
```

### **Issue: Backend won't start**

**Fix:**
```bash
# Check if port 8000 is in use
netstat -ano | findstr :8000

# Kill process if needed
taskkill /PID <process_id> /F

# Restart
uvicorn app.main:app --reload
```

### **Issue: Migration fails**

**Fix:**
```bash
# Check database connection
psql -U postgres -d civiclens -c "SELECT 1"

# If connection fails, check:
# 1. PostgreSQL is running
# 2. Database 'civiclens' exists
# 3. Credentials in .env are correct

# Create database if needed
psql -U postgres -c "CREATE DATABASE civiclens;"
```

---

## 📚 **Next Steps**

1. ✅ **Read:** `COMPLETE_WORKFLOW_IMPLEMENTATION.md`
2. ✅ **Test:** `TESTING_AND_MIGRATION_GUIDE.md`
3. ✅ **Deploy:** Follow production deployment guide

---

## 🎉 **Success!**

If you can:
- ✅ Access API docs at http://localhost:8000/docs
- ✅ See appeals/escalations endpoints
- ✅ Login and get token
- ✅ Call APIs successfully

**Your system is ready!** 🚀

---

## 📞 **Need Help?**

Check these files:
- `TESTING_AND_MIGRATION_GUIDE.md` - Detailed testing
- `COMPLETE_WORKFLOW_IMPLEMENTATION.md` - Full workflow
- `APPEALS_ESCALATIONS_COMPLETE.md` - API reference

**Happy coding!** ✨
