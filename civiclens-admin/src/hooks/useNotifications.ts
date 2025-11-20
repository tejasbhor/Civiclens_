/**
 * Custom hook for notification management with retry logic and optimistic updates
 * Admin dashboard version
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { notificationsApi } from '@/lib/api/notifications';
import type { Notification, NotificationListResponse } from '@/types/notifications';
import { NOTIFICATION_CONSTANTS } from '@/types/notifications';
import { toast } from 'sonner';

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
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = NOTIFICATION_CONSTANTS.MAX_RETRIES,
  delay: number = NOTIFICATION_CONSTANTS.RETRY_DELAY
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
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
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchNotifications = useCallback(async () => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      setError(null);
      const response = await retryWithBackoff(async () => {
        return await notificationsApi.getNotifications({
          limit,
          unreadOnly,
        });
      });

      if (!abortController.signal.aborted) {
        setNotifications(response.notifications);
        setUnreadCount(response.unread_count);
        setLoading(false);
      }
    } catch (err) {
      if (!abortController.signal.aborted) {
        const error = err as Error;
        setError(error);
        setLoading(false);
        console.error('Failed to fetch notifications:', error);
        
        // Only show toast for non-aborted errors
        if (error.name !== 'AbortError') {
          toast.error('Failed to load notifications. Please try again.');
        }
      }
    }
  }, [limit, unreadOnly]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await retryWithBackoff(async () => {
        return await notificationsApi.getUnreadCount();
      });
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
      // Don't show toast for unread count failures (less critical)
    }
  }, []);

  // Initial load
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
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const markAsRead = useCallback(async (id: number) => {
    // Optimistic update
    const previousNotifications = [...notifications];
    const previousUnreadCount = unreadCount;

    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      await retryWithBackoff(async () => {
        return await notificationsApi.markAsRead(id);
      });
    } catch (err) {
      // Rollback on error
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
      
      const error = err as Error;
      console.error('Failed to mark as read:', error);
      toast.error('Failed to mark notification as read. Please try again.');
    }
  }, [notifications, unreadCount]);

  const markAllAsRead = useCallback(async () => {
    // Optimistic update
    const previousNotifications = [...notifications];
    const previousUnreadCount = unreadCount;

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);

    try {
      await retryWithBackoff(async () => {
        return await notificationsApi.markAllAsRead();
      });
      toast.success('All notifications marked as read.');
    } catch (err) {
      // Rollback on error
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
      
      const error = err as Error;
      console.error('Failed to mark all as read:', error);
      toast.error('Failed to mark all notifications as read. Please try again.');
    }
  }, [notifications, unreadCount]);

  const deleteNotification = useCallback(async (id: number) => {
    // Optimistic update
    const previousNotifications = [...notifications];
    const notification = notifications.find(n => n.id === id);
    const previousUnreadCount = unreadCount;

    setNotifications(prev => prev.filter(n => n.id !== id));
    if (notification && !notification.is_read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    try {
      await retryWithBackoff(async () => {
        return await notificationsApi.deleteNotification(id);
      });
      toast.success('Notification deleted.');
    } catch (err) {
      // Rollback on error
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
      
      const error = err as Error;
      console.error('Failed to delete notification:', error);
      toast.error('Failed to delete notification. Please try again.');
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


