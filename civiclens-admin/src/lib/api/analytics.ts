import apiClient from './client';
import { DashboardStats, AnalyticsData } from '@/types';

export const analyticsApi = {
  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get('/analytics/stats');
    return response.data;
  },

  getTimeSeriesData: async (
    startDate: string,
    endDate: string
  ): Promise<AnalyticsData[]> => {
    const response = await apiClient.get('/analytics/timeseries', {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data;
  },

  getDepartmentPerformance: async () => {
    const response = await apiClient.get('/analytics/department-performance');
    return response.data;
  },

  getOfficerPerformance: async () => {
    const response = await apiClient.get('/analytics/officer-performance');
    return response.data;
  },
};