// Biometric authentication service using expo-local-authentication
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

export interface BiometricCapabilities {
  isAvailable: boolean;
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
}

export class BiometricAuth {
  /**
   * Check if biometric authentication is available on the device
   */
  static async checkAvailability(): Promise<BiometricCapabilities> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

      return {
        isAvailable: hasHardware && isEnrolled,
        hasHardware,
        isEnrolled,
        supportedTypes,
      };
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      return {
        isAvailable: false,
        hasHardware: false,
        isEnrolled: false,
        supportedTypes: [],
      };
    }
  }

  /**
   * Get a user-friendly name for the biometric type
   */
  static getBiometricTypeName(types: LocalAuthentication.AuthenticationType[]): string {
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'Iris Recognition';
    }
    return 'Biometric Authentication';
  }

  /**
   * Authenticate user with biometrics
   * @param promptMessage - Custom message to display in the authentication prompt
   * @param cancelLabel - Custom label for the cancel button (Android only)
   * @returns Promise<boolean> - true if authentication successful, false otherwise
   */
  static async authenticate(
    promptMessage?: string,
    cancelLabel?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if biometrics are available
      const capabilities = await this.checkAvailability();

      if (!capabilities.isAvailable) {
        if (!capabilities.hasHardware) {
          return {
            success: false,
            error: 'Biometric hardware not available on this device',
          };
        }
        if (!capabilities.isEnrolled) {
          return {
            success: false,
            error: 'No biometric credentials enrolled. Please set up biometrics in device settings.',
          };
        }
        return {
          success: false,
          error: 'Biometric authentication not available',
        };
      }

      // Get biometric type name for the prompt
      const biometricType = this.getBiometricTypeName(capabilities.supportedTypes);
      const defaultPrompt = `Authenticate with ${biometricType}`;

      // Attempt authentication
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: promptMessage || defaultPrompt,
        cancelLabel: cancelLabel || 'Cancel',
        disableDeviceFallback: false, // Allow fallback to device passcode
        fallbackLabel: 'Use Passcode', // iOS only
      });

      if (result.success) {
        return { success: true };
      } else {
        // Handle different error types
        let errorMessage = 'Authentication failed';
        
        if (result.error === 'user_cancel') {
          errorMessage = 'Authentication cancelled by user';
        } else if (result.error === 'system_cancel') {
          errorMessage = 'Authentication cancelled by system';
        } else if (result.error === 'lockout') {
          errorMessage = 'Too many failed attempts. Please try again later.';
        } else if (result.error === 'lockout_permanent') {
          errorMessage = 'Biometric authentication is locked. Please use device passcode.';
        } else if (result.error === 'not_enrolled') {
          errorMessage = 'No biometric credentials enrolled';
        } else if (result.error === 'not_available') {
          errorMessage = 'Biometric authentication not available';
        }

        return {
          success: false,
          error: errorMessage,
        };
      }
    } catch (error: any) {
      console.error('Biometric authentication error:', error);
      return {
        success: false,
        error: error.message || 'An unexpected error occurred',
      };
    }
  }

  /**
   * Check if biometric authentication is enabled for the app
   * This checks if the user has opted in to use biometrics
   */
  static async isBiometricEnabled(): Promise<boolean> {
    try {
      const { SecureStorage } = await import('@shared/services/storage');
      const enabled = await SecureStorage.getItem('biometric_enabled');
      return enabled === 'true';
    } catch (error) {
      console.error('Error checking biometric enabled status:', error);
      return false;
    }
  }

  /**
   * Enable biometric authentication for the app
   */
  static async enableBiometric(): Promise<void> {
    try {
      const { SecureStorage } = await import('@shared/services/storage');
      await SecureStorage.setItem('biometric_enabled', 'true');
    } catch (error) {
      console.error('Error enabling biometric:', error);
      throw error;
    }
  }

  /**
   * Disable biometric authentication for the app
   */
  static async disableBiometric(): Promise<void> {
    try {
      const { SecureStorage } = await import('@shared/services/storage');
      await SecureStorage.deleteItem('biometric_enabled');
    } catch (error) {
      console.error('Error disabling biometric:', error);
      throw error;
    }
  }

  /**
   * Authenticate and retrieve stored credentials
   * This is useful for auto-login with biometrics
   */
  static async authenticateAndGetCredentials(): Promise<{
    success: boolean;
    phone?: string;
    error?: string;
  }> {
    try {
      // First authenticate with biometrics
      const authResult = await this.authenticate('Authenticate to login');

      if (!authResult.success) {
        return {
          success: false,
          error: authResult.error,
        };
      }

      // If authentication successful, retrieve stored phone number
      const { SecureStorage } = await import('@shared/services/storage');
      const phone = await SecureStorage.getItem('biometric_phone');

      if (!phone) {
        return {
          success: false,
          error: 'No saved credentials found',
        };
      }

      return {
        success: true,
        phone,
      };
    } catch (error: any) {
      console.error('Error authenticating and getting credentials:', error);
      return {
        success: false,
        error: error.message || 'An unexpected error occurred',
      };
    }
  }

  /**
   * Store phone number for biometric login
   * Should be called after successful login when user enables biometric
   */
  static async storeCredentialsForBiometric(phone: string): Promise<void> {
    try {
      const { SecureStorage } = await import('@shared/services/storage');
      await SecureStorage.setItem('biometric_phone', phone);
    } catch (error) {
      console.error('Error storing credentials for biometric:', error);
      throw error;
    }
  }

  /**
   * Clear stored biometric credentials
   */
  static async clearBiometricCredentials(): Promise<void> {
    try {
      const { SecureStorage } = await import('@shared/services/storage');
      await SecureStorage.deleteItem('biometric_phone');
      await this.disableBiometric();
    } catch (error) {
      console.error('Error clearing biometric credentials:', error);
      throw error;
    }
  }
}
