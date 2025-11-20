// Report state management with Zustand
import { create } from 'zustand';
import {
  Report,
  ReportCreate,
  ReportFilters,
  ReportListParams,
  NearbyReportsParams,
  ReportStats,
  ReportStatus,
} from '@shared/types/report';
import { database } from '@shared/database';
import { useAuthStore } from './authStore';
import { reportApi } from '@shared/services/api/reportApi';
import { networkService } from '@shared/services/network/networkService';
import { createLogger } from '@shared/utils/logger';

const log = createLogger('ReportStore');

export enum SyncStatus {
  IDLE = 'idle',
  SYNCING = 'syncing',
  SUCCESS = 'success',
  ERROR = 'error',
}

interface ReportState {
  reports: Report[];
  currentReport: Report | null;
  nearbyReports: Report[];
  stats: ReportStats | null;
  loading: boolean;
  error: string | null;
  syncStatus: SyncStatus;
  unsyncedCount: number;

  // Actions
  submitReport: (report: ReportCreate) => Promise<Report>;
  addLocalReport: (report: any) => void;
  updateLocalReport: (localId: string, updates: any) => void;
  fetchMyReports: (params?: ReportListParams) => Promise<void>;
  fetchReportDetail: (id: number) => Promise<Report | null>;
  fetchNearbyReports: (params: NearbyReportsParams) => Promise<void>;
  fetchReportStats: () => Promise<void>;
  updateReport: (id: number, updates: Partial<Report>) => Promise<void>;
  deleteReport: (id: number) => Promise<void>;
  syncOfflineReports: () => Promise<void>;
  getUnsyncedCount: () => Promise<number>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  setSyncStatus: (status: SyncStatus) => void;
}

