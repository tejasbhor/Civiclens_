// Production-Ready Media Upload Service for CivicLens
import { 
  MediaFile, 
  MediaUploadConfig, 
  MediaValidationResult, 
  MediaProcessingOptions,
  MediaMetadata,
  BulkUploadResponse,
  UploadProgress
} from '@/types/media';
import { buildApiUrl } from '@/lib/config/api';

class MediaUploadService {
  private config: MediaUploadConfig = {
    maxImages: 5,
    maxAudio: 1,
    maxImageSize: 10 * 1024 * 1024, // 10MB
    maxAudioSize: 25 * 1024 * 1024, // 25MB
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedAudioTypes: ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a'],
    maxImageDimension: 2048,
    compressionQuality: 0.85
  };

  private processingOptions: MediaProcessingOptions = {
    compressImages: true,
    maxDimension: 2048,
    quality: 0.85,
    generateThumbnails: true,
    extractMetadata: true
  };

  /**
   * Validate a single file against upload constraints
   */
  validateFile(file: File, existingFiles: MediaFile[] = []): MediaValidationResult {
    const warnings: string[] = [];
    
    // Check file type
    const isImage = this.config.allowedImageTypes.includes(file.type);
    const isAudio = this.config.allowedAudioTypes.includes(file.type);
    
    if (!isImage && !isAudio) {
      return {
        valid: false,
        error: `Unsupported file type: ${file.type}. Supported formats: ${[...this.config.allowedImageTypes, ...this.config.allowedAudioTypes].join(', ')}`
      };
    }

    const fileType = isImage ? 'image' : 'audio';
    
    // Check file size
    const maxSize = fileType === 'image' ? this.config.maxImageSize : this.config.maxAudioSize;
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File too large. Maximum size for ${fileType}s: ${this.formatFileSize(maxSize)}`
      };
    }

    // Check quantity limits
    const existingOfType = existingFiles.filter(f => f.type === fileType);
    const maxCount = fileType === 'image' ? this.config.maxImages : this.config.maxAudio;
    
    if (existingOfType.length >= maxCount) {
      return {
        valid: false,
        error: `Maximum ${maxCount} ${fileType}${maxCount > 1 ? 's' : ''} allowed per report`
      };
    }

    // Add warnings for large files
    const warningThreshold = maxSize * 0.8;
    if (file.size > warningThreshold) {
      warnings.push(`Large file size: ${this.formatFileSize(file.size)}. Consider compressing for faster upload.`);
    }

    // Check file name length
    if (file.name.length > 255) {
      warnings.push('File name is very long. Consider renaming for better compatibility.');
    }

    return {
      valid: true,
      type: fileType,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Process and compress image files
   */
  async processImage(file: File): Promise<{ processedFile: File; metadata: MediaMetadata }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      img.onload = () => {
        try {
          const { width, height } = img;
          let { width: newWidth, height: newHeight } = this.calculateDimensions(width, height);

          // Set canvas dimensions
          canvas.width = newWidth;
          canvas.height = newHeight;

          // Draw and compress
          ctx.drawImage(img, 0, 0, newWidth, newHeight);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Image processing failed'));
                return;
              }

              const processedFile = new File([blob], file.name, {
                type: 'image/jpeg', // Always convert to JPEG for consistency
                lastModified: Date.now()
              });

              const metadata: MediaMetadata = {
                width: newWidth,
                height: newHeight,
                format: 'image/jpeg',
                size: processedFile.size,
                checksum: this.generateChecksum(file.name + file.size + file.lastModified)
              };

              resolve({ processedFile, metadata });
            },
            'image/jpeg',
            this.processingOptions.quality
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('Invalid image file'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Extract audio metadata
   */
  async processAudio(file: File): Promise<{ processedFile: File; metadata: MediaMetadata }> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      
      audio.onloadedmetadata = () => {
        const metadata: MediaMetadata = {
          duration: audio.duration,
          format: file.type,
          size: file.size,
          checksum: this.generateChecksum(file.name + file.size + file.lastModified)
        };

        resolve({ processedFile: file, metadata });
      };

      audio.onerror = () => reject(new Error('Invalid audio file'));
      audio.src = URL.createObjectURL(file);
    });
  }

  /**
   * Create preview for media files
   */
  async createPreview(file: File, type: 'image' | 'audio'): Promise<string> {
    if (type === 'image') {
      return URL.createObjectURL(file);
    } else {
      // For audio, we could generate a waveform or use a generic icon
      return ''; // Return empty string for now, could be enhanced with waveform generation
    }
  }

  /**
   * Upload files with progress tracking
   */
  async uploadFiles(
    reportId: number,
    files: MediaFile[],
    onProgress?: (progress: UploadProgress[]) => void
  ): Promise<BulkUploadResponse> {
    const formData = new FormData();
    
    // Add files to form data
    files.forEach((mediaFile) => {
      formData.append('files', mediaFile.file);
    });
    
    // Add captions as JSON
    const captions = files.map(f => f.caption || '');
    formData.append('captions', JSON.stringify(captions));

    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token not found');
    }

    try {
      const url = buildApiUrl(`media/upload/${reportId}/bulk`);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Upload failed: ${response.statusText}`);
      }

      const result: BulkUploadResponse = await response.json();
      return result;
      
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
  }

  /**
   * Upload single file with progress
   */
  async uploadSingleFile(
    reportId: number,
    file: MediaFile,
    onProgress?: (progress: number) => void
  ): Promise<any> {
    const formData = new FormData();
    formData.append('file', file.file);
    
    if (file.caption) {
      formData.append('caption', file.caption);
    }

    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token not found');
    }

    // Build URL before creating the Promise
    const url = buildApiUrl(`media/upload/${reportId}`);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            resolve(result);
          } catch (error) {
            reject(new Error('Invalid response format'));
          }
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText);
            reject(new Error(errorData.detail || `Upload failed: ${xhr.statusText}`));
          } catch {
            reject(new Error(`Upload failed: ${xhr.statusText}`));
          }
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('timeout', () => {
        reject(new Error('Upload timeout'));
      });

      xhr.open('POST', url);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.timeout = 300000; // 5 minutes timeout
      xhr.send(formData);
    });
  }

  /**
   * Get upload limits and configuration
   */
  async getUploadLimits(): Promise<any> {
    try {
      const url = buildApiUrl('media/limits');
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch upload limits: ${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.warn('Failed to fetch upload limits from API, using defaults:', error);
      // Return default config if API fails
      return {
        limits: {
          max_images_per_report: this.config.maxImages,
          max_audio_per_report: this.config.maxAudio,
          max_image_size_mb: this.config.maxImageSize / (1024 * 1024),
          max_audio_size_mb: this.config.maxAudioSize / (1024 * 1024),
        },
        supported_types: {
          images: {
            formats: ['JPEG', 'PNG', 'WebP'],
            extensions: ['.jpg', '.jpeg', '.png', '.webp'],
            mime_types: this.config.allowedImageTypes
          },
          audio: {
            formats: ['MP3', 'WAV', 'M4A'],
            extensions: ['.mp3', '.wav', '.m4a'],
            mime_types: this.config.allowedAudioTypes
          }
        }
      };
    }
  }

  /**
   * Calculate optimal image dimensions
   */
  private calculateDimensions(width: number, height: number): { width: number; height: number } {
    const maxDimension = this.processingOptions.maxDimension;
    
    if (width <= maxDimension && height <= maxDimension) {
      return { width, height };
    }

    const aspectRatio = width / height;
    
    if (width > height) {
      return {
        width: maxDimension,
        height: Math.round(maxDimension / aspectRatio)
      };
    } else {
      return {
        width: Math.round(maxDimension * aspectRatio),
        height: maxDimension
      };
    }
  }

  /**
   * Generate simple checksum for file identification
   */
  private generateChecksum(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get file type icon
   */
  getFileTypeIcon(type: string): string {
    if (type.startsWith('image/')) return '🖼️';
    if (type.startsWith('audio/')) return '🎵';
    return '📄';
  }

  /**
   * Validate file name
   */
  validateFileName(fileName: string): { valid: boolean; error?: string } {
    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(fileName)) {
      return {
        valid: false,
        error: 'File name contains invalid characters'
      };
    }

    // Check length
    if (fileName.length > 255) {
      return {
        valid: false,
        error: 'File name is too long (max 255 characters)'
      };
    }

    return { valid: true };
  }

  /**
   * Clean up object URLs to prevent memory leaks
   */
  cleanupPreview(url: string): void {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }
}

export const mediaUploadService = new MediaUploadService();