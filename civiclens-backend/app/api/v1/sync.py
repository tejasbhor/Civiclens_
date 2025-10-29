"""
Sync API Endpoints for Offline-First Mobile App
Handles batch uploads, incremental downloads, and conflict resolution
"""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.exceptions import ValidationException, NotFoundException
from app.models.user import User
from app.models.sync import ClientSyncState, SyncConflict, OfflineAction
from app.models.report import Report
from app.crud.report import report_crud
from app.crud.user import user_crud

router = APIRouter(prefix="/sync", tags=["Offline Sync"])


# ============================================================================
# Pydantic Schemas
# ============================================================================

class SyncAction(BaseModel):
    """Single sync action from client"""
    client_id: str = Field(..., description="Client-generated UUID")
    action_type: str = Field(..., description="create_report, update_profile, etc.")
    entity_type: str = Field(..., description="report, user, task, etc.")
    timestamp: datetime = Field(..., description="Client timestamp")
    data: Dict[str, Any] = Field(..., description="Action payload")
    priority: int = Field(default=0, description="Action priority")


class BatchUploadRequest(BaseModel):
    """Batch upload request from client"""
    device_id: str = Field(..., description="Unique device identifier")
    last_sync_timestamp: Optional[datetime] = Field(None, description="Last successful sync")
    actions: List[SyncAction] = Field(..., description="List of offline actions")


class ActionResult(BaseModel):
    """Result of processing a single action"""
    client_id: str
    status: str  # success, failed, conflict
    server_id: Optional[int] = None
    message: str
    error: Optional[str] = None


class BatchUploadResponse(BaseModel):
    """Response for batch upload"""
    success: bool
    results: List[ActionResult]
    conflicts: List[Dict[str, Any]]
    sync_timestamp: datetime


class IncrementalDownloadResponse(BaseModel):
    """Response for incremental download"""
    success: bool
    data: Dict[str, List[Dict[str, Any]]]
    sync_timestamp: datetime
    has_more: bool


# ============================================================================
# Sync Endpoints
# ============================================================================

