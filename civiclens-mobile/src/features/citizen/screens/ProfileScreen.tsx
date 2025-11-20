/**
 * ProfileScreen - Consistent with Dashboard Design
 * Production-ready with matching navbar and theme
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuthStore } from '@store/authStore';
import { apiClient } from '@shared/services/api/apiClient';
import { userApi, type UserStats } from '@shared/services/api/userApi';
import { TopNavbar } from '@shared/components';
import { BiometricSettings } from '@/features/auth/components/BiometricSettings';

interface UserProfile {
  id: number;
  phone: string;
  email?: string;
  full_name?: string;
  role: string;
  reputation_score: number;
  total_reports: number;
  total_validations: number;
  helpful_validations: number;
  primary_address?: string;
  bio?: string;
  preferred_language?: string;
  phone_verified: boolean;
  email_verified: boolean;
  created_at: string;
}

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const { logout, refreshUser } = useAuthStore();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const [profileData, statsData] = await Promise.all([
        apiClient.get<UserProfile>('/users/me'),
        userApi.getMyStats(),
      ]);
      
      setProfile(profileData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshUser();
      await loadProfile();
    } catch (error) {
      console.error('Failed to refresh:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => logout(),
        },
      ]
    );
  };

  const getBadgeLevel = (reputation: number): { name: string; color: string; icon: string } => {
    if (reputation >= 1000) return { name: 'Gold', color: '#FFD700', icon: 'trophy' };
    if (reputation >= 500) return { name: 'Silver', color: '#C0C0C0', icon: 'medal' };
    if (reputation >= 100) return { name: 'Bronze', color: '#CD7F32', icon: 'ribbon' };
    return { name: 'Beginner', color: '#94A3B8', icon: 'star' };
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976D2" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  if (!profile || !stats) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#F44336" />
          <Text style={styles.errorText}>Failed to load profile</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadProfile}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const badge = getBadgeLevel(stats.reputation_score || 0);

  return (
    <View style={styles.container}>
      {/* Reusable Top Navbar */}
      <TopNavbar
        title="Profile"
        showNotifications={true}
      />

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#1976D2']}
            tintColor="#1976D2"
          />
        }
      >
        {/* Profile Header Card */}
        <View style={styles.profileCard}>
          <LinearGradient
            colors={['#1976D2', '#1565C0']}
            style={styles.profileGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {profile.full_name?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
              {profile.phone_verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                </View>
              )}
            </View>

            <Text style={styles.profileName}>
              {profile.full_name || 'User'}
            </Text>
            <Text style={styles.profilePhone}>{profile.phone}</Text>
            {profile.email && (
              <Text style={styles.profileEmail}>{profile.email}</Text>
            )}

            <View style={[styles.badgeContainer, { backgroundColor: badge.color }]}>
              <Ionicons name={badge.icon as any} size={16} color="#FFF" />
              <Text style={styles.badgeText}>{badge.name} Citizen</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Reputation Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reputation</Text>
          <View style={styles.reputationCard}>
            <View style={styles.reputationHeader}>
              <Text style={styles.reputationScore}>{stats.reputation_score}</Text>
              <Text style={styles.reputationLabel}>Points</Text>
            </View>
            {stats.next_milestone && (
              <Text style={styles.nextMilestone}>
                Next: {stats.next_milestone}
              </Text>
            )}
            {stats.can_promote_to_contributor && (
              <View style={styles.promotionBanner}>
                <Ionicons name="trophy" size={20} color="#FFD700" />
                <Text style={styles.promotionText}>
                  Eligible for Contributor status!
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Account Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => (navigation as any).navigate('EditProfile')}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconCircle, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="person-outline" size={20} color="#2563EB" />
              </View>
              <Text style={styles.menuItemText}>Edit Profile</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => (navigation as any).navigate('Notifications')}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconCircle, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="notifications-outline" size={20} color="#F59E0B" />
              </View>
              <Text style={styles.menuItemText}>Notifications</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

        {/* Security Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <BiometricSettings phone={profile.phone} />
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => Alert.alert('Language', 'Language selection coming soon')}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconCircle, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="language-outline" size={20} color="#3B82F6" />
              </View>
              <Text style={styles.menuItemText}>Language</Text>
            </View>
            <View style={styles.menuItemRight}>
              <Text style={styles.menuItemValue}>English</Text>
              <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => Alert.alert('Privacy & Security', 'Privacy settings coming soon')}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconCircle, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#22C55E" />
              </View>
              <Text style={styles.menuItemText}>Privacy & Security</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

        {/* About */}
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

        {/* Logout Button - Now visible with proper padding */}
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
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
  errorText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: '#1976D2',
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },

  // Scrollable Content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 100, // Space for bottom tab bar + extra padding
  },

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
    color: '#1976D2',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderRadius: 12,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  profilePhone: {
    fontSize: 16,
    color: '#E3F2FD',
    marginBottom: 4,
  },
  profileEmail: {
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
    gap: 6,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },

  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  reputationCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  reputationHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  reputationScore: {
    fontSize: 48,
    fontWeight: '700',
    color: '#1976D2',
  },
  reputationLabel: {
    fontSize: 16,
    color: '#64748B',
  },
  nextMilestone: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 12,
  },
  promotionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF9E6',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  promotionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F57C00',
  },
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
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1E293B',
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuItemValue: {
    fontSize: 14,
    color: '#64748B',
  },
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
});
