/**
 * OfficerTaskDetailScreen - Detailed view of a single task
 * Production-ready with proper error handling, loading states, and action buttons
 * Consistent with ReportDetailScreen design patterns
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Platform,
  Dimensions,
  Linking,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  useRoute,
  useNavigation,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TasksStackParamList } from '../../../navigation/OfficerTabNavigator';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
import { apiClient } from '@shared/services/api/apiClient';
import { TopNavbar, RoleGuard } from '@shared/components';
import { UserRole } from '@shared/types/user';
import type { TaskDetailResponse, TaskUpdate } from '../types/taskDetail.types';
import {
  getMediaUrl,
  getStatusColor,
  getSeverityColor,
  getPriorityLabel,
  getPriorityColor,
  formatStatus,
  formatDate,
  safeFormatDistanceToNow,
} from '../utils/taskDetailHelpers';
import { taskDetailStyles as styles } from '../styles/taskDetailStyles';

const { width } = Dimensions.get('window');

export const OfficerTaskDetailScreen: React.FC = () => {
  return (
    <RoleGuard allowedRoles={[UserRole.NODAL_OFFICER, UserRole.ADMIN, UserRole.AUDITOR]}>
      <OfficerTaskDetailContent />
    </RoleGuard>
  );
};

const OfficerTaskDetailContent: React.FC = () => {
  const route = useRoute();
  const { taskId } = route.params as { taskId: number };

  // State management
  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState<TaskDetailResponse | null>(null);
  const [updates, setUpdates] = useState<TaskUpdate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Modal states
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [updateNotes, setUpdateNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [holdReason, setHoldReason] = useState('');
  const [customHoldReason, setCustomHoldReason] = useState('');
  const [estimatedResumeDate, setEstimatedResumeDate] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  useEffect(() => {
    loadTask();
  }, [taskId]);

  const loadTask = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // The taskId is actually the report_id (tasks are embedded in reports)
      // Fetch report directly by ID - much more efficient than fetching all reports
      const reportWithTask = await apiClient.get<any>(`/reports/${taskId}`);
      
      if (!reportWithTask || !reportWithTask.task) {
        throw new Error('Task not found or not assigned to an officer');
      }
      
      // Transform to TaskDetailResponse format
      const taskData: TaskDetailResponse = {
        id: reportWithTask.task.id,
        report_id: reportWithTask.id,
        status: reportWithTask.task.status,
        priority: reportWithTask.task.priority || 2, // Default to medium priority (2)
        notes: reportWithTask.task.notes,
        resolution_notes: reportWithTask.task.resolution_notes,
        rejection_reason: reportWithTask.task.rejection_reason,
        assigned_at: reportWithTask.task.created_at,
        acknowledged_at: reportWithTask.task.acknowledged_at,
        started_at: reportWithTask.task.started_at,
        resolved_at: reportWithTask.task.completed_at,
        rejected_at: reportWithTask.task.rejected_at,
        sla_deadline: reportWithTask.task.sla_deadline,
        sla_violated: reportWithTask.task.sla_violated || 0,
        officer: {
          id: reportWithTask.task.assigned_to || 0,
          full_name: reportWithTask.task.assigned_to_user?.full_name || 'Unknown Officer',
          phone: reportWithTask.task.assigned_to_user?.phone || '',
          employee_id: reportWithTask.task.assigned_to_user?.employee_id,
        },
        report: {
          id: reportWithTask.id,
          report_number: reportWithTask.report_number || `RPT-${reportWithTask.id}`,
          title: reportWithTask.title,
          description: reportWithTask.description,
          category: reportWithTask.category,
          severity: reportWithTask.severity || 'medium',
          status: reportWithTask.status,
          address: reportWithTask.location?.address || reportWithTask.address || 'No address',
          landmark: reportWithTask.location?.landmark || reportWithTask.landmark,
          latitude: reportWithTask.location?.latitude || reportWithTask.latitude || 0,
          longitude: reportWithTask.location?.longitude || reportWithTask.longitude || 0,
          created_at: reportWithTask.created_at,
          updated_at: reportWithTask.updated_at || reportWithTask.created_at,
          media: reportWithTask.media || [],
          user: {
            id: reportWithTask.user?.id || 0,
            full_name: reportWithTask.user?.full_name || 'Unknown',
            phone: reportWithTask.user?.phone || '',
          },
          department: reportWithTask.department,
        },
      };
      
      setTask(taskData);
      
      // Try to fetch report history/timeline
      try {
        const historyData = await apiClient.get<any>(`/reports/${taskId}/history`);
        setUpdates(historyData.history || []);
      } catch (updErr) {
        console.log('Task history not available:', updErr);
        setUpdates([]);
      }
    } catch (err: any) {
      console.error('Failed to load task:', err);
      setError(err.message || 'Failed to load task details');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenMap = useCallback(() => {
    if (!task) return;
    const url = `https://www.google.com/maps?q=${task.report.latitude},${task.report.longitude}`;
    Linking.openURL(url);
  }, [task]);

  const handleCallCitizen = useCallback(() => {
    if (!task?.report.user.phone) return;
    Linking.openURL(`tel:${task.report.user.phone}`);
  }, [task]);

  // Task Actions
  const handleAcknowledge = useCallback(async () => {
    if (!task) return;
    
    Alert.alert(
      'Acknowledge Task',
      `You are about to acknowledge this task. The citizen will be notified that you have received their report.\n\nReport: ${task.report.report_number}\n\nAre you sure you want to proceed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Acknowledgment',
          style: 'default',
          onPress: async () => {
            try {
              setActionLoading(true);
              await apiClient.post(`/reports/${task.report_id}/acknowledge`, {});
              await loadTask();
              Alert.alert('Success', 'Task acknowledged successfully. Citizen has been notified.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to acknowledge task');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  }, [task]);

  const handleStartWork = useCallback(async () => {
    if (!task) return;
    
    Alert.alert(
      'Start Work on This Task?',
      `You are about to start work on this task. The work timer will begin and the citizen will be notified.\n\nMake sure you are at the location before proceeding.\n\nReport: ${task.report.report_number}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Work',
          style: 'default',
          onPress: async () => {
            try {
              setActionLoading(true);
              await apiClient.post(`/reports/${task.report_id}/start-work`, {});
              await loadTask();
              Alert.alert('Success', 'Work started successfully. Timer has begun.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to start work');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  }, [task]);

  const navigation = useNavigation<NativeStackNavigationProp<TasksStackParamList>>();

  const handleComplete = useCallback(() => {
    if (!task) return;
    
    navigation.navigate('SubmitVerification', {
      reportId: task.report_id,
      reportNumber: task.report?.report_number || `CL-${task.report_id}`,
      title: task.report?.title || 'Report',
    });
  }, [navigation, task]);

  const handleSubmitCompletion = useCallback(async () => {
    if (!task || !updateNotes.trim()) {
      Alert.alert('Required', 'Please provide resolution notes describing the work completed');
      return;
    }

    if (updateNotes.trim().length < 20) {
      Alert.alert('Invalid Notes', 'Resolution notes must be at least 20 characters long');
      return;
    }

    Alert.alert(
      'Submit for Verification',
      'Are you sure you want to mark this task as complete? The work will be submitted for verification.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          style: 'default',
          onPress: async () => {
            try {
              setActionLoading(true);
              await apiClient.post(`/reports/${task.report_id}/resolve`, {
                resolution_notes: updateNotes.trim(),
                status: 'pending_verification',
              });
              setShowUpdateModal(false);
              setUpdateNotes('');
              await loadTask();
              Alert.alert('Success', 'Task submitted for verification successfully');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to complete task');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  }, [task, updateNotes]);

  const handleAddUpdate = useCallback(() => {
    setShowUpdateModal(true);
  }, []);

  const handleSubmitUpdate = useCallback(async () => {
    if (!task || !updateNotes.trim()) {
      Alert.alert('Required', 'Please provide update notes');
      return;
    }

    if (updateNotes.trim().length < 10) {
      Alert.alert('Invalid Notes', 'Update notes must be at least 10 characters long');
      return;
    }

    try {
      setActionLoading(true);
      
      // Send as FormData to match backend endpoint
      const formData = new FormData();
      formData.append('update_text', updateNotes.trim());
      
      await apiClient.post(`/reports/${task.report_id}/add-update`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      setShowUpdateModal(false);
      setUpdateNotes('');
      await loadTask();
      Alert.alert('Success', 'Progress update added successfully. Citizen has been notified.');
    } catch (err: any) {
      console.error('Failed to add progress update:', err);
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to add update';
      Alert.alert('Error', errorMsg);
    } finally {
      setActionLoading(false);
    }
  }, [task, updateNotes]);

  const handleReject = useCallback(() => {
    if (!task) return;
    
    Alert.alert(
      'Reject Assignment',
      `Are you sure you want to reject this assignment?\n\nReport: ${task.report.report_number}\n\nThis assignment will be sent to admin for review. They may reassign it to another officer or reclassify the report.\n\nPlease provide a reason for rejection.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Proceed to Reject',
          style: 'destructive',
          onPress: () => setShowRejectModal(true),
        },
      ]
    );
  }, [task]);

  const handleSubmitRejection = useCallback(async () => {
    if (!task || !rejectionReason.trim()) {
      Alert.alert('Required', 'Please provide a rejection reason (minimum 10 characters)');
      return;
    }

    if (rejectionReason.trim().length < 10) {
      Alert.alert('Invalid Reason', 'Rejection reason must be at least 10 characters long');
      return;
    }

    try {
      setActionLoading(true);
      await apiClient.post(`/reports/${task.report_id}/reject-assignment`, {
        rejection_reason: rejectionReason.trim(),
      });
      setShowRejectModal(false);
      setRejectionReason('');
      await loadTask();
      Alert.alert('Success', 'Assignment rejected successfully. Admin will review your request.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to reject assignment');
    } finally {
      setActionLoading(false);
    }
  }, [task, rejectionReason]);

  const handlePutOnHold = useCallback(() => {
    setShowHoldModal(true);
  }, []);

  const handleSubmitHold = useCallback(async () => {
    if (!task || !holdReason) {
      Alert.alert('Required', 'Please select a reason for putting this task on hold');
      return;
    }

    if (holdReason === 'other' && !customHoldReason.trim()) {
      Alert.alert('Required', 'Please provide a custom reason');
      return;
    }

    try {
      setActionLoading(true);
      const reason = holdReason === 'other' ? customHoldReason.trim() : holdReason;
      
      // Validate reason length
      if (reason.length < 10) {
        Alert.alert('Invalid Input', 'Reason must be at least 10 characters long');
        setActionLoading(false);
        return;
      }
      
      const formData = new FormData();
      formData.append('reason', reason);
      if (estimatedResumeDate) {
        // Format date as YYYY-MM-DD
        const formattedDate = format(estimatedResumeDate, 'yyyy-MM-dd');
        formData.append('estimated_resume_date', formattedDate);
      }

      await apiClient.post(`/reports/${task.report_id}/on-hold`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setShowHoldModal(false);
      setHoldReason('');
      setCustomHoldReason('');
      setEstimatedResumeDate(undefined);
      await loadTask();
      Alert.alert('Success', 'Task put on hold successfully. You can resume work when ready.');
    } catch (err: any) {
      console.error('Failed to put task on hold:', err);
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to put task on hold';
      Alert.alert('Error', errorMsg);
    } finally {
      setActionLoading(false);
    }
  }, [task, holdReason, customHoldReason, estimatedResumeDate]);

  const handleResumeWork = useCallback(() => {
    if (!task) return;
    
    setShowResumeModal(true);
  }, [task]);

  const handleSubmitResume = useCallback(async () => {
    if (!task) return;

    try {
      setActionLoading(true);
      await apiClient.post(`/reports/${task.report_id}/resume-work`, {});
      setShowResumeModal(false);
      await loadTask();
      Alert.alert('Success', 'Work resumed successfully. You can continue working on this task.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to resume work');
    } finally {
      setActionLoading(false);
    }
  }, [task]);

  // Permission checks - matching backend TaskStatus enum
  const taskStatus = task?.status?.toLowerCase() || '';
  const canAcknowledge = taskStatus === 'assigned'; // Backend uses TaskStatus.ASSIGNED
  const canStartWork = taskStatus === 'acknowledged';
  const canComplete = taskStatus === 'in_progress';
  const canAddUpdate = ['acknowledged', 'in_progress'].includes(taskStatus);
  const canReject = taskStatus === 'assigned'; // Only when first assigned (TaskStatus.ASSIGNED)
  const isOnHold = taskStatus === 'on_hold';

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <TopNavbar title="Task Details" showBack={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976D2" />
          <Text style={styles.loadingText}>Loading task...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error || !task) {
    return (
      <View style={styles.container}>
        <TopNavbar title="Task Details" showBack={true} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#F44336" />
          <Text style={styles.errorTitle}>Failed to Load</Text>
          <Text style={styles.errorText}>{error || 'Task not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadTask}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TopNavbar
        title={`Task #${task.id}`}
        showBack={true}
        rightActions={
          <TouchableOpacity style={styles.headerButton} onPress={handleCallCitizen}>
            <Ionicons name="call-outline" size={24} color="#FFF" />
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Photo Gallery */}
        {task.report.media && task.report.media.length > 0 ? (
          <View style={styles.gallerySection}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / width);
                setSelectedImageIndex(index);
              }}
            >
              {task.report.media.map((media, index) => (
                <View key={`media-${media.id}-${index}`} style={styles.imageContainer}>
                  <Image
                    source={{ uri: getMediaUrl(media.file_url) }}
                    style={styles.galleryImage}
                    resizeMode="cover"
                  />
                  {media.upload_source && (
                    <View style={styles.imageTag}>
                      <View
                        style={[
                          styles.imageTagBadge,
                          {
                            backgroundColor:
                              media.upload_source === 'citizen_submission'
                                ? '#2196F3'
                                : media.upload_source === 'officer_before_photo'
                                ? '#FF9800'
                                : '#4CAF50',
                          },
                        ]}
                      >
                        <Text style={styles.imageTagText}>
                          {media.upload_source === 'citizen_submission'
                            ? 'Reported'
                            : media.upload_source === 'officer_before_photo'
                            ? 'Before Work'
                            : 'After Work'}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
            <View style={styles.galleryIndicator}>
              <Text style={styles.galleryCounter}>
                {selectedImageIndex + 1} / {task.report.media.length}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.noImagePlaceholder}>
            <Ionicons name="image-outline" size={48} color="#CBD5E1" />
            <Text style={styles.noImageText}>No images attached</Text>
          </View>
        )}

        {/* Task Status Banner */}
        <View style={styles.statusBanner}>
          <LinearGradient
            colors={[`${getStatusColor(task.status)}20`, `${getStatusColor(task.status)}10`]}
            style={styles.statusBannerGradient}
          >
            <View style={styles.statusBannerContent}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(task.status) }]} />
              <Text style={[styles.statusBannerText, { color: getStatusColor(task.status) }]}>
                {formatStatus(task.status)}
              </Text>
            </View>
            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.severityBadge,
                  { backgroundColor: getSeverityColor(task.report.severity) },
                ]}
              >
                <Text style={styles.severityText}>{task.report.severity.toUpperCase()}</Text>
              </View>
              <View
                style={[
                  styles.priorityBadge,
                  { backgroundColor: getPriorityColor(task.priority) },
                ]}
              >
                <Text style={styles.priorityText}>{getPriorityLabel(task.priority)}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* SLA Warning */}
        {task.sla_violated > 0 && (
          <View style={[styles.slaWarning, { backgroundColor: task.sla_violated === 2 ? '#FFEBEE' : '#FFF3E0' }]}>
            <Ionicons
              name="warning"
              size={20}
              color={task.sla_violated === 2 ? '#F44336' : '#FF9800'}
            />
            <Text style={[styles.slaWarningText, { color: task.sla_violated === 2 ? '#F44336' : '#FF9800' }]}>
              {task.sla_violated === 2 ? 'SLA Violated!' : 'SLA Warning - Action Required'}
            </Text>
          </View>
        )}

        {/* Report Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Report Details</Text>
          <Text style={styles.title}>{task.report.title}</Text>
          <Text style={styles.description}>{task.report.description}</Text>

          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Ionicons name="document-text" size={20} color="#64748B" />
              <View style={styles.metaContent}>
                <Text style={styles.metaLabel}>Report Number</Text>
                <Text style={styles.metaValue}>#{task.report.report_number}</Text>
              </View>
            </View>

            <View style={styles.metaItem}>
              <Ionicons name="pricetag" size={20} color="#64748B" />
              <View style={styles.metaContent}>
                <Text style={styles.metaLabel}>Category</Text>
                <Text style={styles.metaValue}>{task.report.category.replace(/_/g, ' ')}</Text>
              </View>
            </View>

            <View style={styles.metaItem}>
              <Ionicons name="person" size={20} color="#64748B" />
              <View style={styles.metaContent}>
                <Text style={styles.metaLabel}>Reported By</Text>
                <Text style={styles.metaValue}>{task.report.user.full_name}</Text>
              </View>
            </View>

            <View style={styles.metaItem}>
              <Ionicons name="time" size={20} color="#64748B" />
              <View style={styles.metaContent}>
                <Text style={styles.metaLabel}>Submitted</Text>
                <Text style={styles.metaValue}>{formatDate(task.report.created_at)}</Text>
              </View>
            </View>

            {task.report.department && (
              <View style={styles.metaItem}>
                <Ionicons name="business" size={20} color="#64748B" />
                <View style={styles.metaContent}>
                  <Text style={styles.metaLabel}>Department</Text>
                  <Text style={styles.metaValue}>{task.report.department.name}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Task Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Task Information</Text>
          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar" size={20} color="#64748B" />
              <View style={styles.metaContent}>
                <Text style={styles.metaLabel}>Assigned</Text>
                <Text style={styles.metaValue}>{safeFormatDistanceToNow(task.assigned_at)}</Text>
              </View>
            </View>

            {task.acknowledged_at && (
              <View style={styles.metaItem}>
                <Ionicons name="checkmark-circle" size={20} color="#64748B" />
                <View style={styles.metaContent}>
                  <Text style={styles.metaLabel}>Acknowledged</Text>
                  <Text style={styles.metaValue}>{safeFormatDistanceToNow(task.acknowledged_at)}</Text>
                </View>
              </View>
            )}

            {task.started_at && (
              <View style={styles.metaItem}>
                <Ionicons name="play-circle" size={20} color="#64748B" />
                <View style={styles.metaContent}>
                  <Text style={styles.metaLabel}>Started</Text>
                  <Text style={styles.metaValue}>{safeFormatDistanceToNow(task.started_at)}</Text>
                </View>
              </View>
            )}

            {task.sla_deadline && (
              <View style={styles.metaItem}>
                <Ionicons name="alarm" size={20} color="#64748B" />
                <View style={styles.metaContent}>
                  <Text style={styles.metaLabel}>SLA Deadline</Text>
                  <Text style={styles.metaValue}>{formatDate(task.sla_deadline)}</Text>
                </View>
              </View>
            )}
          </View>

          {task.notes && (
            <View style={styles.notesCard}>
              <Text style={styles.notesLabel}>Task Notes:</Text>
              <Text style={styles.notesText}>{task.notes}</Text>
            </View>
          )}

          {task.resolution_notes && (
            <View style={styles.notesCard}>
              <Text style={styles.notesLabel}>Resolution Notes:</Text>
              <Text style={styles.notesText}>{task.resolution_notes}</Text>
            </View>
          )}

          {task.rejection_reason && (
            <View style={[styles.notesCard, { backgroundColor: '#FFEBEE' }]}>
              <Text style={[styles.notesLabel, { color: '#F44336' }]}>Rejection Reason:</Text>
              <Text style={[styles.notesText, { color: '#F44336' }]}>{task.rejection_reason}</Text>
            </View>
          )}
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <View style={styles.locationCard}>
            <View style={styles.locationInfo}>
              <Ionicons name="location" size={24} color="#1976D2" />
              <View style={styles.locationText}>
                <Text style={styles.locationAddress}>{task.report.address}</Text>
                {task.report.landmark && (
                  <Text style={styles.locationLandmark}>Near: {task.report.landmark}</Text>
                )}
                <Text style={styles.locationCoords}>
                  {task.report.latitude.toFixed(6)}, {task.report.longitude.toFixed(6)}
                </Text>
              </View>
            </View>
          </View>
          
          <TouchableOpacity style={styles.openMapsButton} onPress={handleOpenMap}>
            <Ionicons name="navigate" size={20} color="#FFF" />
            <Text style={styles.openMapsButtonText}>Open in Maps</Text>
          </TouchableOpacity>
        </View>

        {/* Status History Timeline - Collapsible */}
        {updates.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity 
              style={styles.collapsibleHeader}
              onPress={() => setIsHistoryExpanded(!isHistoryExpanded)}
              activeOpacity={0.7}
            >
              <View style={styles.collapsibleHeaderContent}>
                <Ionicons name="time-outline" size={20} color="#1976D2" />
                <Text style={styles.sectionTitle}>Status History</Text>
                <View style={styles.historyBadge}>
                  <Text style={styles.historyBadgeText}>{updates.length}</Text>
                </View>
              </View>
              <Ionicons 
                name={isHistoryExpanded ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="#64748B" 
              />
            </TouchableOpacity>
            
            {isHistoryExpanded && (
              <View style={styles.timeline}>
                {updates.map((historyItem: any, index: number) => (
                  <View key={`history-${historyItem.id || index}`} style={styles.timelineItem}>
                    <View style={styles.timelineLeft}>
                      <View style={[styles.timelineDot, { backgroundColor: getStatusColor(historyItem.new_status || 'pending') }]} />
                      {index < updates.length - 1 && <View style={styles.timelineLine} />}
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineStatus}>
                        {formatStatus(historyItem.new_status || 'Status Update')}
                      </Text>
                      {historyItem.changed_by_user && (
                        <Text style={styles.timelineUser}>
                          by {historyItem.changed_by_user.full_name}
                        </Text>
                      )}
                      <Text style={styles.timelineDate}>
                        {formatDate(historyItem.changed_at || historyItem.created_at)}
                      </Text>
                      {historyItem.notes && (
                        <Text style={styles.timelineNotes}>{historyItem.notes}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          {canAcknowledge && (
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonPrimary]}
              onPress={handleAcknowledge}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                  <Text style={styles.actionButtonText}>Acknowledge Task</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {canStartWork && (
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonSuccess]}
              onPress={handleStartWork}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="play-circle" size={20} color="#FFF" />
                  <Text style={styles.actionButtonText}>Start Work</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {canComplete && (
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonSuccess]}
              onPress={handleComplete}
              disabled={actionLoading}
            >
              <Ionicons name="checkmark-circle" size={20} color="#FFF" />
              <Text style={styles.actionButtonText}>Submit for Verification</Text>
            </TouchableOpacity>
          )}

          {canAddUpdate && (
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonOutline]}
              onPress={handleAddUpdate}
              disabled={actionLoading}
            >
              <Ionicons name="add-circle-outline" size={20} color="#1976D2" />
              <Text style={styles.actionButtonTextOutline}>Add Progress Update</Text>
            </TouchableOpacity>
          )}

          {canComplete && (
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonWarning]}
              onPress={handlePutOnHold}
              disabled={actionLoading}
            >
              <Ionicons name="pause-circle-outline" size={20} color="#F59E0B" />
              <Text style={styles.actionButtonTextWarning}>Put On Hold</Text>
            </TouchableOpacity>
          )}

          {canReject && (
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonDanger]}
              onPress={handleReject}
              disabled={actionLoading}
            >
              <Ionicons name="close-circle" size={20} color="#F44336" />
              <Text style={styles.actionButtonTextDanger}>Reject Assignment</Text>
            </TouchableOpacity>
          )}

          {isOnHold && (
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonSuccess]}
              onPress={handleResumeWork}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="play" size={20} color="#FFF" />
                  <Text style={styles.actionButtonText}>Resume Work</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {!canAcknowledge && !canStartWork && !canComplete && !isOnHold && !canReject && (
            <View style={styles.noActionsContainer}>
              <Text style={styles.noActionsText}>No actions available for this task</Text>
            </View>
          )}
        </View>

        {/* Bottom Padding to prevent navbar overlap */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Update Modal */}
      <Modal
        visible={showUpdateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowUpdateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Progress Update</Text>
              <TouchableOpacity onPress={() => setShowUpdateModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter progress update (10-1000 characters)..."
              value={updateNotes}
              onChangeText={setUpdateNotes}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={1000}
            />
            <Text style={[
              styles.modalHelperText,
              updateNotes.length < 10 && styles.helperTextWarning,
              updateNotes.length >= 10 && styles.helperTextSuccess
            ]}>
              {updateNotes.length}/1000 characters {updateNotes.length < 10 ? '(minimum 10 required)' : '✓'}
            </Text>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonPrimary]}
              onPress={handleSubmitUpdate}
              disabled={actionLoading || updateNotes.trim().length < 10}
            >
              {actionLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.modalButtonText}>Submit</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Reject Modal */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reject Assignment</Text>
              <TouchableOpacity onPress={() => setShowRejectModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalWarning}>
              <Ionicons name="warning" size={20} color="#F59E0B" />
              <Text style={styles.modalWarningText}>
                This assignment will be sent to admin for review. They may reassign it to another officer.
              </Text>
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder="Provide a detailed reason for rejection (min 10 characters)..."
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            <Text style={styles.modalHelperText}>
              {rejectionReason.length}/10 characters minimum
            </Text>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonDanger]}
              onPress={handleSubmitRejection}
              disabled={actionLoading || rejectionReason.trim().length < 10}
            >
              {actionLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.modalButtonText}>Reject Assignment</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Put On Hold Modal */}
      <Modal
        visible={showHoldModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowHoldModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Put Task On Hold</Text>
              <TouchableOpacity onPress={() => setShowHoldModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            
            {task && (
              <View style={styles.modalInfo}>
                <Text style={styles.modalInfoText}>Report: {task.report.report_number}</Text>
              </View>
            )}

            <Text style={styles.modalLabel}>Reason for Hold *</Text>
            <View style={styles.radioGroup}>
              {[
                { value: 'Awaiting materials/equipment', label: 'Awaiting materials/equipment' },
                { value: 'Awaiting approval from higher authority', label: 'Awaiting approval from higher authority' },
                { value: 'Unfavorable weather conditions', label: 'Unfavorable weather conditions' },
                { value: 'Waiting for third-party action', label: 'Waiting for third-party action' },
                { value: 'Awaiting budget approval', label: 'Awaiting budget approval' },
                { value: 'other', label: 'Other reason' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={styles.radioOption}
                  onPress={() => setHoldReason(option.value)}
                >
                  <View style={styles.radioCircle}>
                    {holdReason === option.value && <View style={styles.radioSelected} />}
                  </View>
                  <Text style={styles.radioLabel}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {holdReason === 'other' && (
              <TextInput
                style={styles.modalInput}
                placeholder="Please specify the reason (minimum 10 characters)..."
                value={customHoldReason}
                onChangeText={setCustomHoldReason}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            )}

            <Text style={styles.modalLabel}>Estimated Resume Date (Optional)</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color="#1976D2" />
              <Text style={styles.datePickerButtonText}>
                {estimatedResumeDate 
                  ? format(estimatedResumeDate, 'PPP') // e.g., "Dec 31, 2025"
                  : 'Select date (optional)'}
              </Text>
              {estimatedResumeDate && (
                <TouchableOpacity
                  style={styles.dateClearButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    setEstimatedResumeDate(undefined);
                  }}
                >
                  <Ionicons name="close-circle" size={20} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
            <Text style={styles.modalHelperText}>
              When do you expect to resume work on this task?
            </Text>

            {showDatePicker && (
              <DateTimePicker
                value={estimatedResumeDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()} // Can't select past dates
                onChange={(event, selectedDate) => {
                  setShowDatePicker(Platform.OS === 'ios'); // Keep open on iOS
                  if (event.type === 'set' && selectedDate) {
                    setEstimatedResumeDate(selectedDate);
                    if (Platform.OS === 'android') {
                      setShowDatePicker(false);
                    }
                  } else if (event.type === 'dismissed') {
                    setShowDatePicker(false);
                  }
                }}
              />
            )}

            <View style={styles.modalWarning}>
              <Ionicons name="information-circle" size={20} color="#3B82F6" />
              <Text style={styles.modalWarningText}>
                Note: The task will be marked as ON_HOLD. You can resume work when ready.
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalActionButton, styles.modalButtonOutline]}
                onPress={() => setShowHoldModal(false)}
                disabled={actionLoading}
              >
                <Text style={styles.modalButtonTextOutline}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalActionButton, styles.modalButtonWarning]}
                onPress={handleSubmitHold}
                disabled={actionLoading || !holdReason || (holdReason === 'other' && !customHoldReason.trim())}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.modalButtonText}>Put On Hold</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Resume Work Modal */}
      <Modal
        visible={showResumeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowResumeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Resume Work</Text>
            <Text style={styles.modalSubtitle}>
              You are about to resume work on this task.
            </Text>

            <View style={styles.modalInfoSection}>
              <Ionicons name="document-text" size={20} color="#1976D2" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.modalInfoText}>
                  Report: {task?.report.report_number}
                </Text>
                <Text style={styles.modalInfoText}>
                  {task?.report.title}
                </Text>
              </View>
            </View>

            <View style={styles.modalWarning}>
              <Ionicons name="information-circle" size={20} color="#3B82F6" />
              <Text style={styles.modalWarningText}>
                The task status will change to IN_PROGRESS. The citizen will be notified that work has resumed.
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalActionButton, styles.modalButtonOutline]}
                onPress={() => setShowResumeModal(false)}
                disabled={actionLoading}
              >
                <Text style={styles.modalButtonTextOutline}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalActionButton, styles.modalButtonPrimary]}
                onPress={handleSubmitResume}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.modalButtonText}>Resume Work</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};
