#!/usr/bin/env python3
"""
Media Upload API Endpoints for CivicLens
Handles file uploads for reports with validation and processing
"""

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.report import Report
from app.models.media import Media, MediaType
from app.schemas.media import (
    MediaResponse, 
    BulkUploadResponse, 
    MediaListResponse, 
    UploadLimitsResponse, 
    StorageStatsResponse
)
from app.services.file_upload_service import get_file_upload_service, FileUploadService
from app.core.exceptions import NotFoundException, ForbiddenException, ValidationException
from app.core.audit_logger import audit_logger
from app.models.audit_log import AuditAction, AuditStatus
from app.crud.report import report_crud
from sqlalchemy import select
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/media", tags=["Media Upload"])


# Schema models are imported from app.schemas.media


@router.post("/upload/{report_id}", response_model=MediaResponse)
async def upload_single_file(
    report_id: int,
    file: UploadFile = File(..., description="File to upload (image or audio)"),
    caption: Optional[str] = Form(None, description="Optional caption for the file"),
    is_primary: bool = Form(False, description="Mark as primary image"),
    upload_source: Optional[str] = Form(None, description="Upload source: citizen_submission, officer_before_photo, officer_after_photo"),
    is_proof_of_work: bool = Form(False, description="Mark as proof of work (for officer completion photos)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    upload_service: FileUploadService = Depends(get_file_upload_service)
) -> MediaResponse:
    """
    Upload a single file (image or audio) to a report
    
    Supported formats:
    - Images: JPEG, PNG, WebP (max 10MB each, up to 5 per report)
    - Audio: MP3, WAV, M4A (max 25MB, 1 per report)
    """
    
    # Verify report exists and user has permission
    report = await report_crud.get(db, report_id)
    if not report:
        raise NotFoundException("Report not found")
    
    # Check if user can upload to this report
    if report.user_id != current_user.id and not current_user.can_access_admin_portal():
        raise ForbiddenException("You can only upload files to your own reports")
    
    try:
        # Determine file type
        if not file.filename:
            raise ValidationException("Filename is required")
        
        file_ext = file.filename.lower().split('.')[-1]
        
        # Determine if it's an image or audio file
        image_extensions = ['jpg', 'jpeg', 'png', 'webp']
        audio_extensions = ['mp3', 'wav', 'm4a']
        
        if file_ext in image_extensions:
            file_type = 'image'
        elif file_ext in audio_extensions:
            file_type = 'audio'
        else:
            raise ValidationException(f"Unsupported file type: {file_ext}")
        
        # Convert upload_source string to enum
        from app.models.media import UploadSource
        source_enum = None
        if upload_source:
            try:
                source_enum = UploadSource(upload_source)
            except ValueError:
                raise ValidationException(f"Invalid upload_source: {upload_source}. Must be one of: citizen_submission, officer_before_photo, officer_after_photo")
        
        # Upload file
        media = await upload_service.upload_file(
            file=file,
            report_id=report_id,
            user_id=current_user.id,
            file_type=file_type,
            caption=caption,
            is_primary=is_primary,
            upload_source=source_enum,
            is_proof_of_work=is_proof_of_work
        )
        
        # Audit log
        await audit_logger.log(
            db=db,
            action=AuditAction.MEDIA_UPLOADED,
            status=AuditStatus.SUCCESS,
            user=current_user,
            description=f"Uploaded {file_type} file to report #{report_id}",
            metadata={
                "report_id": report_id,
                "media_id": media.id,
                "file_type": file_type,
                "file_size": media.file_size,
                "filename": file.filename
            },
            resource_type="media",
            resource_id=str(media.id)
        )
        
        return MediaResponse(
            id=media.id,
            report_id=media.report_id,
            file_url=media.file_url,
            file_type=media.file_type.value.lower(),  # Convert to lowercase for frontend
            file_size=media.file_size,
            mime_type=media.mime_type,
            is_primary=media.is_primary,
            caption=media.caption,
            upload_source=media.upload_source.value if media.upload_source else None,
            created_at=media.created_at.isoformat()
        )
        
    except ValidationException:
        raise
    except Exception as e:
        logger.error(f"File upload failed: {e}")
        
        # Audit log failure
        await audit_logger.log(
            db=db,
            action=AuditAction.MEDIA_UPLOADED,
            status=AuditStatus.FAILURE,
            user=current_user,
            description=f"Failed to upload file to report #{report_id}: {str(e)}",
            metadata={
                "report_id": report_id,
                "filename": file.filename,
                "error": str(e)
            },
            resource_type="media",
            resource_id=None
        )
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload failed: {str(e)}"
        )


