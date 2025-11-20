/**
 * Unified Reports Service - Production Ready
 * Single atomic endpoint for all report submissions
 */

import { apiClient } from './apiClient';

export interface UnifiedReportSubmission {
  // Report data
  title: string;
  description: string;
  category: string;
  severity: string;
  latitude: number;
  longitude: number;
  address: string;
  landmark?: string;
  
  // Media files
  files: File[];
  
  // Metadata
  is_public?: boolean;
  is_sensitive?: boolean;
}

export interface SubmissionResult {
  id: number;
  report_number: string;
  user_id: number;
  department_id?: number;
  category: string;
  status: string;
  severity: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  address: string;
  landmark?: string;
  media_count: number;
  submission_type: string;
}

export interface SubmissionProgress {
  stage: 'preparing' | 'validating' | 'uploading' | 'processing' | 'complete';
  message: string;
  percentage?: number;
}

class UnifiedReportsService {
  /**
   * Submit complete report with atomic transaction
   * Single API call for report + media
   */
  async submitCompleteReport(
    data: UnifiedReportSubmission,
    onProgress?: (progress: SubmissionProgress) => void
  ): Promise<SubmissionResult> {
    try {
      // Stage 1: Preparation
      onProgress?.({
        stage: 'preparing',
        message: 'Preparing submission...',
        percentage: 0
      });

      // Validate data
      this.validateSubmissionData(data);

      // Stage 2: Validation
      onProgress?.({
        stage: 'validating',
        message: 'Validating report data...',
        percentage: 20
      });

      // Create FormData for multipart submission
      const formData = new FormData();

      // Add report fields
      formData.append('title', data.title.trim());
      formData.append('description', data.description.trim());
      formData.append('category', data.category);
      formData.append('severity', data.severity);
      formData.append('latitude', data.latitude.toString());
      formData.append('longitude', data.longitude.toString());
      formData.append('address', data.address.trim());
      formData.append('is_public', (data.is_public ?? true).toString());
      formData.append('is_sensitive', (data.is_sensitive ?? false).toString());

      if (data.landmark) {
        formData.append('landmark', data.landmark.trim());
      }

      // Add media files
      data.files.forEach((file, index) => {
        formData.append('files', file);
      });

      // Stage 3: Upload
      onProgress?.({
        stage: 'uploading',
        message: `Uploading report with ${data.files.length} file(s)...`,
        percentage: 40
      });

      // Submit to unified endpoint
      const response = await apiClient.post<SubmissionResult>(
        '/reports/submit-complete',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 120000, // 2 minute timeout for large files
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const uploadPercentage = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              onProgress?.({
                stage: 'uploading',
                message: `Uploading... ${uploadPercentage}%`,
                percentage: 40 + (uploadPercentage * 0.4) // 40-80%
              });
            }
          },
        }
      );

      // Stage 4: Processing
      onProgress?.({
        stage: 'processing',
        message: 'Processing submission...',
        percentage: 90
      });

      // Stage 5: Complete
      onProgress?.({
        stage: 'complete',
        message: 'Report submitted successfully!',
        percentage: 100
      });

      return response.data;

    } catch (error: any) {
      console.error('Unified submission failed:', error);
      
      // Enhanced error handling
      if (error.response?.status === 413) {
        throw new Error('Files are too large. Please reduce file sizes and try again.');
      } else if (error.response?.status === 422) {
        const validationErrors = error.response.data?.detail || [];
        const errorMessage = Array.isArray(validationErrors) 
          ? validationErrors.map((err: any) => err.msg || err.message).join(', ')
          : 'Validation failed. Please check your input.';
        throw new Error(errorMessage);
      } else if (error.response?.status === 429) {
        throw new Error('Too many submissions. Please wait before submitting again.');
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Upload timeout. Please check your connection and try again.');
      } else {
        throw new Error(
          error.response?.data?.message || 
          error.message || 
          'Failed to submit report. Please try again.'
        );
      }
    }
  }

  /**
   * Get submission limits and configuration
   */
  async getSubmissionLimits(): Promise<{
    limits: {
      max_files: number;
      max_images: number;
      max_audio: number;
      max_image_size_mb: number;
      max_audio_size_mb: number;
      max_title_length: number;
      max_description_length: number;
      rate_limit_reports_per_5min: number;
    };
    supported_formats: {
      images: string[];
      audio: string[];
    };
    validation_rules: any;
    processing: any;
  }> {
    const response = await apiClient.get('/reports/submission-limits');
    return response.data;
  }

  /**
   * Validate submission data before sending
   */
  private validateSubmissionData(data: UnifiedReportSubmission): void {
    // Title validation
    if (!data.title || data.title.trim().length < 5) {
      throw new Error('Title must be at least 5 characters long');
    }
    if (data.title.trim().length > 200) {
      throw new Error('Title cannot exceed 200 characters');
    }

    // Description validation
    if (!data.description || data.description.trim().length < 10) {
      throw new Error('Description must be at least 10 characters long');
    }
    if (data.description.trim().length > 2000) {
      throw new Error('Description cannot exceed 2000 characters');
    }

    // Category validation
    if (!data.category) {
      throw new Error('Category is required');
    }

    // Severity validation
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (!validSeverities.includes(data.severity)) {
      throw new Error(`Invalid severity. Must be one of: ${validSeverities.join(', ')}`);
    }

    // Coordinate validation
    if (data.latitude < -90 || data.latitude > 90) {
      throw new Error('Invalid latitude. Must be between -90 and 90');
    }
    if (data.longitude < -180 || data.longitude > 180) {
      throw new Error('Invalid longitude. Must be between -180 and 180');
    }

    // Address validation
    if (!data.address || data.address.trim().length < 5) {
      throw new Error('Address must be at least 5 characters long');
    }

    // Files validation
    if (!data.files || data.files.length === 0) {
      throw new Error('At least one photo is required');
    }
    if (data.files.length > 6) {
      throw new Error('Maximum 6 files allowed (5 images + 1 audio)');
    }

    // File type validation
    let imageCount = 0;
    let audioCount = 0;
    const maxImageSize = 10 * 1024 * 1024; // 10MB
    const maxAudioSize = 25 * 1024 * 1024; // 25MB

    for (const file of data.files) {
      const extension = file.name.toLowerCase().split('.').pop() || '';
      
      if (['jpg', 'jpeg', 'png', 'webp'].includes(extension)) {
        imageCount++;
        if (imageCount > 5) {
          throw new Error('Maximum 5 images allowed per report');
        }
        if (file.size > maxImageSize) {
          throw new Error(`Image "${file.name}" is too large. Maximum size is 10MB`);
        }
      } else if (['mp3', 'wav', 'm4a'].includes(extension)) {
        audioCount++;
        if (audioCount > 1) {
          throw new Error('Maximum 1 audio file allowed per report');
        }
        if (file.size > maxAudioSize) {
          throw new Error(`Audio file "${file.name}" is too large. Maximum size is 25MB`);
        }
      } else {
        throw new Error(
          `Unsupported file type "${extension}" in file "${file.name}". ` +
          'Supported: JPEG, PNG, WebP for images; MP3, WAV, M4A for audio'
        );
      }
    }
  }

  /**
   * Legacy methods for backward compatibility
   * These will be deprecated after migration
   */

  /**
   * @deprecated Use submitCompleteReport instead
   */
  async createReport(data: any): Promise<any> {
    console.warn('createReport is deprecated. Use submitCompleteReport instead.');
    
    // Convert to unified format and submit
    return this.submitCompleteReport({
      title: data.title,
      description: data.description,
      category: data.category,
      severity: data.severity,
      latitude: data.latitude,
      longitude: data.longitude,
      address: data.address,
      landmark: data.landmark,
      files: [], // No files in legacy method
      is_public: data.is_public,
      is_sensitive: data.is_sensitive,
    });
  }

  /**
   * @deprecated Media is now uploaded with the report
   */
  async uploadMedia(reportId: number, files: File[]): Promise<any> {
    console.warn('uploadMedia is deprecated. Media is now uploaded with the report.');
    throw new Error('Media upload is now integrated with report submission. Use submitCompleteReport instead.');
  }

  // Keep existing read methods unchanged
  async getMyReports(params?: any): Promise<any> {
    const response = await apiClient.get('/reports/my-reports', { params });
    return Array.isArray(response.data) ? response.data : [];
  }

  async getReportById(id: number): Promise<any> {
    const response = await apiClient.get(`/reports/${id}`);
    return response.data;
  }

  async getStatusHistory(id: number): Promise<any> {
    const response = await apiClient.get(`/reports/${id}/history`);
    return response.data;
  }

  async getReportStatusHistory(id: number): Promise<any> {
    return this.getStatusHistory(id);
  }

  async getReportMedia(reportId: number): Promise<any> {
    const response = await apiClient.get(`/media/report/${reportId}`);
    return response.data;
  }

  async deleteMedia(mediaId: number): Promise<void> {
    await apiClient.delete(`/media/${mediaId}`);
  }

  async getStats(): Promise<any> {
    const response = await apiClient.get('/analytics/stats');
    return response.data;
  }
}

export const unifiedReportsService = new UnifiedReportsService();
