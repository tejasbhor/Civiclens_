"""
Notification Service for CivicLens
Handles creation and delivery of notifications to users
"""

from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from datetime import datetime
from app.models.notification import Notification, NotificationType, NotificationPriority
from app.models.user import User
from app.models.report import Report, ReportStatus
from app.models.task import Task
import logging

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for managing notifications"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_notification(
        self,
        user_id: int,
        type: NotificationType,
        title: str,
        message: str,
        priority: NotificationPriority = NotificationPriority.NORMAL,
        related_report_id: Optional[int] = None,
        related_task_id: Optional[int] = None,
        related_appeal_id: Optional[int] = None,
        related_escalation_id: Optional[int] = None,
        action_url: Optional[str] = None
    ) -> Notification:
        """Create a new notification"""
        notification = Notification(
            user_id=user_id,
            type=type.value if isinstance(type, NotificationType) else type,
            priority=priority.value if isinstance(priority, NotificationPriority) else priority,
            title=title,
            message=message,
            related_report_id=related_report_id,
            related_task_id=related_task_id,
            related_appeal_id=related_appeal_id,
            related_escalation_id=related_escalation_id,
            action_url=action_url
        )
        
        self.db.add(notification)
        await self.db.flush()
        
        logger.info(
            f"Created notification: user_id={user_id}, type={type}, "
            f"report_id={related_report_id}, priority={priority}"
        )
        
        return notification
    
    async def notify_status_change(
        self,
        report: Report,
        old_status: ReportStatus,
        new_status: ReportStatus,
        changed_by_user_id: int
    ):
        """Notify relevant users about report status change"""
        
        # Notify report submitter (citizen)
        await self.create_notification(
            user_id=report.user_id,
            type=NotificationType.STATUS_CHANGE,
            title=f"Report #{report.report_number} Status Updated",
            message=f"Your report status changed from {old_status.value} to {new_status.value}",
            priority=self._get_priority_for_status(new_status),
            related_report_id=report.id,
            action_url=f"/reports/{report.id}"
        )
        
        # Notify assigned officer if exists
        if report.task and report.task.assigned_to != changed_by_user_id:
            await self.create_notification(
                user_id=report.task.assigned_to,
                type=NotificationType.STATUS_CHANGE,
                title=f"Report #{report.report_number} Status Updated",
                message=f"Report status changed to {new_status.value}",
                priority=self._get_priority_for_status(new_status),
                related_report_id=report.id,
                related_task_id=report.task.id,
                action_url=f"/tasks/{report.task.id}"
            )
    
    async def notify_task_assigned(
        self,
        task: Task,
        report: Report,
        assigned_by_user_id: int
    ):
        """Notify officer about new task assignment"""
        await self.create_notification(
            user_id=task.assigned_to,
            type=NotificationType.TASK_ASSIGNED,
            title=f"New Task Assigned: {report.category or 'Report'}",
            message=f"You have been assigned to report #{report.report_number}. Priority: {task.priority}/10",
            priority=NotificationPriority.HIGH if task.priority >= 7 else NotificationPriority.NORMAL,
            related_report_id=report.id,
            related_task_id=task.id,
            action_url=f"/tasks/{task.id}"
        )
        
        # Notify citizen that officer was assigned
        await self.create_notification(
            user_id=report.user_id,
            type=NotificationType.TASK_ASSIGNED,
            title=f"Officer Assigned to Report #{report.report_number}",
            message=f"An officer has been assigned to work on your report",
            priority=NotificationPriority.NORMAL,
            related_report_id=report.id,
            action_url=f"/reports/{report.id}"
        )
    
    async def notify_task_acknowledged(
        self,
        task: Task,
        report: Report
    ):
        """Notify citizen that officer acknowledged the task"""
        await self.create_notification(
            user_id=report.user_id,
            type=NotificationType.TASK_ACKNOWLEDGED,
            title=f"Officer Acknowledged Report #{report.report_number}",
            message=f"The assigned officer has acknowledged your report and will begin work soon",
            priority=NotificationPriority.NORMAL,
            related_report_id=report.id,
            action_url=f"/reports/{report.id}"
        )
    
    async def notify_work_started(
        self,
        task: Task,
        report: Report
    ):
        """Notify citizen that work has started"""
        await self.create_notification(
            user_id=report.user_id,
            type=NotificationType.TASK_STARTED,
            title=f"Work Started on Report #{report.report_number}",
            message=f"The officer has started working on resolving your report",
            priority=NotificationPriority.NORMAL,
            related_report_id=report.id,
            action_url=f"/reports/{report.id}"
        )
    
    async def notify_verification_required(
        self,
        task: Task,
        report: Report,
        admin_user_ids: List[int]
    ):
        """Notify admins that verification is required"""
        for admin_id in admin_user_ids:
            await self.create_notification(
                user_id=admin_id,
                type=NotificationType.VERIFICATION_REQUIRED,
                title=f"Verification Required: Report #{report.report_number}",
                message=f"Officer has completed work on report. Please review and verify",
                priority=NotificationPriority.HIGH,
                related_report_id=report.id,
                related_task_id=task.id,
                action_url=f"/admin/reports/{report.id}/verify"
            )
        
        # Notify citizen
        await self.create_notification(
            user_id=report.user_id,
            type=NotificationType.TASK_COMPLETED,
            title=f"Work Completed on Report #{report.report_number}",
            message=f"The officer has completed work on your report. It is now under admin review",
            priority=NotificationPriority.NORMAL,
            related_report_id=report.id,
            action_url=f"/reports/{report.id}"
        )
    
    async def notify_resolution_approved(
        self,
        report: Report,
        approved_by_user_id: int
    ):
        """Notify citizen and officer that resolution was approved"""
        # Notify citizen
        await self.create_notification(
            user_id=report.user_id,
            type=NotificationType.RESOLUTION_APPROVED,
            title=f"Report #{report.report_number} Resolved",
            message=f"Your report has been resolved. Please provide your feedback",
            priority=NotificationPriority.HIGH,
            related_report_id=report.id,
            action_url=f"/reports/{report.id}/feedback"
        )
        
        # Notify officer
        if report.task:
            await self.create_notification(
                user_id=report.task.assigned_to,
                type=NotificationType.RESOLUTION_APPROVED,
                title=f"Resolution Approved: Report #{report.report_number}",
                message=f"Admin has approved your work on this report",
                priority=NotificationPriority.NORMAL,
                related_report_id=report.id,
                related_task_id=report.task.id,
                action_url=f"/tasks/{report.task.id}"
            )
    
    async def notify_resolution_rejected(
        self,
        report: Report,
        task: Task,
        rejection_reason: str
    ):
        """Notify officer that resolution was rejected"""
        await self.create_notification(
            user_id=task.assigned_to,
            type=NotificationType.RESOLUTION_REJECTED,
            title=f"Rework Required: Report #{report.report_number}",
            message=f"Admin has requested rework. Reason: {rejection_reason}",
            priority=NotificationPriority.HIGH,
            related_report_id=report.id,
            related_task_id=task.id,
            action_url=f"/tasks/{task.id}"
        )
    
    async def notify_sla_warning(
        self,
        task: Task,
        report: Report,
        hours_remaining: float
    ):
        """Notify officer about approaching SLA deadline"""
        await self.create_notification(
            user_id=task.assigned_to,
            type=NotificationType.SLA_WARNING,
            title=f"SLA Warning: Report #{report.report_number}",
            message=f"SLA deadline approaching in {hours_remaining:.1f} hours. Please prioritize this task",
            priority=NotificationPriority.HIGH,
            related_report_id=report.id,
            related_task_id=task.id,
            action_url=f"/tasks/{task.id}"
        )
    
    async def notify_sla_violated(
        self,
        task: Task,
        report: Report,
        admin_user_ids: List[int]
    ):
        """Notify officer and admins about SLA violation"""
        # Notify officer
        await self.create_notification(
            user_id=task.assigned_to,
            type=NotificationType.SLA_VIOLATED,
            title=f"SLA Violated: Report #{report.report_number}",
            message=f"This task has exceeded its SLA deadline. Immediate action required",
            priority=NotificationPriority.CRITICAL,
            related_report_id=report.id,
            related_task_id=task.id,
            action_url=f"/tasks/{task.id}"
        )
        
        # Notify admins
        for admin_id in admin_user_ids:
            await self.create_notification(
                user_id=admin_id,
                type=NotificationType.SLA_VIOLATED,
                title=f"SLA Violation: Report #{report.report_number}",
                message=f"Task has violated SLA deadline. Officer: {task.officer.full_name if task.officer else 'Unknown'}",
                priority=NotificationPriority.CRITICAL,
                related_report_id=report.id,
                related_task_id=task.id,
                action_url=f"/admin/tasks/{task.id}"
            )
    
    async def notify_assignment_rejected(
        self,
        report: Report,
        task: Task,
        rejection_reason: str,
        admin_user_ids: List[int]
    ):
        """Notify admins that officer rejected assignment"""
        for admin_id in admin_user_ids:
            await self.create_notification(
                user_id=admin_id,
                type=NotificationType.ASSIGNMENT_REJECTED,
                title=f"Assignment Rejected: Report #{report.report_number}",
                message=f"Officer rejected assignment. Reason: {rejection_reason}",
                priority=NotificationPriority.HIGH,
                related_report_id=report.id,
                related_task_id=task.id,
                action_url=f"/admin/reports/{report.id}/reassign"
            )
    
    async def notify_on_hold(
        self,
        report: Report,
        task: Task,
        hold_reason: str,
        admin_user_ids: List[int]
    ):
        """Notify citizen and admins that task is on hold"""
        # Notify citizen
        await self.create_notification(
            user_id=report.user_id,
            type=NotificationType.ON_HOLD,
            title=f"Report #{report.report_number} On Hold",
            message=f"Work has been temporarily paused. Reason: {hold_reason}",
            priority=NotificationPriority.NORMAL,
            related_report_id=report.id,
            action_url=f"/reports/{report.id}"
        )
        
        # Notify admins
        for admin_id in admin_user_ids:
            await self.create_notification(
                user_id=admin_id,
                type=NotificationType.ON_HOLD,
                title=f"Task On Hold: Report #{report.report_number}",
                message=f"Officer put task on hold. Reason: {hold_reason}",
                priority=NotificationPriority.NORMAL,
                related_report_id=report.id,
                related_task_id=task.id,
                action_url=f"/admin/tasks/{task.id}"
            )
    
    async def mark_as_read(self, notification_id: int, user_id: int) -> bool:
        """Mark notification as read"""
        result = await self.db.execute(
            select(Notification).where(
                and_(
                    Notification.id == notification_id,
                    Notification.user_id == user_id
                )
            )
        )
        notification = result.scalar_one_or_none()
        
        if not notification:
            return False
        
        notification.is_read = True
        notification.read_at = datetime.utcnow()
        await self.db.flush()
        
        return True
    
    async def mark_all_as_read(self, user_id: int) -> int:
        """Mark all notifications as read for a user"""
        result = await self.db.execute(
            select(Notification).where(
                and_(
                    Notification.user_id == user_id,
                    Notification.is_read == False
                )
            )
        )
        notifications = result.scalars().all()
        
        count = 0
        for notification in notifications:
            notification.is_read = True
            notification.read_at = datetime.utcnow()
            count += 1
        
        await self.db.flush()
        return count
    
    async def get_user_notifications(
        self,
        user_id: int,
        unread_only: bool = False,
        limit: int = 50,
        offset: int = 0
    ) -> List[Notification]:
        """Get notifications for a user"""
        query = select(Notification).where(Notification.user_id == user_id)
        
        if unread_only:
            query = query.where(Notification.is_read == False)
        
        query = query.order_by(Notification.created_at.desc())
        query = query.limit(limit).offset(offset)
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def get_unread_count(self, user_id: int) -> int:
        """Get count of unread notifications"""
        result = await self.db.execute(
            select(Notification).where(
                and_(
                    Notification.user_id == user_id,
                    Notification.is_read == False
                )
            )
        )
        return len(result.scalars().all())
    
    async def get_admin_user_ids(self) -> List[int]:
        """Get list of admin user IDs for notifications"""
        from app.models.user import UserRole
        
        result = await self.db.execute(
            select(User.id).where(
                or_(
                    User.role == UserRole.ADMIN,
                    User.role == UserRole.SUPER_ADMIN
                )
            )
        )
        return [row[0] for row in result.all()]
    
    async def notify_report_received(
        self,
        report: Report
    ):
        """Notify citizen that their report was received"""
        await self.create_notification(
            user_id=report.user_id,
            type=NotificationType.STATUS_CHANGE,
            title=f"Report #{report.report_number} Received",
            message=f"Your report has been received and assigned ID #{report.report_number}. We'll process it shortly.",
            priority=NotificationPriority.NORMAL,
            related_report_id=report.id,
            action_url=f"/reports/{report.id}"
        )
    
    async def notify_report_classified(
        self,
        report: Report,
        admin_user_ids: List[int]
    ):
        """Notify admins that report needs classification or was classified"""
        # Notify citizen
        await self.create_notification(
            user_id=report.user_id,
            type=NotificationType.STATUS_CHANGE,
            title=f"Report #{report.report_number} Classified",
            message=f"Your report has been classified and is being routed to the appropriate department.",
            priority=NotificationPriority.NORMAL,
            related_report_id=report.id,
            action_url=f"/reports/{report.id}"
        )
        
        # Notify admins if pending classification
        if report.status == ReportStatus.PENDING_CLASSIFICATION:
            for admin_id in admin_user_ids:
                await self.create_notification(
                    user_id=admin_id,
                    type=NotificationType.STATUS_CHANGE,
                    title=f"Report #{report.report_number} Needs Classification",
                    message=f"New report requires classification and department assignment",
                    priority=NotificationPriority.NORMAL,
                    related_report_id=report.id,
                    action_url=f"/admin/reports/{report.id}/classify"
                )
    
    async def notify_department_assigned(
        self,
        report: Report,
        department_name: str,
        admin_user_ids: List[int]
    ):
        """Notify citizen and admins that department was assigned"""
        # Notify citizen
        await self.create_notification(
            user_id=report.user_id,
            type=NotificationType.STATUS_CHANGE,
            title=f"Report #{report.report_number} Assigned to Department",
            message=f"Your report has been assigned to {department_name}. An officer will be assigned soon.",
            priority=NotificationPriority.NORMAL,
            related_report_id=report.id,
            action_url=f"/reports/{report.id}"
        )
    
    async def notify_report_rejected(
        self,
        report: Report,
        rejection_reason: Optional[str] = None
    ):
        """Notify citizen that their report was rejected"""
        message = "Your report has been rejected."
        if rejection_reason:
            message += f" Reason: {rejection_reason}"
        
        await self.create_notification(
            user_id=report.user_id,
            type=NotificationType.STATUS_CHANGE,
            title=f"Report #{report.report_number} Rejected",
            message=message,
            priority=NotificationPriority.CRITICAL,
            related_report_id=report.id,
            action_url=f"/reports/{report.id}"
        )
    
    async def notify_appeal_submitted(
        self,
        report: Report,
        appeal_id: int,
        admin_user_ids: List[int]
    ):
        """Notify admins that an appeal was submitted"""
        for admin_id in admin_user_ids:
            await self.create_notification(
                user_id=admin_id,
                type=NotificationType.APPEAL_SUBMITTED,
                title=f"Appeal Submitted: Report #{report.report_number}",
                message=f"Citizen has submitted an appeal for report #{report.report_number}. Please review.",
                priority=NotificationPriority.HIGH,
                related_report_id=report.id,
                related_appeal_id=appeal_id,
                action_url=f"/admin/appeals/{appeal_id}"
            )
        
        # Notify citizen
        await self.create_notification(
            user_id=report.user_id,
            type=NotificationType.APPEAL_SUBMITTED,
            title=f"Appeal Submitted for Report #{report.report_number}",
            message=f"Your appeal has been submitted and is under review by administrators.",
            priority=NotificationPriority.NORMAL,
            related_report_id=report.id,
            related_appeal_id=appeal_id,
            action_url=f"/reports/{report.id}"
        )
    
    async def notify_appeal_reviewed(
        self,
        report: Report,
        appeal_id: int,
        approved: bool,
        review_notes: Optional[str] = None
    ):
        """Notify citizen about appeal review result"""
        if approved:
            title = f"Appeal Approved: Report #{report.report_number}"
            message = "Your appeal has been approved. The report will be reopened for rework."
            priority = NotificationPriority.HIGH
        else:
            title = f"Appeal Rejected: Report #{report.report_number}"
            message = "Your appeal has been reviewed and rejected."
            if review_notes:
                message += f" Notes: {review_notes}"
            priority = NotificationPriority.NORMAL
        
        await self.create_notification(
            user_id=report.user_id,
            type=NotificationType.APPEAL_REVIEWED,
            title=title,
            message=message,
            priority=priority,
            related_report_id=report.id,
            related_appeal_id=appeal_id,
            action_url=f"/reports/{report.id}"
        )
    
    async def notify_feedback_received(
        self,
        report: Report,
        task: Task,
        rating: int,
        satisfaction_level: str
    ):
        """Notify officer and admins about feedback received"""
        # Notify officer
        await self.create_notification(
            user_id=task.assigned_to,
            type=NotificationType.FEEDBACK_RECEIVED,
            title=f"Feedback Received: Report #{report.report_number}",
            message=f"Citizen provided {rating}-star feedback ({satisfaction_level}) for your work.",
            priority=NotificationPriority.NORMAL,
            related_report_id=report.id,
            related_task_id=task.id,
            action_url=f"/tasks/{task.id}"
        )
        
        # Notify admins if negative feedback
        if rating <= 2 or satisfaction_level in ["dissatisfied", "very_dissatisfied"]:
            admin_ids = await self.get_admin_user_ids()
            for admin_id in admin_ids:
                await self.create_notification(
                    user_id=admin_id,
                    type=NotificationType.FEEDBACK_RECEIVED,
                    title=f"Negative Feedback: Report #{report.report_number}",
                    message=f"Citizen provided {rating}-star feedback. Review may be needed.",
                    priority=NotificationPriority.HIGH,
                    related_report_id=report.id,
                    related_task_id=task.id,
                    action_url=f"/admin/reports/{report.id}"
                )
    
    async def notify_work_resumed(
        self,
        report: Report,
        task: Task,
        admin_user_ids: List[int]
    ):
        """Notify citizen and admins that work has resumed"""
        # Notify citizen
        await self.create_notification(
            user_id=report.user_id,
            type=NotificationType.WORK_RESUMED,
            title=f"Work Resumed on Report #{report.report_number}",
            message=f"The officer has resumed work on your report",
            priority=NotificationPriority.NORMAL,
            related_report_id=report.id,
            action_url=f"/reports/{report.id}"
        )
        
        # Notify admins
        for admin_id in admin_user_ids:
            await self.create_notification(
                user_id=admin_id,
                type=NotificationType.WORK_RESUMED,
                title=f"Work Resumed: Report #{report.report_number}",
                message=f"Officer has resumed work on report",
                priority=NotificationPriority.NORMAL,
                related_report_id=report.id,
                related_task_id=task.id,
                action_url=f"/admin/reports/{report.id}"
            )
    
    def _get_priority_for_status(self, status: ReportStatus) -> NotificationPriority:
        """Determine notification priority based on report status"""
        high_priority_statuses = {
            ReportStatus.RESOLVED,
            ReportStatus.PENDING_VERIFICATION,
            ReportStatus.ASSIGNMENT_REJECTED
        }
        
        critical_statuses = {
            ReportStatus.REJECTED
        }
        
        if status in critical_statuses:
            return NotificationPriority.CRITICAL
        elif status in high_priority_statuses:
            return NotificationPriority.HIGH
        else:
            return NotificationPriority.NORMAL
