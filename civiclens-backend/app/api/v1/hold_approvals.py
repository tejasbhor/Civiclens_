"""
Hold Approval API endpoints - Admin approval for extended holds
"""
from fastapi import APIRouter, Depends, status, Request, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from datetime import datetime, timedelta

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.exceptions import NotFoundException, ValidationException, ForbiddenException
from app.core.audit_logger import audit_logger
from app.models.user import User, UserRole
from app.models.report import Report, ReportStatus
from app.models.task import Task, TaskStatus
from app.models.audit_log import AuditAction, AuditStatus
from app.services.notification_service import NotificationService
from pydantic import BaseModel


router = APIRouter(prefix="/hold-approvals", tags=["Hold Approvals"])


# Schemas
class HoldApprovalRequest(BaseModel):
    approved: bool
    approval_notes: Optional[str] = None
    extended_duration_days: Optional[int] = None  # If approved, extend by N days


class HoldApprovalResponse(BaseModel):
    report_id: int
    task_id: int
    hold_reason: str
    hold_duration_days: int
    approval_required: bool
    approved: Optional[bool]
    approved_by_user_id: Optional[int]
    approval_notes: Optional[str]
    approved_at: Optional[datetime]


@router.get("/pending", response_model=list[HoldApprovalResponse])
async def get_pending_hold_approvals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all reports on hold that require admin approval
    Admin access only
    """
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise ForbiddenException("Admin access required")
    
    # Query reports on hold for >7 days or explicitly requiring approval
    cutoff_date = datetime.utcnow() - timedelta(days=7)
    
    result = await db.execute(
        select(Report, Task).join(
            Task, Task.report_id == Report.id
        ).where(
            Report.status == ReportStatus.ON_HOLD,
            (
                (Report.updated_at < cutoff_date) |  # On hold for >7 days
                (Report.hold_approval_required == True)  # Explicitly requires approval
            )
        )
    )
    
    pending_holds = []
    for report, task in result.all():
        hold_duration = (datetime.utcnow() - report.updated_at).days
        
        pending_holds.append({
            "report_id": report.id,
            "task_id": task.id,
            "hold_reason": task.hold_reason or report.hold_reason or "No reason provided",
            "hold_duration_days": hold_duration,
            "approval_required": True,
            "approved": report.hold_approved_by_user_id is not None,
            "approved_by_user_id": report.hold_approved_by_user_id,
            "approval_notes": None,  # Would need separate table for this
            "approved_at": None  # Would need separate field
        })
    
    return pending_holds


@router.post("/{report_id}/approve", status_code=status.HTTP_200_OK)
async def approve_hold(
    report_id: int,
    approval_data: HoldApprovalRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Admin approves or rejects a hold request
    - If approved: Mark approved, optionally extend duration
    - If rejected: Resume work immediately
    """
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise ForbiddenException("Admin access required")
    
    # Get report and task
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    
    if not report:
        raise NotFoundException("Report not found")
    
    if report.status != ReportStatus.ON_HOLD:
        raise ValidationException("Report is not on hold")
    
    # Get task
    task_result = await db.execute(select(Task).where(Task.report_id == report_id))
    task = task_result.scalar_one_or_none()
    
    if not task:
        raise NotFoundException("Task not found")
    
    notification_service = NotificationService(db)
    
    if approval_data.approved:
        # APPROVE: Mark approved and extend if needed
        report.hold_approved_by_user_id = current_user.id
        report.hold_approval_required = False
        
        # Extend estimated resume date if specified
        if approval_data.extended_duration_days:
            if task.estimated_resume_date:
                task.estimated_resume_date += timedelta(days=approval_data.extended_duration_days)
            else:
                task.estimated_resume_date = datetime.utcnow() + timedelta(
                    days=approval_data.extended_duration_days
                )
        
        # Add approval note to task
        approval_note = approval_data.approval_notes or "Hold approved by admin"
        task.notes = f"{task.notes}\n[HOLD APPROVED] {approval_note}" if task.notes else f"[HOLD APPROVED] {approval_note}"
        
        await db.flush()
        
        # Audit log
        await audit_logger.log(
            db=db,
            user_id=current_user.id,
            action=AuditAction.REPORT_STATUS_CHANGED,
            resource_type="report",
            resource_id=report_id,
            details={
                "action": "hold_approved",
                "notes": approval_note,
                "extended_days": approval_data.extended_duration_days
            },
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            status=AuditStatus.SUCCESS
        )
        
        # Notify officer
        await notification_service.create_notification(
            user_id=task.assigned_to,
            type="hold_approved",
            title=f"Hold Approved: Report #{report.report_number}",
            message=f"Your hold request has been approved. {approval_note}",
            priority="normal",
            related_report_id=report.id,
            related_task_id=task.id,
            action_url=f"/tasks/{task.id}"
        )
        
        # Notify citizen
        await notification_service.create_notification(
            user_id=report.user_id,
            type="hold_approved",
            title=f"Hold Status Update: Report #{report.report_number}",
            message=f"The hold on your report has been approved by administration.",
            priority="normal",
            related_report_id=report.id,
            action_url=f"/reports/{report.id}"
        )
        
        await db.commit()
        
        return {
            "status": "approved",
            "message": "Hold approved successfully",
            "report_id": report_id
        }
    
    else:
        # REJECT: Resume work immediately
        from app.services.report_service import ReportService
        report_service = ReportService(db)
        
        # Update status back to IN_PROGRESS
        updated = await report_service.update_status(
            report_id=report_id,
            new_status=ReportStatus.IN_PROGRESS,
            user_id=current_user.id,
            notes=f"Hold rejected by admin: {approval_data.approval_notes or 'No reason provided'}. Work must resume immediately."
        )
        
        # Update task
        task.status = TaskStatus.IN_PROGRESS
        task.hold_reason = None
        task.estimated_resume_date = None
        task.hold_approval_required = False
        
        rejection_note = approval_data.approval_notes or "Hold rejected - resume work immediately"
        task.notes = f"{task.notes}\n[HOLD REJECTED] {rejection_note}" if task.notes else f"[HOLD REJECTED] {rejection_note}"
        
        await db.flush()
        
        # Audit log
        await audit_logger.log(
            db=db,
            user_id=current_user.id,
            action=AuditAction.REPORT_STATUS_CHANGED,
            resource_type="report",
            resource_id=report_id,
            details={
                "action": "hold_rejected",
                "notes": rejection_note,
                "previous_status": "on_hold",
                "new_status": "in_progress"
            },
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            status=AuditStatus.SUCCESS
        )
        
        # Notify officer (high priority - work must resume)
        await notification_service.create_notification(
            user_id=task.assigned_to,
            type="hold_rejected",
            title=f"⚠️ Hold Rejected: Report #{report.report_number}",
            message=f"Your hold request has been rejected. {rejection_note}",
            priority="high",
            related_report_id=report.id,
            related_task_id=task.id,
            action_url=f"/tasks/{task.id}"
        )
        
        # Notify citizen
        await notification_service.create_notification(
            user_id=report.user_id,
            type="hold_rejected",
            title=f"Work Resuming: Report #{report.report_number}",
            message=f"Work on your report is resuming.",
            priority="normal",
            related_report_id=report.id,
            action_url=f"/reports/{report.id}"
        )
        
        await db.commit()
        
        return {
            "status": "rejected",
            "message": "Hold rejected - work resumed",
            "report_id": report_id
        }


