from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from datetime import datetime
from app.crud.base import CRUDBase
from app.models.task import Task, TaskStatus
from app.schemas.task import TaskCreate, TaskUpdate


class CRUDTask(CRUDBase[Task, TaskCreate, TaskUpdate]):
    """CRUD operations for Task model"""
    
    async def get_by_report(
        self,
        db: AsyncSession,
        report_id: int
    ) -> Optional[Task]:
        """Get task by report ID"""
        result = await db.execute(
            select(Task)
            .where(Task.report_id == report_id)
        )
        return result.scalar_one_or_none()
    
    async def get_by_officer(
        self,
        db: AsyncSession,
        officer_id: int,
        status: Optional[TaskStatus] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Task]:
        """Get all tasks assigned to an officer"""
        filters = {'assigned_to': officer_id}
        if status:
            filters['status'] = status
        
        return await self.get_multi(
            db,
            skip=skip,
            limit=limit,
            filters=filters,
            relationships=['report', 'report.user', 'report.department']
        )
    
    async def get_pending_tasks(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100
    ) -> List[Task]:
        """Get all pending tasks (assigned or in progress)"""
        query = (
            select(Task)
            .where(Task.status.in_([TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS]))
            .order_by(Task.priority.desc(), Task.created_at.asc())
            .offset(skip)
            .limit(limit)
        )
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def get_officer_workload(
        self,
        db: AsyncSession,
        officer_id: int
    ) -> int:
        """Get count of active tasks for an officer"""
        return await self.count(
            db,
            filters={
                'assigned_to': officer_id,
                'status': TaskStatus.IN_PROGRESS
            }
        )
    
    async def count_by_officer(
        self,
        db: AsyncSession,
        officer_id: int
    ) -> int:
        """Count total tasks assigned to an officer"""
        result = await db.execute(
            select(func.count(Task.id))
            .where(Task.assigned_to == officer_id)
        )
        return result.scalar() or 0
    
    async def count_by_officer_and_status(
        self,
        db: AsyncSession,
        officer_id: int,
        status: str
    ) -> int:
        """Count tasks by officer and status"""
        result = await db.execute(
            select(func.count(Task.id))
            .where(
                and_(
                    Task.assigned_to == officer_id,
                    Task.status == status
                )
            )
        )
        return result.scalar() or 0
    
    async def count_overdue_by_officer(
        self,
        db: AsyncSession,
        officer_id: int,
        overdue_cutoff: datetime
    ) -> int:
        """Count overdue tasks for an officer"""
        result = await db.execute(
            select(func.count(Task.id))
            .where(
                and_(
                    Task.assigned_to == officer_id,
                    Task.created_at < overdue_cutoff,
                    Task.status.in_(["assigned", "in_progress", "acknowledged"])
                )
            )
        )
        return result.scalar() or 0
    
    async def get_avg_resolution_time(
        self,
        db: AsyncSession,
        officer_id: int
    ) -> float:
        """Get average resolution time in hours for an officer"""
        result = await db.execute(
            select(
                func.avg(
                    func.extract('epoch', Task.resolved_at - Task.created_at) / 3600
                )
            )
            .where(
                and_(
                    Task.assigned_to == officer_id,
                    Task.status == "resolved",
                    Task.resolved_at.isnot(None)
                )
            )
        )
        return result.scalar() or 0.0


# Singleton instance
task_crud = CRUDTask(Task)
