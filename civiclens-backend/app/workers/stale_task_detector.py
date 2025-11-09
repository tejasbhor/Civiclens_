"""
Stale Task Detector
Runs daily to detect and escalate tasks stuck in the same status for too long
"""

import asyncio
import logging
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.db.session import AsyncSessionLocal
from app.models.task import Task, TaskStatus
from app.models.report import Report, ReportStatus
from app.models.escalation import Escalation, EscalationReason, EscalationPriority
from app.services.notification_service import NotificationService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Stale task thresholds (in days)
STALE_THRESHOLDS = {
    TaskStatus.ASSIGNED: 7,         # 7 days without acknowledgment
    TaskStatus.ACKNOWLEDGED: 3,     # 3 days without starting work
    TaskStatus.IN_PROGRESS: 14,     # 14 days without completion
    TaskStatus.ON_HOLD: 30          # 30 days on hold
}


async def detect_stale_tasks():
    """Detect and escalate stale tasks"""
    logger.info("🔍 Starting stale task detection...")
    
    async with AsyncSessionLocal() as db:
        try:
            now = datetime.utcnow()
            escalations_created = 0
            
            for status, threshold_days in STALE_THRESHOLDS.items():
                threshold_date = now - timedelta(days=threshold_days)
                
                # Get tasks in this status longer than threshold
                result = await db.execute(
                    select(Task, Report).join(
                        Report, Task.report_id == Report.id
                    ).where(
                        and_(
                            Task.status == status,
                            Task.updated_at < threshold_date
                        )
                    )
                )
                
                stale_tasks = result.all()
                
                if stale_tasks:
                    logger.warning(
                        f"Found {len(stale_tasks)} stale tasks in status {status.value} "
                        f"(>{threshold_days} days)"
                    )
                
                for task, report in stale_tasks:
                    # Check if already escalated recently (within 7 days)
                    recent_escalation = await db.execute(
                        select(Escalation).where(
                            and_(
                                Escalation.report_id == report.id,
                                Escalation.created_at > now - timedelta(days=7)
                            )
                        )
                    )
                    
                    if recent_escalation.scalar_one_or_none():
                        logger.info(f"Skipping task #{task.id} - already escalated recently")
                        continue
                    
                    # Calculate days stale
                    days_stale = (now - task.updated_at).days
                    
                    # Create escalation
                    escalation = Escalation(
                        report_id=report.id,
                        escalated_by_user_id=None,  # System escalation
                        escalated_to_user_id=None,  # To be assigned by admin
                        reason=EscalationReason.STALE_TASK,
                        priority=EscalationPriority.HIGH if days_stale > threshold_days * 1.5 else EscalationPriority.MEDIUM,
                        description=f"Task has been in {status.value} status for {days_stale} days (threshold: {threshold_days} days). Automatic escalation by system.",
                        notes=f"Officer: {task.officer.full_name if task.officer else 'Unknown'}\nReport: #{report.report_number}\nCategory: {report.category or 'N/A'}"
                    )
                    
                    db.add(escalation)
                    escalations_created += 1
                    
                    logger.warning(
                        f"🚨 Created escalation for stale task: "
                        f"Task #{task.id}, Report #{report.report_number}, "
                        f"Status: {status.value}, Days stale: {days_stale}"
                    )
                    
                    # Send notifications to admins
                    try:
                        notification_service = NotificationService(db)
                        admin_ids = await notification_service.get_admin_user_ids()
                        
                        for admin_id in admin_ids:
                            await notification_service.create_notification(
                                user_id=admin_id,
                                type="escalation_created",
                                title=f"Stale Task Escalated: Report #{report.report_number}",
                                message=f"Task has been stale for {days_stale} days in {status.value} status",
                                priority="high",
                                related_report_id=report.id,
                                related_task_id=task.id,
                                action_url=f"/admin/escalations/{escalation.id}"
                            )
                    except Exception as e:
                        logger.error(f"Failed to send escalation notifications: {str(e)}")
            
            await db.commit()
            
            logger.info(
                f"✅ Stale task detection complete: {escalations_created} escalations created"
            )
            
        except Exception as e:
            logger.error(f"❌ Stale task detection error: {str(e)}", exc_info=True)
            await db.rollback()


async def run_stale_task_detector():
    """Run stale task detector in a loop (daily)"""
    logger.info("🚀 Stale Task Detector started (runs daily)")
    
    while True:
        try:
            await detect_stale_tasks()
        except Exception as e:
            logger.error(f"Stale task detector loop error: {str(e)}", exc_info=True)
        
        # Wait 24 hours
        logger.info("⏳ Sleeping for 24 hours...")
        await asyncio.sleep(86400)


if __name__ == "__main__":
    asyncio.run(run_stale_task_detector())
