from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User, UserRole
from app.models.session import Session
from app.core.exceptions import UnauthorizedException, ForbiddenException
from app.core.enhanced_security import validate_session_fingerprint, is_ip_whitelisted, get_client_ip
from app.core.audit_logger import audit_logger
from app.config import settings
from app.core.rbac import (
    Permission,
    has_permission,
    has_any_permission,
    has_all_permissions,
    get_role_level,
    is_higher_role,
    can_manage_role,
    get_role_display_name
)

security = HTTPBearer()
security_optional = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
    request: Request = None
) -> User:
    """Get current authenticated user with session fingerprint validation"""
    token = credentials.credentials
    payload = decode_access_token(token)
    
    if not payload:
        raise UnauthorizedException("Invalid authentication credentials")
    
    user_id: int = payload.get("user_id")
    jti: str = payload.get("jti")
    
    if user_id is None:
        raise UnauthorizedException("Invalid token payload")
    
    # Fetch user from database
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise UnauthorizedException("User not found")
    
    if not user.is_active:
        raise UnauthorizedException("Inactive user")
    
    # Validate session fingerprint if enabled
    if settings.SESSION_FINGERPRINT_ENABLED and jti and request:
        session_result = await db.execute(
            select(Session).where(
                Session.jti == jti,
                Session.is_active == 1
            )
        )
        session = session_result.scalar_one_or_none()
        
        if not session:
            # Session not found with this JTI - might be race condition after refresh
            # Check if there's an active session for this user (fallback for race conditions)
            print(f"⚠️  Session not found for JTI: {jti[:10]}...")
            all_sessions_result = await db.execute(
                select(Session).where(
                    Session.user_id == user_id,
                    Session.is_active == 1
                )
            )
            all_sessions = all_sessions_result.scalars().all()
            print(f"   User {user_id} has {len(all_sessions)} active session(s)")
            
            if len(all_sessions) > 0:
                # User has active sessions - this might be a race condition after token refresh
                # Allow the request but log warning
                print(f"   ⚠️  Allowing request - user has {len(all_sessions)} active session(s), likely race condition")
                session = all_sessions[0]  # Use the first active session
            else:
                # No active sessions at all - token is truly invalid
                print(f"   ❌ No active sessions found - token is invalid")
                raise UnauthorizedException("Session not found or expired")
        
        if session.fingerprint:
            if not validate_session_fingerprint(request, session.fingerprint):
                # For mobile apps, be more lenient - only log warning, don't block
                user_agent = request.headers.get("user-agent", "").lower()
                is_mobile = any(x in user_agent for x in ["android", "ios", "mobile", "expo"])
                
                if is_mobile:
                    # Mobile devices can have changing IPs/fingerprints - just log warning
                    print(f"⚠️  Mobile session fingerprint mismatch for user {user.id} - allowing")
                else:
                    # Desktop/web - enforce strict validation
                    await audit_logger.log_suspicious_activity(
                        db=db,
                        description="Session fingerprint mismatch - possible session hijacking",
                        user=user,
                        request=request,
                        metadata={"session_id": session.id, "jti": jti}
                    )
                    raise UnauthorizedException("Session validation failed")
    
    # Enforce IP whitelist for admin/super_admin if enabled
    if request:
        if user.role in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
            client_ip = get_client_ip(request)
            if not is_ip_whitelisted(client_ip, user.role.value):
                await audit_logger.log_suspicious_activity(
                    db=db,
                    description="IP not whitelisted for admin access",
                    user=user,
                    request=request,
                    metadata={"ip": client_ip}
                )
                raise UnauthorizedException("Access denied from this IP")

    return user


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """Get current authenticated user (optional)"""
    if not credentials:
        return None
    
    token = credentials.credentials
    payload = decode_access_token(token)
    
    if not payload:
        return None
    
    user_id: int = payload.get("user_id")
    if user_id is None:
        return None
    
    # Fetch user from database
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        return None
    
    if not user.is_active:
        return None
    
    return user


# ============================================================================
# ROLE-BASED DEPENDENCIES
# ============================================================================

def require_role(required_roles: List[UserRole]):
    """Dependency to check user role (exact match)"""
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in required_roles:
            role_names = ', '.join([get_role_display_name(r) for r in required_roles])
            raise ForbiddenException(
                f"This action requires one of these roles: {role_names}"
            )
        return current_user
    return role_checker


def require_min_role_level(min_level: int):
    """Dependency to require minimum role level (hierarchical)"""
    async def level_checker(current_user: User = Depends(get_current_user)) -> User:
        user_level = get_role_level(current_user.role)
        if user_level < min_level:
            raise ForbiddenException(
                f"This action requires role level {min_level} or higher. Your level: {user_level}"
            )
        return current_user
    return level_checker


# ============================================================================
# PERMISSION-BASED DEPENDENCIES
# ============================================================================

def require_permission(permission: Permission):
    """Dependency to require a specific permission"""
    async def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        if not has_permission(current_user.role, permission):
            raise ForbiddenException(
                f"You don't have the required permission: {permission.value}"
            )
        return current_user
    return permission_checker


def require_any_permission(permissions: List[Permission]):
    """Dependency to require any of the specified permissions"""
    async def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        if not has_any_permission(current_user.role, permissions):
            perm_names = ', '.join([p.value for p in permissions])
            raise ForbiddenException(
                f"You need at least one of these permissions: {perm_names}"
            )
        return current_user
    return permission_checker


def require_all_permissions(permissions: List[Permission]):
    """Dependency to require all of the specified permissions"""
    async def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        if not has_all_permissions(current_user.role, permissions):
            perm_names = ', '.join([p.value for p in permissions])
            raise ForbiddenException(
                f"You need all of these permissions: {perm_names}"
            )
        return current_user
    return permission_checker


# ============================================================================
# PRE-DEFINED ROLE DEPENDENCIES (Backward Compatibility)
# ============================================================================

async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Require admin role or higher"""
    if get_role_level(current_user.role) < get_role_level(UserRole.ADMIN):
        raise ForbiddenException("Admin access required")
    return current_user


async def require_officer(current_user: User = Depends(get_current_user)) -> User:
    """Require officer role or higher"""
    if get_role_level(current_user.role) < get_role_level(UserRole.NODAL_OFFICER):
        raise ForbiddenException("Officer access required")
    return current_user


async def require_moderator(current_user: User = Depends(get_current_user)) -> User:
    """Require moderator role or higher"""
    if get_role_level(current_user.role) < get_role_level(UserRole.MODERATOR):
        raise ForbiddenException("Moderator access required")
    return current_user


async def require_contributor(current_user: User = Depends(get_current_user)) -> User:
    """Require contributor role or higher"""
    if get_role_level(current_user.role) < get_role_level(UserRole.CONTRIBUTOR):
        raise ForbiddenException("Contributor access required")
    return current_user


async def require_write_access(current_user: User = Depends(get_current_user)) -> User:
    """Require write access (everyone except auditors)"""
    if current_user.role == UserRole.AUDITOR:
        raise ForbiddenException("Auditors have read-only access")
    return current_user
