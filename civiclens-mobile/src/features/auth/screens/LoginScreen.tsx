import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authApi } from '@shared/services/api/authApi';
import { useAuthStore } from '@/store/authStore';
import { BiometricLoginButton } from '../components/BiometricLoginButton';

interface LoginScreenProps {
  role?: 'citizen' | 'officer';
  onBack?: () => void;
}

export const LoginScreen = ({ role = 'citizen', onBack }: LoginScreenProps) => {
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Navi Mumbai');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async () => {
    // Validate phone number
    if (!phone || phone.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    if (!agreedToTerms) {
      setError('Please agree to the terms and conditions');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await authApi.requestOTP(`+91${phone}`);
      
      Alert.alert(
        'OTP Sent',
        `OTP has been sent to +91 ${phone}${response.otp ? `\n\nDebug OTP: ${response.otp}` : ''}`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to OTP verification screen
              // navigation.navigate('OTPVerification', { phone });
            },
          },
        ]
      );
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Header with Back Button */}
          <View style={styles.topBar}>
            {onBack && (
              <TouchableOpacity onPress={onBack} style={styles.backButton}>
                <Text style={styles.backText}>←</Text>
              </TouchableOpacity>
            )}
            <View style={styles.languageSelector}>
              <Text style={styles.languageText}>🌐 English</Text>
            </View>
          </View>

          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoIcon}>©</Text>
            </View>
            <Text style={styles.logoText}>Civiclens</Text>
          </View>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            Report civic issue, track their resolution, and collaborate with your community for a
            better neighbourhood.
          </Text>

          {/* Form */}
          <View style={styles.form}>
            {/* Mobile Number */}
            <Text style={styles.label}>Mobile Number</Text>
            <View style={styles.inputContainer}>
              <View style={styles.iconCircle}>
                <View style={styles.phoneIcon} />
              </View>
              <Text style={styles.countryCode}>+91</Text>
              <TextInput
                style={styles.input}
                placeholder="01234 56789"
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={text => {
                  setPhone(text.replace(/[^0-9]/g, ''));
                  setError('');
                }}
                editable={!isLoading}
              />
            </View>

            {/* City Selection */}
            <Text style={styles.label}>Select City, Jharkhand</Text>
            <View style={styles.inputContainer}>
              <View style={styles.iconCircle}>
                <View style={styles.locationIcon} />
              </View>
              <Text style={styles.cityText}>{city}</Text>
              <Text style={styles.dropdownIcon}>▼</Text>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {/* Terms Checkbox */}
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setAgreedToTerms(!agreedToTerms)}
            >
              <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
                {agreedToTerms && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxText}>
                I agree to the terms and conditions of the{' '}
                <Text style={styles.linkText}>End-user license agreement(EULA)</Text>
              </Text>
            </TouchableOpacity>

            {/* Continue Button */}
            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleContinue}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.buttonText}>Continue</Text>
                  <Text style={styles.buttonArrow}>→</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Login Link */}
            <Text style={styles.loginText}>
              Already have an account?{' '}
              <Text style={styles.loginLink}>Login here</Text>
            </Text>

            {/* Biometric Login Button */}
            <BiometricLoginButton
              onSuccess={(phone) => {
                Alert.alert(
                  'Login Successful',
                  `Authenticated with biometric for ${phone}`,
                  [{ text: 'OK' }]
                );
              }}
              onError={(error) => {
                console.error('Biometric login error:', error);
              }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backText: {
    fontSize: 24,
    color: '#374151',
  },
  languageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageText: {
    fontSize: 14,
    color: '#374151',
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  phoneIcon: {
    width: 14,
    height: 14,
    borderWidth: 2,
    borderColor: '#2563EB',
    borderRadius: 3,
  },
  locationIcon: {
    width: 12,
    height: 16,
    borderWidth: 2,
    borderColor: '#2563EB',
    borderRadius: 6,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoIcon: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  form: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
    marginTop: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: '#F1F5F9',
  },

  countryCode: {
    fontSize: 16,
    fontWeight: '500',
    color: '#475569',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
  },
  cityText: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
  },
  dropdownIcon: {
    fontSize: 12,
    color: '#64748B',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    marginTop: 8,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 24,
    marginBottom: 24,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#2563EB',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#2563EB',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxText: {
    flex: 1,
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  linkText: {
    color: '#2563EB',
  },
  button: {
    backgroundColor: '#2563EB',
    height: 56,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#93C5FD',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  buttonArrow: {
    color: '#fff',
    fontSize: 20,
  },
  loginText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 24,
  },
  loginLink: {
    color: '#2563EB',
    fontWeight: '600',
  },
});
