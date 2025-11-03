"""
Audit Log Model (Priority 2)
Tracks all security-relevant events for compliance and monitoring
"""

from sqlalchemy import Column, String, Integer, Text, ForeignKey, DateTime, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB
from app.models.base import BaseModel
from datetime import datetime
import enum


class AuditAction(str, enum.Enum):
    """Types of actions to audit"""
    # Authentication
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILURE = "login_failure"
    LOGOUT = "logout"
    LOGOUT_ALL = "logout_all"
    TOKEN_REFRESH = "token_refresh"
    
    # Password Management
    PASSWORD_CHANGE = "password_change"
    PASSWORD_RESET_REQUEST = "password_reset_request"
    PASSWORD_RESET_COMPLETE = "password_reset_complete"
    
    # 2FA
    TWO_FA_ENABLED = "2fa_enabled"
    TWO_FA_DISABLED = "2fa_disabled"
    TWO_FA_SUCCESS = "2fa_success"
    TWO_FA_FAILURE = "2fa_failure"
    
    # User Management
    USER_CREATED = "user_created"
    USER_UPDATED = "user_updated"
    USER_DELETED = "user_deleted"
    USER_ROLE_CHANGED = "user_role_changed"
    
    # Session Management
    SESSION_CREATED = "session_created"
    SESSION_REVOKED = "session_revoked"
    SESSION_EXPIRED = "session_expired"
    
    # Security Events
    ACCOUNT_LOCKED = "account_locked"
    ACCOUNT_UNLOCKED = "account_unlocked"
    IP_BLOCKED = "ip_blocked"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    
    # Data Access
    SENSITIVE_DATA_ACCESS = "sensitive_data_access"
    BULK_DATA_EXPORT = "bulk_data_export"
    
    # Report Actions
    REPORT_CREATED = "report_created"
    REPORT_UPDATED = "report_updated"
    REPORT_ASSIGNED = "report_assigned"
    REPORT_STATUS_CHANGED = "report_status_changed"
    REPORT_CLASSIFIED = "report_classified"
    REPORT_RESOLVED = "report_resolved"
    REPORT_EXPORTED = "report_exported"
    
    # Media Actions
    MEDIA_UPLOADED = "media_uploaded"
    MEDIA_DELETED = "media_deleted"
    MEDIA_ACCESSED = "media_accessed"
    
    # Appeals
    APPEAL_CREATED = "appeal_created"
    APPEAL_REVIEWED = "appeal_reviewed"
    APPEAL_APPROVED = "appeal_approved"
    APPEAL_REJECTED = "appeal_rejected"
    APPEAL_WITHDRAWN = "appeal_withdrawn"
    
    # Escalations
    ESCALATION_CREATED = "escalation_created"
    ESCALATION_ACKNOWLEDGED = "escalation_acknowledged"
    ESCALATION_UPDATED = "escalation_updated"
    ESCALATION_RESOLVED = "escalation_resolved"
    ESCALATION_DE_ESCALATED = "escalation_de_escalated"
    
    # Task Actions
    TASK_VIEWED = "task_viewed"
    TASKS_VIEWED = "tasks_viewed"
    TASK_UPDATED = "task_updated"
    TASK_REASSIGNED = "task_reassigned"
    TASKS_BULK_UPDATED = "tasks_bulk_updated"
    TASK_STATS_VIEWED = "task_stats_viewed"
    
    # System
    SYSTEM_CONFIG_CHANGE = "system_config_change"


class AuditStatus(str, enum.Enum):
    """Status of the audited action"""
    SUCCESS = "success"
    FAILURE = "failure"
    WARNING = "warning"


class AuditLog(BaseModel):
    """Audit log for security and compliance"""
    __tablename__ = "audit_logs"
    
    # Who
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    user_role = Column(String(50), nullable=True)
    
    # What
    action = Column(
        SQLEnum(AuditAction, native_enum=True, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        index=True
    )
    status = Column(
        SQLEnum(AuditStatus, native_enum=True, values_callable=lambda x: [e.value for e in x]),
        default=AuditStatus.SUCCESS,
        nullable=False
    )
    
    # When
    timestamp = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False, index=True)
    
    # Where
    ip_address = Column(String(45), nullable=True, index=True)  # IPv4 or IPv6
    user_agent = Column(Text, nullable=True)
    
    # Details
    description = Column(Text, nullable=True)
    extra_data = Column(JSONB, nullable=True)  # Additional context (renamed from metadata)
    
    # Resource affected
    resource_type = Column(String(50), nullable=True)  # e.g., "user", "report", "session"
    resource_id = Column(String(100), nullable=True)
    
    def __repr__(self):
        return f"<AuditLog(action={self.action.value}, user_id={self.user_id}, status={self.status.value})>"
    
    def to_dict(self) -> dict:
        """Convert to dictionary for API response"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "user_role": self.user_role,
            "action": self.action.value,
            "status": self.status.value,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "ip_address": self.ip_address,
            "description": self.description,
            "extra_data": self.extra_data,
            "resource_type": self.resource_type,
            "resource_id": self.resource_id
        }
