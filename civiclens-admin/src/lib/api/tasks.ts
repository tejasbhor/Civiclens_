import { apiClient } from './client';

export interface Task {
  id: number;
  report_id: number;
  assigned_to: number;
  assigned_by?: number;
  status: TaskStatus;
  priority: number;
  notes?: string;
  resolution_notes?: string;
  assigned_at: string;
  acknowledged_at?: string;
  started_at?: string;
  resolved_at?: string;
  report?: {
    id: number;
    report_number: string;
    title: string;
    description: string;
    status: string;
    severity: string;
    category: string;
    sub_category?: string;
    address: string;
    latitude?: number;
    longitude?: number;
    created_at: string;
    updated_at: string;
    user?: {
      id: number;
      full_name: string;
      phone: string;
    };
    department?: {
      id: number;
      name: string;
    };
    media?: Array<{
      id: number;
      file_path: string;
      file_type: string;
      file_size: number;
      uploaded_at: string;
    }>;
  };
  officer?: {
    id: number;
    full_name: string;
    phone: string;
    email: string;
    role: string;
  };
}

export enum TaskStatus {
  ASSIGNED = 'assigned',
  ACKNOWLEDGED = 'acknowledged',
  IN_PROGRESS = 'in_progress',
  PENDING_VERIFICATION = 'pending_verification',
  RESOLVED = 'resolved',
  REJECTED = 'rejected',
  ON_HOLD = 'on_hold'
}

export interface TaskFilters {
  status?: TaskStatus;
  officer_id?: number;
  department_id?: number;
  priority?: number;
  search?: string;
  sort_by?: 'created_at' | 'priority' | 'status' | 'assigned_at';
  sort_order?: 'asc' | 'desc';
}

export interface TaskUpdate {
  status?: TaskStatus;
  priority?: number;
  notes?: string;
  resolution_notes?: string;
}

export interface TaskStats {
  total_tasks: number;
  status_distribution: Record<string, number>;
  priority_distribution: Record<string, number>;
  officer_workload: Array<{
    officer_id: number;
    officer_name: string;
    active_tasks: number;
  }>;
}

export interface PaginatedTasks {
  data: Task[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

class TasksAPI {
  /**
   * Get all tasks with filtering and pagination
   */
  async getTasks(
    page: number = 1,
    per_page: number = 20,
    filters: TaskFilters = {}
  ): Promise<PaginatedTasks> {
    const params = new URLSearchParams({
      skip: ((page - 1) * per_page).toString(),
      limit: per_page.toString(),
    });

    // Add filters to params
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response = await apiClient.get(`/tasks?${params.toString()}`);
    return response.data;
  }

  /**
   * Get task by ID with full details
   */
  async getTask(taskId: number): Promise<Task> {
    const response = await apiClient.get(`/tasks/${taskId}`);
    return response.data;
  }

  /**
   * Update task status, priority, or notes
   */
  async updateTask(taskId: number, updates: TaskUpdate): Promise<Task> {
    const response = await apiClient.put(`/tasks/${taskId}`, updates);
    return response.data;
  }

  /**
   * Reassign task to a different officer
   */
  async reassignTask(taskId: number, newOfficerId: number): Promise<{ message: string; task_id: number }> {
    const response = await apiClient.post(`/tasks/${taskId}/reassign`, {
      new_officer_id: newOfficerId
    });
    return response.data;
  }

  /**
   * Get task statistics overview
   */
  async getTaskStats(): Promise<TaskStats> {
    const response = await apiClient.get('/tasks/stats/overview');
    return response.data;
  }

  /**
   * Bulk update multiple tasks
   */
  async bulkUpdateTasks(taskIds: number[], updates: TaskUpdate): Promise<{ updated_count: number }> {
    const response = await apiClient.post('/tasks/bulk-update', {
      task_ids: taskIds,
      updates
    });
    return response.data;
  }
}

export const tasksApi = new TasksAPI();

// Helper functions
export const getTaskStatusColor = (status: TaskStatus): string => {
  switch (status) {
    case TaskStatus.ASSIGNED:
      return 'bg-blue-100 text-blue-800';
    case TaskStatus.ACKNOWLEDGED:
      return 'bg-indigo-100 text-indigo-800';
    case TaskStatus.IN_PROGRESS:
      return 'bg-yellow-100 text-yellow-800';
    case TaskStatus.PENDING_VERIFICATION:
      return 'bg-purple-100 text-purple-800';
    case TaskStatus.RESOLVED:
      return 'bg-green-100 text-green-800';
    case TaskStatus.REJECTED:
      return 'bg-red-100 text-red-800';
    case TaskStatus.ON_HOLD:
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getTaskStatusIcon = (status: TaskStatus): string => {
  switch (status) {
    case TaskStatus.ASSIGNED:
      return '📋';
    case TaskStatus.ACKNOWLEDGED:
      return '👀';
    case TaskStatus.IN_PROGRESS:
      return '🔄';
    case TaskStatus.PENDING_VERIFICATION:
      return '⏳';
    case TaskStatus.RESOLVED:
      return '✅';
    case TaskStatus.REJECTED:
      return '❌';
    case TaskStatus.ON_HOLD:
      return '⏸️';
    default:
      return '📋';
  }
};

export const getPriorityColor = (priority: number): string => {
  if (priority >= 8) return 'bg-red-100 text-red-800';
  if (priority >= 6) return 'bg-orange-100 text-orange-800';
  if (priority >= 4) return 'bg-yellow-100 text-yellow-800';
  return 'bg-green-100 text-green-800';
};

export const getPriorityLabel = (priority: number): string => {
  if (priority >= 8) return 'Critical';
  if (priority >= 6) return 'High';
  if (priority >= 4) return 'Medium';
  return 'Low';
};

export const formatTaskDuration = (startDate: string, endDate?: string): string => {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  const diffMs = end.getTime() - start.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
  } else {
    const diffMins = Math.floor(diffMs / (1000 * 60));
    return `${diffMins} min${diffMins !== 1 ? 's' : ''}`;
  }
};