from fastapi import APIRouter, Depends, Query, status, Request, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.core.database import get_db, get_redis
from app.core.dependencies import get_current_user_optional, get_current_user
from app.core.exceptions import NotFoundException, ForbiddenException, ValidationException
from app.core.audit_logger import audit_logger
from app.models.audit_log import AuditAction, AuditStatus
from app.services.report_service import ReportService, get_report_service
from app.schemas.report import (
    ReportCreate, ReportCreateInternal, ReportUpdate,
    ReportResponse, ReportWithDetails,
    StatusUpdateRequest, StatusHistoryResponse, StatusHistoryItem,
)
from app.schemas.common import PaginatedResponse
from app.models.user import User
from app.models.report import ReportStatus, ReportSeverity
from app.crud.report import report_crud
from app.crud.user import user_crud
from app.config import settings
from pydantic import BaseModel, Field
from app.models.task import Task, TaskStatus
from sqlalchemy import select
from app.models.report_status_history import ReportStatusHistory
from datetime import datetime
from app.models.department import Department
import logging

logger = logging.getLogger(__name__)


def serialize_report_with_details(report) -> dict:
    """Helper function to serialize a report with its relationships"""
    payload = {
        "id": report.id,
        "report_number": getattr(report, "report_number", None),
        "user_id": report.user_id,
        "department_id": getattr(report, "department_id", None),
        "category": getattr(report, "category", None),
        "sub_category": getattr(report, "sub_category", None),
        "status": report.status,
        "severity": report.severity,
        "is_public": bool(getattr(report, "is_public", True)),
        "created_at": report.created_at,
        "updated_at": report.updated_at,
        "title": report.title,
        "description": report.description,
        "latitude": report.latitude,
        "longitude": report.longitude,
        "address": report.address,
        "classification_notes": getattr(report, "classification_notes", None),
        "classified_by_user_id": getattr(report, "classified_by_user_id", None),
        # Nested relationships
        "user": None,
        "department": None,
        "task": None,
    }

    # Add user (limited fields)
    try:
        u = getattr(report, "user", None)
        if u:
            payload["user"] = {
                "id": u.id,
                "full_name": getattr(u, "full_name", None),
                "phone": getattr(u, "phone", None),
                "role": getattr(u, "role", None).value if getattr(u, "role", None) and hasattr(u.role, "value") else str(getattr(u, "role", None)) if getattr(u, "role", None) else None,
            }
    except Exception:
        pass

    # Add department (limited fields)
    try:
        d = getattr(report, "department", None)
        if d:
            payload["department"] = {
                "id": d.id,
                "name": getattr(d, "name", None),
            }
    except Exception:
        pass

    # Add task (with officer details)
    try:
        t = getattr(report, "task", None)
        if t:
            payload["task"] = {
                "id": t.id,
                "status": getattr(t, "status", None).value if getattr(t, "status", None) and hasattr(t.status, "value") else str(getattr(t, "status", None)) if getattr(t, "status", None) else None,
                "assigned_to": getattr(t, "assigned_to", None),
                "assigned_by": getattr(t, "assigned_by", None),
                "priority": getattr(t, "priority", None),
                "notes": getattr(t, "notes", None),
                "assigned_at": t.assigned_at.isoformat() if getattr(t, "assigned_at", None) else None,
                "acknowledged_at": t.acknowledged_at.isoformat() if getattr(t, "acknowledged_at", None) else None,
                "started_at": t.started_at.isoformat() if getattr(t, "started_at", None) else None,
                "resolved_at": t.resolved_at.isoformat() if getattr(t, "resolved_at", None) else None,
                "officer": None,
            }
            
            # Add officer details if loaded
            officer = getattr(t, "officer", None)
            if officer:
                payload["task"]["officer"] = {
                    "id": officer.id,
                    "full_name": getattr(officer, "full_name", None),
                    "email": getattr(officer, "email", None),
                    "phone": getattr(officer, "phone", None),
                    "employee_id": getattr(officer, "employee_id", None),
                    "role": getattr(officer, "role", None).value if getattr(officer, "role", None) and hasattr(officer.role, "value") else str(getattr(officer, "role", None)) if getattr(officer, "role", None) else None,
                }
    except Exception as e:
        logger.warning(f"Failed to serialize task for report {report.id}: {e}")
        pass

    # Add media files - skip if not already loaded to avoid async issues
    try:
        # Check if media is already loaded (not a lazy loader)
        if hasattr(report, '__dict__') and 'media' in report.__dict__:
            media_list = report.__dict__['media']
            if media_list:
                payload["media"] = []
                for media in media_list:
                    try:
                        payload["media"].append({
                            "id": media.id,
                            "file_url": media.file_url,
                            "file_type": media.file_type.value if hasattr(media.file_type, 'value') else str(media.file_type),
                            "file_size": getattr(media, "file_size", None),
                            "mime_type": getattr(media, "mime_type", None),
                            "is_primary": getattr(media, "is_primary", False),
                            "caption": getattr(media, "caption", None),
                            "upload_source": media.upload_source.value if getattr(media, "upload_source", None) and hasattr(media.upload_source, 'value') else str(getattr(media, "upload_source", None)) if getattr(media, "upload_source", None) else None,
                            "created_at": media.created_at.isoformat() if getattr(media, "created_at", None) else None,
                        })
                    except Exception as media_err:
                        logger.warning(f"Failed to serialize individual media item: {media_err}")
                        continue
            else:
                payload["media"] = []
        else:
            # Media not loaded, set empty array
            payload["media"] = []
    except Exception as e:
        # Log the error but don't fail the whole response
        logger.warning(f"Failed to serialize media for report {report.id}: {e}")
        payload["media"] = []

    return payload

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.post("/", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(
    report_data: ReportCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Create a new report with comprehensive validation and error handling
    Production-ready endpoint with detailed logging and validation
    """
    logger.info(f"Report creation request received from user: {current_user.id if current_user else 'Anonymous'}")
    logger.info(f"Report data: {report_data.model_dump()}")
    
    # Authentication validation
    if not current_user:
        logger.warning("Unauthenticated report creation attempt")
        from app.core.exceptions import UnauthorizedException
        raise UnauthorizedException("Authentication required to create reports")

    # Authorization validation
    if not current_user.can_report():
        logger.warning(f"User {current_user.id} attempted to create report without permission")
        raise ForbiddenException("User cannot create reports")

    try:
        # Enhanced data validation
        report_dict = report_data.model_dump()
        report_dict['user_id'] = current_user.id
        
        # Validate coordinates are within reasonable bounds for India
        lat, lng = report_dict['latitude'], report_dict['longitude']
        if not (6.0 <= lat <= 37.0 and 68.0 <= lng <= 97.0):
            logger.warning(f"Invalid coordinates for India: {lat}, {lng}")
            raise ValidationException(
                f"Coordinates ({lat:.6f}, {lng:.6f}) appear to be outside India. "
                "Please verify your location or enter coordinates manually."
            )
        
        # Validate title and description content
        title = report_dict['title'].strip()
        description = report_dict['description'].strip()
        
        if len(title) < 5:
            raise ValidationException("Title must be at least 5 characters long")
        if len(description) < 10:
            raise ValidationException("Description must be at least 10 characters long")
        
        # Validate severity
        valid_severities = ['low', 'medium', 'high', 'critical']
        if report_dict['severity'] not in valid_severities:
            raise ValidationException(f"Invalid severity. Must be one of: {', '.join(valid_severities)}")
        
        # Validate category if provided
        if report_dict.get('category'):
            from app.models.report import ReportCategory
            valid_categories = [cat.value for cat in ReportCategory]
            if report_dict['category'] not in valid_categories:
                raise ValidationException(f"Invalid category. Must be one of: {', '.join(valid_categories)}")
        
        logger.info(f"Creating report with validated data: {report_dict}")
        
        # Create report using CRUD layer
        report_create_internal = ReportCreateInternal(**report_dict)
        report = await report_crud.create(db, report_create_internal)
        
        logger.info(f"Report created successfully with ID: {report.id}")

        # Generate report_number (CL-{year}-{CITY_CODE}-{sequence})
        report_number = None
        try:
            city = settings.CITY_CODE or "RNC"
            year = datetime.utcnow().year
            redis = await get_redis()
            seq = await redis.incr(f"seq:report_number:{city}:{year}")
            report_number = f"CL-{year}-{city}-{seq:05d}"
            
            # Update report with report number
            await report_crud.update(db, report.id, ReportUpdate(report_number=report_number))
            report.report_number = report_number
            await db.flush()
            
            logger.info(f"Report number generated: {report_number}")
        except Exception as e:
            logger.warning(f"Failed to generate report number: {str(e)}")
            # Non-blocking if Redis unavailable

        # Queue for processing: admin review (always) and optional classification
        try:
            redis = await get_redis()
            await redis.lpush("queue:admin_review", str(report.id))
            await redis.lpush("queue:classification", str(report.id))
            logger.info(f"Report {report.id} queued for processing")
        except Exception as e:
            logger.warning(f"Failed to queue report for processing: {str(e)}")
            # Non-blocking; if Redis down, creation still succeeds

        # Increment user's report count and reputation
        try:
            await user_crud.update_reputation(db, current_user.id, 5)  # 5 points for reporting
            logger.info(f"Updated reputation for user {current_user.id}")
        except Exception as e:
            logger.warning(f"Failed to update user reputation: {str(e)}")

        # Comprehensive audit logging
        await audit_logger.log(
            db=db,
            action=AuditAction.REPORT_CREATED,
            status=AuditStatus.SUCCESS,
            user=current_user,
            request=request,
            description=f"Created report: {report.title}",
            metadata={
                "report_id": report.id,
                "report_number": report_number,
                "category": report_dict.get('category'),
                "severity": str(report_dict.get('severity')),
                "location": f"{report_dict.get('latitude')},{report_dict.get('longitude')}",
                "address": report_dict.get('address'),
                "user_id": current_user.id,
                "user_email": current_user.email,
                "validation_passed": True
            },
            resource_type="report",
            resource_id=str(report.id)
        )

        # Commit all changes
        await db.commit()
        await db.refresh(report)
        
        # Prepare response payload
        payload = {
            "id": report.id,
            "report_number": report.report_number,
            "user_id": report.user_id,
            "department_id": report.department_id,
            "category": report.category,
            "sub_category": report.sub_category,
            "status": report.status,
            "severity": report.severity,
            "is_public": bool(report.is_public),
            "created_at": report.created_at,
            "updated_at": report.updated_at,
            "title": report.title,
            "description": report.description,
            "latitude": report.latitude,
            "longitude": report.longitude,
            "address": report.address,
        }
        
        logger.info(f"Report creation completed successfully: {report.id}")
        return payload
        
    except ValidationException as e:
        logger.error(f"Validation error in report creation: {str(e)}")
        await audit_logger.log(
            db=db,
            action=AuditAction.REPORT_CREATED,
            status=AuditStatus.FAILURE,
            user=current_user,
            request=request,
            description=f"Report creation failed: Validation error",
            metadata={
                "error": str(e),
                "error_type": "ValidationException",
                "user_id": current_user.id,
                "report_data": report_data.model_dump()
            },
            resource_type="report",
            resource_id=None
        )
        raise
        
    except Exception as e:
        logger.error(f"Unexpected error in report creation: {str(e)}")
        await db.rollback()
        
        await audit_logger.log(
            db=db,
            action=AuditAction.REPORT_CREATED,
            status=AuditStatus.FAILURE,
            user=current_user,
            request=request,
            description=f"Report creation failed: {str(e)}",
            metadata={
                "error": str(e),
                "error_type": type(e).__name__,
                "user_id": current_user.id,
                "report_data": report_data.model_dump()
            },
            resource_type="report",
            resource_id=None
        )
        
        # Return user-friendly error message
        raise ValidationException(
            "Failed to create report due to a server error. Please try again. "
            "If the problem persists, please contact support."
        )


@router.get("/", response_model=PaginatedResponse[ReportWithDetails])
async def get_reports(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: Optional[ReportStatus] = None,
    category: Optional[str] = None,
    severity: Optional[ReportSeverity] = None,
    department_id: Optional[int] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all reports with filters and pagination"""
    skip = (page - 1) * per_page
    
    # Build filters
    filters = {}
    if status:
        filters['status'] = status
    if category:
        filters['category'] = category
    if severity:
        filters['severity'] = severity
    if department_id:
        filters['department_id'] = department_id
    
    # Get reports with task.officer relationship
    if search:
        # Search with filters applied
        reports = await report_crud.search(
            db, 
            search, 
            filters=filters, 
            skip=skip, 
            limit=per_page,
            relationships=['user', 'department', 'media', 'task']
        )
        total = await report_crud.count_search(db, search, filters=filters)
    else:
        reports = await report_crud.get_multi(
            db,
            skip=skip,
            limit=per_page,
            filters=filters,
            relationships=['user', 'department', 'media', 'task']
        )
        total = await report_crud.count(db, filters)
    
    # Load task.officer relationship for reports that have tasks
    from sqlalchemy.orm import selectinload
    for report in reports:
        if report.task:
            await db.refresh(report.task, ['officer'])
    
    # Serialize reports with department data
    serialized_reports = [serialize_report_with_details(report) for report in reports]
    
    return PaginatedResponse(
        data=serialized_reports,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=(total + per_page - 1) // per_page
    )


@router.get("/my-reports", response_model=list[ReportResponse])
async def get_my_reports(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all reports by current user"""
    reports = await report_crud.get_by_user(db, current_user.id, skip=skip, limit=limit)
    return reports


@router.get("/{report_id}", response_model=ReportWithDetails)
async def get_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Get report by ID with full details"""
    # Fetch with relationships
    report = await report_crud.get_with_relations(db, report_id)
    
    if not report:
        raise NotFoundException("Report not found")
    
    # Load task.officer relationship if task exists
    if report.task:
        await db.refresh(report.task, ['officer'])
    
    return serialize_report_with_details(report)


# =============================
# Assignment & Status Endpoints
# =============================

class ClassifyReportRequest(BaseModel):
    category: str = Field(..., min_length=1, max_length=100)
    severity: str = Field(..., pattern="^(low|medium|high|critical)$")
    notes: str | None = None


class AssignDepartmentRequest(BaseModel):
    department_id: int = Field(..., gt=0)
    notes: str | None = None


def is_admin_user(user: User) -> bool:
    """Check if user is admin or super_admin"""
    from app.models.user import UserRole
    return user.role in {UserRole.ADMIN, UserRole.SUPER_ADMIN}


@router.put("/{report_id}/classify", response_model=ReportResponse)
async def classify_report(
    report_id: int,
    req: ClassifyReportRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    report_service: ReportService = Depends(get_report_service)
):
    """Manually classify a report (admin only)"""
    # Permission: admin or super_admin
    if not is_admin_user(current_user):
        raise ForbiddenException("Not authorized to classify reports")
    
    # Convert severity string to enum
    severity = ReportSeverity(req.severity)
    
    # Use service layer for atomic operation
    updated = await report_service.classify_report(
        report_id=report_id,
        category=req.category,
        severity=severity,
        user_id=current_user.id,
        notes=req.notes
    )
    
    # Audit logging
    await audit_logger.log(
        db=db,
        action=AuditAction.REPORT_CLASSIFIED,
        status=AuditStatus.SUCCESS,
        user=current_user,
        request=request,
        description=f"Classified report #{report_id} as {req.category}",
        metadata={
            "report_id": report_id,
            "category": req.category,
            "severity": req.severity,
            "notes": req.notes
        },
        resource_type="report",
        resource_id=str(report_id)
    )
    
    return updated


@router.post("/{report_id}/assign-department", response_model=ReportResponse)
async def assign_department(
    report_id: int,
    req: AssignDepartmentRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    report_service: ReportService = Depends(get_report_service)
):
    """Assign a report to a department (admin only) - Uses service layer for atomic operations"""
    # Permission: admin or super_admin
    if not is_admin_user(current_user):
        raise ForbiddenException("Not authorized to assign department")

    # Use service layer for atomic operation
    updated = await report_service.assign_department(
        report_id=report_id,
        department_id=req.department_id,
        user_id=current_user.id,
        notes=req.notes,
        auto_update_status=True
    )
    
    # Audit logging
    await audit_logger.log(
        db=db,
        action=AuditAction.REPORT_ASSIGNED,
        status=AuditStatus.SUCCESS,
        user=current_user,
        request=request,
        description=f"Assigned report #{report_id} to department #{req.department_id}",
        metadata={
            "report_id": report_id,
            "department_id": req.department_id,
            "notes": req.notes
        },
        resource_type="report",
        resource_id=str(report_id)
    )

    # Notify via queue (non-blocking)
    try:
        redis = await get_redis()
        await redis.lpush("queue:department_assigned", str(report_id))
    except Exception:
        pass

    return updated


class AssignOfficerRequest(BaseModel):
    officer_user_id: int = Field(..., gt=0)
    priority: int | None = Field(default=None, ge=1, le=10)
    notes: str | None = None


@router.post("/{report_id}/assign-officer", response_model=ReportWithDetails)
async def assign_officer(
    report_id: int,
    req: AssignOfficerRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    report_service: ReportService = Depends(get_report_service)
):
    """Assign an officer to a report by creating a Task (admin only) - Uses service layer"""
    if not is_admin_user(current_user):
        raise ForbiddenException("Not authorized to assign officer")

    # Use service layer for atomic operation
    await report_service.assign_officer(
        report_id=report_id,
        officer_id=req.officer_user_id,
        assigned_by_id=current_user.id,
        priority=req.priority,
        notes=req.notes,
        auto_update_status=True
    )
    
    # Audit logging
    await audit_logger.log(
        db=db,
        action=AuditAction.REPORT_ASSIGNED,
        status=AuditStatus.SUCCESS,
        user=current_user,
        request=request,
        description=f"Assigned officer #{req.officer_user_id} to report #{report_id}",
        metadata={
            "report_id": report_id,
            "officer_id": req.officer_user_id,
            "priority": req.priority,
            "notes": req.notes
        },
        resource_type="report",
        resource_id=str(report_id)
    )

    # Return detailed report with task
    return await get_report(report_id, db)  # type: ignore


# =============================
# Status validation & helpers
# =============================

ALLOWED_TRANSITIONS = {
    ReportStatus.RECEIVED: {ReportStatus.PENDING_CLASSIFICATION, ReportStatus.ASSIGNED_TO_DEPARTMENT},
    ReportStatus.PENDING_CLASSIFICATION: {ReportStatus.CLASSIFIED, ReportStatus.ASSIGNED_TO_DEPARTMENT},
    ReportStatus.CLASSIFIED: {ReportStatus.ASSIGNED_TO_DEPARTMENT},
    ReportStatus.ASSIGNED_TO_DEPARTMENT: {ReportStatus.ASSIGNED_TO_OFFICER, ReportStatus.ON_HOLD},
    ReportStatus.ASSIGNED_TO_OFFICER: {ReportStatus.ACKNOWLEDGED, ReportStatus.ON_HOLD},
    ReportStatus.ACKNOWLEDGED: {ReportStatus.IN_PROGRESS, ReportStatus.ON_HOLD},
    ReportStatus.IN_PROGRESS: {ReportStatus.PENDING_VERIFICATION, ReportStatus.ON_HOLD},
    ReportStatus.PENDING_VERIFICATION: {ReportStatus.RESOLVED, ReportStatus.REJECTED, ReportStatus.ON_HOLD},
    ReportStatus.ON_HOLD: {ReportStatus.ASSIGNED_TO_DEPARTMENT, ReportStatus.ASSIGNED_TO_OFFICER, ReportStatus.IN_PROGRESS},
}


def can_transition(old: ReportStatus, new: ReportStatus) -> bool:
    if old == new:
        return True
    return new in ALLOWED_TRANSITIONS.get(old, set())


def is_admin_user(user: User) -> bool:
    r = getattr(user, "role", None)
    if r is None:
        return False
    val = getattr(r, "value", None)
    if val is None:
        val = str(r)
    return val in ("admin", "super_admin")


async def record_history(db: AsyncSession, report_id: int, old: ReportStatus, new: ReportStatus, user_id: int, notes: str | None = None):
    hist = ReportStatusHistory(
        report_id=report_id,
        old_status=old,
        new_status=new,
        changed_by_user_id=user_id,
        notes=notes,
    )
    db.add(hist)
    await db.flush()


def calculate_priority(severity: str | ReportStatus, created_at: datetime | None) -> int:
    base = 5
    sev_bonus = {
        "low": 0,
        "medium": 1,
        "high": 3,
        "critical": 5,
    }.get(str(severity), 1)
    age_bonus = 0
    try:
        if created_at:
            hours = max(0, int((datetime.utcnow() - created_at).total_seconds() // 3600))
            if hours > 72:
                age_bonus = 3
            elif hours > 24:
                age_bonus = 2
            elif hours > 6:
                age_bonus = 1
    except Exception:
        pass
    return max(1, min(10, base + sev_bonus + age_bonus))


@router.post("/{report_id}/status", response_model=ReportResponse)
async def update_report_status(
    report_id: int,
    req: StatusUpdateRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    report_service: ReportService = Depends(get_report_service)
):
    """Update report status and record history with prerequisite validation - Uses service layer"""
    # RBAC: restrict sensitive transitions
    if req.new_status in {ReportStatus.ASSIGNED_TO_DEPARTMENT, ReportStatus.ASSIGNED_TO_OFFICER, ReportStatus.RESOLVED, ReportStatus.REJECTED} and not is_admin_user(current_user):
        from app.core.exceptions import ForbiddenException as _Forbidden
        raise _Forbidden("Not authorized for this status change")

    # Get old status for audit logging
    report = await report_crud.get(db, report_id)
    old_status = report.status if report else None

    # Use service layer for atomic operation with full validation
    updated = await report_service.update_status(
        report_id=report_id,
        new_status=req.new_status,
        user_id=current_user.id,
        notes=req.notes,
        skip_validation=False
    )

    # Audit logging
    await audit_logger.log(
        db=db,
        action=AuditAction.REPORT_STATUS_CHANGED,
        status=AuditStatus.SUCCESS,
        user=current_user,
        request=request,
        description=f"Changed report #{report_id} status from {old_status.value if old_status else 'unknown'} to {req.new_status.value}",
        metadata={
            "report_id": report_id,
            "old_status": old_status.value if old_status else None,
            "new_status": req.new_status.value,
            "notes": req.notes
        },
        resource_type="report",
        resource_id=str(report_id)
    )
    
    # If status is RESOLVED, log additional audit entry
    if req.new_status == ReportStatus.RESOLVED:
        await audit_logger.log(
            db=db,
            action=AuditAction.REPORT_RESOLVED,
            status=AuditStatus.SUCCESS,
            user=current_user,
            request=request,
            description=f"Resolved report #{report_id}",
            metadata={"report_id": report_id},
            resource_type="report",
            resource_id=str(report_id)
        )

    return updated


@router.post("/{report_id}/acknowledge", response_model=ReportResponse)
async def acknowledge_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    report_service: ReportService = Depends(get_report_service)
):
    """
    Auto-acknowledge report when officer views it
    Transitions: ASSIGNED_TO_OFFICER → ACKNOWLEDGED
    """
    report = await report_crud.get(db, report_id)
    
    if not report:
        raise NotFoundException("Report not found")
    
    # Only auto-acknowledge if currently ASSIGNED_TO_OFFICER
    if report.status == ReportStatus.ASSIGNED_TO_OFFICER:
        # Verify officer is assigned to this report
        from app.crud.task import task_crud
        task = await task_crud.get_by_report(db, report_id)
        
        if task and task.assigned_to == current_user.id:
            # Auto-transition to ACKNOWLEDGED
            updated = await report_service.update_status(
                report_id=report_id,
                new_status=ReportStatus.ACKNOWLEDGED,
                user_id=current_user.id,
                notes="Officer viewed and acknowledged the report",
                skip_validation=False
            )
            
            # Update task status and timestamp
            task.status = TaskStatus.ACKNOWLEDGED
            task.acknowledged_at = datetime.utcnow()
            await db.commit()
            await db.refresh(updated)
            
            return updated
    
    # If already acknowledged or in different state, just return current report
    await db.refresh(report)
    return report


@router.post("/{report_id}/start-work", response_model=ReportResponse)
async def start_work_on_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    report_service: ReportService = Depends(get_report_service)
):
    """
    Auto-progress report when officer starts work
    Transitions: ACKNOWLEDGED → IN_PROGRESS
    """
    report = await report_crud.get(db, report_id)
    
    if not report:
        raise NotFoundException("Report not found")
    
    # Only auto-progress if currently ACKNOWLEDGED
    if report.status == ReportStatus.ACKNOWLEDGED:
        # Verify officer is assigned to this report
        from app.crud.task import task_crud
        task = await task_crud.get_by_report(db, report_id)
        
        if task and task.assigned_to == current_user.id:
            # Auto-transition to IN_PROGRESS
            updated = await report_service.update_status(
                report_id=report_id,
                new_status=ReportStatus.IN_PROGRESS,
                user_id=current_user.id,
                notes="Officer started working on the report",
                skip_validation=False
            )
            
            # Update task status and timestamp
            task.status = TaskStatus.IN_PROGRESS
            task.started_at = datetime.utcnow()
            await db.commit()
            await db.refresh(updated)
            
            return updated
    
    # If already in progress or different state, just return current report
    await db.refresh(report)
    return report


@router.post("/{report_id}/submit-for-verification", response_model=ReportResponse)
async def submit_for_verification(
    report_id: int,
    resolution_notes: str = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    report_service: ReportService = Depends(get_report_service)
):
    """
    Officer submits work for admin verification
    Transitions: IN_PROGRESS → PENDING_VERIFICATION
    """
    report = await report_crud.get(db, report_id)
    
    if not report:
        raise NotFoundException("Report not found")
    
    # Verify officer is assigned to this report
    from app.crud.task import task_crud
    task = await task_crud.get_by_report(db, report_id)
    
    if not task or task.assigned_to != current_user.id:
        raise ForbiddenException("Not authorized to update this task")
    
    # Only allow if currently IN_PROGRESS
    if report.status != ReportStatus.IN_PROGRESS:
        raise ValidationException(f"Cannot submit for verification from status: {report.status}")
    
    # Update report status
    updated = await report_service.update_status(
        report_id=report_id,
        new_status=ReportStatus.PENDING_VERIFICATION,
        user_id=current_user.id,
        notes="Officer submitted work for verification",
        skip_validation=False
    )
    
    # Update task
    task.status = TaskStatus.PENDING_VERIFICATION
    task.resolved_at = datetime.utcnow()
    if resolution_notes:
        task.resolution_notes = resolution_notes
    
    await db.commit()
    await db.refresh(updated)
    
    return updated


@router.post("/{report_id}/on-hold", response_model=ReportResponse)
async def put_task_on_hold(
    report_id: int,
    reason: str = Form(..., description="Mandatory reason for putting task on hold"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    report_service: ReportService = Depends(get_report_service)
):
    """
    Officer puts task on hold with mandatory reason
    Transitions: IN_PROGRESS → ON_HOLD
    """
    report = await report_crud.get(db, report_id)
    
    if not report:
        raise NotFoundException("Report not found")
    
    # Verify officer is assigned to this report
    from app.crud.task import task_crud
    task = await task_crud.get_by_report(db, report_id)
    
    if not task or task.assigned_to != current_user.id:
        raise ForbiddenException("Not authorized to update this task")
    
    # Only allow if currently IN_PROGRESS
    if report.status != ReportStatus.IN_PROGRESS:
        raise ValidationException(f"Cannot put on hold from status: {report.status}")
    
    # Update report status
    updated = await report_service.update_status(
        report_id=report_id,
        new_status=ReportStatus.ON_HOLD,
        user_id=current_user.id,
        notes=f"Task put on hold: {reason}",
        skip_validation=False
    )
    
    # Update task
    task.status = TaskStatus.ON_HOLD
    task.notes = f"{task.notes}\n[ON HOLD] {reason}" if task.notes else f"[ON HOLD] {reason}"
    
    await db.commit()
    await db.refresh(updated)
    
    return updated


@router.post("/{report_id}/approve-resolution", response_model=ReportResponse)
async def approve_resolution(
    report_id: int,
    approval_notes: str = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    report_service: ReportService = Depends(get_report_service)
):
    """
    Admin approves officer's work
    Transitions: PENDING_VERIFICATION → RESOLVED
    """
    # Check admin permission
    if not current_user.can_access_admin_portal():
        raise ForbiddenException("Admin access required")
    
    report = await report_crud.get(db, report_id)
    if not report:
        raise NotFoundException("Report not found")
    
    # Only allow if currently PENDING_VERIFICATION
    if report.status != ReportStatus.PENDING_VERIFICATION:
        raise ValidationException(
            f"Cannot approve from status: {report.status}"
        )
    
    # Update report status
    notes = f"Work approved by admin"
    if approval_notes:
        notes += f": {approval_notes}"
    
    updated = await report_service.update_status(
        report_id=report_id,
        new_status=ReportStatus.RESOLVED,
        user_id=current_user.id,
        notes=notes,
        skip_validation=False
    )
    
    # Update task
    from app.crud.task import task_crud
    task = await task_crud.get_by_report(db, report_id)
    if task:
        task.status = TaskStatus.RESOLVED
    
    await db.commit()
    await db.refresh(updated)
    
    return updated


@router.post("/{report_id}/reject-resolution", response_model=ReportResponse)
async def reject_resolution(
    report_id: int,
    rejection_reason: str = Form(..., description="Mandatory reason for rejection"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    report_service: ReportService = Depends(get_report_service)
):
    """
    Admin rejects officer's work and sends back for rework
    Transitions: PENDING_VERIFICATION → IN_PROGRESS
    """
    # Check admin permission
    if not current_user.can_access_admin_portal():
        raise ForbiddenException("Admin access required")
    
    report = await report_crud.get(db, report_id)
    if not report:
        raise NotFoundException("Report not found")
    
    # Only allow if currently PENDING_VERIFICATION
    if report.status != ReportStatus.PENDING_VERIFICATION:
        raise ValidationException(
            f"Cannot reject from status: {report.status}"
        )
    
    # Update report status back to IN_PROGRESS
    updated = await report_service.update_status(
        report_id=report_id,
        new_status=ReportStatus.IN_PROGRESS,
        user_id=current_user.id,
        notes=f"Work rejected by admin. Reason: {rejection_reason}",
        skip_validation=False
    )
    
    # Update task
    from app.crud.task import task_crud
    task = await task_crud.get_by_report(db, report_id)
    if task:
        task.status = TaskStatus.IN_PROGRESS
        task.notes = f"{task.notes}\n[REJECTED] {rejection_reason}" if task.notes else f"[REJECTED] {rejection_reason}"
    
    await db.commit()
    await db.refresh(updated)
    
    return updated


@router.post("/{report_id}/add-update", response_model=ReportResponse)
async def add_task_update(
    report_id: int,
    update_text: str = Form(..., description="Progress update text"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Officer adds progress update to task
    """
    report = await report_crud.get(db, report_id)
    
    if not report:
        raise NotFoundException("Report not found")
    
    # Verify officer is assigned to this report
    from app.crud.task import task_crud
    task = await task_crud.get_by_report(db, report_id)
    
    if not task or task.assigned_to != current_user.id:
        raise ForbiddenException("Not authorized to update this task")
    
    # Append to notes with timestamp
    timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M")
    new_note = f"[{timestamp}] {update_text}"
    task.notes = f"{task.notes}\n{new_note}" if task.notes else new_note
    
    await db.commit()
    await db.refresh(report)
    
    return report


@router.get("/{report_id}/history", response_model=StatusHistoryResponse)
async def get_report_status_history(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get status history for a report with user details."""
    from sqlalchemy.orm import selectinload
    
    result = await db.execute(
        select(ReportStatusHistory)
        .options(selectinload(ReportStatusHistory.changed_by))
        .where(ReportStatusHistory.report_id == report_id)
        .order_by(ReportStatusHistory.changed_at.asc())
    )
    items = result.scalars().all()
    
    return StatusHistoryResponse(
        report_id=report_id,
        history=[
            StatusHistoryItem(
                old_status=i.old_status,
                new_status=i.new_status,
                changed_by_user_id=i.changed_by_user_id,
                changed_by_user={
                    "id": i.changed_by.id,
                    "email": i.changed_by.email,
                    "full_name": i.changed_by.full_name
                } if i.changed_by else None,
                notes=i.notes,
                changed_at=i.changed_at,
            ) for i in items
        ]
    )


@router.put("/{report_id}", response_model=ReportResponse)
async def update_report(
    report_id: int,
    report_data: ReportUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a report"""
    report = await report_crud.get(db, report_id)
    
    if not report:
        raise NotFoundException("Report not found")
    
    # Only owner or admin/super_admin can update
    if report.user_id != current_user.id and not is_admin_user(current_user):
        raise ForbiddenException("Not authorized to update this report")
    
    updated_report = await report_crud.update(db, report_id, report_data)
    return updated_report


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a report"""
    report = await report_crud.get(db, report_id)
    
    if not report:
        raise NotFoundException("Report not found")
    
    # Only owner or admin can delete
    if report.user_id != current_user.id and current_user.role.value != "admin":
        raise ForbiddenException("Not authorized to delete this report")
    
    await report_crud.delete(db, report_id)
    return None


# ============================================================================
# BULK OPERATIONS - Production-ready batch processing
# ============================================================================

class BulkStatusUpdateRequest(BaseModel):
    report_ids: list[int] = Field(..., min_length=1, max_length=100)
    new_status: ReportStatus
    notes: str | None = None


class BulkAssignDepartmentRequest(BaseModel):
    report_ids: list[int] = Field(..., min_length=1, max_length=100)
    department_id: int = Field(..., gt=0)
    notes: str | None = None


class BulkAssignOfficerRequest(BaseModel):
    report_ids: list[int] = Field(..., min_length=1, max_length=100)
    officer_user_id: int = Field(..., gt=0)
    priority: int | None = Field(default=None, ge=1, le=10)
    notes: str | None = None


class BulkUpdateSeverityRequest(BaseModel):
    report_ids: list[int] = Field(..., min_length=1, max_length=100)
    severity: str = Field(..., pattern="^(low|medium|high|critical)$")


class BulkOperationResult(BaseModel):
    total: int
    successful: int
    failed: int
    errors: list[dict[str, str]] = []
    successful_ids: list[int] = []
    failed_ids: list[int] = []


@router.post("/bulk/status", response_model=BulkOperationResult)
async def bulk_update_status(
    req: BulkStatusUpdateRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    report_service: ReportService = Depends(get_report_service)
):
    """Bulk update status for multiple reports with comprehensive validation"""
    if not is_admin_user(current_user):
        raise ForbiddenException("Only admins can perform bulk status updates")
    
    # Production safety validations
    if len(req.report_ids) > 100:
        raise ValidationException("Cannot process more than 100 reports at once for system stability")
    
    if len(req.report_ids) == 0:
        raise ValidationException("No report IDs provided")
    
    # Remove duplicates and validate IDs
    unique_ids = list(set(req.report_ids))
    if len(unique_ids) != len(req.report_ids):
        logger.warning(f"Duplicate report IDs removed from bulk operation by user {current_user.id}")
    
    try:
        # Use service layer for atomic bulk operation
        result = await report_service.bulk_update_status(
            report_ids=unique_ids,
            new_status=req.new_status,
            user_id=current_user.id,
            notes=req.notes
        )
        
        # Determine audit status based on results
        audit_status = AuditStatus.SUCCESS
        if result['failed'] > 0:
            audit_status = AuditStatus.PARTIAL_SUCCESS if result['successful'] > 0 else AuditStatus.FAILURE
        
        # Comprehensive audit logging
        await audit_logger.log(
            db=db,
            action=AuditAction.REPORT_STATUS_CHANGED,
            status=audit_status,
            user=current_user,
            request=request,
            description=f"Bulk status update: {result['successful']}/{result['total']} reports updated to {req.new_status.value}",
            metadata={
                "operation": "bulk_status_update",
                "total_reports": result['total'],
                "successful": result['successful'],
                "failed": result['failed'],
                "new_status": req.new_status.value,
                "report_ids": unique_ids[:10],  # Limit for audit log size
                "has_failures": result['failed'] > 0,
                "error_count": len(result.get('errors', [])),
                "request_size": len(unique_ids),
                "duplicate_ids_removed": len(req.report_ids) - len(unique_ids)
            },
            resource_type="report",
            resource_id="bulk"
        )
        
        return BulkOperationResult(**result)
        
    except Exception as e:
        # Audit failed operation
        await audit_logger.log(
            db=db,
            action=AuditAction.REPORT_STATUS_CHANGED,
            status=AuditStatus.FAILURE,
            user=current_user,
            request=request,
            description=f"Bulk status update failed: {str(e)}",
            metadata={
                "operation": "bulk_status_update",
                "total_reports": len(unique_ids),
                "new_status": req.new_status.value,
                "report_ids": unique_ids[:10],
                "error": str(e),
                "error_type": type(e).__name__
            },
            resource_type="report",
            resource_id="bulk"
        )
        logger.error(f"Bulk status update failed for user {current_user.id}: {str(e)}")
        raise


@router.post("/bulk/assign-department", response_model=BulkOperationResult)
async def bulk_assign_department(
    req: BulkAssignDepartmentRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    report_service: ReportService = Depends(get_report_service)
):
    """Bulk assign department to multiple reports - Uses service layer"""
    print(f"Bulk assign department request: {req}")
    print(f"Department ID: {req.department_id}, type: {type(req.department_id)}")
    print(f"Report IDs: {req.report_ids}, types: {[type(id) for id in req.report_ids]}")
    
    if not is_admin_user(current_user):
        raise ForbiddenException("Only admins can perform bulk department assignment")
    
    # Use service layer for atomic bulk operation
    result = await report_service.bulk_assign_department(
        report_ids=req.report_ids,
        department_id=req.department_id,
        user_id=current_user.id,
        notes=req.notes
    )
    
    # Audit logging
    await audit_logger.log(
        db=db,
        action=AuditAction.REPORT_ASSIGNED,
        status=AuditStatus.SUCCESS,
        user=current_user,
        request=request,
        description=f"Bulk assigned {result['successful']} reports to department #{req.department_id}",
        metadata={
            "total_reports": result['total'],
            "successful": result['successful'],
            "failed": result['failed'],
            "department_id": req.department_id,
            "report_ids": req.report_ids[:10]
        },
        resource_type="report",
        resource_id="bulk"
    )
    
    return BulkOperationResult(**result)


@router.post("/bulk/assign-officer", response_model=BulkOperationResult)
async def bulk_assign_officer(
    req: BulkAssignOfficerRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    report_service: ReportService = Depends(get_report_service)
):
    """Bulk assign officer to multiple reports - Uses service layer"""
    if not is_admin_user(current_user):
        raise ForbiddenException("Only admins can perform bulk officer assignment")
    
    # Use service layer for atomic bulk operation
    result = await report_service.bulk_assign_officer(
        report_ids=req.report_ids,
        officer_id=req.officer_user_id,
        assigned_by_id=current_user.id,
        priority=req.priority,
        notes=req.notes
    )
    
    # Audit logging
    await audit_logger.log(
        db=db,
        action=AuditAction.REPORT_ASSIGNED,
        status=AuditStatus.SUCCESS,
        user=current_user,
        request=request,
        description=f"Bulk assigned {result['successful']} reports to officer #{req.officer_user_id}",
        metadata={
            "total_reports": result['total'],
            "successful": result['successful'],
            "failed": result['failed'],
            "officer_id": req.officer_user_id,
            "priority": req.priority,
            "report_ids": req.report_ids[:10]
        },
        resource_type="report",
        resource_id="bulk"
    )
    
    return BulkOperationResult(**result)


@router.post("/bulk/update-severity", response_model=BulkOperationResult)
async def bulk_update_severity(
    req: BulkUpdateSeverityRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    report_service: ReportService = Depends(get_report_service)
):
    """Bulk update severity for multiple reports - Uses service layer"""
    if not is_admin_user(current_user):
        raise ForbiddenException("Only admins can perform bulk severity updates")
    
    # Use service layer for atomic bulk operation
    from app.models.report import ReportSeverity
    result = await report_service.bulk_update_severity(
        report_ids=req.report_ids,
        severity=ReportSeverity(req.severity),
        user_id=current_user.id
    )
    
    # Audit logging
    await audit_logger.log(
        db=db,
        action=AuditAction.REPORT_UPDATED,
        status=AuditStatus.SUCCESS,
        user=current_user,
        request=request,
        description=f"Bulk updated severity for {result['successful']} reports to {req.severity}",
        metadata={
            "total_reports": result['total'],
            "successful": result['successful'],
            "failed": result['failed'],
            "severity": req.severity,
            "report_ids": req.report_ids[:10]
        },
        resource_type="report",
        resource_id="bulk"
    )
    
    return BulkOperationResult(**result)


# ============================================================================
# AUTO-ASSIGNMENT ENDPOINTS - Intelligent officer assignment
# ============================================================================

class AutoAssignOfficerRequest(BaseModel):
    strategy: str = Field(default="balanced", pattern="^(least_busy|balanced|round_robin)$")
    priority: int | None = Field(default=None, ge=1, le=10)
    notes: str | None = None


class BulkAutoAssignOfficerRequest(BaseModel):
    report_ids: list[int] = Field(..., min_length=1, max_length=100)
    strategy: str = Field(default="balanced", pattern="^(least_busy|balanced|round_robin)$")
    priority: int | None = Field(default=None, ge=1, le=10)
    notes: str | None = None


class AutoAssignmentResult(BaseModel):
    report_id: int
    officer_id: int
    officer_name: str
    strategy_used: str
    workload_score: float
    active_reports: int
    assignment_reason: str


@router.post("/{report_id}/auto-assign-officer", response_model=dict)
async def auto_assign_officer(
    report_id: int,
    req: AutoAssignOfficerRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    report_service: ReportService = Depends(get_report_service)
):
    """
    Automatically assign the best available officer to a report
    Uses intelligent workload balancing algorithms
    """
    if not is_admin_user(current_user):
        raise ForbiddenException("Only admins can perform auto-assignment")
    
    try:
        # Use service layer for intelligent assignment
        updated_report, assignment_info = await report_service.auto_assign_officer(
            report_id=report_id,
            assigned_by_id=current_user.id,
            strategy=req.strategy,
            priority=req.priority,
            notes=req.notes
        )
        
        # Audit logging
        await audit_logger.log(
            db=db,
            action=AuditAction.REPORT_ASSIGNED,
            status=AuditStatus.SUCCESS,
            user=current_user,
            request=request,
            description=f"Auto-assigned report #{report_id} to officer #{assignment_info['selected_officer']['user_id']} using {req.strategy} strategy",
            metadata={
                "report_id": report_id,
                "officer_id": assignment_info['selected_officer']['user_id'],
                "officer_name": assignment_info['selected_officer']['full_name'],
                "strategy": req.strategy,
                "workload_score": assignment_info['workload_score'],
                "active_reports": assignment_info['active_reports']
            },
            resource_type="report",
            resource_id=str(report_id)
        )
        
        return {
            "message": "Officer auto-assigned successfully",
            "report_id": report_id,
            "assignment": AutoAssignmentResult(
                report_id=report_id,
                officer_id=assignment_info['selected_officer']['user_id'],
                officer_name=assignment_info['selected_officer']['full_name'],
                strategy_used=assignment_info['strategy_used'],
                workload_score=assignment_info['workload_score'],
                active_reports=assignment_info['active_reports'],
                assignment_reason=assignment_info['assignment_reason']
            )
        }
        
    except Exception as e:
        # Audit failed operation
        await audit_logger.log(
            db=db,
            action=AuditAction.REPORT_ASSIGNED,
            status=AuditStatus.FAILURE,
            user=current_user,
            request=request,
            description=f"Auto-assignment failed for report #{report_id}: {str(e)}",
            metadata={
                "report_id": report_id,
                "strategy": req.strategy,
                "error": str(e),
                "error_type": type(e).__name__
            },
            resource_type="report",
            resource_id=str(report_id)
        )
        raise


@router.post("/bulk/auto-assign-officer", response_model=dict)
async def bulk_auto_assign_officer(
    req: BulkAutoAssignOfficerRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    report_service: ReportService = Depends(get_report_service)
):
    """
    Bulk auto-assign officers to multiple reports
    Intelligently distributes workload across available officers
    """
    if not is_admin_user(current_user):
        raise ForbiddenException("Only admins can perform bulk auto-assignment")
    
    try:
        # Use service layer for intelligent bulk assignment
        result = await report_service.bulk_auto_assign_officers(
            report_ids=req.report_ids,
            assigned_by_id=current_user.id,
            strategy=req.strategy,
            priority=req.priority,
            notes=req.notes
        )
        
        # Audit logging
        await audit_logger.log(
            db=db,
            action=AuditAction.REPORT_ASSIGNED,
            status=AuditStatus.SUCCESS if result['failed'] == 0 else AuditStatus.PARTIAL_SUCCESS,
            user=current_user,
            request=request,
            description=f"Bulk auto-assigned {result['successful']}/{result['total']} reports using {req.strategy} strategy",
            metadata={
                "operation": "bulk_auto_assign_officer",
                "total_reports": result['total'],
                "successful": result['successful'],
                "failed": result['failed'],
                "strategy": req.strategy,
                "report_ids": req.report_ids[:10],
                "assignments_count": len(result['assignments'])
            },
            resource_type="report",
            resource_id="bulk"
        )
        
        return {
            "message": f"Bulk auto-assignment completed: {result['successful']}/{result['total']} successful",
            "result": BulkOperationResult(
                total=result['total'],
                successful=result['successful'],
                failed=result['failed'],
                errors=result['errors'],
                successful_ids=result['successful_ids'],
                failed_ids=result['failed_ids']
            ),
            "assignments": [
                AutoAssignmentResult(
                    report_id=a['report_id'],
                    officer_id=a['officer_id'],
                    officer_name=a['officer_name'],
                    strategy_used=a['strategy'],
                    workload_score=a['workload_score'],
                    active_reports=0,  # Not included in bulk result
                    assignment_reason=f"Auto-assigned using {a['strategy']} strategy"
                ) for a in result['assignments']
            ]
        }
        
    except Exception as e:
        # Audit failed operation
        await audit_logger.log(
            db=db,
            action=AuditAction.REPORT_ASSIGNED,
            status=AuditStatus.FAILURE,
            user=current_user,
            request=request,
            description=f"Bulk auto-assignment failed: {str(e)}",
            metadata={
                "operation": "bulk_auto_assign_officer",
                "total_reports": len(req.report_ids),
                "strategy": req.strategy,
                "report_ids": req.report_ids[:10],
                "error": str(e),
                "error_type": type(e).__name__
            },
            resource_type="report",
            resource_id="bulk"
        )
        raise


# ============================================================================
# WORKLOAD MANAGEMENT ENDPOINTS - Officer capacity and department analytics
# ============================================================================

@router.get("/workload/department/{department_id}")
async def get_department_workload(
    department_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    report_service: ReportService = Depends(get_report_service)
):
    """
    Get comprehensive workload summary for a department
    Includes officer capacity, active reports, and assignment recommendations
    """
    if not current_user.can_access_admin_portal():
        raise ForbiddenException("Access denied")
    
    # Verify department exists
    dept_result = await db.execute(
        select(Department).where(Department.id == department_id)
    )
    department = dept_result.scalar_one_or_none()
    if not department:
        raise NotFoundException(f"Department {department_id} not found")
    
    # Get workload summary
    workload_summary = await report_service.get_department_workload_summary(department_id)
    
    return {
        "department": {
            "id": department.id,
            "name": department.name,
            "description": department.description
        },
        "workload_summary": workload_summary,
        "recommendations": {
            "can_accept_assignments": workload_summary["capacity_status"] in ["good", "moderate"],
            "suggested_strategy": "balanced" if workload_summary["capacity_status"] == "good" else "least_busy",
            "capacity_warning": workload_summary["capacity_status"] in ["limited", "at_capacity"]
        }
    }


@router.get("/workload/officers")
async def get_all_officers_workload(
    department_id: int = Query(None, description="Filter by department ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    report_service: ReportService = Depends(get_report_service)
):
    """
    Get workload information for all officers
    Optionally filter by department
    """
    if not current_user.can_access_admin_portal():
        raise ForbiddenException("Access denied")
    
    if department_id:
        # Get officers from specific department
        workload_summary = await report_service.get_department_workload_summary(department_id)
        return {
            "department_id": department_id,
            "officers": workload_summary["officers"]
        }
    else:
        # Get all officers across all departments
        departments_result = await db.execute(select(Department))
        departments = departments_result.scalars().all()
        
        all_officers = []
        for dept in departments:
            workload_summary = await report_service.get_department_workload_summary(dept.id)
            for officer in workload_summary["officers"]:
                officer["department_name"] = dept.name
                all_officers.append(officer)
        
        return {
            "total_officers": len(all_officers),
            "officers": all_officers
        }
