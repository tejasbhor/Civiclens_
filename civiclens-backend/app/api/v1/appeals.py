"""
Appeals API endpoints
"""
from fastapi import APIRouter, Depends, Query, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional, List
from datetime import datetime

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.exceptions import NotFoundException, ValidationException
from app.core.audit_logger import audit_logger
from app.models.user import User
from app.models.appeal import Appeal, AppealType, AppealStatus
from app.models.report import Report
from app.models.audit_log import AuditAction, AuditStatus
from pydantic import BaseModel


router = APIRouter(prefix="/appeals", tags=["Appeals"])


# Schemas
class AppealCreate(BaseModel):
    report_id: int
    appeal_type: AppealType
    reason: str
    evidence: Optional[str] = None
    requested_action: Optional[str] = None


class AppealReview(BaseModel):
    status: AppealStatus
    review_notes: Optional[str] = None
    action_taken: Optional[str] = None
    
    # For incorrect assignment appeals
    reassigned_to_user_id: Optional[int] = None
    reassigned_to_department_id: Optional[int] = None
    reassignment_reason: Optional[str] = None
    
    # For resolution quality appeals
    requires_rework: Optional[bool] = False
    rework_assigned_to_user_id: Optional[int] = None
    rework_notes: Optional[str] = None


class AppealResponse(BaseModel):
    id: int
    report_id: int
    submitted_by_user_id: int
    appeal_type: str
    status: str
    reason: str
    evidence: Optional[str]
    requested_action: Optional[str]
    reviewed_by_user_id: Optional[int]
    review_notes: Optional[str]
    action_taken: Optional[str]
    reassigned_to_user_id: Optional[int]
    reassigned_to_department_id: Optional[int]
    reassignment_reason: Optional[str]
    requires_rework: bool
    rework_assigned_to_user_id: Optional[int]
    rework_notes: Optional[str]
    rework_completed: bool
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# Endpoints
@router.post("/", response_model=AppealResponse, status_code=status.HTTP_201_CREATED)
async def create_appeal(
    appeal_data: AppealCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submit a new appeal"""
    # Verify report exists
    result = await db.execute(select(Report).where(Report.id == appeal_data.report_id))
    report = result.scalar_one_or_none()
    
    if not report:
        raise NotFoundException("Report not found")
    
    # Create appeal
    appeal = Appeal(
        report_id=appeal_data.report_id,
        submitted_by_user_id=current_user.id,
        appeal_type=appeal_data.appeal_type,
        reason=appeal_data.reason,
        evidence=appeal_data.evidence,
        requested_action=appeal_data.requested_action,
        status=AppealStatus.SUBMITTED
    )
    
    db.add(appeal)
    await db.commit()
    await db.refresh(appeal)
    
    # Audit logging
    await audit_logger.log(
        db=db,
        action=AuditAction.APPEAL_CREATED,
        status=AuditStatus.SUCCESS,
        user=current_user,
        request=request,
        description=f"Created appeal for report #{appeal_data.report_id} - {appeal_data.appeal_type.value}",
        metadata={
            "appeal_id": appeal.id,
            "report_id": appeal_data.report_id,
            "appeal_type": appeal_data.appeal_type.value,
            "reason": appeal_data.reason[:100]  # Limit reason length
        },
        resource_type="appeal",
        resource_id=str(appeal.id)
    )
    
    # Send notifications
    try:
        from app.services.notification_service import NotificationService
        notification_service = NotificationService(db)
        admin_ids = await notification_service.get_admin_user_ids()
        await notification_service.notify_appeal_submitted(
            report=report,
            appeal_id=appeal.id,
            admin_user_ids=admin_ids
        )
        await db.commit()
    except Exception as e:
        logger.error(f"Failed to send appeal submission notifications: {str(e)}")
        # Don't fail the request if notifications fail
    
    return appeal


@router.get("/", response_model=List[AppealResponse])
async def get_appeals(
    status: Optional[AppealStatus] = None,
    appeal_type: Optional[AppealType] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
):
    """Get all appeals with filters"""
    query = select(Appeal).order_by(Appeal.created_at.desc())
    
    if status:
        query = query.where(Appeal.status == status)
    if appeal_type:
        query = query.where(Appeal.appeal_type == appeal_type)
    
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    appeals = result.scalars().all()
    
    return appeals


@router.get("/stats")
async def get_appeal_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get appeal statistics"""
    # Total appeals
    total_result = await db.execute(select(func.count(Appeal.id)))
    total = total_result.scalar()
    
    # By status
    status_result = await db.execute(
        select(Appeal.status, func.count(Appeal.id))
        .group_by(Appeal.status)
    )
    by_status = {status: count for status, count in status_result.all()}
    
    # By type
    type_result = await db.execute(
        select(Appeal.appeal_type, func.count(Appeal.id))
        .group_by(Appeal.appeal_type)
    )
    by_type = {appeal_type: count for appeal_type, count in type_result.all()}
    
    return {
        "total": total,
        "by_status": by_status,
        "by_type": by_type
    }


@router.get("/{appeal_id}", response_model=AppealResponse)
async def get_appeal(
    appeal_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get appeal by ID"""
    result = await db.execute(select(Appeal).where(Appeal.id == appeal_id))
    appeal = result.scalar_one_or_none()
    
    if not appeal:
        raise NotFoundException("Appeal not found")
    
    return appeal


@router.post("/{appeal_id}/review", response_model=AppealResponse)
async def review_appeal(
    appeal_id: int,
    review_data: AppealReview,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Review an appeal (admin only) - handles reassignment and rework"""
    # Get appeal
    result = await db.execute(select(Appeal).where(Appeal.id == appeal_id))
    appeal = result.scalar_one_or_none()
    
    if not appeal:
        raise NotFoundException("Appeal not found")
    
    if appeal.status != AppealStatus.SUBMITTED and appeal.status != AppealStatus.UNDER_REVIEW:
        raise ValidationException("Appeal has already been reviewed")
    
    # Update basic appeal info
    appeal.status = review_data.status
    appeal.reviewed_by_user_id = current_user.id
    appeal.review_notes = review_data.review_notes
    appeal.action_taken = review_data.action_taken
    
    # Handle incorrect assignment appeal - reassignment
    if appeal.appeal_type == AppealType.INCORRECT_ASSIGNMENT and review_data.status == AppealStatus.APPROVED:
        if review_data.reassigned_to_user_id:
            appeal.reassigned_to_user_id = review_data.reassigned_to_user_id
            appeal.reassignment_reason = review_data.reassignment_reason
            
            # Update the report's task assignment
            from app.models.task import Task
            task_result = await db.execute(
                select(Task).where(Task.report_id == appeal.report_id)
            )
            task = task_result.scalar_one_or_none()
            if task:
                task.assigned_to = review_data.reassigned_to_user_id
                task.notes = f"Reassigned due to appeal: {review_data.reassignment_reason}"
        
        if review_data.reassigned_to_department_id:
            appeal.reassigned_to_department_id = review_data.reassigned_to_department_id
            
            # Update the report's department
            report_result = await db.execute(
                select(Report).where(Report.id == appeal.report_id)
            )
            report = report_result.scalar_one_or_none()
            if report:
                report.department_id = review_data.reassigned_to_department_id
    
    # Handle resolution quality appeal - rework
    if appeal.appeal_type == AppealType.RESOLUTION and review_data.status == AppealStatus.APPROVED:
        appeal.requires_rework = review_data.requires_rework or False
        if review_data.requires_rework:
            appeal.rework_assigned_to_user_id = review_data.rework_assigned_to_user_id
            appeal.rework_notes = review_data.rework_notes
            appeal.rework_completed = False
            
            # Update report status to REOPENED (not IN_PROGRESS) for rework
            report_result = await db.execute(
                select(Report).where(Report.id == appeal.report_id)
            )
            report = report_result.scalar_one_or_none()
            if report:
                from app.models.report import ReportStatus
                report.status = ReportStatus.REOPENED  # Use REOPENED status for appeal-based rework
                
                # Update task for rework
                from app.models.task import Task, TaskStatus
                task_result = await db.execute(
                    select(Task).where(Task.report_id == appeal.report_id)
                )
                task = task_result.scalar_one_or_none()
                if task:
                    if review_data.rework_assigned_to_user_id:
                        task.assigned_to = review_data.rework_assigned_to_user_id
                    task.status = TaskStatus.IN_PROGRESS
                    task.notes = f"REWORK REQUIRED: {review_data.rework_notes}"
    
    await db.commit()
    await db.refresh(appeal)
    
    # Audit logging
    action = AuditAction.APPEAL_APPROVED if review_data.status == AppealStatus.APPROVED else \
             AuditAction.APPEAL_REJECTED if review_data.status == AppealStatus.REJECTED else \
             AuditAction.APPEAL_REVIEWED
    
    await audit_logger.log(
        db=db,
        action=action,
        status=AuditStatus.SUCCESS,
        user=current_user,
        request=request,
        description=f"Reviewed appeal #{appeal_id} - {review_data.status.value}",
        metadata={
            "appeal_id": appeal_id,
            "report_id": appeal.report_id,
            "appeal_status": review_data.status.value,
            "review_notes": review_data.review_notes,
            "requires_rework": review_data.requires_rework
        },
        resource_type="appeal",
        resource_id=str(appeal_id)
    )
    
    # Send notifications
    try:
        from app.services.notification_service import NotificationService
        from app.models.report import Report
        notification_service = NotificationService(db)
        report_result = await db.execute(
            select(Report).where(Report.id == appeal.report_id)
        )
        report = report_result.scalar_one_or_none()
        if report:
            await notification_service.notify_appeal_reviewed(
                report=report,
                appeal_id=appeal.id,
                approved=(review_data.status == AppealStatus.APPROVED),
                review_notes=review_data.review_notes
            )
            await db.commit()
    except Exception as e:
        logger.error(f"Failed to send appeal review notifications: {str(e)}")
        # Don't fail the request if notifications fail
    
    return appeal


@router.post("/{appeal_id}/complete-rework", response_model=AppealResponse)
async def complete_rework(
    appeal_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark rework as complete (officer only)"""
    result = await db.execute(select(Appeal).where(Appeal.id == appeal_id))
    appeal = result.scalar_one_or_none()
    
    if not appeal:
        raise NotFoundException("Appeal not found")
    
    if not appeal.requires_rework:
        raise ValidationException("This appeal does not require rework")
    
    if appeal.rework_assigned_to_user_id != current_user.id:
        raise ValidationException("You are not assigned to this rework")
    
    if appeal.rework_completed:
        raise ValidationException("Rework already completed")
    
    # Mark rework as complete
    appeal.rework_completed = True
    
    # Update report status to PENDING_VERIFICATION
    report_result = await db.execute(
        select(Report).where(Report.id == appeal.report_id)
    )
    report = report_result.scalar_one_or_none()
    if report:
        from app.models.report import ReportStatus
        report.status = ReportStatus.PENDING_VERIFICATION
        
        # Update task status
        from app.models.task import Task, TaskStatus
        task_result = await db.execute(
            select(Task).where(Task.report_id == appeal.report_id)
        )
        task = task_result.scalar_one_or_none()
        if task:
            task.status = TaskStatus.RESOLVED
    
    await db.commit()
    await db.refresh(appeal)
    
    # Audit logging
    await audit_logger.log(
        db=db,
        action=AuditAction.APPEAL_REVIEWED,
        status=AuditStatus.SUCCESS,
        user=current_user,
        request=request,
        description=f"Completed rework for appeal #{appeal_id}",
        metadata={
            "appeal_id": appeal_id,
            "report_id": appeal.report_id
        },
        resource_type="appeal",
        resource_id=str(appeal_id)
    )
    
    return appeal


@router.delete("/{appeal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def withdraw_appeal(
    appeal_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Withdraw an appeal (submitter only)"""
    result = await db.execute(select(Appeal).where(Appeal.id == appeal_id))
    appeal = result.scalar_one_or_none()
    
    if not appeal:
        raise NotFoundException("Appeal not found")
    
    if appeal.submitted_by_user_id != current_user.id:
        raise ValidationException("You can only withdraw your own appeals")
    
    if appeal.status != AppealStatus.SUBMITTED:
        raise ValidationException("Can only withdraw submitted appeals")
    
    appeal.status = AppealStatus.WITHDRAWN
    await db.commit()
