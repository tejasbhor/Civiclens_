# 🔐 CivicLens Security Architecture

## System Overview

**CivicLens** is a civic issue reporting system with two distinct user bases:

1. **Citizens** (Mobile App) - Report issues via OTP-based authentication
2. **Government Officials** (Admin Dashboard) - Manage reports via password-based authentication

---

## Current Implementation Status

### ✅ Implemented (Production-Ready)

#### Backend Security
- ✅ **JWT with JTI session tracking** - Every token has unique ID stored in database
- ✅ **bcrypt password hashing** - Industry-standard password encryption
- ✅ **Rate limiting** (Redis-based)
  - 3 OTP requests per hour
  - 5 login attempts per 15 minutes
  - 3 password reset requests per hour
- ✅ **Account lockout** - 5 failed attempts = 30 minute lockout
- ✅ **Session management**
  - Max 3 concurrent sessions per user
  - 60-minute inactivity timeout
  - Session revocation (logout, logout-all)
- ✅ **Role-based access control (RBAC)**
  - 7 role levels: Citizen → Contributor → Moderator → Nodal Officer → Auditor → Admin → Super Admin
  - Permission-based system for granular control
- ✅ **Refresh token rotation** - Refresh tokens validated against database sessions
- ✅ **CORS protection** - Configured for localhost:3000
- ✅ **Password reset flow** - Secure token-based reset

#### Frontend Security (Admin Dashboard)
- ✅ **Password-only authentication** - No OTP for government officials
- ✅ **Role-based access control** - Only admin/super_admin/auditor/nodal_officer/moderator allowed
- ✅ **Phone number normalization** - Ensures consistent format (+91XXXXXXXXXX)
- ✅ **Token validation** - Validates tokens before API calls
- ✅ **Silent refresh** - Automatic token refresh on 401
- ✅ **Access denied screen** - Clear error when non-admin tries to access
- ✅ **Audit trail ready** - All login attempts logged in backend

---

## 🚀 Recommended Enhancements for Government Deployment

### Priority 1: Critical (Before Production)

#### 1. **Migrate to HttpOnly Cookies**
**Current:** Tokens stored in localStorage (vulnerable to XSS)
**Recommended:** 
```typescript
// Backend: Set httpOnly cookies
response.set_cookie(
    key="access_token",
    value=access_token,
    httponly=True,
    secure=True,  # HTTPS only
    samesite="strict",
    max_age=3600
)
```

**Benefits:**
- Immune to XSS attacks
- Cannot be accessed by JavaScript
- Automatically sent with requests

#### 2. **CSRF Protection**
**Implementation:**
```python
# Backend: Generate CSRF token
csrf_token = secrets.token_urlsafe(32)
response.set_cookie("csrf_token", csrf_token, httponly=False)

# Frontend: Send in header
headers = {"X-CSRF-Token": getCookie("csrf_token")}
```

#### 3. **IP Whitelisting for Admin Access**
**Backend:**
```python
ALLOWED_ADMIN_IPS = [
    "203.192.xxx.xxx",  # Government office 1
    "203.192.xxx.xxx",  # Government office 2
]

@router.post("/auth/login")
async def login(request: Request):
    client_ip = request.client.host
    user_role = get_user_role(phone)
    
    if user_role in ["admin", "super_admin"]:
        if client_ip not in ALLOWED_ADMIN_IPS:
            raise ForbiddenException("Admin access only from authorized IPs")
```

#### 4. **Two-Factor Authentication (2FA)**
**For Super Admins:**
```python
# After password verification
if user.role == UserRole.SUPER_ADMIN:
    # Generate TOTP code
    totp = pyotp.TOTP(user.totp_secret)
    # Require 6-digit code from authenticator app
    if not totp.verify(provided_code):
        raise UnauthorizedException("Invalid 2FA code")
```

**Recommended:** Google Authenticator, Microsoft Authenticator

---

### Priority 2: Enhanced Security

#### 5. **Audit Logging Dashboard**
**Track:**
- All login attempts (success/failure)
- IP addresses and user agents
- Session creation/revocation
- Role changes
- Password resets
- Data access patterns

**Implementation:**
```python
class AuditLog(BaseModel):
    user_id: int
    action: str  # "login", "logout", "password_reset", etc.
    ip_address: str
    user_agent: str
    status: str  # "success", "failure"
    metadata: dict
    timestamp: datetime
```

#### 6. **Password Complexity Enforcement**
**Current:** Min 8 characters
**Recommended:**
```python
def validate_password_strength(password: str):
    if len(password) < 12:
        raise ValidationException("Password must be at least 12 characters")
    if not re.search(r"[A-Z]", password):
        raise ValidationException("Password must contain uppercase letter")
    if not re.search(r"[a-z]", password):
        raise ValidationException("Password must contain lowercase letter")
    if not re.search(r"[0-9]", password):
        raise ValidationException("Password must contain digit")
    if not re.search(r"[!@#$%^&*]", password):
        raise ValidationException("Password must contain special character")
    
    # Check against common passwords
    if password in COMMON_PASSWORDS:
        raise ValidationException("Password is too common")
```

