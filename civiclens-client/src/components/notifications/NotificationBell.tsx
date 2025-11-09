/**
 * NotificationBell Component
 * Production-ready notification bell with unread count and popover
 */
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { notificationService } from "@/services/notificationService";
import type { Notification } from "@/types/notifications";
import { NOTIFICATION_CONSTANTS, NOTIFICATION_PRIORITY_COLORS } from "@/types/notifications";
import { getNotificationNavigationPath } from "@/utils/navigation";

interface NotificationBellProps {
  notificationsRoute: string;
  className?: string;
}

/**
 * Determine portal type from notifications route
 */
function getPortalType(route: string): 'citizen' | 'officer' | 'admin' {
  if (route.startsWith('/citizen')) return 'citizen';
  if (route.startsWith('/officer')) return 'officer';
  if (route.startsWith('/dashboard') || route.startsWith('/admin')) return 'admin';
  return 'citizen'; // Default
}

export const NotificationBell = ({ notificationsRoute, className }: NotificationBellProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [markingAsRead, setMarkingAsRead] = useState<Set<number>>(new Set());

  const portalType = useMemo(() => getPortalType(notificationsRoute), [notificationsRoute]);

  // Fetch unread count with retry logic
  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
      // Don't show toast for unread count failures (less critical)
    }
  }, []);

  // Fetch recent notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await notificationService.getNotifications({
        limit: NOTIFICATION_CONSTANTS.BELL_NOTIFICATIONS_LIMIT,
        unreadOnly: false,
      });
      setNotifications(response.notifications);
      setUnreadCount(response.unread_count);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Initial load and polling for unread count
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, NOTIFICATION_CONSTANTS.UNREAD_COUNT_POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Fetch notifications when popover opens
  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open, fetchNotifications]);

  // Debounced mark as read with optimistic update
  const handleMarkAsRead = useCallback(async (notificationId: number) => {
    // Prevent duplicate requests
    if (markingAsRead.has(notificationId)) return;
    
    setMarkingAsRead(prev => new Set(prev).add(notificationId));
    
    // Optimistic update
    const previousNotifications = [...notifications];
    const previousUnreadCount = unreadCount;
    
    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      // Debounce the API call
      await new Promise(resolve => setTimeout(resolve, NOTIFICATION_CONSTANTS.MARK_AS_READ_DEBOUNCE));
      await notificationService.markAsRead(notificationId);
    } catch (error) {
      // Rollback on error
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
      console.error("Failed to mark as read:", error);
    } finally {
      setMarkingAsRead(prev => {
        const next = new Set(prev);
        next.delete(notificationId);
        return next;
      });
    }
  }, [notifications, unreadCount]);

  // Handle notification click with validated navigation
  const handleNotificationClick = useCallback((notification: Notification) => {
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }
    
    const path = getNotificationNavigationPath(notification, portalType);
    if (path) {
      navigate(path);
      setOpen(false);
    } else {
      toast({
        title: "Navigation Error",
        description: "Unable to navigate to this notification",
        variant: "destructive",
      });
    }
  }, [handleMarkAsRead, navigate, portalType, toast]);

  const getPriorityColor = useCallback((priority: string) => {
    return NOTIFICATION_PRIORITY_COLORS[priority as keyof typeof NOTIFICATION_PRIORITY_COLORS] || NOTIFICATION_PRIORITY_COLORS.normal;
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative", className)}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          aria-describedby={unreadCount > 0 ? "unread-count" : undefined}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <>
              <span 
                className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" 
                aria-hidden="true"
                id="unread-count"
              />
              <span className="sr-only">{unreadCount} unread notifications</span>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0" 
        align="end"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground" id="notifications-heading">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="default" aria-label={`${unreadCount} new notifications`}>
                {unreadCount} new
              </Badge>
            )}
          </div>
        </div>
        <div 
          className="max-h-96 overflow-y-auto"
          role="list"
          aria-labelledby="notifications-heading"
        >
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground" role="status" aria-live="polite">
              <span className="sr-only">Loading notifications</span>
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground" role="status">
              No notifications
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                role="listitem"
                className={cn(
                  "p-4 border-b cursor-pointer hover:bg-accent transition-colors focus-within:bg-accent",
                  !notification.is_read && "bg-accent/50"
                )}
                onClick={() => handleNotificationClick(notification)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleNotificationClick(notification);
                  }
                }}
                tabIndex={0}
                aria-label={`${notification.title}. ${notification.message}`}
              >
                <div className="flex items-start gap-3">
                  <div 
                    className={cn(
                      "w-2 h-2 rounded-full mt-2 flex-shrink-0",
                      getPriorityColor(notification.priority)
                    )}
                    aria-hidden="true"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 
                        className={cn(
                          "text-sm font-semibold",
                          !notification.is_read && "font-bold"
                        )}
                      >
                        {notification.title}
                      </h4>
                      {!notification.is_read && (
                        <span 
                          className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1"
                          aria-label="Unread"
                        />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </span>
                      {!notification.is_read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notification.id);
                          }}
                          className="text-xs text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary rounded"
                          aria-label={`Mark ${notification.title} as read`}
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="p-4 border-t">
          <Button
            variant="ghost"
            className="w-full text-sm"
            onClick={() => {
              navigate(notificationsRoute);
              setOpen(false);
            }}
            aria-label="View all notifications"
          >
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
