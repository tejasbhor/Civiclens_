# 🔒 Security Features - Quick Reference

## 🚀 Setup

### 1. Run Database Migration
```bash
python create_sessions_table.py
```

### 2. Restart Server
```bash
uvicorn app.main:app --reload
```

---

## 📡 API Endpoints

### Authentication

#### Request OTP
```http
POST /api/v1/auth/request-otp
Content-Type: application/json

{
  "phone": "+919876543210"
}

Response:
{
  "message": "OTP sent successfully",
  "otp": "123456",  // Only in DEBUG mode
  "expires_in_minutes": 5
}

Rate Limit: 3 requests/hour
```

#### Verify OTP & Login
```http
POST /api/v1/auth/verify-otp
Content-Type: application/json

{
  "phone": "+919876543210",
  "otp": "123456"
}

Response:
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "user_id": 1,
  "role": "citizen"
}
```

#### Password Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "phone": "+919876543210",
  "password": "SecurePass123!"
}

Response:
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "user_id": 1,
  "role": "citizen"
}

Rate Limit: 5 attempts/15 minutes
Account Lockout: After 5 failed attempts (30 min lockout)
```

#### Refresh Token
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJ..."
}

Response:
{
  "access_token": "eyJ...",
  "user_id": 1,
  "role": "citizen"
}
```

#### Logout
```http
POST /api/v1/auth/logout
Authorization: Bearer <access_token>

Response:
{
  "message": "Logged out successfully"
}
```

#### Logout All Devices
```http
POST /api/v1/auth/logout-all
Authorization: Bearer <access_token>

Response:
{
  "message": "Logged out from all devices"
}
```

---

### Session Management

#### Get Active Sessions
```http
GET /api/v1/auth/sessions
Authorization: Bearer <access_token>

Response:
{
  "sessions": [
    {
      "id": 1,
      "device_info": {"device": "iPhone", "os": "iOS 15"},
      "ip_address": "192.168.1.1",
      "last_activity": "2025-10-19T10:30:00Z",
      "is_active": true,
      "login_method": "otp"
    }
  ],
  "total": 1
}
```

#### Revoke Specific Session
```http
DELETE /api/v1/auth/sessions/{session_id}
Authorization: Bearer <access_token>

Response:
{
  "message": "Session revoked successfully"
}
```

---

### Password Management

#### Request Password Reset
```http
POST /api/v1/auth/request-password-reset
Content-Type: application/json

{
  "phone": "+919876543210"
}

Response:
{
  "message": "Password reset token sent",
  "reset_token": "abc123...",  // Only in DEBUG mode
  "expires_in_minutes": 15
}

Rate Limit: 3 requests/hour
```

#### Reset Password
```http
POST /api/v1/auth/reset-password
Content-Type: application/json

{
  "phone": "+919876543210",
  "reset_token": "abc123...",
  "new_password": "NewSecure123!"
}

Response:
{
  "message": "Password reset successfully"
}

Note: All sessions will be invalidated
```

#### Change Password
```http
POST /api/v1/auth/change-password
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "old_password": "OldPass123!",
  "new_password": "NewSecure123!"
}

Response:
{
  "message": "Password changed successfully"
}
```

---

## 🔐 Security Features

### Rate Limiting
| Endpoint | Limit | Window |
|----------|-------|--------|
| Request OTP | 3 | 1 hour |
| Login | 5 | 15 minutes |
| Password Reset | 3 | 1 hour |

**Error Response:**
```json
{
  "detail": "Rate limit exceeded for OTP requests. Try again in 3456 seconds."
}
```

### Account Lockout
- **Trigger:** 5 failed login attempts
- **Duration:** 30 minutes
- **Auto-unlock:** Yes
- **Manual unlock:** Admin can unlock via Redis

**Error Response:**
```json
{
  "detail": "Account locked due to too many failed attempts. Try again in 30 minutes."
}
```

### Session Management
- **Max concurrent sessions:** 3 per user
- **Inactivity timeout:** 60 minutes
- **Auto-cleanup:** Yes (background task)
- **Token expiry:** 24 hours (access), 30 days (refresh)

---

## 🛠️ Configuration

