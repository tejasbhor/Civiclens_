import apiClient from './client';

// Types
export enum AppealType {
  CLASSIFICATION = 'classification',
  RESOLUTION = 'resolution',
  REJECTION = 'rejection',
  INCORRECT_ASSIGNMENT = 'incorrect_assignment',
  WORKLOAD = 'workload',
  RESOURCE_LACK = 'resource_lack',
  QUALITY_CONCERN = 'quality_concern',
}

export enum AppealStatus {
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
}

export interface Appeal {
  id: number;
  report_id: number;
  submitted_by_user_id: number;
  appeal_type: AppealType;
  status: AppealStatus;
  reason: string;
  evidence?: string;
  requested_action?: string;
  reviewed_by_user_id?: number;
  review_notes?: string;
  action_taken?: string;
  reassigned_to_user_id?: number;
  reassigned_to_department_id?: number;
  reassignment_reason?: string;
  requires_rework: boolean;
  rework_assigned_to_user_id?: number;
  rework_notes?: string;
  rework_completed: boolean;
  created_at: string;
  updated_at?: string;
}

export interface AppealCreate {
  report_id: number;
  appeal_type: AppealType;
  reason: string;
  evidence?: string;
  requested_action?: string;
}

export interface AppealReview {
  status: AppealStatus;
  review_notes?: string;
  action_taken?: string;
  reassigned_to_user_id?: number;
  reassigned_to_department_id?: number;
  reassignment_reason?: string;
  requires_rework?: boolean;
  rework_assigned_to_user_id?: number;
  rework_notes?: string;
}

export interface AppealStats {
  total: number;
  by_status: Record<string, number>;
  by_type: Record<string, number>;
}

// API
export const appealsApi = {
  // Create appeal
  create: async (data: AppealCreate): Promise<Appeal> => {
    const response = await apiClient.post('/appeals', data);
    return response.data;
  },

  // List appeals
  list: async (params?: {
    status?: AppealStatus;
    appeal_type?: AppealType;
    skip?: number;
    limit?: number;
  }): Promise<Appeal[]> => {
    const response = await apiClient.get('/appeals', { params });
    return response.data;
  },

  // Get stats
  getStats: async (): Promise<AppealStats> => {
    const response = await apiClient.get('/appeals/stats');
    return response.data;
  },

  // Get by ID
  getById: async (id: number): Promise<Appeal> => {
    const response = await apiClient.get(`/appeals/${id}`);
    return response.data;
  },

  // Review appeal (admin)
  review: async (id: number, data: AppealReview): Promise<Appeal> => {
    const response = await apiClient.post(`/appeals/${id}/review`, data);
    return response.data;
  },

  // Complete rework (officer)
  completeRework: async (id: number): Promise<Appeal> => {
    const response = await apiClient.post(`/appeals/${id}/complete-rework`);
    return response.data;
  },

  // Withdraw appeal
  withdraw: async (id: number): Promise<void> => {
    await apiClient.delete(`/appeals/${id}`);
  },
};
