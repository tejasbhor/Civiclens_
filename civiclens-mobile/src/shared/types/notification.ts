/**
 * Notification types for mobile app
 */

export interface Notification {
  id: number;
  user_id: number;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  related_report_id?: number;
  related_task_id?: number;
  related_appeal_id?: number;
  related_escalation_id?: number;
  is_read: boolean;
  read_at?: string;
  action_url?: string;
  created_at: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  unread_count: number;
}

export interface UnreadCountResponse {
  unread_count: number;
}

export interface MarkReadResponse {
  success: boolean;
  message: string;
}

export type NotificationType =
  | 'status_change'
  | 'task_assigned'
  | 'task_acknowledged'
  | 'task_started'
  | 'task_completed'
  | 'verification_required'
  | 'resolution_approved'
  | 'resolution_rejected'
  | 'appeal_submitted'
  | 'appeal_reviewed'
  | 'feedback_received'
  | 'sla_warning'
  | 'sla_violated'
  | 'on_hold'
  | 'work_resumed'
  | 'escalation_created'
  | 'assignment_rejected';

export type NotificationPriority = 'critical' | 'high' | 'normal' | 'low';

/**
 * Notification constants
 */
export const NOTIFICATION_CONSTANTS = {
  // Polling intervals (in milliseconds)
  UNREAD_COUNT_POLL_INTERVAL: 30000, // 30 seconds
  NOTIFICATIONS_REFRESH_INTERVAL: 60000, // 1 minute
  
  // Limits
  BELL_NOTIFICATIONS_LIMIT: 5,
  PAGE_NOTIFICATIONS_LIMIT: 50,
  
  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
} as const;

/**
 * Get icon name for notification type
 */
export const getNotificationIcon = (type: NotificationType): string => {
  const iconMap: Record<NotificationType, string> = {
    resolution_approved: 'checkmark-circle',
    task_completed: 'checkmark-circle',
    status_change: 'time',
    task_started: 'time',
    work_resumed: 'time',
    task_assigned: 'alert-circle',
    task_acknowledged: 'chatbubble',
    verification_required: 'chatbubble',
    resolution_rejected: 'chatbubble',
    appeal_submitted: 'flag',
    appeal_reviewed: 'mail',
    feedback_received: 'megaphone',
    sla_warning: 'alert-circle',
    sla_violated: 'shield-alert',
    on_hold: 'hourglass',
    escalation_created: 'warning',
    assignment_rejected: 'close-circle',
  };
  
  return iconMap[type] || 'notifications';
};

/**
 * Get color for notification priority
 */
export const getNotificationColor = (priority: NotificationPriority): string => {
  const colorMap: Record<NotificationPriority, string> = {
    critical: '#EF4444',
    high: '#F97316',
    normal: '#3B82F6',
    low: '#6B7280',
  };
  
  return colorMap[priority] || '#3B82F6';
};
