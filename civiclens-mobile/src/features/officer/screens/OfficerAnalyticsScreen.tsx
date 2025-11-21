/**
 * Officer Analytics Screen - Production Ready
 * Shows comprehensive analytics and performance metrics for nodal officers
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../store/authStore';
import { officerAnalyticsService } from '../../../shared/services/officer/officerAnalyticsService';
import { TopNavbar } from '../../../shared/components';
import { colors } from '../../../shared/theme/colors';
import { format } from 'date-fns';

const { width } = Dimensions.get('window');

interface AnalyticsData {
  // Officer Stats
  total_tasks: number;
  assigned_tasks: number;
  in_progress_tasks: number;
  completed_tasks: number;
  on_hold_tasks: number;
  overdue_tasks: number;
  completion_rate: number;
  avg_resolution_time: number;

  // Dashboard Stats
  total_reports: number;
  pending_tasks: number;
  resolved_today: number;
  high_priority_count: number;
  critical_priority_count: number;
  reports_by_category: Record<string, number>;
  reports_by_status: Record<string, number>;
  reports_by_severity: Record<string, number>;
}

export default function OfficerAnalyticsScreen() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'performance' | 'overview'>('performance');

  const { user } = useAuthStore();

  const loadAnalytics = useCallback(async (showLoader = true) => {
    if (showLoader) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = await officerAnalyticsService.getAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadAnalytics(false);
  }, [loadAnalytics]);

  if (isLoading && !analytics) {
    return (
      <View style={styles.container}>
        <TopNavbar title="Analytics" showNotifications />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading Analytics...</Text>
        </View>
      </View>
    );
  }

  if (error && !analytics) {
    return (
      <View style={styles.container}>
        <TopNavbar title="Analytics" showNotifications />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={colors.error} />
          <Text style={styles.errorTitle}>Unable to Load Analytics</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadAnalytics()}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Navbar */}
      <TopNavbar 
        title="Analytics" 
        subtitle={format(new Date(), 'EEEE, MMM d')} 
        showNotifications
        rightActions={
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={() => loadAnalytics()}
          >
            <Ionicons name="refresh" size={22} color="#FFF" />
          </TouchableOpacity>
        }
      />

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'performance' && styles.activeTab]}
          onPress={() => setSelectedTab('performance')}
        >
          <Text
            style={[styles.tabText, selectedTab === 'performance' && styles.activeTabText]}
          >
            My Performance
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'overview' && styles.activeTab]}
          onPress={() => setSelectedTab('overview')}
        >
          <Text
            style={[styles.tabText, selectedTab === 'overview' && styles.activeTabText]}
          >
            Department Overview
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <ScrollView
          refreshControl={
            <RefreshControl 
              refreshing={isRefreshing} 
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {selectedTab === 'performance' ? (
            <PerformanceTab analytics={analytics} user={user} />
          ) : (
            <OverviewTab analytics={analytics} />
          )}
        </ScrollView>
      </View>
    </View>
  );
}

