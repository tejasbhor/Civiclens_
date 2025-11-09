"""
Feedback API endpoints - Citizen satisfaction and quality feedback
"""
from fastapi import APIRouter, Depends, Query, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from typing import Optional, List
from datetime import datetime, timedelta

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.exceptions import NotFoundException, ValidationException, ForbiddenException
from app.core.audit_logger import audit_logger
from app.models.user import User, UserRole
from app.models.feedback import Feedback, SatisfactionLevel
from app.models.report import Report, ReportStatus
from app.models.audit_log import AuditAction, AuditStatus
from pydantic import BaseModel, Field


router = APIRouter(prefix="/feedback", tags=["Feedback"])


# Schemas
class FeedbackCreate(BaseModel):
    report_id: int
    satisfaction_level: SatisfactionLevel
    rating: int = Field(ge=1, le=5, description="Overall rating (1-5)")
    comments: Optional[str] = None
    suggestions: Optional[str] = None
    resolution_effective: Optional[bool] = None
    timeliness_satisfactory: Optional[bool] = None
    officer_professional: Optional[bool] = None
    would_recommend: Optional[bool] = None


class FeedbackUpdate(BaseModel):
    satisfaction_level: Optional[SatisfactionLevel] = None
    rating: Optional[int] = Field(None, ge=1, le=5)
    comments: Optional[str] = None
    suggestions: Optional[str] = None
    resolution_effective: Optional[bool] = None
    timeliness_satisfactory: Optional[bool] = None
    officer_professional: Optional[bool] = None
    would_recommend: Optional[bool] = None


class FeedbackResponse(BaseModel):
    id: int
    report_id: int
    user_id: int
    satisfaction_level: str
    rating: int
    comments: Optional[str]
    suggestions: Optional[str]
    resolution_effective: Optional[bool]
    timeliness_satisfactory: Optional[bool]
    officer_professional: Optional[bool]
    would_recommend: Optional[bool]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class FeedbackStats(BaseModel):
    total_feedbacks: int
    avg_rating: float
    avg_satisfaction_score: float
    very_satisfied_count: int
    satisfied_count: int
    neutral_count: int
    dissatisfied_count: int
    very_dissatisfied_count: int
    resolution_effective_pct: float
    timeliness_satisfactory_pct: float
    officer_professional_pct: float
    would_recommend_pct: float


