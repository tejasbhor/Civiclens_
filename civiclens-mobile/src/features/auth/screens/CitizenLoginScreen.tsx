import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@shared/theme/colors';
import { useToast } from '@shared/hooks';
import { Toast } from '@shared/components';
import { authApi } from '@shared/services/api/authApi';
import { useAuthStore } from '@/store/authStore';
import {
  validatePhone,
  validateOTP,
  validatePassword,
  validateFullName,
  validateEmail,
  normalizePhone,
} from '@shared/utils/validation';
import {
  validateRoleForRoute,
  type UserRole,
} from '@shared/utils/roleValidation';

type AuthMode = 'select' | 'quick-otp' | 'full-register' | 'password-login';
type AuthStep = 'phone' | 'otp' | 'register' | 'password';

interface CitizenLoginScreenProps {
  onBack?: () => void;
}

export const CitizenLoginScreen = ({ onBack }: CitizenLoginScreenProps) => {
  const [authMode, setAuthMode] = useState<AuthMode>('select');
  const [authStep, setAuthStep] = useState<AuthStep>('phone');
  
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [countdown, setCountdown] = useState(300);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [devOtp, setDevOtp] = useState('');

  const { setTokens } = useAuthStore();
  const { toast, showSuccess, showError } = useToast();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (authStep === 'otp' && countdown > 0) {
      interval = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [authStep, countdown]);

  const handleRequestOtp = async () => {
    const validation = validatePhone(phone);
    if (!validation.isValid) {
      setError(validation.error!);
      showError(validation.error!);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const normalizedPhone = normalizePhone(phone);
      const response = await authApi.requestOTP(normalizedPhone);
      
      if (response.otp) {
        setDevOtp(response.otp);
      }
      
      setAuthStep('otp');
      setCountdown(300);
      
      showSuccess(`Verification code sent to ${phone}${response.otp ? ` (Dev OTP: ${response.otp})` : ''}`);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to send OTP';
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const validation = validateOTP(otp);
    if (!validation.isValid) {
      setError(validation.error!);
      showError(validation.error!);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const normalizedPhone = normalizePhone(phone);
      
      let response;
      if (authMode === 'quick-otp') {
        response = await authApi.verifyOTP(normalizedPhone, otp);
      } else if (authMode === 'full-register') {
        response = await authApi.verifyPhone(normalizedPhone, otp);
      }

      if (response) {
        // Validate role BEFORE setting tokens to prevent navigation glitch
        const roleValidation = validateRoleForRoute(response.role as UserRole, 'citizen');
        
        if (!roleValidation.isValid) {
          // Don't set tokens - show error immediately
          setError(roleValidation.error!);
          showError(roleValidation.error!);
          return;
        }
        
        // Role is valid - now set tokens and navigate
        await setTokens(response);
        showSuccess('Login successful! Welcome to CivicLens');
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Invalid or expired OTP';
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    const phoneValidation = validatePhone(phone);
    const nameValidation = validateFullName(name);
    const emailValidation = validateEmail(email);
    const passwordValidation = validatePassword(password);

    if (!phoneValidation.isValid) {
      setError(phoneValidation.error!);
      showError('Validation Error', phoneValidation.error!);
      return;
    }
    if (!nameValidation.isValid) {
      setError(nameValidation.error!);
      showError('Validation Error', nameValidation.error!);
      return;
    }
    if (!emailValidation.isValid) {
      setError(emailValidation.error!);
      showError(emailValidation.error!);
      return;
    }
    if (!passwordValidation.isValid) {
      setError(passwordValidation.error!);
      showError(passwordValidation.error!);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      showError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const normalizedPhone = normalizePhone(phone);
      const response = await authApi.signup({
        phone: normalizedPhone,
        full_name: name.trim(),
        email: email.trim() || undefined,
        password,
      });

      if (response.otp) {
        setDevOtp(response.otp);
      }

      setAuthStep('otp');
      setCountdown(300);
      
      showSuccess(`Verification code sent${response.otp ? ` (Dev OTP: ${response.otp})` : ''}`);
    } catch (err: any) {
      const errorMsg = err.message || 'Signup failed';
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordLogin = async () => {
    const phoneValidation = validatePhone(phone);
    const passwordValidation = validatePassword(password);

    if (!phoneValidation.isValid) {
      setError(phoneValidation.error!);
      showError(phoneValidation.error!);
      return;
    }
    if (!passwordValidation.isValid) {
      setError(passwordValidation.error!);
      showError(passwordValidation.error!);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const normalizedPhone = normalizePhone(phone);
      const response = await authApi.login(normalizedPhone, password, 'citizen');
      
      // Validate role BEFORE setting tokens to prevent navigation glitch
      const roleValidation = validateRoleForRoute(response.role as UserRole, 'citizen');
      
      if (!roleValidation.isValid) {
        // Don't set tokens - show error immediately
        setError(roleValidation.error!);
        showError(roleValidation.error!);
        return;
      }
      
      // Role is valid - now set tokens and navigate
      await setTokens(response);
      showSuccess('Login successful! Welcome back');
    } catch (err: any) {
      const errorMsg = err.message || 'Login failed';
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (authMode === 'select') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.selectWrapper}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.heroBackButton}>
              <Ionicons name="arrow-back" size={22} color={colors.white} />
            </TouchableOpacity>
          )}

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
                <Text style={styles.heroTitle}>Welcome to CivicLens</Text>
                <Text style={styles.heroSubtitle}>Choose how you'd like to continue</Text>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.infoBanner}>
            <Text style={styles.infoTitle}>Why citizens prefer CivicLens</Text>
            <View style={styles.infoRow}>
              {infoPoints.map(point => (
                <View key={point.title} style={styles.infoPoint}>
                  <Ionicons name={point.icon as any} size={16} color={colors.primaryDark} />
                  <Text style={styles.infoPointText}>{point.title}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.optionList}>
            <TouchableOpacity
              style={styles.optionCard}
              onPress={() => {
                setAuthMode('quick-otp');
                setAuthStep('phone');
              }}
              activeOpacity={0.85}
            >
              <View style={styles.optionIconCircle}>
                <Ionicons name="flash" size={22} color={colors.primaryDark} />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Quick Login with OTP</Text>
                <Text style={styles.optionDescription}>Instant access with phone verification</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionCard}
              onPress={() => {
                setAuthMode('password-login');
                setAuthStep('password');
              }}
              activeOpacity={0.85}
            >
              <View style={styles.optionIconCircle}>
                <Ionicons name="lock-closed" size={22} color={colors.primaryDark} />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Login with Password</Text>
                <Text style={styles.optionDescription}>Sign in to your existing account</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionCard}
              onPress={() => {
                setAuthMode('full-register');
                setAuthStep('register');
              }}
              activeOpacity={0.85}
            >
              <View style={styles.optionIconCircle}>
                <Ionicons name="person-add" size={22} color={colors.primaryDark} />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Create New Account</Text>
                <Text style={styles.optionDescription}>Unlock all features with full profile</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
        <Toast {...toast} onHide={() => {}} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.wrapper}>
        {/* Back Button */}
        <TouchableOpacity
          onPress={() => {
            if (authStep === 'otp') {
              setAuthStep(authMode === 'full-register' ? 'register' : 'phone');
            } else {
              setAuthMode('select');
              setAuthStep('phone');
            }
          }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>

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
              <Text style={styles.heroTitle}>
                {authMode === 'quick-otp' && 'Quick OTP Login'}
                {authMode === 'password-login' && 'Password Login'}
                {authMode === 'full-register' && 'Create Account'}
              </Text>
              <Text style={styles.heroSubtitle}>
                {authMode === 'quick-otp' && authStep === 'phone' && 'Enter your mobile number to continue'}
                {authMode === 'quick-otp' && authStep === 'otp' && 'Enter the verification code sent to your phone'}
                {authMode === 'password-login' && 'Sign in with your mobile number and password'}
                {authMode === 'full-register' && authStep === 'register' && 'Fill in your details to get started'}
                {authMode === 'full-register' && authStep === 'otp' && 'Verify your phone number to complete registration'}
              </Text>
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
            {/* Quick OTP - Phone Input */}
            {authMode === 'quick-otp' && authStep === 'phone' && (
              <>
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
                      setError('');
                    }}
                    editable={!isLoading}
                  />
                </View>

                {error && <Text style={styles.errorText}>{error}</Text>}

                <TouchableOpacity
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  onPress={handleRequestOtp}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <>
                      <Ionicons name="send-outline" size={18} color={colors.white} style={{ marginRight: 8 }} />
                      <Text style={styles.buttonText}>Send OTP</Text>
                      <Text style={styles.buttonArrow}>→</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* OTP Input */}
            {authStep === 'otp' && (
              <>
                <Text style={styles.label}>Enter OTP</Text>
                <View style={styles.inputContainer}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="shield-checkmark-outline" size={16} color={colors.primaryDark} />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="6-digit OTP"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otp}
                    onChangeText={text => {
                      setOtp(text.replace(/\D/g, ''));
                      setError('');
                    }}
                    editable={!isLoading}
                  />
                </View>

                {error && <Text style={styles.errorText}>{error}</Text>}

                {devOtp && (
                  <View style={styles.devOtpContainer}>
                    <Text style={styles.devOtpText}>Dev OTP: {devOtp}</Text>
                  </View>
                )}

                <Text style={styles.timerText}>
                  {countdown > 0 ? `Resend OTP in ${Math.floor(countdown / 60)}:${(countdown % 60).toString().padStart(2, '0')}` : 'OTP expired'}
                </Text>

                {countdown === 0 && (
                  <TouchableOpacity
                    style={styles.resendButton}
                    onPress={() => {
                      setCountdown(300);
                      handleRequestOtp();
                    }}
                  >
                    <Text style={styles.resendText}>Resend OTP</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  onPress={handleVerifyOtp}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={18} color={colors.white} style={{ marginRight: 8 }} />
                      <Text style={styles.buttonText}>Verify OTP</Text>
                      <Text style={styles.buttonArrow}>→</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* Password Login */}
            {authMode === 'password-login' && (
              <>
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
                      setError('');
                    }}
                    editable={!isLoading}
                  />
                </View>

                <Text style={styles.label}>Password</Text>
                <View style={styles.inputContainer}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="lock-closed-outline" size={16} color={colors.primaryDark} />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter password"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={text => {
                      setPassword(text);
                      setError('');
                    }}
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

                {error && <Text style={styles.errorText}>{error}</Text>}

                <TouchableOpacity
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  onPress={handlePasswordLogin}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <>
                      <Ionicons name="log-in-outline" size={18} color={colors.white} style={{ marginRight: 8 }} />
                      <Text style={styles.buttonText}>Login</Text>
                      <Text style={styles.buttonArrow}>→</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* Full Registration */}
            {authMode === 'full-register' && authStep === 'register' && (
              <>
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
                      setError('');
                    }}
                    editable={!isLoading}
                  />
                </View>

                <Text style={styles.label}>Full Name</Text>
                <View style={styles.inputContainer}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="person-outline" size={16} color={colors.primaryDark} />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your name"
                    value={name}
                    onChangeText={text => {
                      setName(text);
                      setError('');
                    }}
                    editable={!isLoading}
                  />
                </View>

                <Text style={styles.label}>Email (Optional)</Text>
                <View style={styles.inputContainer}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="mail-outline" size={16} color={colors.primaryDark} />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="your@email.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={text => {
                      setEmail(text);
                      setError('');
                    }}
                    editable={!isLoading}
                  />
                </View>

                <Text style={styles.label}>Password</Text>
                <View style={styles.inputContainer}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="lock-closed-outline" size={16} color={colors.primaryDark} />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Min 8 chars, 1 uppercase, 1 digit"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={text => {
                      setPassword(text);
                      setError('');
                    }}
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

                <Text style={styles.label}>Confirm Password</Text>
                <View style={styles.inputContainer}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="lock-closed-outline" size={16} color={colors.primaryDark} />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Re-enter your password"
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={text => {
                      setConfirmPassword(text);
                      setError('');
                    }}
                    editable={!isLoading}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>

                {error && <Text style={styles.errorText}>{error}</Text>}

                <TouchableOpacity
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  onPress={handleSignup}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <>
                      <Ionicons name="person-add-outline" size={18} color={colors.white} style={{ marginRight: 8 }} />
                      <Text style={styles.buttonText}>Create Account</Text>
                      <Text style={styles.buttonArrow}>→</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
};

