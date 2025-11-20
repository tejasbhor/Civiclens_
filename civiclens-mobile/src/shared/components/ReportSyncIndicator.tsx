/**
 * ReportSyncIndicator Component
 * Displays sync status for offline reports and allows manual sync
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { reportSyncService } from '@shared/services/sync/reportSyncService';
import { useNetwork } from '@shared/hooks/useNetwork';
import { colors, spacing, typography } from '@shared/theme';

export const ReportSyncIndicator: React.FC = () => {
  const { isOnline } = useNetwork();
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    loadUnsyncedCount();

    // Refresh count every 10 seconds
    const interval = setInterval(loadUnsyncedCount, 10000);

    return () => clearInterval(interval);
  }, []);

  const loadUnsyncedCount = async () => {
    const count = await reportSyncService.getUnsyncedCount();
    setUnsyncedCount(count);
    setIsSyncing(reportSyncService.isSyncInProgress());
  };

  const handleManualSync = async () => {
    if (!isOnline) {
      return;
    }

    try {
      setIsSyncing(true);
      await reportSyncService.syncAllReports();
      await loadUnsyncedCount();
    } catch (error) {
      console.error('Manual sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  if (unsyncedCount === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons
          name={isOnline ? 'cloud-upload-outline' : 'cloud-offline-outline'}
          size={20}
          color={isOnline ? colors.warning : colors.textSecondary}
        />
        <Text style={styles.text}>
          {unsyncedCount} report{unsyncedCount !== 1 ? 's' : ''} pending sync
        </Text>
      </View>

      {isOnline && (
        <TouchableOpacity
          style={styles.syncButton}
          onPress={handleManualSync}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="sync" size={20} color={colors.primary} />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  text: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  syncButton: {
    padding: spacing.xs,
  },
});
