"""
Rate Limiting Service using Redis
Implements sliding window rate limiting for various endpoints
"""

from typing import Optional
from datetime import datetime, timedelta
from app.core.database import get_redis
from app.config import settings
from app.core.exceptions import ValidationException


class RateLimiter:
    """Redis-based rate limiter with sliding window"""
    
    def __init__(self):
        self.enabled = settings.RATE_LIMIT_ENABLED
    
    async def check_rate_limit(
        self,
        key: str,
        max_requests: int,
        window_seconds: int,
        identifier: str = "request"
    ) -> bool:
        """
        Check if request is within rate limit
        
        Args:
            key: Redis key (e.g., "otp:+919876543210")
            max_requests: Maximum requests allowed
            window_seconds: Time window in seconds
            identifier: Human-readable identifier for error message
            
        Returns:
            True if within limit
            
        Raises:
            ValidationException if rate limit exceeded
        """
        if not self.enabled:
            return True
        
        redis = await get_redis()
        current_time = datetime.utcnow()
        window_start = current_time - timedelta(seconds=window_seconds)
        
        # Use sorted set to track requests with timestamps
        rate_limit_key = f"rate_limit:{key}"
        
        # Remove old entries outside the window
        await redis.zremrangebyscore(
            rate_limit_key,
            0,
            window_start.timestamp()
        )
        
        # Count requests in current window
        request_count = await redis.zcard(rate_limit_key)
        
        if request_count >= max_requests:
            # Rate limit exceeded - calculate retry time without complex Redis operations
            # Use a simple fallback approach to avoid async generator issues
            retry_after = window_seconds  # Simple fallback
            
            try:
                # Try to get the oldest timestamp for more accurate retry time
                # Use zscore to get the oldest item's score instead of zrange
                oldest_member = await redis.zrange(rate_limit_key, 0, 0)
                if oldest_member:
                    # Get the score (timestamp) of the oldest member
                    oldest_timestamp = await redis.zscore(rate_limit_key, oldest_member[0])
                    if oldest_timestamp:
                        retry_after = max(1, int(oldest_timestamp + window_seconds - current_time.timestamp()))
            except Exception as e:
                # If Redis operations fail, use the fallback retry time
                import logging
                logging.warning(f"Rate limiter Redis error (using fallback): {e}")
            
            raise ValidationException(
                f"Rate limit exceeded for {identifier}. "
                f"Try again in {retry_after} seconds."
            )
        
        # Add current request
        await redis.zadd(
            rate_limit_key,
            {str(current_time.timestamp()): current_time.timestamp()}
        )
        
        # Set expiry on the key
        await redis.expire(rate_limit_key, window_seconds)
        
        return True
    
    async def check_otp_rate_limit(self, phone: str) -> bool:
        """Check OTP request rate limit"""
        return await self.check_rate_limit(
            key=f"otp:{phone}",
            max_requests=settings.RATE_LIMIT_OTP_MAX_REQUESTS,
            window_seconds=settings.RATE_LIMIT_OTP_WINDOW_SECONDS,
            identifier="OTP requests"
        )
    
    async def check_login_rate_limit(self, phone: str) -> bool:
        """Check login rate limit"""
        return await self.check_rate_limit(
            key=f"login:{phone}",
            max_requests=settings.RATE_LIMIT_LOGIN_MAX_REQUESTS,
            window_seconds=settings.RATE_LIMIT_LOGIN_WINDOW_SECONDS,
            identifier="login attempts"
        )
    
    async def check_password_reset_rate_limit(self, phone: str) -> bool:
        """Check password reset rate limit"""
        return await self.check_rate_limit(
            key=f"password_reset:{phone}",
            max_requests=settings.RATE_LIMIT_PASSWORD_RESET_MAX_REQUESTS,
            window_seconds=settings.RATE_LIMIT_PASSWORD_RESET_WINDOW_SECONDS,
            identifier="password reset requests"
        )
    
    async def reset_rate_limit(self, key: str):
        """Reset rate limit for a specific key (admin action)"""
        redis = await get_redis()
        await redis.delete(f"rate_limit:{key}")


# Global rate limiter instance
rate_limiter = RateLimiter()
