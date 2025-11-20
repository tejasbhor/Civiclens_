/**
 * Conflict Resolver
 * Handles sync conflicts using last-write-wins strategy
 */

import { database } from '@shared/database/database';

export interface ConflictResolutionResult {
  resolved: boolean;
  action: 'keep_local' | 'use_server' | 'merge' | 'duplicate';
  message: string;
}

class ConflictResolver {
  /**
   * Resolve report conflict using last-write-wins strategy
   */
  async resolveReportConflict(
    localReport: any,
    serverReport: any
  ): Promise<ConflictResolutionResult> {
    try {
      // Compare timestamps
      const localTimestamp = localReport.updated_at;
      const serverTimestamp = new Date(serverReport.updated_at).getTime();

      // Last-write-wins: Use the most recent update
      if (localTimestamp > serverTimestamp) {
        console.log(`🔄 Keeping local report (newer): ${localReport.id}`);
        return {
          resolved: true,
          action: 'keep_local',
          message: 'Local changes are newer, keeping local version',
        };
      } else {
        console.log(`🔄 Using server report (newer): ${serverReport.id}`);
        
        // Update local database with server data
        await this.updateLocalReport(localReport.id, serverReport);
        
        return {
          resolved: true,
          action: 'use_server',
          message: 'Server version is newer, updated local data',
        };
      }
    } catch (error) {
      console.error('Error resolving report conflict:', error);
      return {
        resolved: false,
        action: 'keep_local',
        message: error instanceof Error ? error.message : 'Failed to resolve conflict',
      };
    }
  }

  /**
   * Resolve task status conflict using last-write-wins strategy
   */
  async resolveTaskConflict(
    localTask: any,
    serverTask: any
  ): Promise<ConflictResolutionResult> {
    try {
      const localTimestamp = localTask.updated_at;
      const serverTimestamp = new Date(serverTask.updated_at).getTime();

      // For task status updates, always prefer the most recent
      if (localTimestamp > serverTimestamp) {
        console.log(`🔄 Keeping local task status (newer): ${localTask.id}`);
        return {
          resolved: true,
          action: 'keep_local',
          message: 'Local task status is newer',
        };
      } else {
        console.log(`🔄 Using server task status (newer): ${serverTask.id}`);
        
        // Update local database with server data
        await this.updateLocalTask(localTask.id, serverTask);
        
        return {
          resolved: true,
          action: 'use_server',
          message: 'Server task status is newer',
        };
      }
    } catch (error) {
      console.error('Error resolving task conflict:', error);
      return {
        resolved: false,
        action: 'keep_local',
        message: error instanceof Error ? error.message : 'Failed to resolve conflict',
      };
    }
  }

  /**
   * Detect duplicate reports based on similarity
   */
  async detectDuplicateReport(report: any): Promise<{
    isDuplicate: boolean;
    duplicateId?: number;
    similarity?: number;
  }> {
    try {
      // Find reports with similar location (within 100 meters)
      const latRange = 0.001; // Approximately 100 meters
      const lngRange = 0.001;

      const similarReports = await database.getAllAsync<any>(
        `SELECT * FROM reports 
         WHERE latitude BETWEEN ? AND ?
         AND longitude BETWEEN ? AND ?
         AND category = ?
         AND id != ?
         AND created_at > ?
         ORDER BY created_at DESC
         LIMIT 10`,
        [
          report.latitude - latRange,
          report.latitude + latRange,
          report.longitude - lngRange,
          report.longitude + lngRange,
          report.category,
          report.id || 0,
          Date.now() - 7 * 24 * 60 * 60 * 1000, // Last 7 days
        ]
      );

      // Check for duplicates based on similarity
      for (const existingReport of similarReports) {
        const similarity = this.calculateReportSimilarity(report, existingReport);
        
        // If similarity is above 80%, consider it a duplicate
        if (similarity > 0.8) {
          console.log(`⚠️ Duplicate report detected: ${existingReport.id} (${Math.round(similarity * 100)}% similar)`);
          return {
            isDuplicate: true,
            duplicateId: existingReport.id,
            similarity,
          };
        }
      }

      return { isDuplicate: false };
    } catch (error) {
      console.error('Error detecting duplicate report:', error);
      return { isDuplicate: false };
    }
  }

