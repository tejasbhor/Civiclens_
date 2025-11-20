'use client';

import React, { useEffect, useState } from 'react';
import { Search, Bell, ChevronDown, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/auth';
import { usersApi } from '@/lib/api/users';
import { notificationsApi, Notification } from '@/lib/api/notifications';
import { formatDistanceToNow } from 'date-fns';
import { AIEngineStatusDropdown } from '@/components/ai/AIEngineStatus';

export const TopNav: React.FC = () => {
  const router = useRouter();
  const [searchFocused, setSearchFocused] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [userName, setUserName] = useState<string | undefined>(undefined);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await usersApi.getMe();
        setUserName(me.full_name || undefined);
        setUserEmail(me.email || undefined);
      } catch {}
    })();
  }, []);

  // Fetch unread count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const count = await notificationsApi.getUnreadCount();
        setUnreadCount(count);
      } catch (error) {
        console.error('Failed to fetch unread count:', error);
      }
    };
    
    fetchUnreadCount();
    // Refresh every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (showNotifications) {
      const fetchNotifications = async () => {
        try {
          setLoadingNotifications(true);
          const response = await notificationsApi.getNotifications({
            limit: 5,
            unreadOnly: false,
          });
          setNotifications(response.notifications);
          setUnreadCount(response.unread_count);
        } catch (error) {
          console.error('Failed to fetch notifications:', error);
        } finally {
          setLoadingNotifications(false);
        }
      };
      fetchNotifications();
    }
  }, [showNotifications]);

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await notificationsApi.markAsRead(notificationId);
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }
    
    // Use related entities to navigate (ignore action_url as it may be incorrect)
    if (notification.related_report_id) {
      // Navigate to report detail page
      router.push(`/dashboard/reports/manage/${notification.related_report_id}`);
      setShowNotifications(false);
    } else if (notification.related_task_id) {
      // For tasks, navigate to tasks list page (task detail page doesn't exist)
      // Tasks are viewed through modals on the tasks list page
      router.push(`/dashboard/tasks`);
      setShowNotifications(false);
    } else if (notification.action_url) {
      // Fallback to action_url if no related entities
      router.push(notification.action_url);
      setShowNotifications(false);
    }
  };

  const goProfile = () => {
    setShowUserMenu(false);
    router.push('/profile/settings?tab=overview');
  };

  

  const onLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      setShowUserMenu(false);
      router.replace('/auth/login');
    }
  };


  return (
    <header className="fixed top-0 right-0 left-64 h-16 bg-white border-b border-gray-200 z-20">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Left: Search */}
        <div className="flex-1 max-w-2xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search reports, tasks, or locations..."
              className={cn(
                'w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg transition-all',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                searchFocused ? 'bg-white' : 'bg-gray-50'
              )}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3 ml-6">
          {/* AI Engine Status */}
          <AIEngineStatusDropdown />
          
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {loadingNotifications ? (
                    <div className="px-4 py-8 text-center text-sm text-gray-500">
                      Loading...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-gray-500">
                      No notifications
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={cn(
                          "px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100",
                          !notification.is_read && "bg-blue-50/50"
                        )}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start gap-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full mt-2 flex-shrink-0",
                            notification.priority === "critical" && "bg-red-500",
                            notification.priority === "high" && "bg-orange-500",
                            notification.priority === "normal" && "bg-blue-500",
                            notification.priority === "low" && "bg-gray-400"
                          )} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className={cn(
                                "text-sm font-medium text-gray-900",
                                !notification.is_read && "font-semibold"
                              )}>
                                {notification.title}
                              </p>
                              {!notification.is_read && (
                                <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-xs text-gray-400">
                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                              </p>
                              {!notification.is_read && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkAsRead(notification.id);
                                  }}
                                  className="text-xs text-blue-600 hover:underline"
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
                <div className="px-4 py-2 border-t border-gray-200">
                  <button 
                    onClick={() => {
                      router.push('/dashboard/notifications');
                      setShowNotifications(false);
                    }}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium w-full text-left"
                  >
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-primary-700">{(userName?.[0] || 'A').toUpperCase()}</span>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-600" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2">
                <div className="px-4 py-3 border-b border-gray-200">
                  <p className="text-sm font-semibold text-gray-900 truncate">{userName || 'User'}</p>
                  {userEmail && (
                    <p className="text-xs text-gray-500 truncate">{userEmail}</p>
                  )}
                </div>
                <button onClick={goProfile} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  My Profile
                </button>
                <div className="border-t border-gray-200 my-2"></div>
                <button onClick={onLogout} className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
