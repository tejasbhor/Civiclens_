/**
 * TopNavbar - Reusable Navigation Bar Component
 * Consistent design across all screens with dynamic content
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NotificationBell } from './NotificationBell';

interface TopNavbarProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  showLocation?: boolean;
  location?: string;
  showNotifications?: boolean;
  showProfile?: boolean;
  showLanguage?: boolean;
  showSearch?: boolean;
  onLocationPress?: () => void;
  onProfilePress?: () => void;
  onLanguagePress?: () => void;
  onSearchPress?: () => void;
  rightActions?: React.ReactNode;
  titleStyle?: 'default' | 'compact';
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  title,
  subtitle,
  showBack = false,
  showLocation = false,
  location = 'Navi Mumbai, Kharghar',
  showNotifications = false,
  showProfile = false,
  showLanguage = false,
  showSearch = false,
  onLocationPress,
  onProfilePress,
  onLanguagePress,
  onSearchPress,
  rightActions,
  titleStyle = 'default',
}) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.topNavbar}>
      <LinearGradient
        colors={['#1976D2', '#1565C0']}
        style={[
          styles.navbarGradient,
          { paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 44 : 20) + 8 }
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.navbarTop}>
          {/* Left Section */}
          <View style={styles.navbarLeft}>
            {showBack && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={24} color="#FFF" />
              </TouchableOpacity>
            )}

            {showLocation && (
              <TouchableOpacity
                style={styles.locationButton}
                activeOpacity={0.7}
                onPress={onLocationPress || (() => console.log('Open location picker'))}
              >
                <Ionicons name="location-sharp" size={18} color="#FFF" />
                <View style={styles.locationInfo}>
                  <Text style={styles.locationLabel}>Location</Text>
                  <Text style={styles.locationCity}>{location}</Text>
                </View>
                <Ionicons name="chevron-down" size={16} color="#FFF" />
              </TouchableOpacity>
            )}

            {title && !showLocation && (
              <View style={styles.titleContainer}>
                <Text 
                  style={[
                    styles.navbarTitle,
                    titleStyle === 'compact' && styles.navbarTitleCompact
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="middle"
                >
                  {title}
                </Text>
                {subtitle && (
                  <Text style={styles.navbarSubtitle} numberOfLines={1}>
                    {subtitle}
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Right Section */}
          <View style={styles.navbarActions}>
            {rightActions}

            {showLanguage && (
              <TouchableOpacity
                style={styles.navbarIconButton}
                onPress={onLanguagePress || (() => console.log('Open language selector'))}
              >
                <Ionicons name="language" size={22} color="#FFF" />
              </TouchableOpacity>
            )}

            {showNotifications && (
              <NotificationBell
                size={22}
                variant="navbar"
                style={styles.notificationBellContainer}
              />
            )}

            {showProfile && (
              <TouchableOpacity
                style={styles.navbarIconButton}
                onPress={onProfilePress || (() => console.log('Open profile'))}
              >
                <Ionicons name="person-circle" size={26} color="#FFF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Search Bar */}
        {showSearch && (
          <TouchableOpacity
            style={styles.searchBar}
            activeOpacity={0.7}
            onPress={onSearchPress || (() => console.log('Open search'))}
          >
            <Ionicons name="search" size={20} color="#64748B" />
            <Text style={styles.searchPlaceholder}>Search reports, issues...</Text>
            <Ionicons name="options" size={20} color="#64748B" />
          </TouchableOpacity>
        )}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  topNavbar: {
    // Removed absolute positioning to prevent overlap
    zIndex: 10,
  },
  navbarGradient: {
    // paddingTop is now dynamic based on safe area insets
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  navbarTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 40,
  },
  navbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0, // Allow text truncation
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
  titleContainer: {
    flex: 1,
    minWidth: 0, // Allow text truncation
  },
  navbarTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    lineHeight: 24,
  },
  navbarTitleCompact: {
    fontSize: 16,
    lineHeight: 20,
  },
  navbarSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  navbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 0, // Prevent actions from shrinking
  },
  navbarIconButton: {
    position: 'relative',
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  searchPlaceholder: {
    fontSize: 15,
    color: '#64748B',
    flex: 1,
    fontWeight: '500',
  },
  notificationBellContainer: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
});
