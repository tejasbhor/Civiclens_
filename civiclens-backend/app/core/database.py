from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base, DeclarativeBase
from sqlalchemy.pool import NullPool, QueuePool
from typing import AsyncGenerator
import redis.asyncio as aioredis
from app.config import settings

# SQLAlchemy 2.0 Base
class Base(DeclarativeBase):
    pass


# Create async engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DATABASE_ECHO,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_pre_ping=True,
    poolclass=QueuePool,
)

# Session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


# Dependency for FastAPI
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# Redis connection
redis_client: aioredis.Redis = None


async def get_redis() -> aioredis.Redis:
    global redis_client
    if redis_client is None:
        redis_client = await aioredis.from_url(
            settings.REDIS_URL,
            password=settings.REDIS_PASSWORD,
            encoding="utf-8",
            decode_responses=True,
        )
    return redis_client


async def close_redis():
    global redis_client
    if redis_client:
        await redis_client.close()


# Database initialization
async def init_db():
    """Initialize database tables"""
    async with engine.begin() as conn:
        # Install PostGIS extension if needed
        from sqlalchemy import text
        try:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
            print("✅ PostGIS extension ready")
        except Exception as e:
            print(f"⚠️  PostGIS extension: {e}")
        
        # Import all models to register them
        from app.models import (
            user, department, report, task, media, 
            area_assignment, role_history, appeal, escalation,
            report_status_history, session, sync, audit_log,
            notification, feedback
        )
        
        # Create all tables
        await conn.run_sync(Base.metadata.create_all)


async def check_redis_connection() -> bool:
    """Check if Redis is accessible"""
    try:
        redis = await get_redis()
        await redis.ping()
        return True
    except Exception as e:
        print(f"❌ Redis connection failed: {str(e)}")
        return False


async def check_database_connection() -> bool:
    """Check if database is accessible"""
    try:
        from sqlalchemy import text
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        print(f"❌ Database connection failed: {str(e)}")
        return False


async def close_db():
    """Close database connections"""
    await engine.dispose()
