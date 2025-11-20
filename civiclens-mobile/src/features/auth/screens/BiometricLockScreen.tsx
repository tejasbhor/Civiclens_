import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BiometricAuth } from '@shared/services/biometric';
import { useAuthStore } from '@/store/authStore';

interface BiometricLockScreenProps {
  onUnlock: () => void;
}

export const BiometricLockScreen: React.FC<BiometricLockScreenProps> = ({ onUnlock }) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const { user, logout, biometricCapabilities } = useAuthStore();

  // Automatically trigger biometric on mount
  useEffect(() => {
    handleBiometricAuth();
  }, []);

  const handleBiometricAuth = async () => {
    if (isAuthenticating) return;

    setIsAuthenticating(true);

    try {
      const result = await BiometricAuth.authenticate(
        'Unlock CivicLens',
        'Cancel'
      );

      if (result.success) {
        // Success! Unlock the app
        onUnlock();
      } else {
        // Failed authentication
        setFailedAttempts(prev => prev + 1);
        setIsAuthenticating(false);

        // Show error message
        if (result.error && result.error !== 'Authentication cancelled by user') {
          Alert.alert('Authentication Failed', result.error, [
            { text: 'Try Again', onPress: handleBiometricAuth },
            { text: 'Logout', onPress: handleLogout, style: 'destructive' },
          ]);
        }
      }
    } catch (error: any) {
      console.error('Biometric authentication error:', error);
      setIsAuthenticating(false);
      setFailedAttempts(prev => prev + 1);

      Alert.alert('Error', 'Biometric authentication failed. Please try again.', [
        { text: 'Try Again', onPress: handleBiometricAuth },
        { text: 'Logout', onPress: handleLogout, style: 'destructive' },
      ]);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            // onUnlock will be called automatically by App.tsx when user becomes unauthenticated
          },
        },
      ]
    );
  };

  const getBiometricIcon = () => {
    if (!biometricCapabilities) return 'finger-print';
    
    const types = biometricCapabilities.supportedTypes;
    if (types.includes(1)) return 'scan'; // Face recognition
    if (types.includes(2)) return 'scan'; // Iris
    return 'finger-print'; // Fingerprint (default)
  };

  const getBiometricName = () => {
    if (!biometricCapabilities) return 'Biometric';
    return BiometricAuth.getBiometricTypeName(biometricCapabilities.supportedTypes);
  };

  return (
    <LinearGradient
      colors={['#1E3A8A', '#3B82F6', '#60A5FA']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Lock Icon */}
      <View style={styles.lockContainer}>
        <View style={styles.lockIconWrapper}>
          <Ionicons name="lock-closed" size={64} color="#FFF" />
        </View>
        <Text style={styles.lockTitle}>CivicLens is Locked</Text>
        <Text style={styles.lockSubtitle}>
          Unlock with {getBiometricName().toLowerCase()} to continue
        </Text>
      </View>

      {/* User Info */}
      {user && (
        <View style={styles.userInfo}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {user.full_name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={styles.userName}>{user.full_name || 'User'}</Text>
          <Text style={styles.userPhone}>{user.phone}</Text>
        </View>
      )}

      {/* Biometric Button */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={[styles.biometricButton, isAuthenticating && styles.biometricButtonDisabled]}
          onPress={handleBiometricAuth}
          disabled={isAuthenticating}
          activeOpacity={0.8}
        >
          <View style={styles.biometricIconWrapper}>
            {isAuthenticating ? (
              <ActivityIndicator size="large" color="#2196F3" />
            ) : (
              <Ionicons name={getBiometricIcon()} size={48} color="#2196F3" />
            )}
          </View>
          <Text style={styles.biometricButtonText}>
            {isAuthenticating ? 'Authenticating...' : `Unlock with ${getBiometricName()}`}
          </Text>
        </TouchableOpacity>

        {failedAttempts > 0 && (
          <Text style={styles.failedText}>
            Failed attempts: {failedAttempts}
          </Text>
        )}

        {/* Logout Option */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={isAuthenticating}
        >
          <Ionicons name="log-out-outline" size={20} color="#FFF" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Help Text */}
      <View style={styles.helpContainer}>
        <Ionicons name="information-circle-outline" size={16} color="rgba(255,255,255,0.7)" />
        <Text style={styles.helpText}>
          Having trouble? Use the logout option and login again
        </Text>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  lockContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  lockIconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  lockTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  lockSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 48,
  },
  userAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: '#FFF',
  },
  userAvatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFF',
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  actionContainer: {
    width: '100%',
    alignItems: 'center',
  },
  biometricButton: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  biometricButtonDisabled: {
    opacity: 0.7,
  },
  biometricIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  biometricButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  failedText: {
    fontSize: 14,
    color: '#FEE2E2',
    marginTop: 12,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 32,
    paddingHorizontal: 16,
    gap: 8,
  },
  helpText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    flex: 1,
  },
});
