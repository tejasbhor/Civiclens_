/**
 * Submission Status Bar Component
 * 
 * Provides real-time feedback about report submission status:
 * - Shows queued submissions count
 * - Displays current upload progress
 * - Network status indicator
 * - Retry and cancel actions
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import NetInfo from '@react-native-netinfo/netinfo';

import {
  offlineReportService,
  SubmissionStatus,
  SubmissionProgress,
  QueuedSubmission,
} from '@services/offline/OfflineReportService';
import { createLogger } from '@shared/utils/logger';

const log = createLogger('SubmissionStatusBar');

interface Props {
  style?: any;
}

export const SubmissionStatusBar: React.FC<Props> = ({ style }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [queueStats, setQueueStats] = useState(offlineReportService.getQueueStats());
  const [currentProgress, setCurrentProgress] = useState<SubmissionProgress | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [submissions, setSubmissions] = useState<QueuedSubmission[]>([]);
  const [progressAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Network monitoring
    const unsubscribeNetInfo = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected === true);
    });

    // Submission progress monitoring
    const handleProgress = (progress: SubmissionProgress) => {
      setCurrentProgress(progress);
      
      // Animate progress bar
      Animated.timing(progressAnim, {
        toValue: progress.progress / 100,
        duration: 300,
        useNativeDriver: false,
      }).start();
      
      // Clear progress after completion
      if (progress.status === SubmissionStatus.COMPLETED) {
        setTimeout(() => {
          setCurrentProgress(null);
          progressAnim.setValue(0);
        }, 2000);
      }
    };

    const handleQueueUpdate = () => {
      setQueueStats(offlineReportService.getQueueStats());
      setSubmissions(offlineReportService.getQueuedSubmissions());
    };

    // Subscribe to events
    offlineReportService.on('submissionProgress', handleProgress);
    offlineReportService.on('submissionQueued', handleQueueUpdate);
    
    // Initial load
    handleQueueUpdate();

    // Periodic updates
    const interval = setInterval(handleQueueUpdate, 5000);

    return () => {
      unsubscribeNetInfo();
      offlineReportService.off('submissionProgress', handleProgress);
      offlineReportService.off('submissionQueued', handleQueueUpdate);
      clearInterval(interval);
    };
  }, [progressAnim]);

  const handleRetrySubmission = (id: string) => {
    Alert.alert(
      'Retry Submission',
      'Do you want to retry this submission?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Retry',
          onPress: async () => {
            const success = await offlineReportService.retrySubmission(id);
            if (success) {
              log.info(`Retrying submission: ${id}`);
            }
          },
        },
      ]
    );
  };

  const handleCancelSubmission = (id: string) => {
    Alert.alert(
      'Cancel Submission',
      'Are you sure you want to cancel this submission?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            const success = await offlineReportService.cancelSubmission(id);
            if (success) {
              log.info(`Cancelled submission: ${id}`);
            }
          },
        },
      ]
    );
  };

  const handleForceSync = async () => {
    log.info('User initiated force sync');
    await offlineReportService.forcSync();
  };

  const handleClearCompleted = async () => {
    const count = await offlineReportService.clearCompleted();
    if (count > 0) {
      Alert.alert('Success', `Cleared ${count} completed submissions`);
    }
  };

  const renderSubmissionItem = ({ item }: { item: QueuedSubmission }) => (
    <View style={styles.submissionItem}>
      <View style={styles.submissionHeader}>
        <Text style={styles.submissionTitle} numberOfLines={1}>
          {item.reportData.title}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
        </View>
      </View>
      
      <Text style={styles.submissionMeta}>
        {formatDate(item.createdAt)} • {item.mediaFiles.length} files • {formatSize(item.estimatedSize)}
      </Text>
      
      {item.status === SubmissionStatus.RETRYING && item.nextRetryAt && (
        <Text style={styles.retryInfo}>
          Next retry: {formatDate(item.nextRetryAt)}
        </Text>
      )}
      
      {item.errorMessage && (
        <Text style={styles.errorText} numberOfLines={2}>
          {item.errorMessage}
        </Text>
      )}
      
      <View style={styles.submissionActions}>
        {item.status === SubmissionStatus.FAILED && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleRetrySubmission(item.id)}
          >
            <Ionicons name="refresh" size={16} color="#1976D2" />
            <Text style={styles.actionButtonText}>Retry</Text>
          </TouchableOpacity>
        )}
        
        {(item.status === SubmissionStatus.QUEUED || 
          item.status === SubmissionStatus.RETRYING ||
          item.status === SubmissionStatus.FAILED) && (
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={() => handleCancelSubmission(item.id)}
          >
            <Ionicons name="close" size={16} color="#F44336" />
            <Text style={[styles.actionButtonText, styles.cancelButtonText]}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // Don't show if no submissions
  if (queueStats.total === 0 && !currentProgress) {
    return null;
  }

  return (
    <>
      <View style={[styles.container, style]}>
        <TouchableOpacity
          style={styles.statusBar}
          onPress={() => setShowDetails(true)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={isOnline ? ['#4CAF50', '#45A049'] : ['#FF9800', '#F57C00']}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.statusContent}>
              <View style={styles.statusLeft}>
                <Ionicons
                  name={isOnline ? "cloud-upload" : "cloud-offline"}
                  size={20}
                  color="#FFF"
                />
                <Text style={styles.statusText}>
                  {currentProgress ? (
                    `${currentProgress.message} (${currentProgress.progress}%)`
                  ) : isOnline ? (
                    queueStats.queued > 0 || queueStats.retrying > 0
                      ? `${queueStats.queued + queueStats.retrying} pending`
                      : queueStats.failed > 0
                      ? `${queueStats.failed} failed`
                      : 'All synced'
                  ) : (
                    `${queueStats.total} queued (offline)`
                  )}
                </Text>
              </View>
              
              <View style={styles.statusRight}>
                {queueStats.total > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{queueStats.total}</Text>
                  </View>
                )}
                <Ionicons name="chevron-up" size={16} color="#FFF" />
              </View>
            </View>
            
            {currentProgress && (
              <View style={styles.progressContainer}>
                <Animated.View
                  style={[
                    styles.progressBar,
                    {
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Details Modal */}
      <Modal
        visible={showDetails}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Submission Queue</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowDetails(false)}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{queueStats.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{queueStats.queued + queueStats.uploading}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{queueStats.failed}</Text>
              <Text style={styles.statLabel}>Failed</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatSize(queueStats.totalSize)}</Text>
              <Text style={styles.statLabel}>Size</Text>
            </View>
          </View>
          
          <View style={styles.actionBar}>
            <TouchableOpacity style={styles.syncButton} onPress={handleForceSync}>
              <Ionicons name="refresh" size={18} color="#FFF" />
              <Text style={styles.syncButtonText}>Sync Now</Text>
            </TouchableOpacity>
            
            {queueStats.completed > 0 && (
              <TouchableOpacity style={styles.clearButton} onPress={handleClearCompleted}>
                <Ionicons name="trash" size={18} color="#666" />
                <Text style={styles.clearButtonText}>Clear Completed</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <FlatList
            data={submissions}
            renderItem={renderSubmissionItem}
            keyExtractor={(item) => item.id}
            style={styles.submissionsList}
            contentContainerStyle={styles.submissionsContent}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </Modal>
    </>
  );
};

