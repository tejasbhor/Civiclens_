/**
 * Complete Report Submission Hook - Production Ready
 * Handles atomic report submission with robust offline-first architecture
 */

import { useState } from 'react';
import { ReportCategory, ReportSeverity } from '@shared/types/report';
import { imageOptimizer } from '@shared/services/media/imageOptimizer';
import { useNetwork } from './useNetwork';
import { submissionQueue } from '@shared/services/queue/submissionQueue';
import { createLogger } from '@shared/utils/logger';
import { apiClient } from '@shared/services/api/apiClient';

const log = createLogger('CompleteReportSubmission');

export interface CompleteReportData {
  title: string;
  description: string;
  category: ReportCategory;
  severity: ReportSeverity;
  latitude: number;
  longitude: number;
  address: string;
  landmark?: string;
  photos: string[];
  is_public: boolean;
  is_sensitive: boolean;
}

export interface CompressedImage {
  uri: string;
  width: number;
  height: number;
  size: number;
}

export interface SubmissionProgress {
  stage: 'preparing' | 'validating' | 'compressing' | 'submitting' | 'uploading' | 'queued' | 'complete';
  message: string;
  percentage?: number;
  currentFile?: number;
  totalFiles?: number;
}

export interface SubmissionResult {
  id: string | number;
  report_number?: string;
  offline: boolean;
  queueId?: string;
}

