import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Switch,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { BiometricAuth } from '@shared/services/biometric';

interface BiometricSettingsProps {
  phone: string;
}

export const BiometricSettings: React.FC<BiometricSettingsProps> = ({ phone }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('Biometric');
  
  const {
    biometricCapabilities,
    isBiometricEnabled,
    enableBiometric,
    disableBiometric,
    checkBiometricCapabilities,
  } = useAuthStore();

  useEffect(() => {
    checkBiometricCapabilities();
  }, []);

  useEffect(() => {
    if (biometricCapabilities?.supportedTypes) {
      const typeName = BiometricAuth.getBiometricTypeName(
        biometricCapabilities.supportedTypes
      );
      setBiometricType(typeName);
    }
  }, [biometricCapabilities]);

  const handleToggleBiometric = async (value: boolean) => {
    setIsLoading(true);

    try {
      if (value) {
        // Enable biometric - first authenticate
        const authResult = await BiometricAuth.authenticate(
          `Enable ${biometricType} for login`
        );

        if (!authResult.success) {
          Alert.alert(
            'Authentication Failed',
            authResult.error || 'Failed to verify biometric authentication',
            [{ text: 'OK' }]
          );
          return;
        }

        // If authentication successful, enable biometric
        await enableBiometric(phone);

        Alert.alert(
          'Success',
          `${biometricType} app lock has been enabled. The app will require ${biometricType.toLowerCase()} to unlock when you open it next time.`,
          [{ text: 'OK' }]
        );
      } else {
        // Disable biometric - confirm first
        Alert.alert(
          'Disable App Lock',
          `Are you sure you want to disable ${biometricType} app lock? The app will no longer require ${biometricType.toLowerCase()} to unlock.`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Disable',
              style: 'destructive',
              onPress: async () => {
                await disableBiometric();
                Alert.alert(
                  'Disabled',
                  `${biometricType} app lock has been disabled`,
                  [{ text: 'OK' }]
                );
              },
            },
          ]
        );
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'Failed to update biometric settings',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestBiometric = async () => {
    setIsLoading(true);

    try {
      const result = await BiometricAuth.authenticate(
        `Test ${biometricType} authentication`
      );

      if (result.success) {
        Alert.alert(
          'Success',
          `${biometricType} authentication successful!`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Failed',
          result.error || 'Authentication failed',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'An unexpected error occurred',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show if biometric is not available
  if (!biometricCapabilities?.isAvailable) {
    return (
      <View style={styles.container}>
        <View style={styles.unavailableContainer}>
          <Text style={styles.unavailableIcon}>⚠️</Text>
          <Text style={styles.unavailableTitle}>Biometric Not Available</Text>
          <Text style={styles.unavailableText}>
            {!biometricCapabilities?.hasHardware
              ? 'Your device does not support biometric authentication.'
              : 'No biometric credentials are enrolled. Please set up biometrics in your device settings.'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🔐</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{biometricType} App Lock</Text>
          <Text style={styles.subtitle}>
            Unlock CivicLens with {biometricType.toLowerCase()} when opening the app
          </Text>
        </View>
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Enable {biometricType}</Text>
          <Text style={styles.settingDescription}>
            App will require {biometricType.toLowerCase()} to unlock after closing
          </Text>
        </View>
        {isLoading ? (
          <ActivityIndicator color="#2563EB" />
        ) : (
          <Switch
            value={isBiometricEnabled}
            onValueChange={handleToggleBiometric}
            trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
            thumbColor={isBiometricEnabled ? '#2563EB' : '#F1F5F9'}
          />
        )}
      </View>

      {isBiometricEnabled && (
        <TouchableOpacity
          style={styles.testButton}
          onPress={handleTestBiometric}
          disabled={isLoading}
        >
          <Text style={styles.testButtonText}>Test {biometricType}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 24,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1E293B',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#64748B',
  },
  testButton: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 12,
    alignItems: 'center',
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  unavailableContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  unavailableIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  unavailableTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  unavailableText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
});
