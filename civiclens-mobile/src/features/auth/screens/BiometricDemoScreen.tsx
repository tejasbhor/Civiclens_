/**
 * BiometricDemoScreen - Example screen demonstrating biometric authentication
 * This is a reference implementation showing how to use all biometric features
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { BiometricAuth } from '@shared/services/biometric';
import {
  BiometricLoginButton,
  BiometricSetupPrompt,
  BiometricSettings,
} from '../components';

export const BiometricDemoScreen = () => {
  const [showSetupPrompt, setShowSetupPrompt] = useState(false);
  const [demoPhone] = useState('+919876543210');
  
  const {
    biometricCapabilities,
    isBiometricEnabled,
    checkBiometricCapabilities,
  } = useAuthStore();

  useEffect(() => {
    checkBiometricCapabilities();
  }, []);

  const handleTestAuthentication = async () => {
    const result = await BiometricAuth.authenticate('Test Authentication');
    
    if (result.success) {
      Alert.alert('Success', 'Biometric authentication successful!');
    } else {
      Alert.alert('Failed', result.error || 'Authentication failed');
    }
  };

  const handleCheckCapabilities = async () => {
    const capabilities = await BiometricAuth.checkAvailability();
    const typeName = BiometricAuth.getBiometricTypeName(capabilities.supportedTypes);
    
    Alert.alert(
      'Biometric Capabilities',
      `Available: ${capabilities.isAvailable}\n` +
      `Has Hardware: ${capabilities.hasHardware}\n` +
      `Is Enrolled: ${capabilities.isEnrolled}\n` +
      `Type: ${typeName}`,
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Biometric Authentication Demo</Text>
          <Text style={styles.subtitle}>
            Test and explore biometric authentication features
          </Text>
        </View>

        {/* Status Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status</Text>
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Biometric Available:</Text>
              <Text style={[
                styles.statusValue,
                biometricCapabilities?.isAvailable ? styles.statusSuccess : styles.statusError
              ]}>
                {biometricCapabilities?.isAvailable ? 'Yes' : 'No'}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Biometric Enabled:</Text>
              <Text style={[
                styles.statusValue,
                isBiometricEnabled ? styles.statusSuccess : styles.statusError
              ]}>
                {isBiometricEnabled ? 'Yes' : 'No'}
              </Text>
            </View>
            {biometricCapabilities?.supportedTypes && (
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Type:</Text>
                <Text style={styles.statusValue}>
                  {BiometricAuth.getBiometricTypeName(biometricCapabilities.supportedTypes)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Test Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Actions</Text>
          
          <TouchableOpacity
            style={styles.button}
            onPress={handleCheckCapabilities}
          >
            <Text style={styles.buttonText}>Check Capabilities</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={handleTestAuthentication}
          >
            <Text style={styles.buttonText}>Test Authentication</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={() => setShowSetupPrompt(true)}
          >
            <Text style={styles.buttonText}>Show Setup Prompt</Text>
          </TouchableOpacity>
        </View>

        {/* Biometric Login Button Demo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Biometric Login Button</Text>
          <BiometricLoginButton
            onSuccess={(phone) => {
              Alert.alert('Login Success', `Authenticated for ${phone}`);
            }}
            onError={(error) => {
              Alert.alert('Login Error', error);
            }}
          />
        </View>

        {/* Biometric Settings Demo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Biometric Settings</Text>
          <BiometricSettings phone={demoPhone} />
        </View>

        {/* Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Information</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              • Biometric authentication uses expo-local-authentication
            </Text>
            <Text style={styles.infoText}>
              • Credentials are stored securely using expo-secure-store
            </Text>
            <Text style={styles.infoText}>
              • Supports Face ID, Touch ID, Fingerprint, and Iris
            </Text>
            <Text style={styles.infoText}>
              • Fallback to device passcode is available
            </Text>
            <Text style={styles.infoText}>
              • See BIOMETRIC_AUTH_GUIDE.md for full documentation
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Setup Prompt Modal */}
      <BiometricSetupPrompt
        visible={showSetupPrompt}
        phone={demoPhone}
        onClose={() => setShowSetupPrompt(false)}
        onSetupComplete={() => {
          Alert.alert('Setup Complete', 'Biometric authentication has been enabled');
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statusLabel: {
    fontSize: 16,
    color: '#64748B',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusSuccess: {
    color: '#10B981',
  },
  statusError: {
    color: '#EF4444',
  },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 24,
    marginBottom: 8,
  },
});
