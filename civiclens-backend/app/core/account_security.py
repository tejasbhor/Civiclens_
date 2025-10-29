"""
Account Security Service
Handles account lockout, failed login attempts, and security monitoring
"""

from typing import Optional
from datetime import datetime, timedelta
from app.core.database import get_redis
from app.config import settings
from app.core.exceptions import UnauthorizedException


class AccountSecurity:
    """Manage account security features"""
    
    async def record_failed_login(self, phone: str) -> int:
        """
        Record a failed login attempt
        
        Returns:
            Number of failed attempts in current window
        """
        redis = await get_redis()
        key = f"failed_login:{phone}"
        
        # Increment counter
        attempts = await redis.incr(key)
        
        # Set expiry on first attempt
        if attempts == 1:
            await redis.expire(key, settings.ACCOUNT_LOCKOUT_DURATION_MINUTES * 60)
        
        # Check if account should be locked
        if attempts >= settings.MAX_LOGIN_ATTEMPTS:
            await self.lock_account(phone)
        
        return attempts
    
    async def clear_failed_login(self, phone: str):
        """Clear failed login attempts after successful login"""
        redis = await get_redis()
        await redis.delete(f"failed_login:{phone}")
    
    async def get_failed_login_count(self, phone: str) -> int:
        """Get current failed login attempt count"""
        redis = await get_redis()
        count = await redis.get(f"failed_login:{phone}")
        return int(count) if count else 0
    
    async def lock_account(self, phone: str):
        """Lock account after too many failed attempts"""
        redis = await get_redis()
        key = f"account_locked:{phone}"
        
        # Set lock with expiry
        await redis.setex(
            key,
            settings.ACCOUNT_LOCKOUT_DURATION_MINUTES * 60,
            "locked"
        )
    
    async def is_account_locked(self, phone: str) -> bool:
        """Check if account is currently locked"""
        redis = await get_redis()
        locked = await redis.get(f"account_locked:{phone}")
        return locked is not None
    
    async def get_lockout_remaining_time(self, phone: str) -> Optional[int]:
        """Get remaining lockout time in seconds"""
        redis = await get_redis()
        ttl = await redis.ttl(f"account_locked:{phone}")
        return ttl if ttl > 0 else None
    
    async def unlock_account(self, phone: str):
        """Manually unlock account (admin action)"""
        redis = await get_redis()
        await redis.delete(f"account_locked:{phone}")
        await redis.delete(f"failed_login:{phone}")
    
    async def check_account_status(self, phone: str):
        """
        Check account status and raise exception if locked
        
        Raises:
            UnauthorizedException if account is locked
        """
        if await self.is_account_locked(phone):
            remaining = await self.get_lockout_remaining_time(phone)
            minutes = remaining // 60 if remaining else 0
            raise UnauthorizedException(
                f"Account temporarily locked due to too many failed login attempts. "
                f"Try again in {minutes} minutes."
            )


# Global account security instance
account_security = AccountSecurity()
