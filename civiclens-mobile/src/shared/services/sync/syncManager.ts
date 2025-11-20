/**
 * Sync Manager
 * Handles offline queue management and automatic synchronization
 */

import { networkService } from '@shared/services/network/networkService';
import { database } from '@shared/database/database';
import { conflictResolver } from './conflictResolver';
import axios from 'axios';

export interface SyncQueueItem {
  id: number;
  item_type: 'report' | 'task' | 'media';
  operation: 'create' | 'update' | 'delete';
  data: string; // JSON stringified data
  retry_count: number;
  last_attempt: number | null;
  error: string | null;
  created_at: number;
}

export interface SyncStatus {
  isSyncing: boolean;
  queueSize: number;
  lastSyncTime: number | null;
  errors: string[];
}

class SyncManager {
  private isSyncing = false;
  private syncListeners: Set<(status: SyncStatus) => void> = new Set();
  private networkUnsubscribe: (() => void) | null = null;
  private lastSyncTime: number | null = null;
  private syncErrors: string[] = [];

  // Exponential backoff configuration
  private readonly MAX_RETRY_COUNT = 5;
  private readonly BASE_DELAY_MS = 1000; // 1 second
  private readonly MAX_DELAY_MS = 30000; // 30 seconds

  /**
   * Initialize sync manager and start listening to network changes
   */
  async initialize(): Promise<void> {
    console.log('🔄 Initializing Sync Manager...');

    // Listen to network changes
    this.networkUnsubscribe = networkService.addListener((status) => {
      if (status.isConnected && status.isInternetReachable && !this.isSyncing) {
        console.log('📡 Network restored, starting sync...');
        this.syncAllData();
      }
    });

    // Perform initial sync if online
    if (networkService.isOnline()) {
      await this.syncAllData();
    }

    console.log('✅ Sync Manager initialized');
  }

