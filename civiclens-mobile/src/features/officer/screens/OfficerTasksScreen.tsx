/**
 * OfficerTasksScreen - Production-Ready Task Management
 * Features: Stats cards, grouped tasks, action buttons, offline-first, consistent UI
 * References: Web client Tasks.tsx, Citizen MyReportsScreen.tsx
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { formatDistanceToNow } from 'date-fns';
import { RoleGuard } from '@shared/components';
import { TopNavbar } from '@shared/components/TopNavbar';
import { useOfficerTasks } from '@shared/hooks';
import { UserRole } from '@shared/types/user';
import { colors } from '@shared/theme/colors';
import {
  getStatusColor,
  getSeverityColor,
  calculateTaskStats,
  SEVERITY_ORDER,
  STATUS_ORDER,
  type TaskStats,
} from '../utils/taskHelpers';

interface Task {
  id: number;
  report_id: number;
  assigned_to: number;
  status: string;
  priority?: string;
  notes?: string;
  acknowledged_at?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  report?: {
    id: number;
    title: string;
    description: string;
    category: string;
    status: string;
    severity?: string; // ✅ Severity is on report object
    created_at: string;
    user?: {
      full_name: string;
      phone: string;
    };
    location?: {
      address: string;
    };
  };
}

// TaskStats moved to taskHelpers.ts for reusability

// Compact Stats Card Component (matching citizen reports)
const StatsCard: React.FC<{
  title: string;
  value: number;
  color?: string;
}> = ({ title, value, color = '#1E293B' }) => (
  <View style={styles.statsCard}>
    <Text style={[styles.statsValue, color !== '#1E293B' && { color }]}>{value}</Text>
    <Text style={styles.statsTitle}>{title}</Text>
  </View>
);

// Helper functions moved to ../utils/taskHelpers.ts for better code organization

// Task Card Component (Navigation only - actions available in detail page)
const TaskCard: React.FC<{ 
  task: Task; 
  onPress: () => void;
}> = ({ task, onPress }) => {
  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return 'No date';
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (err) {
      console.warn('Date format error:', err);
      return 'Invalid date';
    }
  };

  // Action buttons removed - all actions now happen from detail page
  // This ensures officers review full task details before taking action

  return (
    <TouchableOpacity style={styles.taskCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardContent}>
        {/* Task Info */}
        <View style={styles.taskInfo}>
          {/* Top Row: Number + Date */}
          <View style={styles.taskTopRow}>
            <Text style={styles.taskNumber}>#{task.report_id}</Text>
            <Text style={styles.dateText}>{formatDate(task.created_at)}</Text>
          </View>

          {/* Title */}
          <Text style={styles.taskTitle} numberOfLines={2}>
            {task.report?.title || `Report #${task.report_id}`}
          </Text>

          {/* Bottom Row: Status + Severity */}
          <View style={styles.taskBottomRow}>
            <View
              style={[
                styles.statusBadgeCompact,
                { backgroundColor: `${getStatusColor(task.status)}20` },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: getStatusColor(task.status) },
                ]}
              />
              <Text
                style={[
                  styles.statusTextCompact,
                  { color: getStatusColor(task.status) },
                ]}
              >
                {task.status.replace(/_/g, ' ')}
              </Text>
            </View>
            {task.report?.severity && (
              <View
                style={[
                  styles.severityBadgeCompact,
                  { backgroundColor: getSeverityColor(task.report.severity) },
                ]}
              >
                <Text style={styles.severityTextCompact}>
                  {task.report.severity.toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          {/* Actions moved to detail page - tap card to view details and take actions */}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const OfficerTasksContent: React.FC = () => {
  const navigation = useNavigation();
  const [componentError, setComponentError] = useState<string | null>(null);

  // Wrap hook in try-catch to catch initialization errors
  let hookResult;
  try {
    hookResult = useOfficerTasks();
  } catch (err: any) {
    console.error('❌ useOfficerTasks hook error:', err);
    setComponentError(err?.message || 'Failed to initialize tasks');
  }

  const {
    tasks = [],
    isLoading = false,
    isRefreshing = false,
    error = null,
    refreshTasks = async () => {},
    loadTasks = async () => {},
  } = hookResult || {};

  const [filter, setFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'severity' | 'status'>('created_at');

  // Load tasks on focus - memoized to prevent infinite loops
  const handleFocusLoad = useCallback(() => {
    console.log('📋 OfficerTasksScreen focused, loading tasks...');
    try {
      loadTasks();
    } catch (err) {
      console.error('❌ Error loading tasks:', err);
    }
  }, []); // ✅ Empty deps - loadTasks is stable from hook

  useFocusEffect(handleFocusLoad);

  // Calculate stats using utility function
  const stats: TaskStats = useMemo(() => calculateTaskStats(tasks), [tasks]);

  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    let filtered = [...tasks];

    // Apply status filter
    if (filter !== 'all') {
      filtered = filtered.filter(task => 
        task.status?.toUpperCase() === filter.toUpperCase()
      );
    }

    // Sort tasks
    filtered.sort((a, b) => {
      if (sortBy === 'created_at') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === 'severity') {
        return (SEVERITY_ORDER[a.report?.severity?.toUpperCase() || ''] ?? 999) - 
               (SEVERITY_ORDER[b.report?.severity?.toUpperCase() || ''] ?? 999);
      } else if (sortBy === 'status') {
        return (STATUS_ORDER[a.status?.toUpperCase()] ?? 999) - 
               (STATUS_ORDER[b.status?.toUpperCase()] ?? 999);
      }
      return 0;
    });

    return filtered;
  }, [tasks, filter, sortBy]);

  // Group tasks by status
  const groupedTasks = useMemo(() => {
    const groups: Record<string, Task[]> = {
      assigned: [],
      acknowledged: [],
      in_progress: [],
      pending_verification: [],
      on_hold: [],
      resolved: [],
      closed: []
    };

    filteredAndSortedTasks.forEach(task => {
      const status = task.status?.toLowerCase() || 'assigned';
      if (groups[status]) {
        groups[status].push(task);
      } else {
        groups.assigned.push(task);
      }
    });

    return groups;
  }, [filteredAndSortedTasks]);

  const handleTaskPress = useCallback((task: Task) => {
    // Navigate to task detail screen with report ID (tasks are embedded in reports)
    (navigation as any).navigate('TaskDetail', { taskId: task.report_id });
  }, [navigation]);

  const handleRefresh = useCallback(async () => {
    await refreshTasks();
  }, []); // ✅ refreshTasks is stable from hook

  // Removed unused handlers: handleAcknowledge, handleStartWork
  // All actions now happen from TaskDetail page

  const filterOptions = [
    { key: 'all', label: 'All', count: tasks.length },
    { key: 'assigned', label: 'Assigned', count: tasks.filter((t: Task) => t.status?.toUpperCase() === 'ASSIGNED').length },
    { key: 'in_progress', label: 'In Progress', count: tasks.filter((t: Task) => t.status?.toUpperCase() === 'IN_PROGRESS').length },
    { key: 'on_hold', label: 'On Hold', count: tasks.filter((t: Task) => t.status?.toUpperCase() === 'ON_HOLD').length },
  ];

  const renderFilterButton = ({ item }: { item: typeof filterOptions[0] }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filter === item.key && styles.filterButtonActive,
      ]}
      onPress={() => setFilter(item.key)}
    >
      <Text
        style={[
          styles.filterButtonText,
          filter === item.key && styles.filterButtonTextActive,
        ]}
      >
        {item.label} ({item.count})
      </Text>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="clipboard-outline" size={64} color={colors.textSecondary} />
      <Text style={styles.emptyStateTitle}>No Tasks Found</Text>
      <Text style={styles.emptyStateMessage}>
        {filter === 'all' 
          ? "You don't have any assigned tasks yet."
          : `No tasks with status "${filter.replace(/_/g, ' ')}".`
        }
      </Text>
      {filter !== 'all' && (
        <TouchableOpacity
          style={styles.resetFilterButton}
          onPress={() => setFilter('all')}
        >
          <Text style={styles.resetFilterButtonText}>Show All Tasks</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderTask = ({ item }: { item: Task }) => (
    <TaskCard 
      task={item} 
      onPress={() => handleTaskPress(item)}
    />
  );

  // Show component-level errors
  if (componentError) {
    return (
      <View style={styles.container}>
        <TopNavbar title="My Tasks" showNotifications />
        <View style={styles.errorState}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
          <Text style={styles.errorTitle}>Component Error</Text>
          <Text style={styles.errorMessage}>{componentError}</Text>
          <Text style={styles.errorMessage}>Check console for details</Text>
        </View>
      </View>
    );
  }

  // Show hook errors
  if (error) {
    return (
      <View style={styles.container}>
        <TopNavbar title="My Tasks" showNotifications />
        <View style={styles.errorState}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
          <Text style={styles.errorTitle}>Failed to Load Tasks</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadTasks()}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TopNavbar title="My Tasks" showNotifications />
      
      <View style={styles.content}>
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
        {/* Compact Stats Cards (matching citizen reports) */}
        <View style={styles.statsContainer}>
          <View style={styles.statsGrid}>
            <StatsCard title="Total" value={stats.total} />
            <StatsCard title="Active" value={stats.active} color="#FF9800" />
            <StatsCard title="Critical" value={stats.critical} color="#F44336" />
            <StatsCard title="Resolved" value={stats.resolved} color="#4CAF50" />
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterList}
          >
            {filterOptions.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.filterButton,
                  filter === option.key && styles.filterButtonActive,
                ]}
                onPress={() => setFilter(option.key)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    filter === option.key && styles.filterButtonTextActive,
                  ]}
                >
                  {option.label} ({option.count})
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Task List */}
        {isLoading && tasks.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading tasks...</Text>
          </View>
        ) : filteredAndSortedTasks.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={styles.taskListContainer}>
            {filteredAndSortedTasks.map((task) => (
              <View key={task.id}>
                {renderTask({ item: task })}
              </View>
            ))}
          </View>
        )}
        </ScrollView>
      </View>
    </View>
  );
};

