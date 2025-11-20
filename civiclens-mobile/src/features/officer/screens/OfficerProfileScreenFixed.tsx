/**
 * Officer Profile Screen - Production Ready
 * Profile management for officers with admin-controlled fields
 * Implements offline-first with hydration and caching
 * Smart change tracking - Save button only appears when there are changes
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Hooks and Services
import { useAuthStore } from '../../../store/authStore';
import { useOfficerProfile } from '../../../shared/hooks/useOfficerProfile';
import { networkService } from '../../../shared/services/network/networkService';
import { TopNavbar, OfflineIndicator, SyncStatusIndicator } from '../../../shared/components';
import { colors } from '../../../shared/theme/colors';

export const OfficerProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { logout } = useAuthStore();
  
  const {
    profile,
    isLoading,
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

  const renderAdminControlledField = (label: string, value: string, icon: string) => (
    <View style={styles.fieldContainer}>
      <View style={styles.fieldHeader}>
        <Ionicons name={icon as any} size={20} color={colors.primary} />
        <Text style={styles.fieldLabel}>{label}</Text>
        <View style={styles.adminBadge}>
          <Text style={styles.adminBadgeText}>Admin</Text>
        </View>
      </View>
      <Text style={styles.adminFieldValue}>{value}</Text>
    </View>
  );

  const renderEditableField = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    icon: string,
    multiline = false
  ) => (
    <View style={styles.fieldContainer}>
      <View style={styles.fieldHeader}>
        <Ionicons name={icon as any} size={20} color={colors.primary} />
        <Text style={styles.fieldLabel}>{label}</Text>
      </View>
      <View style={styles.inputContainer}>
        <Text
          style={[styles.editableInput, multiline && styles.multilineInput]}
          onPress={() => {
            Alert.prompt(
              `Edit ${label}`,
              '',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Save', onPress: (text?: string) => onChangeText(text || '') },
              ],
              'plain-text',
              value
            );
          }}
        >
          {value || `Tap to add ${label.toLowerCase()}`}
        </Text>
        <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
      </View>
    </View>
  );

  const renderNotificationToggle = (
    key: keyof typeof editableData.notification_preferences,
    label: string,
    description: string
  ) => (
    <View style={styles.notificationItem}>
      <View style={styles.notificationInfo}>
        <Text style={styles.notificationLabel}>{label}</Text>
        <Text style={styles.notificationDescription}>{description}</Text>
      </View>
      <Switch
        value={editableData.notification_preferences[key]}
        onValueChange={(value) =>
          setEditableData(prev => ({
            ...prev,
            notification_preferences: {
              ...prev.notification_preferences,
              [key]: value,
            },
          }))
        }
        trackColor={{ false: '#E2E8F0', true: colors.primary }}
        thumbColor="#FFFFFF"
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <TopNavbar
        title="Officer Profile"
        showBack={false}
        showNotifications={false}
      />

      <OfflineIndicator />
      <SyncStatusIndicator />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent, 
          { 
            paddingTop: insets.top + 80, // Account for TopNavbar height
            paddingBottom: insets.bottom + 100 
          }
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refreshProfile}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {hasData && profile ? (
          <>
            {/* Profile Header */}
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                {profile.avatar_url ? (
                  <View style={styles.avatar}>
                    <Ionicons name="person" size={40} color="#FFF" />
                  </View>
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={40} color={colors.primary} />
                  </View>
                )}
                <View style={styles.officerBadge}>
                  <Ionicons name="shield-checkmark" size={16} color="#FFF" />
                </View>
              </View>
              <Text style={styles.officerName}>{profile.full_name}</Text>
              <Text style={styles.officerDesignation}>{profile.designation}</Text>
              <Text style={styles.officerDepartment}>{profile.department}</Text>
            </View>

            {/* Admin Controlled Fields */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Official Information</Text>
              {renderAdminControlledField('Employee ID', profile.employee_id, 'card')}
              {renderAdminControlledField('Phone Number', profile.phone, 'call')}
              {renderAdminControlledField('Email Address', profile.email, 'mail')}
              {renderAdminControlledField('Assigned Zone', profile.zone_assigned, 'location')}
            </View>

            {/* Personal Information */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Personal Information</Text>
                {hasChanges && (
                  <View style={styles.unsavedIndicator}>
                    <Text style={styles.unsavedText}>Unsaved changes</Text>
                  </View>
                )}
              </View>
              {renderEditableField(
                'Bio',
                editableData.bio,
                (text) => setEditableData(prev => ({ ...prev, bio: text })),
                'document-text',
                true
              )}
              {renderEditableField(
                'Preferred Language',
                editableData.preferred_language === 'en' ? 'English' : 'Hindi',
                (text) => setEditableData(prev => ({ ...prev, preferred_language: text.toLowerCase().includes('hindi') ? 'hi' : 'en' })),
                'language'
              )}
            </View>

            {/* Notification Preferences */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Notification Preferences</Text>
                {hasChanges && (
                  <View style={styles.unsavedIndicator}>
                    <Text style={styles.unsavedText}>Unsaved changes</Text>
                  </View>
                )}
              </View>
              <View style={styles.notificationContainer}>
                {renderNotificationToggle(
                  'task_assignments',
                  'Task Assignments',
                  'Get notified when new tasks are assigned'
                )}
                {renderNotificationToggle(
                  'urgent_reports',
                  'Urgent Reports',
                  'Immediate alerts for high-priority reports'
                )}
                {renderNotificationToggle(
                  'system_updates',
                  'System Updates',
                  'App updates and maintenance notifications'
                )}
                {renderNotificationToggle(
                  'performance_reports',
                  'Performance Reports',
                  'Monthly performance and analytics reports'
                )}
              </View>
            </View>

            {/* Save Changes Button - Only show when there are changes */}
            {hasChanges && (
              <TouchableOpacity
                style={[styles.saveButton, (!isOnline || isUpdating) && styles.saveButtonDisabled]}
                onPress={handleSaveChanges}
                disabled={!isOnline || isUpdating}
                activeOpacity={0.8}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                    <Text style={styles.saveButtonText}>
                      {isOnline ? 'Save Changes' : 'Offline - Changes Cached'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Account Actions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Account</Text>
              
              <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
                <Ionicons name="help-circle" size={20} color={colors.primary} />
                <Text style={styles.actionButtonText}>Help & Support</Text>
                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
                <Ionicons name="document-text" size={20} color={colors.primary} />
                <Text style={styles.actionButtonText}>Terms & Privacy</Text>
                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.logoutButton]}
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <Ionicons name="log-out" size={20} color="#EF4444" />
                <Text style={[styles.actionButtonText, styles.logoutButtonText]}>Logout</Text>
                <Ionicons name="chevron-forward" size={16} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="person-circle-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>
              {isLoading ? 'Loading profile...' : 'No profile data available offline yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {isOnline ? 'Try again in a moment' : 'Connect to sync your profile'}
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={refreshProfile}
              disabled={isLoading}
            >
              <Text style={styles.retryButtonText}>
                {isLoading ? 'Loading...' : 'Retry'}
              </Text>
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
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
  },

  // Profile Header
  profileHeader: {
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 32,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  officerBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  officerName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  officerDesignation: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 2,
  },
  officerDepartment: {
    fontSize: 14,
    color: '#64748B',
  },

  // Sections
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
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

  // Fields
  fieldContainer: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
    flex: 1,
  },
  adminBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#DC2626',
  },
  adminFieldValue: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 28,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 28,
  },
  editableInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    paddingVertical: 4,
  },
  multilineInput: {
    minHeight: 40,
  },

  // Notifications
  notificationContainer: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  notificationInfo: {
    flex: 1,
    marginRight: 16,
  },
  notificationLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  notificationDescription: {
    fontSize: 14,
    color: '#6B7280',
  },

  // Save Button
  saveButton: {
    backgroundColor: colors.primary,
    marginHorizontal: 16,
    marginVertical: 16,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0.1,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },

  // Action Buttons
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 12,
    flex: 1,
  },
  logoutButton: {
    borderColor: '#FEE2E2',
    borderWidth: 1,
  },
  logoutButtonText: {
    color: '#EF4444',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 16,
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
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 24,
    backgroundColor: colors.primary,
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
});