  /**
   * Calculate similarity between two reports (0-1 scale)
   */
  private calculateReportSimilarity(report1: any, report2: any): number {
    let score = 0;
    let factors = 0;

    // Category match (weight: 0.3)
    if (report1.category === report2.category) {
      score += 0.3;
    }
    factors++;

    // Location proximity (weight: 0.4)
    const distance = this.calculateDistance(
      report1.latitude,
      report1.longitude,
      report2.latitude,
      report2.longitude
    );
    
    if (distance < 0.05) { // Within 50 meters
      score += 0.4;
    } else if (distance < 0.1) { // Within 100 meters
      score += 0.2;
    }
    factors++;

    // Title similarity (weight: 0.3)
    const titleSimilarity = this.calculateTextSimilarity(
      report1.title.toLowerCase(),
      report2.title.toLowerCase()
    );
    score += titleSimilarity * 0.3;
    factors++;

    return score;
  }

  /**
   * Calculate distance between two coordinates in kilometers
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Calculate text similarity using simple word overlap
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.split(/\s+/));
    const words2 = new Set(text2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Update local report with server data
   */
  private async updateLocalReport(localId: number, serverReport: any): Promise<void> {
    try {
      await database.runAsync(
        `UPDATE reports SET
          report_number = ?,
          status = ?,
          status_updated_at = ?,
          department_id = ?,
          ai_category = ?,
          ai_confidence = ?,
          ai_processed_at = ?,
          is_synced = 1,
          sync_error = NULL,
          updated_at = ?
         WHERE id = ?`,
        [
          serverReport.report_number,
          serverReport.status,
          serverReport.status_updated_at ? new Date(serverReport.status_updated_at).getTime() : null,
          serverReport.department_id,
          serverReport.ai_category,
          serverReport.ai_confidence,
          serverReport.ai_processed_at ? new Date(serverReport.ai_processed_at).getTime() : null,
          Date.now(),
          localId,
        ]
      );

      console.log(`✅ Updated local report ${localId} with server data`);
    } catch (error) {
      console.error('Error updating local report:', error);
      throw error;
    }
  }

  /**
   * Update local task with server data
   */
  private async updateLocalTask(localId: number, serverTask: any): Promise<void> {
    try {
      await database.runAsync(
        `UPDATE tasks SET
          status = ?,
          priority = ?,
          notes = ?,
          resolution_notes = ?,
          acknowledged_at = ?,
          started_at = ?,
          resolved_at = ?,
          sla_deadline = ?,
          sla_violated = ?,
          is_synced = 1,
          pending_sync = NULL,
          updated_at = ?
         WHERE id = ?`,
        [
          serverTask.status,
          serverTask.priority,
          serverTask.notes,
          serverTask.resolution_notes,
          serverTask.acknowledged_at ? new Date(serverTask.acknowledged_at).getTime() : null,
          serverTask.started_at ? new Date(serverTask.started_at).getTime() : null,
          serverTask.resolved_at ? new Date(serverTask.resolved_at).getTime() : null,
          serverTask.sla_deadline ? new Date(serverTask.sla_deadline).getTime() : null,
          serverTask.sla_violated ? 1 : 0,
          Date.now(),
          localId,
        ]
      );

      console.log(`✅ Updated local task ${localId} with server data`);
    } catch (error) {
      console.error('Error updating local task:', error);
      throw error;
    }
  }

  /**
   * Handle sync error recovery
   */
  async recoverFromSyncError(itemType: 'report' | 'task', itemId: number): Promise<void> {
    try {
      console.log(`🔧 Attempting to recover ${itemType} ${itemId} from sync error`);

      if (itemType === 'report') {
        // Reset sync error and retry
        await database.runAsync(
          'UPDATE reports SET sync_error = NULL, updated_at = ? WHERE id = ?',
          [Date.now(), itemId]
        );
      } else if (itemType === 'task') {
        // Reset sync error and retry
        await database.runAsync(
          'UPDATE tasks SET pending_sync = NULL, updated_at = ? WHERE id = ?',
          [Date.now(), itemId]
        );
      }

      console.log(`✅ Reset sync error for ${itemType} ${itemId}`);
    } catch (error) {
      console.error(`Error recovering from sync error:`, error);
      throw error;
    }
  }

  /**
   * Mark report as duplicate
   */
  async markReportAsDuplicate(reportId: number, duplicateOfId: number): Promise<void> {
    try {
      await database.runAsync(
        `UPDATE reports SET 
          status = 'duplicate',
          sync_error = ?,
          updated_at = ?
         WHERE id = ?`,
        [
          `Duplicate of report ${duplicateOfId}`,
          Date.now(),
          reportId,
        ]
      );

      console.log(`✅ Marked report ${reportId} as duplicate of ${duplicateOfId}`);
    } catch (error) {
      console.error('Error marking report as duplicate:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const conflictResolver = new ConflictResolver();
