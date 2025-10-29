#!/usr/bin/env python3
"""
Media Schema Definitions for CivicLens
Pydantic models for media upload and response
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class MediaResponse(BaseModel):
    """Response model for media upload"""
    id: int
    report_id: int
    file_url: str
    file_type: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    is_primary: bool = False
    caption: Optional[str] = None
    upload_source: Optional[str] = None
    created_at: str  # ISO format string
    
    class Config:
        from_attributes = True


class BulkUploadResponse(BaseModel):
    """Response model for bulk upload"""
    success: bool
    uploaded_count: int
    total_files: int
    media: List[MediaResponse] = []
    errors: List[str] = []


class MediaListResponse(BaseModel):
    """Response model for media list"""
    media: List[MediaResponse]
    total_count: int


class UploadLimitsResponse(BaseModel):
    """Response model for upload limits"""
    max_image_size_mb: int
    max_audio_size_mb: int
    max_images_per_report: int
    max_audio_per_report: int
    allowed_image_types: List[str]
    allowed_audio_types: List[str]


class StorageStatsResponse(BaseModel):
    """Response model for storage statistics"""
    storage_type: str
    bucket_or_path: str
    available: bool
    total_files: Optional[int] = None
    total_size_mb: Optional[float] = None