// Helper functions
const getStatusColor = (status: SubmissionStatus): string => {
  const colors = {
    [SubmissionStatus.QUEUED]: '#2196F3',
    [SubmissionStatus.UPLOADING]: '#FF9800',
    [SubmissionStatus.RETRYING]: '#FFC107',
    [SubmissionStatus.FAILED]: '#F44336',
    [SubmissionStatus.COMPLETED]: '#4CAF50',
    [SubmissionStatus.CANCELLED]: '#9E9E9E',
  };
  return colors[status] || '#9E9E9E';
};

const getStatusLabel = (status: SubmissionStatus): string => {
  const labels = {
    [SubmissionStatus.QUEUED]: 'Queued',
    [SubmissionStatus.UPLOADING]: 'Uploading',
    [SubmissionStatus.RETRYING]: 'Retrying',
    [SubmissionStatus.FAILED]: 'Failed',
    [SubmissionStatus.COMPLETED]: 'Completed',
    [SubmissionStatus.CANCELLED]: 'Cancelled',
  };
  return labels[status] || 'Unknown';
};

const formatDate = (date: Date): string => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  statusBar: {
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  gradient: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  statusContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  statusRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 8,
  },
  countText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  progressContainer: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1.5,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FFF',
    borderRadius: 1.5,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  actionBar: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1976D2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 12,
  },
  syncButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  clearButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  submissionsList: {
    flex: 1,
  },
  submissionsContent: {
    padding: 16,
  },
  submissionItem: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  submissionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  submissionMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  retryInfo: {
    fontSize: 12,
    color: '#F59E0B',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginBottom: 12,
  },
  submissionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1976D2',
    marginLeft: 4,
  },
  cancelButton: {
    backgroundColor: '#FEF2F2',
  },
  cancelButtonText: {
    color: '#F44336',
  },
});
