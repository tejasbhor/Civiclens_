/**
 * Enhanced Dashboard Screen - Instagram-Like Experience
 * Shows cached data immediately, loads fresh data in background
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { TopNavbar } from '@shared/components';
import { useDashboardStore } from '@store/dashboardStore';
import { useEnhancedReportStore } from '@store/enhancedReportStore';
import { useAuthStore } from '@store/authStore';
import { networkService } from '@shared/services/network/networkService';
import { getContentContainerStyle } from '@shared/utils/screenPadding';

interface OfflineIndicatorProps {
  isOffline: boolean;
  lastSync: number | null;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ isOffline, lastSync }) => {
  if (!isOffline && !lastSync) return null;

  const getLastSyncText = () => {
    if (!lastSync) return 'Never synced';
    
    const now = Date.now();
    const diff = now - lastSync;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just synced';
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  };

  return (
    <View style={[styles.offlineIndicator, isOffline && styles.offlineIndicatorRed]}>
      <Ionicons 
        name={isOffline ? "cloud-offline" : "cloud-done"} 
        size={16} 
        color={isOffline ? "#F44336" : "#4CAF50"} 
      />
      <Text style={[styles.offlineText, isOffline && styles.offlineTextRed]}>
        {isOffline ? 'Offline' : getLastSyncText()}
      </Text>
    </View>
  );
};

interface StatsCardProps {
  title: string;
  value: number;
  icon: string;
  color: string;
  loading?: boolean;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, color, loading }) => (
  <View style={styles.statsCard}>
    <LinearGradient
      colors={[`${color}15`, `${color}05`]}
      style={styles.statsCardGradient}
    >
      <View style={styles.statsCardHeader}>
        <View style={[styles.statsIcon, { backgroundColor: `${color}20` }]}>
          <Ionicons name={icon as any} size={24} color={color} />
        </View>
        {loading && <ActivityIndicator size="small" color={color} />}
      </View>
      
      <View style={styles.statsCardContent}>
        <Text style={styles.statsValue}>
          {loading ? '--' : value.toLocaleString()}
        </Text>
        <Text style={styles.statsTitle}>{title}</Text>
      </View>
    </LinearGradient>
  </View>
);

interface QuickActionProps {
  title: string;
  icon: string;
  color: string;
  onPress: () => void;
  badge?: number;
}

const QuickAction: React.FC<QuickActionProps> = ({ title, icon, color, onPress, badge }) => (
  <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.quickActionIcon, { backgroundColor: `${color}15` }]}>
      <Ionicons name={icon as any} size={28} color={color} />
      {badge !== undefined && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
    </View>
    <Text style={styles.quickActionTitle}>{title}</Text>
  </TouchableOpacity>
);

export const EnhancedDashboardScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [isOnline, setIsOnline] = useState(networkService.isOnline());
  
  // Store hooks
  const { stats, isLoading, error, fetchDashboardData, refreshDashboard, lastRefresh } = useDashboardStore();
  const { 
    unsyncedCount, 
    queueStatus, 
    fetchMyReports, 
    preloadRecentReports,
    refreshAll 
  } = useEnhancedReportStore();
  const { user } = useAuthStore();

  // Network status listener
  useEffect(() => {
    const unsubscribe = networkService.addListener((status) => {
      setIsOnline(status.isConnected && status.isInternetReachable !== false);
    });
    return unsubscribe;
  }, []);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      // Load dashboard data (will use cache if available)
      await fetchDashboardData();
      
      // Load recent reports in background
      fetchMyReports().catch(() => {}); // Ignore errors
      
      // Preload additional data if online
      if (isOnline) {
        preloadRecentReports().catch(() => {}); // Ignore errors
      }
    };

    loadData();
  }, []);

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    if (isOnline) {
      await refreshAll();
      await refreshDashboard();
    } else {
      // Offline refresh - just reload from cache
      await fetchDashboardData();
      await fetchMyReports();
    }
  }, [isOnline, refreshAll, refreshDashboard, fetchDashboardData, fetchMyReports]);

  const isRefreshing = useDashboardStore(state => state.isLoading) || useEnhancedReportStore(state => state.refreshing);

  return (
    <View style={styles.container}>
      <TopNavbar
        title={`Welcome, ${user?.full_name?.split(' ')[0] || 'Citizen'}`}
        subtitle={isOnline ? 'CivicLens Dashboard' : 'Offline Mode'}
        showBack={false}
        rightComponent={
          <OfflineIndicator isOffline={!isOnline} lastSync={lastRefresh} />
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={getContentContainerStyle(insets)}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#1976D2']}
            tintColor="#1976D2"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Error Banner */}
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={20} color="#F44336" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Stats Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Impact</Text>
          <View style={styles.statsGrid}>
            <StatsCard
              title="Issues Raised"
              value={stats?.issuesRaised || 0}
              icon="flag"
              color="#1976D2"
              loading={isLoading && !stats}
            />
            <StatsCard
              title="In Progress"
              value={stats?.inProgress || 0}
              icon="time"
              color="#FF9800"
              loading={isLoading && !stats}
            />
            <StatsCard
              title="Resolved"
              value={stats?.resolved || 0}
              icon="checkmark-circle"
              color="#4CAF50"
              loading={isLoading && !stats}
            />
            <StatsCard
              title="Total Reports"
              value={stats?.total || 0}
              icon="bar-chart"
              color="#9C27B0"
              loading={isLoading && !stats}
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <QuickAction
              title="Submit Report"
              icon="add-circle"
              color="#1976D2"
              onPress={() => {/* Navigate to submit */}}
            />
            <QuickAction
              title="My Reports"
              icon="list"
              color="#4CAF50"
              onPress={() => {/* Navigate to reports */}}
            />
            <QuickAction
              title="Nearby Issues"
              icon="location"
              color="#FF9800"
              onPress={() => {/* Navigate to map */}}
            />
            <QuickAction
              title="Sync Queue"
              icon="sync"
              color="#9C27B0"
              onPress={() => {/* Show sync status */}}
              badge={unsyncedCount}
            />
          </View>
        </View>

        {/* Queue Status (if items pending) */}
        {queueStatus && (queueStatus.pending > 0 || queueStatus.failed > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sync Status</Text>
            <View style={styles.queueCard}>
              <View style={styles.queueHeader}>
                <Ionicons name="cloud-upload" size={24} color="#1976D2" />
                <Text style={styles.queueTitle}>Offline Submissions</Text>
              </View>
              
              <View style={styles.queueStats}>
                {queueStatus.pending > 0 && (
                  <View style={styles.queueStat}>
                    <Text style={styles.queueStatNumber}>{queueStatus.pending}</Text>
                    <Text style={styles.queueStatLabel}>Pending</Text>
                  </View>
                )}
                {queueStatus.processing > 0 && (
                  <View style={styles.queueStat}>
                    <Text style={styles.queueStatNumber}>{queueStatus.processing}</Text>
                    <Text style={styles.queueStatLabel}>Processing</Text>
                  </View>
                )}
                {queueStatus.failed > 0 && (
                  <View style={styles.queueStat}>
                    <Text style={[styles.queueStatNumber, { color: '#F44336' }]}>{queueStatus.failed}</Text>
                    <Text style={styles.queueStatLabel}>Failed</Text>
                  </View>
                )}
              </View>

              <Text style={styles.queueDescription}>
                {isOnline 
                  ? 'Reports will sync automatically'
                  : 'Reports will sync when you\'re back online'
                }
              </Text>
            </View>
          </View>
        )}

        {/* Recent Activity Placeholder */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.placeholderCard}>
            <Ionicons name="time-outline" size={48} color="#E0E0E0" />
            <Text style={styles.placeholderText}>Recent activity will appear here</Text>
            <Text style={styles.placeholderSubtext}>
              {isOnline ? 'Loading...' : 'Available when online'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  
  // Offline Indicator
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  offlineIndicatorRed: {
    backgroundColor: '#FFEBEE',
  },
  offlineText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  offlineTextRed: {
    color: '#F44336',
  },

  // Error Banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#D32F2F',
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
    marginHorizontal: 16,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  statsCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  statsCardGradient: {
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
  },
  statsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statsIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsCardContent: {
    alignItems: 'flex-start',
  },
  statsValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  statsTitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },

  // Quick Actions
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 16,
  },
  quickAction: {
    flex: 1,
    minWidth: '40%',
    alignItems: 'center',
    padding: 16,
  },
  quickActionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#F44336',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
  },

  // Queue Status
  queueCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  queueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  queueTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  queueStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  queueStat: {
    alignItems: 'center',
  },
  queueStatNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1976D2',
  },
  queueStatLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  queueDescription: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },

  // Placeholder
  placeholderCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  placeholderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 12,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#CBD5E1',
    marginTop: 4,
  },
});
