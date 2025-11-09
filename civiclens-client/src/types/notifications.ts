/**
 * Shared notification types and constants
 * Used across all notification components
 */

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  priority: 'critical' | 'high' | 'normal' | 'low';
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
  | 'escalation_created';

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
  PAGE_NOTIFICATIONS_PER_PAGE: 20,
  
  // Debounce delays (in milliseconds)
  MARK_AS_READ_DEBOUNCE: 300,
  DELETE_DEBOUNCE: 500,
  
  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
} as const;

/**
 * Notification priority colors
 */
export const NOTIFICATION_PRIORITY_COLORS = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  normal: 'bg-blue-500',
  low: 'bg-gray-500',
} as const;

/**
 * Notification type icons mapping
 */
export const NOTIFICATION_TYPE_ICONS = {
  resolution_approved: 'CheckCircle2',
  task_completed: 'CheckCircle2',
  status_change: 'Clock',
  task_started: 'Clock',
  work_resumed: 'Clock',
  task_assigned: 'AlertCircle',
  task_acknowledged: 'MessageSquare',
  verification_required: 'MessageSquare',
  resolution_rejected: 'MessageSquare',
  appeal_submitted: 'Flag',
  appeal_reviewed: 'Mail',
  feedback_received: 'Megaphone',
  sla_warning: 'AlertCircle',
  sla_violated: 'ShieldAlert',
  on_hold: 'Hourglass',
  escalation_created: 'AlertTriangle',
} as const;


