from sqlalchemy import Column, String, Text, Float, Integer, ForeignKey, Enum as SQLEnum, Index, DateTime, Boolean
from sqlalchemy.orm import relationship
from geoalchemy2 import Geography
from app.models.base import BaseModel
from app.models.user import User  # optional for FK typing
import enum
from datetime import datetime

class ReportStatus(str, enum.Enum):
    RECEIVED = "received"
    PENDING_CLASSIFICATION = "pending_classification"
    CLASSIFIED = "classified"
    ASSIGNED_TO_DEPARTMENT = "assigned_to_department"
    ASSIGNED_TO_OFFICER = "assigned_to_officer"
    ASSIGNMENT_REJECTED = "assignment_rejected"  # Officer rejected assignment
    ACKNOWLEDGED = "acknowledged"
    IN_PROGRESS = "in_progress"
    PENDING_VERIFICATION = "pending_verification"
    RESOLVED = "resolved"
    CLOSED = "closed"
    REJECTED = "rejected"
    DUPLICATE = "duplicate"
    ON_HOLD = "on_hold"
    REOPENED = "reopened"  # After appeal approved, before rework

class ReportSeverity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ReportCategory(str, enum.Enum):
    ROADS = "roads"
    WATER = "water"
    SANITATION = "sanitation"
    ELECTRICITY = "electricity"
    STREETLIGHT = "streetlight"
    DRAINAGE = "drainage"
    PUBLIC_PROPERTY = "public_property"
    OTHER = "other"

class Report(BaseModel):
    __tablename__ = "reports"
    
    # Identity
    report_number = Column(String(50), unique=True, nullable=True, index=True)

    # User & Department
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Report Details
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=False)
    category = Column(String(100), nullable=True, index=True)
    sub_category = Column(String(100), nullable=True)
    
    # Status & Priority
    status = Column(SQLEnum(ReportStatus, native_enum=True, values_callable=lambda x: [e.value for e in x]), default=ReportStatus.RECEIVED, nullable=False, index=True)
    severity = Column(SQLEnum(ReportSeverity, native_enum=True, values_callable=lambda x: [e.value for e in x]), default=ReportSeverity.MEDIUM, nullable=False, index=True)
    status_updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=True)

    # Location (Geospatial)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    location = Column(Geography(geometry_type='POINT', srid=4326), nullable=True)
    address = Column(String(500), nullable=True)
    landmark = Column(String(255), nullable=True)
    area_type = Column(String(50), nullable=True)
    ward_number = Column(String(50), nullable=True)
    district = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True, default="Jharkhand")
    pincode = Column(String(10), nullable=True)
    
    # AI/Manual Classification
    ai_category = Column(String(100), nullable=True)
    ai_confidence = Column(Float, nullable=True)
    ai_processed_at = Column(DateTime(timezone=True), nullable=True)
    ai_model_version = Column(String(50), nullable=True)
    manual_category = Column(String(100), nullable=True)
    manual_severity = Column(SQLEnum(ReportSeverity, native_enum=True, values_callable=lambda x: [e.value for e in x]), nullable=True)
    classified_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    classification_notes = Column(Text, nullable=True)

    # Visibility
    is_public = Column(Boolean, default=True, nullable=False)
    is_sensitive = Column(Boolean, default=False, nullable=False)
    is_featured = Column(Boolean, default=False, nullable=False)
    needs_review = Column(Boolean, default=False, nullable=False)
    is_duplicate = Column(Boolean, default=False, nullable=False)
    duplicate_of_report_id = Column(Integer, ForeignKey("reports.id", ondelete="SET NULL"), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    hold_reason = Column(Text, nullable=True)
    
    # Officer Assignment Rejection
    assignment_rejection_reason = Column(Text, nullable=True)
    assignment_rejected_at = Column(DateTime(timezone=True), nullable=True)
    assignment_rejected_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # ON_HOLD Enhancements
    estimated_resume_date = Column(DateTime(timezone=True), nullable=True)
    hold_approved_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    hold_approval_required = Column(Boolean, default=False, nullable=False)

    # Relationships
    user = relationship("User", back_populates="reports", foreign_keys=[user_id])
    classified_by = relationship("User", foreign_keys=[classified_by_user_id])
    assignment_rejected_by = relationship("User", foreign_keys=[assignment_rejected_by_user_id])
    hold_approved_by = relationship("User", foreign_keys=[hold_approved_by_user_id])
    department = relationship("Department", back_populates="reports")
    media = relationship("Media", back_populates="report", cascade="all, delete-orphan")
    task = relationship("Task", back_populates="report", uselist=False, cascade="all, delete-orphan")
    duplicate_of = relationship("Report", remote_side="Report.id", uselist=False)
    appeals = relationship("Appeal", back_populates="report", cascade="all, delete-orphan")
    escalations = relationship("Escalation", back_populates="report", cascade="all, delete-orphan")
    feedback = relationship("Feedback", back_populates="report", uselist=False, cascade="all, delete-orphan")
    # validations = relationship("Validation", back_populates="report", cascade="all, delete-orphan")  # TODO: Create Validation model
    
    # Indexes
    __table_args__ = (
        Index('idx_report_status_severity', 'status', 'severity'),
        Index('idx_report_location', 'latitude', 'longitude'),
        Index('idx_report_location_gist', 'location', postgresql_using='gist'),
        Index('idx_report_created', 'created_at'),
    )
    
    def __repr__(self):
        return f"<Report(id={self.id}, title={self.title}, status={self.status})>"
