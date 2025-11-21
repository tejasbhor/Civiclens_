/**
 * Task Detail Helper Functions
 * Utility functions for task detail screen
 */

// Re-export getMediaUrl from shared utils for backward compatibility
export { getMediaUrl } from '@shared/utils/mediaUtils';

export const getStatusColor = (status: string): string => {
  const statusMap: Record<string, string> = {
    assigned: '#FF9800',
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

export const getSeverityColor = (severity: string): string => {
  const severityMap: Record<string, string> = {
    low: '#4CAF50',
    medium: '#FFC107',
    high: '#FF9800',
    critical: '#F44336',
  };
  return severityMap[severity?.toLowerCase()] || '#9E9E9E';
};

export const getPriorityLabel = (priority: number): string => {
  if (priority <= 3) return 'High Priority';
  if (priority <= 7) return 'Medium Priority';
  return 'Low Priority';
};

export const getPriorityColor = (priority: number): string => {
  if (priority <= 3) return '#F44336';
  if (priority <= 7) return '#FF9800';
  return '#4CAF50';
};

export const formatStatus = (status: string): string => {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    return 'Invalid date';
  }
};

export const safeFormatDistanceToNow = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    
    // Import formatDistanceToNow from date-fns
    const { formatDistanceToNow } = require('date-fns');
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    return 'Invalid date';
  }
};
