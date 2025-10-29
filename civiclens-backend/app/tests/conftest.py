import pytest
import asyncio
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool
from httpx import AsyncClient
from app.main import app
from app.core.database import Base, get_db

# Use SQLite for tests (in-memory, no setup needed)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# Create test engine
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,
    poolclass=NullPool,  # Disable pooling for SQLite
)

# Test session factory
TestSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests"""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Create fresh database session for each test
    This ensures test isolation
    """
    # Create tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Create session
    async with TestSessionLocal() as session:
        yield session
        await session.rollback()  # Rollback any changes
    
    # Drop tables after test
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """
    Create test HTTP client with overridden database dependency
    """
    # Override the database dependency
    async def override_get_db():
        yield db_session
    
    app.dependency_overrides[get_db] = override_get_db
    
    # Create test client
    async with AsyncClient(app=app, base_url="http://test") as test_client:
        yield test_client
    
    # Clear overrides after test
    app.dependency_overrides.clear()


@pytest.fixture
async def auth_token(client: AsyncClient) -> str:
    """
    Helper fixture to get authentication token
    Usage in tests: async def test_something(client, auth_token):
    """
    # Request OTP
    otp_response = await client.post(
        "/api/v1/auth/request-otp",
        json={"phone": "+919876543210"}
    )
    otp = otp_response.json()["otp"]
    
    # Verify OTP and get token
    verify_response = await client.post(
        "/api/v1/auth/verify-otp",
        json={"phone": "+919876543210", "otp": otp}
    )
    return verify_response.json()["access_token"]


@pytest.fixture
async def admin_token(client: AsyncClient, db_session: AsyncSession) -> str:
    """
    Helper fixture to get admin authentication token
    """
    from app.models.user import User, UserRole
    from app.core.security import get_password_hash, create_access_token
    
    # Create admin user directly in database
    admin = User(
        phone="+919999999999",
        email="admin@civiclens.com",
        full_name="Admin User",
        role=UserRole.ADMIN,
        hashed_password=get_password_hash("admin123"),
        is_active=True,
        is_verified=True
    )
    db_session.add(admin)
    await db_session.commit()
    await db_session.refresh(admin)
    
    # Create token
    token = create_access_token(data={"user_id": admin.id, "role": admin.role.value})
    return token
