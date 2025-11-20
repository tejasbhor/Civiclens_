/**
 * SubmitReportScreen - Professional Single-Page Form
 * Consistent with backend enums and web client UX
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useCompleteReportSubmission } from '@shared/hooks/useCompleteReportSubmission';
import { ReportCategory, ReportSeverity } from '@shared/types/report';
import { TopNavbar } from '@shared/components';
import { getContentContainerStyle } from '@shared/utils/screenPadding';

// Backend-consistent category options
const CATEGORY_OPTIONS = [
  { value: ReportCategory.ROADS, label: 'Roads', icon: 'car' },
  { value: ReportCategory.WATER, label: 'Water Supply', icon: 'water' },
  { value: ReportCategory.SANITATION, label: 'Sanitation', icon: 'trash' },
  { value: ReportCategory.ELECTRICITY, label: 'Electricity', icon: 'flash' },
  { value: ReportCategory.STREETLIGHT, label: 'Street Light', icon: 'bulb' },
  { value: ReportCategory.DRAINAGE, label: 'Drainage', icon: 'water-outline' },
  { value: ReportCategory.PUBLIC_PROPERTY, label: 'Public Property', icon: 'business' },
  { value: ReportCategory.OTHER, label: 'Other', icon: 'ellipsis-horizontal' },
];

const SEVERITY_OPTIONS = [
  { value: ReportSeverity.LOW, label: 'Low', color: '#4CAF50' },
  { value: ReportSeverity.MEDIUM, label: 'Medium', color: '#FFC107' },
  { value: ReportSeverity.HIGH, label: 'High', color: '#FF9800' },
  { value: ReportSeverity.CRITICAL, label: 'Critical', color: '#F44336' },
];

export const SubmitReportScreen: React.FC = () => {
  const navigation = useNavigation();
  const { submitComplete, loading, progress, isOnline } = useCompleteReportSubmission();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [severity, setSeverity] = useState<ReportSeverity>(ReportSeverity.MEDIUM);
  const [photos, setPhotos] = useState<string[]>([]);
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  
  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSeverityModal, setShowSeverityModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const captureLocation = async () => {
    try {
      setLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const addresses = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      const addr = addresses[0];
      const formattedAddress = [addr.street, addr.city, addr.region, addr.postalCode]
        .filter(Boolean)
        .join(', ');

      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        address: formattedAddress || `${loc.coords.latitude.toFixed(6)}, ${loc.coords.longitude.toFixed(6)}`,
      });

      Alert.alert('Success', 'Location captured successfully');
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert('Error', 'Failed to capture location. Please try again.');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotos((prev) => [...prev, result.assets[0].uri].slice(0, 5));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to capture photo');
    }
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Media library permission is required');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5 - photos.length,
      });

      if (!result.canceled && result.assets.length > 0) {
        const newPhotos = result.assets.map((asset) => asset.uri);
        setPhotos((prev) => [...prev, ...newPhotos].slice(0, 5));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick images');
    }
  };

  const validateForm = (): { isValid: boolean; message?: string; field?: string } => {
    if (!title.trim() || title.trim().length < 5) {
      return { 
        isValid: false, 
        message: 'Please enter a title (minimum 5 characters)',
        field: 'Title'
      };
    }
    if (!description.trim() || description.trim().length < 10) {
      return { 
        isValid: false, 
        message: 'Please provide a detailed description (minimum 10 characters)',
        field: 'Description'
      };
    }
    if (!category) {
      return { 
        isValid: false, 
        message: 'Please select a category for your report',
        field: 'Category'
      };
    }
    if (photos.length === 0) {
      return { 
        isValid: false, 
        message: 'Please add at least one photo to help us understand the issue',
        field: 'Photos'
      };
    }
    if (!location) {
      return { 
        isValid: false, 
        message: 'Please capture your current location',
        field: 'Location'
      };
    }
    return { isValid: true };
  };

  const handleSubmitPress = () => {
    // Validate form
    const validation = validateForm();
    if (!validation.isValid) {
      Alert.alert(
        `${validation.field} Required`,
        validation.message,
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    // Show custom confirmation modal
    setShowConfirmModal(true);
  };

  const handleSubmit = async () => {
    try {
      if (!category) {
        Alert.alert('Error', 'Please select a category');
        return;
      }

      const result = await submitComplete({
        title: title.trim(),
        description: description.trim(),
        category,
        severity,
        latitude: location!.latitude,
        longitude: location!.longitude,
        address: location!.address,
        photos,
        is_public: true,
        is_sensitive: false,
      });

      // Clear form
      setTitle('');
      setDescription('');
      setCategory(null);
      setSeverity(ReportSeverity.MEDIUM);
      setPhotos([]);
      setLocation(null);

      // Show success message based on submission type
      const successTitle = result.offline ? '📱 Saved Offline' : '✅ Submitted Successfully';
      const successMessage = result.offline
        ? 'Your report has been saved and will be automatically submitted when you\'re back online. You can continue using the app normally.'
        : `Your report #${result.report_number || result.id} has been submitted successfully and will be reviewed by the authorities.`;

      Alert.alert(
        successTitle,
        successMessage,
        [
          {
            text: 'View My Reports',
            onPress: () => {
              navigation.navigate('Reports' as never);
            },
          },
          {
            text: 'Submit Another',
            onPress: () => {
              // Stay on current screen for another submission
            },
          },
          {
            text: 'Done',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Submission Failed',
        error.message || 'Failed to submit report. Please check your information and try again.',
        [
          { text: 'OK', style: 'default' }
        ]
      );
    }
  };

  const getCategoryLabel = () => {
    if (!category) return 'Select Category';
    return CATEGORY_OPTIONS.find((c) => c.value === category)?.label || 'Select Category';
  };

  const getSeverityLabel = () => {
    return SEVERITY_OPTIONS.find((s) => s.value === severity)?.label || 'Medium';
  };

  const getSeverityColor = (sev: ReportSeverity) => {
    return SEVERITY_OPTIONS.find((s) => s.value === sev)?.color || '#FFC107';
  };

  return (
    <View style={styles.container}>
      {/* Reusable Top Navbar */}
      <TopNavbar
        title="Report Issue"
        showBack={true}
      />
      
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={getContentContainerStyle(insets, styles.scrollContent)}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Title <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Brief description (e.g., Broken streetlight)"
              placeholderTextColor="#94A3B8"
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Description <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Provide detailed information about the issue..."
              placeholderTextColor="#94A3B8"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              maxLength={500}
              textAlignVertical="top"
            />
          </View>

          {/* Category Dropdown */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Category <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setShowCategoryModal(true)}
            >
              <View style={styles.dropdownContent}>
                {category && (
                  <Ionicons
                    name={CATEGORY_OPTIONS.find((c) => c.value === category)?.icon as any}
                    size={20}
                    color="#1976D2"
                  />
                )}
                <Text style={[styles.dropdownText, !category && styles.dropdownPlaceholder]}>
                  {getCategoryLabel()}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Severity Dropdown */}
          <View style={styles.section}>
            <Text style={styles.label}>Severity</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setShowSeverityModal(true)}
            >
              <View style={styles.dropdownContent}>
                <View
                  style={[
                    styles.severityDot,
                    { backgroundColor: getSeverityColor(severity) },
                  ]}
                />
                <Text style={styles.dropdownText}>{getSeverityLabel()}</Text>
              </View>
              <Ionicons name="chevron-down" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Photos */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Photos <Text style={styles.required}>*</Text> ({photos.length}/5)
            </Text>
            <View style={styles.photosContainer}>
              {photos.length > 0 && (
                <View style={styles.photosGrid}>
                  {photos.map((photo, index) => (
                    <View key={index} style={styles.photoItem}>
                      <Image source={{ uri: photo }} style={styles.photoImage} />
                      <TouchableOpacity
                        style={styles.removePhotoButton}
                        onPress={() => setPhotos((prev) => prev.filter((_, i) => i !== index))}
                      >
                        <Ionicons name="close-circle" size={24} color="#F44336" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {photos.length < 5 && (
                <View style={styles.photoActions}>
                  <TouchableOpacity style={styles.photoActionButton} onPress={handleTakePhoto}>
                    <Ionicons name="camera" size={24} color="#1976D2" />
                    <Text style={styles.photoActionText}>Take Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.photoActionButton} onPress={handlePickImage}>
                    <Ionicons name="images" size={24} color="#1976D2" />
                    <Text style={styles.photoActionText}>Choose from Gallery</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Location */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Location <Text style={styles.required}>*</Text>
            </Text>
            {location ? (
              <View style={styles.locationCard}>
                <View style={styles.locationHeader}>
                  <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                  <Text style={styles.locationSuccess}>Location captured</Text>
                </View>
                <View style={styles.locationDetails}>
                  <View style={styles.locationRow}>
                    <Ionicons name="navigate" size={16} color="#64748B" />
                    <Text style={styles.locationCoords}>
                      {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </Text>
                  </View>
                  <Text style={styles.locationAddress}>{location.address}</Text>
                </View>
                <TouchableOpacity style={styles.retryButton} onPress={captureLocation}>
                  <Ionicons name="refresh" size={16} color="#1976D2" />
                  <Text style={styles.retryText}>Recapture</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.locationButton}
                onPress={captureLocation}
                disabled={locationLoading}
              >
                <LinearGradient
                  colors={['#1976D2', '#1565C0']}
                  style={styles.locationButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {locationLoading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="location" size={24} color="#FFF" />
                      <Text style={styles.locationButtonText}>Capture Current Location</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          {/* Offline Warning */}
          {!isOnline && (
            <View style={styles.offlineWarning}>
              <Ionicons name="cloud-offline" size={20} color="#FF9800" />
              <Text style={styles.offlineText}>
                Offline mode - Report will sync when online
              </Text>
            </View>
          )}

          {/* Progress */}
          {progress && (
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressText}>{progress.message}</Text>
                {(progress.stage === 'compressing' || progress.stage === 'submitting' || progress.stage === 'uploading') && (
                  <ActivityIndicator size="small" color="#1976D2" />
                )}
              </View>
              {progress.percentage !== undefined && (
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${progress.percentage}%` },
                    ]}
                  />
                  <Text style={styles.progressPercentage}>
                    {Math.round(progress.percentage)}%
                  </Text>
                </View>
              )}
              {progress.currentFile && progress.totalFiles && (
                <Text style={styles.progressSubtext}>
                  Processing file {progress.currentFile} of {progress.totalFiles}
                </Text>
              )}
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmitPress}
            disabled={loading}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#4CAF50', '#388E3C']}
              style={styles.submitButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Ionicons name="send" size={22} color="#FFF" />
                  <Text style={styles.submitButtonText}>Submit Report</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Category Modal */}
      <Modal
        visible={showCategoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {CATEGORY_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.modalItem,
                    category === option.value && styles.modalItemActive,
                  ]}
                  onPress={() => {
                    setCategory(option.value);
                    setShowCategoryModal(false);
                  }}
                >
                  <View style={styles.modalItemContent}>
                    <Ionicons
                      name={option.icon as any}
                      size={24}
                      color={category === option.value ? '#1976D2' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.modalItemText,
                        category === option.value && styles.modalItemTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </View>
                  {category === option.value && (
                    <Ionicons name="checkmark-circle" size={24} color="#1976D2" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Severity Modal */}
      <Modal
        visible={showSeverityModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSeverityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Severity</Text>
              <TouchableOpacity onPress={() => setShowSeverityModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {SEVERITY_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.modalItem,
                    severity === option.value && styles.modalItemActive,
                  ]}
                  onPress={() => {
                    setSeverity(option.value);
                    setShowSeverityModal(false);
                  }}
                >
                  <View style={styles.modalItemContent}>
                    <View
                      style={[styles.severityDot, { backgroundColor: option.color }]}
                    />
                    <Text
                      style={[
                        styles.modalItemText,
                        severity === option.value && styles.modalItemTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </View>
                  {severity === option.value && (
                    <Ionicons name="checkmark-circle" size={24} color="#1976D2" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Confirmation Modal - Production-Ready with Safe Area Support */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalKeyboardAvoid}
          >
            <View style={[
              styles.confirmModalContent,
              { marginBottom: Math.max(insets.bottom, 20) }
            ]}>
              {/* Header */}
              <View style={styles.confirmModalHeader}>
                <View style={styles.confirmIconContainer}>
                  <Ionicons name="document-text" size={32} color="#1976D2" />
                </View>
                <Text style={styles.confirmModalTitle}>Confirm Submission</Text>
                <Text style={styles.confirmModalSubtitle}>
                  Please review your report details before submitting
                </Text>
              </View>

              {/* Scrollable Report Summary */}
              <ScrollView 
                style={styles.confirmModalScroll}
                contentContainerStyle={styles.confirmSummaryContainer}
                showsVerticalScrollIndicator={true}
                bounces={false}
              >
              <View style={styles.summaryItem}>
                <View style={styles.summaryIcon}>
                  <Ionicons name="text" size={20} color="#1976D2" />
                </View>
                <View style={styles.summaryContent}>
                  <Text style={styles.summaryLabel}>Title</Text>
                  <Text style={styles.summaryValue} numberOfLines={2}>
                    {title.trim()}
                  </Text>
                </View>
              </View>

              <View style={styles.summaryItem}>
                <View style={styles.summaryIcon}>
                  <Ionicons 
                    name={CATEGORY_OPTIONS.find(c => c.value === category)?.icon as any} 
                    size={20} 
                    color="#1976D2" 
                  />
                </View>
                <View style={styles.summaryContent}>
                  <Text style={styles.summaryLabel}>Category</Text>
                  <Text style={styles.summaryValue}>{getCategoryLabel()}</Text>
                </View>
              </View>

              <View style={styles.summaryItem}>
                <View style={styles.summaryIcon}>
                  <View
                    style={[
                      styles.severityIndicator,
                      { backgroundColor: getSeverityColor(severity) },
                    ]}
                  />
                </View>
                <View style={styles.summaryContent}>
                  <Text style={styles.summaryLabel}>Severity</Text>
                  <Text style={styles.summaryValue}>{getSeverityLabel()}</Text>
                </View>
              </View>

              <View style={styles.summaryItem}>
                <View style={styles.summaryIcon}>
                  <Ionicons name="images" size={20} color="#1976D2" />
                </View>
                <View style={styles.summaryContent}>
                  <Text style={styles.summaryLabel}>Photos</Text>
                  <Text style={styles.summaryValue}>{photos.length} attached</Text>
                </View>
              </View>

              <View style={styles.summaryItem}>
                <View style={styles.summaryIcon}>
                  <Ionicons name="location" size={20} color="#1976D2" />
                </View>
                <View style={styles.summaryContent}>
                  <Text style={styles.summaryLabel}>Location</Text>
                  <Text style={styles.summaryValue} numberOfLines={2}>
                    {location?.address}
                  </Text>
                </View>
              </View>

                {/* Status Badge */}
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: isOnline ? '#E8F5E9' : '#FFF3E0' }
                ]}>
                  <Ionicons 
                    name={isOnline ? "cloud-done" : "cloud-offline"} 
                    size={18} 
                    color={isOnline ? "#4CAF50" : "#FF9800"} 
                  />
                  <Text style={[
                    styles.statusBadgeText,
                    { color: isOnline ? "#2E7D32" : "#E65100" }
                  ]}>
                    {isOnline 
                      ? 'Will be submitted immediately' 
                      : 'Will be saved offline and synced later'}
                  </Text>
                </View>
              </ScrollView>

              {/* Action Buttons - Fixed at Bottom with Safe Area */}
              <View style={[
                styles.confirmModalActions,
                { paddingBottom: Math.max(insets.bottom + 8, 20) }
              ]}>
              <TouchableOpacity
                style={styles.confirmCancelButton}
                activeOpacity={0.7}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.confirmCancelButtonText}>Review Again</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmSubmitButton}
                activeOpacity={0.7}
                onPress={() => {
                  setShowConfirmModal(false);
                  handleSubmit();
                }}
              >
                <LinearGradient
                  colors={['#4CAF50', '#388E3C']}
                  style={styles.confirmSubmitButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="checkmark-circle" size={22} color="#FFF" />
                  <Text style={styles.confirmSubmitButtonText}>Submit Now</Text>
                </LinearGradient>
              </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    // paddingBottom will be set dynamically with safe area insets
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  required: {
    color: '#F44336',
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1E293B',
    backgroundColor: '#FFF',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#FFF',
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dropdownText: {
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '500',
  },
  dropdownPlaceholder: {
    color: '#94A3B8',
    fontWeight: '400',
  },
  severityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  photosContainer: {
    gap: 12,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  photoItem: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 12,
  },
  photoActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1976D2',
    borderStyle: 'dashed',
    backgroundColor: '#F0F7FF',
    gap: 8,
  },
  photoActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
  },
  locationCard: {
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationSuccess: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4CAF50',
  },
  locationDetails: {
    gap: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationCoords: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  locationAddress: {
    fontSize: 14,
    color: '#1E293B',
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F0F7FF',
    gap: 4,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1976D2',
  },
  locationButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#1976D2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  locationButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  locationButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  offlineWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE0B2',
    gap: 10,
    marginBottom: 16,
  },
  offlineText: {
    flex: 1,
    fontSize: 13,
    color: '#E65100',
    fontWeight: '500',
  },
  progressCard: {
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#1976D2',
    borderRadius: 3,
  },
  progressPercentage: {
    position: 'absolute',
    right: 0,
    top: -20,
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  progressSubtext: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  submitButton: {
    marginTop: 32,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 32,
    gap: 12,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  modalList: {
    padding: 8,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginVertical: 4,
  },
  modalItemActive: {
    backgroundColor: '#F0F7FF',
  },
  modalItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalItemText: {
    fontSize: 16,
    color: '#1E293B',
  },
  modalItemTextActive: {
    fontWeight: '600',
    color: '#1976D2',
  },
  
  // Confirmation Modal Styles - Production Ready
  modalKeyboardAvoid: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmModalContent: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  confirmModalScroll: {
    maxHeight: '60%',
  },
  confirmModalHeader: {
    alignItems: 'center',
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  confirmIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  confirmModalSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  confirmSummaryContainer: {
    padding: 20,
    gap: 16,
    paddingBottom: 8,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '600',
  },
  severityIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  statusBadgeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  confirmModalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  confirmCancelButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmCancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  confirmSubmitButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmSubmitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  confirmSubmitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
});
