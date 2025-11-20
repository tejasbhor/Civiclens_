# 🧪 CivicLens API Testing Guide

Complete guide to test all authentication endpoints and workflows.

---

## 📋 Prerequisites

### 1. Start the Server

```bash
# Navigate to backend directory
cd d:\Civiclens\civiclens-backend

# Activate virtual environment (if using)
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Start the server
uvicorn app.main:app --reload

# Or using Python directly
python -m uvicorn app.main:app --reload
```

Server should start at: **http://localhost:8000**

### 2. Verify Services Running

- ✅ **PostgreSQL** - Running on port 5432
- ✅ **Redis** - Running on port 6379
- ✅ **MinIO** (optional) - Running on port 9000

---

## 🚀 Quick Start Testing

### Option 1: Simple Python Script (No Dependencies)

```bash
python test_api_simple.py
```

This script:
- ✅ Tests OTP workflow
- ✅ Tests user profile endpoints
- ✅ Tests report creation
- ✅ Tests security/authorization
- ✅ Requires only Python standard library

### Option 2: Full Testing Script (With Pretty Output)

```bash
# Install dependencies first
pip install requests colorama tabulate

# Run full test suite
python test_api_endpoints.py
```

This script:
- ✅ Tests all authentication workflows
- ✅ Tests admin endpoints
- ✅ Tests role management
- ✅ Tests analytics
- ✅ Colored output and detailed reports

---

## 📖 Manual Testing with cURL

### 1. Health Check

```bash
curl http://localhost:8000/
```

**Expected Response:**
```json
{
  "name": "CivicLens API",
  "version": "1.0.0",
  "status": "running",
  "environment": "development"
}
```

---

### 2. OTP Authentication Workflow

#### Step 1: Request OTP

```bash
curl -X POST http://localhost:8000/api/v1/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210"}'
```

**Expected Response:**
```json
{
  "message": "OTP sent successfully",
  "otp": "123456",
  "expires_in_minutes": 5
}
```

**Note:** OTP is returned in response only in DEBUG mode. In production, it will be sent via SMS.

#### Step 2: Verify OTP

```bash
curl -X POST http://localhost:8000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543210",
    "otp": "123456"
  }'
```

**Expected Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user_id": 1,
  "role": "citizen"
}
```

**Save the access_token for subsequent requests!**

---

### 3. User Profile Endpoints

#### Get Current User Profile

```bash
curl http://localhost:8000/api/v1/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response:**
```json
{
  "id": 1,
  "phone": "+919876543210",
  "email": null,
  "full_name": null,
  "role": "citizen",
  "profile_completion": "minimal",
  "reputation_score": 0,
  "is_active": true,
  "phone_verified": false,
  "email_verified": false,
  "created_at": "2025-10-19T15:05:00Z",
  "last_login": "2025-10-19T15:05:00Z"
}
```

#### Complete Profile

```bash
curl -X POST http://localhost:8000/api/v1/auth/complete-profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "John Doe",
    "email": "john@example.com",
    "primary_address": "123 Main St, City",
    "bio": "Concerned citizen",
    "preferred_language": "en"
  }'
```

**Expected Response:**
```json
{
  "message": "Profile updated successfully",
  "profile_completion": "complete",
  "can_promote_to_contributor": false
}
```

#### Get User Statistics

```bash
curl http://localhost:8000/api/v1/users/me/stats \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response:**
```json
{
  "reputation_score": 5,
  "total_reports": 1,
  "total_validations": 0,
  "helpful_validations": 0,
  "reports_resolved": 0,
  "can_promote_to_contributor": false,
  "next_milestone": "Earn 95 more reputation points"
}
```

---

### 4. Report Endpoints

#### Create Report

```bash
curl -X POST http://localhost:8000/api/v1/reports/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Pothole on Main Road",
    "description": "Large pothole causing traffic issues",
    "category": "roads",
    "latitude": 23.3441,
    "longitude": 85.3096,
    "address": "Main Road, Ranchi",
    "severity": "high"
  }'
```

**Expected Response:**
```json
{
  "id": 1,
  "title": "Pothole on Main Road",
  "description": "Large pothole causing traffic issues",
  "category": "roads",
  "status": "pending",
  "severity": "high",
  "latitude": 23.3441,
  "longitude": 85.3096,
  "address": "Main Road, Ranchi",
  "user_id": 1,
  "created_at": "2025-10-19T15:10:00Z"
}
```

#### Get My Reports

```bash
curl http://localhost:8000/api/v1/reports/my-reports \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Get Report by ID

```bash
curl http://localhost:8000/api/v1/reports/1 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

### 5. Admin Endpoints (Requires Admin Token)

#### Create Officer Account

```bash
curl -X POST http://localhost:8000/api/v1/auth/create-officer \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543211",
    "email": "officer@civiclens.gov.in",
    "full_name": "Officer Name",
    "password": "SecurePass123",
    "role": "nodal_officer",
    "employee_id": "EMP001"
  }'
```

#### List Users

```bash
curl "http://localhost:8000/api/v1/users/?page=1&per_page=10" \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

#### Change User Role

```bash
curl -X POST http://localhost:8000/api/v1/users/change-role \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "new_role": "contributor",
    "reason": "Excellent contributions"
  }'
```

#### Get Role History

