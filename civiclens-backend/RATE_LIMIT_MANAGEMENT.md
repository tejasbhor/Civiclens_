# Rate Limit Management

## Overview

This project uses Redis-based rate limiting with sliding windows to prevent abuse of various endpoints. Rate limits are applied to:

- **OTP Requests**: 3 requests per hour
- **Login Attempts**: 5 requests per 15 minutes
- **Password Reset**: 3 requests per hour
- **Email Verification**: 3 requests per hour
- **Phone Verification**: 3 requests per hour

## Quick Start

### Option 1: PowerShell Script (Recommended for Windows)

```powershell
# Interactive menu
.\Reset-RateLimits.ps1 -Interactive

# Check rate limits
.\Reset-RateLimits.ps1 -Check

# Reset all rate limits
.\Reset-RateLimits.ps1 -ResetAll

# Reset specific phone
.\Reset-RateLimits.ps1 -Phone "+919876543210"

# Reset specific type for a phone
.\Reset-RateLimits.ps1 -Phone "+919876543210" -Type "otp"

# Run functionality tests
.\Reset-RateLimits.ps1 -Test
```

### Option 2: Batch Script

```cmd
# Run interactive menu
reset_rate_limits.bat
```

### Option 3: Direct Python Script

```bash
# Activate virtual environment first
.venv\Scripts\activate

# Check current status
python scripts/reset_rate_limits.py --check

# Check specific phone
python scripts/reset_rate_limits.py --check --phone +919876543210

# Reset all rate limits
python scripts/reset_rate_limits.py --all

# Reset specific phone (all types)
python scripts/reset_rate_limits.py --phone +919876543210

# Reset specific type for a phone
python scripts/reset_rate_limits.py --phone +919876543210 --type otp

# Run functionality tests
python scripts/reset_rate_limits.py --test
```

## Rate Limit Types

| Type | Key Pattern | Max Requests | Window |
|------|-------------|--------------|--------|
| OTP | `rate_limit:otp:{phone}` | 3 | 1 hour |
| Login | `rate_limit:login:{phone}` | 5 | 15 min |
| Password Reset | `rate_limit:password_reset:{phone}` | 3 | 1 hour |
| Email Verify | `rate_limit:email_verify:{phone}` | 3 | 1 hour |
| Phone Verify | `rate_limit:phone_verify:{phone}` | 3 | 1 hour |

## Common Scenarios

### 1. User Can't Receive OTP (Rate Limited)

```powershell
# Check what's blocking them
.\Reset-RateLimits.ps1 -Check -Phone "+919876543210"

# Reset their OTP rate limit
.\Reset-RateLimits.ps1 -Phone "+919876543210" -Type "otp"
```

### 2. Testing OTP Functionality

```powershell
# Reset and test
.\Reset-RateLimits.ps1 -Phone "+919999999999"
.\Reset-RateLimits.ps1 -Test
```

### 3. Clear All Rate Limits (Development)

```powershell
# WARNING: This affects all users!
.\Reset-RateLimits.ps1 -ResetAll
```

### 4. Monitor Active Rate Limits

```powershell
# See all active rate limits
.\Reset-RateLimits.ps1 -Check
```

## Configuration

Rate limiting can be configured in `.env` file:

```env
# Enable/Disable rate limiting
RATE_LIMIT_ENABLED=true

# OTP Rate Limiting
RATE_LIMIT_OTP_MAX_REQUESTS=3
RATE_LIMIT_OTP_WINDOW_SECONDS=3600

# Login Rate Limiting
RATE_LIMIT_LOGIN_MAX_REQUESTS=5
RATE_LIMIT_LOGIN_WINDOW_SECONDS=900

# Password Reset Rate Limiting
RATE_LIMIT_PASSWORD_RESET_MAX_REQUESTS=3
RATE_LIMIT_PASSWORD_RESET_WINDOW_SECONDS=3600
```

## How It Works

1. **Sliding Window**: Uses Redis sorted sets with timestamps
2. **Auto-Expiry**: Keys automatically expire after the window period
3. **Granular Control**: Can reset by phone number or specific action type
4. **Production Safe**: Requires confirmation for destructive operations

## Troubleshooting

### Rate Limit Not Working

```powershell
# Run functionality tests
.\Reset-RateLimits.ps1 -Test
```

Expected output:
```
✅ ALL TESTS PASSED - Rate limiting is working correctly!
```

### Redis Connection Issues

1. Ensure Redis is running:
   ```bash
   redis-cli ping
   # Should return: PONG
   ```

2. Check Redis connection in `.env`:
   ```env
   REDIS_URL=redis://localhost:6379
   ```

### Can't Delete Rate Limits

- Ensure you have Redis write permissions
- Check if Redis is running: `redis-cli info`
- Verify the phone number format (include country code: `+91...`)

## API Integration

To manually reset rate limits from code:

```python
from app.core.rate_limiter import rate_limiter

# Reset specific limit
await rate_limiter.reset_rate_limit("otp:+919876543210")
await rate_limiter.reset_rate_limit("login:+919876543210")
```

## Security Notes

⚠️ **Important**:
- Only administrators should have access to reset rate limits
- Resetting rate limits bypasses security measures
- Use `--all` with extreme caution in production
- Always check before resetting to understand impact

## Testing Checklist

Before deploying rate limit changes:

- [ ] Run `.\Reset-RateLimits.ps1 -Test` - all tests pass
- [ ] Verify limits are being enforced (try exceeding limit)
- [ ] Confirm reset functionality works
- [ ] Check Redis key TTL is set correctly
- [ ] Test with real phone numbers (if possible)

## Support

If rate limiting isn't working as expected:

1. Run the test suite: `.\Reset-RateLimits.ps1 -Test`
2. Check current status: `.\Reset-RateLimits.ps1 -Check`
3. Verify Redis is running and accessible
4. Check application logs for rate limit errors
5. Confirm `.env` configuration is correct
