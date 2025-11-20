import apiClient from './client';
import { Department } from '@/types';

export interface DepartmentStats {
  department_id: number;
  department_name: string;
  total_officers: number;
  active_officers: number;
  total_reports: number;
  pending_reports: number;
  resolved_reports: number;
  in_progress_reports: number;
  avg_resolution_time_days: number | null;
  resolution_rate: number;
}

export const departmentsApi = {
  list: async (): Promise<Department[]> => {
    try {
      const res = await apiClient.get('/departments');
      return (res.data?.data ?? res.data ?? []) as Department[];
    } catch {
      return [] as Department[];
    }
  },

  // Alias for list method to match expected interface
  getDepartments: async (): Promise<Department[]> => {
    return departmentsApi.list();
  },
  
  getStats: async (): Promise<DepartmentStats[]> => {
    try {
      const res = await apiClient.get('/departments/stats/all');
      return res.data as DepartmentStats[];
    } catch {
      return [] as DepartmentStats[];
    }
  },
  
  getDepartmentStats: async (departmentId: number): Promise<DepartmentStats | null> => {
    try {
      const res = await apiClient.get(`/departments/${departmentId}/stats`);
      return res.data as DepartmentStats;
    } catch {
      return null;
    }
  },
};
