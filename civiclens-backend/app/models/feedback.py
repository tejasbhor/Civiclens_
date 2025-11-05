"""
Feedback model for citizen satisfaction tracking
"""
from sqlalchemy import Column, String, Text, Integer, ForeignKey, Enum as SQLEnum, Boolean, Index
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
import enum


class SatisfactionLevel(str, enum.Enum):
    VERY_SATISFIED = "very_satisfied"
    SATISFIED = "satisfied"
    NEUTRAL = "neutral"
    DISSATISFIED = "dissatisfied"
    VERY_DISSATISFIED = "very_dissatisfied"


class Feedback(BaseModel):
    __tablename__ = "feedbacks"
    
    # Report & User
    report_id = Column(Integer, ForeignKey("reports.id", ondelete="CASCADE"), nullable=False, index=True, unique=True)  # One feedback per report
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Rating & Satisfaction
    rating = Column(Integer, nullable=False)  # 1-5 stars
    satisfaction_level = Column(
        SQLEnum(SatisfactionLevel, native_enum=True, values_callable=lambda x: [e.value for e in x]), 
        nullable=False, 
        index=True
    )
    
    # Feedback Content
    comment = Column(Text, nullable=True)
    
    # Resolution Quality
    resolution_time_acceptable = Column(Boolean, default=True, nullable=False)
    work_quality_acceptable = Column(Boolean, default=True, nullable=False)
    officer_behavior_acceptable = Column(Boolean, default=True, nullable=False)
    would_recommend = Column(Boolean, default=True, nullable=False)
    
    # Follow-up
    requires_followup = Column(Boolean, default=False, nullable=False)
    followup_reason = Column(Text, nullable=True)
    
    # Relationships
    report = relationship("Report", back_populates="feedback")
    user = relationship("User", foreign_keys=[user_id])
    
    # Indexes
    __table_args__ = (
        Index('idx_feedback_rating', 'rating'),
        Index('idx_feedback_satisfaction', 'satisfaction_level'),
        Index('idx_feedback_report_user', 'report_id', 'user_id'),
    )
    
    def __repr__(self):
        return f"<Feedback(id={self.id}, report_id={self.report_id}, rating={self.rating}, satisfaction={self.satisfaction_level})>"
