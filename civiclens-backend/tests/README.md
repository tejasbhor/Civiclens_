# 🧪 CivicLens API Test Suite

Comprehensive test suite for all CivicLens API endpoints, organized by functional groups.

## 📁 Test Structure

```
tests/
├── test_config.py              # Shared configuration and utilities
├── run_all_tests.py           # Main test runner (run this!)
├── test_default_endpoints.py   # Root and health check tests
├── test_auth_endpoints.py      # Authentication tests
├── test_sync_endpoints.py      # Offline sync tests
├── test_reports_endpoints.py   # Reports CRUD tests
├── test_users_endpoints.py     # User management tests
├── test_analytics_endpoints.py # Analytics tests
└── README.md                   # This file
```

## 🚀 Quick Start

### Prerequisites

1. **Start the server:**
   ```bash
   uvicorn app.main:app --reload
   ```

2. **Install dependencies:**
   ```bash
   pip install requests colorama
   ```

### Run All Tests

```bash
# From project root
python tests/run_all_tests.py

# Or from tests directory
cd tests
python run_all_tests.py
```

### Run Individual Test Groups

```bash
# Default endpoints only
python tests/test_default_endpoints.py

# Authentication only
python tests/test_auth_endpoints.py

# Reports only
python tests/test_reports_endpoints.py

# Users only
python tests/test_users_endpoints.py

# Sync only
python tests/test_sync_endpoints.py

# Analytics only
python tests/test_analytics_endpoints.py
```

## 📊 Test Groups

### 1. Default Endpoints (2 tests)
- ✅ `GET /` - Root endpoint
- ✅ `GET /health` - Health check

### 2. Authentication (13 tests)

#### Basic Authentication
- ✅ `POST /api/v1/auth/request-otp` - Request OTP
- ✅ `POST /api/v1/auth/verify-otp` - Verify OTP
- ✅ `POST /api/v1/auth/login` - Password login
- ✅ `POST /api/v1/auth/create-officer` - Create officer
- ✅ `POST /api/v1/auth/complete-profile` - Complete profile

#### Extended Authentication
- ✅ `POST /api/v1/auth/refresh` - Refresh token
- ✅ `POST /api/v1/auth/logout` - Logout
- ✅ `POST /api/v1/auth/logout-all` - Logout all devices
- ✅ `GET /api/v1/auth/sessions` - Get sessions
- ✅ `DELETE /api/v1/auth/sessions/{id}` - Revoke session
- ✅ `POST /api/v1/auth/request-password-reset` - Request reset
- ✅ `POST /api/v1/auth/reset-password` - Reset password
- ✅ `POST /api/v1/auth/change-password` - Change password

### 3. Offline Sync (5 tests)
- ✅ `POST /api/v1/sync/upload` - Batch upload
- ✅ `GET /api/v1/sync/download` - Incremental download
- ✅ `GET /api/v1/sync/status` - Get sync status
- ✅ `GET /api/v1/sync/conflicts` - Get conflicts
- ✅ `POST /api/v1/sync/resolve-conflict` - Resolve conflict

### 4. Reports (6 tests)
- ✅ `POST /api/v1/reports/` - Create report
- ✅ `GET /api/v1/reports/` - Get reports
- ✅ `GET /api/v1/reports/my-reports` - Get my reports
- ✅ `GET /api/v1/reports/{id}` - Get report by ID
- ✅ `PUT /api/v1/reports/{id}` - Update report
- ✅ `DELETE /api/v1/reports/{id}` - Delete report

### 5. Users (11 tests)

#### Profile Management
- ✅ `GET /api/v1/users/me` - Get current user
- ✅ `PUT /api/v1/users/me/profile` - Update profile
- ✅ `GET /api/v1/users/me/stats` - Get my stats

#### Admin User Management
- ✅ `GET /api/v1/users/` - List users
- ✅ `GET /api/v1/users/{id}` - Get user profile
- ✅ `POST /api/v1/users/promote-contributor/{id}` - Promote
- ✅ `POST /api/v1/users/change-role` - Change role
- ✅ `GET /api/v1/users/promotion-candidates` - Get candidates
- ✅ `POST /api/v1/users/assign-area` - Assign area
- ✅ `GET /api/v1/users/role-history/{id}` - Get role history
- ✅ `GET /api/v1/users/analytics/role-changes` - Role analytics

