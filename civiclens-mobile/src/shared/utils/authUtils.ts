/**
 * Authentication utilities for handling auth state cleanup and validation
 */

import { SecureStorage } from '@shared/services/storage';
import { createLogger } from './logger';

const log = createLogger('AuthUtils');

/**
 * Force logout and clear all authentication state
 * Use this when authentication errors occur
 */
export const forceLogout = async (): Promise<void> => {
  try {
    log.warn('🚪 Force logout triggered - clearing all auth state');
    
    // Clear tokens from secure storage
    await SecureStorage.clearAuthTokens();
    await SecureStorage.clearUserData();
    
    // Clear biometric credentials
    try {
      const { BiometricAuth } = await import('@shared/services/biometric');
      await BiometricAuth.clearBiometricCredentials();
    } catch (biometricError) {
      log.warn('Failed to clear biometric credentials:', biometricError);
    }
    
    // Clear all caches
    try {
      const { cacheService } = await import('@shared/services/cache/CacheService');
      await cacheService.clearAll();
    } catch (cacheError) {
      log.warn('Failed to clear cache:', cacheError);
    }
    
    // Update auth store state
    try {
      const { useAuthStore } = await import('@/store/authStore');
      const { logout } = useAuthStore.getState();
      await logout();
    } catch (storeError) {
      log.warn('Failed to update auth store:', storeError);
    }
    
    log.info('✅ Force logout completed');
  } catch (error) {
    log.error('❌ Force logout failed:', error);
    throw error;
  }
};

/**
 * Validate if a JWT token is valid and not expired
 */
export const validateToken = (token: string): { isValid: boolean; isExpired: boolean; payload?: any } => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Date.now() / 1000;
    const isExpired = payload.exp < now;
    
    return {
      isValid: true,
      isExpired,
      payload,
    };
  } catch (error) {
    return {
      isValid: false,
      isExpired: true,
    };
  }
};

/**
 * Check if current auth state is valid
 * Returns true if user has valid, non-expired tokens
 */
export const isAuthStateValid = async (): Promise<boolean> => {
  try {
    const token = await SecureStorage.getAuthToken();
    const refreshToken = await SecureStorage.getRefreshToken();
    const userData = await SecureStorage.getUserData();
    
    if (!token || !refreshToken || !userData) {
      return false;
    }
    
    const validation = validateToken(token);
    return validation.isValid && !validation.isExpired;
  } catch (error) {
    log.error('Failed to validate auth state:', error);
    return false;
  }
};

/**
 * Clean up invalid auth state
 * Call this when you detect invalid/expired tokens
 */
export const cleanupInvalidAuthState = async (): Promise<void> => {
  log.warn('🧹 Cleaning up invalid auth state');
  
  try {
    await SecureStorage.clearAuthTokens();
    await SecureStorage.clearUserData();
    
    // Notify auth store
    try {
      const { useAuthStore } = await import('@/store/authStore');
      const store = useAuthStore.getState();
      // Clear auth state in store
      store.logout();
    } catch (storeError) {
      log.warn('Failed to update auth store during cleanup:', storeError);
    }
    
    log.info('✅ Invalid auth state cleaned up');
  } catch (error) {
    log.error('❌ Failed to cleanup auth state:', error);
    throw error;
  }
};