// Performance Tab Component
function PerformanceTab({ analytics, user }: { analytics: AnalyticsData | null; user: any }) {
  if (!analytics) return null;

  return (
    <>
      {/* Officer Info Card */}
      <View style={styles.card}>
        <View style={styles.officerHeader}>
          <View style={styles.officerAvatar}>
            <Ionicons name="person" size={32} color="#FFF" />
          </View>
          <View style={styles.officerInfo}>
            <Text style={styles.officerName}>{user?.full_name || 'Officer'}</Text>
            <Text style={styles.officerRole}>{user?.employee_id || 'N/A'}</Text>
          </View>
        </View>
      </View>

      {/* Key Metrics */}
      <Text style={styles.sectionTitle}>Key Metrics</Text>
      
      <View style={styles.metricsGrid}>
        <MetricCard
          icon="checkmark-circle"
          iconColor="#10B981"
          label="Completion Rate"
          value={`${analytics.completion_rate.toFixed(1)}%`}
        />
        <MetricCard
          icon="time"
          iconColor="#3B82F6"
          label="Avg Resolution"
          value={`${analytics.avg_resolution_time.toFixed(1)}h`}
        />
      </View>

      {/* Task Breakdown */}
      <Text style={styles.sectionTitle}>Task Breakdown</Text>
      
      <View style={styles.card}>
        <TaskBreakdownItem
          label="Total Tasks"
          value={analytics.total_tasks}
          color="#64748B"
          icon="list"
        />
        <TaskBreakdownItem
          label="Assigned"
          value={analytics.assigned_tasks}
          color="#3B82F6"
          icon="folder-open"
        />
        <TaskBreakdownItem
          label="In Progress"
          value={analytics.in_progress_tasks}
          color="#F59E0B"
          icon="play-circle"
        />
        <TaskBreakdownItem
          label="Completed"
          value={analytics.completed_tasks}
          color="#10B981"
          icon="checkmark-circle"
        />
        <TaskBreakdownItem
          label="On Hold"
          value={analytics.on_hold_tasks}
          color="#6366F1"
          icon="pause-circle"
        />
        <TaskBreakdownItem
          label="Overdue"
          value={analytics.overdue_tasks}
          color="#EF4444"
          icon="alert-circle"
          isLast
        />
      </View>

      {/* Performance Indicators */}
      <Text style={styles.sectionTitle}>Performance Indicators</Text>
      
      <View style={styles.card}>
        <PerformanceBar
          label="Task Completion"
          percentage={analytics.completion_rate}
          color="#10B981"
        />
        <View style={styles.divider} />
        <PerformanceBar
          label="Response Efficiency"
          percentage={calculateEfficiency(analytics.avg_resolution_time)}
          color="#3B82F6"
        />
      </View>
    </>
  );
}

// Overview Tab Component
function OverviewTab({ analytics }: { analytics: AnalyticsData | null }) {
  if (!analytics) return null;

  return (
    <>
      {/* Today's Stats */}
      <Text style={styles.sectionTitle}>Today's Activity</Text>
      
      <View style={styles.metricsGrid}>
        <MetricCard
          icon="checkmark-done"
          iconColor="#10B981"
          label="Resolved Today"
          value={analytics.resolved_today.toString()}
        />
        <MetricCard
          icon="time"
          iconColor="#F59E0B"
          label="Pending Tasks"
          value={analytics.pending_tasks.toString()}
        />
      </View>

      {/* Priority Alerts */}
      <Text style={styles.sectionTitle}>Priority Alerts</Text>
      
      <View style={styles.metricsGrid}>
        <MetricCard
          icon="warning"
          iconColor="#F59E0B"
          label="High Priority"
          value={analytics.high_priority_count.toString()}
        />
        <MetricCard
          icon="alert-circle"
          iconColor="#EF4444"
          label="Critical"
          value={analytics.critical_priority_count.toString()}
        />
      </View>

      {/* Department Stats */}
      <Text style={styles.sectionTitle}>Department Statistics</Text>
      
      <View style={styles.card}>
        <StatRow label="Total Reports" value={analytics.total_reports} icon="document-text" />
        <View style={styles.divider} />
        <StatRow label="Pending Tasks" value={analytics.pending_tasks} icon="hourglass" />
        <View style={styles.divider} />
        <StatRow
          label="Resolved Today"
          value={analytics.resolved_today}
          icon="checkmark-done-circle"
        />
      </View>

      {/* Category Breakdown */}
      <Text style={styles.sectionTitle}>Reports by Category</Text>
      
      <View style={styles.card}>
        {Object.entries(analytics.reports_by_category || {}).map(([category, count], index, arr) => (
          <React.Fragment key={category}>
            <CategoryItem
              category={category}
              count={count}
              total={analytics.total_reports}
            />
            {index < arr.length - 1 && <View style={styles.divider} />}
          </React.Fragment>
        ))}
      </View>

      {/* Status Breakdown */}
      <Text style={styles.sectionTitle}>Reports by Status</Text>
      
      <View style={styles.card}>
        {Object.entries(analytics.reports_by_status || {}).map(([status, count], index, arr) => (
          <React.Fragment key={status}>
            <StatusItem status={status} count={count} />
            {index < arr.length - 1 && <View style={styles.divider} />}
          </React.Fragment>
        ))}
      </View>
    </>
  );
}

