import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { BiometricAuth } from '@shared/services/biometric';

interface BiometricSetupPromptProps {
  visible: boolean;
  phone: string;
  onClose: () => void;
  onSetupComplete?: () => void;
}

export const BiometricSetupPrompt: React.FC<BiometricSetupPromptProps> = ({
  visible,
  phone,
  onClose,
  onSetupComplete,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('Biometric');
  
  const { 
    biometricCapabilities,
    enableBiometric,
    checkBiometricCapabilities,
  } = useAuthStore();

  useEffect(() => {
    if (visible) {
      checkBiometricCapabilities();
    }
  }, [visible]);

  useEffect(() => {
    if (biometricCapabilities?.supportedTypes) {
      const typeName = BiometricAuth.getBiometricTypeName(
        biometricCapabilities.supportedTypes
      );
      setBiometricType(typeName);
    }
  }, [biometricCapabilities]);

  const handleEnableBiometric = async () => {
    setIsLoading(true);

    try {
      // First, authenticate to verify biometric works
      const authResult = await BiometricAuth.authenticate(
        `Set up ${biometricType} for quick login`
      );

      if (!authResult.success) {
        Alert.alert(
          'Setup Failed',
          authResult.error || 'Failed to verify biometric authentication',
          [{ text: 'OK' }]
        );
        return;
      }

      // If authentication successful, enable biometric
      await enableBiometric(phone);

      Alert.alert(
        'Success',
        `${biometricType} login has been enabled. You can now use ${biometricType} to quickly login.`,
        [
          {
            text: 'OK',
            onPress: () => {
              onSetupComplete?.();
              onClose();
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'Failed to enable biometric authentication',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  // Don't show if biometric is not available
  if (!biometricCapabilities?.isAvailable) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🔐</Text>
          </View>

          <Text style={styles.title}>Enable {biometricType}?</Text>
          
          <Text style={styles.description}>
            Use {biometricType} for quick and secure login without entering your phone number
            each time.
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleEnableBiometric}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Enable {biometricType}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handleSkip}
              disabled={isLoading}
            >
              <Text style={styles.secondaryButtonText}>Skip for Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  secondaryButtonText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '600',
  },
});
