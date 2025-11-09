"""
Auto-Escalation Service
Automatically creates escalations based on workflow violations
"""
import logging
from datetime import datetime
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.escalation import Escalation, EscalationType, EscalationStatus, EscalationSeverity
from app.models.task import Task, TaskStatus
from app.models.report import Report, ReportStatus, ReportSeverity
from app.models.user import User
from app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)


class AutoEscalationService:
    """Service for automatic escalation creation based on workflow violations"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.notification_service = NotificationService(db)
    
    async def check_and_create_sla_escalation(
        self,
        task: Task,
        report: Report,
        hours_overdue: float
    ) -> Optional[Escalation]:
        """
        Create escalation for SLA violation
        Only creates if violation is significant (>4 hours overdue)
        """
        # Don't escalate minor violations
        if hours_overdue < 4:
            return None
        
        # Check if escalation already exists for this task
        existing = await self.db.execute(
            select(Escalation).where(
                Escalation.task_id == task.id,
                Escalation.escalation_type == EscalationType.SLA_VIOLATION,
                Escalation.status.in_([
                    EscalationStatus.PENDING,
                    EscalationStatus.ASSIGNED,
                    EscalationStatus.INVESTIGATING
                ])
            )
        )
        if existing.scalar_one_or_none():
            logger.info(f"SLA escalation already exists for task {task.id}")
            return None
        
        # Determine severity based on how overdue
        if hours_overdue > 48:
            severity = EscalationSeverity.CRITICAL
        elif hours_overdue > 24:
            severity = EscalationSeverity.HIGH
        elif hours_overdue > 12:
            severity = EscalationSeverity.MEDIUM
        else:
            severity = EscalationSeverity.LOW
        
        # Create escalation
        escalation = Escalation(
            report_id=report.id,
            task_id=task.id,
            escalation_type=EscalationType.SLA_VIOLATION,
            severity=severity,
            title=f"SLA Violation: Report #{report.report_number}",
            description=(
                f"Task has violated SLA by {hours_overdue:.1f} hours. "
                f"Severity: {report.severity.value}. "
                f"Officer: {task.officer.full_name if task.officer else 'Unknown'}. "
                f"Assigned: {task.assigned_at.strftime('%Y-%m-%d %H:%M')}. "
                f"Deadline: {task.sla_deadline.strftime('%Y-%m-%d %H:%M')}."
            ),
            raised_by_system=True,
            status=EscalationStatus.PENDING
        )
        
        self.db.add(escalation)
        await self.db.flush()
        
        # Notify admins
        admin_ids = await self.notification_service.get_admin_user_ids()
        for admin_id in admin_ids:
            await self.notification_service.create_notification(
                user_id=admin_id,
                type="escalation_created",
                title=f"🚨 SLA Escalation: {report.report_number}",
                message=f"Task overdue by {hours_overdue:.1f}h. Immediate action required.",
                priority="critical" if severity == EscalationSeverity.CRITICAL else "high",
                related_report_id=report.id,
                related_task_id=task.id,
                action_url=f"/admin/escalations/{escalation.id}"
            )
        
        logger.warning(
            f"Created SLA escalation {escalation.id} for task {task.id} "
            f"(overdue by {hours_overdue:.1f}h)"
        )
        
        return escalation
    
    async def check_and_create_stale_task_escalation(
        self,
        task: Task,
        report: Report,
        days_stale: int
    ) -> Optional[Escalation]:
        """
        Create escalation for stale task
        Only creates for critical staleness (>14 days in progress, >30 days on hold)
        """
        # Determine if staleness warrants escalation
        should_escalate = False
        reason = ""
        
        if task.status == TaskStatus.IN_PROGRESS and days_stale >= 21:
            should_escalate = True
            reason = f"Task in progress for {days_stale} days without completion"
        elif task.status == TaskStatus.ASSIGNED and days_stale >= 10:
            should_escalate = True
            reason = f"Task assigned for {days_stale} days without acknowledgment"
        elif task.status == TaskStatus.ON_HOLD and days_stale >= 45:
            should_escalate = True
            reason = f"Task on hold for {days_stale} days"
        
        if not should_escalate:
            return None
        
        # Check if escalation already exists
        existing = await self.db.execute(
            select(Escalation).where(
                Escalation.task_id == task.id,
                Escalation.escalation_type == EscalationType.STALE_TASK,
                Escalation.status.in_([
                    EscalationStatus.PENDING,
                    EscalationStatus.ASSIGNED,
                    EscalationStatus.INVESTIGATING
                ])
            )
        )
        if existing.scalar_one_or_none():
            logger.info(f"Stale task escalation already exists for task {task.id}")
            return None
        
        # Determine severity
        if days_stale > 60:
            severity = EscalationSeverity.CRITICAL
        elif days_stale > 45:
            severity = EscalationSeverity.HIGH
        else:
            severity = EscalationSeverity.MEDIUM
        
        # Create escalation
        escalation = Escalation(
            report_id=report.id,
            task_id=task.id,
            escalation_type=EscalationType.STALE_TASK,
            severity=severity,
            title=f"Stale Task: Report #{report.report_number}",
            description=(
                f"{reason}. "
                f"Officer: {task.officer.full_name if task.officer else 'Unknown'}. "
                f"Status: {task.status.value}. "
                f"Consider reassignment or escalation to senior officer."
            ),
            raised_by_system=True,
            status=EscalationStatus.PENDING
        )
        
        self.db.add(escalation)
        await self.db.flush()
        
        # Notify admins
        admin_ids = await self.notification_service.get_admin_user_ids()
        for admin_id in admin_ids:
            await self.notification_service.create_notification(
                user_id=admin_id,
                type="escalation_created",
                title=f"⚠️ Stale Task Escalation: {report.report_number}",
                message=reason,
                priority="high",
                related_report_id=report.id,
                related_task_id=task.id,
                action_url=f"/admin/escalations/{escalation.id}"
            )
        
        logger.warning(
            f"Created stale task escalation {escalation.id} for task {task.id} "
            f"({days_stale} days stale)"
        )
        
        return escalation
    
    async def check_and_create_quality_escalation(
        self,
        task: Task,
        report: Report,
        rejection_count: int
    ) -> Optional[Escalation]:
        """
        Create escalation for repeated quality issues
        Triggers after 2+ rejections on same task
        """
        if rejection_count < 2:
            return None
        
        # Check if escalation already exists
        existing = await self.db.execute(
            select(Escalation).where(
                Escalation.task_id == task.id,
                Escalation.escalation_type == EscalationType.QUALITY_ISSUE,
                Escalation.status.in_([
                    EscalationStatus.PENDING,
                    EscalationStatus.ASSIGNED,
                    EscalationStatus.INVESTIGATING
                ])
            )
        )
        if existing.scalar_one_or_none():
            logger.info(f"Quality escalation already exists for task {task.id}")
            return None
        
        # Create escalation
        escalation = Escalation(
            report_id=report.id,
            task_id=task.id,
            escalation_type=EscalationType.QUALITY_ISSUE,
            severity=EscalationSeverity.HIGH,
            title=f"Quality Issue: Report #{report.report_number}",
            description=(
                f"Task has been rejected {rejection_count} times due to quality issues. "
                f"Officer: {task.officer.full_name if task.officer else 'Unknown'}. "
                f"Last rejection: {task.rejection_reason or 'No reason provided'}. "
                f"Consider reassignment to more experienced officer."
            ),
            raised_by_system=True,
            status=EscalationStatus.PENDING
        )
        
        self.db.add(escalation)
        await self.db.flush()
        
        # Notify admins
        admin_ids = await self.notification_service.get_admin_user_ids()
        for admin_id in admin_ids:
            await self.notification_service.create_notification(
                user_id=admin_id,
                type="escalation_created",
                title=f"🔍 Quality Escalation: {report.report_number}",
                message=f"Task rejected {rejection_count} times. Review officer assignment.",
                priority="high",
                related_report_id=report.id,
                related_task_id=task.id,
                action_url=f"/admin/escalations/{escalation.id}"
            )
        
        logger.warning(
            f"Created quality escalation {escalation.id} for task {task.id} "
            f"({rejection_count} rejections)"
        )
        
        return escalation
    
    async def check_and_create_repeated_failure_escalation(
        self,
        officer: User,
        recent_failures: int,
        period_days: int = 30
    ) -> Optional[Escalation]:
        """
        Create escalation for officer with repeated failures
        Triggers after 3+ SLA violations or quality issues in 30 days
        """
        if recent_failures < 3:
            return None
        
        # Check if escalation already exists for this officer
        existing = await self.db.execute(
            select(Escalation).where(
                Escalation.escalation_type == EscalationType.REPEATED_FAILURE,
                Escalation.description.contains(f"Officer ID: {officer.id}"),
                Escalation.status.in_([
                    EscalationStatus.PENDING,
                    EscalationStatus.ASSIGNED,
                    EscalationStatus.INVESTIGATING
                ])
            )
        )
        if existing.scalar_one_or_none():
            logger.info(f"Repeated failure escalation already exists for officer {officer.id}")
            return None
        
        # Create escalation
        escalation = Escalation(
            escalation_type=EscalationType.REPEATED_FAILURE,
            severity=EscalationSeverity.HIGH,
            title=f"Performance Issue: Officer {officer.full_name}",
            description=(
                f"Officer {officer.full_name} (ID: {officer.id}) has {recent_failures} "
                f"failures (SLA violations or quality issues) in the last {period_days} days. "
                f"Requires performance review and potential training or reassignment."
            ),
            raised_by_system=True,
            status=EscalationStatus.PENDING
        )
        
        self.db.add(escalation)
        await self.db.flush()
        
        # Notify admins and department head
        admin_ids = await self.notification_service.get_admin_user_ids()
        for admin_id in admin_ids:
            await self.notification_service.create_notification(
                user_id=admin_id,
                type="escalation_created",
                title=f"📉 Performance Escalation: {officer.full_name}",
                message=f"{recent_failures} failures in {period_days} days. Review required.",
                priority="high",
                action_url=f"/admin/escalations/{escalation.id}"
            )
        
        logger.warning(
            f"Created performance escalation {escalation.id} for officer {officer.id} "
            f"({recent_failures} failures)"
        )
        
        return escalation
    
    async def auto_assign_escalation(
        self,
        escalation: Escalation
    ) -> bool:
        """
        Auto-assign escalation to appropriate admin based on severity and type
        """
        # Get admin users
        result = await self.db.execute(
            select(User).where(
                User.role.in_(['admin', 'super_admin']),
                User.is_active == True
            )
        )
        admins = result.scalars().all()
        
        if not admins:
            logger.warning("No active admins found for escalation assignment")
            return False
        
        # Simple assignment: assign to first available admin
        # TODO: Implement intelligent routing based on workload/expertise
        assigned_admin = admins[0]
        
        escalation.assigned_to_user_id = assigned_admin.id
        escalation.status = EscalationStatus.ASSIGNED
        escalation.assigned_at = datetime.utcnow()
        
        await self.db.flush()
        
        # Notify assigned admin
        await self.notification_service.create_notification(
            user_id=assigned_admin.id,
            type="escalation_assigned",
            title=f"Escalation Assigned: {escalation.title}",
            message=f"You have been assigned an escalation. Severity: {escalation.severity.value}",
            priority="high" if escalation.severity == EscalationSeverity.CRITICAL else "medium",
            related_report_id=escalation.report_id,
            related_task_id=escalation.task_id,
            action_url=f"/admin/escalations/{escalation.id}"
        )
        
        logger.info(f"Auto-assigned escalation {escalation.id} to admin {assigned_admin.id}")
        
        return True
