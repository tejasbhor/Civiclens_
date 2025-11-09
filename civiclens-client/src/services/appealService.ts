import apiClient from './apiClient';

export interface Appeal {
  id: number;
  report_id: number;
  submitted_by_user_id: number;
  appeal_type: string;
  status: string;
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
  appeal_type: 'quality' | 'incomplete' | 'other';
  reason: string;
  evidence?: string;
  requested_action?: string;
}

export interface AppealReview {
  decision: 'approved' | 'rejected';
  review_notes: string;
  requires_rework?: boolean;
  rework_assigned_to_user_id?: number;
}

export const appealService = {
  /**
   * Submit an appeal for a report
   */
  async submitAppeal(data: AppealCreate): Promise<Appeal> {
    const response = await apiClient.post('/appeals/', data);
    return response.data;
  },

  /**
   * Get appeals for a report
   */
  async getAppeals(reportId?: number): Promise<Appeal[]> {
    const response = await apiClient.get('/appeals/', {
      params: reportId ? { report_id: reportId } : {},
    });
    return Array.isArray(response.data) ? response.data : response.data.data || [];
  },

  /**
   * Get appeal details
   */
  async getAppealDetails(appealId: number): Promise<Appeal> {
    const response = await apiClient.get(`/appeals/${appealId}`);
    return response.data;
  },

  /**
   * Review an appeal (admin only)
   */
  async reviewAppeal(appealId: number, data: AppealReview): Promise<Appeal> {
    const response = await apiClient.post(`/appeals/${appealId}/review`, data);
    return response.data;
  },

  /**
   * Complete rework for an appeal (officer)
   */
  async completeRework(appealId: number, completionNotes: string): Promise<Appeal> {
    const formData = new FormData();
    formData.append('completion_notes', completionNotes);
    
    const response = await apiClient.post(`/appeals/${appealId}/complete-rework`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export default appealService;
