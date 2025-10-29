from sqlalchemy import Column, String, Integer, ForeignKey, Enum as SQLEnum, Boolean
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
from sqlalchemy.dialects.postgresql import JSONB
import enum


class MediaType(str, enum.Enum):
    IMAGE = "IMAGE"
    VIDEO = "VIDEO"
    AUDIO = "AUDIO"
    DOCUMENT = "DOCUMENT"


class UploadSource(str, enum.Enum):
    CITIZEN_SUBMISSION = "citizen_submission"
    OFFICER_BEFORE_PHOTO = "officer_before_photo"
    OFFICER_AFTER_PHOTO = "officer_after_photo"


class Media(BaseModel):
    __tablename__ = "media"
    
    report_id = Column(Integer, ForeignKey("reports.id", ondelete="CASCADE"), nullable=False, index=True)
    file_url = Column(String(500), nullable=False)
    file_type = Column(SQLEnum(MediaType, native_enum=True, values_callable=lambda x: [e.value for e in x]), nullable=False)
    file_size = Column(Integer, nullable=True)  # Size in bytes
    mime_type = Column(String(100), nullable=True)
    is_primary = Column(Boolean, default=False, nullable=False)
    is_proof_of_work = Column(Boolean, default=False, nullable=False)
    sequence_order = Column(Integer, nullable=True)
    caption = Column(String(500), nullable=True)
    meta = Column(JSONB, nullable=True)
    upload_source = Column(SQLEnum(UploadSource, native_enum=True, values_callable=lambda x: [e.value for e in x]), nullable=True)
    
    # Relationships
    report = relationship("Report", back_populates="media")
    
    def __repr__(self):
        return f"<Media(id={self.id}, report_id={self.report_id}, type={self.file_type})>"
