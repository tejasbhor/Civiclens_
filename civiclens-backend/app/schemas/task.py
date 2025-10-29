from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from app.models.task import TaskStatus


class TaskBase(BaseModel):
    report_id: int
    assigned_to: int
    priority: int = Field(default=5, ge=1, le=10)
    notes: Optional[str] = None


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    status: Optional[TaskStatus] = None
    priority: Optional[int] = Field(None, ge=1, le=10)
    notes: Optional[str] = None
    resolution_notes: Optional[str] = None


class TaskResponse(TaskBase):
    id: int
    status: TaskStatus
    assigned_by: Optional[int]
    assigned_at: datetime
    acknowledged_at: Optional[datetime]
    started_at: Optional[datetime]
    resolved_at: Optional[datetime]
    resolution_notes: Optional[str]
    
    model_config = ConfigDict(from_attributes=True)


class TaskWithDetails(TaskResponse):
    report: Optional[dict] = None
    officer: Optional[dict] = None
