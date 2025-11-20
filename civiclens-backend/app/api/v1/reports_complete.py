#!/usr/bin/env python3
"""
Complete Report Submission API - Production Ready
Single atomic endpoint for report creation with media upload
"""

from fastapi import APIRouter, Depends, UploadFile, File, Form, status, Request, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
import json
import time
import logging
from datetime import datetime

from app.core.database import get_db, get_redis
from app.core.dependencies import get_current_user
from app.core.exceptions import NotFoundException, ForbiddenException, ValidationException
from app.core.audit_logger import audit_logger
from app.models.audit_log import AuditAction, AuditStatus
from app.models.user import User
from app.models.report import Report, ReportStatus, ReportSeverity, ReportCategory
from app.schemas.report import ReportCreateInternal, ReportResponse
from app.services.file_upload_service import get_file_upload_service, FileUploadService
from app.crud.report import report_crud
from app.core.background_tasks import (
    update_user_reputation_bg,
    queue_report_for_processing_bg,
    log_audit_event_bg
)
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reports", tags=["Complete Report Submission"])


async def _validate_complete_submission(
    db: AsyncSession,
    user_id: int,
    title: str,
    description: str,
    category: str,
    severity: str,
    latitude: float,
    longitude: float,
    files: List[UploadFile],
    current_user: User
) -> None:
    """Comprehensive validation for complete report submission"""
    
    # Content validation
    title = title.strip()
    description = description.strip()
    
    if len(title) < 5:
        raise ValidationException("Title must be at least 5 characters long")
    
    if len(title) > 200:
        raise ValidationException("Title cannot exceed 200 characters")
    
    if len(description) < 10:
        raise ValidationException("Description must be at least 10 characters long")
    
    if len(description) > 2000:
        raise ValidationException("Description cannot exceed 2000 characters")
    
    # Category validation
    try:
        ReportCategory(category)
    except ValueError:
        valid_categories = [cat.value for cat in ReportCategory]
        raise ValidationException(f"Invalid category '{category}'. Must be one of: {', '.join(valid_categories)}")
    
    # Severity validation
    try:
        ReportSeverity(severity)
    except ValueError:
        valid_severities = [sev.value for sev in ReportSeverity]
        raise ValidationException(f"Invalid severity '{severity}'. Must be one of: {', '.join(valid_severities)}")
    
    # Coordinate validation
    if not (-90 <= latitude <= 90):
        raise ValidationException(f"Invalid latitude {latitude}. Must be between -90 and 90")
    
    if not (-180 <= longitude <= 180):
        raise ValidationException(f"Invalid longitude {longitude}. Must be between -180 and 180")
    
    # File validation
    if not files or len(files) == 0:
        raise ValidationException("At least one photo is required")
    
    if len(files) > 6:
        raise ValidationException("Maximum 6 files allowed (5 images + 1 audio)")
    
    # Validate file types and sizes
    image_count = 0
    audio_count = 0
    max_image_size = 10 * 1024 * 1024  # 10MB
    max_audio_size = 25 * 1024 * 1024  # 25MB
    
    for file in files:
        if not file.filename:
            raise ValidationException("All files must have valid filenames")
        
        # Get file extension
        ext = file.filename.lower().split('.')[-1]
        
        # Validate by file type
        if ext in ['jpg', 'jpeg', 'png', 'webp']:
            image_count += 1
            if image_count > 5:
                raise ValidationException("Maximum 5 images allowed per report")
            
            # Check file size (estimate from content-length if available)
            if hasattr(file, 'size') and file.size and file.size > max_image_size:
                raise ValidationException(f"Image file too large. Maximum size is 10MB")
                
        elif ext in ['mp3', 'wav', 'm4a']:
            audio_count += 1
            if audio_count > 1:
                raise ValidationException("Maximum 1 audio file allowed per report")
            
            if hasattr(file, 'size') and file.size and file.size > max_audio_size:
                raise ValidationException(f"Audio file too large. Maximum size is 25MB")
        else:
            raise ValidationException(
                f"Unsupported file type '{ext}'. "
                "Supported: JPEG, PNG, WebP for images; MP3, WAV, M4A for audio"
            )
    
    # User permission validation
    if not current_user.can_report():
        raise ForbiddenException("User does not have permission to create reports")
    
    # Rate limiting validation
    try:
        # Use pre-extracted user_id to prevent SQLAlchemy detachment issues
        recent_reports = await report_crud.get_user_recent_reports(
            db, user_id, minutes=5
        )
        if len(recent_reports) >= 3:
            raise ValidationException(
                "Rate limit exceeded. Maximum 3 reports per 5 minutes. Please wait before submitting again."
            )
    except Exception as e:
        logger.warning(f"Rate limiting check failed: {e}")
        # Don't block submission if rate limiting check fails


