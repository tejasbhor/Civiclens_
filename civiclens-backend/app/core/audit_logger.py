"""
Audit Logger Service (Priority 2)
Centralized service for logging security events
"""

from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Request
from app.models.audit_log import AuditLog, AuditAction, AuditStatus
from app.models.user import User
from app.config import settings
from app.core.enhanced_security import get_client_ip, sanitize_user_agent


class AuditLogger:
    """Service for logging audit events"""
    
    async def log(
        self,
        db: AsyncSession,
        action: AuditAction,
        status: AuditStatus = AuditStatus.SUCCESS,
        user: Optional[User] = None,
        user_id: Optional[int] = None,
        request: Optional[Request] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        description: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None
    ):
        """
        Log an audit event
        
        Args:
            db: Database session
            action: Type of action being audited
            status: Success/failure/warning
            user: User object (if available)
            user_id: User ID (if user object not available)
            request: FastAPI request object (for IP/user agent)
            ip_address: Manual IP address (if request not available)
            user_agent: Manual user agent (if request not available)
            description: Human-readable description
            metadata: Additional context as JSON
            resource_type: Type of resource affected
            resource_id: ID of resource affected
        """
        if not settings.AUDIT_LOG_ENABLED:
            return
        
        # Extract user info
        if user:
            user_id = user.id
            user_role = user.role.value
        else:
            user_role = None
        
        # Extract request info
        if request:
            if not ip_address:
                ip_address = get_client_ip(request)
            if not user_agent:
                user_agent = sanitize_user_agent(request.headers.get("user-agent", ""))
        
        # Create audit log entry
        audit_log = AuditLog(
            user_id=user_id,
            user_role=user_role,
            action=action,
            status=status,
            ip_address=ip_address,
            user_agent=user_agent,
            description=description,
            extra_data=metadata,
            resource_type=resource_type,
            resource_id=resource_id
        )
        
        db.add(audit_log)
        await db.commit()
    
    async def log_login_success(
        self,
        db: AsyncSession,
        user: User,
        request: Request,
        login_method: str = "password"
    ):
        """Log successful login"""
        await self.log(
            db=db,
            action=AuditAction.LOGIN_SUCCESS,
            status=AuditStatus.SUCCESS,
            user=user,
            request=request,
            description=f"User logged in via {login_method}",
            metadata={"login_method": login_method}
        )
    
    async def log_login_failure(
        self,
        db: AsyncSession,
        phone: str,
        request: Request,
        reason: str = "Invalid credentials"
    ):
        """Log failed login attempt"""
        await self.log(
            db=db,
            action=AuditAction.LOGIN_FAILURE,
            status=AuditStatus.FAILURE,
            request=request,
            description=f"Failed login attempt for {phone}: {reason}",
            metadata={"phone": phone, "reason": reason}
        )
    
    async def log_password_change(
        self,
        db: AsyncSession,
        user: User,
        request: Optional[Request] = None,
        changed_by_admin: bool = False
    ):
        """Log password change"""
        await self.log(
            db=db,
            action=AuditAction.PASSWORD_CHANGE,
            status=AuditStatus.SUCCESS,
            user=user,
            request=request,
            description="Password changed" + (" by admin" if changed_by_admin else ""),
            metadata={"changed_by_admin": changed_by_admin}
        )
    
    async def log_2fa_enabled(
        self,
        db: AsyncSession,
        user: User,
        request: Optional[Request] = None
    ):
        """Log 2FA enabled"""
        await self.log(
            db=db,
            action=AuditAction.TWO_FA_ENABLED,
            status=AuditStatus.SUCCESS,
            user=user,
            request=request,
            description="Two-factor authentication enabled"
        )
    
    async def log_2fa_disabled(
        self,
        db: AsyncSession,
        user: User,
        request: Optional[Request] = None
    ):
        """Log 2FA disabled"""
        await self.log(
            db=db,
            action=AuditAction.TWO_FA_DISABLED,
            status=AuditStatus.WARNING,
            user=user,
            request=request,
            description="Two-factor authentication disabled"
        )
    
    async def log_role_change(
        self,
        db: AsyncSession,
        target_user_id: int,
        old_role: str,
        new_role: str,
        changed_by: User,
        request: Optional[Request] = None,
        reason: Optional[str] = None
    ):
        """Log user role change"""
        await self.log(
            db=db,
            action=AuditAction.USER_ROLE_CHANGED,
            status=AuditStatus.SUCCESS,
            user=changed_by,
            request=request,
            description=f"Role changed from {old_role} to {new_role}" + (f": {reason}" if reason else ""),
            metadata={
                "target_user_id": target_user_id,
                "old_role": old_role,
                "new_role": new_role,
                "reason": reason
            },
            resource_type="user",
            resource_id=str(target_user_id)
        )
    
    async def log_suspicious_activity(
        self,
        db: AsyncSession,
        description: str,
        user: Optional[User] = None,
        request: Optional[Request] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Log suspicious activity"""
        await self.log(
            db=db,
            action=AuditAction.SUSPICIOUS_ACTIVITY,
            status=AuditStatus.WARNING,
            user=user,
            request=request,
            description=description,
            metadata=metadata
        )


# Global audit logger instance
audit_logger = AuditLogger()
