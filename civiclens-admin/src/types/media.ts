// Media Upload Types for CivicLens
export interface MediaFile {
  id: string;
  file: File;
  type: 'image' | 'audio';
  preview?: string;
  caption?: string;
  uploading?: boolean;
  uploaded?: boolean;
  error?: string;
  progress?: number;
  size: number;
  name: string;
  lastModified: number;
}

export interface MediaUploadConfig {
  maxImages: number;
  maxAudio: number;
  maxImageSize: number; // in bytes
  maxAudioSize: number; // in bytes
  allowedImageTypes: string[];
  allowedAudioTypes: string[];
  maxImageDimension: number;
  compressionQuality: number;
}

export interface MediaUploadResponse {
  id: number;
  report_id: number;
  file_url: string;
  file_type: string;
  file_size: number;
  mime_type: string;
  is_primary: boolean;
  caption?: string;
  upload_source?: string;
  created_at: string;
}

export interface BulkUploadResponse {
  success: boolean;
  uploaded_count: number;
  total_files: number;
  media: MediaUploadResponse[];
  errors: string[];
}

export interface UploadProgress {
  fileId: string;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

export interface MediaValidationResult {
  valid: boolean;
  error?: string;
  type?: 'image' | 'audio';
  warnings?: string[];
}

export interface MediaProcessingOptions {
  compressImages: boolean;
  maxDimension: number;
  quality: number;
  generateThumbnails: boolean;
  extractMetadata: boolean;
}

export interface MediaMetadata {
  width?: number;
  height?: number;
  duration?: number;
  format: string;
  size: number;
  checksum?: string;
  exif?: Record<string, any>;
}