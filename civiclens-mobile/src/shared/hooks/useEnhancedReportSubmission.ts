/**
 * Enhanced Report Submission Hook - Production Ready Offline-First
 * 
 * KEY IMPROVEMENTS:
 * 1. Backend health check (not just internet connectivity)
 * 2. Clear user messaging about submission mode
 * 3. Explicit prompts for offline mode
 * 4. Production-ready error handling
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { ReportCategory, ReportSeverity } from '@shared/types/report';
import { imageOptimizer } from '@shared/services/media/imageOptimizer';
import { useNetwork } from './useNetwork';
import { submissionQueue } from '@shared/services/queue/submissionQueue';
import { backendHealthCheck } from '@shared/services/network/backendHealthCheck';
import { createLogger } from '@shared/utils/logger';
import { apiClient } from '@shared/services/api/apiClient';

const log = createLogger('ReportSubmission');

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
  stage: 'preparing' | 'validating' | 'compressing' | 'checking_backend' | 'submitting' | 'uploading' | 'queued' | 'complete';
  message: string;
  percentage?: number;
}

export interface SubmissionResult {
  id: string | number;
  report_number?: string;
  offline: boolean;
  queueId?: string;
  backendUnavailable?: boolean;
}

export const useEnhancedReportSubmission = () => {
  const [progress, setProgress] = useState<SubmissionProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const { isOnline: hasInternet } = useNetwork();

  /**
   * Check if submission should go through online or offline mode
   */
  const checkSubmissionMode = useCallback(async (): Promise<'online' | 'offline' | 'backend_down'> => {
    // 1. Check internet connectivity first
    if (!hasInternet) {
      log.info('No internet connection - offline mode');
      return 'offline';
    }

    // 2. Check if backend is reachable
    setProgress({
      stage: 'checking_backend',
      message: 'Checking server connection...',
    });

    const healthCheck = await backendHealthCheck.checkHealth();
    
    if (!healthCheck.isBackendReachable) {
      log.warn(`Backend unreachable - offline mode (last checked: ${new Date(healthCheck.lastChecked).toISOString()})`);
      return 'backend_down';
    }

    log.info(`Backend healthy (${healthCheck.responseTime}ms) - online mode`);
    return 'online';
  }, [hasInternet]);

  /**
   * Submit report online
   */
  const submitOnline = async (
    reportData: CompleteReportData,
    compressedPhotos: CompressedImage[]
  ): Promise<SubmissionResult> => {
    setProgress({
      stage: 'submitting',
      message: 'Submitting to server...',
      percentage: 50,
    });

    try {
      const formData = new FormData();
      
      // Add report fields
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

      // Add compressed photos
      compressedPhotos.forEach((photo, index) => {
        formData.append('files', {
          uri: photo.uri,
          type: 'image/jpeg',
          name: `photo_${index}.jpg`,
        } as any);
      });

      setProgress({
        stage: 'uploading',
        message: 'Uploading report...',
        percentage: 75,
      });

      const response = await apiClient.post('/reports/submit-complete', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });

      const responseData = (response as any).data || response;

      log.info('✅ Online submission successful:', {
        reportId: responseData.id,
        reportNumber: responseData.report_number,
      });

      return {
        id: responseData.id,
        report_number: responseData.report_number,
        offline: false,
      };
    } catch (error: any) {
      // Enhance error messages for better user experience
      if (error.response?.status === 422) {
        const errorMessage = error.response?.data?.detail || error.message;
        throw new Error(`Validation error: ${errorMessage}`);
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        throw new Error('Upload timed out. The server took too long to respond.');
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        throw new Error('Network error. Could not reach the server.');
      }
      throw error;
    }
  };

  /**
   * Submit report offline (queue for later sync)
   */
  const submitOffline = async (
    reportData: CompleteReportData,
    compressedPhotos: CompressedImage[]
  ): Promise<SubmissionResult> => {
    setProgress({
      stage: 'queued',
      message: 'Saving report for offline sync...',
    });

    try {
      // Create local report
      const localReport = {
        id: `local_${Date.now()}`,
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
        is_synced: false,
        local_id: `local_${Date.now()}`,
        user_id: 1,
      };

      // Add to local store
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
        localReportId: localReport.id,
      });

      log.info('📥 Offline submission queued:', {
        localId: localReport.id,
        queueId: queueItem.id,
      });

      return {
        id: localReport.id,
        offline: true,
        queueId: queueItem.id,
      };
    } catch (error) {
      log.error('❌ Offline submission failed:', error);
      throw error;
    }
  };

  /**
   * Main submission function with offline-first logic
   */
  const submitComplete = useCallback(async (
    reportData: CompleteReportData
  ): Promise<SubmissionResult> => {
    if (loading) {
      throw new Error('Submission already in progress');
    }

    setLoading(true);
    setProgress({
      stage: 'preparing',
      message: 'Preparing submission...',
    });

    try {
      // 1. Validate data
      setProgress({
        stage: 'validating',
        message: 'Validating report data...',
      });
      
      // Basic validation
      if (!reportData.title || reportData.title.trim().length < 5) {
        throw new Error('Title must be at least 5 characters long');
      }
      if (!reportData.description || reportData.description.trim().length < 10) {
        throw new Error('Description must be at least 10 characters long');
      }

      // 2. Compress images
      setProgress({
        stage: 'compressing',
        message: 'Optimizing images...',
        percentage: 25,
      });

      const compressedPhotos: CompressedImage[] = [];
      for (let i = 0; i < reportData.photos.length; i++) {
        const photoUri = reportData.photos[i];
        const compressed = await imageOptimizer.compressImage(photoUri, {
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 0.8,
        });
        compressedPhotos.push(compressed);
      }

      const totalSize = compressedPhotos.reduce((sum, photo) => sum + photo.size, 0);
      log.info(`📸 Images compressed: ${compressedPhotos.length} files, ${(totalSize / 1024 / 1024).toFixed(2)}MB total`);

      // 3. Check submission mode (online vs offline)
      const mode = await checkSubmissionMode();

      let result: SubmissionResult;

      if (mode === 'online') {
        // ONLINE MODE - Try to submit immediately
        try {
          result = await submitOnline(reportData, compressedPhotos);
          setProgress({
            stage: 'complete',
            message: 'Report submitted successfully!',
            percentage: 100,
          });
          
        } catch (error) {
          log.warn('⚠️ Online submission failed, falling back to offline mode:', error);
          
          // Fallback to offline
          result = await submitOffline(reportData, compressedPhotos);
          result.backendUnavailable = true;
          
          setProgress({
            stage: 'queued',
            message: 'Saved offline. Will sync when connection is restored.',
          });
        }
        
      } else {
        // OFFLINE MODE or BACKEND DOWN - Queue for later
        result = await submitOffline(reportData, compressedPhotos);
        result.backendUnavailable = (mode === 'backend_down');
        
        const message = mode === 'backend_down'
          ? 'Server unavailable. Saved offline and will sync automatically when server is back.'
          : 'No internet connection. Saved offline and will sync when you\'re back online.';
          
        setProgress({
          stage: 'queued',
          message,
        });
        
        // Show explicit user notification for offline mode
        Alert.alert(
          '📱 Saved Offline',
          message + '\n\nYou can continue using the app normally. Your report is safe and will be submitted automatically.',
          [{ text: 'OK' }]
        );
      }

      return result;

    } catch (error: any) {
      log.error('❌ Submission failed:', error);
      setProgress(null);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [loading, hasInternet, checkSubmissionMode]);

  const reset = () => {
    setProgress(null);
    setLoading(false);
  };

  return {
    submitComplete,
    loading,
    progress,
    reset,
    hasInternet,
    isBackendHealthy: backendHealthCheck.isBackendHealthy(),
  };
};
