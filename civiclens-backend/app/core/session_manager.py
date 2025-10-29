"""
Session Management Service
Handles session creation, validation, and cleanup
"""

from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from app.models.session import Session
from app.models.user import User
from app.config import settings
from app.core.security import generate_jti
from app.core.enhanced_security import create_session_fingerprint
from fastapi import Request


class SessionManager:
    """Manage user sessions"""
    
    async def create_session(
        self,
        db: AsyncSession,
        user_id: int,
        access_token_jti: str,
        refresh_token_jti: Optional[str] = None,
        device_info: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        login_method: str = "password",
        expires_delta: Optional[timedelta] = None,
        request: Optional[Request] = None,
        fingerprint: Optional[str] = None
    ) -> Session:
        """Create a new session with fingerprinting"""
        
        if expires_delta is None:
            expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        # Generate fingerprint if request provided and not manually set
        if fingerprint is None and request is not None:
            fingerprint = create_session_fingerprint(request)
        
        session = Session(
            user_id=user_id,
            jti=access_token_jti,
            refresh_token_jti=refresh_token_jti,
            device_info=device_info,
            ip_address=ip_address,
            user_agent=user_agent,
            login_method=login_method,
            fingerprint=fingerprint,
            last_activity=datetime.utcnow(),
            expires_at=datetime.utcnow() + expires_delta,
            is_active=1
        )
        
        db.add(session)
        await db.commit()
        await db.refresh(session)
        
        # Enforce max concurrent sessions
        await self.enforce_session_limit(db, user_id)
        
        return session
    
    async def get_session_by_jti(
        self,
        db: AsyncSession,
        jti: str
    ) -> Optional[Session]:
        """Get session by JWT ID"""
        result = await db.execute(
            select(Session).where(
                and_(
                    Session.jti == jti,
                    Session.is_active == 1
                )
            )
        )
        return result.scalar_one_or_none()
    
    async def get_session_by_refresh_jti(
        self,
        db: AsyncSession,
        refresh_jti: str
    ) -> Optional[Session]:
        """Get session by refresh token JTI"""
        result = await db.execute(
            select(Session).where(
                and_(
                    Session.refresh_token_jti == refresh_jti,
                    Session.is_active == 1
                )
            )
        )
        return result.scalar_one_or_none()
    
    async def update_session_activity(
        self,
        db: AsyncSession,
        jti: str
    ):
        """Update last activity timestamp"""
        session = await self.get_session_by_jti(db, jti)
        if session:
            session.last_activity = datetime.utcnow()
            await db.commit()
    
    async def invalidate_session(
        self,
        db: AsyncSession,
        jti: str
    ):
        """Invalidate a specific session (logout)"""
        session = await self.get_session_by_jti(db, jti)
        if session:
            session.is_active = 0
            await db.commit()
    
    async def invalidate_all_user_sessions(
        self,
        db: AsyncSession,
        user_id: int,
        except_jti: Optional[str] = None
    ):
        """Invalidate all sessions for a user (logout all devices)"""
        query = select(Session).where(
            and_(
                Session.user_id == user_id,
                Session.is_active == 1
            )
        )
        
        if except_jti:
            query = query.where(Session.jti != except_jti)
        
        result = await db.execute(query)
        sessions = result.scalars().all()
        
        for session in sessions:
            session.is_active = 0
        
        await db.commit()
    
    async def get_user_sessions(
        self,
        db: AsyncSession,
        user_id: int,
        active_only: bool = True
    ) -> List[Session]:
        """Get all sessions for a user"""
        query = select(Session).where(Session.user_id == user_id)
        
        if active_only:
            query = query.where(Session.is_active == 1)
        
        query = query.order_by(Session.last_activity.desc())
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def enforce_session_limit(
        self,
        db: AsyncSession,
        user_id: int
    ):
        """Enforce maximum concurrent sessions per user"""
        sessions = await self.get_user_sessions(db, user_id, active_only=True)
        
        if len(sessions) > settings.MAX_CONCURRENT_SESSIONS:
            # Invalidate oldest sessions
            sessions_to_remove = sessions[settings.MAX_CONCURRENT_SESSIONS:]
            for session in sessions_to_remove:
                session.is_active = 0
            
            await db.commit()
    
    async def cleanup_expired_sessions(
        self,
        db: AsyncSession
    ):
        """Clean up expired sessions (background task)"""
        result = await db.execute(
            select(Session).where(
                and_(
                    Session.is_active == 1,
                    Session.expires_at < datetime.utcnow()
                )
            )
        )
        expired_sessions = result.scalars().all()
        
        for session in expired_sessions:
            session.is_active = 0
        
        await db.commit()
        
        return len(expired_sessions)
    
    async def cleanup_inactive_sessions(
        self,
        db: AsyncSession
    ):
        """Clean up sessions with no activity (background task)"""
        inactivity_threshold = datetime.utcnow() - timedelta(
            minutes=settings.SESSION_INACTIVITY_TIMEOUT_MINUTES
        )
        
        result = await db.execute(
            select(Session).where(
                and_(
                    Session.is_active == 1,
                    Session.last_activity < inactivity_threshold
                )
            )
        )
        inactive_sessions = result.scalars().all()
        
        for session in inactive_sessions:
            session.is_active = 0
        
        await db.commit()
        
        return len(inactive_sessions)
    
    async def validate_session(
        self,
        db: AsyncSession,
        jti: str
    ) -> bool:
        """Validate if session is active and not expired"""
        session = await self.get_session_by_jti(db, jti)
        
        if not session:
            return False
        
        if session.is_expired():
            session.is_active = 0
            await db.commit()
            return False
        
        return True


# Global session manager instance
session_manager = SessionManager()