// Helper Components
function MetricCard({
  icon,
  iconColor,
  label,
  value,
}: {
  icon: any;
  iconColor: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: iconColor + '20' }]}>
        <Ionicons name={icon} size={28} color={iconColor} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function TaskBreakdownItem({
  label,
  value,
  color,
  icon,
  isLast = false,
}: {
  label: string;
  value: number;
  color: string;
  icon: any;
  isLast?: boolean;
}) {
  return (
    <>
      <View style={styles.taskBreakdownRow}>
        <View style={styles.taskBreakdownLeft}>
          <View style={[styles.taskIcon, { backgroundColor: color + '20' }]}>
            <Ionicons name={icon} size={20} color={color} />
          </View>
          <Text style={styles.taskLabel}>{label}</Text>
        </View>
        <Text style={[styles.taskValue, { color }]}>{value}</Text>
      </View>
      {!isLast && <View style={styles.divider} />}
    </>
  );
}

function PerformanceBar({
  label,
  percentage,
  color,
}: {
  label: string;
  percentage: number;
  color: string;
}) {
  return (
    <View style={styles.performanceBarContainer}>
      <View style={styles.performanceBarHeader}>
        <Text style={styles.performanceBarLabel}>{label}</Text>
        <Text style={[styles.performanceBarValue, { color }]}>
          {percentage.toFixed(1)}%
        </Text>
      </View>
      <View style={styles.progressBarBg}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${Math.min(percentage, 100)}%`,
              backgroundColor: color,
            },
          ]}
        />
      </View>
    </View>
  );
}

function StatRow({ label, value, icon }: { label: string; value: number; icon: any }) {
  return (
    <View style={styles.statRow}>
      <View style={styles.statRowLeft}>
        <Ionicons name={icon} size={20} color="#64748B" />
        <Text style={styles.statRowLabel}>{label}</Text>
      </View>
      <Text style={styles.statRowValue}>{value}</Text>
    </View>
  );
}

function CategoryItem({
  category,
  count,
  total,
}: {
  category: string;
  count: number;
  total: number;
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  
  return (
    <View style={styles.categoryItem}>
      <View style={styles.categoryHeader}>
        <Text style={styles.categoryName}>{category}</Text>
        <Text style={styles.categoryCount}>{count}</Text>
      </View>
      <View style={styles.categoryBarBg}>
        <View
          style={[
            styles.categoryBarFill,
            { width: `${percentage}%` },
          ]}
        />
      </View>
      <Text style={styles.categoryPercentage}>{percentage.toFixed(1)}%</Text>
    </View>
  );
}

function StatusItem({ status, count }: { status: string; count: number }) {
  const statusColors: Record<string, string> = {
    submitted: '#3B82F6',
    under_review: '#F59E0B',
    assigned: '#8B5CF6',
    in_progress: '#06B6D4',
    resolved: '#10B981',
    closed: '#64748B',
    rejected: '#EF4444',
  };

  const color = statusColors[status.toLowerCase()] || '#64748B';

  return (
    <View style={styles.statusItem}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={styles.statusLabel}>{status.replace(/_/g, ' ')}</Text>
      <Text style={[styles.statusCount, { color }]}>{count}</Text>
    </View>
  );
}

// Helper Functions
function calculateEfficiency(avgResolutionTime: number): number {
  // Lower resolution time = higher efficiency
  // Assuming 24 hours is 100% efficient, 48 hours is 50% efficient
  if (avgResolutionTime === 0) return 100;
  const efficiency = Math.max(0, 100 - (avgResolutionTime / 24) * 50);
  return Math.min(efficiency, 100);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  errorMessage: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  refreshButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  officerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  officerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  officerInfo: {
    marginLeft: 16,
    flex: 1,
  },
  officerName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  officerRole: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
    marginTop: 8,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  metricIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  taskBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  taskBreakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  taskIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  taskLabel: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  taskValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  performanceBarContainer: {
    paddingVertical: 12,
  },
  performanceBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  performanceBarLabel: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  performanceBarValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  statRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statRowLabel: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  statRowValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  categoryItem: {
    paddingVertical: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
    textTransform: 'capitalize',
  },
  categoryCount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  categoryBarBg: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  categoryBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  categoryPercentage: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  statusLabel: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    textTransform: 'capitalize',
  },
  statusCount: {
    fontSize: 16,
    fontWeight: '600',
  },
});
