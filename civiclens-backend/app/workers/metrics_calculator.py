"""
Officer Metrics Calculation Worker
Runs weekly to calculate performance metrics for all field officers
"""

import asyncio
import logging
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from app.db.session import AsyncSessionLocal
from app.models.user import User, UserRole
from app.models.task import Task, TaskStatus
from app.models.report import Report, ReportStatus
from app.models.feedback import Feedback, SatisfactionLevel
from app.models.officer_metrics import OfficerMetrics

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def calculate_officer_metrics(
    db: AsyncSession,
    officer_id: int,
    period_start: datetime,
    period_end: datetime
) -> OfficerMetrics:
    """Calculate metrics for a single officer for a given period"""
    
    # Get all tasks for this officer in the period
    result = await db.execute(
        select(Task).where(
            and_(
                Task.assigned_to == officer_id,
                Task.assigned_at >= period_start,
                Task.assigned_at < period_end
            )
        )
    )
    tasks = result.scalars().all()
    
    if not tasks:
        logger.info(f"   No tasks found for officer {officer_id} in period")
        return None
    
    # Initialize counters
    total_assigned = len(tasks)
    total_completed = 0
    total_active = 0
    total_acknowledged = 0
    total_in_progress = 0
    total_on_hold = 0
    
    # Time tracking
    acknowledgment_times = []
    resolution_times = []
    completion_times = []
    
    # SLA tracking
    sla_violations_count = 0
    sla_warnings_count = 0
    sla_compliant_count = 0
    
    # Quality tracking
    rework_count = 0
    first_time_resolution_count = 0
    
    # Process each task
    for task in tasks:
        # Status counts
        if task.status == TaskStatus.RESOLVED:
            total_completed += 1
        elif task.status in [TaskStatus.ASSIGNED, TaskStatus.ACKNOWLEDGED, TaskStatus.IN_PROGRESS]:
            total_active += 1
        
        if task.status == TaskStatus.ACKNOWLEDGED or task.acknowledged_at:
            total_acknowledged += 1
        
        if task.status == TaskStatus.IN_PROGRESS or task.started_at:
            total_in_progress += 1
        
        if task.status == TaskStatus.ON_HOLD:
            total_on_hold += 1
        
        # Time calculations
        if task.acknowledged_at and task.assigned_at:
            ack_time = (task.acknowledged_at - task.assigned_at).total_seconds() / 3600
            acknowledgment_times.append(ack_time)
        
        if task.resolved_at and task.assigned_at:
            res_time = (task.resolved_at - task.assigned_at).total_seconds() / 3600
            resolution_times.append(res_time)
        
        if task.resolved_at and task.started_at:
            comp_time = (task.resolved_at - task.started_at).total_seconds() / 3600
            completion_times.append(comp_time)
        
        # SLA tracking
        if task.sla_violated == 2:
            sla_violations_count += 1
        elif task.sla_violated == 1:
            sla_warnings_count += 1
        else:
            sla_compliant_count += 1
        
        # Quality tracking (check if task was ever rejected)
        if task.rejection_reason:
            rework_count += 1
        elif task.status == TaskStatus.RESOLVED:
            first_time_resolution_count += 1
    
    # Calculate averages
    avg_acknowledgment_time = sum(acknowledgment_times) / len(acknowledgment_times) if acknowledgment_times else 0
    avg_resolution_time = sum(resolution_times) / len(resolution_times) if resolution_times else 0
    avg_completion_time = sum(completion_times) / len(completion_times) if completion_times else 0
    
    # Calculate rates (as percentages)
    resolution_rate = (total_completed / total_assigned * 100) if total_assigned > 0 else 0
    sla_compliance_rate = (sla_compliant_count / total_assigned * 100) if total_assigned > 0 else 0
    rework_rate = (rework_count / total_assigned * 100) if total_assigned > 0 else 0
    first_time_resolution_rate = (first_time_resolution_count / total_completed * 100) if total_completed > 0 else 0
    
    # Get feedback/satisfaction data
    feedback_result = await db.execute(
        select(Feedback).join(
            Report, Feedback.report_id == Report.id
        ).join(
            Task, Task.report_id == Report.id
        ).where(
            and_(
                Task.assigned_to == officer_id,
                Feedback.created_at >= period_start,
                Feedback.created_at < period_end
            )
        )
    )
    feedbacks = feedback_result.scalars().all()
    
    total_feedbacks_received = len(feedbacks)
    positive_feedbacks_count = sum(1 for f in feedbacks if f.satisfaction_level in [
        SatisfactionLevel.SATISFIED, SatisfactionLevel.VERY_SATISFIED
    ])
    negative_feedbacks_count = sum(1 for f in feedbacks if f.satisfaction_level in [
        SatisfactionLevel.DISSATISFIED, SatisfactionLevel.VERY_DISSATISFIED
    ])
    
    # Calculate average satisfaction score (1-5 scale)
    satisfaction_map = {
        SatisfactionLevel.VERY_DISSATISFIED: 1,
        SatisfactionLevel.DISSATISFIED: 2,
        SatisfactionLevel.NEUTRAL: 3,
        SatisfactionLevel.SATISFIED: 4,
        SatisfactionLevel.VERY_SATISFIED: 5,
    }
    satisfaction_scores = [satisfaction_map.get(f.satisfaction_level, 3) for f in feedbacks]
    avg_satisfaction_score = sum(satisfaction_scores) / len(satisfaction_scores) if satisfaction_scores else 0
    
    # Calculate workload metrics
    period_days = (period_end - period_start).days
    avg_daily_workload = total_assigned / period_days if period_days > 0 else 0
    
    # Calculate peak concurrent tasks (simplified - count max active tasks at any point)
    peak_concurrent_tasks = total_active  # Simplified for now
    
    # Create or update metrics record
    metrics = OfficerMetrics(
        officer_id=officer_id,
        period_start=period_start,
        period_end=period_end,
        total_assigned=total_assigned,
        total_completed=total_completed,
        total_active=total_active,
        total_acknowledged=total_acknowledged,
        total_in_progress=total_in_progress,
        total_on_hold=total_on_hold,
        resolution_rate=round(resolution_rate, 2),
        avg_resolution_time_hours=round(avg_resolution_time, 2),
        avg_acknowledgment_time_hours=round(avg_acknowledgment_time, 2),
        avg_completion_time_hours=round(avg_completion_time, 2),
        sla_compliance_rate=round(sla_compliance_rate, 2),
        sla_violations_count=sla_violations_count,
        sla_warnings_count=sla_warnings_count,
        avg_satisfaction_score=round(avg_satisfaction_score, 2),
        total_feedbacks_received=total_feedbacks_received,
        positive_feedbacks_count=positive_feedbacks_count,
        negative_feedbacks_count=negative_feedbacks_count,
        rework_count=rework_count,
        rework_rate=round(rework_rate, 2),
        first_time_resolution_rate=round(first_time_resolution_rate, 2),
        avg_daily_workload=round(avg_daily_workload, 2),
        peak_concurrent_tasks=peak_concurrent_tasks,
        calculated_at=datetime.utcnow()
    )
    
    logger.info(
        f"   📊 Officer {officer_id}: {total_assigned} tasks, "
        f"{resolution_rate:.1f}% resolution rate, "
        f"{sla_compliance_rate:.1f}% SLA compliance"
    )
    
    return metrics


