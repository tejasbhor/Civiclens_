/**
 * Offline Submission Status Component - Production Ready
 * Shows queue status and provides user feedback for offline submissions
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { submissionQueue, QueueStatus, QueueItem } from '@shared/services/queue/submissionQueue';
import { useNetwork } from '@shared/hooks/useNetwork';

export const OfflineSubmissionStatus: React.FC = () => {
  const [queueStatus, setQueueStatus] = useState<QueueStatus>({ 
    pending: 0, processing: 0, completed: 0, failed: 0, total: 0 
  });
  const [showDetails, setShowDetails] = useState(false);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const { isOnline } = useNetwork();

  useEffect(() => {
    // Initial status
    setQueueStatus(submissionQueue.getQueueStatus());

    // Listen for status changes
    const handleStatusChange = (status: QueueStatus) => {
      setQueueStatus(status);
    };

    submissionQueue.addListener(handleStatusChange);

    return () => {
      submissionQueue.removeListener(handleStatusChange);
    };
  }, []);

  const loadQueueDetails = () => {
    setQueueItems(submissionQueue.getQueueItems());
    setShowDetails(true);
  };

  const handleRetryFailed = () => {
    Alert.alert(
      'Retry Failed Submissions',
      'This will retry all failed report submissions. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Retry',
          style: 'default',
          onPress: () => submissionQueue.retryFailedItems(),
        },
      ]
    );
  };

  const handleClearCompleted = () => {
    Alert.alert(
      'Clear Completed',
      'This will remove all completed submissions from the queue. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => submissionQueue.clearCompleted(),
        },
      ]
    );
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return isOnline ? 'cloud-upload' : 'cloud-offline';
      case 'processing':
        return 'sync';
      case 'completed':
        return 'checkmark-circle';
      case 'failed':
        return 'alert-circle';
      default:
        return 'help-circle';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return isOnline ? '#4CAF50' : '#FF9800';
      case 'processing':
        return '#2196F3';
      case 'completed':
        return '#4CAF50';
      case 'failed':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  // Don't show if no items in queue
  if (queueStatus.total === 0) {
    return null;
  }

  return (
    <>
      <View style={styles.container}>
        <LinearGradient
          colors={['rgba(25, 118, 210, 0.1)', 'rgba(25, 118, 210, 0.05)']}
          style={styles.statusCard}
        >
          {/* Pending submissions */}
          {queueStatus.pending > 0 && (
            <TouchableOpacity 
              style={styles.statusItem}
              onPress={loadQueueDetails}
              activeOpacity={0.7}
            >
              <View style={styles.statusLeft}>
                <Ionicons 
                  name={isOnline ? "cloud-upload" : "cloud-offline"} 
                  size={20} 
                  color={isOnline ? "#4CAF50" : "#FF9800"} 
                />
                <Text style={styles.statusText}>
                  {queueStatus.pending} report{queueStatus.pending > 1 ? 's' : ''} 
                  {isOnline ? ' syncing...' : ' waiting for connection'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#64748B" />
            </TouchableOpacity>
          )}

          {/* Processing */}
          {queueStatus.processing > 0 && (
            <View style={styles.statusItem}>
              <View style={styles.statusLeft}>
                <ActivityIndicator size="small" color="#4CAF50" />
                <Text style={styles.statusText}>
                  Submitting {queueStatus.processing} report{queueStatus.processing > 1 ? 's' : ''}...
                </Text>
              </View>
            </View>
          )}

          {/* Failed submissions */}
          {queueStatus.failed > 0 && (
            <TouchableOpacity 
              style={[styles.statusItem, styles.errorItem]}
              onPress={loadQueueDetails}
              activeOpacity={0.7}
            >
              <View style={styles.statusLeft}>
                <Ionicons name="alert-circle" size={20} color="#F44336" />
                <Text style={[styles.statusText, styles.errorText]}>
                  {queueStatus.failed} report{queueStatus.failed > 1 ? 's' : ''} failed. Tap to retry.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#F44336" />
            </TouchableOpacity>
          )}

          {/* Completed (show briefly) */}
          {queueStatus.completed > 0 && queueStatus.pending === 0 && queueStatus.processing === 0 && (
            <View style={styles.statusItem}>
              <View style={styles.statusLeft}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.statusText}>
                  {queueStatus.completed} report{queueStatus.completed > 1 ? 's' : ''} submitted successfully
                </Text>
              </View>
            </View>
          )}
        </LinearGradient>
      </View>

      {/* Queue Details Modal */}
      <Modal
        visible={showDetails}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetails(false)}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Submission Queue</Text>
            <TouchableOpacity 
              onPress={() => setShowDetails(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Status Summary */}
          <View style={styles.summaryContainer}>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>{queueStatus.pending}</Text>
                <Text style={styles.summaryLabel}>Pending</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>{queueStatus.processing}</Text>
                <Text style={styles.summaryLabel}>Processing</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>{queueStatus.completed}</Text>
                <Text style={styles.summaryLabel}>Completed</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNumber, { color: '#F44336' }]}>{queueStatus.failed}</Text>
                <Text style={styles.summaryLabel}>Failed</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              {queueStatus.failed > 0 && (
                <TouchableOpacity 
                  style={styles.retryButton}
                  onPress={handleRetryFailed}
                >
                  <Ionicons name="refresh" size={16} color="#FFF" />
                  <Text style={styles.buttonText}>Retry Failed</Text>
                </TouchableOpacity>
              )}
              
              {queueStatus.completed > 0 && (
                <TouchableOpacity 
                  style={styles.clearButton}
                  onPress={handleClearCompleted}
                >
                  <Ionicons name="trash" size={16} color="#64748B" />
                  <Text style={styles.clearButtonText}>Clear Completed</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Queue Items List */}
          <ScrollView style={styles.itemsList} showsVerticalScrollIndicator={false}>
            {queueItems.map((item) => (
              <View key={item.id} style={styles.queueItem}>
                <View style={styles.itemHeader}>
                  <View style={styles.itemLeft}>
                    <Ionicons 
                      name={getStatusIcon(item.status)} 
                      size={20} 
                      color={getStatusColor(item.status)} 
                    />
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {item.data.title}
                    </Text>
                  </View>
                  <Text style={styles.itemTime}>
                    {formatTimestamp(item.timestamp)}
                  </Text>
                </View>

                <Text style={styles.itemDescription} numberOfLines={2}>
                  {item.data.description}
                </Text>

                <View style={styles.itemFooter}>
                  <View style={styles.itemMeta}>
                    <Text style={styles.metaText}>
                      {item.data.category} • {item.data.severity}
                    </Text>
                    <Text style={styles.metaText}>
                      {item.data.compressedPhotos?.length || 0} photo{(item.data.compressedPhotos?.length || 0) !== 1 ? 's' : ''}
                    </Text>
                  </View>

                  {item.status === 'failed' && item.error && (
                    <Text style={styles.errorMessage} numberOfLines={1}>
                      Error: {item.error}
                    </Text>
                  )}

                  {item.retryCount > 0 && (
                    <Text style={styles.retryText}>
                      Retry {item.retryCount}/{item.maxRetries}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  statusCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(25, 118, 210, 0.2)',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
    flex: 1,
  },
  errorItem: {
    backgroundColor: 'rgba(244, 67, 54, 0.05)',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginVertical: 4,
  },
  errorText: {
    color: '#D32F2F',
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },

  // Summary styles
  summaryContainer: {
    backgroundColor: '#FFF',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1976D2',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1976D2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },

  // Queue items list
  itemsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  queueItem: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  itemTime: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  itemDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 12,
  },
  itemFooter: {
    gap: 6,
  },
  itemMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  errorMessage: {
    fontSize: 12,
    color: '#F44336',
    fontStyle: 'italic',
  },
  retryText: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '500',
  },
});
