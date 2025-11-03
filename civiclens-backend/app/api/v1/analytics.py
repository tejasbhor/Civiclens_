from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from app.core.database import get_db, get_redis
from app.core.dependencies import require_officer  # Remove require_admin for now
from app.models.report import Report
from app.models.task import Task, TaskStatus
from app.crud.report import report_crud
from datetime import datetime, timedelta
import json
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/stats")
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_officer)
):
    """
    Get dashboard statistics with Redis caching
    Cache duration: 30 seconds for real-time feel with performance boost
    """
    
    # Try to get from cache first
    try:
        redis = await get_redis()
        cached_stats = await redis.get("dashboard:stats")
        if cached_stats:
            logger.debug("Dashboard stats served from cache")
            return json.loads(cached_stats)
    except Exception as e:
        logger.warning(f"Redis cache read failed: {e}. Falling back to database.")
    
    # Cache miss or Redis unavailable - compute from database
    logger.debug("Computing dashboard stats from database")
    
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
    
    # High priority count - ONLY active reports (exclude closed, resolved, rejected)
    from app.models.report import ReportSeverity, ReportStatus
    high_priority_result = await db.execute(
        select(func.count(Report.id)).where(
            Report.severity == ReportSeverity.HIGH,
            Report.status.not_in([
                ReportStatus.CLOSED,
                ReportStatus.RESOLVED,
                ReportStatus.REJECTED
            ])
        )
    )
    high_priority_count = high_priority_result.scalar() or 0
    
    # Critical priority count - ONLY active reports
    critical_priority_result = await db.execute(
        select(func.count(Report.id)).where(
            Report.severity == ReportSeverity.CRITICAL,
            Report.status.not_in([
                ReportStatus.CLOSED,
                ReportStatus.RESOLVED,
                ReportStatus.REJECTED
            ])
        )
    )
    critical_priority_count = critical_priority_result.scalar() or 0
    
    # Get statistics
    stats = await report_crud.get_statistics(db)
    
    # Build response
    stats_response = {
        "total_reports": total_reports,
        "pending_tasks": pending_tasks,
        "resolved_today": resolved_today,
        "high_priority_count": high_priority_count,
        "critical_priority_count": critical_priority_count,
        "avg_resolution_time": 2.4,  # TODO: Calculate actual
        "reports_by_category": stats['by_category'],
        "reports_by_status": {k.value if hasattr(k, 'value') else str(k): v for k, v in stats['by_status'].items()},
        "reports_by_severity": {k.value if hasattr(k, 'value') else str(k): v for k, v in stats['by_severity'].items()},
    }
    
    # Cache for 10 seconds (reduced from 30 for more real-time updates)
    try:
        redis = await get_redis()
        await redis.setex(
            "dashboard:stats",
            10,  # 10 seconds TTL for faster updates
            json.dumps(stats_response)
        )
        logger.debug("Dashboard stats cached for 10 seconds")
    except Exception as e:
        logger.warning(f"Redis cache write failed: {e}. Continuing without cache.")
    
    return stats_response
