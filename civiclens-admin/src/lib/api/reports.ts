import apiClient from './client';
import {
  Report,
  PaginatedResponse,
  ReportStatus,
} from '@/types';



export interface ClassifyReportRequest {
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  notes?: string;
}

export interface AssignDepartmentRequest {
  department_id: number;
  notes?: string;
}

export interface AssignOfficerRequest {
  officer_user_id: number;
  priority?: number; // 1-10
  notes?: string;
}

export interface StatusUpdateRequest {
  new_status: ReportStatus;
  notes?: string;
}

export interface StatusHistoryItem {
  old_status?: ReportStatus | null;
  new_status: ReportStatus;
  changed_by_user_id?: number | null;
  changed_by_user?: {
    id: number;
    email: string;
    full_name: string;
  } | null;
  notes?: string | null;
  changed_at: string;
}

export interface BulkOperationResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{ report_id: string; error: string }>;
  successful_ids: number[];
  failed_ids: number[];
}

export interface AutoAssignOfficerRequest {
  strategy?: 'least_busy' | 'balanced' | 'round_robin';
  priority?: number;
  notes?: string;
}

export interface BulkAutoAssignOfficerRequest {
  report_ids: number[];
  strategy?: 'least_busy' | 'balanced' | 'round_robin';
  priority?: number;
  notes?: string;
}

export interface AutoAssignmentResult {
  report_id: number;
  officer_id: number;
  officer_name: string;
  strategy_used: string;
  workload_score: number;
  active_reports: number;
  assignment_reason: string;
}

export interface OfficerWorkload {
  officer_id: number;
  user_id: number;
  full_name: string;
  email: string;
  phone: string;
  employee_id: string;
  active_reports: number;
  resolved_reports: number;
  avg_resolution_time_days: number;
  workload_score: number;
  capacity_level: 'low' | 'medium' | 'high';
  department_name?: string;
}

export interface DepartmentWorkloadSummary {
  department_id: number;
  total_officers: number;
  available_officers: number;
  high_workload_officers: number;
  total_active_reports: number;
  avg_workload_score: number;
  capacity_status: 'good' | 'moderate' | 'limited' | 'at_capacity' | 'no_officers';
  officers: OfficerWorkload[];
}

export interface StatusHistoryResponse {
  report_id: number;
  history: StatusHistoryItem[];
}

