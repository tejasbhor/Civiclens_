/**
 * Notification API Service
 * Handles all notification-related API calls
 */

import { apiClient } from './apiClient';
import type {
  Notification,
  NotificationListResponse,
  UnreadCountResponse,
  MarkReadResponse,
} from '@shared/types/notification';

export const notificationApi = {
  /**
   * Get notifications for current user
   */
  async getNotifications(params?: {
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<NotificationListResponse> {
    const response = await apiClient.get<NotificationListResponse>('/notifications/', {
      params: {
        unread_only: params?.unreadOnly || false,
        limit: params?.limit || 50,
        offset: params?.offset || 0,
      },
    });
    return response;
  },

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get<UnreadCountResponse>('/notifications/unread-count');
    return response.unread_count;
  },

  /**
   * Get a specific notification
   */
  async getNotification(notificationId: number): Promise<Notification> {
    const response = await apiClient.get<Notification>(`/notifications/${notificationId}`);
    return response;
  },

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: number): Promise<MarkReadResponse> {
    const response = await apiClient.post<MarkReadResponse>(
      `/notifications/${notificationId}/mark-read`
    );
    return response;
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<MarkReadResponse> {
    const response = await apiClient.post<MarkReadResponse>('/notifications/mark-all-read');
    return response;
  },

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: number): Promise<MarkReadResponse> {
    const response = await apiClient.delete<MarkReadResponse>(`/notifications/${notificationId}`);
    return response;
  },

  /**
   * Delete all read notifications
   */
  async deleteAllRead(): Promise<MarkReadResponse> {
    const response = await apiClient.delete<MarkReadResponse>('/notifications/');
    return response;
  },
};