export const useReportStore = create<ReportState>((set, get) => ({
  reports: [],
  currentReport: null,
  nearbyReports: [],
  stats: null,
  loading: false,
  error: null,
  syncStatus: SyncStatus.IDLE,
  unsyncedCount: 0,

  submitReport: async (reportData: ReportCreate) => {
    try {
      set({ loading: true, error: null });

      const user = useAuthStore.getState().user;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const isOnline = networkService.isOnline();
      log.info(`Submitting report (${isOnline ? 'online' : 'offline'})`);

      // If online, submit to backend API first
      if (isOnline) {
        try {
          log.debug('Calling backend API to create report');
          const backendReport = await reportApi.submitReport(reportData);
          
          log.info(`Report created on backend with ID: ${backendReport.id}`);
          
          // Convert backend response to local Report format
          const report: Report = {
            id: backendReport.id,
            report_number: backendReport.report_number,
            user_id: backendReport.user_id,
            title: backendReport.title,
            description: backendReport.description,
            category: backendReport.category as any,
            sub_category: backendReport.sub_category,
            severity: backendReport.severity as any,
            status: backendReport.status as ReportStatus,
            latitude: backendReport.latitude,
            longitude: backendReport.longitude,
            address: backendReport.address,
            landmark: backendReport.landmark,
            ward_number: backendReport.ward_number,
            photos: reportData.photos || [],
            videos: reportData.videos,
            is_public: backendReport.is_public,
            is_sensitive: backendReport.is_sensitive,
            created_at: new Date(backendReport.created_at),
            updated_at: new Date(backendReport.updated_at),
            is_synced: true,
          };

          // Add to reports list
          set((state) => ({
            reports: [report, ...state.reports],
            loading: false,
          }));

          log.info('Report submitted successfully (online)');
          return report;
        } catch (apiError: any) {
          log.error('Backend API failed, falling back to offline mode', apiError);
          // Fall through to offline mode
        }
      }

      // Offline mode or API failed: Save to local database
      log.info('Saving report to local database (offline mode)');
      
      // Generate local ID for offline tracking
      const localId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = Date.now();

      // Create report object
      const report: Report = {
        ...reportData,
        user_id: user.id,
        status: ReportStatus.RECEIVED,
        is_public: reportData.is_public ?? true,
        is_sensitive: reportData.is_sensitive ?? false,
        created_at: new Date(now),
        updated_at: new Date(now),
        local_id: localId,
        is_synced: false,
      };

      // Save to local database
      const db = await database.getDatabase();
      await db.runAsync(
        `INSERT INTO reports (
          user_id, title, description, category, sub_category, severity,
          latitude, longitude, address, landmark, ward_number, status,
          photos, videos, is_public, is_sensitive, is_synced, local_id,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          report.user_id,
          report.title,
          report.description,
          report.category,
          report.sub_category || null,
          report.severity,
          report.latitude,
          report.longitude,
          report.address,
          report.landmark || null,
          report.ward_number || null,
          report.status,
          JSON.stringify(report.photos),
          report.videos ? JSON.stringify(report.videos) : null,
          report.is_public ? 1 : 0,
          report.is_sensitive ? 1 : 0,
          0, // is_synced
          localId,
          now,
          now,
        ]
      );

      // Get the inserted report
      const result = await db.getFirstAsync<any>(
        'SELECT * FROM reports WHERE local_id = ?',
        [localId]
      );

      if (result) {
        const savedReport = parseReportFromDb(result);
        
        // Add to reports list
        set((state) => ({
          reports: [savedReport, ...state.reports],
          loading: false,
        }));

        // Update unsynced count
        await get().getUnsyncedCount();

        // Try to sync immediately if online
        const { networkService } = await import('@shared/services/network/networkService');
        const networkStatus = networkService.getStatus();
        
        if (networkStatus.isConnected && networkStatus.isInternetReachable !== false) {
          // Trigger sync in background (don't await)
          get().syncOfflineReports().catch(console.error);
        }

        return savedReport;
      }

      throw new Error('Failed to save report');
    } catch (error: any) {
      log.error('Submit report failed', error);
      set({ error: error.message || 'Failed to submit report', loading: false });
      throw error;
    }
  },

  fetchMyReports: async (params?: ReportListParams) => {
    // Check if database is ready
    if (!database.isReady()) {
      // Database not ready, return empty array
      // App will use API data instead
      set({ reports: [], loading: false });
      return;
    }

    try {
      set({ loading: true, error: null });

      const user = useAuthStore.getState().user;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const db = database.getDatabase();
      const limit = params?.limit || 20;
      const skip = params?.skip || 0;

      // Build query with filters
      let query = 'SELECT * FROM reports WHERE user_id = ?';
      const queryParams: any[] = [user.id];

      if (params?.filters) {
        const { status, category, severity, dateFrom, dateTo, searchQuery } = params.filters;

        if (status && status.length > 0) {
          query += ` AND status IN (${status.map(() => '?').join(',')})`;
          queryParams.push(...status);
        }

        if (category && category.length > 0) {
          query += ` AND category IN (${category.map(() => '?').join(',')})`;
          queryParams.push(...category);
        }

        if (severity && severity.length > 0) {
          query += ` AND severity IN (${severity.map(() => '?').join(',')})`;
          queryParams.push(...severity);
        }

        if (dateFrom) {
          query += ' AND created_at >= ?';
          queryParams.push(dateFrom.getTime());
        }

        if (dateTo) {
          query += ' AND created_at <= ?';
          queryParams.push(dateTo.getTime());
        }

        if (searchQuery) {
          query += ' AND (title LIKE ? OR description LIKE ? OR address LIKE ?)';
          const searchPattern = `%${searchQuery}%`;
          queryParams.push(searchPattern, searchPattern, searchPattern);
        }
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      queryParams.push(limit, skip);

      const results = await db.getAllAsync<any>(query, queryParams);
      const reports = results.map(parseReportFromDb);

      set({ reports, loading: false });
    } catch (error: any) {
      // Silently handle database errors - database may not be initialized
      // This is expected and the app continues to work with API data
      set({ reports: [], loading: false });
    }
  },

  fetchReportDetail: async (id: number) => {
    try {
      set({ loading: true, error: null });

      const db = await database.getDatabase();
      const result = await db.getFirstAsync<any>(
        'SELECT * FROM reports WHERE id = ?',
        [id]
      );

      if (result) {
        const report = parseReportFromDb(result);
        set({ currentReport: report, loading: false });
        return report;
      }

      set({ currentReport: null, loading: false });
      return null;
    } catch (error: any) {
      console.error('Fetch report detail error:', error);
      set({ error: error.message || 'Failed to fetch report', loading: false });
      return null;
    }
  },

  fetchNearbyReports: async (params: NearbyReportsParams) => {
    try {
      set({ loading: true, error: null });

      const db = await database.getDatabase();
      const { latitude, longitude, radius, status, category, severity, limit = 100 } = params;

      // Calculate bounding box for radius (approximate)
      const latDelta = radius / 111; // 1 degree latitude ≈ 111 km
      const lngDelta = radius / (111 * Math.cos((latitude * Math.PI) / 180));

      let query = `
        SELECT * FROM reports 
        WHERE latitude BETWEEN ? AND ?
        AND longitude BETWEEN ? AND ?
        AND is_public = 1
      `;
      const queryParams: any[] = [
        latitude - latDelta,
        latitude + latDelta,
        longitude - lngDelta,
        longitude + lngDelta,
      ];

      if (status && status.length > 0) {
        query += ` AND status IN (${status.map(() => '?').join(',')})`;
        queryParams.push(...status);
      }

      if (category && category.length > 0) {
        query += ` AND category IN (${category.map(() => '?').join(',')})`;
        queryParams.push(...category);
      }

      if (severity && severity.length > 0) {
        query += ` AND severity IN (${severity.map(() => '?').join(',')})`;
        queryParams.push(...severity);
      }

      query += ' ORDER BY created_at DESC LIMIT ?';
      queryParams.push(limit);

      const results = await db.getAllAsync<any>(query, queryParams);
      const nearbyReports = results.map(parseReportFromDb);

      set({ nearbyReports, loading: false });
    } catch (error: any) {
      console.error('Fetch nearby reports error:', error);
      set({ error: error.message || 'Failed to fetch nearby reports', loading: false });
    }
  },

  fetchReportStats: async () => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) return;

      const db = await database.getDatabase();
      const result = await db.getFirstAsync<any>(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'received' THEN 1 ELSE 0 END) as received,
          SUM(CASE WHEN status IN ('acknowledged', 'in_progress') THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
          SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed
        FROM reports WHERE user_id = ?`,
        [user.id]
      );

      if (result) {
        const stats: ReportStats = {
          total: result.total || 0,
          received: result.received || 0,
          in_progress: result.in_progress || 0,
          resolved: result.resolved || 0,
          closed: result.closed || 0,
        };
        set({ stats });
      }
    } catch (error: any) {
      console.error('Fetch report stats error:', error);
    }
  },

  updateReport: async (id: number, updates: Partial<Report>) => {
    try {
      const db = await database.getDatabase();
      const now = Date.now();

      const setClauses: string[] = [];
      const values: any[] = [];

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          setClauses.push(`${key} = ?`);
          values.push(value);
        }
      });

      if (setClauses.length === 0) return;

      setClauses.push('updated_at = ?');
      values.push(now);
      values.push(id);

      await db.runAsync(
        `UPDATE reports SET ${setClauses.join(', ')} WHERE id = ?`,
        values
      );

      // Refresh current report if it's the one being updated
      const currentReport = get().currentReport;
      if (currentReport && currentReport.id === id) {
        await get().fetchReportDetail(id);
      }

      // Refresh reports list
      await get().fetchMyReports();
    } catch (error: any) {
      console.error('Update report error:', error);
      set({ error: error.message || 'Failed to update report' });
    }
  },

  deleteReport: async (id: number) => {
    try {
      const db = await database.getDatabase();
      await db.runAsync('DELETE FROM reports WHERE id = ?', [id]);

      // Remove from state
      set((state) => ({
        reports: state.reports.filter((r) => r.id !== id),
        currentReport: state.currentReport?.id === id ? null : state.currentReport,
      }));
    } catch (error: any) {
      console.error('Delete report error:', error);
      set({ error: error.message || 'Failed to delete report' });
    }
  },

  syncOfflineReports: async () => {
    try {
      set({ syncStatus: SyncStatus.SYNCING });

      const db = await database.getDatabase();
      const unsyncedReports = await db.getAllAsync<any>(
        'SELECT * FROM reports WHERE is_synced = 0'
      );

      if (unsyncedReports.length === 0) {
        set({ syncStatus: SyncStatus.SUCCESS, unsyncedCount: 0 });
        return;
      }

      // Import API dynamically to avoid circular dependencies
      const { reportApi } = await import('@shared/services/api/reportApi');

      let syncedCount = 0;
      let errorCount = 0;

      for (const dbReport of unsyncedReports) {
        try {
          const report = parseReportFromDb(dbReport);
          
          // Submit to server
          const response = await reportApi.submitReport({
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
            photos: report.photos,
            videos: report.videos,
            is_public: report.is_public,
            is_sensitive: report.is_sensitive,
          });

          // Update local record with server data
          await db.runAsync(
            `UPDATE reports SET 
              id = ?, report_number = ?, is_synced = 1, sync_error = NULL, updated_at = ?
            WHERE local_id = ?`,
            [response.id, response.report_number, Date.now(), report.local_id]
          );

          syncedCount++;
        } catch (error: any) {
          console.error(`Failed to sync report ${dbReport.local_id}:`, error);
          
          // Update error status
          await db.runAsync(
            'UPDATE reports SET sync_error = ? WHERE local_id = ?',
            [error.message || 'Sync failed', dbReport.local_id]
          );
          
          errorCount++;
        }
      }

      // Update unsynced count
      await get().getUnsyncedCount();

      if (errorCount === 0) {
        set({ syncStatus: SyncStatus.SUCCESS });
      } else {
        set({ 
          syncStatus: SyncStatus.ERROR,
          error: `Synced ${syncedCount} reports, ${errorCount} failed`,
        });
      }

      // Refresh reports list
      await get().fetchMyReports();
    } catch (error: any) {
      console.error('Sync offline reports error:', error);
      set({ 
        syncStatus: SyncStatus.ERROR,
        error: error.message || 'Failed to sync reports',
      });
    }
  },

  getUnsyncedCount: async () => {
    try {
      const db = await database.getDatabase();
      const result = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM reports WHERE is_synced = 0'
      );
      const count = result?.count || 0;
      set({ unsyncedCount: count });
      return count;
    } catch (error) {
      console.error('Get unsynced count error:', error);
      return 0;
    }
  },

  addLocalReport: (report: any) => {
    set((state) => ({
      reports: [report, ...state.reports],
    }));
    log.info('Local report added to store:', report.id);
  },

  updateLocalReport: (localId: string, updates: any) => {
    set((state) => ({
      reports: state.reports.map(report => 
        String(report.id) === localId || report.local_id === localId
          ? { ...report, ...updates }
          : report
      ),
    }));
    log.info('Local report updated:', localId, updates);
  },

  clearError: () => set({ error: null }),
  setLoading: (loading: boolean) => set({ loading }),
  setSyncStatus: (status: SyncStatus) => set({ syncStatus: status }),
}));

// Helper function to parse report from database row
function parseReportFromDb(row: any): Report {
  return {
    id: row.id,
    report_number: row.report_number,
    user_id: row.user_id,
    department_id: row.department_id,
    title: row.title,
    description: row.description,
    category: row.category,
    sub_category: row.sub_category,
    severity: row.severity,
    latitude: row.latitude,
    longitude: row.longitude,
    address: row.address,
    landmark: row.landmark,
    ward_number: row.ward_number,
    status: row.status,
    status_updated_at: row.status_updated_at ? new Date(row.status_updated_at) : undefined,
    photos: JSON.parse(row.photos || '[]'),
    videos: row.videos ? JSON.parse(row.videos) : undefined,
    ai_category: row.ai_category,
    ai_confidence: row.ai_confidence,
    ai_processed_at: row.ai_processed_at ? new Date(row.ai_processed_at) : undefined,
    is_public: row.is_public === 1,
    is_sensitive: row.is_sensitive === 1,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
    is_synced: row.is_synced === 1,
    local_id: row.local_id,
    sync_error: row.sync_error,
  };
}
