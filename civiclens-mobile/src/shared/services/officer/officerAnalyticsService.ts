/**
 * Officer Analytics Service
 * Fetches analytics data from backend for officer dashboard
 */

import { offlineFirstApi } from '../api/offlineFirstApi';

export interface OfficerAnalyticsData {
  // Officer Stats
  total_tasks: number;
  assigned_tasks: number;
  in_progress_tasks: number;
  completed_tasks: number;
  on_hold_tasks: number;
  overdue_tasks: number;
  completion_rate: number;
  avg_resolution_time: number;

  // Dashboard Stats
  total_reports: number;
  pending_tasks: number;
  resolved_today: number;
  high_priority_count: number;
  critical_priority_count: number;
  reports_by_category: Record<string, number>;
  reports_by_status: Record<string, number>;
  reports_by_severity: Record<string, number>;
}

class OfficerAnalyticsService {
  /**
   * Get comprehensive analytics data for officer
   * Combines officer stats and dashboard stats
   */
  async getAnalytics(): Promise<OfficerAnalyticsData> {
    try {
      // Fetch both officer stats and dashboard stats in parallel
      const [officerStats, dashboardStats] = await Promise.all([
        this.getOfficerStats(),
        this.getDashboardStats(),
      ]);

      // Combine both data sources
      return {
        ...officerStats,
        ...dashboardStats,
      };
    } catch (error) {
      console.error('[Analytics Service] Failed to fetch analytics:', error);
      throw error;
    }
  }

  /**
   * Get officer-specific statistics
   */
  private async getOfficerStats() {
    const response = await offlineFirstApi.get<any>(
      '/users/me/officer-stats',
      {
        ttl: 5 * 60 * 1000, // 5 minutes cache
        staleWhileRevalidate: true,
      }
    );

    return {
      total_tasks: response.total_tasks || 0,
      assigned_tasks: response.assigned_tasks || 0,
      in_progress_tasks: response.in_progress_tasks || 0,
      completed_tasks: response.completed_tasks || 0,
      on_hold_tasks: response.on_hold_tasks || 0,
      overdue_tasks: response.overdue_tasks || 0,
      completion_rate: response.completion_rate || 0,
      avg_resolution_time: response.avg_resolution_time || 0,
    };
  }

  /**
   * Get dashboard-wide statistics
   */
  private async getDashboardStats() {
    const response = await offlineFirstApi.get<any>(
      '/analytics/stats',
      {
        ttl: 5 * 60 * 1000, // 5 minutes cache
        staleWhileRevalidate: true,
      }
    );

    return {
      total_reports: response.total_reports || 0,
      pending_tasks: response.pending_tasks || 0,
      resolved_today: response.resolved_today || 0,
      high_priority_count: response.high_priority_count || 0,
      critical_priority_count: response.critical_priority_count || 0,
      reports_by_category: response.reports_by_category || {},
      reports_by_status: response.reports_by_status || {},
      reports_by_severity: response.reports_by_severity || {},
    };
  }

  /**
   * Get officer performance trend (optional - for future enhancement)
   */
  async getPerformanceTrend(days: number = 7): Promise<any> {
    // TODO: Implement when backend endpoint is available
    return null;
  }
}

export const officerAnalyticsService = new OfficerAnalyticsService();
