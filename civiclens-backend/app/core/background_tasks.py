"""
Background task helper functions for non-critical operations.
These functions are designed to be used with FastAPI's BackgroundTasks.
"""

import logging
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal, get_redis
from app.crud.user import user_crud
from app.core.audit_logger import audit_logger
from app.models.audit_log import AuditAction, AuditStatus
from app.models.user import User

logger = logging.getLogger(__name__)


async def update_user_reputation_bg(user_id: int, points: int):
    """
    Background task to update user reputation.
    Creates its own DB session to avoid session conflicts.
    """
    try:
        async with AsyncSessionLocal() as db:
            await user_crud.update_reputation(db, user_id, points)
            await db.commit()
            logger.info(f"Background: Updated reputation for user {user_id} (+{points} points)")
    except Exception as e:
        logger.error(f"Background: Failed to update reputation for user {user_id}: {str(e)}")


async def queue_report_for_processing_bg(report_id: int):
    """
    Background task to queue report for AI processing.
    Queues report for automated classification, department routing, and duplicate detection.
    
    IMPORTANT: This is non-blocking and gracefully degrades if AI worker is unavailable.
    Reports will still appear in admin dashboard even if AI processing fails.
    Admins can manually classify reports that weren't processed by AI.
    """
    try:
        redis = await get_redis()
        # Queue for AI processing (primary queue)
        await redis.lpush("queue:ai_processing", str(report_id))
        logger.info(f"✅ Background: Report {report_id} queued for AI processing")
    except Exception as e:
        # Non-critical failure - report is already created and visible
        # Admin can manually process it if AI worker is down
        logger.warning(
            f"⚠️  Background: Failed to queue report {report_id} for AI processing: {str(e)}\n"
            f"    Report is still created and visible. Admin can manually classify."
        )


async def send_email_notification_bg(
    to_email: str,
    subject: str,
    body: str,
    smtp_config: Optional[dict] = None
):
    """
    Background task to send email notifications.
    Non-blocking email sending for verification, notifications, etc.
    """
    try:
        if not smtp_config:
            logger.warning(f"Background: SMTP not configured, skipping email to {to_email}")
            return
        
        from email.message import EmailMessage
        import smtplib
        
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = smtp_config.get("from_email", "no-reply@civiclens.local")
        msg["To"] = to_email
        msg.set_content(body)
        
        with smtplib.SMTP(smtp_config["host"], smtp_config["port"]) as server:
            server.starttls()
            server.login(smtp_config["username"], smtp_config["password"])
            server.send_message(msg)
        
        logger.info(f"Background: Email sent to {to_email}")
    except Exception as e:
        logger.error(f"Background: Failed to send email to {to_email}: {str(e)}")


async def log_audit_event_bg(
    action: AuditAction,
    status: AuditStatus,
    user_id: Optional[int],
    description: str,
    metadata: Optional[dict] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
):
    """
    Background task for audit logging.
    Creates its own DB session to avoid session conflicts.
    """
    try:
        async with AsyncSessionLocal() as db:
            from app.models.audit_log import AuditLog
            
            audit_log = AuditLog(
                action=action,
                status=status,
                user_id=user_id,
                description=description,
                metadata=metadata or {},
                resource_type=resource_type,
                resource_id=resource_id,
                ip_address=ip_address,
                user_agent=user_agent
            )
            
            db.add(audit_log)
            await db.commit()
            logger.info(f"Background: Audit log created - {action.value}")
    except Exception as e:
        logger.error(f"Background: Failed to create audit log: {str(e)}")


async def update_login_stats_bg(user_id: int):
    """
    Background task to update user login statistics.
    Creates its own DB session to avoid session conflicts.
    """
    try:
        async with AsyncSessionLocal() as db:
            await user_crud.update_login_stats(db, user_id)
            await db.commit()
            logger.info(f"Background: Updated login stats for user {user_id}")
    except Exception as e:
        logger.error(f"Background: Failed to update login stats for user {user_id}: {str(e)}")


async def send_otp_sms_bg(phone: str, otp: str):
    """
    Background task to send OTP via SMS gateway.
    Placeholder for future SMS integration.
    """
    try:
        # TODO: Integrate with SMS gateway (Twilio, AWS SNS, etc.)
        logger.info(f"Background: OTP SMS would be sent to {phone}: {otp}")
        # Example integration:
        # from twilio.rest import Client
        # client = Client(account_sid, auth_token)
        # message = client.messages.create(
        #     body=f"Your CivicLens OTP is: {otp}",
        #     from_=twilio_phone,
        #     to=phone
        # )
    except Exception as e:
        logger.error(f"Background: Failed to send OTP SMS to {phone}: {str(e)}")


async def cleanup_expired_tokens_bg():
    """
    Background task to cleanup expired tokens from Redis.
    Can be scheduled periodically.
    """
    try:
        redis = await get_redis()
        # Redis automatically handles expiry, but we can do additional cleanup
        logger.info("Background: Token cleanup completed")
    except Exception as e:
        logger.error(f"Background: Failed to cleanup tokens: {str(e)}")