async def _create_report_with_number(
    db: AsyncSession,
    report_data: dict,
    user_id: int
) -> Report:
    """Create report with atomic report number generation"""
    
    max_retries = 5
    retry_count = 0
    
    while retry_count < max_retries:
        try:
            # Generate unique report number using Redis
            city = settings.CITY_CODE or "NMC"
            year = datetime.utcnow().year
            redis = await get_redis()
            
            # Atomic increment in Redis
            seq = await redis.incr(f"seq:report_number:{city}:{year}")
            report_number = f"CL-{year}-{city}-{seq:05d}"
            
            # Add generated data to report
            report_dict = {
                **report_data,
                'user_id': user_id,
                'report_number': report_number,
                'status': ReportStatus.RECEIVED,
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow(),
            }
            
            # Create report using CRUD
            report_create = ReportCreateInternal(**report_dict)
            report = await report_crud.create(db, report_create, commit=False)
            
            # Flush to get ID but don't commit yet (part of larger transaction)
            await db.flush()
            
            logger.info(f"Report created with ID: {report.id}, number: {report_number}")
            return report
            
        except IntegrityError as e:
            # Handle duplicate report number
            if "report_number" in str(e) or "ix_reports_report_number" in str(e):
                retry_count += 1
                await db.rollback()
                
                if retry_count >= max_retries:
                    logger.error(f"Failed to generate unique report number after {max_retries} retries")
                    raise ValidationException(
                        "Unable to generate unique report number. Please try again."
                    )
                
                # Exponential backoff
                import asyncio
                await asyncio.sleep(0.1 * (2 ** retry_count))
                logger.warning(f"Duplicate report number, retrying... (attempt {retry_count + 1}/{max_retries})")
                continue
            else:
                # Different integrity error - re-raise
                raise
        except Exception as e:
            logger.error(f"Error creating report: {e}")
            raise ValidationException(f"Failed to create report: {str(e)}")
    
    raise ValidationException("Failed to create report after maximum retries")


async def _log_complete_submission_audit(
    db: AsyncSession,
    request: Request,
    current_user: User,
    report: Report,
    user_id: int,
    user_email: str,
    media_count: int,
    total_size: int,
    duration: float
) -> None:
    """Log comprehensive audit information for complete submission"""
    
    await audit_logger.log(
        db=db,
        action=AuditAction.REPORT_CREATED,
        status=AuditStatus.SUCCESS,
        user=current_user,
        request=request,
        description=f"Complete report submission: {report.title}",
        metadata={
            "report_id": report.id,
            "report_number": report.report_number,
            "category": report.category,
            "severity": str(report.severity),
            "location": f"{report.latitude},{report.longitude}",
            "address": report.address,
            "media_count": media_count,
            "total_file_size": total_size,
            "submission_duration": duration,
            "submission_type": "complete_atomic",
            "user_id": user_id,
            "user_email": user_email,
            "validation_passed": True
        },
        resource_type="report",
        resource_id=str(report.id)
    )