async def calculate_all_officer_metrics():
    """Calculate metrics for all field officers"""
    logger.info("📊 Starting officer metrics calculation...")
    
    async with AsyncSessionLocal() as db:
        try:
            # Get all field officers
            result = await db.execute(
                select(User).where(User.role == UserRole.FIELD_OFFICER)
            )
            officers = result.scalars().all()
            
            if not officers:
                logger.warning("No field officers found")
                return
            
            logger.info(f"Found {len(officers)} field officers")
            
            # Calculate for last week
            period_end = datetime.utcnow()
            period_start = period_end - timedelta(days=7)
            
            logger.info(f"Calculating metrics for period: {period_start.date()} to {period_end.date()}")
            
            metrics_created = 0
            metrics_skipped = 0
            
            for officer in officers:
                try:
                    # Check if metrics already exist for this period
                    existing = await db.execute(
                        select(OfficerMetrics).where(
                            and_(
                                OfficerMetrics.officer_id == officer.id,
                                OfficerMetrics.period_start == period_start,
                                OfficerMetrics.period_end == period_end
                            )
                        )
                    )
                    
                    if existing.scalar_one_or_none():
                        logger.info(f"   ⏭️  Skipping officer {officer.id} - metrics already exist")
                        metrics_skipped += 1
                        continue
                    
                    # Calculate metrics
                    metrics = await calculate_officer_metrics(
                        db=db,
                        officer_id=officer.id,
                        period_start=period_start,
                        period_end=period_end
                    )
                    
                    if metrics:
                        db.add(metrics)
                        metrics_created += 1
                    
                except Exception as e:
                    logger.error(f"Error calculating metrics for officer {officer.id}: {str(e)}")
                    continue
            
            await db.commit()
            
            logger.info(
                f"✅ Officer metrics calculation complete:\n"
                f"   - Metrics created: {metrics_created}\n"
                f"   - Metrics skipped (already exist): {metrics_skipped}\n"
                f"   - Total officers processed: {len(officers)}"
            )
            
        except Exception as e:
            logger.error(f"❌ Officer metrics calculation error: {str(e)}", exc_info=True)
            await db.rollback()


async def run_metrics_calculator():
    """Run metrics calculator in a loop (weekly)"""
    logger.info("🚀 Officer Metrics Calculator started (runs every 7 days)")
    
    while True:
        try:
            await calculate_all_officer_metrics()
        except Exception as e:
            logger.error(f"Metrics calculator loop error: {str(e)}", exc_info=True)
        
        # Wait 7 days
        logger.info("⏳ Sleeping for 7 days...")
        await asyncio.sleep(604800)  # 7 days


if __name__ == "__main__":
    """Run the worker directly"""
    asyncio.run(run_metrics_calculator())
