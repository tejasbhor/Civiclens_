/**
 * NotificationBell Component - Enhanced with Preview Modal
 * Shows notification count, preview modal, and navigates to full notifications
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useNotifications } from '@shared/hooks/useNotifications';
import { getNotificationIcon, getNotificationColor } from '@shared/types/notification';
import { formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '@store/authStore';

const { height } = Dimensions.get('window');

interface NotificationBellProps {
  onPress?: () => void;
  style?: any;
  size?: number;
  showBadge?: boolean;
  color?: string;
  variant?: 'default' | 'navbar';
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  onPress,
  style,
  size = 24,
  showBadge = true,
  color,
  variant = 'default',
}) => {
  const navigation = useNavigation();
  const [showPreview, setShowPreview] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));
  const { user } = useAuthStore();

  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
  } = useNotifications({ autoRefresh: true });

  // Check if user is an officer
  const isOfficer = user?.role === 'nodal_officer';

  // Get recent notifications for preview (max 5)
  const recentNotifications = notifications.slice(0, 5);

  // Determine icon color based on variant and props
  const iconColor = color || (variant === 'navbar' ? '#FFFFFF' : '#1976D2');

  const handleBellPress = () => {
    // Animate bell press
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    if (onPress) {
      onPress();
    } else {
      // Always show preview modal first (whether there are notifications or not)
      console.log('NotificationBell: Opening preview modal');
      setShowPreview(true);
    }
  };

  const navigateToDetail = (notification: any) => {
    if (isOfficer) {
      // Officers: Navigate to TaskDetail (nested in Tasks tab)
      if (notification.related_task_id) {
        (navigation as any).navigate('Tasks', {
          screen: 'TaskDetail',
          params: { taskId: notification.related_task_id },
        });
      }
    } else {
      // Citizens: Navigate to ReportDetail (nested in Reports tab)
      if (notification.related_report_id) {
        (navigation as any).navigate('Reports', {
          screen: 'ReportDetail',
          params: { reportId: notification.related_report_id },
        });
      }
    }
  };

  const handleNotificationPress = async (notification: any) => {
    // Mark as read
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Close preview
    setShowPreview(false);

    // Navigate based on user role
    navigateToDetail(notification);
  };

  const handleViewAll = () => {
    setShowPreview(false);
    (navigation as any).navigate('Notifications');
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    setShowPreview(false);
  };

  return (
    <>
      {/* Notification Bell */}
      <TouchableOpacity
        style={[styles.bellContainer, style]}
        onPress={handleBellPress}
        activeOpacity={0.7}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Ionicons 
            name={unreadCount > 0 ? "notifications" : "notifications-outline"} 
            size={size} 
            color={iconColor} 
          />
          
          {/* Badge */}
          {showBadge && unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </Animated.View>
      </TouchableOpacity>

      {/* Preview Modal */}
      <Modal
        visible={showPreview}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPreview(false)}
        onShow={() => console.log('NotificationBell: Modal is now visible')}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPreview(false)}
        >
          <View style={styles.previewContainer}>
            {/* Header */}
            <View style={styles.previewHeader}>
              <View style={styles.headerLeft}>
                <Ionicons name="notifications" size={20} color="#1976D2" />
                <Text style={styles.previewTitle}>Recent Notifications</Text>
              </View>
              
              {unreadCount > 0 && (
                <TouchableOpacity
                  style={styles.markAllButton}
                  onPress={handleMarkAllRead}
                >
                  <Text style={styles.markAllText}>Mark All Read</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Notifications List */}
            <ScrollView 
              style={styles.notificationsList}
              showsVerticalScrollIndicator={false}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading notifications...</Text>
                </View>
              ) : recentNotifications.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="notifications-off-outline" size={48} color="#CBD5E1" />
                  <Text style={styles.emptyTitle}>No Notifications</Text>
                  <Text style={styles.emptySubtitle}>You're all caught up!</Text>
                </View>
              ) : (
                recentNotifications.map((notification) => {
                  const iconName = getNotificationIcon(notification.type);
                  const priorityColor = getNotificationColor(notification.priority);
                  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { 
                    addSuffix: true 
                  });

                  return (
                    <TouchableOpacity
                      key={notification.id}
                      style={[
                        styles.notificationItem,
                        !notification.is_read && styles.unreadItem,
                      ]}
                      onPress={() => handleNotificationPress(notification)}
                      activeOpacity={0.7}
                    >
                      {/* Icon */}
                      <View style={[
                        styles.notificationIcon,
                        { backgroundColor: `${priorityColor}15` }
                      ]}>
                        <Ionicons 
                          name={iconName as any} 
                          size={18} 
                          color={priorityColor} 
                        />
                      </View>

                      {/* Content */}
                      <View style={styles.notificationContent}>
                        <View style={styles.notificationHeader}>
                          <Text 
                            style={styles.notificationTitle} 
                            numberOfLines={1}
                          >
                            {notification.title}
                          </Text>
                          {!notification.is_read && (
                            <View style={styles.unreadDot} />
                          )}
                        </View>
                        
                        <Text 
                          style={styles.notificationMessage} 
                          numberOfLines={2}
                        >
                          {notification.message}
                        </Text>
                        
                        <Text style={styles.notificationTime}>
                          {timeAgo}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            {/* Footer Actions */}
            <View style={styles.previewFooter}>
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={handleViewAll}
              >
                <LinearGradient
                  colors={['#1976D2', '#1565C0']}
                  style={styles.viewAllGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.viewAllText}>
                    View All Notifications
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  // Bell Container
  bellContainer: {
    position: 'relative',
    padding: 4,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 14,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-start',
    paddingTop: 100, // Position below navbar
  },
  previewContainer: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    borderRadius: 16,
    maxHeight: height * 0.7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
  },

  // Header
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  markAllButton: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976D2',
  },

  // Notifications List
  notificationsList: {
    maxHeight: 300,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },

  // Notification Items
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    gap: 12,
  },
  unreadItem: {
    backgroundColor: '#F8FAFC',
  },
  notificationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1976D2',
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 11,
    color: '#94A3B8',
  },

  // Footer
  previewFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  viewAllButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  viewAllGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 8,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
});
