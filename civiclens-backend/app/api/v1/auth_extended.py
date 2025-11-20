"""
Extended Authentication Endpoints
Token refresh, password reset, logout, and session management
"""

from fastapi import APIRouter, Depends, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.core.database import get_db, get_redis
from app.core.security import (
    create_access_token,
    decode_refresh_token,
    generate_password_reset_token,
    generate_jti,
    get_password_hash,
    verify_password,
)
from app.core.enhanced_security import validate_password_strength
from app.core.exceptions import UnauthorizedException, ValidationException
from app.core.audit_logger import audit_logger
from app.core.dependencies import get_current_user
from app.core.rate_limiter import rate_limiter
from app.core.session_manager import session_manager
from app.schemas.auth import (
    RefreshTokenRequest,
    Token,
    PasswordResetRequest,
    PasswordResetVerify,
    ChangePasswordRequest
)
from app.crud.user import user_crud
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication - Extended"])


@router.post("/refresh", response_model=Token)
async def refresh_token(
    request: RefreshTokenRequest,
    http_request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Refresh access token using refresh token
    Returns new access token and optionally new refresh token
    """
    # Decode refresh token
    payload = decode_refresh_token(request.refresh_token)
    
    if not payload:
        raise UnauthorizedException("Invalid or expired refresh token")
    
    user_id = payload.get("user_id")
    refresh_jti = payload.get("jti")
    
    if not user_id or not refresh_jti:
        raise UnauthorizedException("Invalid refresh token payload")
    
    # Validate session
    session = await session_manager.get_session_by_refresh_jti(db, refresh_jti)
    
    if not session or not session.is_active:
        raise UnauthorizedException("Session expired or invalid")
    
    # Get user
    user = await user_crud.get(db, user_id)
    
    if not user or not user.is_active:
        raise UnauthorizedException("User not found or inactive")
    
    # Generate new access token
    new_access_jti = generate_jti()
    access_token = create_access_token(
        data={"user_id": user.id, "role": user.role.value, "jti": new_access_jti}
    )
    
    # Update session with new access token JTI
    print(f"🔄 Refresh: Updating session {session.id} - Old JTI: {session.jti[:10]}... → New JTI: {new_access_jti[:10]}...")
    session.jti = new_access_jti
    session.last_activity = datetime.utcnow()
    await db.commit()
    await db.refresh(session)  # Ensure session is refreshed from DB
    print(f"✅ Refresh: Session {session.id} updated successfully with JTI: {session.jti[:10]}...")
    
    return Token(
        access_token=access_token,
        refresh_token=request.refresh_token,  # Return same refresh token for mobile compatibility
        user_id=user.id,
        role=user.role
    )


@router.post("/logout")
async def logout(
    http_request: Request,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Logout current session"""
    # Get JTI from token
    from app.core.security import decode_access_token
    token = http_request.headers.get("authorization", "").replace("Bearer ", "")
    payload = decode_access_token(token)
    
    if payload and payload.get("jti"):
        await session_manager.invalidate_session(db, payload["jti"])
    
    return {"message": "Logged out successfully"}


@router.post("/logout-all")
async def logout_all(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Logout from all devices"""
    await session_manager.invalidate_all_user_sessions(db, current_user.id)
    
    return {"message": "Logged out from all devices"}


@router.post("/logout-others")
async def logout_others(
    http_request: Request,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Invalidate all sessions for the current user except the current session."""
    from app.core.security import decode_access_token
    token = http_request.headers.get("authorization", "").replace("Bearer ", "")
    payload = decode_access_token(token)
    current_jti = payload.get("jti") if payload else None

    # Get all active sessions for the user
    sessions = await session_manager.get_user_sessions(db, current_user.id, active_only=True)

    # Invalidate all except current
    for s in sessions:
        if not current_jti or s.jti != current_jti:
            await session_manager.invalidate_session(db, s.jti)

    return {"message": "All other sessions terminated"}


@router.get("/sessions")
async def get_sessions(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get all active sessions for current user"""
    sessions = await session_manager.get_user_sessions(db, current_user.id, active_only=True)
    
    return {
        "sessions": [session.to_dict() for session in sessions],
        "total": len(sessions)
    }


@router.delete("/sessions/{session_id}")
async def revoke_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Revoke a specific session"""
    from sqlalchemy import select
    from app.models.session import Session
    
    result = await db.execute(
        select(Session).where(
            Session.id == session_id,
            Session.user_id == current_user.id
        )
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise ValidationException("Session not found")
    
    await session_manager.invalidate_session(db, session.jti)
    
    return {"message": "Session revoked successfully"}


@router.post("/request-password-reset")
async def request_password_reset(
    request: PasswordResetRequest,
    db: AsyncSession = Depends(get_db)
):
    """Request password reset token (sent via SMS/email)"""
    # Check rate limit
    await rate_limiter.check_password_reset_rate_limit(request.phone)
    
    # Check if user exists
    user = await user_crud.get_by_phone(db, request.phone)
    
    # Always return success (don't reveal if user exists)
    if user:
        # Generate reset token
        reset_token = generate_password_reset_token()
        
        # Store in Redis with expiry
        redis = await get_redis()
        await redis.setex(
            f"password_reset:{request.phone}",
            settings.PASSWORD_RESET_TOKEN_EXPIRY_MINUTES * 60,
            reset_token
        )
        
        # TODO: Send reset token via SMS/Email
        # For development, return token
        return {
            "message": "Password reset token sent",
            "reset_token": reset_token if settings.DEBUG else None,
            "expires_in_minutes": settings.PASSWORD_RESET_TOKEN_EXPIRY_MINUTES
        }
    
    return {
        "message": "If the phone number exists, a reset token has been sent",
        "expires_in_minutes": settings.PASSWORD_RESET_TOKEN_EXPIRY_MINUTES
    }


@router.post("/reset-password")
async def reset_password(
    request: PasswordResetVerify,
    db: AsyncSession = Depends(get_db)
):
    """Reset password using reset token"""
    redis = await get_redis()
    
    # Get stored token
    stored_token = await redis.get(f"password_reset:{request.phone}")
    
    if not stored_token or stored_token != request.reset_token:
        raise UnauthorizedException("Invalid or expired reset token")
    
    # Get user
    user = await user_crud.get_by_phone(db, request.phone)
    
    if not user:
        raise UnauthorizedException("User not found")
    
    # Validate new password strength
    is_valid, error_msg = validate_password_strength(request.new_password)
    if not is_valid:
        raise ValidationException(error_msg)
    
    # Update password
    user.hashed_password = get_password_hash(request.new_password)
    await db.commit()
    
    # Log password reset
    await audit_logger.log(
        db=db,
        action="password_reset_complete",
        user=user,
        description="Password reset via reset token"
    )
    
    # Delete reset token
    await redis.delete(f"password_reset:{request.phone}")
    
    # Invalidate all sessions (force re-login)
    await session_manager.invalidate_all_user_sessions(db, user.id)
    
    return {"message": "Password reset successfully"}


@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Change password (requires old password)"""
    # Verify old password
    if not current_user.hashed_password:
        raise ValidationException("User does not have a password set")
    
    if not verify_password(request.old_password, current_user.hashed_password):
        raise UnauthorizedException("Incorrect current password")
    
    # Validate new password strength
    is_valid, error_msg = validate_password_strength(request.new_password)
    if not is_valid:
        raise ValidationException(error_msg)
    
    # Update password
    current_user.hashed_password = get_password_hash(request.new_password)
    await db.commit()
    
    # Log password change
    await audit_logger.log_password_change(db, current_user)
    
    # Invalidate all other sessions (keep current)
    from app.core.security import decode_access_token
    # Would need to get current JTI from request
    
    return {"message": "Password changed successfully"}


# Import datetime for session update
from datetime import datetime
