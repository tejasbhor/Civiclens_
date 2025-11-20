# Admin Dashboard Settings Page - Implementation Guide

## Overview
Complete implementation plan for the CivicLens Admin Dashboard Settings page with backend API integration.

## Backend Analysis

### Available Configuration (from `app/config.py`)

#### 1. **System Configuration**
- `APP_NAME`: Application name
- `APP_VERSION`: Version number
- `DEBUG`: Debug mode toggle
- `ENVIRONMENT`: production/staging/development
- `CITY_CODE`: 3-letter city identifier (e.g., RNC)
- `APP_BASE_URL`: Base URL for the application

#### 2. **Security Settings**
- `SECRET_KEY`: JWT secret key
- `ALGORITHM`: Token algorithm (HS256)
- `ACCESS_TOKEN_EXPIRE_MINUTES`: Token expiry (1440 = 24h)
- `ADMIN_TOKEN_EXPIRE_HOURS`: Admin token expiry (8h)
- `REFRESH_TOKEN_EXPIRE_DAYS`: Refresh token expiry (30 days)

**Password Policy:**
- `PASSWORD_MIN_LENGTH`: Minimum length (12)
- `PASSWORD_REQUIRE_UPPERCASE`: Require uppercase letters
- `PASSWORD_REQUIRE_LOWERCASE`: Require lowercase letters
- `PASSWORD_REQUIRE_DIGIT`: Require digits
- `PASSWORD_REQUIRE_SPECIAL`: Require special characters

**Account Security:**
- `MAX_LOGIN_ATTEMPTS`: Max failed attempts (5)
- `ACCOUNT_LOCKOUT_DURATION_MINUTES`: Lockout duration (30)
- `PASSWORD_RESET_TOKEN_EXPIRY_MINUTES`: Reset token expiry (15)

**Advanced Security:**
- `TWO_FA_ENABLED`: Enable 2FA for super admins
- `TWO_FA_ISSUER`: Issuer name for authenticator apps
- `TWO_FA_REQUIRED_FOR_ROLES`: Roles requiring 2FA
- `SESSION_FINGERPRINT_ENABLED`: Detect session hijacking
- `CSRF_SECRET_KEY`: CSRF protection key
- `CSRF_TOKEN_EXPIRE_HOURS`: CSRF token expiry (24h)
- `ADMIN_IP_WHITELIST_ENABLED`: IP whitelisting for admins
- `ADMIN_IP_WHITELIST`: List of allowed IPs

#### 3. **Rate Limiting**
- `RATE_LIMIT_ENABLED`: Enable rate limiting
- `RATE_LIMIT_OTP`: OTP request limits (3/hour)
- `RATE_LIMIT_LOGIN`: Login attempt limits (5/15minutes)
- `RATE_LIMIT_PASSWORD_RESET`: Password reset limits (3/hour)

#### 4. **Session Management**
- `MAX_CONCURRENT_SESSIONS`: Max active sessions per user (3)
- `SESSION_INACTIVITY_TIMEOUT_MINUTES`: Auto-logout timeout (60)

#### 5. **File Upload Settings**
- `MAX_UPLOAD_SIZE`: Maximum file size (10MB = 10485760 bytes)
- `ALLOWED_IMAGE_TYPES`: Allowed image MIME types
- `ALLOWED_VIDEO_TYPES`: Allowed video MIME types
- Max images per report: 5
- Max audio per report: 1

#### 6. **Database Configuration**
- `DATABASE_URL`: PostgreSQL connection string
- `DATABASE_POOL_SIZE`: Connection pool size (20)
- `DATABASE_MAX_OVERFLOW`: Max overflow connections (10)
- `DATABASE_ECHO`: SQL query logging

#### 7. **Redis Configuration**
- `REDIS_URL`: Redis connection string
- `REDIS_PASSWORD`: Redis password (optional)

#### 8. **Storage Configuration**
**MinIO (Object Storage):**
- `MINIO_ENDPOINT`: MinIO server endpoint
- `MINIO_ACCESS_KEY`: Access key
- `MINIO_SECRET_KEY`: Secret key
- `MINIO_BUCKET`: Bucket name (civiclens-media)
- `MINIO_USE_SSL`: Use SSL/TLS

**Local Storage (Fallback):**
- `MEDIA_ROOT`: Local media directory (./media)

#### 9. **Audit & Compliance**
- `AUDIT_LOG_ENABLED`: Enable audit logging
- `AUDIT_LOG_RETENTION_DAYS`: Log retention period (365 days)

