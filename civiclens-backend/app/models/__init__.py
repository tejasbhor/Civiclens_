"""
Models package
Import all models here so Alembic can detect them for migrations
"""

from app.models.base import BaseModel, TimestampMixin
from app.models.user import User, UserRole
from app.models.session import Session
from app.models.department import Department
from app.models.report import Report, ReportStatus, ReportSeverity, ReportCategory
from app.models.area_assignment import AreaAssignment
from app.models.task import Task, TaskStatus
from app.models.role_history import RoleHistory
from app.models.media import Media
from app.models.appeal import Appeal, AppealType, AppealStatus
from app.models.escalation import Escalation, EscalationLevel, EscalationReason, EscalationStatus
from app.models.report_status_history import ReportStatusHistory
from app.models.sync import ClientSyncState, SyncConflict, OfflineAction
from app.models.audit_log import AuditLog, AuditAction, AuditStatus
from app.models.notification import Notification, NotificationType, NotificationPriority
from app.models.feedback import Feedback

__all__ = [
    "BaseModel",
    "TimestampMixin",
    "User",
    "UserRole",
    "Session",
    "Report",
    "ReportStatus",
    "ReportSeverity",
    "ReportCategory",
    "Department",
    "AreaAssignment",
    "Task",
    "TaskStatus",
    "RoleHistory",
    "Media",
    "Appeal",
    "AppealType",
    "AppealStatus",
    "Escalation",
    "EscalationLevel",
    "EscalationReason",
    "EscalationStatus",
    "ReportStatusHistory",
    "ClientSyncState",
    "SyncConflict",
    "OfflineAction",
    "AuditLog",
    "AuditAction",
    "AuditStatus",
    "Notification",
    "NotificationType",
    "NotificationPriority",
    "Feedback",
]
