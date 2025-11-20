/**
 * EditProfileScreen - Edit user profile information
 * Mobile-optimized with form validation and backend integration
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@store/authStore';
import { userApi, type UserProfileUpdate } from '@shared/services/api/userApi';
import { TopNavbar } from '@shared/components';

export const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuthStore();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    primary_address: '',
    bio: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        primary_address: user.primary_address || '',
        bio: user.bio || '',
      });
    }
  }, [user]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate full name
    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    } else if (formData.full_name.trim().length < 2) {
      newErrors.full_name = 'Full name must be at least 2 characters';
    }

    // Validate email if provided
    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    // Validate bio length
    if (formData.bio && formData.bio.length > 500) {
      newErrors.bio = 'Bio must be less than 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      // Prepare update data (only send changed fields)
      const updateData: UserProfileUpdate = {};
      
      if (formData.full_name && formData.full_name !== user?.full_name) {
        updateData.full_name = formData.full_name;
      }
      if (formData.email && formData.email !== user?.email) {
        updateData.email = formData.email;
      }
      if (formData.primary_address && formData.primary_address.trim()) {
        updateData.primary_address = formData.primary_address;
      }
      if (formData.bio && formData.bio.trim()) {
        updateData.bio = formData.bio;
      }

      // Update profile
      await userApi.updateProfile(updateData);
      
      // Refresh user data
      await refreshUser();

      Alert.alert(
        'Success',
        'Your profile has been updated successfully.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      Alert.alert(
        'Update Failed',
        error.response?.data?.detail || 'Failed to update profile. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Discard Changes',
      'Are you sure you want to discard your changes?',
      [
        { text: 'Keep Editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Consistent TopNavbar */}
      <TopNavbar
        title="Edit Profile"
        showBack={true}
        showNotifications={false}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom + 80, 120) } // Tab bar + safe area
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Profile Picture Section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {formData.full_name?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
              <TouchableOpacity style={styles.avatarEditButton}>
                <Ionicons name="camera" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
            <Text style={styles.avatarHint}>Tap to change photo</Text>
          </View>

          {/* Form Fields */}
          <View style={styles.formSection}>
            {/* Full Name */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>
                Full Name <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.inputWrapper, errors.full_name && styles.inputError]}>
                <View style={[styles.inputIcon, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="person-outline" size={20} color="#2563EB" />
                </View>
                <TextInput
                  style={styles.input}
                  value={formData.full_name}
                  onChangeText={(text) => {
                    setFormData({ ...formData, full_name: text });
                    if (errors.full_name) {
                      setErrors({ ...errors, full_name: '' });
                    }
                  }}
                  placeholder="Enter your full name"
                  placeholderTextColor="#94A3B8"
                  editable={!loading}
                />
              </View>
              {errors.full_name ? (
                <Text style={styles.errorText}>{errors.full_name}</Text>
              ) : null}
            </View>

            {/* Phone (Read-only) */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={[styles.inputWrapper, styles.inputDisabled]}>
                <View style={[styles.inputIcon, { backgroundColor: '#F1F5F9' }]}>
                  <Ionicons name="call-outline" size={20} color="#64748B" />
                </View>
                <TextInput
                  style={[styles.input, styles.inputDisabledText]}
                  value={user?.phone || ''}
                  editable={false}
                />
                <Ionicons name="lock-closed" size={16} color="#94A3B8" />
              </View>
              <Text style={styles.hint}>Phone number cannot be changed</Text>
            </View>

            {/* Email */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Email (Optional)</Text>
              <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
                <View style={[styles.inputIcon, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="mail-outline" size={20} color="#F59E0B" />
                </View>
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(text) => {
                    setFormData({ ...formData, email: text });
                    if (errors.email) {
                      setErrors({ ...errors, email: '' });
                    }
                  }}
                  placeholder="your.email@example.com"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>
              {errors.email ? (
                <Text style={styles.errorText}>{errors.email}</Text>
              ) : (
                <Text style={styles.hint}>Add email to unlock more features</Text>
              )}
            </View>

            {/* Primary Address */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Primary Address (Optional)</Text>
              <View style={styles.inputWrapper}>
                <View style={[styles.inputIcon, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="location-outline" size={20} color="#22C55E" />
                </View>
                <TextInput
                  style={styles.input}
                  value={formData.primary_address}
                  onChangeText={(text) =>
                    setFormData({ ...formData, primary_address: text })
                  }
                  placeholder="Your primary address"
                  placeholderTextColor="#94A3B8"
                  editable={!loading}
                />
              </View>
            </View>

            {/* Bio */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Bio (Optional)</Text>
              <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.bio}
                  onChangeText={(text) => {
                    if (text.length <= 500) {
                      setFormData({ ...formData, bio: text });
                      if (errors.bio) {
                        setErrors({ ...errors, bio: '' });
                      }
                    }
                  }}
                  placeholder="Tell us about yourself..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                  editable={!loading}
                  textAlignVertical="top"
                />
              </View>
              <View style={styles.charCountContainer}>
                {errors.bio ? (
                  <Text style={styles.errorText}>{errors.bio}</Text>
                ) : null}
                <Text style={styles.charCount}>
                  {formData.bio.length}/500 characters
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.primaryActionButton, loading && styles.actionButtonDisabled]}
              onPress={handleSave}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={loading ? ['#93C5FD', '#93C5FD'] : ['#2196F3', '#1976D2']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <>
                    <ActivityIndicator size="small" color="#FFF" />
                    <Text style={styles.buttonText}>Saving...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                    <Text style={styles.buttonText}>Save Changes</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryActionButton, loading && styles.actionButtonDisabled]}
              onPress={handleCancel}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerGradient: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    padding: 8,
    width: 40,
    alignItems: 'center',
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    // paddingBottom set dynamically via useSafeAreaInsets
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1976D2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFF',
  },
  avatarEditButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  avatarHint: {
    fontSize: 14,
    color: '#64748B',
  },
  formSection: {
    gap: 20,
  },
  fieldContainer: {
    marginBottom: 4,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    minHeight: 56,
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  inputDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  inputIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
    paddingVertical: 12,
  },
  inputDisabledText: {
    color: '#94A3B8',
  },
  textAreaWrapper: {
    minHeight: 120,
    alignItems: 'flex-start',
    paddingTop: 12,
    paddingBottom: 12,
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
    marginLeft: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
    marginLeft: 4,
  },
  charCountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    marginHorizontal: 4,
  },
  charCount: {
    fontSize: 12,
    color: '#94A3B8',
    marginLeft: 'auto',
  },
  actionButtons: {
    marginTop: 32,
    gap: 12,
  },
  // Action buttons (full width at bottom)
  primaryActionButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  secondaryActionButton: {
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
});
