"""
Enhanced Security Module
Implements Priority 1-3 security features:
- Password complexity validation
- CSRF token generation/validation
- Session fingerprinting
- IP whitelisting
- 2FA (TOTP)
"""

import re
import secrets
import hashlib
import pyotp
import qrcode
import io
import base64
from typing import Optional, Tuple
from fastapi import Request
from datetime import datetime, timedelta
from app.config import settings
from app.core.exceptions import ValidationException, UnauthorizedException


# ============================================================================
# PASSWORD COMPLEXITY VALIDATION (Priority 2)
# ============================================================================

COMMON_PASSWORDS = {
    "password123", "admin123", "12345678", "qwerty123", "password1",
    "welcome123", "admin@123", "password@123", "test1234", "user1234"
}

def validate_password_strength(password: str) -> Tuple[bool, str]:
    """
    Validate password meets complexity requirements
    
    Returns:
        (is_valid, error_message)
    """
    if len(password) < settings.PASSWORD_MIN_LENGTH:
        return False, f"Password must be at least {settings.PASSWORD_MIN_LENGTH} characters"
    
    if settings.PASSWORD_REQUIRE_UPPERCASE and not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"
    
    if settings.PASSWORD_REQUIRE_LOWERCASE and not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"
    
    if settings.PASSWORD_REQUIRE_DIGIT and not re.search(r"[0-9]", password):
        return False, "Password must contain at least one digit"
    
    if settings.PASSWORD_REQUIRE_SPECIAL and not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?]", password):
        return False, "Password must contain at least one special character (!@#$%^&*...)"
    
    # Check against common passwords
    if password.lower() in COMMON_PASSWORDS:
        return False, "Password is too common. Please choose a stronger password"
    
    # Check for sequential characters
    if re.search(r"(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def)", password.lower()):
        return False, "Password contains sequential characters"
    
    return True, "Valid"


# ============================================================================
# CSRF PROTECTION (Priority 1)
# ============================================================================

def generate_csrf_token() -> str:
    """Generate a cryptographically secure CSRF token"""
    return secrets.token_urlsafe(32)


def validate_csrf_token(token: str, expected_token: str) -> bool:
    """Validate CSRF token using constant-time comparison"""
    if not token or not expected_token:
        return False
    return secrets.compare_digest(token, expected_token)


# ============================================================================
# SESSION FINGERPRINTING (Priority 2)
# ============================================================================

def create_session_fingerprint(request: Request) -> str:
    """
    Create a unique fingerprint for the session based on:
    - IP address
    - User agent
    - Accept-Language header
    
    This helps detect session hijacking
    """
    if not settings.SESSION_FINGERPRINT_ENABLED:
        return ""
    
    components = [
        request.client.host if request.client else "unknown",
        request.headers.get("user-agent", ""),
        request.headers.get("accept-language", ""),
    ]
    
    fingerprint_string = "|".join(components)
    return hashlib.sha256(fingerprint_string.encode()).hexdigest()


def validate_session_fingerprint(request: Request, stored_fingerprint: str) -> bool:
    """Validate session fingerprint matches current request"""
    if not settings.SESSION_FINGERPRINT_ENABLED:
        return True
    
    current_fingerprint = create_session_fingerprint(request)
    return secrets.compare_digest(current_fingerprint, stored_fingerprint)


# ============================================================================
# IP WHITELISTING (Priority 1)
# ============================================================================

def is_ip_whitelisted(ip_address: str, user_role: str) -> bool:
    """
    Check if IP is whitelisted for admin access
    Only enforced for admin/super_admin roles
    """
    if not settings.ADMIN_IP_WHITELIST_ENABLED:
        return True
    
    # Only enforce for admin roles
    admin_roles = ["admin", "super_admin"]
    if user_role not in admin_roles:
        return True
    
    # Check whitelist
    if not settings.ADMIN_IP_WHITELIST:
        # If whitelist is empty but enabled, deny all
        return False
    
    return ip_address in settings.ADMIN_IP_WHITELIST


# ============================================================================
# TWO-FACTOR AUTHENTICATION (Priority 1)
# ============================================================================

def generate_totp_secret() -> str:
    """Generate a new TOTP secret for 2FA"""
    return pyotp.random_base32()


def generate_totp_qr_code(secret: str, user_email: str) -> str:
    """
    Generate QR code for TOTP setup
    Returns base64-encoded PNG image
    """
    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(
        name=user_email,
        issuer_name=settings.TWO_FA_ISSUER
    )
    
    # Generate QR code
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(provisioning_uri)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    img_str = base64.b64encode(buffer.getvalue()).decode()
    
    return f"data:image/png;base64,{img_str}"


def verify_totp_code(secret: str, code: str) -> bool:
    """Verify TOTP code"""
    if not secret or not code:
        return False
    
    totp = pyotp.TOTP(secret)
    # Allow 1 time step before/after for clock skew
    return totp.verify(code, valid_window=1)


def is_2fa_required(user_role: str) -> bool:
    """Check if 2FA is required for this role"""
    if not settings.TWO_FA_ENABLED:
        return False
    
    return user_role in settings.TWO_FA_REQUIRED_FOR_ROLES


# ============================================================================
# SECURITY UTILITIES
# ============================================================================

def get_client_ip(request: Request) -> str:
    """Get client IP address, considering proxies"""
    # Check X-Forwarded-For header (if behind proxy)
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        # Take the first IP in the chain
        return forwarded.split(",")[0].strip()
    
    # Check X-Real-IP header
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip
    
    # Fall back to direct connection
    return request.client.host if request.client else "unknown"


def sanitize_user_agent(user_agent: str) -> str:
    """Sanitize and truncate user agent string"""
    if not user_agent:
        return "Unknown"
    
    # Truncate to reasonable length
    return user_agent[:500]
