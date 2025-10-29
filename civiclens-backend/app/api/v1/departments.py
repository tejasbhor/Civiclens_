"""
Departments API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Dict, Any

from app.core.database import get_db
from app.models.department import Department
from app.models.user import User, UserRole
from app.models.report import Report, ReportStatus
from app.models.task import Task, TaskStatus
from app.core.dependencies import get_current_user
from pydantic import BaseModel


router = APIRouter(prefix="/departments", tags=["departments"])


class DepartmentResponse(BaseModel):
    id: int
    name: str
    description: str | None = None
    keywords: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    
    model_config = {"from_attributes": True}


class DepartmentStatsResponse(BaseModel):
    department_id: int
    department_name: str
    total_officers: int
    active_officers: int
    total_reports: int
    pending_reports: int
    resolved_reports: int
    in_progress_reports: int
    avg_resolution_time_days: float | None = None
    resolution_rate: float


class DepartmentWithStatsResponse(DepartmentResponse):
    stats: DepartmentStatsResponse


@router.get("/", response_model=List[DepartmentResponse])
async def list_departments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all departments"""
    result = await db.execute(select(Department).order_by(Department.name))
    departments = result.scalars().all()
    return departments


@router.get("/{department_id}", response_model=DepartmentResponse)
async def get_department(
    department_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific department"""
    result = await db.execute(
        select(Department).where(Department.id == department_id)
    )
    department = result.scalar_one_or_none()
    
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )
    
    return department


@router.get("/stats/all", response_model=List[DepartmentStatsResponse])
async def get_all_department_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get statistics for all departments"""
    # Get all departments
    dept_result = await db.execute(select(Department))
    departments = dept_result.scalars().all()
    
    stats_list = []
    
    for dept in departments:
        stats = await get_department_statistics(db, dept.id, dept.name)
        stats_list.append(stats)
    
    return stats_list


@router.get("/{department_id}/stats", response_model=DepartmentStatsResponse)
async def get_department_stats(
    department_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get statistics for a specific department"""
    # Verify department exists
    dept_result = await db.execute(
        select(Department).where(Department.id == department_id)
    )
    department = dept_result.scalar_one_or_none()
    
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )
    
    return await get_department_statistics(db, department_id, department.name)


class OfficerResponse(BaseModel):
    id: int
    full_name: str | None = None
    email: str
    phone: str | None = None
    employee_id: str | None = None
    role: str
    is_active: bool
    department_id: int | None = None
    
    model_config = {"from_attributes": True}


@router.get("/{department_id}/officers", response_model=List[OfficerResponse])
async def get_department_officers(
    department_id: int,
    include_inactive: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all officers in a specific department"""
    # Verify department exists
    dept_result = await db.execute(
        select(Department).where(Department.id == department_id)
    )
    department = dept_result.scalar_one_or_none()
    
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )
    
    # Get officers in this department
    query = select(User).where(
        User.department_id == department_id,
        User.role.in_([UserRole.NODAL_OFFICER, UserRole.ADMIN])
    )
    
    if not include_inactive:
        query = query.where(User.is_active == True)
    
    query = query.order_by(User.full_name, User.email)
    
    result = await db.execute(query)
    officers = result.scalars().all()
    
    return officers


async def get_department_statistics(db: AsyncSession, department_id: int, department_name: str) -> DepartmentStatsResponse:
    """Helper function to calculate department statistics"""
    
    # Count officers in this department
    officers_result = await db.execute(
        select(func.count(User.id), func.count(User.id).filter(User.is_active == True))
        .where(User.department_id == department_id)
        .where(User.role.in_([UserRole.NODAL_OFFICER, UserRole.ADMIN]))
    )
    officer_counts = officers_result.first()
    total_officers = officer_counts[0] if officer_counts else 0
    active_officers = officer_counts[1] if officer_counts else 0
    
    # Count reports assigned to this department
    reports_result = await db.execute(
        select(
            func.count(Report.id).label('total'),
            func.count(Report.id).filter(Report.status.in_([
                ReportStatus.RECEIVED, 
                ReportStatus.PENDING_CLASSIFICATION,
                ReportStatus.CLASSIFIED,
                ReportStatus.ASSIGNED_TO_DEPARTMENT,
                ReportStatus.ASSIGNED_TO_OFFICER,
                ReportStatus.ACKNOWLEDGED
            ])).label('pending'),
            func.count(Report.id).filter(Report.status == ReportStatus.IN_PROGRESS).label('in_progress'),
            func.count(Report.id).filter(Report.status.in_([
                ReportStatus.RESOLVED,
                ReportStatus.CLOSED
            ])).label('resolved')
        )
        .where(Report.department_id == department_id)
    )
    report_counts = reports_result.first()
    
    total_reports = report_counts.total if report_counts else 0
    pending_reports = report_counts.pending if report_counts else 0
    in_progress_reports = report_counts.in_progress if report_counts else 0
    resolved_reports = report_counts.resolved if report_counts else 0
    
    # Calculate resolution rate
    resolution_rate = 0.0
    if total_reports > 0:
        resolution_rate = (resolved_reports / total_reports) * 100
    
    # Calculate average resolution time (simplified - using created_at to updated_at for resolved reports)
    avg_resolution_time = None
    if resolved_reports > 0:
        resolution_time_result = await db.execute(
            select(func.avg(func.extract('epoch', Report.updated_at - Report.created_at) / 86400))
            .where(Report.department_id == department_id)
            .where(Report.status.in_([ReportStatus.RESOLVED, ReportStatus.CLOSED]))
            .where(Report.updated_at.isnot(None))
        )
        avg_time = resolution_time_result.scalar()
        avg_resolution_time = float(avg_time) if avg_time else None
    
    return DepartmentStatsResponse(
        department_id=department_id,
        department_name=department_name,
        total_officers=total_officers,
        active_officers=active_officers,
        total_reports=total_reports,
        pending_reports=pending_reports,
        resolved_reports=resolved_reports,
        in_progress_reports=in_progress_reports,
        avg_resolution_time_days=avg_resolution_time,
        resolution_rate=round(resolution_rate, 1)
    )
