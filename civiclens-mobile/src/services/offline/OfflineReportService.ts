/**
 * Sophisticated Offline-First Report Submission Service
 * 
 * This service provides:
 * - Robust offline queuing with persistent storage
 * - Intelligent retry mechanisms with exponential backoff
 * - Real-time user feedback and notifications
 * - Automatic sync when network is available
 * - Progress tracking and status updates
 * - Resilient error handling and recovery
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { EventEmitter } from 'events';
import { reportApi } from '@shared/services/api/reportApi';
import { ReportCreate } from '@shared/types/report';
import { createLogger } from '@shared/utils/logger';
import { Alert } from 'react-native';

// Simple notification helper
const showNotification = (options: { title: string; message: string; type: 'info' | 'success' | 'error' }) => {
  // For now, use Alert. In production, you'd use a proper notification library
  if (options.type === 'error') {
    Alert.alert(options.title, options.message);
  }
  // Success and info notifications can be silent or use a toast library
};

const log = createLogger('OfflineReportService');

// Submission Status Types
export enum SubmissionStatus {
  QUEUED = 'queued',
  UPLOADING = 'uploading',
  RETRYING = 'retrying',
  FAILED = 'failed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum FailureReason {
  NETWORK_ERROR = 'network_error',
  SERVER_ERROR = 'server_error',
  VALIDATION_ERROR = 'validation_error',
  FILE_TOO_LARGE = 'file_too_large',
  QUOTA_EXCEEDED = 'quota_exceeded',
  UNKNOWN_ERROR = 'unknown_error'
}

export interface QueuedSubmission {
  id: string;
  reportData: ReportCreate;
  mediaFiles: Array<{
    uri: string;
    type: string;
    name: string;
    size: number;
  }>;
  status: SubmissionStatus;
  createdAt: Date;
  updatedAt: Date;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Date;
  failureReason?: FailureReason;
  errorMessage?: string;
  progress: number; // 0-100
  estimatedSize: number;
}

export interface SubmissionProgress {
  submissionId: string;
  status: SubmissionStatus;
  progress: number;
  message: string;
  error?: string;
}

// Configuration
const CONFIG = {
  STORAGE_KEY: '@civiclens_submission_queue',
  MAX_RETRIES: 5,
  RETRY_DELAYS: [1000, 2000, 5000, 10000, 30000], // Exponential backoff
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_TOTAL_SIZE: 200 * 1024 * 1024, // 200MB
  SYNC_INTERVAL: 30000, // 30 seconds
  BATCH_SIZE: 3, // Process 3 submissions at once
};

class OfflineReportService extends EventEmitter {
  private queue: QueuedSubmission[] = [];
  private isProcessing = false;
  private syncInterval?: NodeJS.Timeout;
  private isOnline = false;

  constructor() {
    super();
    this.initialize();
  }

  private async initialize(): Promise<void> {
    log.info('Initializing OfflineReportService');
    
    // Load existing queue from storage
    await this.loadQueue();
    
    // Setup network monitoring
    this.setupNetworkMonitoring();
    
    // Start periodic sync
    this.startPeriodicSync();
    
    log.info(`Initialized with ${this.queue.length} queued submissions`);
  }

  private async loadQueue(): Promise<void> {
    try {
      const storedQueue = await AsyncStorage.getItem(CONFIG.STORAGE_KEY);
      if (storedQueue) {
        const parsed = JSON.parse(storedQueue);
        this.queue = parsed.map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
          nextRetryAt: item.nextRetryAt ? new Date(item.nextRetryAt) : undefined,
        }));
        log.info(`Loaded ${this.queue.length} submissions from storage`);
      }
    } catch (error) {
      log.error('Failed to load queue from storage', error);
      this.queue = [];
    }
  }

  private async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      log.error('Failed to save queue to storage', error);
    }
  }

  private setupNetworkMonitoring(): void {
    NetInfo.addEventListener((state: NetInfoState) => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected === true;
      
      log.info(`Network status changed: ${wasOnline ? 'online' : 'offline'} → ${this.isOnline ? 'online' : 'offline'}`);
      
      if (!wasOnline && this.isOnline) {
        // Just came online - start processing queue
        log.info('Network restored, processing queue');
        this.processQueue();
      }
    });
  }

  private startPeriodicSync(): void {
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.isProcessing) {
        this.processQueue();
      }
    }, CONFIG.SYNC_INTERVAL);
  }

  /**
   * Submit a report for offline-first processing
   */
  async submitReport(
    reportData: ReportCreate,
    mediaFiles: Array<{ uri: string; type: string; name: string; size: number }>
  ): Promise<string> {
    const submissionId = `submission_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Validate file sizes
    const totalSize = mediaFiles.reduce((sum, file) => sum + file.size, 0);
    const oversizedFiles = mediaFiles.filter(file => file.size > CONFIG.MAX_FILE_SIZE);
    
    if (oversizedFiles.length > 0) {
      throw new Error(`Files too large: ${oversizedFiles.map(f => f.name).join(', ')}. Max size: ${CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB`);
    }
    
    if (totalSize > CONFIG.MAX_TOTAL_SIZE) {
      throw new Error(`Total file size too large: ${totalSize / 1024 / 1024}MB. Max total: ${CONFIG.MAX_TOTAL_SIZE / 1024 / 1024}MB`);
    }

    const submission: QueuedSubmission = {
      id: submissionId,
      reportData,
      mediaFiles,
      status: SubmissionStatus.QUEUED,
      createdAt: new Date(),
      updatedAt: new Date(),
      retryCount: 0,
      maxRetries: CONFIG.MAX_RETRIES,
      progress: 0,
      estimatedSize: totalSize,
    };

    // Add to queue
    this.queue.push(submission);
    await this.saveQueue();

    log.info(`Report queued for submission: ${submissionId}`, {
      title: reportData.title,
      mediaCount: mediaFiles.length,
      totalSize: totalSize,
    });

    // Emit event for UI updates
    this.emit('submissionQueued', {
      submissionId,
      status: SubmissionStatus.QUEUED,
      progress: 0,
      message: 'Report queued for submission',
    } as SubmissionProgress);

    // Show user feedback
    showNotification({
      title: 'Report Queued',
      message: this.isOnline 
        ? 'Your report is being submitted...' 
        : 'Your report will be submitted when connection is restored',
      type: 'info',
    });

    // Start processing if online
    if (this.isOnline) {
      this.processQueue();
    }

    return submissionId;
  }

  /**
   * Process the submission queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || !this.isOnline) {
      return;
    }

    this.isProcessing = true;
    log.info('Starting queue processing');

    try {
      // Get submissions ready for processing
      const readySubmissions = this.queue
        .filter(sub => 
          sub.status === SubmissionStatus.QUEUED || 
          (sub.status === SubmissionStatus.RETRYING && 
           (!sub.nextRetryAt || sub.nextRetryAt <= new Date()))
        )
        .slice(0, CONFIG.BATCH_SIZE);

      if (readySubmissions.length === 0) {
        log.info('No submissions ready for processing');
        return;
      }

      log.info(`Processing ${readySubmissions.length} submissions`);

      // Process submissions in parallel (limited batch)
      await Promise.allSettled(
        readySubmissions.map(submission => this.processSubmission(submission))
      );

    } finally {
      this.isProcessing = false;
      await this.saveQueue();
    }
  }

  /**
   * Process a single submission
   */
  private async processSubmission(submission: QueuedSubmission): Promise<void> {
    const { id } = submission;
    
    try {
      log.info(`Processing submission: ${id}`);
      
      // Update status
      submission.status = SubmissionStatus.UPLOADING;
      submission.updatedAt = new Date();
      
      this.emit('submissionProgress', {
        submissionId: id,
        status: SubmissionStatus.UPLOADING,
        progress: 10,
        message: 'Uploading report...',
      } as SubmissionProgress);

      // Prepare form data
      const formData = new FormData();
      formData.append('title', submission.reportData.title);
      formData.append('description', submission.reportData.description);
      formData.append('category', submission.reportData.category);
      formData.append('severity', submission.reportData.severity);
      formData.append('latitude', submission.reportData.latitude.toString());
      formData.append('longitude', submission.reportData.longitude.toString());
      formData.append('address', submission.reportData.address);
      
      if (submission.reportData.landmark) {
        formData.append('landmark', submission.reportData.landmark);
      }
      
      formData.append('is_public', submission.reportData.is_public ? 'true' : 'false');
      formData.append('is_sensitive', submission.reportData.is_sensitive ? 'false' : 'true');

      // Add media files
      submission.mediaFiles.forEach((file) => {
        formData.append('files', {
          uri: file.uri,
          type: file.type,
          name: file.name,
        } as any);
      });

      // Update progress
      this.emit('submissionProgress', {
        submissionId: id,
        status: SubmissionStatus.UPLOADING,
        progress: 50,
        message: 'Submitting to server...',
      } as SubmissionProgress);

      // Submit to backend (use regular submit for now)
      const response = await reportApi.submitReport(submission.reportData);
      
      // Success!
      submission.status = SubmissionStatus.COMPLETED;
      submission.progress = 100;
      submission.updatedAt = new Date();
      
      log.info(`Submission completed successfully: ${id}`, { reportId: response.id });
      
      this.emit('submissionProgress', {
        submissionId: id,
        status: SubmissionStatus.COMPLETED,
        progress: 100,
        message: 'Report submitted successfully!',
      } as SubmissionProgress);

      // Show success notification
      showNotification({
        title: 'Report Submitted',
        message: `Your report "${submission.reportData.title}" has been submitted successfully`,
        type: 'success',
      });

      // Remove from queue after successful submission
      this.queue = this.queue.filter(s => s.id !== id);

    } catch (error: any) {
      log.error(`Submission failed: ${id}`, error);
      
      submission.retryCount++;
      submission.updatedAt = new Date();
      
      // Determine failure reason
      let failureReason = FailureReason.UNKNOWN_ERROR;
      let shouldRetry = true;
      
      if (error.code === 'NETWORK_ERROR' || !this.isOnline) {
        failureReason = FailureReason.NETWORK_ERROR;
      } else if (error.response?.status === 422) {
        failureReason = FailureReason.VALIDATION_ERROR;
        shouldRetry = false; // Don't retry validation errors
      } else if (error.response?.status === 413) {
        failureReason = FailureReason.FILE_TOO_LARGE;
        shouldRetry = false;
      } else if (error.response?.status >= 500) {
        failureReason = FailureReason.SERVER_ERROR;
      }
      
      submission.failureReason = failureReason;
      submission.errorMessage = error.message || 'Unknown error occurred';
      
      if (shouldRetry && submission.retryCount < submission.maxRetries) {
        // Schedule retry
        const delay = CONFIG.RETRY_DELAYS[Math.min(submission.retryCount - 1, CONFIG.RETRY_DELAYS.length - 1)];
        submission.status = SubmissionStatus.RETRYING;
        submission.nextRetryAt = new Date(Date.now() + delay);
        
        log.info(`Scheduling retry ${submission.retryCount}/${submission.maxRetries} for ${id} in ${delay}ms`);
        
        this.emit('submissionProgress', {
          submissionId: id,
          status: SubmissionStatus.RETRYING,
          progress: 0,
          message: `Retrying in ${Math.ceil(delay / 1000)} seconds... (${submission.retryCount}/${submission.maxRetries})`,
          error: submission.errorMessage,
        } as SubmissionProgress);
        
      } else {
        // Max retries reached or non-retryable error
        submission.status = SubmissionStatus.FAILED;
        
        log.error(`Submission permanently failed: ${id}`, {
          retryCount: submission.retryCount,
          failureReason,
          error: submission.errorMessage,
        });
        
        this.emit('submissionProgress', {
          submissionId: id,
          status: SubmissionStatus.FAILED,
          progress: 0,
          message: 'Submission failed',
          error: submission.errorMessage,
        } as SubmissionProgress);

        // Show failure notification
        showNotification({
          title: 'Submission Failed',
          message: `Failed to submit "${submission.reportData.title}". ${shouldRetry ? 'Max retries reached.' : 'Please check your report and try again.'}`,
          type: 'error',
        });
      }
    }
  }

  /**
   * Get all queued submissions
   */
  getQueuedSubmissions(): QueuedSubmission[] {
    return [...this.queue];
  }

  /**
   * Get submission by ID
   */
  getSubmission(id: string): QueuedSubmission | undefined {
    return this.queue.find(sub => sub.id === id);
  }

  /**
   * Cancel a queued submission
   */
  async cancelSubmission(id: string): Promise<boolean> {
    const submission = this.queue.find(sub => sub.id === id);
    if (!submission) {
      return false;
    }

    if (submission.status === SubmissionStatus.UPLOADING) {
      log.warn(`Cannot cancel submission in progress: ${id}`);
      return false;
    }

    submission.status = SubmissionStatus.CANCELLED;
    submission.updatedAt = new Date();
    
    // Remove from queue
    this.queue = this.queue.filter(s => s.id !== id);
    await this.saveQueue();
    
    log.info(`Submission cancelled: ${id}`);
    
    this.emit('submissionProgress', {
      submissionId: id,
      status: SubmissionStatus.CANCELLED,
      progress: 0,
      message: 'Submission cancelled',
    } as SubmissionProgress);

    return true;
  }

  /**
   * Retry a failed submission
   */
  async retrySubmission(id: string): Promise<boolean> {
    const submission = this.queue.find(sub => sub.id === id);
    if (!submission || submission.status !== SubmissionStatus.FAILED) {
      return false;
    }

    submission.status = SubmissionStatus.QUEUED;
    submission.retryCount = 0;
    submission.nextRetryAt = undefined;
    submission.failureReason = undefined;
    submission.errorMessage = undefined;
    submission.updatedAt = new Date();
    
    await this.saveQueue();
    
    log.info(`Submission queued for retry: ${id}`);
    
    if (this.isOnline) {
      this.processQueue();
    }

    return true;
  }

  /**
   * Clear completed submissions
   */
  async clearCompleted(): Promise<number> {
    const completedCount = this.queue.filter(sub => sub.status === SubmissionStatus.COMPLETED).length;
    this.queue = this.queue.filter(sub => sub.status !== SubmissionStatus.COMPLETED);
    await this.saveQueue();
    
    log.info(`Cleared ${completedCount} completed submissions`);
    return completedCount;
  }

  /**
   * Get queue statistics
   */
  getQueueStats() {
    const stats = {
      total: this.queue.length,
      queued: 0,
      uploading: 0,
      retrying: 0,
      failed: 0,
      completed: 0,
      cancelled: 0,
      totalSize: 0,
    };

    this.queue.forEach(sub => {
      stats[sub.status]++;
      stats.totalSize += sub.estimatedSize;
    });

    return stats;
  }

  /**
   * Force sync now
   */
  async forcSync(): Promise<void> {
    if (this.isOnline) {
      await this.processQueue();
    }
  }

  /**
   * Cleanup and shutdown
   */
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    this.removeAllListeners();
    log.info('OfflineReportService destroyed');
  }
}

// Singleton instance
export const offlineReportService = new OfflineReportService();