#### 10. **CORS & Security Headers**
- `CORS_ORIGINS`: Allowed origins (["http://localhost:3000"])
- `HTTPS_ONLY`: Enforce HTTPS in production
- `SECURE_COOKIES`: Secure cookie flag
- `SECURITY_HEADERS_ENABLED`: Enable security headers

#### 11. **Pagination**
- `DEFAULT_PAGE_SIZE`: Default page size (20)
- `MAX_PAGE_SIZE`: Maximum page size (100)

#### 12. **OTP Configuration**
- `OTP_EXPIRY_MINUTES`: OTP expiry time (5)
- `OTP_MAX_ATTEMPTS`: Max OTP requests per hour (3)

---

## Frontend Implementation

### Settings Page Structure

```
/dashboard/settings
├── System Configuration
├── Security Settings
├── User Management
├── File Upload Settings
├── Notification Settings
├── Database & Performance
├── Audit & Compliance
└── Integration Settings
```

### 1. **System Configuration Tab**

**Fields:**
- Application Name (text input)
- Version (read-only)
- Environment (dropdown: development/staging/production)
- City Code (text input, 3 chars max)
- Debug Mode (toggle switch)
- Base URL (text input)

**Visual Indicators:**
- Warning badge for debug mode in production
- Environment color coding (dev=blue, staging=yellow, prod=green)

### 2. **Security Settings Tab**

**Password Policy Section:**
- Minimum Length (number input, 8-32)
- Require Uppercase (checkbox)
- Require Lowercase (checkbox)
- Require Digits (checkbox)
- Require Special Characters (checkbox)

**Authentication Section:**
- Access Token Expiry (minutes)
- Admin Token Expiry (hours)
- Refresh Token Expiry (days)
- Max Login Attempts (number)
- Account Lockout Duration (minutes)
- Password Reset Token Expiry (minutes)

**Advanced Security:**
- Two-Factor Authentication (toggle + role selector)
- Session Fingerprinting (toggle)
- CSRF Protection (toggle)
- IP Whitelisting (toggle + IP list editor)

**Rate Limiting:**
- Enable Rate Limiting (toggle)
- OTP Rate Limit (text input: "3/hour")
- Login Rate Limit (text input: "5/15minutes")
- Password Reset Rate Limit (text input: "3/hour")

### 3. **User Management Tab**

**Session Management:**
- Max Concurrent Sessions (number, 1-10)
- Session Inactivity Timeout (minutes, 15-240)

**Role Configuration:**
- Display role hierarchy
- Permission matrix (read-only for now)

### 4. **File Upload Settings Tab**

**Upload Limits:**
- Max Upload Size (bytes, with MB converter)
- Max Images Per Report (number, 1-10)
- Max Audio Per Report (number, 0-5)

**Allowed File Types:**
- Image Formats (chips: JPEG, PNG, WebP)
- Audio Formats (chips: MP3, WAV, M4A)
- Video Formats (chips: MP4, WebM)

### 5. **Notification Settings Tab**

**Channels:**
- Push Notifications (toggle)
- SMS Notifications (toggle)
- Email Notifications (toggle)

**Future:** Email templates, notification rules

### 6. **Database & Performance Tab**

**Connection Pool:**
- Pool Size (number, 10-50)
- Max Overflow (number, 5-20)
- SQL Query Logging (toggle)

**Performance Metrics:**
- Current active connections (read-only)
- Pool utilization (read-only)
- Query performance stats (read-only)

### 7. **Audit & Compliance Tab**

**Audit Logging:**
- Enable Audit Logs (toggle)
- Retention Period (days, 30-730)
- Log Level (dropdown: INFO/WARNING/ERROR)

**Compliance:**
- Data retention policies
- GDPR compliance settings
- Export audit logs (button)

### 8. **Integration Settings Tab**

**MinIO Object Storage:**
- Endpoint (text input)
- Access Key (password input)
- Secret Key (password input)
- Bucket Name (text input)
- Use SSL (toggle)
- Test Connection (button)

**Redis Cache:**
- Redis URL (text input)
- Password (password input)
- Test Connection (button)

**External Services:**
- SMS Gateway configuration
- Email SMTP settings
- Push notification services

---

## Backend API Endpoints Needed

### 1. **GET /api/v1/settings**
Get all current settings (filtered by user role)

**Response:**
```json
{
  "system": {
    "app_name": "CivicLens API",
    "app_version": "1.0.0",
    "environment": "production",
    "city_code": "RNC",
    "debug": false
  },
  "security": {
    "access_token_expire_minutes": 1440,
    "max_login_attempts": 5,
    "password_min_length": 12,
    "two_fa_enabled": true
  },
  ...
}
```

