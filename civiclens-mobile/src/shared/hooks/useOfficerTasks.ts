/**
 * Officer Tasks Hook - Manage officer task data with offline-first caching
 * Based on web client officerService implementation
 */

import { useState, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { offlineFirstApi } from '@shared/services/api/offlineFirstApi';
import { createLogger } from '@shared/utils/logger';

const log = createLogger('useOfficerTasks');

interface Task {
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
  report?: {
    id: number;
    title: string;
    description: string;
    category: string;
    status: string;
    created_at: string;
    user?: {
      full_name: string;
      phone: string;
    };
    location?: {
      address: string;
    };
  };
}

interface UseOfficerTasksReturn {
  tasks: Task[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  loadTasks: () => Promise<void>;
  refreshTasks: () => Promise<void>;
  acknowledgeTask: (reportId: number, notes?: string) => Promise<void>;
  startWork: (reportId: number, notes?: string) => Promise<void>;
  completeTask: (reportId: number, data: { status: string; notes?: string }) => Promise<void>;
  addUpdate: (reportId: number, updateText: string) => Promise<void>;
}

export const useOfficerTasks = (): UseOfficerTasksReturn => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { user, isAuthenticated } = useAuthStore();

  const loadTasks = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setError('User not authenticated');
      return;
    }

    // Validate user has officer role
    const officerRoles = ['NODAL_OFFICER', 'ADMIN', 'AUDITOR'];
    if (!officerRoles.includes(user.role.toUpperCase())) {
      setError(`Access denied. Officer role required. Current role: ${user.role}`);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      log.debug('Loading officer tasks...');

      // Fetch reports with task information
      // Based on web client implementation that uses /reports/ endpoint
      const response = await offlineFirstApi.get<any>('/reports/?page=1&per_page=100', {
        ttl: 2 * 60 * 1000, // 2 minutes cache
      });

      log.debug('Raw reports response:', response);

      // Extract reports array from response
      let allReports = [];
      if (Array.isArray(response)) {
        allReports = response;
      } else if (response?.data && Array.isArray(response.data)) {
        allReports = response.data;
      } else if (response?.items && Array.isArray(response.items)) {
        allReports = response.items;
      } else {
        log.error('Unexpected response structure:', response);
        setTasks([]);
        return;
      }

      log.debug(`Total reports in response: ${allReports.length}`);

      // Filter for reports assigned to current officer via task
      const myTasks = allReports.filter((report: any) => {
        return report.task && report.task.assigned_to === user.id;
      });

      log.debug(`Tasks assigned to officer ${user.id}: ${myTasks.length}`);

      // Transform reports to tasks format
      const transformedTasks: Task[] = myTasks.map((report: any) => ({
        id: report.task.id,
        report_id: report.id,
        assigned_to: report.task.assigned_to,
        assigned_by: report.task.assigned_by,
        status: report.task.status || 'ASSIGNED',
        priority: report.task.priority,
        notes: report.task.notes,
        acknowledged_at: report.task.acknowledged_at,
        started_at: report.task.started_at,
        completed_at: report.task.completed_at,
        created_at: report.task.created_at || report.created_at,
        updated_at: report.task.updated_at || report.updated_at,
        report: {
          id: report.id,
          title: report.title,
          description: report.description,
          category: report.category,
          status: report.status,
          created_at: report.created_at,
          user: report.user,
          location: report.location,
        },
      }));

      setTasks(transformedTasks);
      log.info(`✅ Loaded ${transformedTasks.length} officer tasks`);
    } catch (err: any) {
      log.error('Failed to load officer tasks:', err);
      setError(err.message || 'Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  }, [user, isAuthenticated]);

  const refreshTasks = useCallback(async () => {
    setIsRefreshing(true);
    await loadTasks();
    setIsRefreshing(false);
  }, [loadTasks]);

  const acknowledgeTask = useCallback(async (reportId: number, notes?: string) => {
    if (!isAuthenticated || !user) {
      throw new Error('User not authenticated');
    }

    try {
      log.debug(`Acknowledging task for report ${reportId}`);
      
      await offlineFirstApi.post(`/reports/${reportId}/acknowledge`, { notes });
      
      log.info(`✅ Task acknowledged for report ${reportId}`);
      
      // Refresh tasks to get updated status
      await loadTasks();
    } catch (err: any) {
      log.error(`Failed to acknowledge task for report ${reportId}:`, err);
      throw err;
    }
  }, [user, isAuthenticated, loadTasks]);

  const startWork = useCallback(async (reportId: number, notes?: string) => {
    if (!isAuthenticated || !user) {
      throw new Error('User not authenticated');
    }

    try {
      log.debug(`Starting work on report ${reportId}`);
      
      await offlineFirstApi.post(`/reports/${reportId}/start-work`, { notes });
      
      log.info(`✅ Work started on report ${reportId}`);
      
      // Refresh tasks to get updated status
      await loadTasks();
    } catch (err: any) {
      log.error(`Failed to start work on report ${reportId}:`, err);
      throw err;
    }
  }, [user, isAuthenticated, loadTasks]);

  const completeTask = useCallback(async (reportId: number, data: { status: string; notes?: string }) => {
    if (!isAuthenticated || !user) {
      throw new Error('User not authenticated');
    }

    try {
      log.debug(`Completing task for report ${reportId}`, data);
      
      await offlineFirstApi.put(`/reports/${reportId}`, data);
      
      log.info(`✅ Task completed for report ${reportId}`);
      
      // Refresh tasks to get updated status
      await loadTasks();
    } catch (err: any) {
      log.error(`Failed to complete task for report ${reportId}:`, err);
      throw err;
    }
  }, [user, isAuthenticated, loadTasks]);

  const addUpdate = useCallback(async (reportId: number, updateText: string) => {
    if (!isAuthenticated || !user) {
      throw new Error('User not authenticated');
    }

    try {
      log.debug(`Adding update to report ${reportId}:`, updateText);
      
      // Create FormData for multipart request (matching web client)
      const formData = new FormData();
      formData.append('update_text', updateText);
      
      await offlineFirstApi.post(`/reports/${reportId}/add-update`, formData);
      
      log.info(`✅ Update added to report ${reportId}`);
      
      // Refresh tasks to get updated data
      await loadTasks();
    } catch (err: any) {
      log.error(`Failed to add update to report ${reportId}:`, err);
      throw err;
    }
  }, [user, isAuthenticated, loadTasks]);

  return {
    tasks,
    isLoading,
    isRefreshing,
    error,
    loadTasks,
    refreshTasks,
    acknowledgeTask,
    startWork,
    completeTask,
    addUpdate,
  };
};
