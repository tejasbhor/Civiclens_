import apiClient from './apiClient';

// Types matching backend
export interface Report {
  id: number;
  report_number: string;
  title: string;
  description: string;
  category?: string;
  sub_category?: string;
  severity?: string;
  status: string;
  latitude: number;
  longitude: number;
  address?: string;
  landmark?: string;
  ward_number?: string;
  district?: string;
  state?: string;
  pincode?: string;
  user_id: number;
  citizen_id?: number; // Legacy field
  department_id?: number;
  officer_id?: number;
  created_at: string;
  updated_at: string;
  status_updated_at?: string;
  media?: MediaFile[];
  // Enhanced fields from backend
  user?: {
    id: number;
    full_name?: string;
    phone?: string;
    role?: string;
  };
  department?: {
    id: number;
    name?: string;
  };
  task?: {
    id: number;
    status?: string;
    assigned_to?: number;
    assigned_by?: number;
    priority?: number;
    notes?: string;
    assigned_at?: string;
    acknowledged_at?: string;
    started_at?: string;
    resolved_at?: string;
    officer?: {
      id: number;
      full_name?: string;
      email?: string;
      phone?: string;
      employee_id?: string;
      role?: string;
    };
  };
}

export interface MediaFile {
  id: number;
  file_url: string;
  file_type: 'image' | 'audio' | 'video';
  file_size?: number;
  mime_type?: string;
  caption?: string;
  is_primary: boolean;
  upload_source?: string;
  uploaded_at: string;
}

export interface CreateReportRequest {
  title: string;
  description: string;
  category?: string;
  sub_category?: string;
  severity?: string;
  latitude: number;
  longitude: number;
  address?: string;
  landmark?: string;
  ward_number?: string;
  district?: string;
  state?: string;
  pincode?: string;
}

export interface StatusHistoryItem {
  id: number;
  old_status: string | null;
  new_status: string;
  changed_at: string;
  changed_by_user?: {
    id: number;
    full_name: string;
    role: string;
  };
  notes?: string;
}

export interface StatusHistoryResponse {
  report_id: number;
  history: StatusHistoryItem[];
}

export const reportsService = {
  /**
   * Create a new report
   */
  async createReport(data: CreateReportRequest): Promise<Report> {
    const response = await apiClient.post('/reports/', data);
    return response.data;
  },

  /**
   * Get my reports (citizen's own reports)
   */
  async getMyReports(params?: {
    status?: string;
    category?: string;
    skip?: number;
    limit?: number;
  }): Promise<{ reports: Report[]; total: number }> {
    const response = await apiClient.get('/reports/my-reports', { params });
    // Backend returns array, we need to wrap it
    const reports = Array.isArray(response.data) ? response.data : [];
    return {
      reports,
      total: reports.length
    };
  },

  /**
   * Get report by ID
   */
  async getReportById(id: number): Promise<Report> {
    const response = await apiClient.get(`/reports/${id}`);
    return response.data;
  },

  /**
   * Get report status history
   */
  async getStatusHistory(id: number): Promise<StatusHistoryResponse> {
    const response = await apiClient.get(`/reports/${id}/history`);
    return response.data;
  },

  /**
   * Get report status history (alias)
   */
  async getReportStatusHistory(id: number): Promise<StatusHistoryResponse> {
    return this.getStatusHistory(id);
  },

  /**
   * Upload media files to a report
   */
  async uploadMedia(reportId: number, files: File[]): Promise<MediaFile[]> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await apiClient.post(
      `/media/upload/${reportId}/bulk`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  /**
   * Get media files for a report
   */
  async getReportMedia(reportId: number): Promise<MediaFile[]> {
    const response = await apiClient.get(`/media/report/${reportId}`);
    return response.data;
  },

  /**
   * Delete a media file
   */
  async deleteMedia(mediaId: number): Promise<void> {
    await apiClient.delete(`/media/${mediaId}`);
  },

  /**
   * Get report statistics
   */
  async getStats(): Promise<{
    total_reports: number;
    pending_reports: number;
    resolved_reports: number;
    in_progress_reports: number;
  }> {
    const response = await apiClient.get('/analytics/stats');
    return response.data;
  },
};
