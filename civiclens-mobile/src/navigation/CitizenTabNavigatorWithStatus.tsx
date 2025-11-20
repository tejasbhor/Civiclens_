/**
 * Citizen Tab Navigator with Offline Status
 * Wraps the main tab navigator with offline submission status display
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { CitizenTabNavigator } from './CitizenTabNavigator';
import { OfflineSubmissionStatus } from '@shared/components/OfflineSubmissionStatus';

export const CitizenTabNavigatorWithStatus: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Main Tab Navigator */}
      <CitizenTabNavigator />
      
      {/* Offline Submission Status Overlay */}
      <View style={styles.statusOverlay}>
        <OfflineSubmissionStatus />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statusOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    pointerEvents: 'box-none', // Allow touches to pass through to underlying components
  },
});
