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
    
    # Redis (optional for caching and rate limiting)
    REDIS_URL: Optional[str] = "redis://localhost:6379/0"
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
    RATE_LIMIT_OTP_MAX_REQUESTS: int = 3  # Max OTP requests
    RATE_LIMIT_OTP_WINDOW_SECONDS: int = 3600  # 1 hour window
    RATE_LIMIT_LOGIN_MAX_REQUESTS: int = 5  # Max login attempts
    RATE_LIMIT_LOGIN_WINDOW_SECONDS: int = 900  # 15 minutes window
    RATE_LIMIT_PASSWORD_RESET_MAX_REQUESTS: int = 3  # Max password reset requests
    RATE_LIMIT_PASSWORD_RESET_WINDOW_SECONDS: int = 3600  # 1 hour window
    RATE_LIMIT_EMAIL_VERIFY_MAX_REQUESTS: int = 3  # Max email verification requests
    RATE_LIMIT_EMAIL_VERIFY_WINDOW_SECONDS: int = 3600  # 1 hour window
    RATE_LIMIT_PHONE_VERIFY_MAX_REQUESTS: int = 3  # Max phone verification requests
    RATE_LIMIT_PHONE_VERIFY_WINDOW_SECONDS: int = 3600  # 1 hour window
    
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
    CORS_ORIGINS: str = "http://localhost:3000"  # Comma-separated list
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS_ORIGINS string into list"""
        if isinstance(self.CORS_ORIGINS, str):
            return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        return self.CORS_ORIGINS
    
    # Pagination
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100
    
    # File Upload
    MAX_UPLOAD_SIZE: int = 10485760  # 10MB
    ALLOWED_IMAGE_TYPES: str = "image/jpeg,image/png,image/webp"  # Comma-separated
    ALLOWED_VIDEO_TYPES: str = "video/mp4,video/webm"  # Comma-separated
    
    @property
    def allowed_image_types_list(self) -> List[str]:
        """Parse ALLOWED_IMAGE_TYPES string into list"""
        if isinstance(self.ALLOWED_IMAGE_TYPES, str):
            return [t.strip() for t in self.ALLOWED_IMAGE_TYPES.split(",") if t.strip()]
        return self.ALLOWED_IMAGE_TYPES
    
    @property
    def allowed_video_types_list(self) -> List[str]:
        """Parse ALLOWED_VIDEO_TYPES string into list"""
        if isinstance(self.ALLOWED_VIDEO_TYPES, str):
            return [t.strip() for t in self.ALLOWED_VIDEO_TYPES.split(",") if t.strip()]
        return self.ALLOWED_VIDEO_TYPES
    
    # Email/SMTP Configuration
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM: Optional[str] = None
    SMTP_USE_TLS: bool = True
    
    # SMS Configuration (for OTP)
    SMS_PROVIDER: Optional[str] = None  # e.g., "twilio", "msg91", "aws_sns"
    SMS_API_KEY: Optional[str] = None
    SMS_API_SECRET: Optional[str] = None
    SMS_SENDER_ID: Optional[str] = None
    
    # Enhanced Security (Priority 1-3)
    # CSRF Protection
    CSRF_SECRET_KEY: Optional[str] = None  # Separate key for CSRF tokens
    CSRF_TOKEN_EXPIRE_HOURS: int = 24
    
    # IP Whitelisting for Admin Access
    ADMIN_IP_WHITELIST_ENABLED: bool = False  # Enable in production
    ADMIN_IP_WHITELIST: str = ""  # Comma-separated IPs
    
    @property
    def admin_ip_whitelist_list(self) -> List[str]:
        """Parse ADMIN_IP_WHITELIST string into list"""
        if isinstance(self.ADMIN_IP_WHITELIST, str) and self.ADMIN_IP_WHITELIST:
            return [ip.strip() for ip in self.ADMIN_IP_WHITELIST.split(",") if ip.strip()]
        return []
    
    # 2FA Settings
    TWO_FA_ENABLED: bool = True  # Enable 2FA for super admins
    TWO_FA_ISSUER: str = "CivicLens"  # Shown in authenticator app
    TWO_FA_REQUIRED_FOR_ROLES: str = "super_admin"  # Comma-separated roles
    
    @property
    def two_fa_required_roles_list(self) -> List[str]:
        """Parse TWO_FA_REQUIRED_FOR_ROLES string into list"""
        if isinstance(self.TWO_FA_REQUIRED_FOR_ROLES, str) and self.TWO_FA_REQUIRED_FOR_ROLES:
            return [role.strip() for role in self.TWO_FA_REQUIRED_FOR_ROLES.split(",") if role.strip()]
        return []
    
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
