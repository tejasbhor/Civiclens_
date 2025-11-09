"""
Stale Task Detection Worker
Runs daily to detect and escalate tasks that are stuck for too long
"""

import asyncio
import logging
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.db.session import AsyncSessionLocal
from app.models.task import Task, TaskStatus
from app.models.report import Report, ReportStatus
from app.services.notification_service import NotificationService
from app.services.auto_escalation_service import AutoEscalationService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Stale thresholds (in days)
STALE_THRESHOLDS = {
    TaskStatus.ASSIGNED: 7,        # 7 days without acknowledgment
    TaskStatus.ACKNOWLEDGED: 7,    # 7 days without starting work
    TaskStatus.IN_PROGRESS: 14,    # 14 days without completion
    TaskStatus.ON_HOLD: 30,        # 30 days on hold
}


async def detect_stale_tasks():
    """Main stale task detection function"""
    logger.info("🔍 Starting stale task detection...")
    
    async with AsyncSessionLocal() as db:
        try:
            notification_service = NotificationService(db)
            escalation_service = AutoEscalationService(db)
            admin_ids = await notification_service.get_admin_user_ids()
            
            stale_counts = {
                TaskStatus.ASSIGNED: 0,
                TaskStatus.ACKNOWLEDGED: 0,
                TaskStatus.IN_PROGRESS: 0,
                TaskStatus.ON_HOLD: 0,
            }
            escalations_created = 0
            
            for task_status, threshold_days in STALE_THRESHOLDS.items():
                cutoff_date = datetime.utcnow() - timedelta(days=threshold_days)
                
                # Build query based on task status
                if task_status == TaskStatus.ASSIGNED:
                    # Tasks assigned but not acknowledged
                    query = select(Task, Report).join(
                        Report, Task.report_id == Report.id
                    ).where(
                        and_(
                            Task.status == TaskStatus.ASSIGNED,
                            Task.assigned_at < cutoff_date,
                            Task.acknowledged_at.is_(None)
                        )
                    )
                elif task_status == TaskStatus.ACKNOWLEDGED:
                    # Tasks acknowledged but not started
                    query = select(Task, Report).join(
                        Report, Task.report_id == Report.id
                    ).where(
                        and_(
                            Task.status == TaskStatus.ACKNOWLEDGED,
                            Task.acknowledged_at < cutoff_date,
                            Task.started_at.is_(None)
                        )
                    )
                elif task_status == TaskStatus.IN_PROGRESS:
                    # Tasks in progress but not completed
                    query = select(Task, Report).join(
                        Report, Task.report_id == Report.id
                    ).where(
                        and_(
                            Task.status == TaskStatus.IN_PROGRESS,
                            Task.started_at < cutoff_date
                        )
                    )
                elif task_status == TaskStatus.ON_HOLD:
                    # Tasks on hold for too long
                    query = select(Task, Report).join(
                        Report, Task.report_id == Report.id
                    ).where(
                        and_(
                            Task.status == TaskStatus.ON_HOLD,
                            Report.status == ReportStatus.ON_HOLD,
                            Report.updated_at < cutoff_date
                        )
                    )
                else:
                    continue
                
                result = await db.execute(query)
                stale_tasks = result.all()
                
                if stale_tasks:
                    stale_counts[task_status] = len(stale_tasks)
                    logger.warning(
                        f"⚠️  Found {len(stale_tasks)} stale tasks in {task_status.value} status "
                        f"(>{threshold_days} days)"
                    )
                    
                    # Send notifications and create escalations for each stale task
                    for task, report in stale_tasks:
                        await send_stale_task_notifications(
                            db=db,
                            task=task,
                            report=report,
                            task_status=task_status,
                            days_stale=threshold_days,
                            notification_service=notification_service,
                            admin_ids=admin_ids
                        )
                        
                        # Auto-create escalation for critical staleness
                        escalation = await escalation_service.check_and_create_stale_task_escalation(
                            task=task,
                            report=report,
                            days_stale=threshold_days
                        )
                        if escalation:
                            escalations_created += 1
                            # Auto-assign critical escalations
                            if escalation.severity.value == 'critical':
                                await escalation_service.auto_assign_escalation(escalation)
            
            await db.commit()
            
            total_stale = sum(stale_counts.values())
            logger.info(
                f"✅ Stale task detection complete: {total_stale} stale tasks found\n"
                f"   - Assigned (not acknowledged): {stale_counts[TaskStatus.ASSIGNED]}\n"
                f"   - Acknowledged (not started): {stale_counts[TaskStatus.ACKNOWLEDGED]}\n"
                f"   - In Progress (not completed): {stale_counts[TaskStatus.IN_PROGRESS]}\n"
                f"   - On Hold (too long): {stale_counts[TaskStatus.ON_HOLD]}\n"
                f"   - Escalations created: {escalations_created}"
            )
            
        except Exception as e:
            logger.error(f"❌ Stale task detection error: {str(e)}", exc_info=True)
            await db.rollback()


