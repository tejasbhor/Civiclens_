from sqlalchemy import Column, String, Text, Integer, ForeignKey, Enum as SQLEnum, Index, DateTime, Boolean
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
from datetime import datetime
import enum


class EscalationLevel(str, enum.Enum):
    LEVEL_1 = "level_1"  # Department Head
    LEVEL_2 = "level_2"  # City Manager
    LEVEL_3 = "level_3"  # Mayor/Council


class EscalationReason(str, enum.Enum):
    SLA_BREACH = "sla_breach"              # Exceeded time limits
    UNRESOLVED = "unresolved"              # Not resolved after multiple attempts
    QUALITY_ISSUE = "quality_issue"        # Poor resolution quality
    CITIZEN_COMPLAINT = "citizen_complaint"  # Citizen escalated
    VIP_ATTENTION = "vip_attention"        # VIP/Media attention
    CRITICAL_PRIORITY = "critical_priority"  # Critical issue


class EscalationStatus(str, enum.Enum):
    ESCALATED = "escalated"                # Just escalated
    ACKNOWLEDGED = "acknowledged"          # Higher authority acknowledged
    UNDER_REVIEW = "under_review"          # Being reviewed
    ACTION_TAKEN = "action_taken"          # Action taken
    RESOLVED = "resolved"                  # Issue resolved
    DE_ESCALATED = "de_escalated"          # Sent back to lower level


class Escalation(BaseModel):
    __tablename__ = "escalations"
    
    # Report & Users
    report_id = Column(Integer, ForeignKey("reports.id", ondelete="CASCADE"), nullable=False, index=True)
    escalated_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    escalated_to_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Escalation Details
    level = Column(SQLEnum(EscalationLevel, native_enum=True, values_callable=lambda x: [e.value for e in x]), nullable=False, index=True)
    reason = Column(SQLEnum(EscalationReason, native_enum=True, values_callable=lambda x: [e.value for e in x]), nullable=False, index=True)
    status = Column(SQLEnum(EscalationStatus, native_enum=True, values_callable=lambda x: [e.value for e in x]), default=EscalationStatus.ESCALATED, nullable=False, index=True)
    
    # Content
    description = Column(Text, nullable=False)  # Why escalated
    previous_actions = Column(Text, nullable=True)  # What was tried before
    urgency_notes = Column(Text, nullable=True)  # Why urgent
    
    # Response
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    response_notes = Column(Text, nullable=True)
    action_taken = Column(Text, nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    
    # SLA Tracking
    sla_deadline = Column(DateTime(timezone=True), nullable=True)  # When must be resolved
    is_overdue = Column(Boolean, default=False, nullable=False)
    
    # Relationships
    report = relationship("Report", back_populates="escalations")
    escalated_by = relationship("User", foreign_keys=[escalated_by_user_id])
    escalated_to = relationship("User", foreign_keys=[escalated_to_user_id])
    
    # Indexes
    __table_args__ = (
        Index('idx_escalation_report_level', 'report_id', 'level'),
        Index('idx_escalation_status_level', 'status', 'level'),
        Index('idx_escalation_overdue', 'is_overdue', 'sla_deadline'),
    )
    
    def __repr__(self):
        return f"<Escalation(id={self.id}, report_id={self.report_id}, level={self.level}, status={self.status})>"
