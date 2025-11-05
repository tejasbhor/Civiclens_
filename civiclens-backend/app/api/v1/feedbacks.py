"""
Feedback API endpoints for citizen satisfaction tracking
"""
from fastapi import APIRouter, Depends, Query, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional, List
from datetime import datetime

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.exceptions import NotFoundException, ValidationException, ForbiddenException
from app.core.audit_logger import audit_logger
from app.models.user import User
from app.models.feedback import Feedback, SatisfactionLevel
from app.models.report import Report, ReportStatus
from app.models.audit_log import AuditAction, AuditStatus
from pydantic import BaseModel, Field


router = APIRouter(prefix="/feedbacks", tags=["Feedbacks"])


# Schemas
class FeedbackCreate(BaseModel):
    report_id: int
    rating: int = Field(..., ge=1, le=5, description="Rating from 1-5 stars")
    satisfaction_level: SatisfactionLevel
    comment: Optional[str] = None
    resolution_time_acceptable: bool = True
    work_quality_acceptable: bool = True
    officer_behavior_acceptable: bool = True
    would_recommend: bool = True
    requires_followup: bool = False
    followup_reason: Optional[str] = None


class FeedbackResponse(BaseModel):
    id: int
    report_id: int
    user_id: int
    rating: int
    satisfaction_level: str
    comment: Optional[str]
    resolution_time_acceptable: bool
    work_quality_acceptable: bool
    officer_behavior_acceptable: bool
    would_recommend: bool
    requires_followup: bool
    followup_reason: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# Endpoints
@router.post("/", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    feedback_data: FeedbackCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Citizen submits feedback after report resolution
    Only the original reporter can submit feedback
    """
    # Verify report exists
    result = await db.execute(select(Report).where(Report.id == feedback_data.report_id))
    report = result.scalar_one_or_none()
    
    if not report:
        raise NotFoundException("Report not found")
    
    # Verify user is the original reporter
    if report.user_id != current_user.id:
        raise ForbiddenException("Only the original reporter can submit feedback")
    
    # Verify report is RESOLVED or CLOSED
    if report.status not in [ReportStatus.RESOLVED, ReportStatus.CLOSED]:
        raise ValidationException(
            f"Cannot submit feedback for report with status: {report.status}. "
            "Report must be RESOLVED or CLOSED."
        )
    
    # Check if feedback already exists
    existing = await db.execute(
        select(Feedback).where(Feedback.report_id == feedback_data.report_id)
    )
    if existing.scalar_one_or_none():
        raise ValidationException("Feedback already submitted for this report")
    
    # Create feedback
    feedback = Feedback(
        report_id=feedback_data.report_id,
        user_id=current_user.id,
        rating=feedback_data.rating,
        satisfaction_level=feedback_data.satisfaction_level,
        comment=feedback_data.comment,
        resolution_time_acceptable=feedback_data.resolution_time_acceptable,
        work_quality_acceptable=feedback_data.work_quality_acceptable,
        officer_behavior_acceptable=feedback_data.officer_behavior_acceptable,
        would_recommend=feedback_data.would_recommend,
        requires_followup=feedback_data.requires_followup,
        followup_reason=feedback_data.followup_reason
    )
    
    db.add(feedback)
    
    # If satisfied and report is RESOLVED, auto-close it
    if (feedback_data.satisfaction_level in [SatisfactionLevel.SATISFIED, SatisfactionLevel.VERY_SATISFIED] 
        and report.status == ReportStatus.RESOLVED):
        report.status = ReportStatus.CLOSED
        report.status_updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(feedback)
    
    # Audit logging
    await audit_logger.log(
        db=db,
        action=AuditAction.REPORT_UPDATED,
        status=AuditStatus.SUCCESS,
        user=current_user,
        request=request,
        description=f"Submitted feedback for report #{feedback_data.report_id} - {feedback_data.rating} stars",
        metadata={
            "feedback_id": feedback.id,
            "report_id": feedback_data.report_id,
            "rating": feedback_data.rating,
            "satisfaction_level": feedback_data.satisfaction_level.value
        },
        resource_type="feedback",
        resource_id=str(feedback.id)
    )
    
    return feedback


@router.get("/", response_model=List[FeedbackResponse])
async def get_feedbacks(
    report_id: Optional[int] = None,
    satisfaction_level: Optional[SatisfactionLevel] = None,
    min_rating: Optional[int] = Query(None, ge=1, le=5),
    max_rating: Optional[int] = Query(None, ge=1, le=5),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get feedbacks with filters (admin only)"""
    if not current_user.can_access_admin_portal():
        raise ForbiddenException("Admin access required")
    
    query = select(Feedback).order_by(Feedback.created_at.desc())
    
    if report_id:
        query = query.where(Feedback.report_id == report_id)
    if satisfaction_level:
        query = query.where(Feedback.satisfaction_level == satisfaction_level)
    if min_rating:
        query = query.where(Feedback.rating >= min_rating)
    if max_rating:
        query = query.where(Feedback.rating <= max_rating)
    
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    feedbacks = result.scalars().all()
    
    return feedbacks


@router.get("/stats")
async def get_feedback_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get feedback statistics (admin only)"""
    if not current_user.can_access_admin_portal():
        raise ForbiddenException("Admin access required")
    
    # Total feedbacks
    total_result = await db.execute(select(func.count(Feedback.id)))
    total = total_result.scalar()
    
    # Average rating
    avg_rating_result = await db.execute(select(func.avg(Feedback.rating)))
    avg_rating = avg_rating_result.scalar() or 0.0
    
    # By satisfaction level
    satisfaction_result = await db.execute(
        select(Feedback.satisfaction_level, func.count(Feedback.id))
        .group_by(Feedback.satisfaction_level)
    )
    by_satisfaction = {level: count for level, count in satisfaction_result.all()}
    
    # By rating
    rating_result = await db.execute(
        select(Feedback.rating, func.count(Feedback.id))
        .group_by(Feedback.rating)
    )
    by_rating = {rating: count for rating, count in rating_result.all()}
    
    # Requires followup count
    followup_result = await db.execute(
        select(func.count(Feedback.id))
        .where(Feedback.requires_followup == True)
    )
    requires_followup = followup_result.scalar()
    
    return {
        "total": total,
        "average_rating": round(avg_rating, 2),
        "by_satisfaction": by_satisfaction,
        "by_rating": by_rating,
        "requires_followup": requires_followup
    }


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
    
    # Only admin or the feedback submitter can view
    if not current_user.can_access_admin_portal() and feedback.user_id != current_user.id:
        raise ForbiddenException("Not authorized to view this feedback")
    
    return feedback


@router.get("/report/{report_id}", response_model=Optional[FeedbackResponse])
async def get_feedback_by_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get feedback for a specific report"""
    result = await db.execute(select(Feedback).where(Feedback.report_id == report_id))
    feedback = result.scalar_one_or_none()
    
    if not feedback:
        return None
    
    # Only admin or the feedback submitter can view
    if not current_user.can_access_admin_portal() and feedback.user_id != current_user.id:
        raise ForbiddenException("Not authorized to view this feedback")
    
    return feedback
