/**
 * Custom hook for notification management
 * Handles fetching, marking as read, and deleting notifications
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { notificationApi } from '@shared/services/api/notificationApi';
import type { Notification } from '@shared/types/notification';
import { NOTIFICATION_CONSTANTS } from '@shared/types/notification';
import { cacheService } from '@shared/services/storage/cacheService';

interface UseNotificationsOptions {
  limit?: number;
  unreadOnly?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
  retry: () => Promise<void>;
}

/**
 * Retry helper with exponential backoff
 * Don't retry on auth errors (401) - let the interceptor handle it
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = NOTIFICATION_CONSTANTS.MAX_RETRIES,
  delay: number = NOTIFICATION_CONSTANTS.RETRY_DELAY
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on auth errors - let user re-login
      if (error?.response?.status === 401 || error?.type === 'AUTH_ERROR') {
        console.log('🔐 Auth error detected, stopping retries');
        throw error;
      }
      
      // Don't retry on client errors (4xx except 401)
      if (error?.response?.status >= 400 && error?.response?.status < 500) {
        throw error;
      }
      
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
      }
    }
  }
  
  throw lastError!;
}

export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsReturn {
  const {
    limit = NOTIFICATION_CONSTANTS.PAGE_NOTIFICATIONS_LIMIT,
    unreadOnly = false,
    autoRefresh = false,
    refreshInterval = NOTIFICATION_CONSTANTS.NOTIFICATIONS_REFRESH_INTERVAL,
  } = options;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);
  const notificationsRef = useRef<Notification[]>([]);

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  const hydrateFromCache = useCallback(async () => {
    try {
      const cached = await cacheService.getCachedNotificationsSnapshot();
      if (cached && isMountedRef.current) {
        setNotifications(cached.notifications);
        setUnreadCount(cached.unreadCount);
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed to hydrate notifications cache:', err);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      setError(null);
      const response = await retryWithBackoff(async () => {
        return await notificationApi.getNotifications({
          limit,
          unreadOnly,
        });
      });

      if (isMountedRef.current) {
        setNotifications(response.notifications);
        setUnreadCount(response.unread_count);
        setLoading(false);
      }

      await cacheService.cacheNotificationsSnapshot({
        notifications: response.notifications,
        unreadCount: response.unread_count,
      });
    } catch (err: any) {
      if (isMountedRef.current) {
        const error = err as Error;
        
        // Don't set error state for auth errors - user will be redirected to login
        if (err?.response?.status !== 401 && err?.type !== 'AUTH_ERROR') {
          setError(error);
          console.error('Failed to fetch notifications:', error);
        }
        setLoading(false);
      }
    }
  }, [limit, unreadOnly]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await retryWithBackoff(async () => {
        return await notificationApi.getUnreadCount();
      });
      if (isMountedRef.current) {
        setUnreadCount(count);
      }

      await cacheService.cacheNotificationsSnapshot({
        notifications: notificationsRef.current,
        unreadCount: count,
      });
    } catch (err: any) {
      // Don't log auth errors - they're handled by interceptor
      if (err?.response?.status !== 401 && err?.type !== 'AUTH_ERROR') {
        console.error('Failed to fetch unread count:', err);
      }
    }
  }, []);

  // Initial load
  useEffect(() => {
    hydrateFromCache();
  }, [hydrateFromCache]);

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  // Auto-refresh if enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchUnreadCount();
      fetchNotifications();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchNotifications, fetchUnreadCount]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const markAsRead = useCallback(async (id: number) => {
    // Optimistic update
    const previousNotifications = [...notifications];
    const previousUnreadCount = unreadCount;
    const targetNotification = notifications.find(n => n.id === id);
    if (!targetNotification) {
      return;
    }

    const updatedNotifications = notifications.map(n =>
      n.id === id ? { ...n, is_read: true } : n
    );
    const updatedUnreadCount = !targetNotification.is_read
      ? Math.max(0, unreadCount - 1)
      : unreadCount;

    setNotifications(updatedNotifications);
    setUnreadCount(updatedUnreadCount);

    try {
      await retryWithBackoff(async () => {
        return await notificationApi.markAsRead(id);
      });
      await cacheService.cacheNotificationsSnapshot({
        notifications: updatedNotifications,
        unreadCount: updatedUnreadCount,
      });
    } catch (err) {
      // Rollback on error
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
      
      const error = err as Error;
      console.error('Failed to mark as read:', error);
      Alert.alert('Error', 'Failed to mark notification as read. Please try again.');
    }
  }, [notifications, unreadCount]);

  const markAllAsRead = useCallback(async () => {
    // Optimistic update
    const previousNotifications = [...notifications];
    const previousUnreadCount = unreadCount;

    const updatedNotifications = notifications.map(n =>
      n.is_read ? n : { ...n, is_read: true }
    );

    setNotifications(updatedNotifications);
    setUnreadCount(0);

    try {
      await retryWithBackoff(async () => {
        return await notificationApi.markAllAsRead();
      });
      await cacheService.cacheNotificationsSnapshot({
        notifications: updatedNotifications,
        unreadCount: 0,
      });
      Alert.alert('Success', 'All notifications marked as read.');
    } catch (err) {
      // Rollback on error
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
      
      const error = err as Error;
      console.error('Failed to mark all as read:', error);
      Alert.alert('Error', 'Failed to mark all notifications as read. Please try again.');
    }
  }, [notifications, unreadCount]);

  const deleteNotification = useCallback(async (id: number) => {
    // Optimistic update
    const previousNotifications = [...notifications];
    const previousUnreadCount = unreadCount;
    const notification = notifications.find(n => n.id === id);

    const updatedNotifications = notifications.filter(n => n.id !== id);
    const updatedUnreadCount = notification && !notification.is_read
      ? Math.max(0, unreadCount - 1)
      : unreadCount;

    setNotifications(updatedNotifications);
    setUnreadCount(updatedUnreadCount);

    try {
      await retryWithBackoff(async () => {
        return await notificationApi.deleteNotification(id);
      });
      await cacheService.cacheNotificationsSnapshot({
        notifications: updatedNotifications,
        unreadCount: updatedUnreadCount,
      });
    } catch (err) {
      // Rollback on error
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);

      const error = err as Error;
      console.error('Failed to delete notification:', error);
      Alert.alert('Error', 'Failed to delete notification. Please try again.');
    }
  }, [notifications, unreadCount]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchNotifications(), fetchUnreadCount()]);
  }, [fetchNotifications, fetchUnreadCount]);

  const retry = useCallback(async () => {
    setError(null);
    setLoading(true);
    await refresh();
  }, [refresh]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    retry,
  };
}