@router.post("/{report_id}/request-approval")
async def request_hold_approval(
    report_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Officer explicitly requests admin approval for hold
    """
    # Get report
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    
    if not report:
        raise NotFoundException("Report not found")
    
    if report.status != ReportStatus.ON_HOLD:
        raise ValidationException("Report must be on hold to request approval")
    
    # Get task
    task_result = await db.execute(select(Task).where(Task.report_id == report_id))
    task = task_result.scalar_one_or_none()
    
    if not task or task.assigned_to != current_user.id:
        raise ForbiddenException("Not authorized")
    
    # Mark as requiring approval
    report.hold_approval_required = True
    
    await db.flush()
    
    # Audit log
    await audit_logger.log(
        db=db,
        user_id=current_user.id,
        action=AuditAction.REPORT_STATUS_CHANGED,
        resource_type="report",
        resource_id=report_id,
        details={
            "action": "hold_approval_requested",
            "hold_reason": task.hold_reason
        },
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        status=AuditStatus.SUCCESS
    )
    
    # Notify admins
    notification_service = NotificationService(db)
    admin_ids = await notification_service.get_admin_user_ids()
    
    for admin_id in admin_ids:
        await notification_service.create_notification(
            user_id=admin_id,
            type="hold_approval_requested",
            title=f"Hold Approval Needed: Report #{report.report_number}",
            message=f"Officer {current_user.full_name} requests approval for extended hold. Reason: {task.hold_reason}",
            priority="high",
            related_report_id=report.id,
            related_task_id=task.id,
            action_url=f"/admin/hold-approvals/{report.id}"
        )
    
    await db.commit()
    
    return {
        "status": "requested",
        "message": "Hold approval requested successfully",
        "report_id": report_id
    }
