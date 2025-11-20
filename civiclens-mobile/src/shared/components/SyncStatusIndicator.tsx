/**
 * SyncStatusIndicator Component
 * Displays sync status and queue information
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useSync } from '@shared/hooks/useSync';
import { colors } from '@shared/theme/colors';
import { typography } from '@shared/theme/typography';
import { spacing } from '@shared/theme/spacing';

interface SyncStatusIndicatorProps {
  showDetails?: boolean;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ 
  showDetails = false 
}) => {
  const { isSyncing, queueSize, lastSyncTime, errors, syncNow } = useSync();

  if (!showDetails && queueSize === 0 && !isSyncing) {
    return null;
  }

  const formatLastSyncTime = (timestamp: number | null): string => {
    if (!timestamp) return 'Never';
    
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <View style={styles.container}>
      {isSyncing ? (
        <View style={styles.syncingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.syncingText}>Syncing...</Text>
        </View>
      ) : queueSize > 0 ? (
        <TouchableOpacity style={styles.queueContainer} onPress={syncNow}>
          <Text style={styles.queueText}>
            📦 {queueSize} item{queueSize !== 1 ? 's' : ''} pending sync
          </Text>
          <Text style={styles.tapToSync}>Tap to sync now</Text>
        </TouchableOpacity>
      ) : null}

      {showDetails && (
        <View style={styles.detailsContainer}>
          <Text style={styles.detailText}>
            Last sync: {formatLastSyncTime(lastSyncTime)}
          </Text>
          {errors.length > 0 && (
            <View style={styles.errorsContainer}>
              <Text style={styles.errorTitle}>⚠️ Sync Errors:</Text>
              {errors.map((error, index) => (
                <Text key={index} style={styles.errorText}>
                  • {error}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99,
    elevation: 99,
  },
  syncingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary + '10',
  },
  syncingText: {
    ...typography.body,
    color: colors.primary,
    marginLeft: spacing.sm,
  },
  queueContainer: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.warning + '20',
  },
  queueText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  tapToSync: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  detailsContainer: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.textSecondary + '20',
  },
  detailText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  errorsContainer: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.error + '10',
    borderRadius: 4,
  },
  errorTitle: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
});
