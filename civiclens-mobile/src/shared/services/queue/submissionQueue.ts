/**
 * Submission Queue Service - Production Ready
 * Handles offline report submission queue with robust retry logic
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { networkService } from '@shared/services/network/networkService';
import { apiClient } from '@shared/services/api/apiClient';
import { createLogger } from '@shared/utils/logger';
import { CompleteReportData, CompressedImage } from '@shared/hooks/useCompleteReportSubmission';

const log = createLogger('SubmissionQueue');

export interface QueueItem {
  id: string;
  type: 'COMPLETE_REPORT_SUBMISSION';
  data: CompleteReportData & { compressedPhotos: CompressedImage[] };
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  lastAttempt?: number;
  localReportId?: string; // Link to local report in store
}

export interface QueueStatus {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
}

class SubmissionQueue {
  private queue: QueueItem[] = [];
  private isProcessing = false;
  private retryDelays = [1000, 2000, 5000, 10000, 30000]; // Progressive delays in ms
  private storageKey = 'submission_queue';
  private listeners: Array<(status: QueueStatus) => void> = [];
  private processInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize the queue system
   */
  async initialize(): Promise<void> {
    try {
      log.info('Initializing submission queue');
      
      // Load existing queue from storage
      await this.loadFromStorage();
      
      // Listen for network changes
      networkService.addListener((status) => {
        if (status.isConnected && status.isInternetReachable !== false) {
          log.info('Network restored, processing queue');
          this.processQueue();
        }
      });

      // Start periodic processing
      this.startPeriodicProcessing();
      
      // Process queue if online
      if (networkService.isOnline()) {
        this.processQueue();
      }

      log.info(`Queue initialized with ${this.queue.length} items`);
    } catch (error) {
      log.error('Failed to initialize queue:', error);
    }
  }

  /**
   * Add item to submission queue
   */
  async addToQueue(item: Omit<QueueItem, 'id' | 'status' | 'maxRetries'>): Promise<QueueItem> {
    const queueItem: QueueItem = {
      ...item,
      id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending',
      maxRetries: 5,
    };

    log.info(`Adding item to queue: ${queueItem.id}`);

    // Add to memory queue
    this.queue.push(queueItem);

    // Save to storage
    await this.saveToStorage();

    // Notify listeners
    this.notifyListeners();

    // Try to process immediately if online
    if (networkService.isOnline()) {
      setTimeout(() => this.processQueue(), 100);
    }

    return queueItem;
  }

  /**
   * Process all pending items in the queue
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing || !networkService.isOnline()) {
      return;
    }

    this.isProcessing = true;
    log.info('Starting queue processing');

    try {
      const pendingItems = this.queue.filter(item => 
        item.status === 'pending' && this.shouldRetryItem(item)
      );

      log.info(`Processing ${pendingItems.length} pending items`);

      for (const item of pendingItems) {
        try {
          await this.processItem(item);
        } catch (error) {
          await this.handleItemError(item, error);
        }
      }

      // Clean up completed items older than 24 hours
      await this.cleanupOldItems();

    } finally {
      this.isProcessing = false;
      log.info('Queue processing finished');
    }
  }

  /**
   * Process a single queue item
   */
  private async processItem(item: QueueItem): Promise<void> {
    log.info(`Processing item: ${item.id}`);

    item.status = 'processing';
    item.lastAttempt = Date.now();
    await this.updateItem(item);

    try {
      // Create FormData for submission
      const formData = new FormData();
      
      // Add report fields
      const reportData = item.data;
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
      reportData.compressedPhotos.forEach((photo, index) => {
        formData.append('files', {
          uri: photo.uri,
          type: 'image/jpeg',
          name: `photo_${index}.jpg`,
        } as any);
      });

      // Submit to backend
      const response = await apiClient.post('/reports/submit-complete', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000, // 60 second timeout
      });

      // Handle different response formats
      const responseData = (response as any).data || response;
      
      // Success
      item.status = 'completed';
      item.error = undefined;
      await this.updateItem(item);

      log.info(`Item processed successfully: ${item.id} -> Report ${responseData?.id}`);

      // Update local report with server data if we have a localReportId
      if (item.localReportId && responseData?.id) {
        try {
          const { useReportStore } = await import('@store/reportStore');
          const updateLocalReport = useReportStore.getState().updateLocalReport;
          if (updateLocalReport) {
            updateLocalReport(item.localReportId, {
              id: responseData.id,
              report_number: responseData.report_number,
              is_synced: true,
            });
          }
        } catch (error) {
          log.error('Failed to update local report:', error);
        }
      }

      // Notify success
      await this.notifySuccess(item, responseData);

    } catch (error) {
      throw error; // Will be handled by handleItemError
    }
  }

  /**
   * Handle processing error for an item
   */
  private async handleItemError(item: QueueItem, error: any): Promise<void> {
    item.retryCount++;
    item.error = error?.message || 'Unknown error';
    item.lastAttempt = Date.now();

    log.error(`Item processing failed: ${item.id}, retry ${item.retryCount}/${item.maxRetries}`, error);

    if (item.retryCount >= item.maxRetries) {
      // Max retries exceeded
      item.status = 'failed';
      await this.updateItem(item);
      await this.notifyFailure(item);
      log.error(`Item failed permanently: ${item.id}`);
    } else {
      // Schedule retry
      item.status = 'pending';
      await this.updateItem(item);

      const delay = this.retryDelays[item.retryCount - 1] || 30000;
      log.info(`Scheduling retry for ${item.id} in ${delay}ms`);

      setTimeout(() => {
        if (networkService.isOnline()) {
          this.processQueue();
        }
      }, delay);
    }
  }

  /**
   * Check if item should be retried based on last attempt time
   */
  private shouldRetryItem(item: QueueItem): boolean {
    if (!item.lastAttempt) {
      return true; // Never attempted
    }

    const delay = this.retryDelays[item.retryCount] || 30000;
    const timeSinceLastAttempt = Date.now() - item.lastAttempt;
    
    return timeSinceLastAttempt >= delay;
  }

  /**
   * Update item in queue and storage
   */
  private async updateItem(item: QueueItem): Promise<void> {
    const index = this.queue.findIndex(q => q.id === item.id);
    if (index >= 0) {
      this.queue[index] = item;
      await this.saveToStorage();
      this.notifyListeners();
    }
  }

  /**
   * Get current queue status
   */
  getQueueStatus(): QueueStatus {
    const pending = this.queue.filter(item => item.status === 'pending').length;
    const processing = this.queue.filter(item => item.status === 'processing').length;
    const completed = this.queue.filter(item => item.status === 'completed').length;
    const failed = this.queue.filter(item => item.status === 'failed').length;

    return {
      pending,
      processing,
      completed,
      failed,
      total: this.queue.length,
    };
  }

  /**
   * Get all queue items (for debugging/admin)
   */
  getQueueItems(): QueueItem[] {
    return [...this.queue];
  }

  /**
   * Retry failed items
   */
  async retryFailedItems(): Promise<void> {
    log.info('Retrying all failed items');
    
    const failedItems = this.queue.filter(item => item.status === 'failed');
    
    for (const item of failedItems) {
      item.status = 'pending';
      item.retryCount = 0;
      item.error = undefined;
      item.lastAttempt = undefined;
    }

    await this.saveToStorage();
    this.notifyListeners();

    if (networkService.isOnline()) {
      this.processQueue();
    }
  }

  /**
   * Clear completed items
   */
  async clearCompleted(): Promise<void> {
    log.info('Clearing completed items');
    
    this.queue = this.queue.filter(item => item.status !== 'completed');
    await this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Add status listener
   */
  addListener(listener: (status: QueueStatus) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove status listener
   */
  removeListener(listener: (status: QueueStatus) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index >= 0) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Notify all listeners of status change
   */
  private notifyListeners(): void {
    const status = this.getQueueStatus();
    this.listeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        log.error('Listener error:', error);
      }
    });
  }

  /**
   * Save queue to AsyncStorage
   */
  private async saveToStorage(): Promise<void> {
    try {
      const serialized = JSON.stringify(this.queue);
      await AsyncStorage.setItem(this.storageKey, serialized);
    } catch (error) {
      log.error('Failed to save queue to storage:', error);
    }
  }

  /**
   * Load queue from AsyncStorage
   */
  private async loadFromStorage(): Promise<void> {
    try {
      const serialized = await AsyncStorage.getItem(this.storageKey);
      if (serialized) {
        this.queue = JSON.parse(serialized);
        
        // Reset processing items to pending (in case app crashed)
        this.queue.forEach(item => {
          if (item.status === 'processing') {
            item.status = 'pending';
          }
        });
        
        log.info(`Loaded ${this.queue.length} items from storage`);
      }
    } catch (error) {
      log.error('Failed to load queue from storage:', error);
      this.queue = [];
    }
  }

  /**
   * Clean up old completed items
   */
  private async cleanupOldItems(): Promise<void> {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const initialCount = this.queue.length;
    
    this.queue = this.queue.filter(item => {
      if (item.status === 'completed' && item.timestamp < oneDayAgo) {
        return false; // Remove old completed items
      }
      return true;
    });

    if (this.queue.length < initialCount) {
      log.info(`Cleaned up ${initialCount - this.queue.length} old items`);
      await this.saveToStorage();
      this.notifyListeners();
    }
  }

  /**
   * Start periodic processing
   */
  private startPeriodicProcessing(): void {
    // Process queue every 30 seconds
    this.processInterval = setInterval(() => {
      if (networkService.isOnline() && this.getQueueStatus().pending > 0) {
        this.processQueue();
      }
    }, 30000);
  }

  /**
   * Stop periodic processing
   */
  private stopPeriodicProcessing(): void {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
  }

  /**
   * Notify user of successful submission
   */
  private async notifySuccess(item: QueueItem, response: any): Promise<void> {
    // Could integrate with notification service here
    log.info(`Submission successful: ${item.data.title} -> Report #${response?.report_number}`);
  }

  /**
   * Notify user of permanent failure
   */
  private async notifyFailure(item: QueueItem): Promise<void> {
    // Could integrate with notification service here
    log.error(`Submission failed permanently: ${item.data.title} - ${item.error}`);
  }

  /**
   * Cleanup on app shutdown
   */
  async cleanup(): Promise<void> {
    this.stopPeriodicProcessing();
    await this.saveToStorage();
    log.info('Submission queue cleanup complete');
  }
}

// Export singleton instance
export const submissionQueue = new SubmissionQueue();
