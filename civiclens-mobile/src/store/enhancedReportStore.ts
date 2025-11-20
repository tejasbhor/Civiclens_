/**
 * Enhanced Report Store - Instagram-Like Offline Experience
 * Extends existing reportStore with smart caching and preloading
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { Report, ReportStatus, ReportSeverity, ReportCategory } from '@shared/types/report';
import { offlineFirstApi } from '@shared/services/api/offlineFirstApi';
import { networkService } from '@shared/services/network/networkService';
import { submissionQueue } from '@shared/services/queue/submissionQueue';
import { database } from '@shared/database/database';
import { createLogger } from '@shared/utils/logger';

const log = createLogger('EnhancedReportStore');

interface EnhancedReportState {
  // Core data
  reports: Report[];
  myReports: Report[];
  nearbyReports: Report[];
  
  // UI states
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  
  // Offline states
  isOffline: boolean;
  unsyncedCount: number;
  queueStatus: any;
  
  // Cache states
  lastSync: number | null;
  cacheAge: number;
  
  // Pagination
  hasMore: boolean;
  currentPage: number;
  
  // Actions
  fetchMyReports: (refresh?: boolean) => Promise<void>;
  fetchNearbyReports: (lat: number, lng: number, refresh?: boolean) => Promise<void>;
  fetchReportDetail: (id: number, refresh?: boolean) => Promise<Report | null>;
  submitReport: (data: any) => Promise<Report>;
  
  // Offline actions
  getOfflineReports: () => Promise<Report[]>;
  syncOfflineReports: () => Promise<void>;
  
  // Cache actions
  preloadRecentReports: () => Promise<void>;
  clearCache: () => Promise<void>;
  
  // Utility actions
  refreshAll: () => Promise<void>;
  setOfflineMode: (offline: boolean) => void;
  clearError: () => void;
}

export const useEnhancedReportStore = create<EnhancedReportState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    reports: [],
    myReports: [],
    nearbyReports: [],
    loading: false,
    refreshing: false,
    error: null,
    isOffline: !networkService.isOnline(),
    unsyncedCount: 0,
    queueStatus: null,
    lastSync: null,
    cacheAge: 0,
    hasMore: true,
    currentPage: 1,

    /**
     * Fetch user's reports with smart caching
     */
    fetchMyReports: async (refresh = false) => {
      const state = get();
      
      // Don't fetch if already loading
      if (state.loading && !refresh) return;
      
      set({ loading: !refresh, refreshing: refresh, error: null });

      try {
        log.info(`Fetching my reports (refresh: ${refresh})`);

        // Use cache-first strategy with 5-minute TTL
        const reports = await offlineFirstApi.get<Report[]>('/reports/my-reports', {
          ttl: 5 * 60 * 1000,
          forceRefresh: refresh,
          staleWhileRevalidate: true,
        });

        // Also cache individual report details
        reports.forEach(report => {
          offlineFirstApi.get(`/reports/${report.id}`, {
            ttl: 10 * 60 * 1000,
            staleWhileRevalidate: true,
          }).catch(() => {}); // Ignore errors for background caching
        });

        set({
          myReports: reports,
          reports: [...reports], // Also update main reports list
          loading: false,
          refreshing: false,
          lastSync: Date.now(),
          error: state.isOffline ? 'Offline - showing cached data' : null,
        });

        log.info(`Loaded ${reports.length} reports`);

      } catch (error: any) {
        log.error('Failed to fetch reports:', error);
        
        // Try to get offline reports as fallback
        try {
          const offlineReports = await get().getOfflineReports();
          if (offlineReports.length > 0) {
            set({
              myReports: offlineReports,
              reports: offlineReports,
              error: 'Offline - showing local data',
            });
          } else {
            set({ error: 'No reports available offline' });
          }
        } catch {
          set({ error: error.message || 'Failed to load reports' });
        }
        
        set({ loading: false, refreshing: false });
      }
    },

    /**
     * Fetch nearby reports with location caching
     */
    fetchNearbyReports: async (lat: number, lng: number, refresh = false) => {
      const state = get();
      
      if (state.loading && !refresh) return;
      
      set({ loading: !refresh, refreshing: refresh, error: null });

      try {
        log.info(`Fetching nearby reports at ${lat}, ${lng}`);

        const endpoint = `/reports/nearby?lat=${lat}&lng=${lng}&radius=5000`;
        const reports = await offlineFirstApi.get<Report[]>(endpoint, {
          ttl: 3 * 60 * 1000, // 3 minutes for location-based data
          forceRefresh: refresh,
          staleWhileRevalidate: true,
        });

        set({
          nearbyReports: reports,
          loading: false,
          refreshing: false,
          lastSync: Date.now(),
        });

        log.info(`Loaded ${reports.length} nearby reports`);

      } catch (error: any) {
        log.error('Failed to fetch nearby reports:', error);
        set({
          error: error.message || 'Failed to load nearby reports',
          loading: false,
          refreshing: false,
        });
      }
    },

    /**
     * Fetch single report detail with aggressive caching
     */
    fetchReportDetail: async (id: number, refresh = false): Promise<Report | null> => {
      try {
        log.info(`Fetching report detail: ${id}`);

        const report = await offlineFirstApi.get<Report>(`/reports/${id}`, {
          ttl: 15 * 60 * 1000, // 15 minutes for report details
          forceRefresh: refresh,
          staleWhileRevalidate: true,
        });

        // Update report in existing lists
        const updateReportInList = (reports: Report[]) =>
          reports.map(r => r.id === id ? report : r);

        set(state => ({
          reports: updateReportInList(state.reports),
          myReports: updateReportInList(state.myReports),
          nearbyReports: updateReportInList(state.nearbyReports),
        }));

        return report;

      } catch (error: any) {
        log.error(`Failed to fetch report ${id}:`, error);
        
        // Try to find in existing data
        const state = get();
        const existingReport = 
          state.reports.find(r => r.id === id) ||
          state.myReports.find(r => r.id === id) ||
          state.nearbyReports.find(r => r.id === id);

        if (existingReport) {
          log.info(`Returning cached report ${id}`);
          return existingReport;
        }

        throw error;
      }
    },

    /**
     * Submit report using enhanced queue system
     */
    submitReport: async (reportData: any): Promise<Report> => {
      try {
        log.info('Submitting report via enhanced system');

        // Import the complete submission hook
        const { useCompleteReportSubmission } = await import('@shared/hooks/useCompleteReportSubmission');
        
        // Use the complete submission system
        const result = await submissionQueue.addToQueue({
          type: 'COMPLETE_REPORT_SUBMISSION',
          data: {
            ...reportData,
            compressedPhotos: reportData.photos || [],
          },
          timestamp: Date.now(),
          retryCount: 0,
        });

        // Update unsynced count
        set(state => ({ unsyncedCount: state.unsyncedCount + 1 }));

        // Create optimistic report for immediate UI update
        const optimisticReport: Report = {
          id: Date.now(), // Temporary ID
          ...reportData,
          status: ReportStatus.RECEIVED,
          created_at: new Date(),
          updated_at: new Date(),
          is_synced: false,
          local_id: result.id,
        };

        // Add to reports list
        set(state => ({
          myReports: [optimisticReport, ...state.myReports],
          reports: [optimisticReport, ...state.reports],
        }));

        return optimisticReport;

      } catch (error: any) {
        log.error('Failed to submit report:', error);
        throw error;
      }
    },

    /**
     * Get offline reports from local database
     */
    getOfflineReports: async (): Promise<Report[]> => {
      try {
        const db = await database.getDatabase();
        const rows = await db.getAllAsync<any>(
          'SELECT * FROM reports ORDER BY created_at DESC LIMIT 50'
        );

        const reports: Report[] = rows.map(row => ({
          id: row.id || row.local_id,
          title: row.title,
          description: row.description,
          category: row.category as ReportCategory,
          severity: row.severity as ReportSeverity,
          status: row.status as ReportStatus,
          latitude: row.latitude,
          longitude: row.longitude,
          address: row.address,
          photos: JSON.parse(row.photos || '[]'),
          created_at: new Date(row.created_at),
          updated_at: new Date(row.updated_at),
          is_synced: row.is_synced === 1,
          local_id: row.local_id,
        }));

        log.info(`Loaded ${reports.length} offline reports`);
        return reports;

      } catch (error: any) {
        log.error('Failed to get offline reports:', error);
        return [];
      }
    },

    /**
     * Sync offline reports
     */
    syncOfflineReports: async () => {
      try {
        log.info('Starting offline reports sync');
        
        // Process submission queue
        await submissionQueue.processQueue();
        
        // Update unsynced count
        const db = await database.getDatabase();
        const result = await db.getFirstAsync<{ count: number }>(
          'SELECT COUNT(*) as count FROM reports WHERE is_synced = 0'
        );
        
        set({ unsyncedCount: result?.count || 0 });
        
        log.info('Offline sync completed');

      } catch (error: any) {
        log.error('Sync failed:', error);
        set({ error: 'Sync failed: ' + error.message });
      }
    },

    /**
     * Preload recent reports for better offline experience
     */
    preloadRecentReports: async () => {
      try {
        log.info('Preloading recent reports');

        // Preload recent reports in background
        const endpoints = [
          '/reports/my-reports?limit=20',
          '/reports/recent?limit=50',
          '/reports/trending?limit=10',
        ];

        const promises = endpoints.map(endpoint =>
          offlineFirstApi.get(endpoint, {
            ttl: 10 * 60 * 1000,
            staleWhileRevalidate: true,
          }).catch(() => {}) // Ignore errors for preloading
        );

        await Promise.allSettled(promises);
        log.info('Preloading completed');

      } catch (error: any) {
        log.error('Preloading failed:', error);
      }
    },

    /**
     * Clear all cache
     */
    clearCache: async () => {
      try {
        await offlineFirstApi.clearAllCache();
        set({ lastSync: null, cacheAge: 0 });
        log.info('Cache cleared');
      } catch (error: any) {
        log.error('Failed to clear cache:', error);
      }
    },

    /**
     * Refresh all data (pull-to-refresh)
     */
    refreshAll: async () => {
      const state = get();
      
      set({ refreshing: true });

      try {
        // Refresh all data in parallel
        await Promise.allSettled([
          state.fetchMyReports(true),
          state.syncOfflineReports(),
        ]);

        set({ refreshing: false, lastSync: Date.now() });

      } catch (error: any) {
        log.error('Refresh failed:', error);
        set({ refreshing: false, error: error.message });
      }
    },

    /**
     * Set offline mode
     */
    setOfflineMode: (offline: boolean) => {
      set({ isOffline: offline });
      
      if (!offline) {
        // Back online - start sync
        get().syncOfflineReports();
      }
    },

    /**
     * Clear error state
     */
    clearError: () => set({ error: null }),
  }))
);

// Subscribe to network changes
networkService.addListener((status) => {
  useEnhancedReportStore.getState().setOfflineMode(!status.isConnected);
});

// Subscribe to queue changes
submissionQueue.addListener((queueStatus) => {
  useEnhancedReportStore.setState({ queueStatus });
});
