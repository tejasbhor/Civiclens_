import React, { useEffect, useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { BiometricAuth } from '@shared/services/biometric';

interface BiometricLoginButtonProps {
  onSuccess?: (phone: string) => void;
  onError?: (error: string) => void;
}

export const BiometricLoginButton: React.FC<BiometricLoginButtonProps> = ({
  onSuccess,
  onError,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('Biometric');
  
  const { 
    biometricCapabilities, 
    isBiometricEnabled,
    authenticateWithBiometric,
    checkBiometricCapabilities,
  } = useAuthStore();

  useEffect(() => {
    // Check capabilities on mount
    checkBiometricCapabilities();
  }, []);

  useEffect(() => {
    // Update biometric type name when capabilities change
    if (biometricCapabilities?.supportedTypes) {
      const typeName = BiometricAuth.getBiometricTypeName(
        biometricCapabilities.supportedTypes
      );
      setBiometricType(typeName);
    }
  }, [biometricCapabilities]);

  const handleBiometricLogin = async () => {
    setIsLoading(true);

    try {
      const result = await authenticateWithBiometric();

      if (result.success && result.phone) {
        onSuccess?.(result.phone);
      } else {
        const errorMessage = result.error || 'Authentication failed';
        onError?.(errorMessage);
        
        Alert.alert(
          'Authentication Failed',
          errorMessage,
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      const errorMessage = error.message || 'An unexpected error occurred';
      onError?.(errorMessage);
      
      Alert.alert(
        'Error',
        errorMessage,
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show button if biometric is not available or not enabled
  if (!biometricCapabilities?.isAvailable || !isBiometricEnabled) {
    return null;
  }

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handleBiometricLogin}
      disabled={isLoading}
    >
      <View style={styles.content}>
        {isLoading ? (
          <ActivityIndicator color="#2563EB" size="small" />
        ) : (
          <>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>🔐</Text>
            </View>
            <Text style={styles.text}>Login with {biometricType}</Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 12,
  },
  icon: {
    fontSize: 24,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
  },
});