# Endpoints
@router.post("/", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
async def create_feedback(
    feedback_data: FeedbackCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Submit feedback for a resolved report
    Only the report submitter can provide feedback
    """
    # Verify report exists and is resolved
    result = await db.execute(select(Report).where(Report.id == feedback_data.report_id))
    report = result.scalar_one_or_none()
    
    if not report:
        raise NotFoundException("Report not found")
    
    # Verify user is the report submitter
    if report.user_id != current_user.id and current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise ForbiddenException("Only the report submitter can provide feedback")
    
    # Verify report is resolved
    if report.status not in [ReportStatus.RESOLVED, ReportStatus.CLOSED]:
        raise ValidationException(
            "Feedback can only be provided for resolved or closed reports"
        )
    
    # Check if feedback already exists
    existing = await db.execute(
        select(Feedback).where(Feedback.report_id == feedback_data.report_id)
    )
    if existing.scalar_one_or_none():
        raise ValidationException(
            "Feedback already exists for this report. Use PATCH to update it."
        )
    
    # Create feedback
    feedback = Feedback(
        report_id=feedback_data.report_id,
        user_id=current_user.id,
        satisfaction_level=feedback_data.satisfaction_level,
        rating=feedback_data.rating,
        comments=feedback_data.comments,
        suggestions=feedback_data.suggestions,
        resolution_effective=feedback_data.resolution_effective,
        timeliness_satisfactory=feedback_data.timeliness_satisfactory,
        officer_professional=feedback_data.officer_professional,
        would_recommend=feedback_data.would_recommend
    )
    
    db.add(feedback)
    await db.flush()
    
    # Audit log
    await audit_logger.log(
        db=db,
        user_id=current_user.id,
        action=AuditAction.FEEDBACK_SUBMITTED,
        resource_type="feedback",
        resource_id=feedback.id,
        details={
            "report_id": feedback_data.report_id,
            "satisfaction_level": feedback_data.satisfaction_level.value,
            "rating": feedback_data.rating
        },
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        status=AuditStatus.SUCCESS
    )
    
    await db.commit()
    await db.refresh(feedback)
    
    return feedback


@router.get("/", response_model=List[FeedbackResponse])
async def list_feedback(
    report_id: Optional[int] = Query(None, description="Filter by report ID"),
    satisfaction_level: Optional[SatisfactionLevel] = Query(None),
    min_rating: Optional[int] = Query(None, ge=1, le=5),
    max_rating: Optional[int] = Query(None, ge=1, le=5),
    days: Optional[int] = Query(None, description="Last N days"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List feedback with optional filters
    Regular users can only see their own feedback
    Admins can see all feedback
    """
    query = select(Feedback)
    
    # Permission check
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        # Regular users can only see their own feedback
        query = query.where(Feedback.user_id == current_user.id)
    
    # Apply filters
    conditions = []
    
    if report_id:
        conditions.append(Feedback.report_id == report_id)
    
    if satisfaction_level:
        conditions.append(Feedback.satisfaction_level == satisfaction_level)
    
    if min_rating:
        conditions.append(Feedback.rating >= min_rating)
    
    if max_rating:
        conditions.append(Feedback.rating <= max_rating)
    
    if days:
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        conditions.append(Feedback.created_at >= cutoff_date)
    
    if conditions:
        query = query.where(and_(*conditions))
    
    # Order by most recent
    query = query.order_by(Feedback.created_at.desc())
    
    # Pagination
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    feedbacks = result.scalars().all()
    
    return feedbacks


@router.get("/stats", response_model=FeedbackStats)
async def get_feedback_stats(
    days: Optional[int] = Query(None, description="Last N days, default all time"),
    officer_id: Optional[int] = Query(None, description="Filter by officer"),
    department_id: Optional[int] = Query(None, description="Filter by department"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get aggregate feedback statistics
    Admins only
    """
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise ForbiddenException("Admin access required")
    
    # Build base query
    query = select(Feedback)
    
    # Apply filters
    conditions = []
    
    if days:
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        conditions.append(Feedback.created_at >= cutoff_date)
    
    if officer_id or department_id:
        # Join with report and task to filter by officer/department
        from app.models.task import Task
        query = query.join(Report, Feedback.report_id == Report.id)
        query = query.join(Task, Task.report_id == Report.id)
        
        if officer_id:
            conditions.append(Task.assigned_to == officer_id)
        
        if department_id:
            conditions.append(Report.department_id == department_id)
    
    if conditions:
        query = query.where(and_(*conditions))
    
    result = await db.execute(query)
    feedbacks = result.scalars().all()
    
    if not feedbacks:
        return FeedbackStats(
            total_feedbacks=0,
            avg_rating=0.0,
            avg_satisfaction_score=0.0,
            very_satisfied_count=0,
            satisfied_count=0,
            neutral_count=0,
            dissatisfied_count=0,
            very_dissatisfied_count=0,
            resolution_effective_pct=0.0,
            timeliness_satisfactory_pct=0.0,
            officer_professional_pct=0.0,
            would_recommend_pct=0.0
        )
    
    # Calculate stats
    total = len(feedbacks)
    
    # Satisfaction counts
    satisfaction_map = {
        SatisfactionLevel.VERY_DISSATISFIED: 1,
        SatisfactionLevel.DISSATISFIED: 2,
        SatisfactionLevel.NEUTRAL: 3,
        SatisfactionLevel.SATISFIED: 4,
        SatisfactionLevel.VERY_SATISFIED: 5
    }
    
    very_satisfied = sum(1 for f in feedbacks if f.satisfaction_level == SatisfactionLevel.VERY_SATISFIED)
    satisfied = sum(1 for f in feedbacks if f.satisfaction_level == SatisfactionLevel.SATISFIED)
    neutral = sum(1 for f in feedbacks if f.satisfaction_level == SatisfactionLevel.NEUTRAL)
    dissatisfied = sum(1 for f in feedbacks if f.satisfaction_level == SatisfactionLevel.DISSATISFIED)
    very_dissatisfied = sum(1 for f in feedbacks if f.satisfaction_level == SatisfactionLevel.VERY_DISSATISFIED)
    
    # Average rating
    avg_rating = sum(f.rating for f in feedbacks) / total
    
    # Average satisfaction score (1-5 scale)
    satisfaction_scores = [satisfaction_map.get(f.satisfaction_level, 3) for f in feedbacks]
    avg_satisfaction = sum(satisfaction_scores) / len(satisfaction_scores)
    
    # Boolean field percentages
    resolution_effective_count = sum(1 for f in feedbacks if f.resolution_effective is True)
    timeliness_satisfactory_count = sum(1 for f in feedbacks if f.timeliness_satisfactory is True)
    officer_professional_count = sum(1 for f in feedbacks if f.officer_professional is True)
    would_recommend_count = sum(1 for f in feedbacks if f.would_recommend is True)
    
    # Calculate percentages (of those who answered)
    resolution_responded = sum(1 for f in feedbacks if f.resolution_effective is not None)
    timeliness_responded = sum(1 for f in feedbacks if f.timeliness_satisfactory is not None)
    officer_responded = sum(1 for f in feedbacks if f.officer_professional is not None)
    recommend_responded = sum(1 for f in feedbacks if f.would_recommend is not None)
    
    return FeedbackStats(
        total_feedbacks=total,
        avg_rating=round(avg_rating, 2),
        avg_satisfaction_score=round(avg_satisfaction, 2),
        very_satisfied_count=very_satisfied,
        satisfied_count=satisfied,
        neutral_count=neutral,
        dissatisfied_count=dissatisfied,
        very_dissatisfied_count=very_dissatisfied,
        resolution_effective_pct=round(
            (resolution_effective_count / resolution_responded * 100) if resolution_responded > 0 else 0, 1
        ),
        timeliness_satisfactory_pct=round(
            (timeliness_satisfactory_count / timeliness_responded * 100) if timeliness_responded > 0 else 0, 1
        ),
        officer_professional_pct=round(
            (officer_professional_count / officer_responded * 100) if officer_responded > 0 else 0, 1
        ),
        would_recommend_pct=round(
            (would_recommend_count / recommend_responded * 100) if recommend_responded > 0 else 0, 1
        )
    )


@router.get("/{feedback_id}", response_model=FeedbackResponse)
async def get_feedback(
    feedback_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get feedback by ID"""
    result = await db.execute(select(Feedback).where(Feedback.id == feedback_id))
    feedback = result.scalar_one_or_none()
    
    if not feedback:
        raise NotFoundException("Feedback not found")
    
    # Permission check
    if (feedback.user_id != current_user.id and 
        current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]):
        raise ForbiddenException("Access denied")
    
    return feedback


@router.patch("/{feedback_id}", response_model=FeedbackResponse)
async def update_feedback(
    feedback_id: int,
    feedback_update: FeedbackUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update feedback (within 7 days of creation)
    Only the feedback submitter can update it
    """
    result = await db.execute(select(Feedback).where(Feedback.id == feedback_id))
    feedback = result.scalar_one_or_none()
    
    if not feedback:
        raise NotFoundException("Feedback not found")
    
    # Permission check
    if feedback.user_id != current_user.id:
        raise ForbiddenException("Only the feedback submitter can update it")
    
    # Time limit check (7 days)
    days_since_creation = (datetime.utcnow() - feedback.created_at).days
    if days_since_creation > 7:
        raise ValidationException("Feedback can only be updated within 7 days of creation")
    
    # Update fields
    update_dict = feedback_update.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(feedback, field, value)
    
    feedback.updated_at = datetime.utcnow()
    
    await db.flush()
    
    # Audit log
    await audit_logger.log(
        db=db,
        user_id=current_user.id,
        action=AuditAction.FEEDBACK_UPDATED,
        resource_type="feedback",
        resource_id=feedback.id,
        details=update_dict,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        status=AuditStatus.SUCCESS
    )
    
    await db.commit()
    await db.refresh(feedback)
    
    return feedback


@router.delete("/{feedback_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_feedback(
    feedback_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete feedback (admin only, for moderation)
    """
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise ForbiddenException("Admin access required")
    
    result = await db.execute(select(Feedback).where(Feedback.id == feedback_id))
    feedback = result.scalar_one_or_none()
    
    if not feedback:
        raise NotFoundException("Feedback not found")
    
    await db.delete(feedback)
    
    # Audit log
    await audit_logger.log(
        db=db,
        user_id=current_user.id,
        action=AuditAction.FEEDBACK_DELETED,
        resource_type="feedback",
        resource_id=feedback_id,
        details={"report_id": feedback.report_id},
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        status=AuditStatus.SUCCESS
    )
    
    await db.commit()
    
    return None