export interface CreateReportRequest {
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  address?: string;
  category?: string;
  sub_category?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface ReportFilters {
  status?: string;
  category?: string;
  department_id?: number;
  severity?: string;
  needs_review?: boolean;  // Filter for reports needing manual review
  search?: string;
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export const reportsApi = {
  // Create Report
  createReport: async (data: CreateReportRequest): Promise<Report> => {
    const response = await apiClient.post('/reports', data);
    return response.data;
  },

  getReports: async (filters?: ReportFilters): Promise<PaginatedResponse<Report>> => {
    const response = await apiClient.get('/reports', { params: filters });
    return response.data;
  },

  /**
   * Get optimized map data for heat map visualization
   * Returns only location data (lat, lng, severity, status, id) for performance
   */
  getMapData: async (params?: {
    status?: ReportStatus;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    category?: string;
    department_id?: number;
    limit?: number;
  }): Promise<{
    reports: Array<{
      id: number;
      lat: number;
      lng: number;
      severity: string;
      status: string;
      category?: string | null;
      report_number?: string | null;
      created_at?: string | null;
    }>;
    count: number;
    cached: boolean;
  }> => {
    const response = await apiClient.get('/reports/map-data', { params });
    return response.data;
  },

  getReportById: async (id: number): Promise<Report> => {
    const response = await apiClient.get(`/reports/${id}`);
    return response.data;
  },



  updateReport: async (id: number, data: Partial<Report>): Promise<Report> => {
    const response = await apiClient.put(`/reports/${id}`, data);
    return response.data;
  },

  deleteReport: async (id: number): Promise<void> => {
    await apiClient.delete(`/reports/${id}`);
  },

  getMyReports: async (): Promise<Report[]> => {
    const response = await apiClient.get('/reports/my-reports');
    return response.data;
  },

  // Classification
  classifyReport: async (id: number, payload: ClassifyReportRequest): Promise<Report> => {
    const response = await apiClient.put(`/reports/${id}/classify`, payload);
    return response.data;
  },

  // Phase 3: Assignment
  assignDepartment: async (id: number, payload: AssignDepartmentRequest): Promise<Report> => {
    const response = await apiClient.post(`/reports/${id}/assign-department`, payload);
    return response.data;
  },

  assignOfficer: async (id: number, payload: AssignOfficerRequest): Promise<Report> => {
    const response = await apiClient.post(`/reports/${id}/assign-officer`, payload);
    return response.data;
  },

  // Phase 3: Status transitions
  updateStatus: async (id: number, payload: StatusUpdateRequest): Promise<Report> => {
    const response = await apiClient.post(`/reports/${id}/status`, payload);
    return response.data;
  },

  // History
  getStatusHistory: async (id: number): Promise<StatusHistoryResponse> => {
    const response = await apiClient.get(`/reports/${id}/history`);
    return response.data;
  },

  // Auto-transitions (Officer workflow)
  acknowledgeReport: async (id: number): Promise<Report> => {
    const response = await apiClient.post(`/reports/${id}/acknowledge`);
    return response.data;
  },

  startWork: async (id: number): Promise<Report> => {
    const response = await apiClient.post(`/reports/${id}/start-work`);
    return response.data;
  },

  // Admin Verification
  approveResolution: async (id: number, approvalNotes?: string): Promise<Report> => {
    const formData = new FormData();
    if (approvalNotes) {
      formData.append('approval_notes', approvalNotes);
    }
    const response = await apiClient.post(`/reports/${id}/approve-resolution`, formData);
    return response.data;
  },

  rejectResolution: async (id: number, rejectionReason: string): Promise<Report> => {
    const formData = new FormData();
    formData.append('rejection_reason', rejectionReason);
    const response = await apiClient.post(`/reports/${id}/reject-resolution`, formData);
    return response.data;
  },

  // Bulk Operations
  bulkUpdateStatus: async (payload: {
    report_ids: number[];
    new_status: ReportStatus;
    notes?: string;
  }): Promise<BulkOperationResult> => {
    const response = await apiClient.post('/reports/bulk/status', payload);
    return response.data;
  },

  bulkAssignDepartment: async (payload: {
    report_ids: number[];
    department_id: number;
    notes?: string;
  }): Promise<BulkOperationResult> => {
    const response = await apiClient.post('/reports/bulk/assign-department', payload);
    return response.data;
  },

  bulkAssignOfficer: async (payload: {
    report_ids: number[];
    officer_user_id: number;
    priority?: number;
    notes?: string;
  }): Promise<BulkOperationResult> => {
    const response = await apiClient.post('/reports/bulk/assign-officer', payload);
    return response.data;
  },

  bulkUpdateSeverity: async (payload: {
    report_ids: number[];
    severity: 'low' | 'medium' | 'high' | 'critical';
  }): Promise<BulkOperationResult> => {
    const response = await apiClient.post('/reports/bulk/update-severity', payload);
    return response.data;
  },

  // Auto-Assignment with Intelligent Workload Balancing
  autoAssignOfficer: async (id: number, payload: AutoAssignOfficerRequest): Promise<{
    message: string;
    report_id: number;
    assignment: AutoAssignmentResult;
  }> => {
    const response = await apiClient.post(`/reports/${id}/auto-assign-officer`, payload);
    return response.data;
  },

  bulkAutoAssignOfficer: async (payload: BulkAutoAssignOfficerRequest): Promise<{
    message: string;
    result: BulkOperationResult;
    assignments: AutoAssignmentResult[];
  }> => {
    const response = await apiClient.post('/reports/bulk/auto-assign-officer', payload);
    return response.data;
  },

  // Workload Management
  getDepartmentWorkload: async (departmentId: number): Promise<{
    department: {
      id: number;
      name: string;
      description: string;
    };
    workload_summary: DepartmentWorkloadSummary;
    recommendations: {
      can_accept_assignments: boolean;
      suggested_strategy: string;
      capacity_warning: boolean;
    };
  }> => {
    const response = await apiClient.get(`/reports/workload/department/${departmentId}`);
    return response.data;
  },

  getAllOfficersWorkload: async (departmentId?: number): Promise<{
    department_id?: number;
    total_officers: number;
    officers: OfficerWorkload[];
  }> => {
    const params = departmentId ? { department_id: departmentId } : {};
    const response = await apiClient.get('/reports/workload/officers', { params });
    return response.data;
  },

  // Assignment Rejection Review
  reviewAssignmentRejection: async (
    id: number,
    action: 'reassign' | 'reclassify' | 'reject_report',
    options?: {
      newOfficerId?: number;
      newCategory?: string;
      newSeverity?: string;
      newDepartmentId?: number;
      notes?: string;
    }
  ): Promise<Report> => {
    const formData = new FormData();
    formData.append('action', action);
    if (options?.newOfficerId) {
      formData.append('new_officer_id', options.newOfficerId.toString());
    }
    if (options?.newCategory) {
      formData.append('new_category', options.newCategory);
    }
    if (options?.newSeverity) {
      formData.append('new_severity', options.newSeverity);
    }
    if (options?.newDepartmentId) {
      formData.append('new_department_id', options.newDepartmentId.toString());
    }
    if (options?.notes) {
      formData.append('notes', options.notes);
    }
    // Axios will automatically set Content-Type with correct boundary for FormData
    const response = await apiClient.post(`/reports/${id}/review-rejection`, formData);
    return response.data;
  },
};