from pydantic import BaseModel, Field, EmailStr, validator
from typing import Optional
from enum import Enum
from app.models.user import UserRole


class PortalType(str, Enum):
    """Portal types for role-based access control"""
    CITIZEN = "citizen"  # For citizens, contributors, moderators
    OFFICER = "officer"  # For nodal officers, auditors, admins


class OTPRequest(BaseModel):
    phone: str = Field(..., pattern=r'^\+?[1-9]\d{1,14}$')


class CitizenSignupRequest(BaseModel):
    """Full citizen registration with password"""
    phone: str = Field(..., pattern=r'^\+?[1-9]\d{1,14}$')
    full_name: str = Field(..., min_length=2, max_length=255)
    email: Optional[EmailStr] = None
    password: str = Field(..., min_length=8)
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v


class PhoneVerifyRequest(BaseModel):
    """Verify phone number after signup"""
    phone: str = Field(..., pattern=r'^\+?[1-9]\d{1,14}$')
    otp: str = Field(..., min_length=6, max_length=6)


class OTPVerify(BaseModel):
    phone: str
    otp: str = Field(..., min_length=6, max_length=6)


class LoginRequest(BaseModel):
    phone: str
    password: str = Field(..., min_length=8)
    portal_type: PortalType = Field(..., description="Portal type: 'citizen' or 'officer'")


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    role: UserRole
    refresh_token: Optional[str] = None


class TokenPayload(BaseModel):
    user_id: int
    role: UserRole


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class PasswordResetRequest(BaseModel):
    phone: str = Field(..., pattern=r'^\+?[1-9]\d{1,14}$')


class PasswordResetVerify(BaseModel):
    phone: str
    reset_token: str
    new_password: str = Field(..., min_length=8)


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=8)
