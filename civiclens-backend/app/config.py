from pydantic_settings import BaseSettings
from typing import List, Optional
from functools import lru_cache


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "CivicLens API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "production"
    CITY_CODE: str = "RNC"
    APP_BASE_URL: Optional[str] = None
    
    # Database
    DATABASE_URL: str
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 10
    DATABASE_ECHO: bool = False
    
    # Redis
    REDIS_URL: str
    REDIS_PASSWORD: Optional[str] = None
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    # MinIO Storage
    MINIO_ENDPOINT: Optional[str] = None
    MINIO_ACCESS_KEY: Optional[str] = None
    MINIO_SECRET_KEY: Optional[str] = None
    MINIO_BUCKET: str = "civiclens-media"
    MINIO_USE_SSL: bool = False
    
    # Local Media Storage (fallback)
    MEDIA_ROOT: str = "./media"
    
    # OTP
    OTP_EXPIRY_MINUTES: int = 5
    OTP_MAX_ATTEMPTS: int = 3  # Max OTP requests per hour
    
    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_OTP: str = "3/hour"  # 3 OTP requests per hour per phone
    RATE_LIMIT_LOGIN: str = "5/15minutes"  # 5 login attempts per 15 min
    RATE_LIMIT_PASSWORD_RESET: str = "3/hour"  # 3 password reset per hour
    
    # Account Security
    MAX_LOGIN_ATTEMPTS: int = 5  # Max failed login attempts before lockout
    ACCOUNT_LOCKOUT_DURATION_MINUTES: int = 30  # Lockout duration
    PASSWORD_RESET_TOKEN_EXPIRY_MINUTES: int = 15  # Password reset token expiry
    
    # Token Management
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours for citizens
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30  # 30 days
    ADMIN_TOKEN_EXPIRE_HOURS: int = 8  # Shorter for admins
    
    # Session Management
    MAX_CONCURRENT_SESSIONS: int = 3  # Max active sessions per user
    SESSION_INACTIVITY_TIMEOUT_MINUTES: int = 60  # Auto-logout after inactivity
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    
    # Pagination
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100
    
    # File Upload
    MAX_UPLOAD_SIZE: int = 10485760  # 10MB
    ALLOWED_IMAGE_TYPES: List[str] = ["image/jpeg", "image/png", "image/webp"]
    ALLOWED_VIDEO_TYPES: List[str] = ["video/mp4", "video/webm"]
    
    # Enhanced Security (Priority 1-3)
    # CSRF Protection
    CSRF_SECRET_KEY: Optional[str] = None  # Separate key for CSRF tokens
    CSRF_TOKEN_EXPIRE_HOURS: int = 24
    
    # IP Whitelisting for Admin Access
    ADMIN_IP_WHITELIST_ENABLED: bool = False  # Enable in production
    ADMIN_IP_WHITELIST: List[str] = []  # Add government office IPs
    
    # 2FA Settings
    TWO_FA_ENABLED: bool = True  # Enable 2FA for super admins
    TWO_FA_ISSUER: str = "CivicLens"  # Shown in authenticator app
    TWO_FA_REQUIRED_FOR_ROLES: List[str] = ["super_admin"]  # Roles requiring 2FA
    
    # Password Complexity
    PASSWORD_MIN_LENGTH: int = 12
    PASSWORD_REQUIRE_UPPERCASE: bool = True
    PASSWORD_REQUIRE_LOWERCASE: bool = True
    PASSWORD_REQUIRE_DIGIT: bool = True
    PASSWORD_REQUIRE_SPECIAL: bool = True
    
    # Session Fingerprinting
    SESSION_FINGERPRINT_ENABLED: bool = True
    
    # Audit Logging
    AUDIT_LOG_ENABLED: bool = True
    AUDIT_LOG_RETENTION_DAYS: int = 365  # 1 year retention
    
    # HTTPS Enforcement
    HTTPS_ONLY: bool = False  # Set True in production
    SECURE_COOKIES: bool = False  # Set True in production (requires HTTPS)
    
    # Security Headers
    SECURITY_HEADERS_ENABLED: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
