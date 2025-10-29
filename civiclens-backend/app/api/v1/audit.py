"""
Audit Log API endpoints
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.audit_log import AuditLog, AuditAction
from app.models.user import User
from pydantic import BaseModel


router = APIRouter(prefix="/audit", tags=["Audit"])


# Schemas
class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int]
    user_role: Optional[str]
    action: str
    status: str
    timestamp: datetime
    ip_address: Optional[str]
    user_agent: Optional[str]
    description: Optional[str]
    extra_data: Optional[dict]
    resource_type: Optional[str]
    resource_id: Optional[str]
    
    class Config:
        from_attributes = True


@router.get("/resource/{resource_type}/{resource_id}", response_model=List[AuditLogResponse])
async def get_resource_audit_trail(
    resource_type: str,
    resource_id: str,
    limit: int = Query(100, ge=1, le=500),
    action: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get audit trail for a specific resource
    
    Args:
        resource_type: Type of resource (e.g., 'report', 'user', 'escalation')
        resource_id: ID of the resource
        limit: Maximum number of logs to return
        action: Optional filter by action type
    """
    query = (
        select(AuditLog)
        .where(AuditLog.resource_type == resource_type)
        .where(AuditLog.resource_id == resource_id)
        .order_by(AuditLog.timestamp.desc())
        .limit(limit)
    )
    
    # Optional filter by action
    if action:
        query = query.where(AuditLog.action == action)
    
    result = await db.execute(query)
    logs = result.scalars().all()
    
    return logs


@router.get("/user/{user_id}", response_model=List[AuditLogResponse])
async def get_user_audit_trail(
    user_id: int,
    limit: int = Query(100, ge=1, le=500),
    action: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get audit trail for a specific user's actions
    
    Args:
        user_id: ID of the user
        limit: Maximum number of logs to return
        action: Optional filter by action type
    """
    query = (
        select(AuditLog)
        .where(AuditLog.user_id == user_id)
        .order_by(AuditLog.timestamp.desc())
        .limit(limit)
    )
    
    # Optional filter by action
    if action:
        query = query.where(AuditLog.action == action)
    
    result = await db.execute(query)
    logs = result.scalars().all()
    
    return logs


@router.get("/recent", response_model=List[AuditLogResponse])
async def get_recent_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get recent audit logs across the system
    
    Args:
        limit: Maximum number of logs to return
        action: Optional filter by action type
        resource_type: Optional filter by resource type
    """
    query = select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit)
    
    # Optional filters
    if action:
        query = query.where(AuditLog.action == action)
    if resource_type:
        query = query.where(AuditLog.resource_type == resource_type)
    
    result = await db.execute(query)
    logs = result.scalars().all()
    
    return logs


@router.get("/actions", response_model=List[str])
async def get_available_actions(
    current_user: User = Depends(get_current_user)
):
    """Get list of all available audit action types"""
    return [action.value for action in AuditAction]
