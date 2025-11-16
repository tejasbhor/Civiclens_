/**
 * useSync Hook
 * React hook for monitoring sync status
 */

import { useState, useEffect } from 'react';
import { syncManager, SyncStatus } from '@shared/services/sync/syncManager';

export const useSync = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncManager.getStatus());
  const [queueSize, setQueueSize] = useState<number>(0);

  useEffect(() => {
    // Subscribe to sync status changes
    const unsubscribe = syncManager.addListener((status) => {
      setSyncStatus(status);
    });

    // Get initial queue size
    syncManager.getQueueSize().then(setQueueSize);

    // Update queue size periodically
    const interval = setInterval(() => {
      syncManager.getQueueSize().then(setQueueSize);
    }, 5000); // Every 5 seconds

    // Cleanup
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return {
    isSyncing: syncStatus.isSyncing,
    queueSize,
    lastSyncTime: syncStatus.lastSyncTime,
    errors: syncStatus.errors,
    syncNow: () => syncManager.syncAllData(),
    clearQueue: () => syncManager.clearQueue(),
  };
};