#### 7. **Session Fingerprinting**
**Prevent session hijacking:**
```python
def create_session_fingerprint(request: Request) -> str:
    return hashlib.sha256(
        f"{request.client.host}"
        f"{request.headers.get('user-agent')}"
        f"{request.headers.get('accept-language')}"
        .encode()
    ).hexdigest()

# Validate on each request
if session.fingerprint != current_fingerprint:
    raise UnauthorizedException("Session fingerprint mismatch")
```

#### 8. **Rate Limiting by IP**
**Additional layer:**
```python
# Global rate limit per IP
@router.post("/auth/login")
async def login(request: Request):
    ip = request.client.host
    await rate_limiter.check_rate_limit(
        key=f"ip:{ip}",
        max_requests=20,
        window_seconds=3600,
        identifier="login attempts from this IP"
    )
```

---

### Priority 3: Compliance & Monitoring

#### 9. **HTTPS Enforcement**
**Production:**
```python
# Redirect HTTP to HTTPS
if not request.url.scheme == "https":
    return RedirectResponse(
        url=request.url.replace(scheme="https"),
        status_code=301
    )
```

#### 10. **Security Headers**
```python
app.add_middleware(
    SecurityHeadersMiddleware,
    headers={
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
        "Content-Security-Policy": "default-src 'self'",
    }
)
```

#### 11. **Real-time Monitoring**
**Alerts for:**
- Multiple failed login attempts from same IP
- Login from new location/device
- Unusual API access patterns
- Session anomalies

**Tools:** Sentry, Datadog, CloudWatch

#### 12. **Data Encryption at Rest**
**Database:**
```python
# Encrypt sensitive fields
from cryptography.fernet import Fernet

class User(BaseModel):
    aadhaar_number_encrypted = Column(String)
    
    def set_aadhaar(self, aadhaar: str):
        cipher = Fernet(settings.ENCRYPTION_KEY)
        self.aadhaar_number_encrypted = cipher.encrypt(aadhaar.encode())
```

---

## Authentication Flow Comparison

### Citizens (Mobile App)
```
1. Enter phone number
2. Receive OTP via SMS
3. Verify OTP
4. Auto-create account if new user
5. Issue JWT tokens
6. Access citizen features
```

### Government Officials (Admin Dashboard)
```
1. Enter phone number + password
2. Verify credentials (bcrypt)
3. Check role (must be admin/super_admin/auditor/nodal_officer/moderator)
4. [RECOMMENDED] Verify 2FA code (for super_admin)
5. [RECOMMENDED] Check IP whitelist
6. Issue JWT tokens with shorter expiry (8 hours)
7. Access admin dashboard
```

---

## Role Hierarchy & Permissions

```
Level 7: SUPER_ADMIN
  ├─ Full system access
  ├─ User management
  ├─ System configuration
  └─ Audit logs

Level 6: ADMIN
  ├─ Operational management
  ├─ Report assignment
  └─ User role changes (up to moderator)

Level 5: AUDITOR
  ├─ Read-only access
  ├─ Generate reports
  └─ View audit logs

Level 4: NODAL_OFFICER
  ├─ Field operations
  ├─ Report resolution
  └─ Area-specific access

Level 3: MODERATOR
  ├─ Content moderation
  ├─ Report validation
  └─ Area-specific access

Level 2: CONTRIBUTOR
  ├─ Enhanced reporting
  └─ Validation participation

Level 1: CITIZEN
  ├─ Basic reporting
  └─ View own reports
```

---

## Deployment Checklist

### Before Going Live

- [ ] Enable HTTPS with valid SSL certificate
- [ ] Set `DEBUG=False` in production
- [ ] Use strong `SECRET_KEY` (64+ characters)
- [ ] Configure production database (PostgreSQL)
- [ ] Set up Redis for sessions and rate limiting
- [ ] Configure SMS gateway for OTP (replace debug mode)
- [ ] Set up email service for notifications
- [ ] Enable IP whitelisting for admin access
- [ ] Implement 2FA for super admins
- [ ] Set up monitoring and alerting
- [ ] Configure backup strategy
- [ ] Set up audit logging
- [ ] Review and update CORS origins
- [ ] Implement CSRF protection
- [ ] Migrate to httpOnly cookies
- [ ] Set up WAF (Web Application Firewall)
- [ ] Conduct security audit
- [ ] Penetration testing
- [ ] Load testing

---

## Current Security Level

**Rating: B+ (Strong for MVP, needs hardening for government production)**

**Strengths:**
- ✅ Solid authentication foundation
- ✅ Role-based access control
- ✅ Session management
- ✅ Rate limiting and account lockout
- ✅ Password hashing with bcrypt
- ✅ JWT with session tracking

**Areas for Improvement:**
- ⚠️ localStorage tokens (migrate to httpOnly cookies)
- ⚠️ No CSRF protection
- ⚠️ No IP whitelisting
- ⚠️ No 2FA for admins
- ⚠️ No audit logging dashboard
- ⚠️ Basic password requirements

**After implementing Priority 1 recommendations: A+ (Government-grade)**

---

## Contact

For security concerns or to report vulnerabilities, contact:
- System Administrator: admin@civiclens.gov.in
- Security Team: security@civiclens.gov.in
