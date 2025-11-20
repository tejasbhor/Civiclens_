/**
 * Citizen Home Screen - Production Ready
 * Main dashboard with interactive map and collapsible bottom sheet
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Platform,
  Linking,
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDashboard } from '@shared/hooks';
import { useNotifications } from '@shared/hooks/useNotifications';
import { OfflineIndicator, SyncStatusIndicator, TopNavbar } from '@shared/components';
import { networkService } from '@shared/services/network/networkService';
import { colors } from '@shared/theme/colors';
import type { HomeStackParamList } from '@/navigation/CitizenTabNavigator';

const { height } = Dimensions.get('window');

type HomeScreenNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'HomeMain'>;

export const CitizenHomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  
  const {
    stats,
    userLocation,
    isLoading,
    error,
    refreshDashboard,
    clearError,
    hasData,
  } = useDashboard();

  const { unreadCount } = useNotifications({ autoRefresh: true });

  const [isExpanded, setIsExpanded] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [isOnline, setIsOnline] = useState(networkService.isOnline());
  
  // Calculate dynamic heights based on safe area
  const bottomPadding = Math.max(insets.bottom, 20);
  const tabBarHeight = 60 + bottomPadding;
  const bottomSheetGap = 8;
  const bottomSheetBottom = tabBarHeight + bottomSheetGap;

  useEffect(() => {
    const unsubscribe = networkService.addListener((status) => {
      setIsOnline(status.isConnected && status.isInternetReachable !== false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [error, clearError]);

  // Emergency call handler
  const handleEmergencyCall = () => {
    setShowEmergencyModal(true);
  };

  const makeEmergencyCall = (number: string, service: string) => {
    setShowEmergencyModal(false);
    Alert.alert(
      'Confirm Call',
      `Call ${service} at ${number}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Call Now',
          onPress: () => Linking.openURL(`tel:${number}`),
          style: 'default',
        },
      ]
    );
  };

  const totalReports = stats?.total ?? 0;

  const statBreakdown = useMemo(
    () => {
      if (!stats) {
        return [
          { label: 'Raised', value: 0, color: '#2196F3' },
          { label: 'In Progress', value: 0, color: '#FF9800' },
          { label: 'Resolved', value: 0, color: '#4CAF50' },
        ];
      }
      return [
        { label: 'Raised', value: stats.issuesRaised, color: '#2196F3' },
        { label: 'In Progress', value: stats.inProgress, color: '#FF9800' },
        { label: 'Resolved', value: stats.resolved, color: '#4CAF50' },
      ];
    },
    [stats]
  );

  const renderLegendValue = (value: number) => {
    if (isLoading && !stats) {
      return <View style={styles.skeletonValue} />;
    }
    return <Text style={styles.legendNumber}>{value}</Text>;
  };

  return (
    <View style={styles.container}>
      {/* Enhanced Top Navbar - Dashboard Style */}
      <TopNavbar
        title="Welcome to CivicLens"
        subtitle="Navi Mumbai, Kharghar"
        showLocation={true}
        location="Navi Mumbai, Kharghar"
        showNotifications={true}
        showSearch={true}
        onLocationPress={() => console.log('Location picker')}
        onSearchPress={() => console.log('Search')}
      />

      {/* Status Indicators */}
      <OfflineIndicator />
      <SyncStatusIndicator />

      {/* Map Placeholder */}
      <View style={styles.mapPlaceholder}>
        <View style={styles.mapBackground}>
          <View style={styles.mapGrid}>
            {[...Array(10)].map((_, i) => (
              <View 
                key={`h-${i}`} 
                style={[styles.gridLine, { top: `${i * 10}%` }]} 
              />
            ))}
            {[...Array(10)].map((_, i) => (
              <View 
                key={`v-${i}`} 
                style={[styles.gridLine, { left: `${i * 10}%`, width: 1, height: '100%' }]} 
              />
            ))}
          </View>
        </View>

        <View style={styles.locationIndicator}>
          <Ionicons name="location" size={32} color="#2196F3" />
          <Text style={styles.locationText}>
            {userLocation ? 'Navi Mumbai, Kharghar' : 'Getting location...'}
          </Text>
        </View>

        <View style={styles.markersContainer}>
          <View style={[styles.markerDot, styles.markerHigh]}>
            <Ionicons name="alert-circle" size={16} color="#FFF" />
          </View>
          <View style={[styles.markerDot, styles.markerMedium]}>
            <Ionicons name="alert-circle" size={16} color="#FFF" />
          </View>
          <View style={[styles.markerDot, styles.markerLow]}>
            <Ionicons name="alert-circle" size={16} color="#FFF" />
          </View>
        </View>

        <View style={styles.mapInfoOverlay}>
          <Ionicons name="map-outline" size={40} color="rgba(255,255,255,0.9)" />
          <Text style={styles.mapInfoTitle}>Interactive Map</Text>
          <Text style={styles.mapInfoSubtitle}>Run: npx expo run:android</Text>
          <Text style={styles.mapInfoNote}>(Requires development build)</Text>
        </View>
      </View>

      {/* Production-Ready Top Navbar */}
      <View style={styles.topNavbar}>
        <LinearGradient
          colors={['#1976D2', '#1565C0']}
          style={styles.navbarGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.navbarTop}>
            <TouchableOpacity 
              style={styles.locationButton}
              activeOpacity={0.7}
              onPress={() => console.log('Open location picker')}
            >
              <Ionicons name="location-sharp" size={18} color="#FFF" />
              <View style={styles.locationInfo}>
                <Text style={styles.locationLabel}>Location</Text>
                <Text style={styles.locationCity}>Navi Mumbai, Kharghar</Text>
              </View>
              <Ionicons name="chevron-down" size={16} color="#FFF" />
            </TouchableOpacity>

            <View style={styles.navbarActions}>
              <TouchableOpacity 
                style={styles.navbarIconButton}
                onPress={() => console.log('Open language selector')}
              >
                <Ionicons name="language" size={22} color="#FFF" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.navbarIconButton}
                onPress={() => (navigation as any).navigate('Notifications')}
              >
                <Ionicons name="notifications" size={22} color="#FFF" />
                {unreadCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.badgeText}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.navbarIconButton}
                onPress={() => (navigation as any).navigate('Profile', { screen: 'ProfileMain' })}
              >
                <Ionicons name="person-circle" size={26} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.searchBar} 
            activeOpacity={0.7}
            onPress={() => console.log('Open search')}
          >
            <Ionicons name="search" size={20} color="#64748B" />
            <Text style={styles.searchPlaceholder}>Search reports, issues...</Text>
            <Ionicons name="options" size={20} color="#64748B" />
          </TouchableOpacity>
        </LinearGradient>
      </View>

      {/* Bottom Sheet */}
      <View style={[styles.bottomSheet, { bottom: bottomSheetBottom }]}>
        <TouchableOpacity
          style={styles.handleContainer}
          onPress={() => setIsExpanded(!isExpanded)}
          activeOpacity={0.7}
        >
          <View style={styles.handleBar} />
        </TouchableOpacity>

        {/* COLLAPSED VIEW - Only Report Button */}
        {!isExpanded && (
          <View style={styles.collapsedView}>
            <TouchableOpacity 
              style={styles.reportButton} 
              activeOpacity={0.9}
              onPress={() => navigation.navigate('SubmitReport')}
            >
              <LinearGradient
                colors={['#2196F3', '#1976D2']}
                style={styles.reportButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="add-circle" size={24} color="#FFF" />
                <Text style={styles.reportButtonText}>Report an Issue</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* EXPANDED VIEW - Full Content */}
        {isExpanded && (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={refreshDashboard}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
          >
            {hasData && stats ? (
              <>
                {/* Segmented Progress Circle */}
                <View style={styles.statsCard}>
                  <View style={styles.statsRow}>
                    {/* Left: Segmented Circle */}
                    <View style={styles.chartSection}>
                      <View style={styles.segmentedCircle}>
                        <Svg width={140} height={140}>
                          <Circle cx={70} cy={70} r={55} stroke="#E0E0E0" strokeWidth={12} fill="none" />
                          
                          {(() => {
                            const total = stats.total || 1;
                            const circumference = 2 * Math.PI * 55;
                            
                            const resolvedPercent = ((stats?.resolved || 0) / total) * 100;
                            const progressPercent = ((stats?.inProgress || 0) / total) * 100;
                            const raisedPercent = ((stats?.issuesRaised || 0) / total) * 100;
                            
                            const resolvedDash = (resolvedPercent / 100) * circumference;
                            const progressDash = (progressPercent / 100) * circumference;
                            const raisedDash = (raisedPercent / 100) * circumference;

                            return (
                              <>
                                <Circle
                                  cx={70} cy={70} r={55}
                                  stroke="#4CAF50"
                                  strokeWidth={12}
                                  fill="none"
                                  strokeDasharray={`${resolvedDash} ${circumference}`}
                                  strokeDashoffset={0}
                                  rotation="-90"
                                  origin="70, 70"
                                  strokeLinecap="round"
                                />
                                
                                <Circle
                                  cx={70} cy={70} r={55}
                                  stroke="#FF9800"
                                  strokeWidth={12}
                                  fill="none"
                                  strokeDasharray={`${progressDash} ${circumference}`}
                                  strokeDashoffset={-resolvedDash}
                                  rotation="-90"
                                  origin="70, 70"
                                  strokeLinecap="round"
                                />
                                
                                <Circle
                                  cx={70} cy={70} r={55}
                                  stroke="#2196F3"
                                  strokeWidth={12}
                                  fill="none"
                                  strokeDasharray={`${raisedDash} ${circumference}`}
                                  strokeDashoffset={-(resolvedDash + progressDash)}
                                  rotation="-90"
                                  origin="70, 70"
                                  strokeLinecap="round"
                                />
                              </>
                            );
                          })()}
                        </Svg>
                        
                        <View style={styles.circleCenter}>
                          {isLoading && !stats ? (
                            <View style={styles.skeletonCircle} />
                          ) : (
                            <>
                              <Text style={styles.circleTotalNumber}>{totalReports}</Text>
                              <Text style={styles.circleTotalLabel}>Total</Text>
                            </>
                          )}
                        </View>
                      </View>
                    </View>

                    {/* Right: Stats Legend */}
                    <View style={styles.statsLegend}>
                      {statBreakdown.map((item) => (
                        <View style={styles.legendItem} key={item.label}>
                          <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                          {renderLegendValue(item.value)}
                          <Text style={styles.legendLabel}>{item.label}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>

                {/* Report Button */}
                <TouchableOpacity 
                  style={styles.primaryButton} 
                  activeOpacity={0.9}
                  onPress={() => navigation.navigate('SubmitReport')}
                >
                  <LinearGradient
                    colors={['#2196F3', '#1976D2']}
                    style={styles.primaryButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Ionicons name="add-circle" size={24} color="#FFF" />
                    <Text style={styles.primaryButtonText}>Report an Issue</Text>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Quick Actions */}
                <View style={styles.quickActionsGrid}>
                  <TouchableOpacity 
                    style={styles.quickActionCard} 
                    activeOpacity={0.8}
                    onPress={handleEmergencyCall}
                  >
                    <View style={[styles.quickActionIcon, { backgroundColor: '#FF3B30' }]}>
                      <Ionicons name="call" size={28} color="#FFF" />
                    </View>
                    <Text style={styles.quickActionTitle}>Emergency</Text>
                    <Text style={styles.quickActionSubtitle}>Call Now</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.quickActionCard}
                    activeOpacity={0.8}
                    onPress={() => (navigation as any).navigate('Reports', { screen: 'ReportsList' })}
                  >
                    <View style={[styles.quickActionIcon, { backgroundColor: '#2196F3' }]}>
                      <Ionicons name="bar-chart" size={28} color="#FFF" />
                    </View>
                    <Text style={styles.quickActionTitle}>Summary</Text>
                    <Text style={styles.quickActionSubtitle}>View All</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={64} color="#CCC" />
                <Text style={styles.emptyText}>
                  {isLoading ? 'Loading dashboard...' : 'No stats available offline yet'}
                </Text>
                <Text style={styles.emptySubtext}>
                  {isOnline ? 'Try again in a moment' : 'Connect to sync the latest stats'}
                </Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={refreshDashboard}
                  disabled={isLoading}
                >
                  <Text style={styles.retryButtonText}>{isLoading ? 'Refreshing...' : 'Retry'}</Text>
                </TouchableOpacity>
              </View>
            )}

            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#D32F2F" />
                <Text style={styles.errorText}>{error}</Text>
                {!isOnline && <Text style={styles.errorHint}>Showing cached data</Text>}
              </View>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>
        )}
      </View>

      {/* Custom Emergency Services Modal */}
      <Modal
        visible={showEmergencyModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEmergencyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.emergencyIconContainer}>
                <Ionicons name="alert-circle" size={32} color="#FF3B30" />
              </View>
              <Text style={styles.modalTitle}>Emergency Services</Text>
              <Text style={styles.modalSubtitle}>Select a service to call immediately</Text>
            </View>

            {/* Emergency Services List */}
            <View style={styles.servicesContainer}>
              {/* Police */}
              <TouchableOpacity
                style={styles.serviceCard}
                activeOpacity={0.7}
                onPress={() => makeEmergencyCall('100', 'Police')}
              >
                <View style={[styles.serviceIcon, { backgroundColor: '#3B82F6' }]}>
                  <Ionicons name="shield-checkmark" size={28} color="#FFF" />
                </View>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>Police</Text>
                  <Text style={styles.serviceNumber}>100</Text>
                </View>
                <Ionicons name="call" size={24} color="#3B82F6" />
              </TouchableOpacity>

              {/* Fire Brigade */}
              <TouchableOpacity
                style={styles.serviceCard}
                activeOpacity={0.7}
                onPress={() => makeEmergencyCall('101', 'Fire Brigade')}
              >
                <View style={[styles.serviceIcon, { backgroundColor: '#EF4444' }]}>
                  <Ionicons name="flame" size={28} color="#FFF" />
                </View>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>Fire Brigade</Text>
                  <Text style={styles.serviceNumber}>101</Text>
                </View>
                <Ionicons name="call" size={24} color="#EF4444" />
              </TouchableOpacity>

              {/* Ambulance */}
              <TouchableOpacity
                style={styles.serviceCard}
                activeOpacity={0.7}
                onPress={() => makeEmergencyCall('102', 'Ambulance')}
              >
                <View style={[styles.serviceIcon, { backgroundColor: '#10B981' }]}>
                  <Ionicons name="medical" size={28} color="#FFF" />
                </View>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>Ambulance</Text>
                  <Text style={styles.serviceNumber}>102</Text>
                </View>
                <Ionicons name="call" size={24} color="#10B981" />
              </TouchableOpacity>

              {/* Women Helpline */}
              <TouchableOpacity
                style={styles.serviceCard}
                activeOpacity={0.7}
                onPress={() => makeEmergencyCall('1091', 'Women Helpline')}
              >
                <View style={[styles.serviceIcon, { backgroundColor: '#8B5CF6' }]}>
                  <Ionicons name="people" size={28} color="#FFF" />
                </View>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>Women Helpline</Text>
                  <Text style={styles.serviceNumber}>1091</Text>
                </View>
                <Ionicons name="call" size={24} color="#8B5CF6" />
              </TouchableOpacity>
            </View>

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.cancelButton}
              activeOpacity={0.7}
              onPress={() => setShowEmergencyModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E0E0E0',
  },
  
  // Map Placeholder
  mapPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#B3D9FF',
  },
  mapBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#B3D9FF',
  },
  mapGrid: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    height: 1,
    width: '100%',
  },
  locationIndicator: {
    position: 'absolute',
    top: 100,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  locationText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  markersContainer: {
    position: 'absolute',
    top: '45%',
    left: '50%',
    transform: [{ translateX: -60 }, { translateY: -20 }],
    flexDirection: 'row',
    gap: 30,
  },
  markerDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  markerCritical: {
    backgroundColor: '#D32F2F',
  },
  markerHigh: {
    backgroundColor: '#F57C00',
  },
  markerMedium: {
    backgroundColor: '#FBC02D',
  },
  markerLow: {
    backgroundColor: '#388E3C',
  },
  mapInfoOverlay: {
    position: 'absolute',
    top: '35%',
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(25, 118, 210, 0.9)',
    paddingHorizontal: 32,
    paddingVertical: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  mapInfoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 12,
  },
  mapInfoSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.95)',
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  mapInfoNote: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
    fontStyle: 'italic',
  },

  // Top Navbar
  topNavbar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  navbarGradient: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  navbarTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  locationInfo: {
    marginLeft: 4,
  },
  locationLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  locationCity: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  navbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  navbarIconButton: {
    position: 'relative',
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1976D2',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    gap: 12,
  },
  searchPlaceholder: {
    fontSize: 15,
    color: '#64748B',
    flex: 1,
    fontWeight: '500',
  },
  searchPlaceholderSkeleton: {
    width: 120,
    height: 18,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },

  // Bottom Sheet
  bottomSheet: {
    position: 'absolute',
    left: 8,
    right: 8,
    maxHeight: height * 0.65,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  handleContainer: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  handleBar: {
    width: 40,
    height: 5,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
  },

  // Collapsed View
  collapsedView: {
    padding: 16,
  },
  reportButton: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  reportButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 12,
  },
  reportButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },

  // Expanded View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  statsCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chartSection: {
    marginRight: 20,
  },
  segmentedCircle: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleCenter: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleTotalNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1E293B',
  },
  circleTotalLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  statsLegend: {
    flex: 1,
    justifyContent: 'space-around',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    minWidth: 30,
  },
  legendLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  skeletonValue: {
    width: 32,
    height: 18,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },
  skeletonCircle: {
    width: 40,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
  },
  skeletonChart: {
    width: 120,
    height: 120,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },

  // Primary Button
  primaryButton: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 12,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },

  // Quick Actions
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 24,
    backgroundColor: '#1976D2',
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: '600',
    textAlign: 'center',
  },

  // Error
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#D32F2F',
  },
  errorHint: {
    marginLeft: 28,
    marginTop: 4,
    color: '#9C27B0',
    fontSize: 12,
  },

  // Emergency Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  emergencyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  servicesContainer: {
    padding: 20,
    gap: 12,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 16,
  },
  serviceIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  serviceNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#64748B',
  },
  cancelButton: {
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 16,
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
});
