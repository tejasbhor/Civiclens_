from sqlalchemy import Column, String, Text, Integer, ForeignKey, Boolean, DateTime, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
import enum


class NotificationType(str, enum.Enum):
    STATUS_CHANGE = "status_change"
    TASK_ASSIGNED = "task_assigned"
    TASK_ACKNOWLEDGED = "task_acknowledged"
    TASK_STARTED = "task_started"
    TASK_COMPLETED = "task_completed"
    VERIFICATION_REQUIRED = "verification_required"
    RESOLUTION_APPROVED = "resolution_approved"
    RESOLUTION_REJECTED = "resolution_rejected"
    APPEAL_SUBMITTED = "appeal_submitted"
    APPEAL_REVIEWED = "appeal_reviewed"
    FEEDBACK_RECEIVED = "feedback_received"
    SLA_WARNING = "sla_warning"
    SLA_VIOLATED = "sla_violated"
    ESCALATION_CREATED = "escalation_created"
    ASSIGNMENT_REJECTED = "assignment_rejected"
    ON_HOLD = "on_hold"
    WORK_RESUMED = "work_resumed"


class NotificationPriority(str, enum.Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"


class Notification(BaseModel):
    __tablename__ = "notifications"
    
    # User
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Notification Details
    type = Column(String(50), nullable=False, index=True)
    priority = Column(String(20), default=NotificationPriority.NORMAL, nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    
    # Related Entities
    related_report_id = Column(Integer, ForeignKey("reports.id", ondelete="CASCADE"), nullable=True, index=True)
    related_task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=True)
    related_appeal_id = Column(Integer, ForeignKey("appeals.id", ondelete="CASCADE"), nullable=True)
    related_escalation_id = Column(Integer, ForeignKey("escalations.id", ondelete="CASCADE"), nullable=True)
    
    # Status
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    read_at = Column(DateTime(timezone=True), nullable=True)
    
    # Action Link (optional deep link for mobile/web)
    action_url = Column(String(500), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = None  # Override inherited updated_at since notifications table doesn't have this column
    
    # Relationships
    user = relationship("User", back_populates="notifications")
    report = relationship("Report", foreign_keys=[related_report_id])
    task = relationship("Task", foreign_keys=[related_task_id])
    appeal = relationship("Appeal", foreign_keys=[related_appeal_id])
    escalation = relationship("Escalation", foreign_keys=[related_escalation_id])
    
    # Indexes
    __table_args__ = (
        Index('idx_notification_user_read', 'user_id', 'is_read'),
        Index('idx_notification_user_created', 'user_id', 'created_at'),
        Index('idx_notification_priority', 'priority', 'is_read'),
    )
    
    def __repr__(self):
        return f"<Notification(id={self.id}, user_id={self.user_id}, type={self.type}, is_read={self.is_read})>"
