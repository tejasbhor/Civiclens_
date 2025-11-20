#!/usr/bin/env python3
"""
Submission Metrics Service
Tracks and monitors complete report submission performance and success rates
"""

import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
import logging

from app.core.database import get_redis
from app.models.report import Report, ReportStatus
from app.models.user import User

logger = logging.getLogger(__name__)

class SubmissionMetrics:
    """Service for tracking submission metrics and performance"""
    
    def __init__(self):
        self.redis_prefix = "submission_metrics"
    
    async def record_submission_attempt(
        self,
        user_id: int,
        submission_type: str = "complete_atomic",
        file_count: int = 0,
        total_size: int = 0
    ) -> None:
        """Record a submission attempt"""
        try:
            redis = await get_redis()
            timestamp = int(time.time())
            date_key = datetime.utcnow().strftime("%Y-%m-%d")
            
            # Increment daily counters
            await redis.hincrby(f"{self.redis_prefix}:daily:{date_key}", "attempts", 1)
            await redis.hincrby(f"{self.redis_prefix}:daily:{date_key}", f"attempts_{submission_type}", 1)
            
            # Track file statistics
            if file_count > 0:
                await redis.hincrby(f"{self.redis_prefix}:daily:{date_key}", "total_files", file_count)
                await redis.hincrby(f"{self.redis_prefix}:daily:{date_key}", "total_size_mb", total_size // (1024 * 1024))
            
            # Set expiry for daily keys (30 days)
            await redis.expire(f"{self.redis_prefix}:daily:{date_key}", 30 * 24 * 60 * 60)
            
        except Exception as e:
            logger.error(f"Failed to record submission attempt: {e}")
    
    async def record_submission_success(
        self,
        user_id: int,
        report_id: int,
        duration: float,
        submission_type: str = "complete_atomic",
        file_count: int = 0,
        total_size: int = 0
    ) -> None:
        """Record a successful submission"""
        try:
            redis = await get_redis()
            date_key = datetime.utcnow().strftime("%Y-%m-%d")
            
            # Increment success counters
            await redis.hincrby(f"{self.redis_prefix}:daily:{date_key}", "successes", 1)
            await redis.hincrby(f"{self.redis_prefix}:daily:{date_key}", f"successes_{submission_type}", 1)
            
            # Track performance metrics
            duration_ms = int(duration * 1000)
            await redis.lpush(f"{self.redis_prefix}:durations:{date_key}", duration_ms)
            await redis.ltrim(f"{self.redis_prefix}:durations:{date_key}", 0, 999)  # Keep last 1000
            
            # Track user activity
            await redis.hincrby(f"{self.redis_prefix}:users:{date_key}", str(user_id), 1)
            
            # Set expiry
            await redis.expire(f"{self.redis_prefix}:durations:{date_key}", 30 * 24 * 60 * 60)
            await redis.expire(f"{self.redis_prefix}:users:{date_key}", 30 * 24 * 60 * 60)
            
        except Exception as e:
            logger.error(f"Failed to record submission success: {e}")
    
    async def record_submission_failure(
        self,
        user_id: int,
        error_type: str,
        error_message: str,
        duration: float,
        submission_type: str = "complete_atomic"
    ) -> None:
        """Record a failed submission"""
        try:
            redis = await get_redis()
            date_key = datetime.utcnow().strftime("%Y-%m-%d")
            
            # Increment failure counters
            await redis.hincrby(f"{self.redis_prefix}:daily:{date_key}", "failures", 1)
            await redis.hincrby(f"{self.redis_prefix}:daily:{date_key}", f"failures_{submission_type}", 1)
            await redis.hincrby(f"{self.redis_prefix}:errors:{date_key}", error_type, 1)
            
            # Track failure details
            failure_data = {
                "user_id": user_id,
                "error_type": error_type,
                "error_message": error_message[:200],  # Truncate long messages
                "duration": duration,
                "timestamp": int(time.time())
            }
            
            await redis.lpush(f"{self.redis_prefix}:failures:{date_key}", str(failure_data))
            await redis.ltrim(f"{self.redis_prefix}:failures:{date_key}", 0, 99)  # Keep last 100
            
            # Set expiry
            await redis.expire(f"{self.redis_prefix}:errors:{date_key}", 30 * 24 * 60 * 60)
            await redis.expire(f"{self.redis_prefix}:failures:{date_key}", 30 * 24 * 60 * 60)
            
        except Exception as e:
            logger.error(f"Failed to record submission failure: {e}")
    
    async def get_daily_stats(self, date: Optional[str] = None) -> Dict:
        """Get daily submission statistics"""
        if not date:
            date = datetime.utcnow().strftime("%Y-%m-%d")
        
        try:
            redis = await get_redis()
            
            # Get basic counters
            daily_data = await redis.hgetall(f"{self.redis_prefix}:daily:{date}")
            
            # Convert bytes to strings and integers
            stats = {}
            for key, value in daily_data.items():
                if isinstance(key, bytes):
                    key = key.decode()
                if isinstance(value, bytes):
                    value = value.decode()
                try:
                    stats[key] = int(value)
                except ValueError:
                    stats[key] = value
            
            # Calculate success rate
            attempts = stats.get("attempts", 0)
            successes = stats.get("successes", 0)
            failures = stats.get("failures", 0)
            
            success_rate = (successes / attempts * 100) if attempts > 0 else 0
            
            # Get performance data
            durations = await redis.lrange(f"{self.redis_prefix}:durations:{date}", 0, -1)
            if durations:
                duration_values = [int(d.decode() if isinstance(d, bytes) else d) for d in durations]
                avg_duration = sum(duration_values) / len(duration_values)
                max_duration = max(duration_values)
                min_duration = min(duration_values)
            else:
                avg_duration = max_duration = min_duration = 0
            
            return {
                "date": date,
                "attempts": attempts,
                "successes": successes,
                "failures": failures,
                "success_rate": round(success_rate, 2),
                "performance": {
                    "avg_duration_ms": round(avg_duration, 2),
                    "max_duration_ms": max_duration,
                    "min_duration_ms": min_duration,
                    "total_samples": len(durations) if durations else 0
                },
                "files": {
                    "total_files": stats.get("total_files", 0),
                    "total_size_mb": stats.get("total_size_mb", 0)
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to get daily stats: {e}")
            return {
                "date": date,
                "error": str(e)
            }
    
    async def get_error_breakdown(self, date: Optional[str] = None) -> Dict:
        """Get error breakdown for a specific date"""
        if not date:
            date = datetime.utcnow().strftime("%Y-%m-%d")
        
        try:
            redis = await get_redis()
            
            error_data = await redis.hgetall(f"{self.redis_prefix}:errors:{date}")
            
            errors = {}
            for error_type, count in error_data.items():
                if isinstance(error_type, bytes):
                    error_type = error_type.decode()
                if isinstance(count, bytes):
                    count = count.decode()
                errors[error_type] = int(count)
            
            return {
                "date": date,
                "errors": errors,
                "total_errors": sum(errors.values())
            }
            
        except Exception as e:
            logger.error(f"Failed to get error breakdown: {e}")
            return {"date": date, "error": str(e)}
    
    async def get_user_activity(self, date: Optional[str] = None, limit: int = 10) -> Dict:
        """Get top active users for a specific date"""
        if not date:
            date = datetime.utcnow().strftime("%Y-%m-%d")
        
        try:
            redis = await get_redis()
            
            user_data = await redis.hgetall(f"{self.redis_prefix}:users:{date}")
            
            # Convert and sort by submission count
            user_activity = []
            for user_id, count in user_data.items():
                if isinstance(user_id, bytes):
                    user_id = user_id.decode()
                if isinstance(count, bytes):
                    count = count.decode()
                user_activity.append({
                    "user_id": int(user_id),
                    "submissions": int(count)
                })
            
            # Sort by submission count and limit
            user_activity.sort(key=lambda x: x["submissions"], reverse=True)
            
            return {
                "date": date,
                "top_users": user_activity[:limit],
                "total_active_users": len(user_activity),
                "total_submissions": sum(u["submissions"] for u in user_activity)
            }
            
        except Exception as e:
            logger.error(f"Failed to get user activity: {e}")
            return {"date": date, "error": str(e)}
    
    async def get_weekly_trends(self, weeks: int = 4) -> List[Dict]:
        """Get weekly submission trends"""
        try:
            trends = []
            
            for i in range(weeks):
                date = (datetime.utcnow() - timedelta(days=i*7)).strftime("%Y-%m-%d")
                daily_stats = await self.get_daily_stats(date)
                trends.append(daily_stats)
            
            return trends
            
        except Exception as e:
            logger.error(f"Failed to get weekly trends: {e}")
            return []
    
    async def check_health_metrics(self) -> Dict:
        """Check system health based on metrics"""
        try:
            today_stats = await self.get_daily_stats()
            yesterday_stats = await self.get_daily_stats(
                (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")
            )
            
            # Health indicators
            health = {
                "status": "healthy",
                "alerts": [],
                "metrics": {
                    "today": today_stats,
                    "yesterday": yesterday_stats
                }
            }
            
            # Check success rate
            success_rate = today_stats.get("success_rate", 100)
            if success_rate < 95:
                health["status"] = "warning"
                health["alerts"].append(f"Low success rate: {success_rate}%")
            
            # Check average response time
            avg_duration = today_stats.get("performance", {}).get("avg_duration_ms", 0)
            if avg_duration > 10000:  # 10 seconds
                health["status"] = "warning"
                health["alerts"].append(f"High response time: {avg_duration}ms")
            
            # Check error rate
            attempts = today_stats.get("attempts", 0)
            failures = today_stats.get("failures", 0)
            if attempts > 0 and (failures / attempts) > 0.1:  # 10% error rate
                health["status"] = "critical"
                health["alerts"].append(f"High error rate: {failures}/{attempts}")
            
            return health
            
        except Exception as e:
            logger.error(f"Failed to check health metrics: {e}")
            return {
                "status": "error",
                "error": str(e)
            }

# Global instance
submission_metrics = SubmissionMetrics()
