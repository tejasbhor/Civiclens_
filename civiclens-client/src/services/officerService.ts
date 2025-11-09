import apiClient from './apiClient';
import { logger } from '@/lib/logger';

export interface OfficerStats {
  user_id: number;
  full_name: string;
  email: string;
  phone?: string;
  employee_id?: string;
  department_id?: number;
  department_name?: string;
  total_reports: number;
  resolved_reports: number;
  in_progress_reports: number;
  active_reports: number;
  avg_resolution_time_days: number;
  workload_score: number;
  capacity_level: string;
}

export interface Task {
  id: number;
  report_id: number;
  assigned_to: number;
  assigned_by?: number;
  status: string;
  priority?: string;
  notes?: string;
  acknowledged_at?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  report?: any;
}

export const officerService = {
  /**
   * Get officer statistics
   */
  async getOfficerStats(userId: number): Promise<OfficerStats> {
    const response = await apiClient.get(`/users/${userId}/stats`);
    return response.data;
  },

  /**
   * Get officer's assigned tasks (reports assigned to officer)
   * This gets reports where the officer is assigned via Task.assigned_to
   */
  async getMyTasks(params?: {
    status?: string;
    priority?: string;
    skip?: number;
    limit?: number;
  }): Promise<any[]> {
    // Use /reports/ endpoint which returns all reports with task info
    // We'll filter on frontend for reports assigned to current officer
    const limit = params?.limit || 100;
    const page = 1;
    
    const response = await apiClient.get('/reports/', { 
      params: {
        page,
        per_page: limit,
      }
    });
    
    logger.debug('📋 getMyTasks response:', response.data);
    
    // Backend returns paginated response: {data: [...], total: ..., page: ..., per_page: ...}
    // Extract the actual reports array
    let allReports = [];
    
    if (Array.isArray(response.data)) {
      // Direct array
      allReports = response.data;
    } else if (response.data?.data && Array.isArray(response.data.data)) {
      // Paginated: {data: [...], total: ...}
      allReports = response.data.data;
    } else if (response.data?.items && Array.isArray(response.data.items)) {
      // Alternative pagination: {items: [...], total: ...}
      allReports = response.data.items;
    } else {
      logger.error('❌ Unexpected response structure:', response.data);
      return [];
    }
    
    logger.debug(`   Total reports in response: ${allReports.length}`);
    
    // Filter for reports assigned to current officer via task
    // We need to check this on the frontend since backend doesn't have officer-specific endpoint
    const myTasks = allReports.filter((report: any) => {
      return report.task && report.task.assigned_to;
    });
    
    logger.debug(`   Tasks with assignment: ${myTasks.length}`);
    
    return myTasks;
  },

  /**
   * Get current officer details
   */
  async getCurrentOfficer(): Promise<any> {
    const response = await apiClient.get('/users/me');
    return response.data;
  },

  /**
   * Get task/report details
   */
  async getTaskDetails(reportId: number): Promise<any> {
    const response = await apiClient.get(`/reports/${reportId}`);
    return response.data;
  },

  /**
   * Get task history/timeline
   */
  async getTaskHistory(reportId: number): Promise<any> {
    const response = await apiClient.get(`/reports/${reportId}/history`);
    return response.data;
  },

  /**
   * Acknowledge a task
   */
  async acknowledgeTask(reportId: number, notes?: string): Promise<any> {
    const response = await apiClient.post(`/reports/${reportId}/acknowledge`, { notes });
    return response.data;
  },

  /**
   * Start work on a task
   */
  async startWork(reportId: number, notes?: string): Promise<any> {
    const response = await apiClient.post(`/reports/${reportId}/start-work`, { notes });
    return response.data;
  },

  /**
   * Complete a task (mark as resolved/pending verification)
   */
  async completeTask(reportId: number, data: {
    status: string;
    notes?: string;
  }): Promise<any> {
    const response = await apiClient.put(`/reports/${reportId}`, data);
    return response.data;
  },

  /**
   * Submit work for verification
   */
  async submitForVerification(reportId: number, formData: FormData): Promise<any> {
    const response = await apiClient.post(`/reports/${reportId}/submit-for-verification`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Reject assignment
   */
  async rejectAssignment(reportId: number, rejectionReason: string): Promise<any> {
    const formData = new FormData();
    formData.append('rejection_reason', rejectionReason);
    
    const response = await apiClient.post(`/reports/${reportId}/reject-assignment`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Put task on hold
   */
  async putOnHold(reportId: number, reason: string, estimatedResumeDate?: string): Promise<any> {
    const formData = new FormData();
    formData.append('reason', reason);
    if (estimatedResumeDate) {
      formData.append('estimated_resume_date', estimatedResumeDate);
    }
    
    const response = await apiClient.post(`/reports/${reportId}/on-hold`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Resume work from on hold
   */
  async resumeWork(reportId: number, notes?: string): Promise<any> {
    const formData = new FormData();
    // Always append notes field (empty string if not provided) to avoid form parsing error
    formData.append('notes', notes || '');
    
    const response = await apiClient.post(`/reports/${reportId}/resume-work`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Add progress update to task
   */
  async addUpdate(reportId: number, updateText: string): Promise<any> {
    const formData = new FormData();
    formData.append('update_text', updateText);
    
    const response = await apiClient.post(`/reports/${reportId}/add-update`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
};

export default officerService;
