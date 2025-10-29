#!/usr/bin/env python3
"""
Production-Ready File Upload Service for CivicLens
Handles secure file uploads with validation, processing, and storage
"""

import os
import uuid
import hashlib
import mimetypes
from typing import List, Optional, Dict, Any, BinaryIO
from pathlib import Path
import asyncio
from datetime import datetime, timedelta
import aiofiles
from PIL import Image
import io

from fastapi import UploadFile, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.media import Media, MediaType, UploadSource
from app.models.report import Report
from app.core.exceptions import ValidationException, ForbiddenException
from app.core.database import get_db
from app.config import settings
from app.services.storage_service import get_storage_service, StorageService
import logging

# Handle different python-magic installations
try:
    import magic
    HAS_MAGIC = True
except ImportError:
    try:
        # Try python-magic-bin (Windows)
        from magic import from_buffer
        magic = type('magic', (), {'from_buffer': from_buffer})()
        HAS_MAGIC = True
    except ImportError:
        # Fallback - disable magic-based validation
        magic = None
        HAS_MAGIC = False
        print("Warning: python-magic not available. Using basic file validation.")

logger = logging.getLogger(__name__)


class FileUploadService:
    """Comprehensive file upload service with validation and processing"""
    
    # File type configurations
    ALLOWED_IMAGE_TYPES = {
        'image/jpeg': ['.jpg', '.jpeg'],
        'image/png': ['.png'],
        'image/webp': ['.webp']
    }
    
    ALLOWED_AUDIO_TYPES = {
        'audio/mpeg': ['.mp3'],
        'audio/wav': ['.wav'],
        'audio/mp4': ['.m4a'],
        'audio/x-m4a': ['.m4a'],
        'audio/webm': ['.webm'],
        'audio/ogg': ['.ogg']
    }
    
    # Size limits (in bytes)
    MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB
    MAX_AUDIO_SIZE = 25 * 1024 * 1024  # 25MB
    MAX_IMAGES_PER_REPORT = 5
    MAX_AUDIO_PER_REPORT = 1
    
    # Image processing settings
    MAX_IMAGE_DIMENSION = 2048
    JPEG_QUALITY = 85
    WEBP_QUALITY = 80
    
    def __init__(self, db: AsyncSession, storage_service: StorageService):
        self.db = db
        self.storage = storage_service
    
    def _detect_mime_fallback(self, filename: str, content: bytes) -> str:
        """Fallback MIME type detection when python-magic is not available"""
        if not filename:
            raise ValidationException("Filename is required for file type detection")
        
        file_ext = Path(filename).suffix.lower()
        
        # Basic MIME type mapping
        mime_map = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg', 
            '.png': 'image/png',
            '.webp': 'image/webp',
            '.mp3': 'audio/mpeg',
            '.wav': 'audio/wav',
            '.m4a': 'audio/mp4'
        }
        
        detected_mime = mime_map.get(file_ext)
        if not detected_mime:
            raise ValidationException(f"Unsupported file extension: {file_ext}")
        
        # Basic content validation for images
        if detected_mime.startswith('image/'):
            # Check for common image file signatures
            if detected_mime == 'image/jpeg' and not content.startswith(b'\xff\xd8\xff'):
                raise ValidationException("Invalid JPEG file signature")
            elif detected_mime == 'image/png' and not content.startswith(b'\x89PNG\r\n\x1a\n'):
                raise ValidationException("Invalid PNG file signature")
        
        return detected_mime
        
    async def validate_file(self, file: UploadFile, expected_type: str) -> Dict[str, Any]:
        """Comprehensive file validation"""
        
        # Reset file pointer
        await file.seek(0)
        
        # Read file content for validation
        content = await file.read()
        await file.seek(0)  # Reset for later use
        
        if not content:
            raise ValidationException("File is empty")
        
        # File size validation
        file_size = len(content)
        if expected_type == 'image':
            if file_size > self.MAX_IMAGE_SIZE:
                raise ValidationException(f"Image file too large. Maximum size: {self.MAX_IMAGE_SIZE // (1024*1024)}MB")
            allowed_types = self.ALLOWED_IMAGE_TYPES
        elif expected_type == 'audio':
            if file_size > self.MAX_AUDIO_SIZE:
                raise ValidationException(f"Audio file too large. Maximum size: {self.MAX_AUDIO_SIZE // (1024*1024)}MB")
            allowed_types = self.ALLOWED_AUDIO_TYPES
        else:
            raise ValidationException(f"Unsupported file type: {expected_type}")
        
        # MIME type validation using python-magic
        if HAS_MAGIC and magic is not None:
            try:
                detected_mime = magic.from_buffer(content, mime=True)
            except Exception as e:
                logger.error(f"MIME type detection failed: {e}")
                # Fallback to basic validation
                detected_mime = self._detect_mime_fallback(file.filename, content)
        else:
            # Use fallback method when magic is not available
            detected_mime = self._detect_mime_fallback(file.filename, content)
        
        # Validate against allowed types
        if detected_mime not in allowed_types:
            allowed_list = ', '.join(allowed_types.keys())
            raise ValidationException(f"Invalid file type. Detected: {detected_mime}. Allowed: {allowed_list}")
        
        # Filename validation
        if not file.filename:
            raise ValidationException("Filename is required")
        
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in allowed_types[detected_mime]:
            raise ValidationException(f"File extension {file_ext} doesn't match detected type {detected_mime}")
        
        # Additional validation for images
        if expected_type == 'image':
            try:
                image = Image.open(io.BytesIO(content))
                width, height = image.size
                
                # Validate image dimensions
                if width < 100 or height < 100:
                    raise ValidationException("Image too small. Minimum size: 100x100 pixels")
                
                if width > 10000 or height > 10000:
                    raise ValidationException("Image too large. Maximum size: 10000x10000 pixels")
                
                # Validate image format
                if image.format.upper() not in ['JPEG', 'PNG', 'WEBP']:
                    raise ValidationException(f"Unsupported image format: {image.format}")
                
            except Exception as e:
                if isinstance(e, ValidationException):
                    raise
                logger.error(f"Image validation failed: {e}")
                raise ValidationException("Invalid or corrupted image file")
        
        # Generate file hash for deduplication
        file_hash = hashlib.sha256(content).hexdigest()
        
        return {
            'size': file_size,
            'mime_type': detected_mime,
            'hash': file_hash,
            'extension': file_ext,
            'is_valid': True
        }
    
    async def process_image(self, file: UploadFile, validation_result: Dict[str, Any]) -> bytes:
        """Process and optimize image"""
        
        await file.seek(0)
        content = await file.read()
        
        try:
            # Open image
            image = Image.open(io.BytesIO(content))
            
            # Convert to RGB if necessary (for JPEG compatibility)
            if image.mode in ('RGBA', 'LA', 'P'):
                # Create white background for transparency
                background = Image.new('RGB', image.size, (255, 255, 255))
                if image.mode == 'P':
                    image = image.convert('RGBA')
                background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
                image = background
            
            # Resize if too large
            width, height = image.size
            if width > self.MAX_IMAGE_DIMENSION or height > self.MAX_IMAGE_DIMENSION:
                # Calculate new dimensions maintaining aspect ratio
                ratio = min(self.MAX_IMAGE_DIMENSION / width, self.MAX_IMAGE_DIMENSION / height)
                new_width = int(width * ratio)
                new_height = int(height * ratio)
                
                image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
                logger.info(f"Resized image from {width}x{height} to {new_width}x{new_height}")
            
            # Save optimized image
            output = io.BytesIO()
            
            # Choose optimal format
            if validation_result['mime_type'] == 'image/png' and image.mode == 'RGB':
                # Convert PNG to JPEG if no transparency
                image.save(output, format='JPEG', quality=self.JPEG_QUALITY, optimize=True)
                validation_result['mime_type'] = 'image/jpeg'
                validation_result['extension'] = '.jpg'
            elif validation_result['mime_type'] == 'image/webp':
                image.save(output, format='WEBP', quality=self.WEBP_QUALITY, optimize=True)
            else:
                # Keep original format but optimize
                format_map = {'image/jpeg': 'JPEG', 'image/png': 'PNG'}
                format_name = format_map.get(validation_result['mime_type'], 'JPEG')
                
                if format_name == 'JPEG':
                    image.save(output, format=format_name, quality=self.JPEG_QUALITY, optimize=True)
                else:
                    image.save(output, format=format_name, optimize=True)
            
            processed_content = output.getvalue()
            
            # Update size after processing
            validation_result['size'] = len(processed_content)
            
            logger.info(f"Image processed: {len(content)} -> {len(processed_content)} bytes")
            
            return processed_content
            
        except Exception as e:
            logger.error(f"Image processing failed: {e}")
            raise ValidationException(f"Failed to process image: {str(e)}")
    
    async def upload_file(
        self,
        file: UploadFile,
        report_id: int,
        user_id: int,
        file_type: str,
        caption: Optional[str] = None,
        is_primary: bool = False,
        upload_source: Optional[UploadSource] = None,
        is_proof_of_work: bool = False
    ) -> Media:
        """Upload and store a single file"""
        
        # Validate file
        validation_result = await self.validate_file(file, file_type)
        
        # Check existing media count for this report
        # Count separately for citizen photos and officer photos
        if file_type == 'image':
            # If it's an officer photo, count only officer photos (before + after)
            if upload_source and upload_source in [UploadSource.OFFICER_BEFORE_PHOTO, UploadSource.OFFICER_AFTER_PHOTO]:
                existing_count = await self.db.execute(
                    select(func.count(Media.id))
                    .where(Media.report_id == report_id)
                    .where(Media.file_type == MediaType.IMAGE)
                    .where(Media.upload_source.in_([UploadSource.OFFICER_BEFORE_PHOTO, UploadSource.OFFICER_AFTER_PHOTO]))
                )
                if existing_count.scalar() >= self.MAX_IMAGES_PER_REPORT:
                    raise ValidationException(f"Maximum {self.MAX_IMAGES_PER_REPORT} officer photos allowed per report (before + after combined)")
            else:
                # For citizen photos, count only citizen photos
                existing_count = await self.db.execute(
                    select(func.count(Media.id))
                    .where(Media.report_id == report_id)
                    .where(Media.file_type == MediaType.IMAGE)
                    .where(
                        (Media.upload_source == UploadSource.CITIZEN_SUBMISSION) | 
                        (Media.upload_source == None)
                    )
                )
                if existing_count.scalar() >= self.MAX_IMAGES_PER_REPORT:
                    raise ValidationException(f"Maximum {self.MAX_IMAGES_PER_REPORT} citizen photos allowed per report")
        
        elif file_type == 'audio':
            existing_count = await self.db.execute(
                select(func.count(Media.id))
                .where(Media.report_id == report_id)
                .where(Media.file_type == MediaType.AUDIO)
            )
            if existing_count.scalar() >= self.MAX_AUDIO_PER_REPORT:
                raise ValidationException(f"Maximum {self.MAX_AUDIO_PER_REPORT} audio file allowed per report")
        
        # Process file content
        if file_type == 'image':
            processed_content = await self.process_image(file, validation_result)
        else:
            await file.seek(0)
            processed_content = await file.read()
        
        # Generate unique filename
        file_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        filename = f"{report_id}_{timestamp}_{file_id}{validation_result['extension']}"
        
        # Upload to storage
        try:
            file_url = await self.storage.upload_file(
                content=processed_content,
                filename=filename,
                content_type=validation_result['mime_type'],
                folder=f"reports/{report_id}"
            )
        except Exception as e:
            logger.error(f"Storage upload failed: {e}")
            raise ValidationException(f"Failed to upload file: {str(e)}")
        
        # Create media record
        media_type = MediaType.IMAGE if file_type == 'image' else MediaType.AUDIO
        
        media = Media(
            report_id=report_id,
            file_url=file_url,
            file_type=media_type,
            file_size=validation_result['size'],
            mime_type=validation_result['mime_type'],
            is_primary=is_primary,
            caption=caption,
            upload_source=upload_source or UploadSource.CITIZEN_SUBMISSION,
            is_proof_of_work=is_proof_of_work,
            meta={
                'original_filename': file.filename,
                'file_hash': validation_result['hash'],
                'processed': file_type == 'image',
                'uploaded_by': user_id,
                'upload_timestamp': datetime.utcnow().isoformat()
            }
        )
        
        self.db.add(media)
        await self.db.flush()
        
        logger.info(f"File uploaded successfully: {filename} -> {file_url}")
        
        return media
    
    async def upload_multiple_files(
        self,
        files: List[UploadFile],
        report_id: int,
        user_id: int,
        captions: Optional[List[str]] = None
    ) -> List[Media]:
        """Upload multiple files with validation and processing"""
        
        if not files:
            return []
        
        # Separate images and audio files
        images = []
        audio_files = []
        
        for i, file in enumerate(files):
            if not file.filename:
                continue
                
            file_ext = Path(file.filename).suffix.lower()
            
            # Determine file type by extension
            is_image = any(file_ext in exts for exts in self.ALLOWED_IMAGE_TYPES.values())
            is_audio = any(file_ext in exts for exts in self.ALLOWED_AUDIO_TYPES.values())
            
            if is_image:
                images.append((i, file))
            elif is_audio:
                audio_files.append((i, file))
            else:
                logger.warning(f"Skipping unsupported file: {file.filename}")
        
        # Validate counts
        if len(images) > self.MAX_IMAGES_PER_REPORT:
            raise ValidationException(f"Too many images. Maximum {self.MAX_IMAGES_PER_REPORT} allowed")
        
        if len(audio_files) > self.MAX_AUDIO_PER_REPORT:
            raise ValidationException(f"Too many audio files. Maximum {self.MAX_AUDIO_PER_REPORT} allowed")
        
        # Upload files
        uploaded_media = []
        
        # Upload images
        for i, (original_index, file) in enumerate(images):
            caption = captions[original_index] if captions and original_index < len(captions) else None
            is_primary = i == 0  # First image is primary
            
            try:
                media = await self.upload_file(
                    file=file,
                    report_id=report_id,
                    user_id=user_id,
                    file_type='image',
                    caption=caption,
                    is_primary=is_primary
                )
                uploaded_media.append(media)
            except Exception as e:
                logger.error(f"Failed to upload image {file.filename}: {e}")
                # Continue with other files
        
        # Upload audio files
        for original_index, file in audio_files:
            caption = captions[original_index] if captions and original_index < len(captions) else None
            
            try:
                media = await self.upload_file(
                    file=file,
                    report_id=report_id,
                    user_id=user_id,
                    file_type='audio',
                    caption=caption
                )
                uploaded_media.append(media)
            except Exception as e:
                logger.error(f"Failed to upload audio {file.filename}: {e}")
                # Continue with other files
        
        await self.db.commit()
        
        logger.info(f"Uploaded {len(uploaded_media)} files for report {report_id}")
        
        return uploaded_media
    
    async def delete_media(self, media_id: int, user_id: int) -> bool:
        """Delete media file and record"""
        
        # Get media record
        media_result = await self.db.execute(
            select(Media).where(Media.id == media_id)
        )
        media = media_result.scalar_one_or_none()
        
        if not media:
            raise ValidationException("Media not found")
        
        # Check permissions (user must own the report)
        report_result = await self.db.execute(
            select(Report).where(Report.id == media.report_id)
        )
        report = report_result.scalar_one_or_none()
        
        if not report or report.user_id != user_id:
            raise ForbiddenException("Access denied")
        
        try:
            # Delete from storage
            await self.storage.delete_file(media.file_url)
            
            # Delete from database
            await self.db.delete(media)
            await self.db.commit()
            
            logger.info(f"Media deleted: {media_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete media {media_id}: {e}")
            await self.db.rollback()
            raise ValidationException(f"Failed to delete media: {str(e)}")


# Factory function for dependency injection
async def get_file_upload_service(
    db: AsyncSession = Depends(get_db)
) -> FileUploadService:
    """Get file upload service instance"""
    storage_service = await get_storage_service()
    return FileUploadService(db, storage_service)