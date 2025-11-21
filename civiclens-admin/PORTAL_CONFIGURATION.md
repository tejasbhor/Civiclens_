# Portal Configuration Documentation

## Overview

The CivicLens Admin Dashboard is configured for the **Officer Portal**, which serves government officials including nodal officers, auditors, admins, and super admins.

## Portal Architecture

CivicLens has two distinct portals:

### 1. Citizen Portal
- **Portal Type:** `citizen`
- **Allowed Roles:**
  - `citizen` - General public users
  - `contributor` - Active community members
  - `moderator` - Community moderators

### 2. Officer Portal (This Application)
- **Portal Type:** `officer`
- **Allowed Roles (Admin Dashboard):**
  - `admin` - Full operational access
  - `super_admin` - System owner with ultimate authority
  
**Note:** While nodal officers and auditors use the officer portal type for authentication, only admins and super admins can access this admin dashboard.

## Configuration Files

### Main Configuration
**File:** `src/lib/config/constants.ts`

This file contains all production-ready constants:

```typescript
// Portal configuration
export const PORTAL_CONFIG = {
  PORTAL_TYPE: 'officer',
  ALLOWED_ROLES: ['nodal_officer', 'auditor', 'admin', 'super_admin'],
} as const;

// API configuration
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
  TIMEOUT: 30000,
  RETRY: {
    MAX_ATTEMPTS: 3,
    DELAY_MS: 1000,
  },
} as const;

// Authentication configuration
export const AUTH_CONFIG = {
  STORAGE_KEYS: {
    ACCESS_TOKEN: 'auth_token',
    REFRESH_TOKEN: 'refresh_token',
    USER_ROLE: 'user_role',
    USER_ID: 'user_id',
  },
  REFRESH_BUFFER_SECONDS: 300,
} as const;
```

## Authentication Flow

### 1. Login Request
The admin dashboard sends:
```json
{
  "phone": "+919876543210",
  "password": "Admin123!",
  "portal_type": "officer"
}
```

### 2. Role Validation
After successful authentication, the system validates:
1. User role is in `PORTAL_CONFIG.ALLOWED_ROLES`
2. If not, throws error: "Access denied. Role 'X' is not authorized for the officer portal."

### 3. Token Storage
Tokens are stored using `AUTH_CONFIG.STORAGE_KEYS`:
- `auth_token` - Access token
- `refresh_token` - Refresh token
- `user_role` - User's role
- `user_id` - User's ID

## Environment Variables

### Required
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### Optional
- All configurations have sensible defaults
- See `src/lib/config/constants.ts` for full list

## Security Features

### 1. Portal Type Enforcement
- Hardcoded portal type prevents accidental misconfiguration
- Backend validates portal access on every request

### 2. Role-Based Access Control
- Client-side validation prevents unauthorized access attempts
- Server-side enforcement for all operations

### 3. Token Management
- Automatic token refresh
- Secure storage using configurable keys
- Session timeout handling

## Testing Credentials

### Super Admin (Admin Dashboard Access)
```
Phone: +919999999999
Password: Admin123!
Role: super_admin
Access: ✅ Full admin dashboard access
```

### Nodal Officer (No Dashboard Access)
```
Phone: +919876543210  
Password: Officer@123
Role: nodal_officer
Access: ❌ Cannot access admin dashboard (use officer mobile app instead)
```

## Deployment Checklist

- [ ] Set `NEXT_PUBLIC_API_URL` environment variable
- [ ] Verify `PORTAL_CONFIG.PORTAL_TYPE` is `'officer'`
- [ ] Verify `PORTAL_CONFIG.ALLOWED_ROLES` includes all officer roles
- [ ] Test login with all allowed roles
- [ ] Test login rejection for citizen roles
- [ ] Verify token refresh works
- [ ] Test session timeout and redirect

## Troubleshooting

### Login fails with "portal_type" error
- **Cause:** Portal type mismatch
- **Solution:** Verify `PORTAL_CONFIG.PORTAL_TYPE` is set to `'officer'`

### Login fails with "Access denied" error
- **Cause:** User role not in allowed roles
- **Solution:**
  1. Check user role in database
  2. Verify role is in `PORTAL_CONFIG.ALLOWED_ROLES`
  3. Ensure officer/admin users exist (run seeding script)

### API connection errors
- **Cause:** Wrong API URL
- **Solution:** Check `NEXT_PUBLIC_API_URL` environment variable

## Maintenance

### Adding New Roles
1. Add role to `PORTAL_CONFIG.ALLOWED_ROLES`
2. Update backend `OFFICER_PORTAL_ROLES` in `app/api/v1/auth.py`
3. Test authentication flow
4. Update this documentation

### Changing Storage Keys
1. Update `AUTH_CONFIG.STORAGE_KEYS`
2. Clear existing localStorage on client browsers
3. Users will need to re-authenticate

## References

- Backend Auth Schema: `civiclens-backend/app/schemas/auth.py`
- Backend Auth API: `civiclens-backend/app/api/v1/auth.py`
- User Roles Model: `civiclens-backend/app/models/user.py`
