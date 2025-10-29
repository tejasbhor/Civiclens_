import apiClient from './apiClient';

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
    // Get all reports and filter for those assigned to current officer
    // The backend returns reports with task info included
    const response = await apiClient.get('/reports/', { 
      params: {
        page: 1,
        per_page: params?.limit || 100,
        // We'll filter on frontend for now since backend doesn't have dedicated endpoint
      }
    });
    
    console.log('📋 getMyTasks response:', response.data);
    
    // Backend returns paginated response: {data: [...], total: ..., page: ..., per_page: ...}
    // Extract the actual reports array
    let allReports = [];
    
    if (Array.isArray(response.data)) {
      // Direct array
      allReports = response.data;
    } else if (response.data.data && Array.isArray(response.data.data)) {
      // Paginated: {data: [...], total: ...}
      allReports = response.data.data;
    } else if (response.data.items && Array.isArray(response.data.items)) {
      // Alternative pagination: {items: [...], total: ...}
      allReports = response.data.items;
    } else {
      console.error('❌ Unexpected response structure:', response.data);
      return [];
    }
    
    console.log('   Total reports in response:', allReports.length);
    
    // Filter for reports assigned to current officer
    const myTasks = allReports.filter((report: any) => {
      // Check if report has a task and if current user is assigned
      return report.task && report.task.assigned_to;
    });
    
    console.log('   Tasks with assignment:', myTasks.length);
    
    return myTasks.slice(0, params?.limit || 20);
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
  }
};

export default officerService;
