from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from app.core.database import get_db, get_redis
from app.config import settings
from app.core.dependencies import get_current_user, require_admin
from app.core.exceptions import NotFoundException, ForbiddenException, ValidationException
from app.schemas.user import (
    UserResponse, UserDetailedResponse, UserStatsResponse,
    UserProfileUpdate, RoleChangeRequest, AreaAssignmentCreate
)
from app.schemas.common import PaginatedResponse
from app.models.user import User, UserRole
from app.models.department import Department
from app.crud.user import user_crud
from app.crud.area_assignment import area_assignment_crud
from app.crud.role_history import role_history_crud
from app.models.report import Report, ReportStatus
from app.models.task import Task, TaskStatus
from sqlalchemy import select, func, and_
from pydantic import BaseModel, Field

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserDetailedResponse)
async def get_current_user_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user profile"""
    return current_user


@router.put("/me/profile", response_model=UserDetailedResponse)
async def update_my_profile(
    profile_data: UserProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update current user profile"""
    updated_user = await user_crud.update_profile(db, current_user.id, profile_data)

    return updated_user


@router.get("/me/stats", response_model=UserStatsResponse)
async def get_my_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user statistics and achievements"""
    stats = await user_crud.get_user_stats(db, current_user.id)

    if not stats:
        raise NotFoundException("User statistics not found")

    return UserStatsResponse(**stats)


@router.get("/officers", response_model=List[UserResponse])
async def get_officers(
    department_id: Optional[int] = Query(None, description="Filter by department ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get officers, optionally filtered by department"""
    
    # Build query for officers (NODAL_OFFICER, ADMIN, and AUDITOR roles)
    query = select(User).where(
        and_(
            User.role.in_([UserRole.NODAL_OFFICER, UserRole.ADMIN, UserRole.AUDITOR]),
            User.is_active == True
        )
    )
    
    # Add department filter if specified
    if department_id:
        query = query.where(User.department_id == department_id)
    
    # Add pagination
    query = query.offset(skip).limit(limit).order_by(User.full_name)
    
    result = await db.execute(query)
    officers = result.scalars().all()
    
    return officers


