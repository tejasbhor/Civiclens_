// Production-Ready Media Validation Utilities for CivicLens
import { MediaFile, MediaValidationResult } from '@/types/media';

export interface ValidationConfig {
  maxImageSize: number;
  maxAudioSize: number;
  maxImages: number;
  maxAudio: number;
  allowedImageTypes: string[];
  allowedAudioTypes: string[];
  maxImageDimension: number;
  minImageDimension: number;
  maxAudioDuration: number;
  maxFileNameLength: number;
}

export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  maxImageSize: 10 * 1024 * 1024, // 10MB
  maxAudioSize: 25 * 1024 * 1024, // 25MB
  maxImages: 5,
  maxAudio: 1,
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
  allowedAudioTypes: ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a'],
  maxImageDimension: 4096,
  minImageDimension: 100,
  maxAudioDuration: 600, // 10 minutes
  maxFileNameLength: 255
};

export class MediaValidator {
  private config: ValidationConfig;

  constructor(config: Partial<ValidationConfig> = {}) {
    this.config = { ...DEFAULT_VALIDATION_CONFIG, ...config };
  }

  /**
   * Validate a single file
   */
  async validateFile(file: File, existingFiles: MediaFile[] = []): Promise<MediaValidationResult> {
    const warnings: string[] = [];
    
    try {
      // Basic file checks
      const basicValidation = this.validateBasicFile(file);
      if (!basicValidation.valid) {
        return basicValidation;
      }

      // Determine file type
      const fileType = this.determineFileType(file);
      if (!fileType) {
        return {
          valid: false,
          error: `Unsupported file type: ${file.type}`
        };
      }

      // Check quantity limits
      const quantityValidation = this.validateQuantityLimits(fileType, existingFiles);
      if (!quantityValidation.valid) {
        return quantityValidation;
      }

      // Size validation
      const sizeValidation = this.validateFileSize(file, fileType);
      if (!sizeValidation.valid) {
        return sizeValidation;
      }
      if (sizeValidation.warnings) {
        warnings.push(...sizeValidation.warnings);
      }

      // File name validation
      const nameValidation = this.validateFileName(file.name);
      if (!nameValidation.valid) {
        return nameValidation;
      }
      if (nameValidation.warnings) {
        warnings.push(...nameValidation.warnings);
      }

      // Content validation (async)
      const contentValidation = await this.validateFileContent(file, fileType);
      if (!contentValidation.valid) {
        return contentValidation;
      }
      if (contentValidation.warnings) {
        warnings.push(...contentValidation.warnings);
      }

      return {
        valid: true,
        type: fileType,
        warnings: warnings.length > 0 ? warnings : undefined
      };

    } catch (error) {
      console.error('File validation error:', error);
      return {
        valid: false,
        error: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Validate multiple files
   */
  async validateFiles(files: File[], existingFiles: MediaFile[] = []): Promise<{
    valid: MediaValidationResult[];
    invalid: { file: File; error: string }[];
    warnings: string[];
  }> {
    const valid: MediaValidationResult[] = [];
    const invalid: { file: File; error: string }[] = [];
    const allWarnings: string[] = [];

    // Check total file count
    const totalImages = existingFiles.filter(f => f.type === 'image').length + 
                       files.filter(f => this.determineFileType(f) === 'image').length;
    const totalAudio = existingFiles.filter(f => f.type === 'audio').length + 
                      files.filter(f => this.determineFileType(f) === 'audio').length;

    if (totalImages > this.config.maxImages) {
      return {
        valid: [],
        invalid: files.map(f => ({ file: f, error: `Too many images. Maximum ${this.config.maxImages} allowed.` })),
        warnings: []
      };
    }

    if (totalAudio > this.config.maxAudio) {
      return {
        valid: [],
        invalid: files.map(f => ({ file: f, error: `Too many audio files. Maximum ${this.config.maxAudio} allowed.` })),
        warnings: []
      };
    }

    // Validate each file
    for (const file of files) {
      const result = await this.validateFile(file, existingFiles);
      
      if (result.valid) {
        valid.push(result);
        if (result.warnings) {
          allWarnings.push(...result.warnings);
        }
      } else {
        invalid.push({ file, error: result.error || 'Validation failed' });
      }
    }

    return { valid, invalid, warnings: allWarnings };
  }

  /**
   * Basic file validation
   */
  private validateBasicFile(file: File): MediaValidationResult {
    if (!file) {
      return { valid: false, error: 'No file provided' };
    }

    if (file.size === 0) {
      return { valid: false, error: 'File is empty' };
    }

    if (!file.type) {
      return { valid: false, error: 'Unable to determine file type' };
    }

    return { valid: true };
  }

  /**
   * Determine file type (image or audio)
   */
  private determineFileType(file: File): 'image' | 'audio' | null {
    if (this.config.allowedImageTypes.includes(file.type)) {
      return 'image';
    }
    
    if (this.config.allowedAudioTypes.includes(file.type)) {
      return 'audio';
    }
    
    return null;
  }

  /**
   * Validate quantity limits
   */
  private validateQuantityLimits(fileType: 'image' | 'audio', existingFiles: MediaFile[]): MediaValidationResult {
    const existingOfType = existingFiles.filter(f => f.type === fileType);
    const maxCount = fileType === 'image' ? this.config.maxImages : this.config.maxAudio;
    
    if (existingOfType.length >= maxCount) {
      return {
        valid: false,
        error: `Maximum ${maxCount} ${fileType}${maxCount > 1 ? 's' : ''} allowed per report`
      };
    }

    return { valid: true };
  }

  /**
   * Validate file size
   */
  private validateFileSize(file: File, fileType: 'image' | 'audio'): MediaValidationResult {
    const maxSize = fileType === 'image' ? this.config.maxImageSize : this.config.maxAudioSize;
    const warnings: string[] = [];

    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File too large. Maximum size for ${fileType}s: ${this.formatFileSize(maxSize)}`
      };
    }

    // Warning for large files (80% of max size)
    const warningThreshold = maxSize * 0.8;
    if (file.size > warningThreshold) {
      warnings.push(`Large file size: ${this.formatFileSize(file.size)}. Consider compressing for faster upload.`);
    }

    return { 
      valid: true, 
      warnings: warnings.length > 0 ? warnings : undefined 
    };
  }

  /**
   * Validate file name
   */
  private validateFileName(fileName: string): MediaValidationResult {
    const warnings: string[] = [];

    if (!fileName || fileName.trim().length === 0) {
      return { valid: false, error: 'File name is required' };
    }

    // Check length
    if (fileName.length > this.config.maxFileNameLength) {
      return {
        valid: false,
        error: `File name too long. Maximum ${this.config.maxFileNameLength} characters allowed.`
      };
    }

    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (invalidChars.test(fileName)) {
      return {
        valid: false,
        error: 'File name contains invalid characters'
      };
    }

    // Check for reserved names (Windows)
    const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i;
    if (reservedNames.test(fileName)) {
      return {
        valid: false,
        error: 'File name uses a reserved system name'
      };
    }

    // Warnings
    if (fileName.length > 100) {
      warnings.push('Long file name may cause compatibility issues');
    }

    if (fileName.includes(' ')) {
      warnings.push('File name contains spaces which may cause issues in some systems');
    }

    return { 
      valid: true, 
      warnings: warnings.length > 0 ? warnings : undefined 
    };
  }

  /**
   * Validate file content (async)
   */
  private async validateFileContent(file: File, fileType: 'image' | 'audio'): Promise<MediaValidationResult> {
    if (fileType === 'image') {
      return this.validateImageContent(file);
    } else {
      return this.validateAudioContent(file);
    }
  }

  /**
   * Validate image content
   */
  private async validateImageContent(file: File): Promise<MediaValidationResult> {
    return new Promise((resolve) => {
      const img = new Image();
      const warnings: string[] = [];

      img.onload = () => {
        try {
          const { width, height } = img;

          // Check dimensions
          if (width < this.config.minImageDimension || height < this.config.minImageDimension) {
            resolve({
              valid: false,
              error: `Image too small. Minimum size: ${this.config.minImageDimension}x${this.config.minImageDimension} pixels`
            });
            return;
          }

          if (width > this.config.maxImageDimension || height > this.config.maxImageDimension) {
            warnings.push(`Large image dimensions: ${width}x${height}. Will be resized to fit ${this.config.maxImageDimension}x${this.config.maxImageDimension}`);
          }

          // Check aspect ratio
          const aspectRatio = width / height;
          if (aspectRatio > 10 || aspectRatio < 0.1) {
            warnings.push('Unusual aspect ratio detected. Image may not display properly.');
          }

          // Check for very small images that might be low quality
          if (width * height < 50000) { // Less than ~224x224
            warnings.push('Low resolution image detected. Consider using a higher quality image.');
          }

          resolve({
            valid: true,
            warnings: warnings.length > 0 ? warnings : undefined
          });

        } catch (error) {
          resolve({
            valid: false,
            error: 'Failed to analyze image properties'
          });
        } finally {
          URL.revokeObjectURL(img.src);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        resolve({
          valid: false,
          error: 'Invalid or corrupted image file'
        });
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Validate audio content
   */
  private async validateAudioContent(file: File): Promise<MediaValidationResult> {
    return new Promise((resolve) => {
      const audio = new Audio();
      const warnings: string[] = [];

      audio.onloadedmetadata = () => {
        try {
          const duration = audio.duration;

          // Check duration
          if (duration > this.config.maxAudioDuration) {
            resolve({
              valid: false,
              error: `Audio too long. Maximum duration: ${Math.floor(this.config.maxAudioDuration / 60)} minutes`
            });
            return;
          }

          // Warnings for very short or long audio
          if (duration < 1) {
            warnings.push('Very short audio file. Make sure it contains the intended content.');
          } else if (duration > 300) { // 5 minutes
            warnings.push('Long audio file. Consider keeping voice notes concise for better user experience.');
          }

          resolve({
            valid: true,
            warnings: warnings.length > 0 ? warnings : undefined
          });

        } catch (error) {
          resolve({
            valid: false,
            error: 'Failed to analyze audio properties'
          });
        } finally {
          URL.revokeObjectURL(audio.src);
        }
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audio.src);
        resolve({
          valid: false,
          error: 'Invalid or corrupted audio file'
        });
      };

      audio.src = URL.createObjectURL(file);
    });
  }

  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get security recommendations for file
   */
  getSecurityRecommendations(file: File): string[] {
    const recommendations: string[] = [];

    // Check for potentially dangerous file extensions in name
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com'];
    const fileName = file.name.toLowerCase();
    
    if (dangerousExtensions.some(ext => fileName.includes(ext))) {
      recommendations.push('File name contains potentially dangerous extension patterns');
    }

    // Check for suspicious MIME type mismatches
    const expectedExtensions = {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'audio/mpeg': ['.mp3'],
      'audio/wav': ['.wav'],
      'audio/mp4': ['.m4a']
    };

    const fileExtension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    const expectedExts = expectedExtensions[file.type as keyof typeof expectedExtensions];
    
    if (expectedExts && !expectedExts.includes(fileExtension)) {
      recommendations.push('File extension does not match MIME type - potential security risk');
    }

    return recommendations;
  }

  /**
   * Update validation configuration
   */
  updateConfig(newConfig: Partial<ValidationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): ValidationConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const mediaValidator = new MediaValidator();