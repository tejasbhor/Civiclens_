/**
 * ReportDetailScreen - Detailed view of a single report
 * Shows all report information, photos, status timeline, and location
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  Alert,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { reportApi } from '@shared/services/api/reportApi';
// Import types for report handling
import { TopNavbar } from '@shared/components';
import { getContentContainerStyle } from '@shared/utils/screenPadding';
import { getMediaUrl } from '@shared/utils/mediaUtils';

const { width } = Dimensions.get('window');

interface ReportDetailResponse {
  id: number;
  report_number: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  status: string;
  latitude: number;
  longitude: number;
  address: string;
  landmark?: string;
  created_at: string;
  updated_at: string;
  user: {
    id: number;
    full_name: string;
    phone: string;
  };
  department?: {
    id: number;
    name: string;
  };
  task?: {
    id: number;
    status: string;
    officer: {
      id: number;
      full_name: string;
      phone: string;
    };
  };
  media: Array<{
    id: number;
    file_url: string;
    file_type: string;
    is_primary: boolean;
    upload_source?: string;
    caption?: string;
  }>;
}

export const ReportDetailScreen: React.FC = () => {
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { reportId } = route.params as { reportId: number };

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ReportDetailResponse | null>(null);
  const [statusHistory, setStatusHistory] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);

  useEffect(() => {
    loadReport();
  }, [reportId]);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch report details
      const reportData = await reportApi.getReportDetail(reportId);
      setReport(reportData);
      
      // Try to fetch status history (may not be available for all users)
      try {
        const { apiClient } = await import('@shared/services/api/apiClient');
        const historyData = await apiClient.get<any>(`/reports/${reportId}/history`);
        setStatusHistory(historyData.history || []);
      } catch (histErr) {
        console.log('Status history not available:', histErr);
        setStatusHistory([]);
      }
    } catch (err: any) {
      console.error('Failed to load report:', err);
      setError(err.message || 'Failed to load report details');
    } finally {
      setLoading(false);
    }
  };

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

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleOpenMap = () => {
    if (!report) return;
    const url = `https://www.google.com/maps?q=${report.latitude},${report.longitude}`;
    Linking.openURL(url);
  };

  const handleCallSupport = () => {
    // You can add a support phone number here
    Alert.alert('Support', 'Contact support feature coming soon');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <TopNavbar
          title="Report Details"
          showBack={true}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976D2" />
          <Text style={styles.loadingText}>Loading report...</Text>
        </View>
      </View>
    );
  }

  if (error || !report) {
    return (
      <View style={styles.container}>
        <TopNavbar
          title="Report Details"
          showBack={true}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#F44336" />
          <Text style={styles.errorTitle}>Failed to Load</Text>
          <Text style={styles.errorText}>{error || 'Report not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadReport}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Reusable Top Navbar */}
      <TopNavbar
        title={`Report #${report.report_number}`}
        titleStyle="compact"
        showBack={true}
        rightActions={
          <TouchableOpacity style={styles.headerButton} onPress={handleCallSupport}>
            <Ionicons name="help-circle-outline" size={24} color="#FFF" />
          </TouchableOpacity>
        }
      />

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={getContentContainerStyle(insets, {})}
        showsVerticalScrollIndicator={false}
      >
        {/* Photo Gallery */}
        {report.media && report.media.length > 0 ? (
          <View style={styles.gallerySection}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / width);
                setSelectedImageIndex(index);
              }}
            >
              {report.media.map((media, index) => {
                const imageUrl = getMediaUrl(media.file_url);
                console.log('Loading image:', imageUrl);
                
                return (
                  <View key={`media-${media.id}-${index}`} style={styles.imageContainer}>
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.galleryImage}
                      resizeMode="cover"
                      onLoad={() => console.log('✅ Image loaded successfully:', imageUrl)}
                      onError={(error) => {
                        console.error('❌ Image load error:', imageUrl, error.nativeEvent);
                      }}
                    />
                    {/* Image Tag */}
                    {media.upload_source && (
                      <View style={styles.imageTag}>
                        <View
                          style={[
                            styles.imageTagBadge,
                            {
                              backgroundColor:
                                media.upload_source === 'citizen_submission'
                                  ? '#2196F3'
                                  : media.upload_source === 'officer_before_photo'
                                  ? '#FF9800'
                                  : '#4CAF50',
                            },
                          ]}
                        >
                          <Text style={styles.imageTagText}>
                            {media.upload_source === 'citizen_submission'
                              ? 'Reported'
                              : media.upload_source === 'officer_before_photo'
                              ? 'Before Work'
                              : 'After Work'}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
            <View style={styles.galleryIndicator}>
              <Text style={styles.galleryCounter}>
                {selectedImageIndex + 1} / {report.media.length}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.noImagePlaceholder}>
            <Ionicons name="image-outline" size={48} color="#CBD5E1" />
            <Text style={styles.noImageText}>No images attached</Text>
          </View>
        )}

        {/* Status Banner */}
        <View style={styles.statusBanner}>
          <LinearGradient
            colors={[`${getStatusColor(report.status)}20`, `${getStatusColor(report.status)}10`]}
            style={styles.statusBannerGradient}
          >
            <View style={styles.statusBannerContent}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: getStatusColor(report.status) },
                ]}
              />
              <Text
                style={[
                  styles.statusBannerText,
                  { color: getStatusColor(report.status) },
                ]}
              >
                {formatStatus(report.status)}
              </Text>
            </View>
            <View
              style={[
                styles.severityBadge,
                { backgroundColor: getSeverityColor(report.severity) },
              ]}
            >
              <Text style={styles.severityText}>
                {report.severity.toUpperCase()}
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Report Info */}
        <View style={styles.section}>
          <Text style={styles.title}>{report.title}</Text>
          <Text style={styles.description}>{report.description}</Text>

          {/* Meta Info */}
          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Ionicons name="pricetag" size={20} color="#64748B" />
              <View style={styles.metaContent}>
                <Text style={styles.metaLabel}>Category</Text>
                <Text style={styles.metaValue}>
                  {report.category.replace(/_/g, ' ')}
                </Text>
              </View>
            </View>

            <View style={styles.metaItem}>
              <Ionicons name="time" size={20} color="#64748B" />
              <View style={styles.metaContent}>
                <Text style={styles.metaLabel}>Submitted</Text>
                <Text style={styles.metaValue}>{formatDate(report.created_at)}</Text>
              </View>
            </View>

            {report.department && (
              <View style={styles.metaItem}>
                <Ionicons name="business" size={20} color="#64748B" />
                <View style={styles.metaContent}>
                  <Text style={styles.metaLabel}>Department</Text>
                  <Text style={styles.metaValue}>{report.department.name}</Text>
                </View>
              </View>
            )}

            {report.task?.officer && (
              <View style={styles.metaItem}>
                <Ionicons name="person" size={20} color="#64748B" />
                <View style={styles.metaContent}>
                  <Text style={styles.metaLabel}>Assigned Officer</Text>
                  <Text style={styles.metaValue}>{report.task.officer.full_name}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <View style={styles.locationCard}>
            <View style={styles.locationInfo}>
              <Ionicons name="location" size={24} color="#1976D2" />
              <View style={styles.locationText}>
                <Text style={styles.locationAddress}>{report.address}</Text>
                {report.landmark && (
                  <Text style={styles.locationLandmark}>Near: {report.landmark}</Text>
                )}
                <Text style={styles.locationCoords}>
                  {report.latitude.toFixed(6)}, {report.longitude.toFixed(6)}
                </Text>
              </View>
            </View>
          </View>
          
          {/* Open in Maps Button */}
          <TouchableOpacity style={styles.openMapsButton} onPress={handleOpenMap}>
            <Ionicons name="navigate" size={20} color="#FFF" />
            <Text style={styles.openMapsButtonText}>Open in Maps</Text>
          </TouchableOpacity>
        </View>

        {/* Status Timeline - Collapsible */}
        {statusHistory.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity 
              style={styles.collapsibleHeader}
              onPress={() => setIsTimelineExpanded(!isTimelineExpanded)}
              activeOpacity={0.7}
            >
              <View style={styles.collapsibleHeaderContent}>
                <Ionicons name="time-outline" size={20} color="#1976D2" />
                <Text style={styles.sectionTitle}>Status Timeline</Text>
                <View style={styles.timelineBadge}>
                  <Text style={styles.timelineBadgeText}>{statusHistory.length}</Text>
                </View>
              </View>
              <Ionicons 
                name={isTimelineExpanded ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="#64748B" 
              />
            </TouchableOpacity>
            
            {isTimelineExpanded && (
              <View style={styles.timeline}>
                {statusHistory.map((item, index) => (
                  <View key={index} style={styles.timelineItem}>
                    <View style={styles.timelineLeft}>
                      <View
                        style={[
                          styles.timelineDot,
                          { backgroundColor: getStatusColor(item.new_status) },
                        ]}
                      />
                      {index < statusHistory.length - 1 && (
                        <View style={styles.timelineLine} />
                      )}
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineStatus}>
                        {formatStatus(item.new_status)}
                      </Text>
                      {item.changed_by && (
                        <Text style={styles.timelineUser}>
                          by {item.changed_by.full_name}
                        </Text>
                      )}
                      <Text style={styles.timelineDate}>
                        {formatDate(item.changed_at)}
                      </Text>
                      {item.notes && (
                        <Text style={styles.timelineNotes}>{item.notes}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}



        {/* Bottom padding handled by getContentContainerStyle */}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  headerButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  errorText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#1976D2',
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  scrollView: {
    flex: 1,
  },
  gallerySection: {
    position: 'relative',
  },
  imageContainer: {
    width,
    height: 300,
    position: 'relative',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E2E8F0',
  },
  imageTag: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  imageTagBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  imageTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  galleryIndicator: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  galleryCounter: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  noImagePlaceholder: {
    height: 200,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  noImageText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  statusBanner: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  statusBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  statusBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusBannerText: {
    fontSize: 16,
    fontWeight: '700',
  },
  severityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  section: {
    padding: 16,
    backgroundColor: '#FFF',
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  collapsibleHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  timelineBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976D2',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
    marginBottom: 16,
  },
  metaGrid: {
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  metaContent: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    textTransform: 'capitalize',
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  openMapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    backgroundColor: '#1976D2',
    borderRadius: 12,
    gap: 8,
    shadowColor: '#1976D2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  openMapsButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  locationText: {
    flex: 1,
    gap: 4,
  },
  locationAddress: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    lineHeight: 20,
  },
  locationLandmark: {
    fontSize: 13,
    color: '#64748B',
  },
  locationCoords: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: 'monospace',
  },

  timeline: {
    gap: 0,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineLeft: {
    alignItems: 'center',
    width: 24,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 20,
  },
  timelineStatus: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  timelineUser: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 2,
  },
  timelineDate: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 6,
  },
  timelineNotes: {
    fontSize: 13,
    color: '#475569',
    fontStyle: 'italic',
    marginTop: 4,
  },
});
