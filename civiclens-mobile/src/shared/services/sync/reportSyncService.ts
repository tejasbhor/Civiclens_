/**
 * Report Sync Service
 * Handles automatic synchronization of offline reports when connectivity is restored
 * Includes photo upload and error handling with exponential backoff
 */

import { database } from '@shared/database';
import { reportApi } from '../api/reportApi';
import { mediaUpload } from '../media/mediaUpload';
import { networkService } from '../network/networkService';

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors: Array<{ localId: string; error: string }>;
}

class ReportSyncService {
  private isSyncing = false;
  private syncQueue: Set<string> = new Set();
  private retryDelays = [1000, 2000, 4000, 8000, 16000]; // Exponential backoff
  private maxRetries = 5;

  /**
   * Initialize sync service and listen for network changes
   */
  initialize() {
    // Listen for network connectivity changes
    networkService.addListener((status) => {
      if (status.isConnected && status.isInternetReachable !== false) {
        // Network restored - trigger sync
        this.syncAllReports().catch(console.error);
      }
    });
  }

  /**
   * Sync all unsynced reports
   */
  async syncAllReports(): Promise<SyncResult> {
    if (this.isSyncing) {
      console.log('Sync already in progress');
      return {
        success: false,
        syncedCount: 0,
        failedCount: 0,
        errors: [{ localId: '', error: 'Sync already in progress' }],
      };
    }

    try {
      this.isSyncing = true;

      const db = await database.getDatabase();
      const unsyncedReports = await db.getAllAsync<any>(
        'SELECT * FROM reports WHERE is_synced = 0 ORDER BY created_at ASC'
      );

      if (unsyncedReports.length === 0) {
        console.log('No reports to sync');
        return {
          success: true,
          syncedCount: 0,
          failedCount: 0,
          errors: [],
        };
      }

      console.log(`Starting sync for ${unsyncedReports.length} reports`);

      let syncedCount = 0;
      let failedCount = 0;
      const errors: Array<{ localId: string; error: string }> = [];

      for (const dbReport of unsyncedReports) {
        try {
          await this.syncSingleReport(dbReport);
          syncedCount++;
        } catch (error: any) {
          console.error(`Failed to sync report ${dbReport.local_id}:`, error);
          failedCount++;
          errors.push({
            localId: dbReport.local_id,
            error: error.message || 'Sync failed',
          });

          // Update error in database
          await db.runAsync(
            'UPDATE reports SET sync_error = ?, updated_at = ? WHERE local_id = ?',
            [error.message || 'Sync failed', Date.now(), dbReport.local_id]
          );
        }
      }

      console.log(`Sync complete: ${syncedCount} synced, ${failedCount} failed`);

      return {
        success: failedCount === 0,
        syncedCount,
        failedCount,
        errors,
      };
    } catch (error: any) {
      console.error('Sync all reports error:', error);
      return {
        success: false,
        syncedCount: 0,
        failedCount: 0,
        errors: [{ localId: '', error: error.message || 'Sync failed' }],
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync a single report with retry logic
   */
  private async syncSingleReport(dbReport: any, retryCount = 0): Promise<void> {
    const localId = dbReport.local_id;

    // Check if already in sync queue
    if (this.syncQueue.has(localId)) {
      throw new Error('Report already in sync queue');
    }

    this.syncQueue.add(localId);

    try {
      // Step 1: Upload photos if they are local files
      const photos = JSON.parse(dbReport.photos || '[]');
      const uploadedPhotos: string[] = [];

      for (const photo of photos) {
        if (mediaUpload.isLocalFile(photo)) {
          try {
            const uploadResult = await mediaUpload.uploadPhoto(
              photo,
              { fileType: 'photo', compress: false } // Already compressed
            );
            uploadedPhotos.push(uploadResult.file_url);
          } catch (error) {
            console.error(`Failed to upload photo ${photo}:`, error);
            // If photo upload fails, retry the whole report
            throw new Error('Photo upload failed');
          }
        } else {
          uploadedPhotos.push(photo);
        }
      }

      // Step 2: Submit report to server
      const reportData = {
        title: dbReport.title,
        description: dbReport.description,
        category: dbReport.category,
        sub_category: dbReport.sub_category,
        severity: dbReport.severity,
        latitude: dbReport.latitude,
        longitude: dbReport.longitude,
        address: dbReport.address,
        landmark: dbReport.landmark,
        ward_number: dbReport.ward_number,
        photos: uploadedPhotos,
        videos: dbReport.videos ? JSON.parse(dbReport.videos) : undefined,
        is_public: dbReport.is_public === 1,
        is_sensitive: dbReport.is_sensitive === 1,
      };

      const response = await reportApi.submitReport(reportData);

      // Step 3: Update local record with server data
      const db = await database.getDatabase();
      await db.runAsync(
        `UPDATE reports SET 
          id = ?,
          report_number = ?,
          photos = ?,
          is_synced = 1,
          sync_error = NULL,
          updated_at = ?
        WHERE local_id = ?`,
        [
          response.id,
          response.report_number,
          JSON.stringify(uploadedPhotos),
          Date.now(),
          localId,
        ]
      );

      console.log(`✅ Synced report: ${localId} → ${response.id}`);
    } catch (error: any) {
      console.error(`❌ Failed to sync report ${localId}:`, error);

      // Retry with exponential backoff
      if (retryCount < this.maxRetries) {
        const delay = this.retryDelays[retryCount] || this.retryDelays[this.retryDelays.length - 1];
        console.log(`Retrying in ${delay}ms (attempt ${retryCount + 1}/${this.maxRetries})`);

        await new Promise((resolve) => setTimeout(resolve, delay));
        await this.syncSingleReport(dbReport, retryCount + 1);
      } else {
        throw new Error(`Max retries exceeded: ${error.message}`);
      }
    } finally {
      this.syncQueue.delete(localId);
    }
  }

  /**
   * Manually trigger sync for a specific report
   */
  async syncReport(localId: string): Promise<void> {
    try {
      const db = await database.getDatabase();
      const dbReport = await db.getFirstAsync<any>(
        'SELECT * FROM reports WHERE local_id = ? AND is_synced = 0',
        [localId]
      );

      if (!dbReport) {
        throw new Error('Report not found or already synced');
      }

      await this.syncSingleReport(dbReport);
    } catch (error: any) {
      console.error(`Failed to sync report ${localId}:`, error);
      throw error;
    }
  }

  /**
   * Get count of unsynced reports
   */
  async getUnsyncedCount(): Promise<number> {
    try {
      const db = await database.getDatabase();
      const result = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM reports WHERE is_synced = 0'
      );
      return result?.count || 0;
    } catch (error) {
      console.error('Get unsynced count error:', error);
      return 0;
    }
  }

  /**
   * Get list of unsynced reports
   */
  async getUnsyncedReports(): Promise<any[]> {
    try {
      const db = await database.getDatabase();
      const reports = await db.getAllAsync<any>(
        'SELECT * FROM reports WHERE is_synced = 0 ORDER BY created_at DESC'
      );
      return reports;
    } catch (error) {
      console.error('Get unsynced reports error:', error);
      return [];
    }
  }

  /**
   * Clear sync errors for a report
   */
  async clearSyncError(localId: string): Promise<void> {
    try {
      const db = await database.getDatabase();
      await db.runAsync(
        'UPDATE reports SET sync_error = NULL WHERE local_id = ?',
        [localId]
      );
    } catch (error) {
      console.error('Clear sync error:', error);
    }
  }

  /**
   * Check if sync is in progress
   */
  isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  /**
   * Get sync queue size
   */
  getSyncQueueSize(): number {
    return this.syncQueue.size;
  }
}

export const reportSyncService = new ReportSyncService();
