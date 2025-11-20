// Authentication state management with Zustand
import { create } from 'zustand';
import { User, AuthTokens } from '@shared/types/user';
import { SecureStorage } from '@shared/services/storage';
import { BiometricAuth, BiometricCapabilities } from '@shared/services/biometric';

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  biometricCapabilities: BiometricCapabilities | null;
  isBiometricEnabled: boolean;

  // Actions
  setUser: (user: User) => void;
  setTokens: (tokens: AuthTokens) => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  refreshUser: () => Promise<void>;
  
  // Biometric actions
  checkBiometricCapabilities: () => Promise<BiometricCapabilities>;
  enableBiometric: (phone: string) => Promise<void>;
  disableBiometric: () => Promise<void>;
  authenticateWithBiometric: () => Promise<{ success: boolean; phone?: string; error?: string }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  biometricCapabilities: null,
  isBiometricEnabled: false,

  setUser: (user: User) => {
    set({ user, isAuthenticated: true });
  },

  setTokens: async (tokens: AuthTokens) => {
    // Set loading state first
    set({ isLoading: true });
    
    try {
      // Store tokens securely first
      await SecureStorage.setAuthToken(tokens.access_token);
      await SecureStorage.setRefreshToken(tokens.refresh_token);
      
      // Fetch user data BEFORE setting isAuthenticated to prevent navigation glitch
      const { authApi } = await import('@shared/services/api/authApi');
      const userData = await authApi.getCurrentUser();
      
      // Now set everything in ONE state update - prevents re-render glitch
      set({ 
        tokens, 
        user: userData, 
        isAuthenticated: true,
        isLoading: false,
        error: null 
      });
    } catch (error) {
      console.error('Failed to complete authentication:', error);
      // Clear auth state on error
      set({ 
        tokens: null, 
        user: null, 
        isAuthenticated: false,
        isLoading: false,
        error: 'Authentication failed' 
      });
      throw error; // Re-throw so login screen can handle it
    }
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  logout: async () => {
    try {
      // Set loading state during logout
      set({ isLoading: true });

      // Clear tokens from secure storage
      await SecureStorage.clearAuthTokens();
      await SecureStorage.clearUserData();

      // Clear biometric credentials
      try {
        await BiometricAuth.clearBiometricCredentials();
      } catch (biometricError) {
        console.warn('Failed to clear biometric credentials:', biometricError);
      }

      // Clear all caches
      try {
        const { cacheService } = await import('@shared/services/cache/CacheService');
        await cacheService.clearAll();
      } catch (cacheError) {
        console.warn('Failed to clear cache:', cacheError);
      }

      // Clear state completely
      set({
        user: null,
        tokens: null,
        isAuthenticated: false,
        error: null,
        isLoading: false,
        isBiometricEnabled: false,
      });

      console.log('✅ Logout completed successfully');
    } catch (error) {
      console.error('❌ Logout failed:', error);
      // Still clear state even if cleanup fails
      set({
        user: null,
        tokens: null,
        isAuthenticated: false,
        error: 'Logout completed with errors',
        isLoading: false,
        isBiometricEnabled: false,
      });
    }
  },

  initialize: async () => {
    try {
      set({ isLoading: true });

      // Check biometric capabilities (local only - no network required)
      try {
        const capabilities = await BiometricAuth.checkAvailability();
        const isBiometricEnabled = await BiometricAuth.isBiometricEnabled();
        
        set({ 
          biometricCapabilities: capabilities,
          isBiometricEnabled,
        });
      } catch (biometricError) {
        console.warn('Biometric initialization failed:', biometricError);
        // Continue without biometric support
      }

      // Try to restore session from secure storage (local only - no network required)
      const accessToken = await SecureStorage.getAuthToken();
      const refreshToken = await SecureStorage.getRefreshToken();
      const userData = await SecureStorage.getUserData<User>();

      if (accessToken && refreshToken && userData) {
        // Validate token before setting authenticated state
        try {
          // Check if token is expired (local validation - no network required)
          const payload = JSON.parse(atob(accessToken.split('.')[1]));
          const now = Date.now() / 1000;
          const isExpired = payload.exp < now;
          
          if (isExpired) {
            console.log('🔑 Access token expired, will attempt refresh when network available');
            // Don't try to refresh during initialization - do it later when network is available
            // For now, clear the expired tokens
            await get().logout();
          } else {
            // Token is still valid - restore session without network call
            set({
              user: userData,
              tokens: {
                access_token: accessToken,
                refresh_token: refreshToken,
                user_id: userData.id,
                role: userData.role,
              },
              isAuthenticated: true,
            });
            
            console.log('✅ Valid session restored (offline)');
          }
        } catch (tokenError) {
          console.error('❌ Token validation failed:', tokenError);
          // Clear invalid tokens
          await get().logout();
        }
      } else {
        console.log('ℹ️ No stored session found');
      }
    } catch (error) {
      console.error('❌ Failed to initialize auth:', error);
      // Don't block app initialization - just clear auth state
      set({
        user: null,
        tokens: null,
        isAuthenticated: false,
        error: null,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  refreshUser: async () => {
    try {
      const { authApi } = await import('@shared/services/api/authApi');
      const userData = await authApi.getCurrentUser();
      
      // Update user in state
      set({ user: userData });
      
      // Update user in secure storage
      await SecureStorage.setUserData(userData);
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      throw error;
    }
  },

  // Biometric authentication methods
  checkBiometricCapabilities: async () => {
    const capabilities = await BiometricAuth.checkAvailability();
    set({ biometricCapabilities: capabilities });
    return capabilities;
  },

  enableBiometric: async (phone: string) => {
    try {
      // Store phone for biometric login
      await BiometricAuth.storeCredentialsForBiometric(phone);
      
      // Enable biometric
      await BiometricAuth.enableBiometric();
      
      set({ isBiometricEnabled: true });
    } catch (error) {
      console.error('Failed to enable biometric:', error);
      throw error;
    }
  },

  disableBiometric: async () => {
    try {
      await BiometricAuth.clearBiometricCredentials();
      set({ isBiometricEnabled: false });
    } catch (error) {
      console.error('Failed to disable biometric:', error);
      throw error;
    }
  },

  authenticateWithBiometric: async () => {
    try {
      const result = await BiometricAuth.authenticateAndGetCredentials();
      
      if (!result.success) {
        return result;
      }

      // If authentication successful and we have phone, attempt login
      if (result.phone) {
        // Check if we have valid tokens already
        const accessToken = await SecureStorage.getAuthToken();
        const refreshToken = await SecureStorage.getRefreshToken();
        const userData = await SecureStorage.getUserData<User>();

        if (accessToken && refreshToken && userData) {
          // Restore session
          set({
            user: userData,
            tokens: {
              access_token: accessToken,
              refresh_token: refreshToken,
              user_id: userData.id,
              role: userData.role,
            },
            isAuthenticated: true,
          });

          return { success: true, phone: result.phone };
        }
      }

      return result;
    } catch (error: any) {
      console.error('Biometric authentication failed:', error);
      return {
        success: false,
        error: error.message || 'Biometric authentication failed',
      };
    }
  },
}));
