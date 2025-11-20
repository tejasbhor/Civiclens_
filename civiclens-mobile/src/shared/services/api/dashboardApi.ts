/**
 * Dashboard API Service
 * Handles API calls for dashboard data
 */

import { apiClient } from './apiClient';
import { DashboardStats, Alert, NearbyReport } from '@shared/types/dashboard';

/**
 * Fetch user's report statistics
 * Uses the same endpoint as web client: /users/me/stats
 */
export const fetchUserStats = async (): Promise<DashboardStats> => {
  try {
    const response = await apiClient.get<any>('/users/me/stats');
    // Map backend response to our DashboardStats interface
    return {
      issuesRaised: response.total_reports || 0,
      inProgress: response.in_progress_reports || response.active_reports || 0,
      resolved: response.resolved_reports || 0,
      total: response.total_reports || 0,
    };
  } catch (error) {
    console.error('Error fetching user stats:', error);
    throw error;
  }
};

/**
 * Fetch active alerts for user's location
 */
export const fetchAlerts = async (latitude: number, longitude: number): Promise<Alert[]> => {
  try {
    const response = await apiClient.get<Alert[]>('/alerts/nearby', {
      params: { latitude, longitude, radius: 5 }, // 5km radius
    });
    return response;
  } catch (error) {
    console.error('Error fetching alerts:', error);
    throw error;
  }
};

/**
 * Fetch nearby reports for map preview
 */
export const fetchNearbyReports = async (
  latitude: number,
  longitude: number,
  radius: number = 2 // km
): Promise<NearbyReport[]> => {
  try {
    const response = await apiClient.get<NearbyReport[]>('/reports/nearby', {
      params: { latitude, longitude, radius, limit: 50 },
    });
    return response;
  } catch (error) {
    console.error('Error fetching nearby reports:', error);
    throw error;
  }
};

/**
 * Fetch all dashboard data in one call
 */
export const fetchDashboardData = async (
  latitude?: number,
  longitude?: number
): Promise<{
  stats: DashboardStats;
  alerts: Alert[];
  nearbyReports: NearbyReport[];
}> => {
  try {
    // Fetch stats (no userId needed, uses /users/me/stats)
    const stats = await fetchUserStats();

    // Fetch alerts and nearby reports if location is available
    let alerts: Alert[] = [];
    let nearbyReports: NearbyReport[] = [];

    if (latitude && longitude) {
      [alerts, nearbyReports] = await Promise.all([
        fetchAlerts(latitude, longitude),
        fetchNearbyReports(latitude, longitude),
      ]);
    }

    return { stats, alerts, nearbyReports };
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    throw error;
  }
};
