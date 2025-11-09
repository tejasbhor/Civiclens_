"""
SLA Monitoring Worker
Runs hourly to check SLA compliance and send warnings/violations
"""

import asyncio
import logging
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from app.db.session import AsyncSessionLocal
from app.models.task import Task, TaskStatus
from app.models.report import Report, ReportSeverity
from app.services.notification_service import NotificationService
from app.services.auto_escalation_service import AutoEscalationService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# SLA Targets (in hours)
SLA_TARGETS = {
    ReportSeverity.CRITICAL: 24,    # 24 hours
    ReportSeverity.HIGH: 72,        # 3 days
    ReportSeverity.MEDIUM: 168,     # 7 days
    ReportSeverity.LOW: 336         # 14 days
}

# Warning threshold (hours before deadline)
WARNING_THRESHOLD_HOURS = 2


async def calculate_sla_deadline(task: Task, report: Report) -> datetime:
    """Calculate SLA deadline based on report severity"""
    severity = report.severity or ReportSeverity.MEDIUM
    sla_hours = SLA_TARGETS.get(severity, SLA_TARGETS[ReportSeverity.MEDIUM])
    
    # Start from task assignment time
    start_time = task.assigned_at or task.created_at
    deadline = start_time + timedelta(hours=sla_hours)
    
    return deadline


async def check_sla_compliance():
    """Main SLA monitoring function"""
    logger.info("🕐 Starting SLA compliance check...")
    
    async with AsyncSessionLocal() as db:
        try:
            # Get all active tasks
            result = await db.execute(
                select(Task, Report).join(
                    Report, Task.report_id == Report.id
                ).where(
                    and_(
                        Task.status.in_([
                            TaskStatus.ASSIGNED,
                            TaskStatus.ACKNOWLEDGED,
                            TaskStatus.IN_PROGRESS
                        ]),
                        or_(
                            Task.sla_deadline.is_(None),
                            Task.sla_deadline > datetime.utcnow()
                        )
                    )
                )
            )
            
            tasks_and_reports = result.all()
            logger.info(f"Found {len(tasks_and_reports)} active tasks to check")
            
            notification_service = NotificationService(db)
            escalation_service = AutoEscalationService(db)
            admin_ids = await notification_service.get_admin_user_ids()
            
            warnings_sent = 0
            violations_found = 0
            deadlines_set = 0
            escalations_created = 0
            
            for task, report in tasks_and_reports:
                # Set SLA deadline if not set
                if not task.sla_deadline:
                    task.sla_deadline = await calculate_sla_deadline(task, report)
                    deadlines_set += 1
                    await db.flush()
                
                now = datetime.utcnow()
                time_remaining = (task.sla_deadline - now).total_seconds() / 3600  # hours
                
                # Check for violations
                if time_remaining <= 0:
                    if task.sla_violated < 2:  # Not already marked as violated
                        task.sla_violated = 2  # Violated
                        task.sla_violation_count += 1
                        violations_found += 1
                        
                        logger.warning(
                            f"❌ SLA VIOLATION: Task #{task.id}, Report #{report.report_number}, "
                            f"Officer: {task.officer.full_name if task.officer else 'Unknown'}, "
                            f"Overdue by: {abs(time_remaining):.1f} hours"
                        )
                        
                        # Send violation notifications
                        await notification_service.notify_sla_violated(
                            task=task,
                            report=report,
                            admin_user_ids=admin_ids
                        )
                        
                        # Auto-create escalation for significant violations
                        escalation = await escalation_service.check_and_create_sla_escalation(
                            task=task,
                            report=report,
                            hours_overdue=abs(time_remaining)
                        )
                        if escalation:
                            escalations_created += 1
                            # Auto-assign critical escalations
                            if escalation.severity.value == 'critical':
                                await escalation_service.auto_assign_escalation(escalation)
                
                # Check for warnings
                elif 0 < time_remaining <= WARNING_THRESHOLD_HOURS:
                    if task.sla_violated == 0:  # Not already warned
                        task.sla_violated = 1  # Warning
                        warnings_sent += 1
                        
                        logger.warning(
                            f"⚠️  SLA WARNING: Task #{task.id}, Report #{report.report_number}, "
                            f"Time remaining: {time_remaining:.1f} hours"
                        )
                        
                        # Send warning notification
                        await notification_service.notify_sla_warning(
                            task=task,
                            report=report,
                            hours_remaining=time_remaining
                        )
            
            await db.commit()
            
            logger.info(
                f"✅ SLA check complete: "
                f"{deadlines_set} deadlines set, "
                f"{warnings_sent} warnings sent, "
                f"{violations_found} violations found, "
                f"{escalations_created} escalations created"
            )
            
        except Exception as e:
            logger.error(f"❌ SLA monitoring error: {str(e)}", exc_info=True)
            await db.rollback()


async def run_sla_monitor():
    """Run SLA monitor in a loop (hourly)"""
    logger.info("🚀 SLA Monitor started (runs every hour)")
    
    while True:
        try:
            await check_sla_compliance()
        except Exception as e:
            logger.error(f"SLA monitor loop error: {str(e)}", exc_info=True)
        
        # Wait 1 hour
        logger.info("⏳ Sleeping for 1 hour...")
        await asyncio.sleep(3600)


if __name__ == "__main__":
    asyncio.run(run_sla_monitor())
