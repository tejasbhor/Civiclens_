from fastapi import APIRouter, Depends, HTTPException, Query, Request, status as http_status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_admin
from app.core.exceptions import NotFoundException, ForbiddenException, ValidationException
from app.core.audit_logger import audit_logger
from app.models.audit_log import AuditAction, AuditStatus
from app.schemas.task import TaskResponse, TaskWithDetails, TaskUpdate, TaskCreate
from app.schemas.common import PaginatedResponse
from app.models.user import User, UserRole
from app.models.task import Task, TaskStatus
from app.models.report import Report, ReportStatus
from app.crud.task import task_crud
from app.crud.report import report_crud
from app.crud.user import user_crud
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.get("/", response_model=PaginatedResponse[TaskWithDetails])
async def get_tasks(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[TaskStatus] = Query(None),
    officer_id: Optional[int] = Query(None),
    department_id: Optional[int] = Query(None),
    priority: Optional[int] = Query(None, ge=1, le=10),
    search: Optional[str] = Query(None),
    sort_by: str = Query("created_at", regex="^(created_at|priority|status|assigned_at)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get all tasks with filtering and pagination"""
    
    try:
        # Build base query
        query = (
            select(Task)
            .options(
                selectinload(Task.report).selectinload(Report.user),
                selectinload(Task.report).selectinload(Report.department),
                selectinload(Task.officer)
            )
        )
        
        # Apply filters
        filters = []
        
        if status:
            filters.append(Task.status == status)
        
        if officer_id:
            filters.append(Task.assigned_to == officer_id)
        
        if priority:
            filters.append(Task.priority == priority)
        
        if department_id:
            # Filter by department through report relationship
            query = query.join(Report, Task.report_id == Report.id)
            filters.append(Report.department_id == department_id)
        
        if search:
            # Search in report title, description, or officer name
            query = query.join(Report, Task.report_id == Report.id, isouter=True)
            query = query.join(User, Task.assigned_to == User.id, isouter=True)
            search_filter = or_(
                Report.title.ilike(f"%{search}%"),
                Report.description.ilike(f"%{search}%"),
                User.full_name.ilike(f"%{search}%"),
                Task.notes.ilike(f"%{search}%")
            )
            filters.append(search_filter)
        
        if filters:
            query = query.where(and_(*filters))
        
        # Apply sorting
        if sort_by == "created_at":
            sort_column = Task.created_at
        elif sort_by == "priority":
            sort_column = Task.priority
        elif sort_by == "status":
            sort_column = Task.status
        elif sort_by == "assigned_at":
            sort_column = Task.assigned_at
        else:
            sort_column = Task.created_at
        
        if sort_order == "desc":
            query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(sort_column.asc())
        
        # Get total count
        count_query = select(func.count(Task.id))
        if filters:
            if department_id or search:
                count_query = count_query.select_from(Task.join(Report, Task.report_id == Report.id))
                if search:
                    count_query = count_query.join(User, Task.assigned_to == User.id, isouter=True)
            count_query = count_query.where(and_(*filters))
        
        total_result = await db.execute(count_query)
        total = total_result.scalar()
        
        # Apply pagination
        query = query.offset(skip).limit(limit)
        
        # Execute query
        result = await db.execute(query)
        tasks = result.scalars().all()
        
        # Convert to response format
        task_responses = []
        for task in tasks:
            task_dict = {
                "id": task.id,
                "report_id": task.report_id,
                "assigned_to": task.assigned_to,
                "assigned_by": task.assigned_by,
                "status": task.status,
                "priority": task.priority,
                "notes": task.notes,
                "resolution_notes": task.resolution_notes,
                "assigned_at": task.assigned_at,
                "acknowledged_at": task.acknowledged_at,
                "started_at": task.started_at,
                "resolved_at": task.resolved_at,
                "report": None,
                "officer": None
            }
            
            # Add report details
            if task.report:
                task_dict["report"] = {
                    "id": task.report.id,
                    "report_number": task.report.report_number,
                    "title": task.report.title,
                    "description": task.report.description,
                    "status": task.report.status,
                    "severity": task.report.severity,
                    "category": task.report.category,
                    "sub_category": task.report.sub_category,
                    "address": task.report.address,
                    "latitude": task.report.latitude,
                    "longitude": task.report.longitude,
                    "created_at": task.report.created_at,
                    "user": {
                        "id": task.report.user.id,
                        "full_name": task.report.user.full_name,
                        "phone": task.report.user.phone
                    } if task.report.user else None,
                    "department": {
                        "id": task.report.department.id,
                        "name": task.report.department.name
                    } if task.report.department else None
                }
            
            # Add officer details
            if task.officer:
                task_dict["officer"] = {
                    "id": task.officer.id,
                    "full_name": task.officer.full_name,
                    "phone": task.officer.phone,
                    "email": task.officer.email,
                    "role": task.officer.role
                }
            
            task_responses.append(task_dict)
        
        # Audit log
        await audit_logger.log(
            db=db,
            user_id=current_user.id,
            action=AuditAction.TASKS_VIEWED,
            resource_type="tasks",
            resource_id=None,
            metadata={"filters": {"status": status, "officer_id": officer_id, "department_id": department_id}},
            request=request,
            status=AuditStatus.SUCCESS
        )
        
        return PaginatedResponse(
            data=task_responses,
            total=total,
            page=skip // limit + 1,
            per_page=limit,
            total_pages=(total + limit - 1) // limit
        )
        
    except Exception as e:
        logger.error(f"Error fetching tasks: {str(e)}")
        await audit_logger.log(
            db=db,
            user_id=current_user.id,
            action=AuditAction.TASKS_VIEWED,
            resource_type="tasks",
            resource_id=None,
            metadata={"error": str(e)},
            request=request,
            status=AuditStatus.FAILURE
        )
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch tasks"
        )


@router.get("/{task_id}", response_model=TaskWithDetails)
async def get_task(
    task_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get task by ID with full details"""
    
    try:
        # Get task with relationships
        query = (
            select(Task)
            .options(
                selectinload(Task.report).selectinload(Report.user),
                selectinload(Task.report).selectinload(Report.department),
                selectinload(Task.report).selectinload(Report.media),
                selectinload(Task.officer)
            )
            .where(Task.id == task_id)
        )
        
        result = await db.execute(query)
        task = result.scalar_one_or_none()
        
        if not task:
            raise NotFoundException(f"Task with ID {task_id} not found")
        
        # Convert to response format
        task_dict = {
            "id": task.id,
            "report_id": task.report_id,
            "assigned_to": task.assigned_to,
            "assigned_by": task.assigned_by,
            "status": task.status,
            "priority": task.priority,
            "notes": task.notes,
            "resolution_notes": task.resolution_notes,
            "assigned_at": task.assigned_at,
            "acknowledged_at": task.acknowledged_at,
            "started_at": task.started_at,
            "resolved_at": task.resolved_at,
            "report": None,
            "officer": None
        }
        
        # Add report details with media
        if task.report:
            task_dict["report"] = {
                "id": task.report.id,
                "report_number": task.report.report_number,
                "title": task.report.title,
                "description": task.report.description,
                "status": task.report.status,
                "severity": task.report.severity,
                "category": task.report.category,
                "sub_category": task.report.sub_category,
                "address": task.report.address,
                "latitude": task.report.latitude,
                "longitude": task.report.longitude,
                "created_at": task.report.created_at,
                "updated_at": task.report.updated_at,
                "user": {
                    "id": task.report.user.id,
                    "full_name": task.report.user.full_name,
                    "phone": task.report.user.phone
                } if task.report.user else None,
                "department": {
                    "id": task.report.department.id,
                    "name": task.report.department.name
                } if task.report.department else None,
                "media": [
                    {
                        "id": media.id,
                        "file_path": media.file_path,
                        "file_type": media.file_type,
                        "file_size": media.file_size,
                        "uploaded_at": media.uploaded_at
                    } for media in task.report.media
                ] if task.report.media else []
            }
        
        # Add officer details
        if task.officer:
            task_dict["officer"] = {
                "id": task.officer.id,
                "full_name": task.officer.full_name,
                "phone": task.officer.phone,
                "email": task.officer.email,
                "role": task.officer.role
            }
        
        # Audit log
        await audit_logger.log(
            db=db,
            user_id=current_user.id,
            action=AuditAction.TASK_VIEWED,
            resource_type="task",
            resource_id=task_id,
            metadata={"task_status": task.status.value},
            request=request,
            status=AuditStatus.SUCCESS
        )
        
        return task_dict
        
    except NotFoundException:
        raise
    except Exception as e:
        logger.error(f"Error fetching task {task_id}: {str(e)}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch task"
        )


@router.put("/{task_id}", response_model=TaskWithDetails)
async def update_task(
    task_id: int,
    task_update: TaskUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update task status, priority, or notes"""
    
    try:
        # Get existing task
        task = await task_crud.get(db, task_id)
        if not task:
            raise NotFoundException(f"Task with ID {task_id} not found")
        
        # Store old values for audit
        old_status = task.status
        old_priority = task.priority
        
        # Update task
        updated_task = await task_crud.update(db, db_obj=task, obj_in=task_update)
        
        # If status changed to resolved, update timestamps
        if task_update.status == TaskStatus.RESOLVED and old_status != TaskStatus.RESOLVED:
            from datetime import datetime
            updated_task.resolved_at = datetime.utcnow()
            await db.commit()
            await db.refresh(updated_task)
        
        # Update report status if task status changed
        if task_update.status and task_update.status != old_status:
            report = await report_crud.get(db, updated_task.report_id)
            if report:
                if task_update.status == TaskStatus.RESOLVED:
                    report.status = ReportStatus.RESOLVED
                elif task_update.status == TaskStatus.IN_PROGRESS:
                    report.status = ReportStatus.IN_PROGRESS
                elif task_update.status == TaskStatus.REJECTED:
                    report.status = ReportStatus.REJECTED
                
                await db.commit()
        
        # Audit log
        await audit_logger.log(
            db=db,
            user_id=current_user.id,
            action=AuditAction.TASK_UPDATED,
            resource_type="task",
            resource_id=task_id,
            metadata={
                "old_status": old_status.value if old_status else None,
                "new_status": task_update.status.value if task_update.status else None,
                "old_priority": old_priority,
                "new_priority": task_update.priority,
                "notes_updated": bool(task_update.notes),
                "resolution_notes_updated": bool(task_update.resolution_notes)
            },
            request=request,
            status=AuditStatus.SUCCESS
        )
        
        # Return updated task with details
        return await get_task(task_id, request, db, current_user)
        
    except NotFoundException:
        raise
    except Exception as e:
        logger.error(f"Error updating task {task_id}: {str(e)}")
        await audit_logger.log(
            db=db,
            user_id=current_user.id,
            action=AuditAction.TASK_UPDATED,
            resource_type="task",
            resource_id=task_id,
            metadata={"error": str(e)},
            request=request,
            status=AuditStatus.FAILURE
        )
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update task"
        )


@router.post("/{task_id}/reassign")
async def reassign_task(
    task_id: int,
    new_officer_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Reassign task to a different officer"""
    
    try:
        # Get existing task
        task = await task_crud.get(db, task_id)
        if not task:
            raise NotFoundException(f"Task with ID {task_id} not found")
        
        # Verify new officer exists and is active
        new_officer = await user_crud.get(db, new_officer_id)
        if not new_officer or new_officer.role not in [UserRole.NODAL_OFFICER]:
            raise ValidationException("Invalid officer ID or officer is not active")
        
        # Store old officer for audit
        old_officer_id = task.assigned_to
        
        # Update assignment
        task.assigned_to = new_officer_id
        task.assigned_by = current_user.id
        task.status = TaskStatus.ASSIGNED  # Reset to assigned
        task.acknowledged_at = None
        task.started_at = None
        
        await db.commit()
        await db.refresh(task)
        
        # Audit log
        await audit_logger.log(
            db=db,
            user_id=current_user.id,
            action=AuditAction.TASK_REASSIGNED,
            resource_type="task",
            resource_id=task_id,
            metadata={
                "old_officer_id": old_officer_id,
                "new_officer_id": new_officer_id,
                "reassigned_by": current_user.id
            },
            request=request,
            status=AuditStatus.SUCCESS
        )
        
        return {"message": "Task reassigned successfully", "task_id": task_id}
        
    except (NotFoundException, ValidationException):
        raise
    except Exception as e:
        logger.error(f"Error reassigning task {task_id}: {str(e)}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reassign task"
        )


from pydantic import BaseModel

class BulkUpdateRequest(BaseModel):
    task_ids: List[int]
    updates: TaskUpdate

@router.post("/bulk-update")
async def bulk_update_tasks(
    bulk_request: BulkUpdateRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Bulk update multiple tasks"""
    
    try:
        task_ids = bulk_request.task_ids
        updates = bulk_request.updates
        
        if not task_ids:
            raise ValidationException("No task IDs provided")
        
        if len(task_ids) > 100:
            raise ValidationException("Cannot update more than 100 tasks at once")
        
        # Get all tasks to update
        tasks_query = select(Task).where(Task.id.in_(task_ids))
        result = await db.execute(tasks_query)
        tasks = result.scalars().all()
        
        if len(tasks) != len(task_ids):
            found_ids = [task.id for task in tasks]
            missing_ids = [tid for tid in task_ids if tid not in found_ids]
            raise ValidationException(f"Tasks not found: {missing_ids}")
        
        updated_count = 0
        
        # Update each task
        for task in tasks:
            old_status = task.status
            old_priority = task.priority
            
            # Apply updates
            if updates.status is not None:
                task.status = updates.status
                
                # Update timestamps for status changes
                if updates.status == TaskStatus.RESOLVED and old_status != TaskStatus.RESOLVED:
                    from datetime import datetime
                    task.resolved_at = datetime.utcnow()
            
            if updates.priority is not None:
                task.priority = updates.priority
            
            if updates.notes is not None:
                task.notes = updates.notes
            
            if updates.resolution_notes is not None:
                task.resolution_notes = updates.resolution_notes
            
            updated_count += 1
            
            # Update related report status if task status changed
            if updates.status and updates.status != old_status:
                report = await report_crud.get(db, task.report_id)
                if report:
                    if updates.status == TaskStatus.RESOLVED:
                        report.status = ReportStatus.RESOLVED
                    elif updates.status == TaskStatus.IN_PROGRESS:
                        report.status = ReportStatus.IN_PROGRESS
                    elif updates.status == TaskStatus.REJECTED:
                        report.status = ReportStatus.REJECTED
        
        await db.commit()
        
        # Audit log
        await audit_logger.log(
            db=db,
            user_id=current_user.id,
            action=AuditAction.TASKS_BULK_UPDATED,
            resource_type="tasks",
            resource_id=None,
            metadata={
                "task_ids": task_ids,
                "updated_count": updated_count,
                "updates": {
                    "status": updates.status.value if updates.status else None,
                    "priority": updates.priority,
                    "notes_updated": bool(updates.notes),
                    "resolution_notes_updated": bool(updates.resolution_notes)
                }
            },
            request=request,
            status=AuditStatus.SUCCESS
        )
        
        return {"updated_count": updated_count}
        
    except (ValidationException, NotFoundException):
        raise
    except Exception as e:
        logger.error(f"Error bulk updating tasks: {str(e)}")
        await audit_logger.log(
            db=db,
            user_id=current_user.id,
            action=AuditAction.TASKS_BULK_UPDATED,
            resource_type="tasks",
            resource_id=None,
            metadata={"error": str(e), "task_ids": task_ids},
            request=request,
            status=AuditStatus.FAILURE
        )
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to bulk update tasks"
        )


@router.get("/stats/overview")
async def get_task_stats(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get task statistics overview"""
    
    try:
        # Get task counts by status
        status_counts = {}
        for task_status in TaskStatus:
            count_result = await db.execute(
                select(func.count(Task.id)).where(Task.status == task_status)
            )
            status_counts[task_status.value] = count_result.scalar()
        
        # Get priority distribution
        priority_counts = {}
        for priority in range(1, 11):
            count_result = await db.execute(
                select(func.count(Task.id)).where(Task.priority == priority)
            )
            priority_counts[str(priority)] = count_result.scalar()
        
        # Get officer workload (top 10 officers by active tasks)
        officer_workload_result = await db.execute(
            select(
                User.id,
                User.full_name,
                func.count(Task.id).label('active_tasks')
            )
            .join(Task, User.id == Task.assigned_to)
            .where(Task.status.in_([TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS]))
            .group_by(User.id, User.full_name)
            .order_by(func.count(Task.id).desc())
            .limit(10)
        )
        
        officer_workload = [
            {
                "officer_id": row.id,
                "officer_name": row.full_name,
                "active_tasks": row.active_tasks
            }
            for row in officer_workload_result.all()
        ]
        
        # Get total tasks
        total_result = await db.execute(select(func.count(Task.id)))
        total_tasks = total_result.scalar()
        
        stats = {
            "total_tasks": total_tasks,
            "status_distribution": status_counts,
            "priority_distribution": priority_counts,
            "officer_workload": officer_workload
        }
        
        # Audit log
        await audit_logger.log(
            db=db,
            user_id=current_user.id,
            action=AuditAction.TASK_STATS_VIEWED,
            resource_type="task_stats",
            resource_id=None,
            metadata={"total_tasks": total_tasks},
            request=request,
            status=AuditStatus.SUCCESS
        )
        
        return stats
        
    except Exception as e:
        logger.error(f"Error fetching task stats: {str(e)}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch task statistics"
        )