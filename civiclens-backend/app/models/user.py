from sqlalchemy import Column, String, Integer, Enum as SQLEnum, Boolean, Float, Text, ForeignKey, JSON, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from geoalchemy2 import Geography
from app.models.base import BaseModel
from datetime import datetime
import enum


class UserRole(str, enum.Enum):
    CITIZEN = "citizen"                # Level 1: Default, anyone who signs up
    CONTRIBUTOR = "contributor"        # Level 2: Auto-promoted based on reputation
    MODERATOR = "moderator"           # Level 3: Admin-assigned, area-specific
    NODAL_OFFICER = "nodal_officer"   # Level 4: Government field worker
    AUDITOR = "auditor"               # Level 5: Read-only government access
    ADMIN = "admin"                   # Level 6: Full operational access
    SUPER_ADMIN = "super_admin"       # Level 7: System owner, ultimate authority


class ProfileCompletionLevel(str, enum.Enum):
    MINIMAL = "minimal"      # Just phone + OTP (can report)
    BASIC = "basic"          # + Name (better experience)
    COMPLETE = "complete"    # + Email, address (full features)
    
    @classmethod
    def _missing_(cls, value):
        """Handle case-insensitive enum lookup"""
        if isinstance(value, str):
            value = value.lower()
            for member in cls:
                if member.value == value:
                    return member
        return None


class User(BaseModel):
    __tablename__ = "users"

    # ============ Core Authentication ============
    phone = Column(String(20), unique=True, index=True, nullable=False)
    phone_verified = Column(Boolean, default=False, nullable=False)

    # Optional Profile (Progressive)
    email = Column(String(255), unique=True, index=True, nullable=True)
    email_verified = Column(Boolean, default=False, nullable=False)
    full_name = Column(String(255), nullable=True)

    # Password (Only for Officers/Admins/Auditors)
    hashed_password = Column(String(255), nullable=True)

    # Profile Completion
    profile_completion = Column(
        SQLEnum(ProfileCompletionLevel, native_enum=True, values_callable=lambda x: [e.value for e in x]),
        default=ProfileCompletionLevel.MINIMAL,
        nullable=False
    )

    # ============ Role & Status ============
    role = Column(SQLEnum(UserRole, native_enum=True, values_callable=lambda x: [e.value for e in x]), default=UserRole.CITIZEN, nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)

    # Reputation System (for auto-promotion)
    reputation_score = Column(Integer, default=0, nullable=False, index=True)
    total_reports = Column(Integer, default=0, nullable=False)
    total_validations = Column(Integer, default=0, nullable=False)
    helpful_validations = Column(Integer, default=0, nullable=False)  # Validations that helped

    # ============ Area-Based Moderation ============
    # Moderators are assigned to specific areas
    moderation_areas = Column(JSONB, nullable=True)  # List of area polygons or district names
    # Example: {"districts": ["Ranchi", "Jamshedpur"], "radius_km": 5}

    # Location (for area-based features)
    primary_latitude = Column(Float, nullable=True)
    primary_longitude = Column(Float, nullable=True)
    primary_address = Column(Text, nullable=True)

    # ============ Officer/Admin Specific ============
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    employee_id = Column(String(50), unique=True, nullable=True)  # Government employee ID

    # Current location (for officers in field)
    current_latitude = Column(Float, nullable=True)
    current_longitude = Column(Float, nullable=True)
    last_location_update = Column(DateTime(timezone=True), nullable=True)

    # ============ Profile & Preferences ============
    avatar_url = Column(String(500), nullable=True)
    bio = Column(Text, nullable=True)
    preferred_language = Column(String(10), default="en")  # en, hi, etc.

    # Notification Settings
    push_notifications = Column(Boolean, default=True)
    sms_notifications = Column(Boolean, default=True)
    email_notifications = Column(Boolean, default=False)

    # ============ Government Integration (Future) ============
    aadhaar_linked = Column(Boolean, default=False)
    aadhaar_hash = Column(String(255), nullable=True)  # Hashed, never store plain
    digilocker_linked = Column(Boolean, default=False)

    # ============ Two-Factor Authentication (2FA) ============
    totp_secret = Column(String(32), nullable=True)  # TOTP secret for 2FA
    two_fa_enabled = Column(Boolean, default=False)  # Whether 2FA is enabled
    two_fa_enabled_at = Column(DateTime(timezone=True), nullable=True)  # When 2FA was enabled

    # ============ Metadata ============
    last_login = Column(DateTime(timezone=True), nullable=True)
    login_count = Column(Integer, default=0)
    account_created_via = Column(String(50), default="otp")  # otp, password, government_sso

    # ============ Relationships ============
    reports = relationship(
        "Report",
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="Report.user_id",
    )
    assigned_tasks = relationship(
        "Task",
        foreign_keys="Task.assigned_to",
        back_populates="officer"
    )
    department = relationship("Department", back_populates="officers")
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    sync_states = relationship("ClientSyncState", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, phone={self.phone}, role={self.role})>"

    # ============ Permission Helpers ============
    def can_report(self) -> bool:
        """Anyone can report (even minimal profile)"""
        return self.is_active

    def can_validate(self) -> bool:
        """Contributors and above can validate"""
        return self.role in [UserRole.CONTRIBUTOR, UserRole.MODERATOR, UserRole.ADMIN]

    def can_moderate(self) -> bool:
        """Moderators and admins can moderate"""
        return self.role in [UserRole.MODERATOR, UserRole.ADMIN]

    def can_manage_tasks(self) -> bool:
        """Officers and admins can manage tasks"""
        return self.role in [UserRole.NODAL_OFFICER, UserRole.ADMIN]

    def can_access_admin_portal(self) -> bool:
        """Officers, admins, auditors, and super admins can access portal"""
        return self.role in [UserRole.NODAL_OFFICER, UserRole.ADMIN, UserRole.AUDITOR, UserRole.SUPER_ADMIN]

    def has_write_access(self) -> bool:
        """Everyone except auditors has write access"""
        return self.role != UserRole.AUDITOR

    def is_profile_complete(self) -> bool:
        """Check if profile is fully completed"""
        return (
            self.full_name is not None and
            self.email is not None and
            self.primary_address is not None
        )

    def update_profile_completion(self):
        """Auto-update profile completion level"""
        if self.is_profile_complete():
            self.profile_completion = ProfileCompletionLevel.COMPLETE
        elif self.full_name:
            self.profile_completion = ProfileCompletionLevel.BASIC
        else:
            self.profile_completion = ProfileCompletionLevel.MINIMAL

    def should_promote_to_contributor(self) -> bool:
        """Check if user qualifies for auto-promotion to contributor"""
        return (
            self.role == UserRole.CITIZEN and
            self.reputation_score >= 100 and
            self.total_reports >= 5 and
            self.total_validations >= 10 and
            self.profile_completion == ProfileCompletionLevel.COMPLETE
        )
