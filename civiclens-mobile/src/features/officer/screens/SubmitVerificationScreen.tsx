import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { apiClient } from '@shared/services/api/apiClient';
import { TopNavbar } from '@shared/components';
import { styles } from '@features/officer/styles/submitVerificationStyles';

type RootStackParamList = {
  SubmitVerification: { reportId: number; reportNumber: string; title: string };
};

type SubmitVerificationRouteProp = RouteProp<RootStackParamList, 'SubmitVerification'>;

interface PhotoPreview {
  uri: string;
  fileName: string;
  type: string;
  id: string;
}

interface ChecklistState {
  resolved: boolean;
  cleaned: boolean;
  photos: boolean;
  materials: boolean;
}

interface MediaItem {
  id: number;
  file_url: string;
  upload_source: string;
}

export default function SubmitVerificationScreen() {
  const route = useRoute<SubmitVerificationRouteProp>();
  const navigation = useNavigation();
  
  const { reportId, reportNumber, title } = route.params;

  // State
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [task, setTask] = useState<any>(null);
  const [citizenPhotos, setCitizenPhotos] = useState<MediaItem[]>([]);
  const [beforePhotos, setBeforePhotos] = useState<MediaItem[]>([]);
  
  const [afterPhotos, setAfterPhotos] = useState<PhotoPreview[]>([]);
  const [completionNotes, setCompletionNotes] = useState('');
  const [workDuration, setWorkDuration] = useState('');
  const [materialsUsed, setMaterialsUsed] = useState('');
  const [checklist, setChecklist] = useState<ChecklistState>({
    resolved: false,
    cleaned: false,
    photos: false,
    materials: false,
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Load task details and photos
  useEffect(() => {
    loadTaskData();
  }, [reportId]);

  const loadTaskData = async () => {
    try {
      setLoading(true);

      const taskResponse: any = await apiClient.get(`/reports/${reportId}`);
      setTask(taskResponse.data);

      const mediaResponse: any = await apiClient.get(`/media/report/${reportId}`);
      const mediaList = Array.isArray(mediaResponse.data) ? mediaResponse.data : [];

      const citizen = mediaList.filter((m: MediaItem) => 
        !m.upload_source || m.upload_source === 'citizen_submission'
      );
      const before = mediaList.filter((m: MediaItem) => 
        m.upload_source === 'officer_before_photo'
      );

      setCitizenPhotos(citizen);
      setBeforePhotos(before);
    } catch (err: any) {
      console.error('Failed to load task data:', err);
      Alert.alert('Error', err.message || 'Failed to load task details');
    } finally {
      setLoading(false);
    }
  };

  const getMediaUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
    const baseUrl = API_BASE.replace('/api/v1', '');
    return `${baseUrl}${url}`;
  };

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
      Alert.alert(
        'Permissions Required',
        'Camera and photo library permissions are needed.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const pickImageFromCamera = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const totalOfficerPhotos = beforePhotos.length + afterPhotos.length + 1;
    if (totalOfficerPhotos > 5) {
      Alert.alert(
        'Photo Limit Reached',
        `Maximum 5 officer photos allowed. You can add ${Math.max(0, 5 - beforePhotos.length - afterPhotos.length)} more.`
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const newPhoto: PhotoPreview = {
        uri: asset.uri,
        fileName: `after_photo_${Date.now()}.jpg`,
        type: 'image/jpeg',
        id: `${Date.now()}-${Math.random()}`,
      };
      setAfterPhotos([...afterPhotos, newPhoto]);
      setChecklist(prev => ({ ...prev, photos: true }));
      setValidationErrors(prev => ({ ...prev, photos: '' }));
    }
  };

  const pickImageFromGallery = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const remaining = Math.max(0, 5 - beforePhotos.length - afterPhotos.length);
    if (remaining === 0) {
      Alert.alert('Photo Limit Reached', 'Maximum 5 officer photos allowed.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newPhotos: PhotoPreview[] = result.assets.slice(0, remaining).map((asset, index) => ({
        uri: asset.uri,
        fileName: `after_photo_${Date.now()}_${index}.jpg`,
        type: 'image/jpeg',
        id: `${Date.now()}-${index}-${Math.random()}`,
      }));

      if (newPhotos.length < result.assets.length) {
        Alert.alert('Photo Limit', `Only ${newPhotos.length} photo(s) added.`);
      }

      setAfterPhotos([...afterPhotos, ...newPhotos]);
      setChecklist(prev => ({ ...prev, photos: true }));
      setValidationErrors(prev => ({ ...prev, photos: '' }));
    }
  };

  const removePhoto = (photoId: string) => {
    setAfterPhotos(afterPhotos.filter(p => p.id !== photoId));
    if (afterPhotos.length === 1) {
      setChecklist(prev => ({ ...prev, photos: false }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (afterPhotos.length === 0) {
      errors.photos = 'At least one after photo is required';
    }

    if (!completionNotes.trim()) {
      errors.completionNotes = 'Work completion notes are required';
    } else if (completionNotes.trim().length < 10) {
      errors.completionNotes = 'Completion notes must be at least 10 characters';
    }

    if (!workDuration.trim()) {
      errors.workDuration = 'Work duration is required';
    } else {
      const duration = parseFloat(workDuration);
      if (isNaN(duration) || duration <= 0) {
        errors.workDuration = 'Please enter a valid work duration';
      } else if (duration > 1000) {
        errors.workDuration = 'Work duration seems unrealistic';
      }
    }

    if (!checklist.resolved) {
      errors.checklist = 'Please confirm that the issue is completely resolved';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      const firstError = Object.values(validationErrors)[0];
      Alert.alert('Validation Error', firstError);
      return;
    }

    Alert.alert(
      'Submit for Verification?',
      `• ${afterPhotos.length} after photo(s)\n• Work duration: ${workDuration} hours\n\nThe citizen and admin will be notified.`,
      [
        { text: 'Review Again', style: 'cancel' },
        { text: 'Submit', onPress: submitWork },
      ]
    );
  };

  const submitWork = async () => {
    try {
      setSubmitting(true);

      // 1. Upload after photos SEQUENTIALLY to avoid race conditions
      let successCount = 0;
      let failedCount = 0;
      const failedErrors: string[] = [];

      for (let i = 0; i < afterPhotos.length; i++) {
        const photo = afterPhotos[i];
        
        try {
          const formData = new FormData();
          formData.append('file', {
            uri: photo.uri,
            type: photo.type,
            name: photo.fileName,
          } as any);
          formData.append('upload_source', 'officer_after_photo');
          formData.append('is_proof_of_work', 'true');
          formData.append('caption', 'After completing work');

          await apiClient.post(`/media/upload/${reportId}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          
          successCount++;
          console.log(`✅ Uploaded photo ${i + 1}/${afterPhotos.length}`);
        } catch (uploadError: any) {
          failedCount++;
          const errorMsg = uploadError.response?.data?.detail || uploadError.message || 'Upload failed';
          failedErrors.push(`Photo ${i + 1}: ${errorMsg}`);
          console.error(`❌ Failed to upload photo ${i + 1}/${afterPhotos.length}:`, errorMsg);
        }
      }

      // Show warning if some uploads failed, but continue if at least 1 succeeded
      if (failedCount > 0 && successCount > 0) {
        Alert.alert(
          'Partial Upload',
          `${successCount} photo(s) uploaded, ${failedCount} failed:\n${failedErrors.join('\n')}`,
          [{ text: 'Continue Anyway', onPress: () => {} }]
        );
      } else if (successCount === 0 && failedCount > 0) {
        throw new Error(`Failed to upload all photos:\n${failedErrors.join('\n')}`);
      }

      // 2. Submit for verification
      const submitFormData = new FormData();
      const notes = `${completionNotes.trim()}\n\nWork Duration: ${workDuration} hours\nMaterials Used: ${materialsUsed.trim() || 'N/A'}`;
      submitFormData.append('resolution_notes', notes);

      await apiClient.post(`/reports/${reportId}/submit-for-verification`, submitFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert(
        'Success',
        `Work submitted successfully! ${successCount} photo(s) uploaded.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      console.error('Failed to submit work:', err);
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to submit work';
      Alert.alert('Error', errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const remainingPhotoSlots = Math.max(0, 5 - beforePhotos.length - afterPhotos.length);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading task details...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TopNavbar title="Submit for Verification" showBack />
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Task Information */}
        <View style={styles.taskInfoCard}>
          <View style={styles.taskInfoHeader}>
            <Ionicons name="document-text" size={20} color="#3B82F6" />
            <Text style={styles.taskInfoTitle}>Task Details</Text>
          </View>
          <View style={styles.taskInfoRow}>
            <Text style={styles.taskInfoLabel}>Report #:</Text>
            <Text style={styles.taskInfoValue}>{reportNumber}</Text>
          </View>
          <View style={styles.taskInfoRow}>
            <Text style={styles.taskInfoLabel}>Title:</Text>
            <Text style={styles.taskInfoValue} numberOfLines={2}>{title}</Text>
          </View>
        </View>

        {/* Citizen Photos */}
        {(citizenPhotos.length > 0 || beforePhotos.length > 0) && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="images-outline" size={20} color="#6B7280" />
              <Text style={styles.sectionTitle}>Original Photos</Text>
            </View>
            <Text style={styles.sectionDescription}>
              These are the photos submitted by the citizen and any before photos you took.
            </Text>
            <View style={styles.photosGrid}>
              {citizenPhotos.map((photo) => (
                <View key={photo.id} style={styles.photoItem}>
                  <Image
                    source={{ uri: getMediaUrl(photo.file_url) }}
                    style={styles.photoImage}
                    resizeMode="cover"
                  />
                </View>
              ))}
              {beforePhotos.map((photo) => (
                <View key={photo.id} style={styles.photoItem}>
                  <Image
                    source={{ uri: getMediaUrl(photo.file_url) }}
                    style={styles.photoImage}
                    resizeMode="cover"
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* After Photos Upload */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="camera" size={20} color="#3B82F6" />
            <Text style={styles.sectionTitle}>After Photos</Text>
            <View style={styles.requiredBadge}>
              <Text style={styles.requiredText}>REQUIRED</Text>
            </View>
          </View>
          <Text style={styles.sectionDescription}>
            Upload 1-5 photos showing the completed work. These will serve as proof of work.
          </Text>
          
          {afterPhotos.length > 0 ? (
            <View style={styles.photosGrid}>
              {afterPhotos.map((photo) => (
                <View key={photo.id} style={styles.photoItem}>
                  <Image
                    source={{ uri: photo.uri }}
                    style={styles.photoImage}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => removePhoto(photo.id)}
                  >
                    <Ionicons name="close" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyPhotosText}>No after photos yet</Text>
          )}

          <View style={styles.uploadButtonsRow}>
            <TouchableOpacity
              style={[
                styles.uploadButton,
                remainingPhotoSlots === 0 && styles.uploadButtonDisabled,
              ]}
              onPress={pickImageFromCamera}
              disabled={remainingPhotoSlots === 0}
            >
              <Ionicons name="camera-outline" size={20} color="#FFFFFF" />
              <Text style={styles.uploadButtonText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.uploadButton,
                styles.uploadButtonOutline,
                remainingPhotoSlots === 0 && styles.uploadButtonDisabled,
              ]}
              onPress={pickImageFromGallery}
              disabled={remainingPhotoSlots === 0}
            >
              <Ionicons name="images-outline" size={20} color="#3B82F6" />
              <Text style={[styles.uploadButtonText, styles.uploadButtonTextOutline]}>
                Choose Photos
              </Text>
            </TouchableOpacity>
          </View>

          {remainingPhotoSlots > 0 ? (
            <Text style={styles.photoCountText}>
              {afterPhotos.length} of 5 photos • {remainingPhotoSlots} slots remaining
            </Text>
          ) : (
            <Text style={styles.photoLimitText}>
              ⚠️ Maximum photo limit reached (5 photos)
            </Text>
          )}

          {validationErrors.photos && (
            <Text style={styles.errorText}>{validationErrors.photos}</Text>
          )}
        </View>

        {/* Work Duration */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time-outline" size={20} color="#3B82F6" />
            <Text style={styles.sectionTitle}>Work Duration</Text>
            <View style={styles.requiredBadge}>
              <Text style={styles.requiredText}>REQUIRED</Text>
            </View>
          </View>
          <Text style={styles.inputLabel}>How many hours did you work? *</Text>
          <TextInput
            style={[
              styles.input,
              validationErrors.workDuration && styles.inputError,
            ]}
            placeholder="e.g., 3.5"
            value={workDuration}
            onChangeText={setWorkDuration}
            keyboardType="decimal-pad"
            returnKeyType="done"
          />
          {validationErrors.workDuration ? (
            <Text style={styles.errorText}>{validationErrors.workDuration}</Text>
          ) : (
            <Text style={styles.inputHelper}>Enter work duration in hours (e.g., 2.5 for 2½ hours)</Text>
          )}
        </View>

        {/* Materials Used */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="construct-outline" size={20} color="#6B7280" />
            <Text style={styles.sectionTitle}>Materials Used</Text>
            <View style={styles.optionalBadge}>
              <Text style={styles.optionalText}>OPTIONAL</Text>
            </View>
          </View>
          <Text style={styles.inputLabel}>Materials/equipment used (if any)</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="e.g., Cement bags: 5, Sand: 2 cubic meters, Paint: 10 liters"
            value={materialsUsed}
            onChangeText={setMaterialsUsed}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <Text style={styles.inputHelper}>
            List all materials and equipment used during the work
          </Text>
        </View>

        {/* Completion Notes */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text-outline" size={20} color="#3B82F6" />
            <Text style={styles.sectionTitle}>Completion Notes</Text>
            <View style={styles.requiredBadge}>
              <Text style={styles.requiredText}>REQUIRED</Text>
            </View>
          </View>
          <Text style={styles.inputLabel}>Describe the work completed *</Text>
          <TextInput
            style={[
              styles.input,
              styles.textarea,
              validationErrors.completionNotes && styles.inputError,
            ]}
            placeholder="Describe the work you completed and any observations (min 10 characters)..."
            value={completionNotes}
            onChangeText={setCompletionNotes}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
          {validationErrors.completionNotes ? (
            <Text style={styles.errorText}>{validationErrors.completionNotes}</Text>
          ) : (
            <Text
              style={[
                styles.characterCount,
                completionNotes.length < 10 && styles.characterCountError,
              ]}
            >
              {completionNotes.length} / 10 minimum characters
            </Text>
          )}
          <View style={[styles.infoBanner]}>
            <Ionicons name="information-circle" size={18} color="#1E40AF" />
            <Text style={styles.bannerText}>
              These notes will be shared with the citizen and admin. Be specific and professional.
            </Text>
          </View>
        </View>

        {/* Confirmation Checklist */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#10B981" />
            <Text style={styles.sectionTitle}>Confirmation Checklist</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Please confirm the following before submitting:
          </Text>
          <View style={styles.checklistContainer}>
            <TouchableOpacity
              style={styles.checklistItem}
              onPress={() => setChecklist(prev => ({ ...prev, resolved: !prev.resolved }))}
            >
              <View style={[styles.checkbox, checklist.resolved && styles.checkboxChecked]}>
                {checklist.resolved && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
              </View>
              <Text style={[styles.checkboxLabel, styles.checkboxRequired]}>
                I confirm that the issue is completely resolved *
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.checklistItem}
              onPress={() => setChecklist(prev => ({ ...prev, cleaned: !prev.cleaned }))}
            >
              <View style={[styles.checkbox, checklist.cleaned && styles.checkboxChecked]}>
                {checklist.cleaned && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
              </View>
              <Text style={styles.checkboxLabel}>
                I have cleaned up the work area
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.checklistItem}
              onPress={() => setChecklist(prev => ({ ...prev, photos: !prev.photos }))}
            >
              <View style={[styles.checkbox, checklist.photos && styles.checkboxChecked]}>
                {checklist.photos && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
              </View>
              <Text style={styles.checkboxLabel}>
                I have taken after photos as proof of work
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.checklistItem}
              onPress={() => setChecklist(prev => ({ ...prev, materials: !prev.materials }))}
            >
              <View style={[styles.checkbox, checklist.materials && styles.checkboxChecked]}>
                {checklist.materials && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
              </View>
              <Text style={styles.checkboxLabel}>
                I have documented all materials used
              </Text>
            </TouchableOpacity>
          </View>
          {validationErrors.checklist && (
            <Text style={styles.errorText}>{validationErrors.checklist}</Text>
          )}
        </View>

        {/* Important Note */}
        <View style={[styles.infoBanner, styles.warningBanner]}>
          <Ionicons name="alert-circle" size={18} color="#92400E" />
          <Text style={[styles.bannerText, styles.warningBannerText]}>
            Once submitted, the task will be marked as PENDING_VERIFICATION. The citizen and admin will be notified to review your work.
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            submitting && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Submit for Verification</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
