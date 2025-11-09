"""
Notifications API Endpoints
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc

from app.core.database import get_db
from app.models.user import User
from app.models.notification import Notification
from app.core.dependencies import get_current_user
from app.core.exceptions import NotFoundException, ForbiddenException
from app.services.notification_service import NotificationService
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/notifications", tags=["Notifications"])


# Schemas
class NotificationResponse(BaseModel):
    id: int
    user_id: int
    type: str
    priority: str
    title: str
    message: str
    related_report_id: Optional[int]
    related_task_id: Optional[int]
    related_appeal_id: Optional[int]
    related_escalation_id: Optional[int]
    is_read: bool
    read_at: Optional[datetime]
    action_url: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class UnreadCountResponse(BaseModel):
    unread_count: int


class MarkReadResponse(BaseModel):
    success: bool
    message: str


class NotificationListResponse(BaseModel):
    notifications: List[NotificationResponse]
    total: int
    unread_count: int


# Endpoints
@router.get("/", response_model=NotificationListResponse)
async def get_notifications(
    unread_only: bool = Query(False, description="Show only unread notifications"),
    limit: int = Query(50, ge=1, le=100, description="Number of notifications to return"),
    offset: int = Query(0, ge=0, description="Number of notifications to skip"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get notifications for the current user
    """
    notification_service = NotificationService(db)
    
    # Get notifications
    notifications = await notification_service.get_user_notifications(
        user_id=current_user.id,
        unread_only=unread_only,
        limit=limit,
        offset=offset
    )
    
    # Get total count
    query = select(Notification).where(Notification.user_id == current_user.id)
    if unread_only:
        query = query.where(Notification.is_read == False)
    
    result = await db.execute(query)
    total = len(result.scalars().all())
    
    # Get unread count
    unread_count = await notification_service.get_unread_count(current_user.id)
    
    return NotificationListResponse(
        notifications=[NotificationResponse.model_validate(n) for n in notifications],
        total=total,
        unread_count=unread_count
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get count of unread notifications for the current user
    """
    notification_service = NotificationService(db)
    unread_count = await notification_service.get_unread_count(current_user.id)
    
    return UnreadCountResponse(unread_count=unread_count)


@router.get("/{notification_id}", response_model=NotificationResponse)
async def get_notification(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific notification
    """
    result = await db.execute(
        select(Notification).where(
            and_(
                Notification.id == notification_id,
                Notification.user_id == current_user.id
            )
        )
    )
    notification = result.scalar_one_or_none()
    
    if not notification:
        raise NotFoundException("Notification not found")
    
    return NotificationResponse.model_validate(notification)


@router.post("/{notification_id}/mark-read", response_model=MarkReadResponse)
async def mark_notification_as_read(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mark a notification as read
    """
    notification_service = NotificationService(db)
    success = await notification_service.mark_as_read(notification_id, current_user.id)
    
    if not success:
        raise NotFoundException("Notification not found")
    
    await db.commit()
    
    return MarkReadResponse(
        success=True,
        message="Notification marked as read"
    )


@router.post("/mark-all-read", response_model=MarkReadResponse)
async def mark_all_notifications_as_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mark all notifications as read for the current user
    """
    notification_service = NotificationService(db)
    count = await notification_service.mark_all_as_read(current_user.id)
    
    await db.commit()
    
    return MarkReadResponse(
        success=True,
        message=f"Marked {count} notifications as read"
    )


@router.delete("/{notification_id}", response_model=MarkReadResponse)
async def delete_notification(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a notification
    """
    result = await db.execute(
        select(Notification).where(
            and_(
                Notification.id == notification_id,
                Notification.user_id == current_user.id
            )
        )
    )
    notification = result.scalar_one_or_none()
    
    if not notification:
        raise NotFoundException("Notification not found")
    
    await db.delete(notification)
    await db.commit()
    
    return MarkReadResponse(
        success=True,
        message="Notification deleted"
    )


@router.delete("/", response_model=MarkReadResponse)
async def delete_all_read_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete all read notifications for the current user
    """
    result = await db.execute(
        select(Notification).where(
            and_(
                Notification.user_id == current_user.id,
                Notification.is_read == True
            )
        )
    )
    notifications = result.scalars().all()
    
    for notification in notifications:
        await db.delete(notification)
    
    await db.commit()
    
    return MarkReadResponse(
        success=True,
        message=f"Deleted {len(notifications)} read notifications"
    )