async def send_stale_task_notifications(
    db: AsyncSession,
    task: Task,
    report: Report,
    task_status: TaskStatus,
    days_stale: int,
    notification_service: NotificationService,
    admin_ids: list[int]
):
    """Send notifications for a stale task"""
    
    # Determine message based on status
    if task_status == TaskStatus.ASSIGNED:
        title = f"Stale Task: Not Acknowledged ({days_stale}+ days)"
        message = f"Task has been assigned for {days_stale}+ days without acknowledgment"
        priority = "high"
    elif task_status == TaskStatus.ACKNOWLEDGED:
        title = f"Stale Task: Not Started ({days_stale}+ days)"
        message = f"Task has been acknowledged for {days_stale}+ days but work not started"
        priority = "high"
    elif task_status == TaskStatus.IN_PROGRESS:
        title = f"Stale Task: Not Completed ({days_stale}+ days)"
        message = f"Task has been in progress for {days_stale}+ days without completion"
        priority = "high"
    elif task_status == TaskStatus.ON_HOLD:
        title = f"Stale Task: On Hold Too Long ({days_stale}+ days)"
        message = f"Task has been on hold for {days_stale}+ days. Consider reassignment or closure"
        priority = "critical"
    else:
        return
    
    # Notify officer
    try:
        await notification_service.create_notification(
            user_id=task.assigned_to,
            type="sla_warning",  # Reuse SLA warning type for stale tasks
            title=title,
            message=f"{message}. Report #{report.report_number}. Immediate action required",
            priority=priority,
            related_report_id=report.id,
            related_task_id=task.id,
            action_url=f"/tasks/{task.id}"
        )
        logger.info(f"   📧 Notified officer {task.assigned_to} about stale task #{task.id}")
    except Exception as e:
        logger.error(f"Failed to notify officer: {str(e)}")
    
    # Notify admins
    for admin_id in admin_ids:
        try:
            await notification_service.create_notification(
                user_id=admin_id,
                type="sla_warning",
                title=f"Stale Task Alert: Report #{report.report_number}",
                message=f"{message}. Officer: {task.officer.full_name if task.officer else 'Unknown'}. Consider escalation",
                priority=priority,
                related_report_id=report.id,
                related_task_id=task.id,
                action_url=f"/admin/tasks/{task.id}"
            )
        except Exception as e:
            logger.error(f"Failed to notify admin {admin_id}: {str(e)}")


async def run_stale_task_monitor():
    """Run stale task monitor in a loop (daily)"""
    logger.info("🚀 Stale Task Monitor started (runs every 24 hours)")
    
    while True:
        try:
            await detect_stale_tasks()
        except Exception as e:
            logger.error(f"Stale task monitor loop error: {str(e)}", exc_info=True)
        
        # Wait 24 hours
        logger.info("⏳ Sleeping for 24 hours...")
        await asyncio.sleep(86400)  # 24 hours


if __name__ == "__main__":
    """Run the worker directly"""
    asyncio.run(run_stale_task_monitor())
