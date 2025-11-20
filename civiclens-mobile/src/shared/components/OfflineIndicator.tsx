/**
 * OfflineIndicator Component
 * Displays a banner when the device is offline
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNetwork } from '@shared/hooks/useNetwork';
import { colors } from '@shared/theme/colors';
import { typography } from '@shared/theme/typography';
import { spacing } from '@shared/theme/spacing';

export const OfflineIndicator: React.FC = () => {
  const { isOnline } = useNetwork();

  if (isOnline) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>📡 No internet connection</Text>
      <Text style={styles.subtext}>Changes will sync when online</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.warning,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    elevation: 100,
  },
  text: {
    ...typography.body,
    color: colors.warningText,
    fontWeight: '600',
  },
  subtext: {
    ...typography.caption,
    color: colors.warningText,
    marginTop: spacing.xs,
  },
});
