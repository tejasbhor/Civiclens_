from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, List
from datetime import datetime
from app.models.report import ReportStatus, ReportSeverity, ReportCategory


class ReportBase(BaseModel):
    title: str = Field(..., min_length=5, max_length=255)
    description: str = Field(..., min_length=10, max_length=2000)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    address: Optional[str] = None
    severity: ReportSeverity = ReportSeverity.MEDIUM


class ReportCreate(ReportBase):
    """Schema for creating a report (from API)"""
    category: Optional[str] = Field(None, description="Report category - must be one of the valid categories")
    sub_category: Optional[str] = None
    
    @field_validator('category')
    @classmethod
    def validate_category(cls, v):
        if v is not None:
            valid_categories = [cat.value for cat in ReportCategory]
            if v not in valid_categories:
                raise ValueError(f'Category must be one of: {", ".join(valid_categories)}')
        return v


class ReportCreateInternal(ReportBase):
    """Internal schema for creating a report (includes user_id)"""
    user_id: int
    report_number: Optional[str] = None
    category: Optional[str] = Field(None, description="Report category - must be one of the valid categories")
    sub_category: Optional[str] = None
    
    @field_validator('category')
    @classmethod
    def validate_category(cls, v):
        if v is not None:
            valid_categories = [cat.value for cat in ReportCategory]
            if v not in valid_categories:
                raise ValueError(f'Category must be one of: {", ".join(valid_categories)}')
        return v


class ReportUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=5, max_length=255)
    description: Optional[str] = Field(None, min_length=10, max_length=2000)
    status: Optional[ReportStatus] = None
    severity: Optional[ReportSeverity] = None
    category: Optional[str] = None
    department_id: Optional[int] = None
    sub_category: Optional[str] = None
    manual_category: Optional[str] = None
    manual_severity: Optional[ReportSeverity] = None
    classification_notes: Optional[str] = None
    is_public: Optional[bool] = None
    needs_review: Optional[bool] = None
    is_duplicate: Optional[bool] = None
    duplicate_of_report_id: Optional[int] = None
    status_updated_at: Optional[datetime] = None
    
    # AI Classification Fields
    ai_category: Optional[str] = None
    ai_confidence: Optional[float] = None
    ai_processed_at: Optional[datetime] = None
    ai_model_version: Optional[str] = None


class ReportResponse(ReportBase):
    id: int
    report_number: Optional[str]
    user_id: int
    department_id: Optional[int]
    category: Optional[str]
    sub_category: Optional[str]
    status: ReportStatus
    severity: ReportSeverity
    is_public: bool
    classification_notes: Optional[str] = None
    classified_by_user_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime]
    
    model_config = ConfigDict(from_attributes=True)


class ReportWithDetails(ReportResponse):
    user: Optional[dict] = None
    department: Optional[dict] = None
    task: Optional[dict] = None
    media: Optional[List[dict]] = None


class StatusUpdateRequest(BaseModel):
    new_status: ReportStatus
    notes: Optional[str] = None


class StatusHistoryItem(BaseModel):
    old_status: Optional[ReportStatus] = None
    new_status: ReportStatus
    changed_by_user_id: Optional[int] = None
    changed_by_user: Optional[dict] = None  # {id, email, full_name}
    notes: Optional[str] = None
    changed_at: datetime


class StatusHistoryResponse(BaseModel):
    report_id: int
    history: List[StatusHistoryItem]
