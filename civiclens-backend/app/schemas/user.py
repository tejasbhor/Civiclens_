from pydantic import BaseModel, EmailStr, Field, ConfigDict, validator
from typing import Optional
from datetime import datetime
from app.models.user import UserRole, ProfileCompletionLevel


# ============ OTP-Based (Minimal) ============
class UserMinimalCreate(BaseModel):
    """Minimal user creation - just phone via OTP"""
    phone: str = Field(..., pattern=r'^\+?[1-9]\d{9,14}$')


class UserCreate(BaseModel):
    """Full user creation schema"""
    phone: str = Field(..., pattern=r'^\+?[1-9]\d{9,14}$')
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = Field(None, min_length=8)
    role: UserRole = UserRole.CITIZEN


class UserUpdate(BaseModel):
    """User update schema"""
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None


# ============ Profile Completion ============
class UserProfileUpdate(BaseModel):
    """User can progressively complete their profile"""
    full_name: Optional[str] = Field(None, min_length=2, max_length=255)
    email: Optional[EmailStr] = None
    primary_address: Optional[str] = None
    primary_latitude: Optional[float] = Field(None, ge=-90, le=90)
    primary_longitude: Optional[float] = Field(None, ge=-180, le=180)
    bio: Optional[str] = Field(None, max_length=500)
    preferred_language: Optional[str] = Field(None, pattern=r'^(en|hi|bn|te|mr|ta|ur)$')

    # Notification preferences
    push_notifications: Optional[bool] = None
    sms_notifications: Optional[bool] = None
    email_notifications: Optional[bool] = None


# ============ Officer/Admin Creation (with password) ============
class OfficerCreate(BaseModel):
    """Create officer/admin with credentials"""
    phone: str = Field(..., pattern=r'^\+?[1-9]\d{9,14}$')
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=255)
    password: str = Field(..., min_length=8)
    role: UserRole
    employee_id: Optional[str] = None
    department_id: Optional[int] = None

    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain uppercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain digit')
        return v

    @validator('role')
    def validate_role(cls, v):
        if v not in [UserRole.NODAL_OFFICER, UserRole.ADMIN, UserRole.AUDITOR, UserRole.SUPER_ADMIN]:
            raise ValueError('Can only create officer, admin, auditor, or super admin accounts')
        return v


# ============ Role Management ============
class RoleChangeRequest(BaseModel):
    """Admin request to change user role"""
    user_id: int
    new_role: UserRole
    reason: Optional[str] = None


class AreaAssignmentCreate(BaseModel):
    """Assign moderator to an area"""
    user_id: int
    area_type: str = Field(..., pattern=r'^(district|ward|circle|radius|polygon)$')
    area_name: str
    area_data: dict
    notes: Optional[str] = None


# ============ Response Schemas ============
class UserResponse(BaseModel):
    id: int
    phone: str
    email: Optional[str]
    full_name: Optional[str]
    role: UserRole
    profile_completion: ProfileCompletionLevel
    reputation_score: int
    is_active: bool
    phone_verified: bool
    email_verified: bool
    created_at: datetime
    last_login: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class UserDetailedResponse(UserResponse):
    """Extended user info for profile view"""
    total_reports: int
    total_validations: int
    helpful_validations: int
    primary_address: Optional[str]
    bio: Optional[str]
    preferred_language: Optional[str]
    department_id: Optional[int]
    employee_id: Optional[str]
    aadhaar_linked: bool
    digilocker_linked: bool


class UserStatsResponse(BaseModel):
    """User statistics and achievements"""
    reputation_score: int
    total_reports: int
    in_progress_reports: int
    resolved_reports: int
    active_reports: int  # Alias for in_progress_reports
    total_validations: int
    helpful_validations: int
    tasks_resolved: int  # For officers
    can_promote_to_contributor: bool
    next_milestone: Optional[str]