@router.get("/{user_id}", response_model=UserDetailedResponse)
async def get_user_profile(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user profile by ID"""
    # Only admin or the user themselves can view detailed profile
    if current_user.id != user_id and not current_user.can_access_admin_portal():
        raise ForbiddenException("Not authorized to view this profile")

    user = await user_crud.get(db, user_id)
    if not user:
        raise NotFoundException("User not found")

    return user


@router.get("/", response_model=PaginatedResponse[UserResponse])
async def list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    role: Optional[UserRole] = None,
    min_reputation: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """List users with filters (admin only)"""
    skip = (page - 1) * per_page

    if role:
        users = await user_crud.get_users_by_role(db, role, skip=skip, limit=per_page)
        total = len(users)  # Approximate for role filter
    elif min_reputation > 0:
        users = await user_crud.get_users_by_reputation(db, min_reputation, skip=skip, limit=per_page)
        total = len(users)  # Approximate for reputation filter
    else:
        users = await user_crud.get_multi(db, skip=skip, limit=per_page)
        total = await user_crud.count(db)

    return PaginatedResponse(
        data=users,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=(total + per_page - 1) // per_page
    )


@router.post("/promote-contributor/{user_id}")
async def promote_to_contributor(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Promote user to contributor (admin only)"""
    user = await user_crud.get(db, user_id)
    if not user:
        raise NotFoundException("User not found")

    if user.role != UserRole.CITIZEN:
        raise ValidationException("User is not a citizen and cannot be promoted to contributor")

    promoted_user = await user_crud.promote_to_contributor(
        db, user_id, automatic=False, admin_id=current_user.id
    )

    return {
        "message": "User promoted to contributor successfully",
        "user_id": promoted_user.id,
        "new_role": promoted_user.role.value
    }


@router.post("/change-role")
async def change_user_role(
    role_request: RoleChangeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Change user role (admin only)"""
    user = await user_crud.get(db, role_request.user_id)
    if not user:
        raise NotFoundException("User not found")

    if user.role == role_request.new_role:
        raise ValidationException("User already has this role")

    # Validate role transition
    if not _is_valid_role_transition(user.role, role_request.new_role):
        raise ValidationException(f"Invalid role transition from {user.role.value} to {role_request.new_role.value}")

    changed_user = await user_crud.change_role(
        db=db,
        user_id=role_request.user_id,
        new_role=role_request.new_role,
        changed_by=current_user.id,
        reason=role_request.reason,
        automatic=False
    )

    return {
        "message": "User role changed successfully",
        "user_id": changed_user.id,
        "old_role": user.role.value,
        "new_role": changed_user.role.value
    }


@router.get("/promotion-candidates", response_model=List[UserResponse])
async def get_promotion_candidates(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get users eligible for promotion to contributor (admin only)"""
    candidates = await user_crud.get_promotion_candidates(db, skip=skip, limit=limit)
    return candidates


@router.post("/assign-area")
async def assign_moderator_area(
    assignment: AreaAssignmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Assign moderator to an area (admin only)"""
    # Check if user exists and is a moderator
    user = await user_crud.get(db, assignment.user_id)
    if not user:
        raise NotFoundException("User not found")

    if user.role != UserRole.MODERATOR:
        raise ValidationException("User must be a moderator to be assigned to an area")

    # Create area assignment
    area_assignment = await area_assignment_crud.create_assignment(
        db, assignment, assigned_by=current_user.id
    )


class OfficerStatsResponse(BaseModel):
    user_id: int
    full_name: str | None = None
    email: str
    phone: str | None = None
    employee_id: str | None = None
    department_id: int | None = None
    department_name: str | None = None
    total_reports: int
    resolved_reports: int
    in_progress_reports: int
    active_reports: int
    avg_resolution_time_days: float | None = None
    workload_score: float
    capacity_level: str


@router.get("/stats/officers", response_model=List[OfficerStatsResponse])
async def get_all_officers_stats(
    department_id: Optional[int] = Query(None, description="Filter by department ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get statistics for all officers, optionally filtered by department"""
    if not current_user.can_access_admin_portal():
        raise ForbiddenException("Admin access required")
    
    # Get officers query
    query = select(User).where(
        User.role.in_([UserRole.NODAL_OFFICER, UserRole.ADMIN]),
        User.is_active == True
    )
    
    if department_id:
        query = query.where(User.department_id == department_id)
    
    result = await db.execute(query)
    officers = result.scalars().all()
    
    # Get workload stats for each officer
    from app.services.report_service import ReportService
    report_service = ReportService(db)
    
    officer_stats = []
    for officer in officers:
        workload = await report_service.workload_balancer.get_officer_workload(officer.id)
        
        # Get department name if available
        dept_name = None
        if officer.department_id:
            dept_result = await db.execute(
                select(Department.name).where(Department.id == officer.department_id)
            )
            dept_name = dept_result.scalar()
        
        # Safely extract workload data with defaults
        active_reports = workload.get("active_reports", 0) or 0
        resolved_reports = workload.get("resolved_reports", 0) or 0
        avg_resolution_time = workload.get("avg_resolution_time_days") or 0.0
        workload_score = workload.get("workload_score", 0.0) or 0.0
        capacity_level = workload.get("capacity_level", "available") or "available"
        
        officer_stats.append(OfficerStatsResponse(
            user_id=officer.id,
            full_name=officer.full_name,
            email=officer.email or f"officer{officer.id}@ranchi.gov.in",  # Ensure email is not None
            phone=officer.phone,
            employee_id=officer.employee_id,
            department_id=officer.department_id,
            department_name=dept_name,
            total_reports=active_reports + resolved_reports,
            resolved_reports=resolved_reports,
            in_progress_reports=active_reports,
            active_reports=active_reports,
            avg_resolution_time_days=float(avg_resolution_time),
            workload_score=float(workload_score),
            capacity_level=str(capacity_level)
        ))
    
    return officer_stats


@router.get("/{user_id}/stats", response_model=OfficerStatsResponse)
async def get_user_stats_detailed(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed statistics for a specific user/officer"""
    # Check permissions
    if current_user.id != user_id and not current_user.can_access_admin_portal():
        raise ForbiddenException("Access denied")
    
    # Get user
    user = await user_crud.get(db, user_id)
    if not user:
        raise NotFoundException("User not found")
    
    # Get workload stats
    from app.services.report_service import ReportService
    report_service = ReportService(db)
    workload = await report_service.workload_balancer.get_officer_workload(user_id)
    
    # Get department name if available
    dept_name = None
    if user.department_id:
        dept_result = await db.execute(
            select(Department.name).where(Department.id == user.department_id)
        )
        dept_name = dept_result.scalar()
    
    # Safely extract workload data with defaults
    active_reports = workload.get("active_reports", 0) or 0
    resolved_reports = workload.get("resolved_reports", 0) or 0
    avg_resolution_time = workload.get("avg_resolution_time_days") or 0.0
    workload_score = workload.get("workload_score", 0.0) or 0.0
    capacity_level = workload.get("capacity_level", "available") or "available"
    
    return OfficerStatsResponse(
        user_id=user.id,
        full_name=user.full_name,
        email=user.email or f"officer{user.id}@ranchi.gov.in",  # Ensure email is not None
        phone=user.phone,
        employee_id=user.employee_id,
        department_id=user.department_id,
        department_name=dept_name,
        total_reports=active_reports + resolved_reports,
        resolved_reports=resolved_reports,
        in_progress_reports=active_reports,
        active_reports=active_reports,
        avg_resolution_time_days=float(avg_resolution_time),
        workload_score=float(workload_score),
        capacity_level=str(capacity_level)
    )

    return {
        "message": "Area assignment created successfully",
        "assignment_id": area_assignment.id,
        "user_id": area_assignment.user_id,
        "area": area_assignment.area_name,
        "area_type": area_assignment.area_type
    }


@router.get("/role-history/{user_id}", response_model=List[dict])
async def get_user_role_history(
    user_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get role change history for a user (admin only)"""
    history = await role_history_crud.get_by_user(db, user_id, skip=skip, limit=limit)

    return [
        {
            "id": record.id,
            "old_role": record.old_role.value if record.old_role else None,
            "new_role": record.new_role.value,
            "changed_by": record.changed_by,
            "reason": record.reason,
            "automatic": record.automatic,
            "changed_at": record.created_at
        }
        for record in history
    ]


@router.get("/analytics/role-changes")
async def get_role_change_analytics(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get role change analytics (admin only)"""
    stats = await role_history_crud.get_role_statistics(db, days=days)

    return {
        "period_days": days,
        "total_changes": stats["total_changes"],
        "auto_promotions": stats["auto_promotions"],
        "manual_changes": stats["manual_changes"],
        "changes_by_role": stats["by_role"]
    }


def _is_valid_role_transition(old_role: UserRole, new_role: UserRole) -> bool:
    """Validate role transition rules using RBAC system"""
    from app.core.rbac import is_valid_role_transition
    return is_valid_role_transition(old_role, new_role)


# =============================
# Preferences & Verification
# =============================
from pydantic import BaseModel, field_validator
from typing import Literal, Dict, Any
from datetime import datetime, timedelta
from app.core.rate_limiter import rate_limiter
import logging

logger = logging.getLogger(__name__)


class PreferencesUpdate(BaseModel):
    theme: Literal["light", "dark", "auto"]
    density: Literal["comfortable", "compact"]


@router.get("/me/preferences")
async def get_my_preferences(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Return user UI preferences stored in Redis. Defaults if not set."""
    redis = await get_redis()
    key = f"user_prefs:{current_user.id}"
    data = await redis.hgetall(key) or {}
    theme = (data.get(b"theme") or b"auto").decode()
    density = (data.get(b"density") or b"comfortable").decode()
    return {"theme": theme, "density": density}


@router.put("/me/preferences")
async def update_my_preferences(
    prefs: PreferencesUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update UI preferences in Redis. Stateless and fast."""
    redis = await get_redis()
    key = f"user_prefs:{current_user.id}"
    await redis.hset(key, mapping={
        "theme": prefs.theme,
        "density": prefs.density,
    })
    # Optional: set TTL if desired; leaving persistent for now
    return {"message": "Preferences updated", "theme": prefs.theme, "density": prefs.density}


class EmailVerifyPayload(BaseModel):
    token: str


class PhoneVerifyPayload(BaseModel):
    otp: str


@router.get("/me/verification")
async def get_my_verification_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Return email/phone verification status using Redis flags, non-authoritative for now."""
    redis = await get_redis()
    email_verified = await redis.get(f"verify:email:verified:{current_user.id}")
    phone_verified = await redis.get(f"verify:phone:verified:{current_user.id}")
    last_email_sent = await redis.get(f"verify:email:sent:{current_user.id}")
    last_phone_sent = await redis.get(f"verify:phone:sent:{current_user.id}")
    return {
        "email": {
            "value": current_user.email,
            "verified": bool(email_verified),
            "last_sent_at": last_email_sent if last_email_sent else None,
        },
        "phone": {
            "value": current_user.phone,
            "verified": bool(phone_verified),
            "last_sent_at": last_phone_sent if last_phone_sent else None,
        },
    }


@router.post("/me/verification/email/send")
async def send_email_verification(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Issue a time-bound email verification token and track last sent time. In production, send via email service."""
    if not current_user.email:
        raise ValidationException("Email not set")
    # Rate limit: 3 per hour per user
    await rate_limiter.check_rate_limit(
        key=f"verify_email:{current_user.id}",
        max_requests=3,
        window_seconds=3600,
        identifier="email verification requests"
    )
    redis = await get_redis()
    token = f"ev-{current_user.id}-{int(datetime.utcnow().timestamp())}"
    await redis.setex(f"verify:email:token:{current_user.id}", 15 * 60, token)
    await redis.set(f"verify:email:sent:{current_user.id}", datetime.utcnow().isoformat())
    # Attempt to send email via SMTP if configured
    resp = {"message": "Verification email initiated"}
    try:
        smtp_host = getattr(settings, "SMTP_HOST", None)
        smtp_port = getattr(settings, "SMTP_PORT", None) or 587
        smtp_user = getattr(settings, "SMTP_USERNAME", None)
        smtp_pass = getattr(settings, "SMTP_PASSWORD", None)
        smtp_from = getattr(settings, "SMTP_FROM", None) or (smtp_user or "no-reply@civiclens.local")
        app_base_url = getattr(settings, "APP_BASE_URL", None) or "http://localhost:3000"
        verify_link = f"{app_base_url}/auth/verify-email?token={token}"
        if smtp_host and smtp_user and smtp_pass:
            from email.message import EmailMessage
            import smtplib
            msg = EmailMessage()
            msg["Subject"] = "Verify your email"
            msg["From"] = smtp_from
            msg["To"] = current_user.email
            msg.set_content(f"Hello,\n\nPlease verify your email by clicking the link below:\n{verify_link}\n\nThis link expires in 15 minutes.\n\nRegards,\nCivicLens")
            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
            resp["message"] = "Verification email sent"
        else:
            logger.warning("SMTP not configured; returning debug token in DEBUG only")
            resp["message"] = "Verification token generated"
    except Exception as e:
        logger.exception("Failed to send verification email: %s", e)
        # Do not reveal internal errors; token still generated
        resp["message"] = "Verification token generated"
    if getattr(settings, "DEBUG", False):
        resp["debug_token"] = token
    return resp


@router.post("/me/verification/email/verify")
async def verify_email(
    payload: EmailVerifyPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Verify email with token. Marks verified flag in Redis."""
    redis = await get_redis()
    stored = await redis.get(f"verify:email:token:{current_user.id}")
    if not stored or stored != payload.token:
        raise ValidationException("Invalid or expired verification token")
    await redis.set(f"verify:email:verified:{current_user.id}", "1")
    await redis.delete(f"verify:email:token:{current_user.id}")
    return {"message": "Email verified"}


@router.post("/me/verification/phone/send")
async def send_phone_verification(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Issue a phone verification OTP via Redis key. In production, send via SMS gateway."""
    if not current_user.phone:
        raise ValidationException("Phone not set")
    # Rate limit: 3 per hour per user
    await rate_limiter.check_rate_limit(
        key=f"verify_phone:{current_user.id}",
        max_requests=3,
        window_seconds=3600,
        identifier="phone verification requests"
    )
    from app.core.security import generate_otp
    redis = await get_redis()
    otp = generate_otp()
    await redis.setex(f"verify:phone:otp:{current_user.id}", 5 * 60, otp)
    await redis.set(f"verify:phone:sent:{current_user.id}", datetime.utcnow().isoformat())
    # TODO: integrate SMS provider
    resp = {"message": "Verification OTP sent"}
    if getattr(settings, "DEBUG", False):
        resp["debug_otp"] = otp
    return resp


@router.post("/me/verification/phone/verify")
async def verify_phone(
    payload: PhoneVerifyPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Verify phone with OTP. Marks verified flag in Redis."""
    redis = await get_redis()
    stored = await redis.get(f"verify:phone:otp:{current_user.id}")
    if not stored or stored != payload.otp:
        raise ValidationException("Invalid or expired OTP")
    await redis.set(f"verify:phone:verified:{current_user.id}", "1")
    await redis.delete(f"verify:phone:otp:{current_user.id}")
    return {"message": "Phone verified"}


# =============================
# Officer Statistics
# =============================




# =============================
# Officer Department Management
# =============================

class ChangeDepartmentRequest(BaseModel):
    user_id: int = Field(..., gt=0)
    new_department_id: int = Field(..., gt=0)
    reassignment_strategy: str = Field(default="keep_assignments", pattern="^(keep_assignments|reassign_reports|unassign_reports)$")
    notes: str | None = None


@router.post("/change-department")
async def change_officer_department(
    req: ChangeDepartmentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Change an officer's department with proper handling of existing assignments
    
    Reassignment strategies:
    - keep_assignments: Keep existing report assignments (may create cross-department assignments)
    - reassign_reports: Reassign reports to officers in the report's department
    - unassign_reports: Unassign all reports (set back to department level)
    """
    # Verify officer exists
    officer = await user_crud.get(db, req.user_id)
    if not officer:
        raise NotFoundException("Officer not found")
    
    # Verify officer is actually an officer
    if officer.role not in [UserRole.NODAL_OFFICER, UserRole.ADMIN]:
        raise ValidationException("User is not an officer")
    
    # Verify new department exists
    new_dept_result = await db.execute(
        select(Department).where(Department.id == req.new_department_id)
    )
    new_department = new_dept_result.scalar_one_or_none()
    if not new_department:
        raise NotFoundException(f"Department {req.new_department_id} not found")
    
    # Get old department info
    old_dept_result = await db.execute(
        select(Department).where(Department.id == officer.department_id)
    )
    old_department = old_dept_result.scalar_one_or_none()
    
    # Get officer's current assignments
    active_tasks_result = await db.execute(
        select(Task, Report)
        .join(Report, Task.report_id == Report.id)
        .where(
            and_(
                Task.assigned_to == req.user_id,
                Report.status.in_([
                    ReportStatus.ASSIGNED_TO_OFFICER,
                    ReportStatus.ACKNOWLEDGED,
                    ReportStatus.IN_PROGRESS,
                    ReportStatus.PENDING_VERIFICATION
                ])
            )
        )
    )
    active_assignments = active_tasks_result.all()
    
    # Handle existing assignments based on strategy
    reassignment_results = {
        "total_assignments": len(active_assignments),
        "kept_assignments": 0,
        "reassigned_reports": 0,
        "unassigned_reports": 0,
        "errors": []
    }
    
    try:
        if req.reassignment_strategy == "keep_assignments":
            # Keep all assignments as-is (may create cross-department assignments)
            reassignment_results["kept_assignments"] = len(active_assignments)
            
        elif req.reassignment_strategy == "reassign_reports":
            # Try to reassign reports to officers in the report's department
            from app.services.report_service import ReportService
            report_service = ReportService(db)
            
            for task, report in active_assignments:
                try:
                    if report.department_id and report.department_id != req.new_department_id:
                        # Try to auto-assign to an officer in the report's department
                        updated_report, assignment_info = await report_service.auto_assign_officer(
                            report_id=report.id,
                            assigned_by_id=current_user.id,
                            strategy="balanced",
                            notes=f"Reassigned due to officer department change. Original officer: {officer.full_name}"
                        )
                        reassignment_results["reassigned_reports"] += 1
                    else:
                        # Keep assignment if report is in the same department or no department
                        reassignment_results["kept_assignments"] += 1
                        
                except Exception as e:
                    # If reassignment fails, unassign the report
                    await db.execute(
                        select(Task).where(Task.id == task.id)
                    )
                    await db.delete(task)
                    
                    # Update report status back to department level
                    report.status = ReportStatus.ASSIGNED_TO_DEPARTMENT
                    report.status_updated_at = datetime.utcnow()
                    
                    reassignment_results["unassigned_reports"] += 1
                    reassignment_results["errors"].append({
                        "report_id": report.id,
                        "error": f"Failed to reassign: {str(e)}"
                    })
            
        elif req.reassignment_strategy == "unassign_reports":
            # Unassign all reports (set back to department level)
            for task, report in active_assignments:
                # Delete the task
                await db.delete(task)
                
                # Update report status back to department level
                report.status = ReportStatus.ASSIGNED_TO_DEPARTMENT
                report.status_updated_at = datetime.utcnow()
                
                reassignment_results["unassigned_reports"] += 1
        
        # Update officer's department
        officer.department_id = req.new_department_id
        await db.flush()
        
        # Record the change in role history (reusing for department changes)
        from app.crud.role_history import role_history_crud
        await role_history_crud.create_role_change(
            db=db,
            user_id=req.user_id,
            old_role=officer.role,
            new_role=officer.role,  # Role stays the same
            changed_by=current_user.id,
            reason=f"Department changed from {old_department.name if old_department else 'None'} to {new_department.name}. Strategy: {req.reassignment_strategy}. {req.notes or ''}".strip(),
            automatic=False
        )
        
        await db.commit()
        
        return {
            "message": "Officer department changed successfully",
            "officer": {
                "id": officer.id,
                "full_name": officer.full_name,
                "employee_id": officer.employee_id,
                "old_department": old_department.name if old_department else None,
                "new_department": new_department.name
            },
            "reassignment_results": reassignment_results,
            "strategy_used": req.reassignment_strategy
        }
        
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to change officer department: {str(e)}")
        raise ValidationException(f"Failed to change department: {str(e)}")