### 6. Analytics (1 test)
- ✅ `GET /api/v1/analytics/stats` - Get dashboard stats

## 📝 Test Output

### Success Example
```
✓ Request OTP: PASS
  ℹ OTP: 123456

✓ Verify OTP: PASS
  ℹ User ID: 1, Role: citizen

✓ Create Report: PASS
  ℹ Report ID: 5
```

### Failure Example
```
✗ Login: FAIL
  ℹ Status: 401
```

## 🔧 Configuration

Edit `test_config.py` to change:

```python
# Base URL
BASE_URL = "http://localhost:8000"

# Test data
test_data = {
    "citizen_phone": "+919876543210",
    "admin_phone": "+919021932646",
    "admin_password": "Admin@123"
}
```

## 📊 Test Coverage

| Group | Endpoints | Tests | Coverage |
|-------|-----------|-------|----------|
| Default | 2 | 2 | 100% |
| Authentication | 13 | 13 | 100% |
| Offline Sync | 5 | 5 | 100% |
| Reports | 6 | 6 | 100% |
| Users | 11 | 11 | 100% |
| Analytics | 1 | 1 | 100% |
| **Total** | **38** | **38** | **100%** |

## 🎯 Test Scenarios

### Scenario 1: Citizen User Flow
1. Request OTP
2. Verify OTP (get token)
3. Complete profile
4. Create report
5. View my reports
6. Update profile
7. Get stats

### Scenario 2: Admin User Flow
1. Login with password
2. Create officer account
3. List all users
4. Change user role
5. View analytics
6. Manage sessions

### Scenario 3: Offline Sync Flow
1. Create report offline (batch upload)
2. Download updates
3. Check sync status
4. Resolve conflicts

## 🐛 Troubleshooting

### Server Not Running
```
❌ ERROR: Server is not running at http://localhost:8000
Please start the server with: uvicorn app.main:app --reload
```

**Solution:** Start the server first!

### No Admin Token
```
⚠ Warning: No admin token available, some tests will be skipped
```

**Solution:** Make sure super admin exists in database:
```bash
python reset_database.py
```

### Import Errors
```
ModuleNotFoundError: No module named 'requests'
```

**Solution:** Install dependencies:
```bash
pip install requests colorama
```

### Connection Refused
```
Request failed: Connection refused
```

**Solution:** Check if server is running on correct port (8000)

## 📈 Adding New Tests

### Step 1: Create Test File
```python
# tests/test_new_endpoints.py
from .test_config import make_request, print_test

class TestNewFeature:
    @staticmethod
    def test_new_endpoint(token: str):
        print("\n📝 Testing: New Endpoint")
        
        success, data, status = make_request(
            "GET",
            "/new/endpoint",
            token=token
        )
        
        if success:
            print_test("New Endpoint", True, "Success!")
            return True
        else:
            print_test("New Endpoint", False, f"Status: {status}")
            return False

def run_all_new_tests(token: str):
    print("\n" + "="*80)
    print("🆕 NEW FEATURE TESTS")
    print("="*80)
    
    TestNewFeature.test_new_endpoint(token)
```

### Step 2: Add to Main Runner
```python
# tests/run_all_tests.py
from test_new_endpoints import run_all_new_tests

# In main():
run_all_new_tests(citizen_token)
```

## 🎨 Color Codes

- 🟢 `✓` Green - Test passed
- 🔴 `✗` Red - Test failed
- 🟡 `⚠` Yellow - Warning
- 🔵 `ℹ` Blue - Info

## 📚 Best Practices

1. **Always run tests after code changes**
2. **Check all test groups pass before deployment**
3. **Update tests when adding new endpoints**
4. **Use meaningful test names**
5. **Add detailed error messages**
6. **Test both success and failure cases**

## 🔐 Security Notes

- Tests use real API endpoints
- Tokens are generated during test execution
- Test data is temporary and can be cleaned
- Don't commit sensitive credentials
- Use `.env` for configuration

## 📞 Support

If tests fail:
1. Check server logs
2. Verify database is initialized
3. Check Redis is running
4. Review test output for errors
5. Check API documentation

## 🎉 Success Criteria

All tests should pass:
```
✅ TEST SUITE COMPLETE
All test groups executed successfully!
```

---

**Last Updated:** October 19, 2025  
**Total Tests:** 38  
**Coverage:** 100%  
**Status:** ✅ All tests passing
