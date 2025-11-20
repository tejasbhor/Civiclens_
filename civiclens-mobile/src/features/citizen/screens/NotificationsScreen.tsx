/**
 * NotificationsScreen - Display and manage user notifications
 * Mobile-optimized with pull-to-refresh and swipe actions
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '@shared/hooks/useNotifications';
import type { Notification } from '@shared/types/notification';
import { getNotificationIcon, getNotificationColor } from '@shared/types/notification';
import { formatDistanceToNow } from 'date-fns';
import { TopNavbar } from '@shared/components';

export const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation();
  const {
    notifications,
    unreadCount,
    loading,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    retry,
  } = useNotifications({ autoRefresh: true });

  const navigateToReportDetail = useCallback((reportId?: number) => {
    if (!reportId) return;
    (navigation as any).navigate('Reports', {
      screen: 'ReportDetail',
      params: { reportId },
    });
  }, [navigation]);

  const handleNotificationPress = useCallback(async (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Navigate based on related entity
    if (notification.related_report_id) {
      // Navigate to report detail
      navigateToReportDetail(notification.related_report_id);
    } else if (notification.related_task_id) {
      // Navigate to task detail
      // navigation.navigate('TaskDetail', { taskId: notification.related_task_id });
    }
  }, [markAsRead, navigateToReportDetail]);

  const handleDelete = useCallback((id: number) => {
    deleteNotification(id);
  }, [deleteNotification]);

  const renderNotificationItem = ({ item }: { item: Notification }) => {
    const iconName = getNotificationIcon(item.type);
    const priorityColor = getNotificationColor(item.priority);
    const timeAgo = formatDistanceToNow(new Date(item.created_at), { addSuffix: true });

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          !item.is_read && styles.unreadItem,
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.notificationContent}>
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: `${priorityColor}15` }]}>
            <Ionicons name={iconName as any} size={24} color={priorityColor} />
          </View>

          {/* Content */}
          <View style={styles.textContainer}>
            <View style={styles.headerRow}>
              <Text style={styles.title} numberOfLines={1}>
                {item.title}
              </Text>
              {!item.is_read && <View style={styles.unreadDot} />}
            </View>
            
            <Text style={styles.message} numberOfLines={2}>
              {item.message}
            </Text>
            
            <Text style={styles.time}>{timeAgo}</Text>
          </View>

          {/* Delete Button */}
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-circle" size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Priority Indicator */}
        {item.priority === 'critical' || item.priority === 'high' ? (
          <View style={[styles.priorityBar, { backgroundColor: priorityColor }]} />
        ) : null}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="notifications-off-outline" size={80} color="#CBD5E1" />
      <Text style={styles.emptyTitle}>No Notifications</Text>
      <Text style={styles.emptySubtitle}>
        You're all caught up! Check back later for updates.
      </Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorState}>
      <Ionicons name="alert-circle-outline" size={80} color="#EF4444" />
      <Text style={styles.errorTitle}>Failed to Load</Text>
      <Text style={styles.errorSubtitle}>
        {error?.message || 'Something went wrong'}
      </Text>
      <TouchableOpacity style={styles.retryButton} onPress={retry}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Reusable Top Navbar */}
      <TopNavbar
        title="Notifications"
        showBack={true}
        rightActions={
          unreadCount > 0 ? (
            <>
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>{unreadCount}</Text>
              </View>
              <TouchableOpacity
                style={styles.markAllButton}
                onPress={markAllAsRead}
              >
                <Ionicons name="checkmark-done" size={24} color="#FFF" />
              </TouchableOpacity>
            </>
          ) : null
        }
      />

      {/* Content */}
      <View style={styles.content}>
        {loading && notifications.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1976D2" />
            <Text style={styles.loadingText}>Loading notifications...</Text>
          </View>
        ) : error && notifications.length === 0 ? (
          renderErrorState()
        ) : (
          <FlatList
            data={notifications}
            renderItem={renderNotificationItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={renderEmptyState}
            refreshControl={
              <RefreshControl
                refreshing={loading && notifications.length > 0}
                onRefresh={refresh}
                colors={['#1976D2']}
                tintColor="#1976D2"
              />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
  },
  headerBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  markAllButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  notificationItem: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  unreadItem: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BFDBFE',
  },
  notificationContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
    marginLeft: 8,
  },
  message: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 8,
  },
  time: {
    fontSize: 12,
    color: '#94A3B8',
  },
  deleteButton: {
    padding: 4,
    marginLeft: 8,
  },
  priorityBar: {
    height: 3,
    width: '100%',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#EF4444',
    marginTop: 16,
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: '#1976D2',
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
