import { apiClient } from './client';
import type {
  Notification,
  NotificationListResponse,
  UnreadCountResponse,
  MarkReadResponse,
} from '@/types/notifications';

// Re-export types for backward compatibility
export type {
  Notification,
  NotificationListResponse,
  UnreadCountResponse,
  MarkReadResponse,
};

export const notificationsApi = {
  /**
   * Get notifications for current user
   */
  async getNotifications(params?: {
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<NotificationListResponse> {
    const response = await apiClient.get('/notifications/', {
      params: {
        unread_only: params?.unreadOnly || false,
        limit: params?.limit || 50,
        offset: params?.offset || 0,
      },
    });
    return response.data;
  },

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get<UnreadCountResponse>('/notifications/unread-count');
    return response.data.unread_count;
  },

  /**
   * Get a specific notification
   */
  async getNotification(notificationId: number): Promise<Notification> {
    const response = await apiClient.get(`/notifications/${notificationId}`);
    return response.data;
  },

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: number): Promise<MarkReadResponse> {
    const response = await apiClient.post(`/notifications/${notificationId}/mark-read`);
    return response.data;
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<MarkReadResponse> {
    const response = await apiClient.post('/notifications/mark-all-read');
    return response.data;
  },

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: number): Promise<MarkReadResponse> {
    const response = await apiClient.delete(`/notifications/${notificationId}`);
    return response.data;
  },

  /**
   * Delete all read notifications
   */
  async deleteAllRead(): Promise<MarkReadResponse> {
    const response = await apiClient.delete('/notifications/');
    return response.data;
  },
};

