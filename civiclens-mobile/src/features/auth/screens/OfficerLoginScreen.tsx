import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { authApi } from '@shared/services/api/authApi';
import { useAuthStore } from '@/store/authStore';
import {
  validateRoleForRoute,
  getRoleName,
  type UserRole,
} from '@shared/utils/roleValidation';
import { colors } from '@shared/theme/colors';
import { useToast } from '@shared/hooks';
import { Toast } from '@shared/components';

interface OfficerLoginScreenProps {
  onBack?: () => void;
  navigation?: any;
}

export const OfficerLoginScreen: React.FC<OfficerLoginScreenProps> = ({ onBack, navigation }) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const { setTokens } = useAuthStore();
  const { toast, showSuccess, showError } = useToast();

  const normalizePhoneNumber = (phone: string): string => {
    let cleaned = phone.replace(/[\s-]/g, '');
    
    if (cleaned.startsWith('+91')) {
      return cleaned;
    }
    
    if (cleaned.startsWith('91') && cleaned.length === 12) {
      return '+' + cleaned;
    }
    
    if (/^\d{10}$/.test(cleaned)) {
      return '+91' + cleaned;
    }
    
    return cleaned;
  };

  const validatePhoneNumber = (phone: string): { valid: boolean; error?: string } => {
    const pattern = /^\+?[1-9]\d{1,14}$/;
    
    if (!phone || phone.trim().length === 0) {
      return { valid: false, error: 'Phone number is required' };
    }
    
    const normalized = normalizePhoneNumber(phone);
    
    if (!pattern.test(normalized)) {
      return { 
        valid: false, 
        error: 'Please enter a valid phone number (10 digits or with +91 country code)' 
      };
    }
    
    return { valid: true };
  };

  const validatePassword = (password: string): { valid: boolean; error?: string } => {
    if (!password || password.trim().length === 0) {
      return { valid: false, error: 'Password is required' };
    }
    
    if (password.length < 8) {
      return { valid: false, error: 'Password must be at least 8 characters' };
    }
    
    return { valid: true };
  };

  // Real-time validation
  useEffect(() => {
    if (phone.length > 0) {
      const validation = validatePhoneNumber(phone);
      setPhoneError(validation.valid ? null : validation.error || null);
    } else {
      setPhoneError(null);
    }
  }, [phone]);

  useEffect(() => {
    if (password.length > 0) {
      const validation = validatePassword(password);
      setPasswordError(validation.valid ? null : validation.error || null);
    } else {
      setPasswordError(null);
    }
  }, [password]);

  const handleLogin = async () => {
    setPhoneError(null);
    setPasswordError(null);

    const phoneValidation = validatePhoneNumber(phone);
    const passwordValidation = validatePassword(password);

    if (!phoneValidation.valid || !passwordValidation.valid) {
      if (!phoneValidation.valid) {
        setPhoneError(phoneValidation.error || null);
        showError(phoneValidation.error || 'Invalid phone number');
      }
      if (!passwordValidation.valid) {
        setPasswordError(passwordValidation.error || null);
        showError(passwordValidation.error || 'Invalid password');
      }
      return;
    }

    const normalizedPhone = normalizePhoneNumber(phone);

    try {
      setIsLoading(true);
      
      const response = await authApi.login(normalizedPhone, password, 'officer');
      
      // Validate role BEFORE setting tokens to prevent navigation glitch
      const roleValidation = validateRoleForRoute(response.role as UserRole, 'officer');
      
      if (!roleValidation.isValid) {
        // Don't set tokens - show error immediately
        setPasswordError(roleValidation.error!);
        showError(roleValidation.error!);
        return;
      }
      
      // Role is valid - now set tokens and navigate
      await setTokens(response);
      showSuccess(`Welcome ${getRoleName(response.role as UserRole)}!`);
    } catch (error: any) {
      let errorMessage = 'Invalid credentials. Please verify your phone number and password and try again.';
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      if (error.message?.includes('Invalid phone number or password')) {
        setPasswordError(errorMessage);
      }
      
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.wrapper}>
        {/* Back Button */}
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
        )}

        {/* Hero Card */}
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroContent}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoBadgeText}>CL</Text>
            </View>
            <View style={styles.heroTextBlock}>
              <Text style={styles.heroTitle}>Officer Portal</Text>
              <Text style={styles.heroSubtitle}>Sign in to manage tasks and resolve issues</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Form Card */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.formCard}>

              <Text style={styles.label}>Mobile Number</Text>
              <View style={styles.inputContainer}>
                <View style={styles.iconCircle}>
                  <Ionicons name="call-outline" size={16} color={colors.primaryDark} />
                </View>
                <Text style={styles.countryCode}>+91</Text>
                <TextInput
                  style={styles.input}
                  placeholder="10-digit number"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={phone}
                  onChangeText={text => {
                    setPhone(text.replace(/\D/g, ''));
                  }}
                  editable={!isLoading}
                />
              </View>
              {phoneError && <Text style={styles.errorText}>{phoneError}</Text>}

              <Text style={styles.label}>Password</Text>
              <View style={styles.inputContainer}>
                <View style={styles.iconCircle}>
                  <Ionicons name="lock-closed-outline" size={16} color={colors.primaryDark} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  editable={!isLoading}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              {passwordError && <Text style={styles.errorText}>{passwordError}</Text>}

              <View style={styles.optionsRow}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => setRememberMe(!rememberMe)}
                  disabled={isLoading}
                >
                  <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                    {rememberMe && <Ionicons name="checkmark" size={12} color={colors.white} />}
                  </View>
                  <Text style={styles.checkboxText}>Remember me</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    showError('Please contact your administrator to reset your password');
                  }}
                  disabled={isLoading}
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.button,
                  (isLoading || !!phoneError || !!passwordError || !phone || !password) &&
                    styles.buttonDisabled,
                ]}
                onPress={handleLogin}
                disabled={isLoading || !!phoneError || !!passwordError || !phone || !password}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <>
                    <Ionicons name="shield-checkmark" size={18} color={colors.white} style={{ marginRight: 8 }} />
                    <Text style={styles.buttonText}>Sign In</Text>
                    <Text style={styles.buttonArrow}>→</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.securityNotice}>
                <View style={styles.securityIcon}>
                  <Ionicons name="shield-checkmark" size={18} color={colors.primaryDark} />
                </View>
                <View style={styles.securityTextContainer}>
                  <Text style={styles.securityTitle}>Secure Portal</Text>
                  <Text style={styles.securityText}>
                    Restricted to authorized government personnel only. All access attempts are logged and monitored.
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
      <Toast {...toast} onHide={() => {}} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  wrapper: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    gap: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  heroCard: {
    borderRadius: 24,
    padding: 28,
    marginBottom: 20,
    shadowColor: '#0F172A',
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 18,
  },
  logoBadgeText: {
    color: colors.white,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 1,
  },
  heroTextBlock: {
    flex: 1,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 26,
    fontWeight: '700',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    marginTop: 6,
    lineHeight: 20,
  },
  keyboardView: {
    flex: 1,
    marginTop: 8,
  },
  scrollContent: {
    flexGrow: 1,
  },
  formCard: {
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 28,
    marginTop: 4,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
    marginTop: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 18,
    height: 58,
    backgroundColor: colors.backgroundTertiary,
    marginBottom: 4,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(33,150,243,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    marginTop: 8,
    marginBottom: 4,
    fontWeight: '500',
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: colors.primaryDark,
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primaryDark,
  },
  checkboxText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: colors.primaryDark,
    fontWeight: '600',
  },
  button: {
    backgroundColor: colors.primaryDark,
    height: 58,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: colors.primaryLight,
    opacity: 0.7,
  },
  buttonText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '600',
    marginRight: 8,
    letterSpacing: 0.3,
  },
  buttonArrow: {
    color: colors.white,
    fontSize: 22,
  },
  securityNotice: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 14,
    padding: 18,
    marginTop: 24,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  securityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(33,150,243,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  securityTextContainer: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  securityText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
