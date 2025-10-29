"""
Escalations API endpoints
"""
from fastapi import APIRouter, Depends, Query, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional, List
from datetime import datetime, timedelta

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.exceptions import NotFoundException, ValidationException
from app.core.audit_logger import audit_logger
from app.models.user import User
from app.models.escalation import Escalation, EscalationLevel, EscalationReason, EscalationStatus
from app.models.report import Report
from app.models.audit_log import AuditAction, AuditStatus
from pydantic import BaseModel


router = APIRouter(prefix="/escalations", tags=["Escalations"])


# Schemas
class EscalationCreate(BaseModel):
    report_id: int
    level: EscalationLevel
    reason: EscalationReason
    description: str
    previous_actions: Optional[str] = None
    urgency_notes: Optional[str] = None
    escalated_to_user_id: Optional[int] = None
    sla_hours: Optional[int] = 24  # Default 24 hours


class EscalationUpdate(BaseModel):
    status: EscalationStatus
    response_notes: Optional[str] = None
    action_taken: Optional[str] = None


class EscalationResponse(BaseModel):
    id: int
    report_id: int
    escalated_by_user_id: int
    escalated_to_user_id: Optional[int]
    level: str
    reason: str
    status: str
    description: str
    previous_actions: Optional[str]
    urgency_notes: Optional[str]
    acknowledged_at: Optional[datetime]
    response_notes: Optional[str]
    action_taken: Optional[str]
    resolved_at: Optional[datetime]
    sla_deadline: Optional[datetime]
    is_overdue: bool
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# Endpoints
@router.post("/", response_model=EscalationResponse, status_code=status.HTTP_201_CREATED)
async def create_escalation(
    escalation_data: EscalationCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Escalate a report"""
    # Verify report exists
    result = await db.execute(select(Report).where(Report.id == escalation_data.report_id))
    report = result.scalar_one_or_none()
    
    if not report:
        raise NotFoundException("Report not found")
    
    # Calculate SLA deadline
    sla_deadline = datetime.utcnow() + timedelta(hours=escalation_data.sla_hours)
    
    # Create escalation
    escalation = Escalation(
        report_id=escalation_data.report_id,
        escalated_by_user_id=current_user.id,
        escalated_to_user_id=escalation_data.escalated_to_user_id,
        level=escalation_data.level,
        reason=escalation_data.reason,
        description=escalation_data.description,
        previous_actions=escalation_data.previous_actions,
        urgency_notes=escalation_data.urgency_notes,
        status=EscalationStatus.ESCALATED,
        sla_deadline=sla_deadline,
        is_overdue=False
    )
    
    db.add(escalation)
    await db.commit()
    await db.refresh(escalation)
    
    # Audit logging
    await audit_logger.log(
        db=db,
        action=AuditAction.ESCALATION_CREATED,
        status=AuditStatus.SUCCESS,
        user=current_user,
        request=request,
        description=f"Escalated report #{report.id} to {escalation.level.value}",
        metadata={
            "escalation_id": escalation.id,
            "report_id": report.id,
            "level": escalation.level.value,
            "reason": escalation.reason.value,
            "sla_hours": escalation_data.sla_hours
        },
        resource_type="escalation",
        resource_id=str(escalation.id)
    )
    
    return escalation


@router.get("/", response_model=List[EscalationResponse])
async def get_escalations(
    status: Optional[EscalationStatus] = None,
    level: Optional[EscalationLevel] = None,
    is_overdue: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all escalations with filters"""
    query = select(Escalation).order_by(Escalation.created_at.desc())
    
    if status:
        query = query.where(Escalation.status == status)
    if level:
        query = query.where(Escalation.level == level)
    if is_overdue is not None:
        query = query.where(Escalation.is_overdue == is_overdue)
    
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    escalations = result.scalars().all()
    
    return escalations


@router.get("/stats")
async def get_escalation_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get escalation statistics"""
    # Total escalations
    total_result = await db.execute(select(func.count(Escalation.id)))
    total = total_result.scalar()
    
    # By level
    level_result = await db.execute(
        select(Escalation.level, func.count(Escalation.id))
        .group_by(Escalation.level)
    )
    by_level = {level: count for level, count in level_result.all()}
    
    # By status
    status_result = await db.execute(
        select(Escalation.status, func.count(Escalation.id))
        .group_by(Escalation.status)
    )
    by_status = {status: count for status, count in status_result.all()}
    
    # Overdue count
    overdue_result = await db.execute(
        select(func.count(Escalation.id))
        .where(Escalation.is_overdue == True)
    )
    overdue = overdue_result.scalar()
    
    return {
        "total": total,
        "by_level": by_level,
        "by_status": by_status,
        "overdue": overdue
    }


@router.get("/{escalation_id}", response_model=EscalationResponse)
async def get_escalation(
    escalation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get escalation by ID"""
    result = await db.execute(select(Escalation).where(Escalation.id == escalation_id))
    escalation = result.scalar_one_or_none()
    
    if not escalation:
        raise NotFoundException("Escalation not found")
    
    return escalation


@router.post("/{escalation_id}/acknowledge", response_model=EscalationResponse)
async def acknowledge_escalation(
    escalation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Acknowledge an escalation"""
    result = await db.execute(select(Escalation).where(Escalation.id == escalation_id))
    escalation = result.scalar_one_or_none()
    
    if not escalation:
        raise NotFoundException("Escalation not found")
    
    if escalation.status != EscalationStatus.ESCALATED:
        raise ValidationException("Escalation already acknowledged")
    
    escalation.status = EscalationStatus.ACKNOWLEDGED
    escalation.acknowledged_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(escalation)
    
    return escalation


@router.post("/{escalation_id}/update", response_model=EscalationResponse)
async def update_escalation(
    escalation_id: int,
    update_data: EscalationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update escalation status"""
    result = await db.execute(select(Escalation).where(Escalation.id == escalation_id))
    escalation = result.scalar_one_or_none()
    
    if not escalation:
        raise NotFoundException("Escalation not found")
    
    escalation.status = update_data.status
    escalation.response_notes = update_data.response_notes
    escalation.action_taken = update_data.action_taken
    
    if update_data.status == EscalationStatus.RESOLVED:
        escalation.resolved_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(escalation)
    
    return escalation


@router.post("/check-overdue", status_code=status.HTTP_200_OK)
async def check_overdue_escalations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Check and mark overdue escalations (admin/system task)"""
    # Find escalations past deadline
    result = await db.execute(
        select(Escalation)
        .where(
            Escalation.sla_deadline < datetime.utcnow(),
            Escalation.is_overdue == False,
            Escalation.status.in_([EscalationStatus.ESCALATED, EscalationStatus.ACKNOWLEDGED, EscalationStatus.UNDER_REVIEW])
        )
    )
    escalations = result.scalars().all()
    
    count = 0
    for escalation in escalations:
        escalation.is_overdue = True
        count += 1
    
    await db.commit()
    
    return {"marked_overdue": count}
