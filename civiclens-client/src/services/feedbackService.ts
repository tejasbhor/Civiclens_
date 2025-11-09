import apiClient from './apiClient';

export interface Feedback {
  id: number;
  report_id: number;
  user_id: number;
  rating: number; // 1-5 stars
  satisfaction_level: 'very_dissatisfied' | 'dissatisfied' | 'neutral' | 'satisfied' | 'very_satisfied';
  comment?: string;
  resolution_time_acceptable: boolean;
  work_quality_acceptable: boolean;
  officer_behavior_acceptable: boolean;
  would_recommend: boolean;
  requires_followup: boolean;
  followup_reason?: string;
  created_at: string;
  updated_at?: string;
}

export interface FeedbackCreate {
  report_id: number;
  rating: number; // 1-5 stars
  satisfaction_level: 'very_dissatisfied' | 'dissatisfied' | 'neutral' | 'satisfied' | 'very_satisfied';
  comment?: string;
  resolution_time_acceptable?: boolean;
  work_quality_acceptable?: boolean;
  officer_behavior_acceptable?: boolean;
  would_recommend?: boolean;
  requires_followup?: boolean;
  followup_reason?: string;
}

export const feedbackService = {
  /**
   * Submit feedback for a report (full API with all fields)
   */
  async submitFeedback(data: FeedbackCreate): Promise<Feedback> {
    const response = await apiClient.post('/feedbacks/', data);
    return response.data;
  },

  /**
   * Get feedback for a specific report
   */
  async getFeedbackByReport(reportId: number): Promise<Feedback | null> {
    try {
      const response = await apiClient.get(`/feedbacks/report/${reportId}`);
      return response.data || null;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      console.error('Error fetching feedback:', error);
      return null;
    }
  },

  /**
   * Get feedback by ID
   */
  async getFeedback(feedbackId: number): Promise<Feedback> {
    const response = await apiClient.get(`/feedbacks/${feedbackId}`);
    return response.data;
  },

  /**
   * Get all feedbacks with filters (admin only)
   */
  async getAllFeedbacks(params?: {
    report_id?: number;
    satisfaction_level?: string;
    min_rating?: number;
    max_rating?: number;
    skip?: number;
    limit?: number;
  }): Promise<Feedback[]> {
    const response = await apiClient.get('/feedbacks/', { params });
    return Array.isArray(response.data) ? response.data : response.data.data || [];
  },

  /**
   * Get feedback statistics (admin only)
   */
  async getFeedbackStats(): Promise<{
    total: number;
    average_rating: number;
    by_satisfaction: Record<string, number>;
    by_rating: Record<number, number>;
    requires_followup: number;
  }> {
    const response = await apiClient.get('/feedbacks/stats');
    return response.data;
  },
};

export default feedbackService;