@router.post("/upload", response_model=BatchUploadResponse)
async def batch_upload(
    request: BatchUploadRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Batch upload offline actions from mobile client
    Processes all pending actions and returns results
    """
    results = []
    conflicts = []
    
    # Get or create sync state
    sync_state = await get_or_create_sync_state(db, current_user.id, request.device_id)
    
    # Process each action
    for action in request.actions:
        try:
            result = await process_sync_action(
                db=db,
                user=current_user,
                device_id=request.device_id,
                action=action,
                sync_state=sync_state
            )
            results.append(result)
            
            # Check for conflicts
            if result.status == "conflict":
                conflicts.append({
                    "client_id": action.client_id,
                    "entity_type": action.entity_type,
                    "message": result.message
                })
        
        except Exception as e:
            results.append(ActionResult(
                client_id=action.client_id,
                status="failed",
                message="Processing failed",
                error=str(e)
            ))
    
    # Update sync state
    sync_state.last_upload_timestamp = datetime.utcnow()
    sync_state.last_sync_timestamp = datetime.utcnow()
    await db.commit()
    
    return BatchUploadResponse(
        success=True,
        results=results,
        conflicts=conflicts,
        sync_timestamp=datetime.utcnow()
    )


@router.get("/download", response_model=IncrementalDownloadResponse)
async def incremental_download(
    device_id: str = Query(..., description="Device identifier"),
    since: Optional[datetime] = Query(None, description="Get changes since this timestamp"),
    limit: int = Query(100, ge=1, le=500, description="Max items per entity type"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Incremental download of changes since last sync
    Returns only data that changed after 'since' timestamp
    """
    # Get sync state
    sync_state = await get_or_create_sync_state(db, current_user.id, device_id)
    
    # Use last sync timestamp if 'since' not provided
    if not since:
        since = sync_state.last_download_timestamp or datetime.now(timezone.utc) - timedelta(days=30)
    else:
        # Ensure 'since' is timezone-aware (UTC)
        if since.tzinfo is None:
            since = since.replace(tzinfo=timezone.utc)
    
    data = {}
    
    # Get updated reports
    reports_query = select(Report).where(
        and_(
            Report.user_id == current_user.id,
            Report.updated_at > since
        )
    ).limit(limit)
    
    reports_result = await db.execute(reports_query)
    reports = reports_result.scalars().all()
    
    data["reports"] = [
        {
            "id": r.id,
            "title": r.title,
            "description": r.description,
            "category": r.category,
            "status": r.status.value if hasattr(r.status, 'value') else str(r.status),
            "severity": r.severity.value if hasattr(r.severity, 'value') else str(r.severity),
            "latitude": r.latitude,
            "longitude": r.longitude,
            "address": r.address,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None
        }
        for r in reports
    ]
    
    # Get user profile updates
    if current_user.updated_at and current_user.updated_at > since:
        data["profile"] = [{
            "id": current_user.id,
            "full_name": current_user.full_name,
            "email": current_user.email,
            "reputation_score": current_user.reputation_score,
            "profile_completion": current_user.profile_completion.value,
            "updated_at": current_user.updated_at.isoformat()
        }]
    
    # TODO: Add tasks, notifications, etc.
    
    # Update sync state with timezone-aware timestamps
    now_utc = datetime.now(timezone.utc)
    sync_state.last_download_timestamp = now_utc
    sync_state.last_sync_timestamp = now_utc
    await db.commit()
    
    return IncrementalDownloadResponse(
        success=True,
        data=data,
        sync_timestamp=now_utc,
        has_more=len(reports) >= limit  # Simple pagination check
    )


@router.get("/status")
async def get_sync_status(
    device_id: str = Query(..., description="Device identifier"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get sync status for a device"""
    sync_state = await get_or_create_sync_state(db, current_user.id, device_id)
    
    # Count pending offline actions
    pending_actions_result = await db.execute(
        select(OfflineAction).where(
            and_(
                OfflineAction.user_id == current_user.id,
                OfflineAction.device_id == device_id,
                OfflineAction.processed == False
            )
        )
    )
    pending_actions = pending_actions_result.scalars().all()
    
    # Count unresolved conflicts
    conflicts_result = await db.execute(
        select(SyncConflict).where(
            and_(
                SyncConflict.user_id == current_user.id,
                SyncConflict.device_id == device_id,
                SyncConflict.resolved == False
            )
        )
    )
    conflicts = conflicts_result.scalars().all()
    
    return {
        "device_id": device_id,
        "last_sync": sync_state.last_sync_timestamp.isoformat() if sync_state.last_sync_timestamp else None,
        "last_upload": sync_state.last_upload_timestamp.isoformat() if sync_state.last_upload_timestamp else None,
        "last_download": sync_state.last_download_timestamp.isoformat() if sync_state.last_download_timestamp else None,
        "pending_uploads": len(pending_actions),
        "conflicts": len(conflicts),
        "sync_health": "good" if len(conflicts) == 0 else "conflicts_detected"
    }


@router.get("/conflicts")
async def get_conflicts(
    device_id: str = Query(..., description="Device identifier"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all unresolved conflicts for a device"""
    result = await db.execute(
        select(SyncConflict).where(
            and_(
                SyncConflict.user_id == current_user.id,
                SyncConflict.device_id == device_id,
                SyncConflict.resolved == False
            )
        )
    )
    conflicts = result.scalars().all()
    
    return {
        "conflicts": [
            {
                "id": c.id,
                "entity_type": c.entity_type,
                "entity_id": c.entity_id,
                "client_version": c.client_version,
                "server_version": c.server_version,
                "created_at": c.created_at.isoformat() if c.created_at else None
            }
            for c in conflicts
        ]
    }


@router.post("/resolve-conflict")
async def resolve_conflict(
    conflict_id: int,
    resolution: str = Query(..., description="server_wins, client_wins, or merge"),
    merged_data: Optional[Dict[str, Any]] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Resolve a sync conflict"""
    # Get conflict
    result = await db.execute(
        select(SyncConflict).where(
            and_(
                SyncConflict.id == conflict_id,
                SyncConflict.user_id == current_user.id
            )
        )
    )
    conflict = result.scalar_one_or_none()
    
    if not conflict:
        raise NotFoundException("Conflict not found")
    
    # Apply resolution
    if resolution == "server_wins":
        resolved_data = conflict.server_version
    elif resolution == "client_wins":
        resolved_data = conflict.client_version
    elif resolution == "merge":
        if not merged_data:
            raise ValidationException("Merged data required for merge resolution")
        resolved_data = merged_data
    else:
        raise ValidationException("Invalid resolution strategy")
    
    # Update conflict
    conflict.resolved = True
    conflict.resolved_at = datetime.utcnow()
    conflict.resolution_strategy = resolution
    conflict.resolved_data = resolved_data
    
    await db.commit()
    
    return {
        "success": True,
        "conflict_id": conflict_id,
        "resolution": resolution,
        "resolved_data": resolved_data
    }


# ============================================================================
# Helper Functions
# ============================================================================

async def get_or_create_sync_state(
    db: AsyncSession,
    user_id: int,
    device_id: str
) -> ClientSyncState:
    """Get or create sync state for a device"""
    result = await db.execute(
        select(ClientSyncState).where(
            and_(
                ClientSyncState.user_id == user_id,
                ClientSyncState.device_id == device_id
            )
        )
    )
    sync_state = result.scalar_one_or_none()
    
    if not sync_state:
        sync_state = ClientSyncState(
            user_id=user_id,
            device_id=device_id,
            sync_version=1
        )
        db.add(sync_state)
        await db.commit()
        await db.refresh(sync_state)
    
    return sync_state


async def process_sync_action(
    db: AsyncSession,
    user: User,
    device_id: str,
    action: SyncAction,
    sync_state: ClientSyncState
) -> ActionResult:
    """Process a single sync action"""
    
    # Log the action
    offline_action = OfflineAction(
        user_id=user.id,
        device_id=device_id,
        action_type=action.action_type,
        entity_type=action.entity_type,
        entity_id=action.client_id,
        payload=action.data,
        priority=action.priority
    )
    db.add(offline_action)
    
    try:
        # Route to appropriate handler
        if action.action_type == "create_report":
            result = await handle_create_report(db, user, action)
        elif action.action_type == "update_profile":
            result = await handle_update_profile(db, user, action)
        else:
            result = ActionResult(
                client_id=action.client_id,
                status="failed",
                message=f"Unknown action type: {action.action_type}"
            )
        
        # Mark action as processed
        offline_action.processed = True
        offline_action.processed_at = datetime.utcnow()
        offline_action.result = result.dict()
        
        await db.commit()
        return result
    
    except Exception as e:
        offline_action.error_message = str(e)
        offline_action.retry_count += 1
        await db.commit()
        raise


async def handle_create_report(
    db: AsyncSession,
    user: User,
    action: SyncAction
) -> ActionResult:
    """Handle create report action"""
    from app.schemas.report import ReportCreateInternal
    
    # Create report
    report_data = action.data
    report_data['user_id'] = user.id
    
    report = await report_crud.create(db, ReportCreateInternal(**report_data))
    
    # Update user reputation
    await user_crud.update_reputation(db, user.id, 5)
    
    return ActionResult(
        client_id=action.client_id,
        status="success",
        server_id=report.id,
        message="Report created successfully"
    )


async def handle_update_profile(
    db: AsyncSession,
    user: User,
    action: SyncAction
) -> ActionResult:
    """Handle update profile action"""
    from app.schemas.user import UserProfileUpdate
    
    # Update profile
    profile_data = UserProfileUpdate(**action.data)
    await user_crud.update_profile(db, user.id, profile_data)
    
    return ActionResult(
        client_id=action.client_id,
        status="success",
        message="Profile updated successfully"
    )
