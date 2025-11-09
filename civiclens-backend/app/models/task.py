from sqlalchemy import Column, String, Text, Integer, ForeignKey, Enum as SQLEnum, DateTime, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
import enum


class TaskStatus(str, enum.Enum):
    ASSIGNED = "assigned"
    ACKNOWLEDGED = "acknowledged"
    IN_PROGRESS = "in_progress"
    PENDING_VERIFICATION = "pending_verification"
    RESOLVED = "resolved"
    REJECTED = "rejected"
    ON_HOLD = "on_hold"


class Task(BaseModel):
    __tablename__ = "tasks"
    
    # Report & Officers
    report_id = Column(Integer, ForeignKey("reports.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    assigned_to = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Task Details
    status = Column(SQLEnum(TaskStatus, native_enum=True, values_callable=lambda x: [e.value for e in x]), default=TaskStatus.ASSIGNED, nullable=False, index=True)
    priority = Column(Integer, default=5, nullable=False)
    notes = Column(Text, nullable=True)
    resolution_notes = Column(Text, nullable=True)
    
    # SLA Tracking
    sla_deadline = Column(DateTime(timezone=True), nullable=True)
    sla_violated = Column(Integer, default=0, nullable=False)  # 0=compliant, 1=warning, 2=violated
    sla_violation_count = Column(Integer, default=0, nullable=False)
    
    # Rejection Tracking
    rejection_reason = Column(Text, nullable=True)
    rejected_at = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    assigned_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    report = relationship("Report", back_populates="task")
    officer = relationship("User", foreign_keys=[assigned_to], back_populates="assigned_tasks")
    
    # Indexes
    __table_args__ = (
        Index('idx_task_officer_status', 'assigned_to', 'status'),
        Index('idx_task_priority', 'priority', 'status'),
    )
    
    def __repr__(self):
        return f"<Task(id={self.id}, report_id={self.report_id}, status={self.status})>"
