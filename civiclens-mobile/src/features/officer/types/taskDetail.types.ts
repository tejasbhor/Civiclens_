/**
 * Task Detail Types
 * Type definitions for task detail screen
 */

export interface TaskDetailResponse {
  id: number;
  report_id: number;
  status: string;
  priority: number;
  notes?: string;
  resolution_notes?: string;
  sla_deadline?: string;
  sla_violated: number;
  assigned_at: string;
  acknowledged_at?: string;
  started_at?: string;
  resolved_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
  officer: {
    id: number;
    full_name: string;
    phone: string;
    employee_id?: string;
  };
  report: {
    id: number;
    report_number: string;
    title: string;
    description: string;
    category: string;
    severity: string;
    status: string;
    latitude: number;
    longitude: number;
    address: string;
    landmark?: string;
    created_at: string;
    updated_at: string;
    user: {
      id: number;
      full_name: string;
      phone: string;
    };
    department?: {
      id: number;
      name: string;
    };
    media: Array<{
      id: number;
      file_url: string;
      file_type: string;
      is_primary: boolean;
      upload_source?: string;
      caption?: string;
    }>;
  };
}

export interface TaskUpdate {
  id: number;
  task_id: number;
  update_type: string;
  notes?: string;
  created_at: string;
  created_by: {
    id: number;
    full_name: string;
  };
}
