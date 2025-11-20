import apiClient from './client';
import { User, PaginatedResponse } from '@/types';

export interface OfficerStats {
  user_id: number;
  full_name?: string;
  email?: string;
  phone?: string;
  employee_id?: string;
  department_id?: number | null;
  department_name?: string | null;
  total_reports: number;
  resolved_reports: number;
  in_progress_reports: number;
  active_reports: number;
  avg_resolution_time_days: number | null;
  workload_score?: number;
  capacity_level?: string;
}

export interface ChangeDepartmentRequest {
  user_id: number;
  new_department_id: number;
  reassignment_strategy: 'keep_assignments' | 'reassign_reports' | 'unassign_reports';
  notes?: string;
}

export interface ChangeDepartmentResult {
  message: string;
  officer: {
    id: number;
    full_name: string;
    employee_id: string;
    old_department: string | null;
    new_department: string;
  };
  reassignment_results: {
    total_assignments: number;
    kept_assignments: number;
    reassigned_reports: number;
    unassigned_reports: number;
    errors: Array<{ report_id: number; error: string }>;
  };
  strategy_used: string;
}

export const usersApi = {
  listUsers: async (
    params: { page?: number; per_page?: number; role?: string; min_reputation?: number } = {}
  ): Promise<PaginatedResponse<User>> => {
    const res = await apiClient.get('/users', { params });
    return res.data as PaginatedResponse<User>;
  },
  getMe: async (): Promise<User> => {
    const res = await apiClient.get('/users/me');
    return res.data as User;
  },
  updateMyProfile: async (data: Partial<User>): Promise<User> => {
    const res = await apiClient.put('/users/me/profile', data);
    return res.data as User;
  },
  // Preferences
  getMyPreferences: async (): Promise<{ theme: 'light'|'dark'|'auto'; density: 'comfortable'|'compact' }> => {
    const res = await apiClient.get('/users/me/preferences');
    return res.data;
  },
  updateMyPreferences: async (prefs: { theme: 'light'|'dark'|'auto'; density: 'comfortable'|'compact' }): Promise<{ message: string; theme: string; density: string }> => {
    const res = await apiClient.put('/users/me/preferences', prefs);
    return res.data;
  },
  // Verification
  getMyVerification: async (): Promise<{ email: { value?: string; verified: boolean; last_sent_at?: string|null }, phone: { value?: string; verified: boolean; last_sent_at?: string|null } }> => {
    const res = await apiClient.get('/users/me/verification');
    return res.data;
  },
  sendEmailVerification: async (): Promise<{ message: string; debug_token?: string }> => {
    const res = await apiClient.post('/users/me/verification/email/send', {});
    return res.data;
  },
  verifyEmail: async (token: string): Promise<{ message: string }> => {
    const res = await apiClient.post('/users/me/verification/email/verify', { token });
    return res.data;
  },
  sendPhoneVerification: async (): Promise<{ message: string; debug_otp?: string }> => {
    const res = await apiClient.post('/users/me/verification/phone/send', {});
    return res.data;
  },
  verifyPhone: async (otp: string): Promise<{ message: string }> => {
    const res = await apiClient.post('/users/me/verification/phone/verify', { otp });
    return res.data;
  },
  
  // Officer Statistics
  getOfficerStats: async (): Promise<OfficerStats[]> => {
    try {
      const res = await apiClient.get('/users/stats/officers');
      return res.data as OfficerStats[];
    } catch {
      return [] as OfficerStats[];
    }
  },
  
  getUserStats: async (userId: number): Promise<OfficerStats | null> => {
    try {
      const res = await apiClient.get(`/users/${userId}/stats`);
      return res.data as OfficerStats;
    } catch {
      return null;
    }
  },

  // Officer Department Management
  changeDepartment: async (payload: ChangeDepartmentRequest): Promise<ChangeDepartmentResult> => {
    const res = await apiClient.post('/users/change-department', payload);
    return res.data as ChangeDepartmentResult;
  },

  // Get Officers
  getOfficers: async (departmentId?: number): Promise<User[]> => {
    const params: any = {};
    if (departmentId) params.department_id = departmentId;
    
    const res = await apiClient.get('/users/officers', { params });
    return res.data as User[];
  },
};
