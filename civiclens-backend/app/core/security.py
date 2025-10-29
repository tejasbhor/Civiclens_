from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from app.config import settings
import secrets
import string
import bcrypt


# ============================================================================
# PASSWORD HASHING - Using bcrypt directly (production-ready)
# ============================================================================

def get_password_hash(password: str) -> str:
    """Hash password using bcrypt directly (production-safe)"""
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password using bcrypt directly (production-safe)"""
    password_bytes = plain_password.encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_bytes, hashed_bytes)


# Aliases for compatibility
get_password_hash_direct = get_password_hash
verify_password_direct = verify_password


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    
    return encoded_jwt


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and verify a JWT token"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None


def generate_otp(length: int = 6) -> str:
    """Generate a cryptographically secure random OTP"""
    return ''.join(secrets.choice(string.digits) for _ in range(length))


def generate_verification_token() -> str:
    """Generate a cryptographically secure random verification token"""
    return ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))


def create_refresh_token(data: Dict[str, Any]) -> str:
    """Create a JWT refresh token with longer expiry"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "refresh"
    })
    
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_refresh_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and verify a refresh token"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        
        # Verify it's a refresh token
        if payload.get("type") != "refresh":
            return None
        
        return payload
    except JWTError:
        return None


def generate_password_reset_token() -> str:
    """Generate a secure password reset token"""
    return secrets.token_urlsafe(32)


def generate_jti() -> str:
    """Generate a unique JWT ID for session tracking"""
    return secrets.token_urlsafe(16)
