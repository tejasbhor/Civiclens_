/**
 * NearbyReportsScreen - Community Validation and Map View
 * Requirement 4: Community Validation and Nearby Reports
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';

import { TopNavbar } from '@shared/components';
import { reportApi } from '@shared/services/api/reportApi';
import { useAuthStore } from '@store/authStore';
import { getContentContainerStyle } from '@shared/utils/screenPadding';

const { width, height } = Dimensions.get('window');

interface NearbyReport {
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
  distance: number;
  created_at: string;
  user: {
    id: number;
    full_name: string;
  };
  validation_count: number;
  user_validation?: {
    validation_type: 'upvote' | 'downvote';
  };
  media: Array<{
    id: number;
    file_url: string;
    file_type: string;
  }>;
}

interface UserLocation {
  latitude: number;
  longitude: number;
  address: string;
}

export const NearbyReportsScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const [reports, setReports] = useState<NearbyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [selectedRadius, setSelectedRadius] = useState(5); // km
  const [showRadiusModal, setShowRadiusModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<NearbyReport | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  const radiusOptions = [
    { value: 1, label: '1 km' },
    { value: 3, label: '3 km' },
    { value: 5, label: '5 km' },
  ];

  useEffect(() => {
    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (userLocation) {
      loadNearbyReports();
    }
  }, [userLocation, selectedRadius]);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to view nearby reports');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const addresses = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const address = addresses[0];
      const formattedAddress = [address?.street, address?.city, address?.region]
        .filter(Boolean)
        .join(', ');

      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: formattedAddress || 'Current Location',
      });
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert('Error', 'Failed to get current location');
    }
  };

  const loadNearbyReports = async () => {
    if (!userLocation) return;

    try {
      setLoading(true);
      
      // Call backend API for nearby reports
      const response = await reportApi.getNearbyReports({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        radius: selectedRadius * 1000, // Convert km to meters
        limit: 50,
      });

      setReports(response.data || []);
    } catch (error) {
      console.error('Failed to load nearby reports:', error);
      Alert.alert('Error', 'Failed to load nearby reports');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await getCurrentLocation();
    setRefreshing(false);
  }, []);

  const handleValidateReport = async (reportId: number, validationType: 'upvote' | 'downvote') => {
    try {
      await reportApi.validateReport(reportId, validationType);
      
      // Update local state
      setReports(prev => prev.map(report => {
        if (report.id === reportId) {
          return {
            ...report,
            validation_count: validationType === 'upvote' 
              ? report.validation_count + 1 
              : report.validation_count - 1,
            user_validation: { validation_type: validationType },
          };
        }
        return report;
      }));

      // Award reputation points (5 for upvote, 3 for comment)
      Alert.alert(
        'Validation Submitted',
        `Thank you for validating this report! You earned ${validationType === 'upvote' ? '5' : '3'} reputation points.`
      );
    } catch (error) {
      console.error('Validation failed:', error);
      Alert.alert('Error', 'Failed to validate report');
    }
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical': return '#F44336';
      case 'high': return '#FF9800';
      case 'medium': return '#FFC107';
      case 'low': return '#4CAF50';
      default: return '#94A3B8';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'resolved': return '#4CAF50';
      case 'in_progress': return '#FF9800';
      case 'received': return '#2196F3';
      default: return '#94A3B8';
    }
  };

  const renderReportCard = (report: NearbyReport) => (
    <TouchableOpacity
      key={report.id}
      style={styles.reportCard}
      onPress={() => {
        setSelectedReport(report);
        setShowReportModal(true);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.reportHeader}>
        <View style={styles.reportInfo}>
          <Text style={styles.reportTitle} numberOfLines={2}>
            {report.title}
          </Text>
          <Text style={styles.reportCategory}>{report.category}</Text>
        </View>
        
        <View style={styles.reportBadges}>
          <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(report.severity) }]}>
            <Text style={styles.badgeText}>{report.severity}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status) }]}>
            <Text style={styles.badgeText}>{report.status}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.reportDescription} numberOfLines={2}>
        {report.description}
      </Text>

      <View style={styles.reportFooter}>
        <View style={styles.locationInfo}>
          <Ionicons name="location-outline" size={14} color="#64748B" />
          <Text style={styles.distanceText}>{report.distance.toFixed(1)} km away</Text>
        </View>

        <View style={styles.validationSection}>
          <TouchableOpacity
            style={[
              styles.validationButton,
              report.user_validation?.validation_type === 'upvote' && styles.validationButtonActive
            ]}
            onPress={() => handleValidateReport(report.id, 'upvote')}
            disabled={!!report.user_validation}
          >
            <Ionicons 
              name="thumbs-up" 
              size={16} 
              color={report.user_validation?.validation_type === 'upvote' ? '#4CAF50' : '#64748B'} 
            />
            <Text style={styles.validationCount}>{report.validation_count}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.validationButton,
              report.user_validation?.validation_type === 'downvote' && styles.validationButtonActive
            ]}
            onPress={() => handleValidateReport(report.id, 'downvote')}
            disabled={!!report.user_validation}
          >
            <Ionicons 
              name="thumbs-down" 
              size={16} 
              color={report.user_validation?.validation_type === 'downvote' ? '#F44336' : '#64748B'} 
            />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderMapPlaceholder = () => (
    <View style={styles.mapContainer}>
      <View style={styles.mapPlaceholder}>
        <View style={styles.mapBackground}>
          {/* Grid lines for map effect */}
          {[...Array(8)].map((_, i) => (
            <View key={`h-${i}`} style={[styles.gridLine, { top: `${i * 12.5}%` }]} />
          ))}
          {[...Array(6)].map((_, i) => (
            <View key={`v-${i}`} style={[styles.gridLineVertical, { left: `${i * 16.67}%` }]} />
          ))}
        </View>

        {/* Mock markers */}
        {reports.slice(0, 5).map((report, index) => (
          <View
            key={report.id}
            style={[
              styles.mapMarker,
              {
                top: `${20 + (index * 15)}%`,
                left: `${15 + (index * 12)}%`,
                backgroundColor: getSeverityColor(report.severity),
              }
            ]}
          >
            <Ionicons name="location" size={20} color="#FFF" />
          </View>
        ))}

        {/* User location marker */}
        <View style={[styles.mapMarker, styles.userMarker, { top: '50%', left: '50%' }]}>
          <Ionicons name="person" size={16} color="#FFF" />
        </View>
      </View>

      <View style={styles.mapOverlay}>
        <Text style={styles.mapTitle}>Nearby Reports Map</Text>
        <Text style={styles.mapSubtitle}>Interactive map coming soon</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <TopNavbar
        title="Nearby Reports"
        showBack={true}
        rightActions={
          <TouchableOpacity
            style={styles.radiusButton}
            onPress={() => setShowRadiusModal(true)}
          >
            <Ionicons name="options-outline" size={24} color="#1976D2" />
            <Text style={styles.radiusText}>{selectedRadius}km</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={getContentContainerStyle(insets)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#1976D2']}
            tintColor="#1976D2"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Location Header */}
        {userLocation && (
          <View style={styles.locationHeader}>
            <View style={styles.locationInfo}>
              <Ionicons name="location" size={20} color="#1976D2" />
              <Text style={styles.locationText}>{userLocation.address}</Text>
            </View>
            <Text style={styles.radiusInfo}>Showing reports within {selectedRadius}km</Text>
          </View>
        )}

        {/* Map Placeholder */}
        {renderMapPlaceholder()}

        {/* Reports List */}
        <View style={styles.reportsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Reports ({reports.length})
            </Text>
            <Text style={styles.sectionSubtitle}>
              Tap to validate and support important issues
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1976D2" />
              <Text style={styles.loadingText}>Loading nearby reports...</Text>
            </View>
          ) : reports.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="location-outline" size={64} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No Reports Found</Text>
              <Text style={styles.emptySubtitle}>
                No civic issues reported in your area within {selectedRadius}km
              </Text>
            </View>
          ) : (
            reports.map(renderReportCard)
          )}
        </View>
      </ScrollView>

      {/* Radius Selection Modal */}
      <Modal
        visible={showRadiusModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRadiusModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Radius</Text>
              <TouchableOpacity onPress={() => setShowRadiusModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {radiusOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.radiusOption,
                  selectedRadius === option.value && styles.radiusOptionSelected
                ]}
                onPress={() => {
                  setSelectedRadius(option.value);
                  setShowRadiusModal(false);
                }}
              >
                <Text style={[
                  styles.radiusOptionText,
                  selectedRadius === option.value && styles.radiusOptionTextSelected
                ]}>
                  {option.label}
                </Text>
                {selectedRadius === option.value && (
                  <Ionicons name="checkmark" size={20} color="#1976D2" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Report Detail Modal */}
      {selectedReport && (
        <Modal
          visible={showReportModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowReportModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.reportModalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Report Details</Text>
                <TouchableOpacity onPress={() => setShowReportModal(false)}>
                  <Ionicons name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.reportModalContent}>
                <Text style={styles.reportModalTitle}>{selectedReport.title}</Text>
                <Text style={styles.reportModalDescription}>{selectedReport.description}</Text>
                
                <View style={styles.reportModalInfo}>
                  <Text style={styles.reportModalLabel}>Category: {selectedReport.category}</Text>
                  <Text style={styles.reportModalLabel}>Severity: {selectedReport.severity}</Text>
                  <Text style={styles.reportModalLabel}>Status: {selectedReport.status}</Text>
                  <Text style={styles.reportModalLabel}>Distance: {selectedReport.distance.toFixed(1)}km</Text>
                </View>

                <View style={styles.reportModalActions}>
                  <TouchableOpacity
                    style={styles.viewDetailsButton}
                    onPress={() => {
                      setShowReportModal(false);
                      (navigation as any).navigate('ReportDetail', { reportId: selectedReport.id });
                    }}
                  >
                    <Text style={styles.viewDetailsButtonText}>View Full Details</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
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

  // Header
  radiusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  radiusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976D2',
  },

  // Location Header
  locationHeader: {
    backgroundColor: '#FFF',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  radiusInfo: {
    fontSize: 14,
    color: '#64748B',
  },

  // Map
  mapContainer: {
    margin: 16,
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mapPlaceholder: {
    flex: 1,
    position: 'relative',
  },
  mapBackground: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  gridLineVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#E2E8F0',
  },
  mapMarker: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  userMarker: {
    backgroundColor: '#1976D2',
    transform: [{ translateX: -16 }, { translateY: -16 }],
  },
  mapOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 12,
    borderRadius: 8,
  },
  mapTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  mapSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },

  // Reports Section
  reportsSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },

  // Report Cards
  reportCard: {
    backgroundColor: '#FFF',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reportInfo: {
    flex: 1,
    marginRight: 12,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  reportCategory: {
    fontSize: 14,
    color: '#64748B',
    textTransform: 'capitalize',
  },
  reportBadges: {
    gap: 4,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
    textTransform: 'capitalize',
  },
  reportDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 12,
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 4,
  },
  validationSection: {
    flexDirection: 'row',
    gap: 8,
  },
  validationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    gap: 4,
  },
  validationButtonActive: {
    backgroundColor: '#EFF6FF',
  },
  validationCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },

  // Loading & Empty States
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: 32,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },

  // Radius Options
  radiusOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  radiusOptionSelected: {
    backgroundColor: '#EFF6FF',
  },
  radiusOptionText: {
    fontSize: 16,
    color: '#64748B',
  },
  radiusOptionTextSelected: {
    color: '#1976D2',
    fontWeight: '600',
  },

  // Report Modal
  reportModalContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.8,
  },
  reportModalContent: {
    padding: 20,
  },
  reportModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  reportModalDescription: {
    fontSize: 16,
    color: '#64748B',
    lineHeight: 24,
    marginBottom: 16,
  },
  reportModalInfo: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  reportModalLabel: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  reportModalActions: {
    gap: 12,
  },
  viewDetailsButton: {
    backgroundColor: '#1976D2',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewDetailsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