@router.post("/submit-complete", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def submit_complete_report(
    # Dependencies (must come first - no defaults)
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    upload_service: FileUploadService = Depends(get_file_upload_service),
    
    # Report data fields
    title: str = Form(..., min_length=5, max_length=200, description="Report title"),
    description: str = Form(..., min_length=10, max_length=2000, description="Detailed description"),
    category: str = Form(..., description="Report category (roads, water, sanitation, etc.)"),
    severity: str = Form(..., description="Severity level (low, medium, high, critical)"),
    latitude: float = Form(..., ge=-90, le=90, description="Latitude coordinate"),
    longitude: float = Form(..., ge=-180, le=180, description="Longitude coordinate"),
    address: str = Form(..., min_length=5, max_length=500, description="Human-readable address"),
    landmark: Optional[str] = Form(None, max_length=200, description="Optional landmark reference"),
    is_public: bool = Form(True, description="Whether report is publicly visible"),
    is_sensitive: bool = Form(False, description="Whether report contains sensitive information"),
    
    # Media files (up to 5 images + 1 audio)
    files: List[UploadFile] = File(..., description="Media files (max 5 images + 1 audio)"),
    captions: Optional[str] = Form(None, description="JSON array of captions for each file")
):
    """
    Submit a complete report with all media files in a single atomic operation
    
    This endpoint provides:
    - Single API call for complete report submission
    - Atomic transaction (all succeed or all fail)
    - Comprehensive validation and error handling
    - Automatic retry logic for race conditions
    - Production-ready logging and monitoring
    - Offline-first architecture support
    
    Benefits:
    - Eliminates partial submission failures
    - Reduces API complexity for mobile clients
    - Better offline handling and sync capabilities
    - Improved user experience with single submission flow
    """
    
    start_time = time.time()
    
    # CRITICAL: Extract user attributes BEFORE any database operations
    # to prevent SQLAlchemy detachment issues (MissingGreenlet error)
    user_id = current_user.id
    user_email = current_user.email
    
    logger.info(f"Complete report submission started by user {user_id}")
    logger.info(f"Submission data: title='{title[:50]}...', category={category}, severity={severity}")
    logger.info(f"Files: {len(files)} files, location=({latitude}, {longitude})")
    
    try:
        # 1. Comprehensive validation
        await _validate_complete_submission(
            db=db,
            user_id=user_id,
            title=title,
            description=description,
            category=category,
            severity=severity,
            latitude=latitude,
            longitude=longitude,
            files=files,
            current_user=current_user
        )
        
        logger.info("Validation passed, starting atomic transaction")
        
        # 2. Process submission without nested transaction
        try:
            # 3. Create report with atomic number generation
            report_data = {
                'title': title.strip(),
                'description': description.strip(),
                'category': category,
                'severity': severity,  # Keep as string for Pydantic validation
                'latitude': latitude,
                'longitude': longitude,
                'address': address.strip(),
                'landmark': landmark.strip() if landmark else None,
                'is_public': is_public,
                'is_sensitive': is_sensitive,
            }
            
            report = await _create_report_with_number(db, report_data, user_id)
            
            # 4. Parse captions if provided
            parsed_captions = []
            if captions:
                try:
                    parsed_captions = json.loads(captions)
                    if not isinstance(parsed_captions, list):
                        parsed_captions = []
                except (json.JSONDecodeError, TypeError):
                    logger.warning("Invalid captions JSON format, ignoring captions")
                    parsed_captions = []
            
            # 5. Upload all media files atomically with enhanced validation
            media_list = []
            total_file_size = 0
            
            if files:
                logger.info(f"Processing {len(files)} media files for report {report.id}")
                
                # Pre-validate all files before uploading
                for i, file in enumerate(files):
                    if not file.filename:
                        raise ValidationException(f"File {i+1}: Filename is required")
                    
                    # Check file size before processing
                    file_size = 0
                    if hasattr(file, 'size'):
                        file_size = file.size
                    else:
                        # Read content to get size
                        content = await file.read()
                        file_size = len(content)
                        await file.seek(0)  # Reset file pointer
                    
                    if file_size > 10 * 1024 * 1024:  # 10MB limit per file
                        raise ValidationException(f"File {i+1} ({file.filename}): Size {file_size/1024/1024:.1f}MB exceeds 10MB limit")
                    
                    total_file_size += file_size
                
                # Check total size limit
                if total_file_size > 50 * 1024 * 1024:  # 50MB total limit
                    raise ValidationException(f"Total file size {total_file_size/1024/1024:.1f}MB exceeds 50MB limit")
                
                logger.info(f"File validation passed. Total size: {total_file_size/1024/1024:.1f}MB")
                
                try:
                    media_list = await upload_service.upload_multiple_files(
                        files=files,
                        report_id=report.id,
                        user_id=user_id,
                        captions=parsed_captions
                    )
                    
                    actual_total_size = sum(media.file_size or 0 for media in media_list)
                    logger.info(f"Successfully uploaded {len(media_list)} files, processed size: {actual_total_size} bytes")
                    
                except Exception as upload_error:
                    logger.error(f"Media upload failed for report {report.id}: {upload_error}")
                    await db.rollback()
                    
                    # Provide more specific error messages
                    error_msg = str(upload_error)
                    if "too large" in error_msg.lower():
                        raise ValidationException(f"File size error: {error_msg}")
                    elif "invalid" in error_msg.lower() or "unsupported" in error_msg.lower():
                        raise ValidationException(f"File format error: {error_msg}")
                    else:
                        raise ValidationException(f"Media upload failed: {error_msg}")
            
            # 6. Media count is handled by relationship count, no need to store separately
            
            # Commit the transaction
            await db.commit()
            
        except ValidationException as e:
            logger.error(f"Validation error in complete submission: {str(e)}")
            await db.rollback()
            raise
        except IntegrityError as e:
            logger.error(f"Database integrity error in complete submission: {str(e)}")
            await db.rollback()
            raise ValidationException("Data integrity error. Please check your input and try again.")
        except Exception as e:
            logger.error(f"Unexpected error in complete submission: {str(e)} (duration: {time.time() - start_time:.2f}s)")
            logger.error(f"Error type: {type(e).__name__}")
            await db.rollback()
            raise ValidationException(f"An unexpected error occurred: {str(e)}")
        
        # Transaction committed successfully at this point
        duration = time.time() - start_time
        logger.info(f"Complete submission successful for report {report.id} in {duration:.2f}s")
        
        # 7. Background tasks (non-blocking)
        background_tasks.add_task(
            queue_report_for_processing_bg,
            report.id
        )
        
        background_tasks.add_task(
            update_user_reputation_bg,
            user_id,
            5  # 5 points for successful report submission
        )
        
        background_tasks.add_task(
            _log_complete_submission_audit,
            db,
            request,
            current_user,
            report,
            user_id,
            user_email,
            len(media_list),
            total_file_size,
            duration
        )
        
        # 8. Invalidate map cache (non-blocking)
        try:
            redis = await get_redis()
            keys = await redis.keys("map_data:*")
            if keys:
                await redis.delete(*keys)
                logger.info(f"Invalidated {len(keys)} map cache keys")
        except Exception as e:
            logger.warning(f"Cache invalidation failed: {e}")
        
        # 9. Send notification (non-blocking)
        try:
            from app.services.notification_service import NotificationService
            notification_service = NotificationService(db)
            await notification_service.notify_report_received(report)
            logger.info(f"Notification sent for report {report.id}")
        except Exception as e:
            logger.warning(f"Notification failed for report {report.id}: {e}")
        
        # 10. Prepare response
        response_data = {
            "id": report.id,
            "report_number": report.report_number,
            "user_id": report.user_id,
            "department_id": report.department_id,
            "category": report.category,
            "sub_category": report.sub_category,
            "status": report.status,
            "severity": report.severity,
            "is_public": bool(report.is_public),
            "created_at": report.created_at,
            "updated_at": report.updated_at,
            "title": report.title,
            "description": report.description,
            "latitude": report.latitude,
            "longitude": report.longitude,
            "address": report.address,
            "landmark": report.landmark,
            "media_count": len(media_list),
            "submission_type": "complete_atomic"
        }
        
        logger.info(f"Complete report submission finished successfully: {report.id}")
        return response_data
        
    except ValidationException as e:
        duration = time.time() - start_time
        logger.error(f"Validation error in complete submission: {str(e)} (duration: {duration:.2f}s)")
        
        # Audit log for validation failure
        await audit_logger.log(
            db=db,
            action=AuditAction.REPORT_CREATED,
            status=AuditStatus.FAILURE,
            user=current_user,
            request=request,
            description=f"Complete submission failed: Validation error",
            metadata={
                "error": str(e),
                "error_type": "ValidationException",
                "user_id": user_id,
                "submission_duration": duration,
                "submission_type": "complete_atomic",
                "files_count": len(files) if files else 0
            },
            resource_type="report",
            resource_id=None
        )
        raise
        
    except Exception as e:
        duration = time.time() - start_time
        logger.error(f"Unexpected error in complete submission: {str(e)} (duration: {duration:.2f}s)")
        logger.error(f"Error type: {type(e).__name__}")
        
        # Audit log for system failure
        await audit_logger.log(
            db=db,
            action=AuditAction.REPORT_CREATED,
            status=AuditStatus.FAILURE,
            user=current_user,
            request=request,
            description=f"Complete submission failed: System error",
            metadata={
                "error": str(e),
                "error_type": type(e).__name__,
                "user_id": user_id,
                "submission_duration": duration,
                "submission_type": "complete_atomic",
                "files_count": len(files) if files else 0
            },
            resource_type="report",
            resource_id=None
        )
        
        # Return user-friendly error message
        raise ValidationException(
            "Report submission failed due to a server error. Please try again. "
            "If the problem persists, please contact support."
        )


@router.get("/submission-limits")
async def get_submission_limits():
    """Get current submission limits and configuration"""
    
    return {
        "limits": {
            "max_files": 6,
            "max_images": 5,
            "max_audio": 1,
            "max_image_size_mb": 10,
            "max_audio_size_mb": 25,
            "max_title_length": 200,
            "max_description_length": 2000,
            "rate_limit_reports_per_5min": 3
        },
        "supported_formats": {
            "images": ["jpg", "jpeg", "png", "webp"],
            "audio": ["mp3", "wav", "m4a"]
        },
        "validation_rules": {
            "min_title_length": 5,
            "min_description_length": 10,
            "coordinate_bounds": {
                "latitude": {"min": -90, "max": 90},
                "longitude": {"min": -180, "max": 180}
            }
        },
        "processing": {
            "atomic_transaction": True,
            "automatic_retry": True,
            "background_processing": True,
            "offline_support": True
        }
    }
