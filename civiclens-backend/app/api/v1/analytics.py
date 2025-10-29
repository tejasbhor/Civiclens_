from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from app.core.database import get_db
from app.core.dependencies import require_officer  # Remove require_admin for now
from app.models.report import Report
from app.models.task import Task, TaskStatus
from app.crud.report import report_crud
from datetime import datetime, timedelta

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/stats")
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_officer)
):
    """Get dashboard statistics"""
    
    # Total reports
    total_reports = await report_crud.count(db)
    
    # Pending tasks
    pending_tasks_result = await db.execute(
        select(func.count(Task.id)).where(
            Task.status.in_([TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS])
        )
    )
    pending_tasks = pending_tasks_result.scalar() or 0
    
    # Resolved today
    today = datetime.utcnow().date()
    resolved_today_result = await db.execute(
        select(func.count(Task.id)).where(
            Task.status == TaskStatus.RESOLVED,
            func.date(Task.resolved_at) == today
        )
    )
    resolved_today = resolved_today_result.scalar() or 0
    
    # High priority count
    from app.models.report import ReportSeverity
    high_priority_count = await report_crud.count(
        db,
        filters={'severity': ReportSeverity.HIGH}
    )
    
    # Get statistics
    stats = await report_crud.get_statistics(db)
    
    return {
        "total_reports": total_reports,
        "pending_tasks": pending_tasks,
        "resolved_today": resolved_today,
        "high_priority_count": high_priority_count,
        "avg_resolution_time": 2.4,  # TODO: Calculate actual
        "reports_by_category": stats['by_category'],
        "reports_by_status": {k.value if hasattr(k, 'value') else str(k): v for k, v in stats['by_status'].items()},
        "reports_by_severity": {k.value if hasattr(k, 'value') else str(k): v for k, v in stats['by_severity'].items()},
    }
