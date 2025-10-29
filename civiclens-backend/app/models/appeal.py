from sqlalchemy import Column, String, Text, Integer, ForeignKey, Enum as SQLEnum, Index, Boolean
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
import enum


class AppealType(str, enum.Enum):
    # Citizen Appeals
    CLASSIFICATION = "classification"  # Citizen disputes AI/manual classification
    RESOLUTION = "resolution"          # Citizen disputes resolution quality (unsatisfied)
    REJECTION = "rejection"            # Citizen appeals rejected report
    
    # Officer Appeals
    INCORRECT_ASSIGNMENT = "incorrect_assignment"  # Officer flags wrong assignment
    WORKLOAD = "workload"              # Officer appeals excessive workload
    RESOURCE_LACK = "resource_lack"    # Officer appeals lack of resources
    
    # Admin Appeals
    QUALITY_CONCERN = "quality_concern"  # Admin flags quality issues


class AppealStatus(str, enum.Enum):
    SUBMITTED = "submitted"            # Just submitted
    UNDER_REVIEW = "under_review"      # Being reviewed by admin
    APPROVED = "approved"              # Appeal approved, action taken
    REJECTED = "rejected"              # Appeal rejected, original decision stands
    WITHDRAWN = "withdrawn"            # Citizen withdrew appeal


class Appeal(BaseModel):
    __tablename__ = "appeals"
    
    # Report & User
    report_id = Column(Integer, ForeignKey("reports.id", ondelete="CASCADE"), nullable=False, index=True)
    submitted_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Appeal Details
    appeal_type = Column(SQLEnum(AppealType, native_enum=True, values_callable=lambda x: [e.value for e in x]), nullable=False, index=True)
    status = Column(SQLEnum(AppealStatus, native_enum=True, values_callable=lambda x: [e.value for e in x]), default=AppealStatus.SUBMITTED, nullable=False, index=True)
    
    # Content
    reason = Column(Text, nullable=False)  # Why they're appealing
    evidence = Column(Text, nullable=True)  # Additional evidence/context
    requested_action = Column(Text, nullable=True)  # What they want done
    
    # Review
    reviewed_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    review_notes = Column(Text, nullable=True)
    action_taken = Column(Text, nullable=True)  # What was done
    
    # Reassignment (for incorrect assignment appeals)
    reassigned_to_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reassigned_to_department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    reassignment_reason = Column(Text, nullable=True)
    
    # Rework (for resolution quality appeals)
    requires_rework = Column(Boolean, default=False, nullable=False)
    rework_assigned_to_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    rework_notes = Column(Text, nullable=True)
    rework_completed = Column(Boolean, default=False, nullable=False)
    
    # Relationships
    report = relationship("Report", back_populates="appeals")
    submitted_by = relationship("User", foreign_keys=[submitted_by_user_id])
    reviewed_by = relationship("User", foreign_keys=[reviewed_by_user_id])
    reassigned_to_user = relationship("User", foreign_keys=[reassigned_to_user_id])
    rework_assigned_to = relationship("User", foreign_keys=[rework_assigned_to_user_id])
    
    # Indexes
    __table_args__ = (
        Index('idx_appeal_report_status', 'report_id', 'status'),
        Index('idx_appeal_type_status', 'appeal_type', 'status'),
    )
    
    def __repr__(self):
        return f"<Appeal(id={self.id}, report_id={self.report_id}, type={self.appeal_type}, status={self.status})>"