```bash
curl http://localhost:8000/api/v1/users/role-history/1 \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

---

## 🧪 Testing with Postman

### 1. Import Collection

Create a new Postman collection with these requests:

#### Environment Variables
```
base_url = http://localhost:8000
api_v1 = {{base_url}}/api/v1
citizen_token = (set after OTP verification)
admin_token = (set after admin login)
```

### 2. Test Sequence

1. **Health Check** → GET `{{base_url}}/`
2. **Request OTP** → POST `{{api_v1}}/auth/request-otp`
3. **Verify OTP** → POST `{{api_v1}}/auth/verify-otp` (save token)
4. **Get Profile** → GET `{{api_v1}}/users/me`
5. **Complete Profile** → POST `{{api_v1}}/auth/complete-profile`
6. **Create Report** → POST `{{api_v1}}/reports/`
7. **Get My Reports** → GET `{{api_v1}}/reports/my-reports`

---

## 🐛 Troubleshooting

### Issue: "Connection refused"

**Solution:**
```bash
# Check if server is running
curl http://localhost:8000/health

# If not, start the server
uvicorn app.main:app --reload
```

### Issue: "Invalid or expired OTP"

**Causes:**
- OTP expired (5 minutes)
- Redis not running
- Wrong OTP entered

**Solution:**
```bash
# Check Redis
redis-cli ping
# Should return: PONG

# Request new OTP
curl -X POST http://localhost:8000/api/v1/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210"}'
```

### Issue: "Database connection error"

**Solution:**
```bash
# Check PostgreSQL
psql -U civiclens_user -d civiclens_db -c "SELECT 1;"

# Run migrations
alembic upgrade head
```

### Issue: "401 Unauthorized"

**Causes:**
- Missing Authorization header
- Invalid token
- Token expired

**Solution:**
```bash
# Get new token via OTP workflow
# Ensure header format: Authorization: Bearer YOUR_TOKEN
```

### Issue: "403 Forbidden"

**Causes:**
- Insufficient permissions
- Wrong role for endpoint

**Solution:**
- Check user role: `GET /api/v1/users/me`
- Admin endpoints require `admin` role
- Officer endpoints require `nodal_officer` or `admin` role

---

## 📊 API Documentation

### Interactive Documentation

Once server is running, visit:

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc
- **OpenAPI JSON:** http://localhost:8000/openapi.json

### Available Endpoints

#### Authentication (`/api/v1/auth`)
- `POST /request-otp` - Request OTP for phone
- `POST /verify-otp` - Verify OTP and get token
- `POST /login` - Login with password (officers/admins)
- `POST /create-officer` - Create officer account (admin only)
- `POST /complete-profile` - Complete user profile

#### Users (`/api/v1/users`)
- `GET /me` - Get current user profile
- `PUT /me/profile` - Update current user profile
- `GET /me/stats` - Get user statistics
- `GET /{user_id}` - Get user by ID
- `GET /` - List all users (admin only)
- `POST /promote-contributor/{user_id}` - Promote to contributor
- `POST /change-role` - Change user role (admin only)
- `POST /assign-area` - Assign moderator area (admin only)
- `GET /role-history/{user_id}` - Get role change history
- `GET /promotion-candidates` - Get promotion candidates

#### Reports (`/api/v1/reports`)
- `POST /` - Create new report
- `GET /` - List all reports (with filters)
- `GET /my-reports` - Get current user's reports
- `GET /{report_id}` - Get report by ID
- `PUT /{report_id}` - Update report
- `DELETE /{report_id}` - Delete report

#### Analytics (`/api/v1/analytics`)
- `GET /stats` - Get dashboard statistics (officer/admin only)

---

## 🔑 Authentication Flow Summary

### Citizen Flow (OTP-based)
```
1. Request OTP → POST /auth/request-otp
2. Verify OTP → POST /auth/verify-otp
3. Get Token → Use in Authorization header
4. Access Protected Endpoints
```

### Officer/Admin Flow (Password-based)
```
1. Admin creates account → POST /auth/create-officer
2. Login with password → POST /auth/login
3. Get Token → Use in Authorization header
4. Access Admin Endpoints
```

### Progressive Profile
```
1. Start with MINIMAL (phone only)
2. Add name → BASIC
3. Add email + address → COMPLETE
4. Eligible for auto-promotion to CONTRIBUTOR
```

---

## 📝 Sample Test Data

### Test Users

```json
{
  "citizen": {
    "phone": "+919876543210",
    "role": "citizen"
  },
  "officer": {
    "phone": "+919876543211",
    "email": "officer@test.com",
    "password": "TestPass123",
    "role": "nodal_officer"
  },
  "admin": {
    "phone": "+919876543212",
    "email": "admin@test.com",
    "password": "AdminPass123",
    "role": "admin"
  }
}
```

### Test Reports

```json
{
  "pothole": {
    "title": "Large Pothole on Main Road",
    "description": "Dangerous pothole causing accidents",
    "category": "roads",
    "severity": "high",
    "latitude": 23.3441,
    "longitude": 85.3096
  },
  "streetlight": {
    "title": "Broken Street Light",
    "description": "Street light not working for 2 weeks",
    "category": "electricity",
    "severity": "medium",
    "latitude": 23.3450,
    "longitude": 85.3100
  }
}
```

---

## 🎯 Next Steps

1. ✅ Run the automated test scripts
2. ✅ Test manually with cURL or Postman
3. ✅ Check API documentation at `/docs`
4. ✅ Test error scenarios (invalid data, unauthorized access)
5. ✅ Test with different user roles
6. ✅ Verify database records after operations

---

## 📞 Support

If you encounter issues:

1. Check server logs for errors
2. Verify all services (PostgreSQL, Redis) are running
3. Check `.env` configuration
4. Review error messages in API responses
5. Use DEBUG mode for detailed error traces

---

**Happy Testing! 🚀**
