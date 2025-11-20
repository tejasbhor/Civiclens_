# 🚀 Quick Test Reference Card

**One-page guide to test CivicLens API endpoints**

---

## ⚡ Quick Start (3 Commands)

```bash
# 1. Check if everything is running
python check_services.py

# 2. Run automated tests
python test_api_simple.py

# 3. View API docs
# Open browser: http://localhost:8000/docs
```

---

## 📋 Test Scripts Available

| Script | Purpose | Dependencies |
|--------|---------|--------------|
| `check_services.py` | Check if services are running | None |
| `test_api_simple.py` | Basic endpoint testing | None |
| `test_api_endpoints.py` | Full test suite | requests, colorama, tabulate |

---

## 🔑 Key Endpoints to Test

### 1. Health Check
```bash
curl http://localhost:8000/health
```

### 2. Get OTP
```bash
curl -X POST http://localhost:8000/api/v1/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210"}'
```

### 3. Verify OTP & Get Token
```bash
curl -X POST http://localhost:8000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210", "otp": "PASTE_OTP_HERE"}'
```

### 4. Get User Profile
```bash
curl http://localhost:8000/api/v1/users/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 5. Create Report
```bash
curl -X POST http://localhost:8000/api/v1/reports/ \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Report",
    "description": "Testing API",
    "category": "roads",
    "latitude": 23.3441,
    "longitude": 85.3096,
    "address": "Test Address",
    "severity": "medium"
  }'
```

---

## 🐛 Common Errors & Fixes

| Error | Fix |
|-------|-----|
| Connection refused | `uvicorn app.main:app --reload` |
| Invalid OTP | Request new OTP (expires in 5 min) |
| 401 Unauthorized | Check token in Authorization header |
| 403 Forbidden | Check user role (admin endpoints need admin) |
| Database error | `alembic upgrade head` |
| Redis error | Start Redis: `redis-server` |

---

## 📊 Expected Test Results

**Simple Test Script:**
- ✓ 10-12 tests should pass
- ✗ 1-2 tests may fail (admin endpoints without admin user)
- Success rate: ~90%

**Full Test Script:**
- ✓ 20-23 tests should pass
- ✗ 2-3 tests may fail (admin/officer endpoints)
- Success rate: ~85-90%

---

## 🎯 Test Phone Numbers

Use these for testing:
- Citizen: `+919876543210`
- Admin: `+919876543211`
- Officer: `+919876543212`

---

## 📚 Documentation Files

| File | What's Inside |
|------|---------------|
| `TESTING_SUMMARY.md` | Complete testing overview |
| `API_TESTING_GUIDE.md` | All cURL commands & examples |
| `AUTHENTICATION_IMPLEMENTATION_ANALYSIS.md` | What's implemented (70%) |

---

## 🔗 Quick Links

- **API Docs:** http://localhost:8000/docs
- **Health:** http://localhost:8000/health
- **Root:** http://localhost:8000/

---

## ⚙️ Start Server

```bash
cd d:\Civiclens\civiclens-backend
uvicorn app.main:app --reload
```

Server runs on: **http://localhost:8000**

---

**That's it! Start testing with:** `python test_api_simple.py`
