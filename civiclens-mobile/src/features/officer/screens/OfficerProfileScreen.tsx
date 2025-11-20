/**
 * Officer Profile Screen - Production Ready
 * Profile management for officers with admin-controlled fields
 * Implements offline-first with hydration and caching
 * Smart change tracking - Save button only appears when there are changes
 * UI consistent with Citizen Profile for better UX
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Hooks and Services
import { TopNavbar, RoleGuard } from '../../../shared/components';
import { useOfficerProfile } from '../../../shared/hooks/useOfficerProfile';
import { networkService } from '../../../shared/services/network/networkService';
import { colors } from '../../../shared/theme/colors';
import { UserRole } from '../../../shared/types/user';
import { useAuthStore } from '../../../store/authStore';

export const OfficerProfileScreen: React.FC = () => {
  return (
    <RoleGuard allowedRoles={[UserRole.NODAL_OFFICER, UserRole.ADMIN, UserRole.AUDITOR]}>
      <OfficerProfileContent />
    </RoleGuard>
  );
};

const OfficerProfileContent: React.FC = () => {
  const { logout } = useAuthStore();
  
  const {
    profile,
    isLoading,
    isHydrating,
    error,
    hasData,
    refreshProfile,
    updateProfile,
    clearError,
  } = useOfficerProfile();

  const [isOnline, setIsOnline] = useState(networkService.isOnline());
  const [isUpdating, setIsUpdating] = useState(false);

  // Local state for editable fields
  const [editableData, setEditableData] = useState({
    bio: profile?.bio || '',
    preferred_language: profile?.preferred_language || 'en',
    notification_preferences: profile?.notification_preferences || {
      task_assignments: true,
      urgent_reports: true,
      system_updates: false,
      performance_reports: true,
    },
  });

  // Track original data to detect changes
  const [originalData, setOriginalData] = useState({
    bio: '',
    preferred_language: 'en',
    notification_preferences: {
      task_assignments: true,
      urgent_reports: true,
      system_updates: false,
      performance_reports: true,
    },
  });

  useEffect(() => {
    const unsubscribe = networkService.addListener((status) => {
      setIsOnline(status.isConnected && status.isInternetReachable !== false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (profile) {
      const profileData = {
        bio: profile.bio || '',
        preferred_language: profile.preferred_language || 'en',
        notification_preferences: profile.notification_preferences || {
          task_assignments: true,
          urgent_reports: true,
          system_updates: false,
          performance_reports: true,
        },
      };
      setEditableData(profileData);
      setOriginalData(profileData); // Store original data for comparison
    }
  }, [profile]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [error, clearError]);

  // Check if there are any changes
  const hasChanges = useMemo(() => {
    if (!profile) return false;
    
    return (
      editableData.bio.trim() !== originalData.bio ||
      editableData.preferred_language !== originalData.preferred_language ||
      JSON.stringify(editableData.notification_preferences) !== JSON.stringify(originalData.notification_preferences)
    );
  }, [editableData, originalData, profile]);

  const handleSaveChanges = useCallback(async () => {
    if (!profile || !hasChanges) return;

    setIsUpdating(true);
    try {
      const updates = {
        bio: editableData.bio.trim(),
        preferred_language: editableData.preferred_language,
        notification_preferences: editableData.notification_preferences,
      };
      
      await updateProfile(updates);
      
      // Update original data after successful save
      setOriginalData({
        bio: editableData.bio.trim(),
        preferred_language: editableData.preferred_language,
        notification_preferences: editableData.notification_preferences,
      });
      
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  }, [profile, editableData, originalData, hasChanges, updateProfile]);

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
  }, [logout]);


  return (
    <View style={styles.container}>
      <TopNavbar
        title="Officer Profile"
        showBack={false}
        showNotifications={true}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && !isHydrating}
            onRefresh={refreshProfile}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {hasData && profile ? (
          <>
            {/* Profile Header Card - Matching Citizen Design */}
            <View style={styles.profileCard}>
              <LinearGradient
                colors={[colors.primary, '#1565C0']}
                style={styles.profileGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.avatarContainer}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {profile.full_name?.charAt(0).toUpperCase() || 'O'}
                    </Text>
                  </View>
                  <View style={styles.officerBadge}>
                    <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
                  </View>
                </View>

                <Text style={styles.profileName}>{profile.full_name}</Text>
                <Text style={styles.profileDesignation}>{profile.designation}</Text>
                <Text style={styles.profileDepartment}>{profile.department}</Text>

                <View style={styles.badgeContainer}>
                  <Ionicons name="shield" size={16} color="#FFF" />
                  <Text style={styles.badgeText}>Municipal Officer</Text>
                </View>
              </LinearGradient>
            </View>

            {/* Official Information Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Official Information</Text>
              
              <View style={styles.officialInfoItem}>
                <View style={styles.officialInfoHeader}>
                  <View style={[styles.menuIconCircle, { backgroundColor: '#EFF6FF' }]}>
                    <Ionicons name="card-outline" size={20} color="#2563EB" />
                  </View>
                  <Text style={styles.officialInfoLabel}>Employee ID</Text>
                </View>
                <Text style={styles.officialInfoValue}>{profile.employee_id}</Text>
              </View>

              <View style={styles.officialInfoItem}>
                <View style={styles.officialInfoHeader}>
                  <View style={[styles.menuIconCircle, { backgroundColor: '#F0FDF4' }]}>
                    <Ionicons name="call-outline" size={20} color="#22C55E" />
                  </View>
                  <Text style={styles.officialInfoLabel}>Phone Number</Text>
                </View>
                <Text style={styles.officialInfoValue}>{profile.phone}</Text>
              </View>

              <View style={styles.officialInfoItem}>
                <View style={styles.officialInfoHeader}>
                  <View style={[styles.menuIconCircle, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="mail-outline" size={20} color="#F59E0B" />
                  </View>
                  <Text style={styles.officialInfoLabel}>Email Address</Text>
                </View>
                <Text style={styles.officialInfoValue}>{profile.email}</Text>
              </View>

              <View style={styles.officialInfoItem}>
                <View style={styles.officialInfoHeader}>
                  <View style={[styles.menuIconCircle, { backgroundColor: '#F3E8FF' }]}>
                    <Ionicons name="location-outline" size={20} color="#A855F7" />
                  </View>
                  <Text style={styles.officialInfoLabel}>Assigned Zone</Text>
                </View>
                <Text style={styles.officialInfoValue}>{profile.zone_assigned}</Text>
              </View>
            </View>

            {/* Personal Information Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Personal Information</Text>
                {hasChanges && (
                  <View style={styles.unsavedIndicator}>
                    <Text style={styles.unsavedText}>Unsaved</Text>
                  </View>
                )}
              </View>
              
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => {
                  Alert.prompt(
                    'Edit Bio',
                    'Update your bio',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { 
                        text: 'Save', 
                        onPress: (text?: string) => setEditableData(prev => ({ ...prev, bio: text || '' }))
                      },
                    ],
                    'plain-text',
                    editableData.bio
                  );
                }}
              >
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIconCircle, { backgroundColor: '#DBEAFE' }]}>
                    <Ionicons name="document-text-outline" size={20} color="#3B82F6" />
                  </View>
                  <Text style={styles.menuItemText}>Bio</Text>
                </View>
                <View style={styles.menuItemRight}>
                  <Text style={styles.menuItemValue}>
                    {editableData.bio || 'Tap to add bio'}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => {
                  Alert.alert(
                    'Select Language',
                    'Choose your preferred language',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { 
                        text: 'English', 
                        onPress: () => setEditableData(prev => ({ ...prev, preferred_language: 'en' }))
                      },
                      { 
                        text: 'Hindi', 
                        onPress: () => setEditableData(prev => ({ ...prev, preferred_language: 'hi' }))
                      },
                    ]
                  );
                }}
              >
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIconCircle, { backgroundColor: '#F0FDF4' }]}>
                    <Ionicons name="language-outline" size={20} color="#22C55E" />
                  </View>
                  <Text style={styles.menuItemText}>Preferred Language</Text>
                </View>
                <View style={styles.menuItemRight}>
                  <Text style={styles.menuItemValue}>
                    {editableData.preferred_language === 'en' ? 'English' : 'Hindi'}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                </View>
              </TouchableOpacity>
            </View>

            {/* Notification Preferences Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Notifications</Text>
                {hasChanges && (
                  <View style={styles.unsavedIndicator}>
                    <Text style={styles.unsavedText}>Unsaved</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.menuItem}>
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIconCircle, { backgroundColor: '#EFF6FF' }]}>
                    <Ionicons name="briefcase-outline" size={20} color="#2563EB" />
                  </View>
                  <View>
                    <Text style={styles.menuItemText}>Task Assignments</Text>
                    <Text style={styles.menuItemDescription}>Get notified when new tasks are assigned</Text>
                  </View>
                </View>
                <Switch
                  value={editableData.notification_preferences.task_assignments}
                  onValueChange={(value) =>
                    setEditableData(prev => ({
                      ...prev,
                      notification_preferences: {
                        ...prev.notification_preferences,
                        task_assignments: value,
                      },
                    }))
                  }
                  trackColor={{ false: '#E2E8F0', true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.menuItem}>
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIconCircle, { backgroundColor: '#FEF2F2' }]}>
                    <Ionicons name="alert-circle-outline" size={20} color="#EF4444" />
                  </View>
                  <View>
                    <Text style={styles.menuItemText}>Urgent Reports</Text>
                    <Text style={styles.menuItemDescription}>Immediate alerts for high-priority reports</Text>
                  </View>
                </View>
                <Switch
                  value={editableData.notification_preferences.urgent_reports}
                  onValueChange={(value) =>
                    setEditableData(prev => ({
                      ...prev,
                      notification_preferences: {
                        ...prev.notification_preferences,
                        urgent_reports: value,
                      },
                    }))
                  }
                  trackColor={{ false: '#E2E8F0', true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.menuItem}>
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIconCircle, { backgroundColor: '#F3E8FF' }]}>
                    <Ionicons name="settings-outline" size={20} color="#A855F7" />
                  </View>
                  <View>
                    <Text style={styles.menuItemText}>System Updates</Text>
                    <Text style={styles.menuItemDescription}>App updates and maintenance notifications</Text>
                  </View>
                </View>
                <Switch
                  value={editableData.notification_preferences.system_updates}
                  onValueChange={(value) =>
                    setEditableData(prev => ({
                      ...prev,
                      notification_preferences: {
                        ...prev.notification_preferences,
                        system_updates: value,
                      },
                    }))
                  }
                  trackColor={{ false: '#E2E8F0', true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.menuItem}>
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIconCircle, { backgroundColor: '#DCFCE7' }]}>
                    <Ionicons name="analytics-outline" size={20} color="#22C55E" />
                  </View>
                  <View>
                    <Text style={styles.menuItemText}>Performance Reports</Text>
                    <Text style={styles.menuItemDescription}>Monthly performance and analytics reports</Text>
                  </View>
                </View>
                <Switch
                  value={editableData.notification_preferences.performance_reports}
                  onValueChange={(value) =>
                    setEditableData(prev => ({
                      ...prev,
                      notification_preferences: {
                        ...prev.notification_preferences,
                        performance_reports: value,
                      },
                    }))
                  }
                  trackColor={{ false: '#E2E8F0', true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            {/* Save Changes Button - Only show when there are changes */}
            {hasChanges && (
              <View style={styles.section}>
                <TouchableOpacity
                  style={[styles.saveButton, (!isOnline || isUpdating) && styles.saveButtonDisabled]}
                  onPress={handleSaveChanges}
                  disabled={!isOnline || isUpdating}
                  activeOpacity={0.8}
                >
                  <View style={styles.saveButtonContent}>
                    {isUpdating ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Ionicons name="checkmark-circle-outline" size={22} color="#FFF" />
                    )}
                    <Text style={styles.saveButtonText}>
                      {isUpdating ? 'Saving...' : isOnline ? 'Save Changes' : 'Offline - Changes Cached'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* About Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => Alert.alert('Help & Support', 'Support resources coming soon')}
              >
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIconCircle, { backgroundColor: '#FEF2F2' }]}>
                    <Ionicons name="help-circle-outline" size={20} color="#EF4444" />
                  </View>
                  <Text style={styles.menuItemText}>Help & Support</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => Alert.alert('Terms & Privacy', 'Legal documents coming soon')}
              >
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIconCircle, { backgroundColor: '#F3E8FF' }]}>
                    <Ionicons name="document-text-outline" size={20} color="#A855F7" />
                  </View>
                  <Text style={styles.menuItemText}>Terms & Privacy</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
              </TouchableOpacity>

              <View style={styles.menuItem}>
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIconCircle, { backgroundColor: '#F0F9FF' }]}>
                    <Ionicons name="information-circle-outline" size={20} color="#0EA5E9" />
                  </View>
                  <Text style={styles.menuItemText}>App Version</Text>
                </View>
                <Text style={styles.menuItemValue}>1.0.0</Text>
              </View>
            </View>

            {/* Logout Section */}
            <View style={styles.section}>
              <TouchableOpacity 
                style={styles.logoutButton} 
                onPress={handleLogout}
                activeOpacity={0.8}
              >
                <View style={styles.logoutButtonContent}>
                  <Ionicons name="log-out-outline" size={22} color="#EF4444" />
                  <Text style={styles.logoutButtonText}>Logout</Text>
                </View>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="person-circle-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>
              {isHydrating ? 'Hydrating from cache...' : 
               isLoading ? 'Loading profile...' : 
               'No profile data available offline yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {isHydrating ? 'Restoring cached data' :
               isOnline ? 'Try again in a moment' : 'Connect to sync your profile'}
            </Text>
            {!isHydrating && (
              <TouchableOpacity
                style={styles.retryButton}
                onPress={refreshProfile}
                disabled={isLoading}
              >
                <Text style={styles.retryButtonText}>
                  {isLoading ? 'Loading...' : 'Retry'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color="#D32F2F" />
            <Text style={styles.errorText}>{error}</Text>
            {!isOnline && <Text style={styles.errorHint}>Showing cached data</Text>}
          </View>
        )}
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
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 100, // Space for bottom tab bar + extra padding
  },

  // Profile Header Card - Matching Citizen Design
  profileCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  profileGradient: {
    padding: 24,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
  },
  officerBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 2,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  profileDesignation: {
    fontSize: 16,
    color: '#E3F2FD',
    marginBottom: 4,
  },
  profileDepartment: {
    fontSize: 14,
    color: '#E3F2FD',
    marginBottom: 16,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    gap: 6,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },

  // Sections - Consistent with Citizen Profile
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  unsavedIndicator: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  unsavedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
  },

  // Menu Items - Consistent with Citizen Profile
  menuIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1E293B',
  },
  menuItemDescription: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuItemValue: {
    fontSize: 14,
    color: '#64748B',
    maxWidth: 120,
  },
  // Official Information - Individual Cards Like Other Sections
  officialInfoItem: {
    backgroundColor: '#FFF',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  officialInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  officialInfoLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1E293B',
  },
  officialInfoValue: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 52, // Align with label text (icon width + margin)
    fontWeight: '400',
  },


  // Removed admin badge styles - no longer needed
  
  // Save Button - Matching Citizen Design
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  saveButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 12,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },

  // Logout Button - Matching Citizen Design
  logoutButton: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    overflow: 'hidden',
  },
  logoutButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 12,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },

  // Empty State - Consistent with Citizen Profile
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
    marginHorizontal: 16,
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },

  // Error Container - Consistent styling
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
});
