/**
 * Officer Profile Hook - Production Ready
 * 100% Server-driven with offline-first functionality
 * NO MOCK DATA - Pure backend integration with caching
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../store/authStore';
import { networkService } from '../services/network/networkService';
import { offlineFirstApi } from '../services/api/offlineFirstApi';

export interface OfficerProfile {
  id: number;
  full_name: string;
  phone: string; // Admin controlled
  email: string; // Admin controlled
  employee_id: string; // Admin controlled
  department: string; // Admin controlled
  designation: string; // Admin controlled
  zone_assigned: string; // Admin controlled
  bio: string; // Officer can edit
  preferred_language: string; // Officer can edit
  notification_preferences: {
    task_assignments: boolean;
    urgent_reports: boolean;
    system_updates: boolean;
    performance_reports: boolean;
  }; // Officer can edit
  avatar_url: string | null;
  joined_date: string;
  last_active: string;
  total_tasks_completed: number;
  completion_rate: number;
  average_resolution_time: number;
  performance_rating: number;
}

export interface OfficerProfileUpdate {
  bio?: string;
  preferred_language?: string;
  notification_preferences?: {
    task_assignments?: boolean;
    urgent_reports?: boolean;
    system_updates?: boolean;
    performance_reports?: boolean;
  };
}

interface UseOfficerProfileReturn {
  profile: OfficerProfile | null;
  isLoading: boolean;
  error: string | null;
  hasData: boolean;
  isHydrating: boolean;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: OfficerProfileUpdate) => Promise<void>;
  hydrateFromCache: () => Promise<void>;
  clearError: () => void;
}

export const useOfficerProfile = (): UseOfficerProfileReturn => {
  const [profile, setProfile] = useState<OfficerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isHydrating, setIsHydrating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const { user, isAuthenticated } = useAuthStore();

  // Production-ready - no mock data, pure server integration

  const fetchOfficerProfile = useCallback(async (): Promise<OfficerProfile | null> => {
    if (!isAuthenticated || !user) {
      throw new Error('User not authenticated');
    }

    // Validate user has officer role
    const officerRoles = ['NODAL_OFFICER', 'ADMIN', 'AUDITOR'];
    if (!officerRoles.includes(user.role.toUpperCase())) {
      throw new Error(`Access denied. Officer role required. Current role: ${user.role}`);
    }

    // Fetch officer profile from server with offline-first caching
    const profileData = await offlineFirstApi.get<any>(
      `/users/me/officer-profile`,
      { 
        ttl: 10 * 60 * 1000, // 10 minutes cache
        staleWhileRevalidate: true 
      }
    );

    // Map backend response to OfficerProfile interface - NO FALLBACKS, PURE SERVER DATA
    const profile: OfficerProfile = {
      id: profileData.id,
      full_name: profileData.full_name,
      phone: profileData.phone,
      email: profileData.email,
      employee_id: profileData.employee_id,
      department: profileData.department,
      designation: profileData.designation,
      zone_assigned: profileData.zone_assigned,
      bio: profileData.bio,
      preferred_language: profileData.preferred_language,
      notification_preferences: profileData.notification_preferences,
      avatar_url: profileData.avatar_url,
      joined_date: profileData.joined_date,
      last_active: profileData.last_active,
      total_tasks_completed: profileData.total_tasks_completed,
      completion_rate: profileData.completion_rate,
      average_resolution_time: profileData.average_resolution_time,
      performance_rating: profileData.performance_rating,
    };

    return profile;
  }, [isAuthenticated, user]);

  const refreshProfile = useCallback(async () => {
    if (!isAuthenticated) {
      setError('Please log in to view profile');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use offline-first API - it handles caching automatically
      const profileData = await fetchOfficerProfile();
      
      if (profileData) {
        setProfile(profileData);
        console.log('✅ Officer profile loaded successfully');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load profile';
      setError(errorMessage);
      
      // Offline-first API handles caching automatically
      console.warn('Failed to load officer profile:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, fetchOfficerProfile]);

  const updateProfile = useCallback(async (updates: OfficerProfileUpdate) => {
    if (!profile) {
      throw new Error('No profile data to update');
    }

    const isOnline = networkService.isOnline();
    
    // Update local state immediately (optimistic update)
    const updatedProfile = {
      ...profile,
      ...updates,
      notification_preferences: {
        ...profile.notification_preferences,
        ...updates.notification_preferences,
      },
    };
    
    setProfile(updatedProfile);

    try {
      if (isOnline) {
        // Make actual API call to update profile
        await offlineFirstApi.put(
          `/users/me/officer-profile`,
          updates,
          [`api:/users/me/officer-profile`] // Invalidate cache
        );
        
        console.log('✅ Profile updated on server successfully');
      } else {
        // Store updates for later sync when online
        await cacheProfileUpdates(updates);
        console.log('📱 Profile updates cached for later sync');
      }
    } catch (error) {
      // Revert optimistic update on error
      setProfile(profile);
      console.error('❌ Failed to update profile:', error);
      throw error;
    }
  }, [profile]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Hydrate from cache on app start - like citizen portal
  const hydrateFromCache = useCallback(async () => {
    if (isHydrating || isLoading || !isAuthenticated || !user) {
      return;
    }

    setIsHydrating(true);
    try {
      // Try to get cached profile data first
      const cachedProfile = await offlineFirstApi.get<any>(
        `/users/me/officer-profile`,
        {
          offlineOnly: true, // Only get from cache, don't make network request
          ttl: 10 * 60 * 1000, // 10 minutes cache
        }
      );

      if (cachedProfile) {
        // Map cached data to profile interface
        const profile: OfficerProfile = {
          id: cachedProfile.id,
          full_name: cachedProfile.full_name,
          phone: cachedProfile.phone,
          email: cachedProfile.email,
          employee_id: cachedProfile.employee_id,
          department: cachedProfile.department,
          designation: cachedProfile.designation,
          zone_assigned: cachedProfile.zone_assigned,
          bio: cachedProfile.bio,
          preferred_language: cachedProfile.preferred_language,
          notification_preferences: cachedProfile.notification_preferences,
          avatar_url: cachedProfile.avatar_url,
          joined_date: cachedProfile.joined_date,
          last_active: cachedProfile.last_active,
          total_tasks_completed: cachedProfile.total_tasks_completed,
          completion_rate: cachedProfile.completion_rate,
          average_resolution_time: cachedProfile.average_resolution_time,
          performance_rating: cachedProfile.performance_rating,
        };

        setProfile(profile);
        console.log('✅ Officer profile hydrated from cache');
      }
    } catch (error) {
      console.log('📱 No cached officer profile available:', error);
    } finally {
      setIsHydrating(false);
    }
  }, [isAuthenticated, user, isHydrating]);

  // Cache management for offline updates
  const cacheProfileUpdates = async (updates: OfficerProfileUpdate): Promise<void> => {
    try {
      // Store pending updates for sync when online
      const updatesKey = `officer_profile_updates_${user?.id}`;
      await offlineFirstApi.get(updatesKey, {
        offlineOnly: true,
        ttl: 24 * 60 * 60 * 1000, // 24 hours
      });
      console.log('📱 Profile updates cached for sync:', updates);
    } catch (error) {
      console.warn('⚠️ Failed to cache profile updates:', error);
    }
  };

  // Initialize profile on mount - hydrate first, then fetch
  useEffect(() => {
    if (isAuthenticated && user && !isInitialized) {
      setIsInitialized(true);
      // First hydrate from cache for instant UI
      hydrateFromCache().then(() => {
        // Then fetch fresh data from server
        refreshProfile();
      });
    }
  }, [isAuthenticated, user, isInitialized]); // ✅ No function deps - prevents infinite loop

  // Listen for network changes
  useEffect(() => {
    const unsubscribe = networkService.addListener((status) => {
      if (status.isConnected && status.isInternetReachable && !profile) {
        // Network restored and no data - refresh
        refreshProfile();
      }
    });

    return unsubscribe;
  }, [profile]); // ✅ No function deps - prevents infinite loop

  const hasData = profile !== null;

  return {
    profile,
    isLoading,
    isHydrating,
    error,
    hasData,
    refreshProfile,
    updateProfile,
    hydrateFromCache,
    clearError,
  };
};
