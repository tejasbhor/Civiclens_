from sqlalchemy import Column, Integer, ForeignKey, Text, Enum as SQLEnum, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.models.base import BaseModel
from app.models.report import ReportStatus


class ReportStatusHistory(BaseModel):
    __tablename__ = "report_status_history"

    report_id = Column(Integer, ForeignKey("reports.id", ondelete="CASCADE"), nullable=False, index=True)
    old_status = Column(SQLEnum(ReportStatus, native_enum=True, values_callable=lambda x: [e.value for e in x]), nullable=True)
    new_status = Column(SQLEnum(ReportStatus, native_enum=True, values_callable=lambda x: [e.value for e in x]), nullable=False)
    changed_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    notes = Column(Text, nullable=True)
    changed_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relationships
    report = relationship("Report", backref="status_history")
    changed_by = relationship("User", foreign_keys=[changed_by_user_id])

    def __repr__(self) -> str:
        return f"<ReportStatusHistory(report_id={self.report_id}, {self.old_status} -> {self.new_status})>"
