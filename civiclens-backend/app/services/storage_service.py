#!/usr/bin/env python3
"""
Production-Ready Storage Service for CivicLens
Handles file storage with MinIO (S3-compatible) and local fallback
"""

import os
import uuid
from typing import Optional, BinaryIO, Union
from datetime import datetime, timedelta
import asyncio
import aiofiles
from pathlib import Path
import urllib3

from app.config import settings
import logging

# Handle MinIO import gracefully
try:
    from minio import Minio
    from minio.error import S3Error
    HAS_MINIO = True
except ImportError:
    HAS_MINIO = False
    print("Warning: MinIO not available. Using local storage only.")

logger = logging.getLogger(__name__)


class StorageService:
    """Comprehensive storage service with cloud and local support"""
    
    def __init__(self):
        self.use_minio = bool(settings.MINIO_ENDPOINT) and HAS_MINIO
        self.bucket_name = settings.MINIO_BUCKET or "civiclens-media"
        
        if self.use_minio:
            self._init_minio()
        else:
            self._init_local_storage()
    
    def _init_minio(self):
        """Initialize MinIO client and bucket"""
        try:
            # Disable SSL warnings for development
            urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
            
            # Create MinIO client
            self.client = Minio(
                endpoint=settings.MINIO_ENDPOINT,
                access_key=settings.MINIO_ACCESS_KEY,
                secret_key=settings.MINIO_SECRET_KEY,
                secure=settings.MINIO_USE_SSL or False
            )
            
            # Create bucket if it doesn't exist
            if not self.client.bucket_exists(self.bucket_name):
                self.client.make_bucket(self.bucket_name)
                logger.info(f"Created MinIO bucket: {self.bucket_name}")
            
            # Set bucket policy for public read access to public folder
            policy = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {"AWS": "*"},
                        "Action": "s3:GetObject",
                        "Resource": f"arn:aws:s3:::{self.bucket_name}/public/*"
                    }
                ]
            }
            
            try:
                import json
                self.client.set_bucket_policy(self.bucket_name, json.dumps(policy))
            except Exception as e:
                logger.warning(f"Could not set bucket policy: {e}")
            
            logger.info(f"MinIO storage initialized: {settings.MINIO_ENDPOINT}")
            
        except Exception as e:
            logger.error(f"MinIO initialization failed: {e}")
            logger.info("Falling back to local storage")
            self.use_minio = False
            self._init_local_storage()
    
    def _init_local_storage(self):
        """Initialize local file storage"""
        self.local_storage_path = Path(settings.MEDIA_ROOT or "./media")
        self.local_storage_path.mkdir(parents=True, exist_ok=True)
        logger.info(f"Local storage initialized: {self.local_storage_path}")
    
    async def upload_file(
        self,
        content: Union[bytes, BinaryIO],
        filename: str,
        content_type: str,
        folder: str = "uploads"
    ) -> str:
        """Upload file to storage and return public URL"""
        
        # Generate storage path
        storage_path = f"{folder}/{filename}"
        
        if self.use_minio:
            return await self._upload_to_minio(content, storage_path, content_type)
        else:
            return await self._upload_to_local(content, storage_path, content_type)
    
    async def _upload_to_minio(self, content: Union[bytes, BinaryIO], path: str, content_type: str) -> str:
        """Upload file to MinIO"""
        try:
            # Convert bytes to BytesIO if needed
            if isinstance(content, bytes):
                from io import BytesIO
                content_stream = BytesIO(content)
                content_length = len(content)
            else:
                content_stream = content
                content_length = -1  # Let MinIO determine length
            
            # Upload to MinIO
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.client.put_object(
                    bucket_name=self.bucket_name,
                    object_name=path,
                    data=content_stream,
                    length=content_length,
                    content_type=content_type
                )
            )
            
            # Generate public URL
            if settings.MINIO_USE_SSL:
                protocol = "https"
            else:
                protocol = "http"
            
            public_url = f"{protocol}://{settings.MINIO_ENDPOINT}/{self.bucket_name}/{path}"
            
            logger.info(f"File uploaded to MinIO: {path}")
            return public_url
            
        except Exception as e:
            logger.error(f"MinIO upload failed: {e}")
            raise Exception(f"Failed to upload to MinIO: {str(e)}")
    
    async def _upload_to_local(self, content: Union[bytes, BinaryIO], path: str, content_type: str) -> str:
        """Upload file to local storage"""
        try:
            # Create directory structure
            file_path = self.local_storage_path / path
            file_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Write file
            if isinstance(content, bytes):
                async with aiofiles.open(file_path, 'wb') as f:
                    await f.write(content)
            else:
                # Handle file-like object
                content.seek(0)
                file_content = content.read()
                async with aiofiles.open(file_path, 'wb') as f:
                    await f.write(file_content)
            
            # Generate public URL (relative to media root)
            public_url = f"/media/{path}"
            
            logger.info(f"File uploaded locally: {path}")
            return public_url
            
        except Exception as e:
            logger.error(f"Local upload failed: {e}")
            raise Exception(f"Failed to upload locally: {str(e)}")
    
    async def delete_file(self, file_url: str) -> bool:
        """Delete file from storage"""
        
        if self.use_minio:
            return await self._delete_from_minio(file_url)
        else:
            return await self._delete_from_local(file_url)
    
    async def _delete_from_minio(self, file_url: str) -> bool:
        """Delete file from MinIO"""
        try:
            # Extract object name from URL
            # URL format: http://minio:9000/bucket/path/file.jpg
            url_parts = file_url.split('/')
            if len(url_parts) < 4:
                raise ValueError("Invalid MinIO URL format")
            
            # Skip protocol, host, bucket - get the path
            object_name = '/'.join(url_parts[4:])
            
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.client.remove_object(self.bucket_name, object_name)
            )
            
            logger.info(f"File deleted from MinIO: {object_name}")
            return True
            
        except Exception as e:
            logger.error(f"MinIO delete failed: {e}")
            return False
    
    async def _delete_from_local(self, file_url: str) -> bool:
        """Delete file from local storage"""
        try:
            # Extract path from URL
            # URL format: /media/path/file.jpg
            if file_url.startswith('/media/'):
                relative_path = file_url[7:]  # Remove '/media/'
                file_path = self.local_storage_path / relative_path
                
                if file_path.exists():
                    file_path.unlink()
                    logger.info(f"File deleted locally: {relative_path}")
                    return True
                else:
                    logger.warning(f"File not found for deletion: {file_path}")
                    return False
            else:
                logger.error(f"Invalid local file URL: {file_url}")
                return False
                
        except Exception as e:
            logger.error(f"Local delete failed: {e}")
            return False
    
    async def get_signed_url(self, file_url: str, expires_in: int = 3600) -> str:
        """Generate signed URL for secure access"""
        
        if not self.use_minio:
            # Local storage doesn't need signed URLs
            return file_url
        
        try:
            # Extract object name from URL
            url_parts = file_url.split('/')
            if len(url_parts) < 4:
                return file_url
            
            object_name = '/'.join(url_parts[4:])
            
            # Generate presigned URL
            signed_url = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.client.presigned_get_object(
                    bucket_name=self.bucket_name,
                    object_name=object_name,
                    expires=timedelta(seconds=expires_in)
                )
            )
            
            return signed_url
            
        except Exception as e:
            logger.error(f"Failed to generate signed URL: {e}")
            return file_url
    
    async def get_file_info(self, file_url: str) -> Optional[dict]:
        """Get file information"""
        
        if self.use_minio:
            return await self._get_minio_file_info(file_url)
        else:
            return await self._get_local_file_info(file_url)
    
    async def _get_minio_file_info(self, file_url: str) -> Optional[dict]:
        """Get file info from MinIO"""
        try:
            url_parts = file_url.split('/')
            if len(url_parts) < 4:
                return None
            
            object_name = '/'.join(url_parts[4:])
            
            stat = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.client.stat_object(self.bucket_name, object_name)
            )
            
            return {
                'size': stat.size,
                'last_modified': stat.last_modified,
                'content_type': stat.content_type,
                'etag': stat.etag
            }
            
        except Exception as e:
            logger.error(f"Failed to get MinIO file info: {e}")
            return None
    
    async def _get_local_file_info(self, file_url: str) -> Optional[dict]:
        """Get file info from local storage"""
        try:
            if file_url.startswith('/media/'):
                relative_path = file_url[7:]
                file_path = self.local_storage_path / relative_path
                
                if file_path.exists():
                    stat = file_path.stat()
                    return {
                        'size': stat.st_size,
                        'last_modified': datetime.fromtimestamp(stat.st_mtime),
                        'content_type': None,  # Would need python-magic to detect
                        'etag': None
                    }
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get local file info: {e}")
            return None
    
    def get_storage_stats(self) -> dict:
        """Get storage statistics"""
        
        stats = {
            'type': 'minio' if self.use_minio else 'local',
            'bucket': self.bucket_name if self.use_minio else str(self.local_storage_path),
            'available': True
        }
        
        if self.use_minio:
            try:
                # Test MinIO connection
                self.client.bucket_exists(self.bucket_name)
                stats['available'] = True
            except Exception:
                stats['available'] = False
        
        return stats


# Global storage service instance
_storage_service: Optional[StorageService] = None


async def get_storage_service() -> StorageService:
    """Get storage service instance (singleton)"""
    global _storage_service
    
    if _storage_service is None:
        _storage_service = StorageService()
    
    return _storage_service