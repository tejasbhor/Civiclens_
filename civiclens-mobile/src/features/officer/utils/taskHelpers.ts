/**
 * Task Helper Utilities
 * Reusable helper functions for task management
 * Centralized for consistency and maintainability
 */

/**
 * Get color for task status
 */
export const getStatusColor = (status: string): string => {
  const statusMap: Record<string, string> = {
    assigned: '#FF9800',
    assigned_to_officer: '#FF9800',
    acknowledged: '#03A9F4',
    in_progress: '#FF9800',
    pending_verification: '#FFC107',
    on_hold: '#9E9E9E',
    resolved: '#4CAF50',
    closed: '#9E9E9E',
    rejected: '#F44336',
  };
  return statusMap[status?.toLowerCase()] || '#9E9E9E';
};

/**
 * Get color for severity level
 */
export const getSeverityColor = (severity: string): string => {
  const severityMap: Record<string, string> = {
    low: '#4CAF50',
    medium: '#FFC107',
    high: '#FF9800',
    critical: '#F44336',
  };
  return severityMap[severity?.toLowerCase()] || '#9E9E9E';
};

/**
 * Get severity badge colors (background, text, border)
 */
export const getSeverityBadgeColors = (severity: string): {
  backgroundColor: string;
  textColor: string;
  borderColor: string;
} => {
  const severityMap: Record<string, { backgroundColor: string; textColor: string; borderColor: string }> = {
    low: { backgroundColor: '#E8F5E9', textColor: '#2E7D32', borderColor: '#81C784' },
    medium: { backgroundColor: '#FFF9E6', textColor: '#F57C00', borderColor: '#FFB74D' },
    high: { backgroundColor: '#FFEBEE', textColor: '#E64A19', borderColor: '#FF8A65' },
    critical: { backgroundColor: '#FFEBEE', textColor: '#C62828', borderColor: '#EF5350' },
  };
  return severityMap[severity?.toLowerCase()] || {
    backgroundColor: '#F5F5F5',
    textColor: '#616161',
    borderColor: '#BDBDBD',
  };
};

/**
 * Severity order for sorting (0 = highest priority)
 */
export const SEVERITY_ORDER: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

/**
 * Status order for sorting (0 = highest priority)
 */
export const STATUS_ORDER: Record<string, number> = {
  ASSIGNED: 0,
  ASSIGNED_TO_OFFICER: 0,
  ACKNOWLEDGED: 1,
  IN_PROGRESS: 2,
  PENDING_VERIFICATION: 3,
  ON_HOLD: 4,
  RESOLVED: 5,
  CLOSED: 6,
  REJECTED: 7,
};

/**
 * Active status list (tasks that need action)
 */
export const ACTIVE_STATUSES = [
  'ASSIGNED',
  'ASSIGNED_TO_OFFICER',
  'ACKNOWLEDGED',
  'IN_PROGRESS',
  'PENDING_VERIFICATION',
  'ON_HOLD',
];

/**
 * Completed status list
 */
export const COMPLETED_STATUSES = ['RESOLVED', 'CLOSED'];

/**
 * Check if status is active
 */
export const isActiveStatus = (status: string): boolean => {
  return ACTIVE_STATUSES.includes(status?.toUpperCase() || '');
};

/**
 * Check if status is completed
 */
export const isCompletedStatus = (status: string): boolean => {
  return COMPLETED_STATUSES.includes(status?.toUpperCase() || '');
};

/**
 * Get priority level from task priority number
 */
export const getPriorityLevel = (priority: number): string => {
  if (priority >= 8) return 'Critical';
  if (priority >= 6) return 'High';
  if (priority >= 4) return 'Medium';
  return 'Low';
};

/**
 * Get priority color from task priority number
 */
export const getPriorityColor = (priority: number): string => {
  if (priority >= 8) return '#F44336';
  if (priority >= 6) return '#FF9800';
  if (priority >= 4) return '#FFC107';
  return '#4CAF50';
};

/**
 * Format task status for display
 */
export const formatStatus = (status: string): string => {
  return status?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Unknown';
};

/**
 * Calculate task stats from task array
 */
export interface TaskStats {
  total: number;
  active: number;
  critical: number;
  resolved: number;
}

export const calculateTaskStats = (tasks: any[]): TaskStats => {
  const activeTasks = tasks.filter((t) => isActiveStatus(t.status)).length;

  const criticalTasks = tasks.filter(
    (t) => t.report?.severity?.toUpperCase() === 'CRITICAL' && isActiveStatus(t.status)
  ).length;

  const resolvedTasks = tasks.filter((t) => isCompletedStatus(t.status)).length;

  return {
    total: tasks.length,
    active: activeTasks,
    critical: criticalTasks,
    resolved: resolvedTasks,
  };
};