@router.post("/upload/{report_id}/bulk", response_model=BulkUploadResponse)
async def upload_multiple_files(
    report_id: int,
    files: List[UploadFile] = File(..., description="Files to upload (max 5 images + 1 audio)"),
    captions: Optional[str] = Form(None, description="JSON array of captions for each file"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    upload_service: FileUploadService = Depends(get_file_upload_service)
) -> BulkUploadResponse:
    """
    Upload multiple files to a report in a single request
    
    Limits:
    - Maximum 5 images per report
    - Maximum 1 audio file per report
    - Images: JPEG, PNG, WebP (max 10MB each)
    - Audio: MP3, WAV, M4A (max 25MB)
    """
    
    # Verify report exists and user has permission
    report = await report_crud.get(db, report_id)
    if not report:
        raise NotFoundException("Report not found")
    
    if report.user_id != current_user.id and not current_user.can_access_admin_portal():
        raise ForbiddenException("You can only upload files to your own reports")
    
    # Validate file count
    if len(files) > 6:  # 5 images + 1 audio max
        raise ValidationException("Too many files. Maximum 6 files allowed (5 images + 1 audio)")
    
    # Parse captions if provided
    parsed_captions = []
    if captions:
        try:
            import json
            parsed_captions = json.loads(captions)
        except json.JSONDecodeError:
            logger.warning("Invalid captions JSON, ignoring")
    
    errors = []
    uploaded_media = []
    
    try:
        # Upload files
        media_list = await upload_service.upload_multiple_files(
            files=files,
            report_id=report_id,
            user_id=current_user.id,
            captions=parsed_captions
        )
        
        # Convert to response format
        for media in media_list:
            uploaded_media.append(MediaResponse(
                id=media.id,
                report_id=media.report_id,
                file_url=media.file_url,
                file_type=media.file_type.value.lower(),  # Convert to lowercase for frontend
                file_size=media.file_size,
                mime_type=media.mime_type,
                is_primary=media.is_primary,
                caption=media.caption,
                upload_source=media.upload_source.value if media.upload_source else None,
                created_at=media.created_at.isoformat()
            ))
        
        # Audit log
        await audit_logger.log(
            db=db,
            action=AuditAction.MEDIA_UPLOADED,
            status=AuditStatus.SUCCESS,
            user=current_user,
            description=f"Bulk uploaded {len(uploaded_media)} files to report #{report_id}",
            metadata={
                "report_id": report_id,
                "uploaded_count": len(uploaded_media),
                "total_files": len(files),
                "media_ids": [m.id for m in uploaded_media]
            },
            resource_type="media",
            resource_id="bulk"
        )
        
        return BulkUploadResponse(
            success=True,
            uploaded_count=len(uploaded_media),
            total_files=len(files),
            media=uploaded_media,
            errors=errors
        )
        
    except Exception as e:
        logger.error(f"Bulk upload failed: {e}")
        
        # Audit log failure
        await audit_logger.log(
            db=db,
            action=AuditAction.MEDIA_UPLOADED,
            status=AuditStatus.FAILURE,
            user=current_user,
            description=f"Bulk upload failed for report #{report_id}: {str(e)}",
            metadata={
                "report_id": report_id,
                "total_files": len(files),
                "error": str(e)
            },
            resource_type="media",
            resource_id="bulk"
        )
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Bulk upload failed: {str(e)}"
        )


@router.delete("/{media_id}")
async def delete_media(
    media_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    upload_service: FileUploadService = Depends(get_file_upload_service)
):
    """Delete a media file"""
    
    try:
        success = await upload_service.delete_media(media_id, current_user.id)
        
        if success:
            # Audit log
            await audit_logger.log(
                db=db,
                action=AuditAction.MEDIA_DELETED,
                status=AuditStatus.SUCCESS,
                user=current_user,
                description=f"Deleted media file #{media_id}",
                metadata={"media_id": media_id},
                resource_type="media",
                resource_id=str(media_id)
            )
            
            return {"success": True, "message": "Media deleted successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete media"
            )
            
    except (ValidationException, ForbiddenException):
        raise
    except Exception as e:
        logger.error(f"Media deletion failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Deletion failed: {str(e)}"
        )


@router.get("/report/{report_id}", response_model=List[MediaResponse])
async def get_report_media(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> List[MediaResponse]:
    """Get all media files for a report"""
    
    # Verify report exists and user has permission
    report = await report_crud.get(db, report_id)
    if not report:
        raise NotFoundException("Report not found")
    
    # Check permissions
    if (report.user_id != current_user.id and 
        not current_user.can_access_admin_portal() and
        not (report.task and report.task.assigned_to == current_user.id)):
        raise ForbiddenException("Access denied")
    
    # Get media files
    media_result = await db.execute(
        select(Media)
        .where(Media.report_id == report_id)
        .order_by(Media.is_primary.desc(), Media.created_at.asc())
    )
    media_list = media_result.scalars().all()
    
    return [
        MediaResponse(
            id=media.id,
            report_id=media.report_id,
            file_url=media.file_url,
            file_type=media.file_type.value.lower(),  # Convert to lowercase for frontend
            file_size=media.file_size,
            mime_type=media.mime_type,
            is_primary=media.is_primary,
            caption=media.caption,
            upload_source=media.upload_source.value if media.upload_source else None,
            created_at=media.created_at.isoformat()
        )
        for media in media_list
    ]


@router.get("/limits")
async def get_upload_limits():
    """Get upload limits and supported file types"""
    
    return {
        "limits": {
            "max_images_per_report": 5,
            "max_audio_per_report": 1,
            "max_image_size_mb": 10,
            "max_audio_size_mb": 25,
            "max_total_files": 6
        },
        "supported_types": {
            "images": {
                "formats": ["JPEG", "PNG", "WebP"],
                "extensions": [".jpg", ".jpeg", ".png", ".webp"],
                "mime_types": ["image/jpeg", "image/png", "image/webp"]
            },
            "audio": {
                "formats": ["MP3", "WAV", "M4A"],
                "extensions": [".mp3", ".wav", ".m4a"],
                "mime_types": ["audio/mpeg", "audio/wav", "audio/mp4", "audio/x-m4a"]
            }
        },
        "processing": {
            "image_compression": True,
            "max_image_dimension": 2048,
            "jpeg_quality": 85,
            "webp_quality": 80
        }
    }


@router.get("/storage/stats")
async def get_storage_stats(
    current_user: User = Depends(get_current_user),
    upload_service: FileUploadService = Depends(get_file_upload_service)
):
    """Get storage statistics (admin only)"""
    
    if not current_user.can_access_admin_portal():
        raise ForbiddenException("Admin access required")
    
    storage_stats = upload_service.storage.get_storage_stats()
    
    return {
        "storage": storage_stats,
        "timestamp": datetime.utcnow().isoformat()
    }