```python
# app/config.py

# Rate Limiting
RATE_LIMIT_ENABLED = True
RATE_LIMIT_OTP = "3/hour"
RATE_LIMIT_LOGIN = "5/15minutes"
RATE_LIMIT_PASSWORD_RESET = "3/hour"

# Account Security
MAX_LOGIN_ATTEMPTS = 5
ACCOUNT_LOCKOUT_DURATION_MINUTES = 30
PASSWORD_RESET_TOKEN_EXPIRY_MINUTES = 15

# Token Management
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours
REFRESH_TOKEN_EXPIRE_DAYS = 30
ADMIN_TOKEN_EXPIRE_HOURS = 8

# Session Management
MAX_CONCURRENT_SESSIONS = 3
SESSION_INACTIVITY_TIMEOUT_MINUTES = 60
```

---

## 🧪 Testing

### Test Rate Limiting
```bash
# Send 4 OTP requests rapidly
for i in {1..4}; do
  curl -X POST http://localhost:8000/api/v1/auth/request-otp \
    -H "Content-Type: application/json" \
    -d '{"phone":"+919876543210"}'
done

# 4th request should fail with rate limit error
```

### Test Account Lockout
```bash
# Try 6 wrong passwords
for i in {1..6}; do
  curl -X POST http://localhost:8000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"phone":"+919876543210","password":"wrong"}'
done

# 6th attempt should fail with account locked error
```

### Test Token Refresh
```bash
# 1. Login and get refresh token
LOGIN_RESPONSE=$(curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919021932646","password":"Admin@123"}')

REFRESH_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.refresh_token')

# 2. Use refresh token to get new access token
curl -X POST http://localhost:8000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refresh_token\":\"$REFRESH_TOKEN\"}"
```

### Test Session Management
```bash
# Get access token
ACCESS_TOKEN="your_access_token_here"

# View sessions
curl -X GET http://localhost:8000/api/v1/auth/sessions \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Logout from all devices
curl -X POST http://localhost:8000/api/v1/auth/logout-all \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

---

## 🐛 Troubleshooting

### Rate Limit Not Working
```bash
# Check Redis connection
redis-cli ping

# Check rate limit keys
redis-cli KEYS "rate_limit:*"

# Clear rate limit for testing
redis-cli DEL "rate_limit:otp:+919876543210"
```

### Account Lockout Not Working
```bash
# Check lockout status
redis-cli GET "account_locked:+919876543210"

# Check failed attempts
redis-cli GET "failed_login:+919876543210"

# Manually unlock account
redis-cli DEL "account_locked:+919876543210"
redis-cli DEL "failed_login:+919876543210"
```

### Sessions Not Created
```bash
# Check if sessions table exists
psql -U postgres -d civiclens -c "\dt sessions"

# Run migration if needed
python create_sessions_table.py

# Check sessions in database
psql -U postgres -d civiclens -c "SELECT * FROM sessions;"
```

---

## 📊 Monitoring

### Redis Keys to Monitor
```bash
# Rate limiting
rate_limit:otp:{phone}
rate_limit:login:{phone}
rate_limit:password_reset:{phone}

# Account security
account_locked:{phone}
failed_login:{phone}

# Password reset
password_reset:{phone}

# OTP
otp:{phone}
```

### Database Queries
```sql
-- Active sessions per user
SELECT user_id, COUNT(*) as session_count
FROM sessions
WHERE is_active = 1
GROUP BY user_id
ORDER BY session_count DESC;

-- Sessions by login method
SELECT login_method, COUNT(*) as count
FROM sessions
WHERE is_active = 1
GROUP BY login_method;

-- Expired but not cleaned up sessions
SELECT COUNT(*)
FROM sessions
WHERE is_active = 1 AND expires_at < NOW();
```

---

## 🎯 Best Practices

1. **Always use HTTPS in production**
2. **Store SECRET_KEY securely** (environment variable)
3. **Enable rate limiting** in production
4. **Monitor failed login attempts**
5. **Set up alerts** for suspicious activity
6. **Regularly cleanup** expired sessions
7. **Use strong passwords** (min 8 chars)
8. **Implement SMS/Email** for OTP and password reset
9. **Log security events** for audit trail
10. **Test security features** before deployment

---

## 📞 Support

For issues or questions:
- Check logs: `tail -f logs/civiclens.log`
- Check Redis: `redis-cli monitor`
- Check database: `psql -U postgres -d civiclens`

---

**Last Updated:** October 19, 2025