### 2. **PUT /api/v1/settings**
Update settings (requires super_admin role)

**Request:**
```json
{
  "section": "security",
  "settings": {
    "max_login_attempts": 3,
    "account_lockout_duration": 60
  }
}
```

**Response:**
```json
{
  "success": true,
  "updated_settings": {...},
  "requires_restart": false
}
```

### 3. **POST /api/v1/settings/test-connection**
Test external service connections

**Request:**
```json
{
  "service": "minio",
  "config": {
    "endpoint": "localhost:9000",
    "access_key": "...",
    "secret_key": "..."
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Connection successful",
  "details": {
    "latency_ms": 45,
    "buckets": ["civiclens-media"]
  }
}
```

### 4. **GET /api/v1/settings/audit-logs**
Export audit logs

**Query Params:**
- `start_date`: ISO date
- `end_date`: ISO date
- `format`: csv/json/pdf

### 5. **POST /api/v1/settings/reset-defaults**
Reset specific section to defaults

---

## Implementation Steps

### Phase 1: Basic UI (Current - ✅ DONE)
- [x] Create settings page with tab navigation
- [x] Implement tab switching
- [x] Add placeholder content for each tab
- [x] Style with consistent theme

### Phase 2: Backend API
- [ ] Create `/api/v1/settings` router
- [ ] Implement GET endpoint for reading settings
- [ ] Implement PUT endpoint for updating settings
- [ ] Add validation and permission checks
- [ ] Add audit logging for setting changes

### Phase 3: Frontend Integration
- [ ] Create settings API service
- [ ] Implement form state management
- [ ] Add real-time validation
- [ ] Implement save/reset functionality
- [ ] Add loading states and error handling

### Phase 4: Advanced Features
- [ ] Connection testing for external services
- [ ] Settings import/export
- [ ] Change history/audit trail
- [ ] Settings templates
- [ ] Bulk update operations

### Phase 5: Security & Validation
- [ ] Role-based access control
- [ ] Setting change confirmations
- [ ] Dangerous operation warnings
- [ ] Backup before changes
- [ ] Rollback functionality

---

## Security Considerations

1. **Role-Based Access:**
   - Only `super_admin` can modify settings
   - `admin` can view most settings (read-only)
   - `auditor` can view audit logs only

2. **Sensitive Data:**
   - Mask passwords and API keys in UI
   - Never return secret keys in GET requests
   - Encrypt sensitive settings in database

3. **Change Validation:**
   - Validate all inputs server-side
   - Prevent invalid configurations
   - Warn about production-critical changes

4. **Audit Trail:**
   - Log all setting changes
   - Track who changed what and when
   - Allow rollback to previous values

5. **Service Restart:**
   - Some settings require app restart
   - Notify users about restart requirements
   - Provide graceful restart mechanism

---

## UI/UX Best Practices

1. **Visual Feedback:**
   - Show unsaved changes indicator
   - Confirm before discarding changes
   - Success/error toasts for actions

2. **Help & Documentation:**
   - Tooltips for complex settings
   - Links to documentation
   - Example values and formats

3. **Validation:**
   - Real-time input validation
   - Clear error messages
   - Prevent invalid submissions

4. **Performance:**
   - Lazy load tab content
   - Debounce input changes
   - Optimize re-renders

5. **Accessibility:**
   - Keyboard navigation
   - Screen reader support
   - Clear focus indicators

---

## Testing Checklist

- [ ] Unit tests for settings validation
- [ ] Integration tests for API endpoints
- [ ] E2E tests for settings page
- [ ] Permission/role tests
- [ ] Security tests (SQL injection, XSS)
- [ ] Performance tests (large config files)
- [ ] Backup/restore tests
- [ ] Service restart tests

---

## Future Enhancements

1. **Settings Profiles:**
   - Development/Staging/Production presets
   - Quick switch between profiles

2. **Advanced Monitoring:**
   - Real-time system health metrics
   - Performance dashboards
   - Alert configuration

3. **Multi-Tenant Support:**
   - Per-city configuration
   - Hierarchical settings inheritance

4. **API Rate Limit Dashboard:**
   - Visual rate limit monitoring
   - Per-endpoint configuration

5. **Backup & Restore:**
   - Automated backups
   - Point-in-time recovery
   - Configuration versioning

---

## Current Status

✅ **Completed:**
- Basic settings page UI
- Tab navigation
- Consistent theme styling
- Placeholder content

🚧 **In Progress:**
- Backend API implementation
- Form state management

📋 **Planned:**
- Full settings CRUD operations
- External service integration
- Advanced security features