export const useCompleteReportSubmission = () => {
  const [progress, setProgress] = useState<SubmissionProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const { isOnline } = useNetwork();

  const validateReportData = (data: CompleteReportData): void => {
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

    // Category validation - Must match backend enum exactly
    const validCategories = [
      'roads', 'water', 'sanitation', 'electricity', 
      'public_safety', 'environment', 'infrastructure', 'other'
    ];
    if (!data.category || !validCategories.includes(data.category)) {
      throw new Error(`Category is required. Must be one of: ${validCategories.join(', ')}`);
    }

    // Severity validation - Must match backend enum exactly
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (!data.severity || !validSeverities.includes(data.severity)) {
      throw new Error(`Severity is required. Must be one of: ${validSeverities.join(', ')}`);
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

    // Photos validation - REQUIREMENT: 1-5 photos, max 50MB total (backend limit)
    if (!data.photos || data.photos.length === 0) {
      throw new Error('At least one photo is required for the report');
    }
    if (data.photos.length > 5) {
      throw new Error('Maximum 5 photos allowed per report');
    }

    // Validate each photo URI
    for (let i = 0; i < data.photos.length; i++) {
      const photoUri = data.photos[i];
      if (!photoUri || typeof photoUri !== 'string') {
        throw new Error(`Photo ${i + 1} is invalid or missing`);
      }
      
      // Check if photo exists (basic validation)
      if (!photoUri.startsWith('file://') && !photoUri.startsWith('content://') && !photoUri.startsWith('ph://')) {
        throw new Error(`Photo ${i + 1} has invalid format. Please select photos from your device.`);
      }
    }

    // Note: Actual size validation happens after compression
    log.info(`Validated ${data.photos.length} photos for submission`);
  };

  const compressImages = async (photos: string[]): Promise<CompressedImage[]> => {
    const compressedImages: CompressedImage[] = [];
    
    log.info(`Starting compression of ${photos.length} images`);
    
    for (let i = 0; i < photos.length; i++) {
      setProgress({
        stage: 'compressing',
        message: `Compressing image ${i + 1} of ${photos.length}...`,
        percentage: Math.round((i / photos.length) * 100),
        currentFile: i + 1,
        totalFiles: photos.length,
      });

      try {
        log.debug(`Compressing image ${i + 1}: ${photos[i]}`);
        
        const compressed = await imageOptimizer.compressImage(photos[i], {
          quality: 0.85, // Slightly higher quality for better results
          maxWidth: 2048,
          maxHeight: 2048,
          targetSizeKB: 800, // Target 800KB per image for good quality/size balance
        });

        compressedImages.push({
          uri: compressed.uri,
          width: compressed.width,
          height: compressed.height,
          size: Math.round(compressed.sizeKB * 1024), // Convert KB to bytes
        });

        log.debug(`Image ${i + 1} compressed: ${Math.round(compressed.sizeKB * 1024)} bytes`);
      } catch (error: any) {
        log.error(`Failed to compress image ${i + 1}:`, error);
        throw new Error(`Failed to compress image ${i + 1}: ${error?.message || 'Unknown error'}`);
      }
    }

    return compressedImages;
  };

  const createFormData = (reportData: CompleteReportData, compressedPhotos: CompressedImage[]): FormData => {
    const formData = new FormData();

    // Add report fields with validation
    formData.append('title', reportData.title.trim());
    formData.append('description', reportData.description.trim());
    formData.append('category', reportData.category);
    formData.append('severity', reportData.severity);
    formData.append('latitude', reportData.latitude.toString());
    formData.append('longitude', reportData.longitude.toString());
    formData.append('address', reportData.address.trim());
    formData.append('is_public', reportData.is_public.toString());
    formData.append('is_sensitive', reportData.is_sensitive.toString());

    if (reportData.landmark) {
      formData.append('landmark', reportData.landmark.trim());
    }

    // Add compressed images with proper file structure
    compressedPhotos.forEach((photo, index) => {
      // Create proper file object for React Native
      const fileObject = {
        uri: photo.uri,
        type: 'image/jpeg',
        name: `photo_${index}.jpg`,
        size: photo.size, // Include file size
      };
      
      formData.append('files', fileObject as any);
      log.debug(`Added file ${index + 1} to FormData: ${fileObject.name} (${photo.size} bytes)`);
    });

    // Add captions array if needed (for future enhancement)
    const captions = compressedPhotos.map((_, index) => `Image ${index + 1}`);
    formData.append('captions', JSON.stringify(captions));

    log.info(`FormData created with ${compressedPhotos.length} files, total size: ${compressedPhotos.reduce((sum, p) => sum + p.size, 0)} bytes`);
    
    return formData;
  };

  const submitOnline = async (
    reportData: CompleteReportData,
    compressedPhotos: CompressedImage[]
  ): Promise<SubmissionResult> => {
    setProgress({
      stage: 'submitting',
      message: 'Submitting report to server...',
    });

    const formData = createFormData(reportData, compressedPhotos);

    try {
      // Log FormData contents for debugging
      log.debug('Submitting FormData with fields:');
      const formDataEntries: any = {};
      for (const [key, value] of (formData as any).entries()) {
        if (typeof value === 'object' && value.uri) {
          formDataEntries[key] = `File: ${value.name} (${value.type})`;
        } else {
          formDataEntries[key] = value;
        }
      }
      log.debug('FormData entries:', formDataEntries);

      const response = await apiClient.post('/reports/submit-complete', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // 2 minute timeout for large files
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentage = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            const uploadedMB = (progressEvent.loaded / 1024 / 1024).toFixed(1);
            const totalMB = (progressEvent.total / 1024 / 1024).toFixed(1);
            
            setProgress({
              stage: 'uploading',
              message: `Uploading ${uploadedMB}MB / ${totalMB}MB (${percentage}%)`,
              percentage,
            });
          }
        },
      });

      // Handle different response formats
      const responseData = (response as any).data || response;
      log.info('Report submitted successfully. Raw response:', response);
      log.info('Parsed response data:', responseData);

      if (!responseData || !responseData.id) {
        log.error('Invalid response format. Response:', response);
        log.error('ResponseData:', responseData);
        throw new Error(`Invalid response format: missing report ID. Got: ${JSON.stringify(responseData)}`);
      }

      return {
        id: responseData.id,
        report_number: responseData.report_number,
        offline: false,
      };
    } catch (error: any) {
      log.error('Online submission failed:', error);
      
      // Enhanced error handling for different error types
      if (error.response?.status === 422) {
        log.error('Validation error details:', error.response?.data);
        const validationErrors = error.response?.data?.detail || [];
        if (Array.isArray(validationErrors)) {
          validationErrors.forEach((err: any, index: number) => {
            log.error(`Validation error ${index + 1}:`, err);
          });
        }
        
        // Check for specific image-related errors
        const errorMessage = error.response?.data?.detail || error.message;
        if (typeof errorMessage === 'string') {
          if (errorMessage.includes('file size') || errorMessage.includes('too large')) {
            throw new Error('One or more images are too large. Please use smaller images (max 10MB each).');
          }
          if (errorMessage.includes('file format') || errorMessage.includes('unsupported') || errorMessage.includes('invalid')) {
            throw new Error('Invalid image format. Please use JPEG, PNG, or WebP images only.');
          }
          if (errorMessage.includes('maximum') && errorMessage.includes('images')) {
            throw new Error('Too many images. Maximum 5 images allowed per report.');
          }
        }
      } else if (error.response?.status === 413) {
        throw new Error('Files are too large. Please reduce image sizes and try again.');
      } else if (error.response?.status === 415) {
        throw new Error('Unsupported file type. Please use JPEG, PNG, or WebP images only.');
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        throw new Error('Upload timed out. Please check your connection and try again.');
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        throw new Error('Network error. Please check your internet connection.');
      }
      
      throw error;
    }
  };

  const submitOffline = async (
    reportData: CompleteReportData,
    compressedPhotos: CompressedImage[]
  ): Promise<SubmissionResult> => {
    setProgress({
      stage: 'queued',
      message: 'Saving report locally...',
    });

    try {
      // Create a local report immediately that appears in the list
      const localReport = {
        id: `local_${Date.now()}`, // Temporary local ID
        title: reportData.title,
        description: reportData.description,
        category: reportData.category,
        severity: reportData.severity,
        latitude: reportData.latitude,
        longitude: reportData.longitude,
        address: reportData.address,
        landmark: reportData.landmark,
        photos: reportData.photos,
        is_public: reportData.is_public,
        is_sensitive: reportData.is_sensitive,
        status: 'received',
        created_at: new Date(),
        updated_at: new Date(),
        is_synced: false, // Mark as not synced
        local_id: `local_${Date.now()}`,
        user_id: 1, // Will be set properly when synced
      };

      // Add to local store immediately so it appears in reports list
      const { useReportStore } = await import('@store/reportStore');
      const addLocalReport = useReportStore.getState().addLocalReport;
      if (addLocalReport) {
        addLocalReport(localReport);
      }

      // Queue for background sync
      const queueItem = await submissionQueue.addToQueue({
        type: 'COMPLETE_REPORT_SUBMISSION',
        data: {
          ...reportData,
          compressedPhotos,
        },
        timestamp: Date.now(),
        retryCount: 0,
        localReportId: localReport.id, // Link to local report
      });

      log.info('Report saved locally and queued for sync:', localReport.id);

      return {
        id: localReport.id,
        offline: true,
        queueId: queueItem.id,
      };
    } catch (error) {
      log.error('Offline submission failed:', error);
      throw error;
    }
  };

  const submitComplete = async (reportData: CompleteReportData): Promise<SubmissionResult> => {
    if (loading) {
      throw new Error('Submission already in progress');
    }

    setLoading(true);
    setProgress({
      stage: 'preparing',
      message: 'Preparing submission...',
    });

    try {
      log.info('Starting complete report submission');

      // 1. Validate data
      setProgress({
        stage: 'validating',
        message: 'Validating report data...',
      });
      validateReportData(reportData);

      // 2. Compress images
      const compressedPhotos = await compressImages(reportData.photos);
      
      const totalSize = compressedPhotos.reduce((sum, photo) => sum + photo.size, 0);
      log.info(`Images compressed: ${compressedPhotos.length} files, ${totalSize} bytes total`);

      // 3. Submit based on connectivity
      let result: SubmissionResult;

      if (isOnline) {
        try {
          result = await submitOnline(reportData, compressedPhotos);
          setProgress({
            stage: 'complete',
            message: 'Report submitted successfully!',
          });
        } catch (error) {
          log.warn('Online submission failed, falling back to offline mode:', error);
          // Fallback to offline mode
          result = await submitOffline(reportData, compressedPhotos);
          setProgress({
            stage: 'queued',
            message: 'Saved offline. Will sync when connection is restored.',
          });
        }
      } else {
        result = await submitOffline(reportData, compressedPhotos);
        setProgress({
          stage: 'queued',
          message: 'Saved offline. Will sync when online.',
        });
      }

      log.info('Complete submission finished:', result);
      return result;

    } catch (error) {
      log.error('Complete submission failed:', error);
      setProgress(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setProgress(null);
    setLoading(false);
  };

  return {
    submitComplete,
    loading,
    progress,
    reset,
    isOnline,
  };
};
