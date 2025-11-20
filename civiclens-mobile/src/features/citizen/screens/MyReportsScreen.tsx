/**
 * MyReportsScreen - Production-Ready List with Filters & Stats
 * Features: Stats cards, filters, pagination, offline-first architecture
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useReportStore } from '@store/reportStore';
import { reportApi } from '@shared/services/api/reportApi';
import type { ReportsStackParamList } from '@/navigation/CitizenTabNavigator';
import { TopNavbar } from '@shared/components';
import { getContentContainerStyle } from '@shared/utils/screenPadding';
import { submissionQueue, QueueStatus } from '@shared/services/queue/submissionQueue';

interface ReportStats {
  total: number;
  received: number;
  in_progress: number;
  resolved: number;
  closed: number;
}

type ReportsScreenNavigationProp = NativeStackNavigationProp<ReportsStackParamList, 'ReportsList'>;

export const MyReportsScreen: React.FC = () => {
  const navigation = useNavigation<ReportsScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const { reports, loading, error, fetchMyReports, clearError } = useReportStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [backendReports, setBackendReports] = useState<any[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  
  // Filters
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  // Offline submission tracking
  const [queueStatus, setQueueStatus] = useState<QueueStatus>({ pending: 0, processing: 0, completed: 0, failed: 0, total: 0 });


  const SEVERITY_FILTERS = [
    { value: 'all', label: 'All Severity' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' },
  ];

  // PRODUCTION FIX: Debounce mechanism to prevent rapid API calls
  const [lastLoadTime, setLastLoadTime] = useState(0);
  const LOAD_DEBOUNCE_MS = 1000; // Minimum 1 second between loads
  
  // PRODUCTION FIX: Circuit breaker to prevent infinite loops
  const [errorCount, setErrorCount] = useState(0);
  const [isCircuitOpen, setIsCircuitOpen] = useState(false);
  const MAX_ERRORS = 3;

  // PRODUCTION FIX: Simplified focus effect to prevent infinite loops
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  
  useFocusEffect(
    useCallback(() => {
      // Only load once when screen is focused for the first time
      if (!hasInitialLoad && !isCircuitOpen) {
        console.log('Initial load on focus');
        loadReports(true);
        setHasInitialLoad(true);
      }
      
      // Load offline queue status
      loadQueueStatus();
    }, [hasInitialLoad, isCircuitOpen])
  );
  
  // Load queue status and items
  const loadQueueStatus = useCallback(() => {
    try {
      const status = submissionQueue.getQueueStatus();
      setQueueStatus(status);
      console.log('Queue status loaded', status);
    } catch (error) {
      console.error('Failed to load queue status', error);
    }
  }, []);

  // Listen for queue updates
  useEffect(() => {
    const handleQueueUpdate = (status: QueueStatus) => {
      setQueueStatus(status);
      console.log('Queue status updated', status);
    };

    submissionQueue.addListener(handleQueueUpdate);
    
    // Initial load
    loadQueueStatus();

    return () => {
      submissionQueue.removeListener(handleQueueUpdate);
    };
  }, [loadQueueStatus]);

  useEffect(() => {
    // Load stats whenever reports change or on mount
    loadStats();
  }, [backendReports.length, reports.length]);
  
  // PRODUCTION FIX: Handle filter changes - only reload if we need fresh backend data
  useEffect(() => {
    if (hasInitialLoad && !isCircuitOpen) {
      console.log('Filters changed, applying client-side filtering');
      // For better performance, we apply filters client-side instead of reloading from backend
      // Only reload from backend if we don't have enough data or need fresh data
      if (backendReports.length === 0) {
        console.log('No backend data, loading from API with filters');
        loadReports(true);
      }
    }
  }, [selectedStatus, selectedSeverity]);
  
  useEffect(() => {
    // Also reload stats when filters change
    if (backendReports.length > 0 || reports.length > 0) {
      loadStats();
    }
  }, [selectedStatus, selectedSeverity]);

  const getStatusBreakdown = async () => {
    try {
      // Fetch a sample of reports to get accurate status breakdown
      const data = await reportApi.getMyReports({
        skip: 0,
        limit: 100, // Get more reports for accurate count
        filters: {}, // No filters to get all statuses
      });

      console.log(`Fetched ${data.length} reports for status breakdown`);

      // Count by specific status categories
      const received = data.filter(r => 
        r.status === 'received'
      ).length;

      const inProgress = data.filter(r => 
        r.status === 'pending_classification' ||
        r.status === 'classified' ||
        r.status === 'assigned_to_department' ||
        r.status === 'assigned_to_officer' ||
        r.status === 'acknowledged' ||
        r.status === 'in_progress' ||
        r.status === 'pending_verification'
      ).length;

      console.log('Status breakdown:', { received, inProgress, total: data.length });

      return { received, inProgress };
    } catch (error) {
      console.error('Failed to get status breakdown:', error);
      // Return zeros if failed
      return { received: 0, inProgress: 0 };
    }
  };

  const loadStats = async () => {
    try {
      // First get basic stats from backend
      const { apiClient } = await import('@shared/services/api/apiClient');
      const statsData = await apiClient.get<any>('/users/me/stats');
      
      console.log('Stats from backend:', statsData);
      
      // Get actual status breakdown by fetching reports with status counts
      const statusBreakdown = await getStatusBreakdown();
      
      const mappedStats = {
        total: statsData.total_reports || 0,
        received: statusBreakdown.received,
        in_progress: statusBreakdown.inProgress,
        resolved: statsData.resolved_reports || 0,
        closed: 0,
      };
      
      console.log('Mapped stats with status breakdown:', mappedStats);
      setStats(mappedStats);
    } catch (err) {
      console.error('Failed to load stats from API:', err);
      
      // Fallback: Calculate from loaded reports
      const allReports = backendReports.length > 0 ? backendReports : reports;
      
      // Count by status matching backend enum values
      const receivedCount = allReports.filter(r => 
        r.status === 'received' || 
        r.status === 'pending_classification' ||
        r.status === 'classified'
      ).length;
      
      const inProgressCount = allReports.filter(r => 
        r.status === 'in_progress' || 
        r.status === 'acknowledged' ||
        r.status === 'assigned_to_officer' ||
        r.status === 'assigned_to_department' ||
        r.status === 'pending_verification'
      ).length;
      
      const resolvedCount = allReports.filter(r => 
        r.status === 'resolved' || 
        r.status === 'closed'
      ).length;
      
      const calculatedStats = {
        total: allReports.length,
        received: receivedCount,
        in_progress: inProgressCount,
        resolved: resolvedCount,
        closed: 0,
      };
      
      console.log('Calculated stats from reports:', calculatedStats);
      setStats(calculatedStats);
    }
  };

  const loadReports = async (reset: boolean = false) => {
    // PRODUCTION FIX: Circuit breaker - stop if too many errors
    if (isCircuitOpen && !reset) {
      console.log('Circuit breaker open, skipping request');
      return;
    }

    // PRODUCTION FIX: Prevent rapid API calls
    if (loading && !reset) {
      console.log('Already loading, skipping duplicate request');
      return;
    }

    // PRODUCTION FIX: Debounce to prevent spam
    const now = Date.now();
    if (!reset && (now - lastLoadTime) < LOAD_DEBOUNCE_MS) {
      console.log('Debounced: Too soon since last load, skipping');
      return;
    }
    setLastLoadTime(now);

    try {
      const filters: any = {};
      
      // Map filter values to backend status
      if (selectedStatus !== 'all') {
        filters.status = [selectedStatus];
      }
      
      if (selectedSeverity !== 'all') {
        filters.severity = [selectedSeverity];
      }

      console.log('Loading reports with filters:', filters);

      // PRODUCTION OPTIMIZATION: Smaller page size for better performance
      const PAGE_SIZE = 10; // Reduced from 15 to 10 for faster loading
      const currentPage = reset ? 1 : page;
      
      const data = await reportApi.getMyReports({
        skip: (currentPage - 1) * PAGE_SIZE,
        limit: PAGE_SIZE,
        filters,
      });

      console.log(`Loaded ${data.length} reports from backend (page ${currentPage})`);

      // PRODUCTION FIX: Handle empty state properly for new users
      if (data.length === 0 && currentPage === 1) {
        console.log('New user with no reports - setting empty state');
        setBackendReports([]);
        setHasMore(false);
        setPage(1);
        return;
      }

      if (reset) {
        setBackendReports(data);
        setPage(1);
      } else {
        // PRODUCTION OPTIMIZATION: Efficient duplicate prevention
        setBackendReports((prev) => {
          const existingIds = new Set(prev.map(r => r.id));
          const newReports = data.filter(r => !existingIds.has(r.id));
          return [...prev, ...newReports];
        });
      }

      // PRODUCTION OPTIMIZATION: More accurate hasMore detection
      setHasMore(data.length === PAGE_SIZE);
      
      // PRODUCTION OPTIMIZATION: Don't sync local store on pagination to reduce server load
      if (reset) {
        // Only fetch a small subset for local store
        await fetchMyReports({ limit: 20, skip: 0, filters });
      }
      
      // PRODUCTION FIX: Reset error count on success
      if (errorCount > 0) {
        setErrorCount(0);
        setIsCircuitOpen(false);
      }
    } catch (err) {
      console.error('Failed to load reports from backend:', err);
      
      // PRODUCTION FIX: Circuit breaker logic
      const newErrorCount = errorCount + 1;
      setErrorCount(newErrorCount);
      
      if (newErrorCount >= MAX_ERRORS) {
        console.log('Circuit breaker triggered - too many errors');
        setIsCircuitOpen(true);
        // Reset circuit breaker after 30 seconds
        setTimeout(() => {
          console.log('Circuit breaker reset');
          setIsCircuitOpen(false);
          setErrorCount(0);
        }, 30000);
      }
      
      // Fallback to local store only if circuit is not open
      if (!isCircuitOpen) {
        await fetchMyReports({ limit: 50, skip: 0 });
      }
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    console.log('Refreshing reports - will reload all data');
    // Reset pagination state and reload from beginning
    setPage(1);
    setHasMore(true);
    await Promise.all([loadReports(true), loadStats()]);
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (!loading && !loadingMore && hasMore && !refreshing) {
      console.log('Loading more reports, current page:', page);
      setPage((prev) => {
        const nextPage = prev + 1;
        console.log('Next page will be:', nextPage);
        // Load reports with the next page number
        loadMoreReports(nextPage);
        return nextPage;
      });
    }
  };

  const loadMoreReports = async (pageNumber: number) => {
    try {
      setLoadingMore(true);
      const filters: any = {};
      
      // Map filter values to backend status
      if (selectedStatus !== 'all') {
        filters.status = [selectedStatus];
      }
      
      if (selectedSeverity !== 'all') {
        filters.severity = [selectedSeverity];
      }

      console.log(`Loading more reports - page ${pageNumber} with filters:`, filters);

      const PAGE_SIZE = 10;
      const data = await reportApi.getMyReports({
        skip: (pageNumber - 1) * PAGE_SIZE,
        limit: PAGE_SIZE,
        filters,
      });

      console.log(`Loaded ${data.length} more reports from backend (page ${pageNumber})`);

      // Append new reports to existing ones
      setBackendReports((prev) => {
        const existingIds = new Set(prev.map(r => r.id));
        const newReports = data.filter(r => !existingIds.has(r.id));
        console.log(`Adding ${newReports.length} new reports to list`);
        return [...prev, ...newReports];
      });

      // Update hasMore based on returned data
      setHasMore(data.length === PAGE_SIZE);
      console.log(`Has more reports: ${data.length === PAGE_SIZE}`);
      
    } catch (err) {
      console.error('Failed to load more reports:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Apply filters to both backend and local reports
  const getFilteredReports = () => {
    const allReports = backendReports.length > 0 ? backendReports : reports;
    
    console.log(`Filtering ${allReports.length} reports with status: ${selectedStatus}, severity: ${selectedSeverity}`);
    
    // If no filters are applied, return all reports
    if (selectedStatus === 'all' && selectedSeverity === 'all') {
      console.log('No filters applied, returning all reports');
      return allReports;
    }
    
    const filtered = allReports.filter(report => {
      // Status filter
      let statusMatch = true;
      if (selectedStatus !== 'all') {
        if (selectedStatus === 'received') {
          statusMatch = report.status === 'received' || report.status === 'pending_classification';
        } else if (selectedStatus === 'in_progress') {
          statusMatch = ['in_progress', 'acknowledged', 'assigned_to_officer', 'assigned_to_department', 'classified'].includes(report.status);
        } else if (selectedStatus === 'resolved') {
          statusMatch = report.status === 'resolved' || report.status === 'closed';
        } else {
          statusMatch = report.status === selectedStatus;
        }
      }
      
      // Severity filter
      let severityMatch = true;
      if (selectedSeverity !== 'all') {
        severityMatch = report.severity === selectedSeverity;
      }
      
      return statusMatch && severityMatch;
    });
    
    console.log(`Filtered to ${filtered.length} reports`);
    return filtered;
  };

  const displayReports = getFilteredReports();

  const getStatusColor = (status: string): string => {
    const statusMap: Record<string, string> = {
      received: '#2196F3',
      pending_classification: '#FFC107',
      classified: '#9C27B0',
      assigned_to_department: '#FF9800',
      assigned_to_officer: '#FF9800',
      acknowledged: '#03A9F4',
      in_progress: '#FF9800',
      pending_verification: '#FFC107',
      resolved: '#4CAF50',
      closed: '#9E9E9E',
      rejected: '#F44336',
    };
    return statusMap[status] || '#9E9E9E';
  };

  const getSeverityColor = (severity: string): string => {
    const severityMap: Record<string, string> = {
      low: '#4CAF50',
      medium: '#FFC107',
      high: '#FF9800',
      critical: '#F44336',
    };
    return severityMap[severity] || '#9E9E9E';
  };

  const formatStatus = (status: string): string => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const formatDate = (dateInput: Date | string): string => {
    try {
      const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      if (!date || isNaN(date.getTime())) return 'Unknown date';

      const now = new Date();
      const diffTime = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;

      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (error) {
      return 'Unknown date';
    }
  };

  const renderStatsCards = () => {
    if (!stats) return null;

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statsGrid}>
          <View style={styles.statCardCompact}>
            <Text style={styles.statNumberCompact}>{stats.total}</Text>
            <Text style={styles.statLabelCompact}>Total</Text>
          </View>
          <View style={styles.statCardCompact}>
            <Text style={[styles.statNumberCompact, { color: '#2196F3' }]}>
              {stats.received}
            </Text>
            <Text style={styles.statLabelCompact}>Received</Text>
          </View>
          <View style={styles.statCardCompact}>
            <Text style={[styles.statNumberCompact, { color: '#FF9800' }]}>
              {stats.in_progress}
            </Text>
            <Text style={styles.statLabelCompact}>In Progress</Text>
          </View>
          <View style={styles.statCardCompact}>
            <Text style={[styles.statNumberCompact, { color: '#4CAF50' }]}>
              {stats.resolved}
            </Text>
            <Text style={styles.statLabelCompact}>Resolved</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderFilterChips = () => (
    <View style={styles.filterChipsContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterChips}
      >
        <TouchableOpacity
          style={[
            styles.filterChip,
            selectedStatus === 'all' && styles.filterChipActive,
          ]}
          onPress={() => setSelectedStatus('all')}
        >
          <Text
            style={[
              styles.filterChipText,
              selectedStatus === 'all' && styles.filterChipTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            (selectedStatus === 'received' || selectedStatus === 'pending_classification') && styles.filterChipActive,
          ]}
          onPress={() => setSelectedStatus('received')}
        >
          <Text
            style={[
              styles.filterChipText,
              (selectedStatus === 'received' || selectedStatus === 'pending_classification') && styles.filterChipTextActive,
            ]}
          >
            Received
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            (selectedStatus === 'in_progress' || 
             selectedStatus === 'acknowledged' || 
             selectedStatus === 'assigned_to_officer' ||
             selectedStatus === 'assigned_to_department') && styles.filterChipActive,
          ]}
          onPress={() => setSelectedStatus('in_progress')}
        >
          <Text
            style={[
              styles.filterChipText,
              (selectedStatus === 'in_progress' || 
               selectedStatus === 'acknowledged' || 
               selectedStatus === 'assigned_to_officer' ||
               selectedStatus === 'assigned_to_department') && styles.filterChipTextActive,
            ]}
          >
            In Progress
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            (selectedStatus === 'resolved' || selectedStatus === 'closed') && styles.filterChipActive,
          ]}
          onPress={() => setSelectedStatus('resolved')}
        >
          <Text
            style={[
              styles.filterChipText,
              (selectedStatus === 'resolved' || selectedStatus === 'closed') && styles.filterChipTextActive,
            ]}
          >
            Resolved
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.filterMoreButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Ionicons name="funnel-outline" size={16} color="#1976D2" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  // Helper function to get full media URL
  const getMediaUrl = (url: string): string => {
    if (!url) return '';
    
    // If already a full URL, fix localhost to use correct IP
    if (url.startsWith('http://') || url.startsWith('https://')) {
      // Replace localhost with the correct IP address
      if (url.includes('localhost:9000')) {
        const fixedUrl = url.replace('localhost:9000', '192.168.1.33:9000');
        console.log('🔧 Fixed localhost URL:', url, '→', fixedUrl);
        return fixedUrl;
      }
      return url;
    }
    
    // For relative URLs, construct full URL with MinIO endpoint
    const MINIO_BASE = 'http://192.168.1.33:9000';
    const fullUrl = url.startsWith('/') ? `${MINIO_BASE}${url}` : `${MINIO_BASE}/${url}`;
    console.log('🖼️ Constructed Media URL:', fullUrl);
    return fullUrl;
  };

  const renderReportCard = ({ item }: { item: any; index: number }) => {
    const reportId = item.id;
    const reportNumber = item.report_number || `#${item.id}`;
    const title = item.title || 'Untitled Report';
    const severity = item.severity || 'medium';
    const status = item.status || 'received';
    const createdAt = item.created_at;

    let thumbnailUri = null;
    
    // Debug: Log the report item structure
    console.log(`📋 Report ${reportId} media structure:`, {
      hasMedia: !!item.media,
      mediaLength: item.media?.length || 0,
      hasPhotos: !!item.photos,
      photosLength: item.photos?.length || 0,
      firstMedia: item.media?.[0],
      firstPhoto: item.photos?.[0]
    });
    
    if (item.media && item.media.length > 0) {
      const rawUrl = item.media[0].file_url || item.media[0].url;
      if (rawUrl) {
        thumbnailUri = getMediaUrl(rawUrl);
        console.log(`🖼️ Report ${reportId} thumbnail from media:`, thumbnailUri);
      }
    } else if (item.photos && item.photos.length > 0) {
      if (item.photos[0]) {
        thumbnailUri = getMediaUrl(item.photos[0]);
        console.log(`🖼️ Report ${reportId} thumbnail from photos:`, thumbnailUri);
      }
    }
    
    if (!thumbnailUri) {
      console.log(`❌ Report ${reportId} has no thumbnail available`);
    }

    return (
      <TouchableOpacity
        style={styles.reportCard}
        onPress={() => navigation.navigate('ReportDetail', { reportId })}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          {thumbnailUri && (
            <Image 
              source={{ uri: thumbnailUri }} 
              style={styles.thumbnail} 
              resizeMode="cover"
              onLoad={() => console.log(`✅ Thumbnail loaded successfully for report ${reportId}:`, thumbnailUri)}
              onError={(error) => console.log(`❌ Thumbnail load error for report ${reportId}:`, thumbnailUri, error.nativeEvent)}
            />
          )}

          <View style={styles.reportInfo}>
            {/* Top Row: Number + Date */}
            <View style={styles.reportTopRow}>
              <Text style={styles.reportNumber} numberOfLines={1}>
                {reportNumber}
              </Text>
              <Text style={styles.dateText}>{formatDate(createdAt)}</Text>
            </View>

            {/* Title */}
            <Text style={styles.reportTitle} numberOfLines={2}>
              {title}
            </Text>

            {/* Bottom Row: Status + Severity */}
            <View style={styles.reportBottomRow}>
              <View
                style={[
                  styles.statusBadgeCompact,
                  { backgroundColor: `${getStatusColor(status)}20` },
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: getStatusColor(status) },
                  ]}
                />
                <Text
                  style={[
                    styles.statusTextCompact,
                    { color: getStatusColor(status) },
                  ]}
                >
                  {formatStatus(status)}
                </Text>
              </View>
              <View
                style={[
                  styles.severityBadgeCompact,
                  { backgroundColor: getSeverityColor(severity) },
                ]}
              >
                <Text style={styles.severityTextCompact}>
                  {severity.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={80} color="#CBD5E1" />
      <Text style={styles.emptyTitle}>No Reports Found</Text>
      <Text style={styles.emptyText}>
        {selectedStatus !== 'all' || selectedSeverity !== 'all'
          ? 'Try adjusting your filters'
          : 'Start by reporting an issue in your community'}
      </Text>
      {selectedStatus === 'all' && selectedSeverity === 'all' && (
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => navigation.navigate('SubmitReport')}
        >
          <LinearGradient
            colors={['#1976D2', '#1565C0']}
            style={styles.emptyButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="add-circle" size={20} color="#FFF" />
            <Text style={styles.emptyButtonText}>Report an Issue</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Reusable Top Navbar */}
      <TopNavbar
        title="My Reports"
        rightActions={
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('SubmitReport')}
          >
            <Ionicons name="add-circle" size={28} color="#FFF" />
          </TouchableOpacity>
        }
      />

      <View style={styles.content}>

      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={20} color="#F44336" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={clearError}>
            <Ionicons name="close" size={20} color="#F44336" />
          </TouchableOpacity>
        </View>
      )}

      {/* Subtle Sync Status */}
      {(queueStatus.pending > 0 || queueStatus.processing > 0) && (
        <View style={styles.syncStatusBar}>
          <View style={styles.syncStatusContent}>
            <Ionicons name="cloud-upload-outline" size={16} color="#1976D2" />
            <Text style={styles.syncStatusText}>
              Syncing {queueStatus.pending + queueStatus.processing} reports...
            </Text>
          </View>
          {queueStatus.failed > 0 && (
            <TouchableOpacity 
              onPress={() => submissionQueue.retryFailedItems()}
              style={styles.retryButton}
            >
              <Text style={styles.retryButtonText}>Retry {queueStatus.failed}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {renderStatsCards()}
      {renderFilterChips()}

      {loading && !refreshing && backendReports.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976D2" />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      ) : (
        <FlatList
          data={displayReports}
          renderItem={renderReportCard}
          keyExtractor={(item, index) => {
            // PRODUCTION OPTIMIZATION: Ensure truly unique keys
            const uniqueId = item.id || item.local_id || `temp-${Date.now()}-${index}`;
            return `report-${uniqueId}-${index}`;
          }}
          contentContainerStyle={getContentContainerStyle(insets, styles.listContent)}
          // PRODUCTION OPTIMIZATIONS: Enhanced performance settings
          removeClippedSubviews={true}
          maxToRenderPerBatch={8}        // Reduced for better performance
          updateCellsBatchingPeriod={100} // Increased for smoother scrolling
          initialNumToRender={8}         // Reduced initial render
          windowSize={8}                 // Smaller window for memory efficiency
          getItemLayout={(_, index) => ({
            length: 120, // Approximate item height
            offset: 120 * index,
            index,
          })}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#1976D2']}
              tintColor="#1976D2"
            />
          }
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore && displayReports.length > 0 ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator color="#1976D2" />
                <Text style={styles.footerText}>Loading more...</Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.filterSectionTitle}>Severity</Text>
              {SEVERITY_FILTERS.map((filter) => (
                <TouchableOpacity
                  key={filter.value}
                  style={[
                    styles.filterOption,
                    selectedSeverity === filter.value && styles.filterOptionActive,
                  ]}
                  onPress={() => {
                    setSelectedSeverity(filter.value);
                    setShowFilterModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      selectedSeverity === filter.value && styles.filterOptionTextActive,
                    ]}
                  >
                    {filter.label}
                  </Text>
                  {selectedSeverity === filter.value && (
                    <Ionicons name="checkmark-circle" size={24} color="#1976D2" />
                  )}
                </TouchableOpacity>
              ))}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={() => {
                    setSelectedStatus('all');
                    setSelectedSeverity('all');
                    setShowFilterModal(false);
                  }}
                >
                  <Text style={styles.resetButtonText}>Reset Filters</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      </View>
    </View>
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
  headerButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFEBEE',
    borderBottomWidth: 1,
    borderBottomColor: '#FFCDD2',
    gap: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#F44336',
  },
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
  statCardCompact: {
    alignItems: 'center',
    flex: 1,
  },
  statNumberCompact: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 2,
  },
  statLabelCompact: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  filterChipsContainer: {
    backgroundColor: '#FFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterChips: {
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#1976D2',
    borderColor: '#1976D2',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFF',
  },
  filterMoreButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
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
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  reportCard: {
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
    flexDirection: 'row',
    padding: 12,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
    marginRight: 12,
  },
  reportInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  reportTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  reportNumber: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  reportTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    lineHeight: 18,
    marginBottom: 8,
  },
  reportBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
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
  dateText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    fontSize: 13,
    color: '#64748B',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  emptyButton: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#1976D2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  modalBody: {
    padding: 20,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
  },
  filterOptionActive: {
    backgroundColor: '#E3F2FD',
  },
  filterOptionText: {
    fontSize: 16,
    color: '#1E293B',
  },
  filterOptionTextActive: {
    fontWeight: '600',
    color: '#1976D2',
  },
  modalActions: {
    marginTop: 24,
  },
  resetButton: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  offlineStatusBar: {
    backgroundColor: '#E3F2FD',
    borderBottomWidth: 1,
    borderBottomColor: '#BBDEFB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  offlineStatusText: {
    fontSize: 13,
    color: '#1976D2',
    fontWeight: '500',
    flex: 1,
  },
  offlineStatusRetry: {
    fontSize: 13,
    color: '#1976D2',
    fontWeight: '600',
    paddingHorizontal: 12,
  },
  offlineStatusClear: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    paddingHorizontal: 12,
  },
  syncStatusBar: {
    backgroundColor: '#F0F8FF',
    borderBottomWidth: 1,
    borderBottomColor: '#E3F2FD',
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  syncStatusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  syncStatusText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '500',
    marginLeft: 6,
  },
  retryButton: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  retryButtonText: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: '600',
  },
});
