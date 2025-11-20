/**
 * App Navigator
 * Main navigation structure for the app
 */

import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@shared/types/user';

// Auth Screens
import { RoleSelectionScreen } from '@/features/auth/screens/RoleSelectionScreen';
import { CitizenLoginScreen } from '@/features/auth/screens/CitizenLoginScreen';
import { OfficerLoginScreen } from '@/features/auth/screens/OfficerLoginScreen';

// Citizen Screens
import { CitizenTabNavigator } from './CitizenTabNavigator';

// Officer Screens
import { OfficerTabNavigator } from './OfficerTabNavigator';

export type RootStackParamList = {
  RoleSelection: undefined;
  CitizenLogin: undefined;
  OfficerLogin: undefined;
  CitizenApp: undefined;
  OfficerApp: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const user = useAuthStore((state) => state.user);

  // Show loading screen during auth state transition
  if (isLoading && isAuthenticated) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {!isAuthenticated ? (
          // Auth Stack
          <>
            <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
            <Stack.Screen name="CitizenLogin" component={CitizenLoginScreen} />
            <Stack.Screen name="OfficerLogin" component={OfficerLoginScreen} />
          </>
        ) : (
          // Authenticated Stack - Route based on user role
          <>
            {user?.role === UserRole.CITIZEN ? (
              <Stack.Screen name="CitizenApp" component={CitizenTabNavigator} />
            ) : user?.role === UserRole.NODAL_OFFICER ? (
              <Stack.Screen name="OfficerApp" component={OfficerTabNavigator} />
            ) : (
              <Stack.Screen name="CitizenApp" component={CitizenTabNavigator} />
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
});