  /**
   * Add a listener for sync status changes
   */
  addListener(listener: (status: SyncStatus) => void): () => void {
    this.syncListeners.add(listener);
    return () => {
      this.syncListeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of sync status change
   */
  private notifyListeners(): void {
    const status = this.getStatus();
    this.syncListeners.forEach((listener) => {
      try {
        listener(status);
      } catch (error) {
        console.error('Error in sync listener:', error);
      }
    });
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncStatus {
    return {
      isSyncing: this.isSyncing,
      queueSize: 0, // Will be updated by getQueueSize()
      lastSyncTime: this.lastSyncTime,
      errors: [...this.syncErrors],
    };
  }

  /**
   * Get the size of the sync queue
   * Returns 0 if database is not ready
   */
  async getQueueSize(): Promise<number> {
    // Check if database is ready before querying
    if (!database.isReady()) {
      return 0;
    }

    try {
      const result = await database.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM sync_queue'
      );
      return result?.count || 0;
    } catch (error) {
      console.error('Error getting queue size:', error);
      return 0;
    }
  }

  /**
   * Sync all pending data
   */
  async syncAllData(): Promise<void> {
    if (this.isSyncing) {
      console.log('⏳ Sync already in progress, skipping...');
      return;
    }

    if (!networkService.isOnline()) {
      console.log('📡 Device is offline, skipping sync');
      return;
    }

    this.isSyncing = true;
    this.syncErrors = [];
    this.notifyListeners();

    try {
      console.log('🔄 Starting sync...');

      // Sync in order: Reports → Tasks → Media
      await this.syncReports();
      await this.syncTasks();
      await this.syncQueue();

      this.lastSyncTime = Date.now();
      console.log('✅ Sync completed successfully');
    } catch (error) {
      console.error('❌ Sync failed:', error);
      this.syncErrors.push(error instanceof Error ? error.message : 'Unknown sync error');
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }
  }

  /**
   * Sync unsynced reports
   */
  private async syncReports(): Promise<void> {
    try {
      const unsyncedReports = await database.getAllAsync<any>(
        'SELECT * FROM reports WHERE is_synced = 0 ORDER BY created_at ASC'
      );

      console.log(`📊 Found ${unsyncedReports.length} unsynced reports`);

      for (const report of unsyncedReports) {
        await this.syncReport(report);
      }
    } catch (error) {
      console.error('Error syncing reports:', error);
      throw error;
    }
  }

  /**
   * Sync a single report
   */
  private async syncReport(report: any): Promise<void> {
    try {
      // Check for duplicates before syncing
      const duplicateCheck = await conflictResolver.detectDuplicateReport(report);
      
      if (duplicateCheck.isDuplicate && duplicateCheck.duplicateId) {
        console.log(`⚠️ Report ${report.id} is a duplicate of ${duplicateCheck.duplicateId}`);
        await conflictResolver.markReportAsDuplicate(report.id, duplicateCheck.duplicateId);
        return;
      }

      // Parse photos array
      const photos = JSON.parse(report.photos || '[]');

      const payload = {
        title: report.title,
        description: report.description,
        category: report.category,
        sub_category: report.sub_category,
        severity: report.severity,
        latitude: report.latitude,
        longitude: report.longitude,
        address: report.address,
        landmark: report.landmark,
        ward_number: report.ward_number,
        is_public: report.is_public === 1,
        is_sensitive: report.is_sensitive === 1,
        photos,
      };

      // Make API call (will be implemented with actual API client)
      // const response = await apiClient.post('/reports/', payload);
      
      // If there's a conflict (409 status), resolve it
      // if (error.response?.status === 409) {
      //   const serverReport = error.response.data;
      //   const resolution = await conflictResolver.resolveReportConflict(report, serverReport);
      //   
      //   if (resolution.action === 'keep_local') {
      //     // Retry sync with force flag
      //     return await this.syncReport(report);
      //   }
      //   return;
      // }

      // For now, mark as synced (will be updated when API is integrated)
      await database.runAsync(
        'UPDATE reports SET is_synced = 1, sync_error = NULL, updated_at = ? WHERE id = ?',
        [Date.now(), report.id]
      );

      console.log(`✅ Synced report: ${report.local_id || report.id}`);
    } catch (error) {
      console.error(`❌ Failed to sync report ${report.id}:`, error);

      // Update error status
      await database.runAsync(
        'UPDATE reports SET sync_error = ?, updated_at = ? WHERE id = ?',
        [error instanceof Error ? error.message : 'Sync failed', Date.now(), report.id]
      );

      throw error;
    }
  }

  /**
   * Sync unsynced tasks
   */
  private async syncTasks(): Promise<void> {
    try {
      const unsyncedTasks = await database.getAllAsync<any>(
        'SELECT * FROM tasks WHERE is_synced = 0 ORDER BY created_at ASC'
      );

      console.log(`📋 Found ${unsyncedTasks.length} unsynced tasks`);

      for (const task of unsyncedTasks) {
        await this.syncTask(task);
      }
    } catch (error) {
      console.error('Error syncing tasks:', error);
      throw error;
    }
  }

  /**
   * Sync a single task
   */
  private async syncTask(task: any): Promise<void> {
    try {
      const payload = this.getTaskSyncPayload(task);

      // Make API call (will be implemented with actual API client)
      // const endpoint = this.getTaskSyncEndpoint(task);
      // const response = await apiClient.put(endpoint, payload);
      
      // If there's a conflict (409 status), resolve it
      // if (error.response?.status === 409) {
      //   const serverTask = error.response.data;
      //   const resolution = await conflictResolver.resolveTaskConflict(task, serverTask);
      //   
      //   if (resolution.action === 'keep_local') {
      //     // Retry sync with force flag
      //     return await this.syncTask(task);
      //   }
      //   return;
      // }

      // For now, mark as synced
      await database.runAsync(
        'UPDATE tasks SET is_synced = 1, pending_sync = NULL, updated_at = ? WHERE id = ?',
        [Date.now(), task.id]
      );

      console.log(`✅ Synced task: ${task.id}`);
    } catch (error) {
      console.error(`❌ Failed to sync task ${task.id}:`, error);
      throw error;
    }
  }

  /**
   * Get task sync endpoint based on pending sync type
   */
  private getTaskSyncEndpoint(task: any): string {
    switch (task.pending_sync) {
      case 'status':
        return `/tasks/${task.id}/${task.status}`;
      case 'completion':
        return `/tasks/${task.id}/complete`;
      default:
        return `/tasks/${task.id}/update`;
    }
  }

  /**
   * Get task sync payload based on pending sync type
   */
  private getTaskSyncPayload(task: any): any {
    const beforePhotos = JSON.parse(task.before_photos || '[]');
    const afterPhotos = JSON.parse(task.after_photos || '[]');

    switch (task.pending_sync) {
      case 'completion':
        return {
          after_photos: afterPhotos,
          resolution_notes: task.resolution_notes,
        };
      case 'status':
        return {
          status: task.status,
          notes: task.notes,
        };
      default:
        return {
          status: task.status,
          notes: task.notes,
          before_photos: beforePhotos,
          after_photos: afterPhotos,
        };
    }
  }

  /**
   * Process sync queue with exponential backoff retry
   */
  private async syncQueue(): Promise<void> {
    try {
      const queueItems = await database.getAllAsync<SyncQueueItem>(
        'SELECT * FROM sync_queue WHERE retry_count < ? ORDER BY created_at ASC',
        [this.MAX_RETRY_COUNT]
      );

      console.log(`📦 Found ${queueItems.length} items in sync queue`);

      for (const item of queueItems) {
        await this.processSyncQueueItem(item);
      }

      // Clean up successfully synced items
      await this.cleanupSyncQueue();
    } catch (error) {
      console.error('Error processing sync queue:', error);
      throw error;
    }
  }

  /**
   * Process a single sync queue item with retry logic
   */
  private async processSyncQueueItem(item: SyncQueueItem): Promise<void> {
    try {
      // Check if we should retry based on exponential backoff
      if (item.last_attempt) {
        const delay = this.calculateRetryDelay(item.retry_count);
        const timeSinceLastAttempt = Date.now() - item.last_attempt;

        if (timeSinceLastAttempt < delay) {
          console.log(`⏳ Skipping item ${item.id}, waiting for retry delay`);
          return;
        }
      }

      console.log(`🔄 Processing sync queue item ${item.id} (attempt ${item.retry_count + 1})`);

      // Parse data
      const data = JSON.parse(item.data);

      // Process based on item type and operation
      await this.processSyncOperation(item.item_type, item.operation, data);

      // Remove from queue on success
      await database.runAsync('DELETE FROM sync_queue WHERE id = ?', [item.id]);

      console.log(`✅ Successfully processed sync queue item ${item.id}`);
    } catch (error) {
      console.error(`❌ Failed to process sync queue item ${item.id}:`, error);

      // Update retry count and error
      await database.runAsync(
        'UPDATE sync_queue SET retry_count = retry_count + 1, last_attempt = ?, error = ? WHERE id = ?',
        [Date.now(), error instanceof Error ? error.message : 'Unknown error', item.id]
      );

      // If max retries reached, log error
      if (item.retry_count + 1 >= this.MAX_RETRY_COUNT) {
        console.error(`❌ Max retries reached for sync queue item ${item.id}`);
        this.syncErrors.push(`Failed to sync ${item.item_type} after ${this.MAX_RETRY_COUNT} attempts`);
      }
    }
  }

  /**
   * Process sync operation based on type
   */
  private async processSyncOperation(
    itemType: string,
    operation: string,
    data: any
  ): Promise<void> {
    // This will be implemented when API client is integrated
    console.log(`Processing ${operation} for ${itemType}:`, data);
    
    // Placeholder for actual API calls
    // switch (itemType) {
    //   case 'report':
    //     await this.syncReportOperation(operation, data);
    //     break;
    //   case 'task':
    //     await this.syncTaskOperation(operation, data);
    //     break;
    //   case 'media':
    //     await this.syncMediaOperation(operation, data);
    //     break;
    // }
  }

  /**
   * Calculate retry delay using exponential backoff
   */
  private calculateRetryDelay(retryCount: number): number {
    const delay = Math.min(
      this.BASE_DELAY_MS * Math.pow(2, retryCount),
      this.MAX_DELAY_MS
    );
    return delay;
  }

  /**
   * Add item to sync queue
   */
  async addToQueue(
    itemType: 'report' | 'task' | 'media',
    operation: 'create' | 'update' | 'delete',
    data: any
  ): Promise<void> {
    try {
      await database.runAsync(
        `INSERT INTO sync_queue (item_type, operation, data, retry_count, created_at)
         VALUES (?, ?, ?, 0, ?)`,
        [itemType, operation, JSON.stringify(data), Date.now()]
      );

      console.log(`📦 Added ${itemType} to sync queue`);

      // Trigger sync if online
      if (networkService.isOnline() && !this.isSyncing) {
        this.syncAllData();
      }
    } catch (error) {
      console.error('Error adding to sync queue:', error);
      throw error;
    }
  }

  /**
   * Clean up old sync queue items
   */
  private async cleanupSyncQueue(): Promise<void> {
    try {
      // Remove items older than 90 days that have reached max retries
      const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
      
      await database.runAsync(
        'DELETE FROM sync_queue WHERE created_at < ? AND retry_count >= ?',
        [ninetyDaysAgo, this.MAX_RETRY_COUNT]
      );

      console.log('🧹 Cleaned up old sync queue items');
    } catch (error) {
      console.error('Error cleaning up sync queue:', error);
    }
  }

  /**
   * Clear all items from sync queue
   */
  async clearQueue(): Promise<void> {
    try {
      await database.runAsync('DELETE FROM sync_queue');
      console.log('🧹 Cleared sync queue');
      this.notifyListeners();
    } catch (error) {
      console.error('Error clearing sync queue:', error);
      throw error;
    }
  }

  /**
   * Retry a specific failed sync item
   */
  async retryFailedSync(itemId: number): Promise<void> {
    try {
      const item = await database.getFirstAsync<SyncQueueItem>(
        'SELECT * FROM sync_queue WHERE id = ?',
        [itemId]
      );

      if (!item) {
        throw new Error(`Sync queue item ${itemId} not found`);
      }

      // Reset retry count and attempt sync
      await database.runAsync(
        'UPDATE sync_queue SET retry_count = 0, last_attempt = NULL, error = NULL WHERE id = ?',
        [itemId]
      );

      await this.processSyncQueueItem(item);
    } catch (error) {
      console.error(`Error retrying sync item ${itemId}:`, error);
      throw error;
    }
  }

  /**
   * Clean up sync manager
   */
  cleanup(): void {
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
      this.networkUnsubscribe = null;
    }
    this.syncListeners.clear();
    console.log('✅ Sync Manager cleaned up');
  }
}

// Export singleton instance
export const syncManager = new SyncManager();