const infoPoints = [
  { title: 'Offline-first reporting', icon: 'cloud-download-outline' },
  { title: 'Secure OTP in seconds', icon: 'shield-checkmark-outline' },
  { title: 'Track resolutions live', icon: 'pulse-outline' },
];

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
  selectWrapper: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 20,
  },
  heroBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(15,23,42,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
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
  },
  infoBanner: {
    marginTop: 16,
    backgroundColor: colors.background,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  infoPoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: colors.backgroundSecondary,
  },
  infoPointText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  optionList: {
    marginTop: 20,
    gap: 14,
  },
  gradient: {
    flex: 1,
    paddingHorizontal: 24,
  },
  keyboardView: {
    flex: 1,
    marginTop: 8,
  },
  scrollContent: {
    flexGrow: 1,
  },
  backButton: {
    marginBottom: 20,
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
  optionsContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  optionCard: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  optionIconContainer: {
    marginRight: 16,
  },
  optionIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
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
  devOtpContainer: {
    backgroundColor: 'rgba(255,193,7,0.15)',
    padding: 18,
    borderRadius: 14,
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  devOtpText: {
    fontSize: 15,
    color: colors.warningText,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 2,
  },
  timerText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
    fontWeight: '500',
  },
  resendButton: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 14,
  },
  resendText: {
    fontSize: 16,
    color: colors.primaryDark,
    fontWeight: '600',
  },
});