export const OfficerTasksScreen: React.FC = () => {
  return (
    <RoleGuard allowedRoles={[UserRole.NODAL_OFFICER, UserRole.ADMIN, UserRole.AUDITOR]}>
      <OfficerTasksContent />
    </RoleGuard>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    flex: 1,
  },
  // Compact Stats (matching citizen reports)
  statsContainer: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statsCard: {
    alignItems: 'center',
    flex: 1,
  },
  statsValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 2,
  },
  statsTitle: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  // Filter Chips (matching citizen reports)
  filterContainer: {
    backgroundColor: '#FFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterList: {
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterButtonActive: {
    backgroundColor: '#1976D2',
    borderColor: '#1976D2',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  filterButtonTextActive: {
    color: '#FFF',
  },
  // Task List (matching citizen reports)
  taskListContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  taskCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardContent: {
    padding: 12,
  },
  taskInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  taskTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  taskNumber: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  dateText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    lineHeight: 18,
    marginBottom: 8,
  },
  taskBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statusBadgeCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    flex: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusTextCompact: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  severityBadgeCompact: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  severityTextCompact: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  // Action Buttons (compact style)
  taskActions: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    gap: 4,
  },
  actionButtonPrimary: {
    backgroundColor: '#1976D2',
  },
  actionButtonSuccess: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFF',
  },
  // Empty & Error States (matching citizen reports)
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    gap: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  emptyStateMessage: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  resetFilterButton: {
    marginTop: 16,
    backgroundColor: '#1976D2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  resetFilterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
  },
});
