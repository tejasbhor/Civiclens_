from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from datetime import datetime
import os
from app.config import settings
from app.core.database import init_db, close_db, close_redis, check_redis_connection, check_database_connection
from app.core.exceptions import CivicLensException
from app.api.v1 import auth, reports, analytics, users, departments, appeals, escalations, audit, media
from app.api.v1.auth_extended import router as auth_extended
from app.api.v1.sync import router as sync_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    print("🚀 Starting CivicLens API...")
    print("\n" + "=" * 60)
    print("Checking vital services...")
    print("=" * 60)
    
    # Check Database
    print("\n📊 Checking PostgreSQL connection...")
    db_ok = await check_database_connection()
    if db_ok:
        print("✅ PostgreSQL - Connected")
        await init_db()
        print("✅ Database tables initialized")
    else:
        print("❌ PostgreSQL - Connection failed")
        print("⚠️  Server starting anyway, but database operations will fail")
    
    # Check Redis
    print("\n🔴 Checking Redis connection...")
    redis_ok = await check_redis_connection()
    if redis_ok:
        print("✅ Redis - Connected and responding")
    else:
        print("❌ Redis - Connection failed")
        print("⚠️  OTP functionality will not work without Redis")
    
    # Check MinIO (optional)
    print("\n📦 Checking MinIO connection...")
    try:
        from minio import Minio
        minio_client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE
        )
        # Try to check if bucket exists
        bucket_exists = minio_client.bucket_exists(settings.MINIO_BUCKET)
        if bucket_exists:
            print(f"✅ MinIO - Connected (bucket '{settings.MINIO_BUCKET}' exists)")
        else:
            print(f"⚠️  MinIO - Connected but bucket '{settings.MINIO_BUCKET}' not found")
            print(f"   Creating bucket '{settings.MINIO_BUCKET}'...")
            minio_client.make_bucket(settings.MINIO_BUCKET)
            print(f"✅ Bucket '{settings.MINIO_BUCKET}' created")
    except Exception as e:
        print(f"⚠️  MinIO - Connection failed: {str(e)}")
        print("   File uploads will not work (optional service)")
    
    # Summary
    print("\n" + "=" * 60)
    print("Service Status Summary:")
    print("=" * 60)
    print(f"PostgreSQL: {'✅ Ready' if db_ok else '❌ Failed'}")
    print(f"Redis:      {'✅ Ready' if redis_ok else '❌ Failed'}")
    print(f"MinIO:      ⚠️  Optional (check logs above)")
    print("=" * 60)
    
    if not db_ok or not redis_ok:
        print("\n⚠️  WARNING: Critical services are not available!")
        print("   The API will start but some features will not work.")
        print("\n   Please ensure:")
        if not db_ok:
            print("   - PostgreSQL is running")
            print("   - Database credentials in .env are correct")
        if not redis_ok:
            print("   - Redis is running (required for OTP)")
            print("   - Redis URL in .env is correct")
        print("")
    else:
        print("\n✅ All critical services are ready!")
    
    print("\n🎉 CivicLens API startup complete!\n")
    
    yield
    
    # Shutdown
    print("\n🔄 Shutting down CivicLens API...")
    await close_db()
    await close_redis()
    print("✅ Cleanup complete")


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-Powered Civic Issue Reporting and Resolution System",
    lifespan=lifespan,
    # docs_url="/docs",  # Default: /docs (Swagger UI)
    # redoc_url="/redoc",  # Default: /redoc (ReDoc)
    # openapi_url="/openapi.json"  # Default: /openapi.json
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for media files
media_directory = settings.MEDIA_ROOT or "./media"
if not os.path.isabs(media_directory):
    # Make relative paths relative to the backend directory
    media_directory = os.path.join(os.path.dirname(os.path.dirname(__file__)), media_directory)

# Create media directory if it doesn't exist
os.makedirs(media_directory, exist_ok=True)

# Mount static files
app.mount("/media", StaticFiles(directory=media_directory), name="media")
print(f"📁 Static media files mounted: /media -> {os.path.abspath(media_directory)}")

# Exception handlers
@app.exception_handler(CivicLensException)
async def civiclens_exception_handler(request: Request, exc: CivicLensException):
    """Handle custom CivicLens exceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions"""
    if settings.DEBUG:
        import traceback
        print(traceback.format_exc())
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"}
    )


# Include routers
app.include_router(auth, prefix="/api/v1")
app.include_router(auth_extended, prefix="/api/v1")
app.include_router(sync_router, prefix="/api/v1")
app.include_router(reports, prefix="/api/v1")
app.include_router(analytics, prefix="/api/v1")
app.include_router(users, prefix="/api/v1")
app.include_router(departments, prefix="/api/v1")
app.include_router(appeals, prefix="/api/v1")
app.include_router(escalations, prefix="/api/v1")
app.include_router(audit, prefix="/api/v1")
app.include_router(media, prefix="/api/v1")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "environment": settings.ENVIRONMENT
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat()
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
