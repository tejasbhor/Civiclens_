from sqlalchemy import Column, Integer, ForeignKey, Float, DateTime, Index, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class OfficerMetrics(BaseModel):
    __tablename__ = "officer_metrics"
    
    # Officer
    officer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Time Period
    period_start = Column(DateTime(timezone=True), nullable=False)
    period_end = Column(DateTime(timezone=True), nullable=False)
    
    # Task Counts
    total_assigned = Column(Integer, default=0, nullable=False)
    total_completed = Column(Integer, default=0, nullable=False)
    total_active = Column(Integer, default=0, nullable=False)
    total_acknowledged = Column(Integer, default=0, nullable=False)
    total_in_progress = Column(Integer, default=0, nullable=False)
    total_on_hold = Column(Integer, default=0, nullable=False)
    
    # Performance Metrics
    resolution_rate = Column(Float, default=0.0, nullable=False)  # percentage (0-100)
    avg_resolution_time_hours = Column(Float, default=0.0, nullable=False)
    avg_acknowledgment_time_hours = Column(Float, default=0.0, nullable=False)
    avg_completion_time_hours = Column(Float, default=0.0, nullable=False)
    
    # SLA Metrics
    sla_compliance_rate = Column(Float, default=0.0, nullable=False)  # percentage (0-100)
    sla_violations_count = Column(Integer, default=0, nullable=False)
    sla_warnings_count = Column(Integer, default=0, nullable=False)
    
    # Citizen Satisfaction
    avg_satisfaction_score = Column(Float, default=0.0, nullable=False)  # 1-5 stars
    total_feedbacks_received = Column(Integer, default=0, nullable=False)
    positive_feedbacks_count = Column(Integer, default=0, nullable=False)  # >= 4 stars
    negative_feedbacks_count = Column(Integer, default=0, nullable=False)  # < 4 stars
    
    # Quality Metrics
    rework_count = Column(Integer, default=0, nullable=False)  # Times work was rejected
    rework_rate = Column(Float, default=0.0, nullable=False)  # percentage (0-100)
    first_time_resolution_rate = Column(Float, default=0.0, nullable=False)  # percentage (0-100)
    
    # Workload Metrics
    avg_daily_workload = Column(Float, default=0.0, nullable=False)
    peak_concurrent_tasks = Column(Integer, default=0, nullable=False)
    
    # Timestamps
    calculated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    
    # Relationships
    officer = relationship("User", back_populates="performance_metrics")
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('officer_id', 'period_start', 'period_end', name='uq_officer_period'),
        Index('idx_officer_metrics_period', 'officer_id', 'period_start', 'period_end'),
        Index('idx_officer_metrics_performance', 'officer_id', 'resolution_rate', 'sla_compliance_rate'),
    )
    
    def __repr__(self):
        return f"<OfficerMetrics(id={self.id}, officer_id={self.officer_id}, period={self.period_start} to {self.period_end})>"
    
    @property
    def performance_score(self) -> float:
        """
        Calculate overall performance score (0-100)
        Weighted average of key metrics
        """
        weights = {
            'resolution_rate': 0.25,
            'sla_compliance_rate': 0.25,
            'avg_satisfaction_score': 0.20,  # Normalized to 0-100
            'first_time_resolution_rate': 0.20,
            'efficiency': 0.10  # Based on avg resolution time
        }
        
        # Normalize satisfaction score (1-5 to 0-100)
        satisfaction_normalized = ((self.avg_satisfaction_score - 1) / 4) * 100 if self.avg_satisfaction_score > 0 else 0
        
        # Efficiency score (faster is better, capped at 100)
        # Assume target is 48 hours (2 days)
        target_hours = 48
        efficiency = max(0, min(100, (target_hours / max(self.avg_resolution_time_hours, 1)) * 100))
        
        score = (
            self.resolution_rate * weights['resolution_rate'] +
            self.sla_compliance_rate * weights['sla_compliance_rate'] +
            satisfaction_normalized * weights['avg_satisfaction_score'] +
            self.first_time_resolution_rate * weights['first_time_resolution_rate'] +
            efficiency * weights['efficiency']
        )
        
        return round(score, 2)
    
    @property
    def performance_grade(self) -> str:
        """Get performance grade based on score"""
        score = self.performance_score
        if score >= 90:
            return "A+"
        elif score >= 85:
            return "A"
        elif score >= 80:
            return "B+"
        elif score >= 75:
            return "B"
        elif score >= 70:
            return "C+"
        elif score >= 65:
            return "C"
        elif score >= 60:
            return "D"
        else:
            return "F"
