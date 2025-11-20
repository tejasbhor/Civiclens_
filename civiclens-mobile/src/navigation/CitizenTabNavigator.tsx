/**
 * Citizen Tab Navigator
 * Bottom tab navigation for citizen users - Professional Design
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CitizenHomeScreen,
  SubmitReportScreen,
  ReportDetailScreen,
  ProfileScreen,
  NotificationsScreen,
  EditProfileScreen,
  MyReportsScreen,
} from '@/features/citizen/screens';
import { colors } from '@shared/theme/colors';

const ChatScreen = () => (
  <View style={styles.placeholderContainer}>
    <Ionicons name="chatbubbles-outline" size={64} color="#CCC" />
    <Text style={styles.placeholderText}>Chat</Text>
    <Text style={styles.placeholderSubtext}>Coming soon</Text>
  </View>
);

// ProfileScreen imported from features/citizen/screens

export type HomeStackParamList = {
  HomeMain: undefined;
  SubmitReport: undefined;
  Notifications: undefined;
};

export type ReportsStackParamList = {
  ReportsList: undefined;
  ReportDetail: { reportId: number };
  SubmitReport: undefined;
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  EditProfile: undefined;
  Notifications: undefined;
};

export type CitizenTabParamList = {
  Home: undefined;
  Reports: undefined;
  Chat: undefined;
  Profile: undefined;
};

const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const ReportsStack = createNativeStackNavigator<ReportsStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

const HomeStackNavigator: React.FC = () => {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain" component={CitizenHomeScreen} />
      <HomeStack.Screen name="SubmitReport" component={SubmitReportScreen} />
      <HomeStack.Screen name="Notifications" component={NotificationsScreen} />
    </HomeStack.Navigator>
  );
};

const ReportsStackNavigator: React.FC = () => {
  return (
    <ReportsStack.Navigator screenOptions={{ headerShown: false }}>
      <ReportsStack.Screen name="ReportsList" component={MyReportsScreen} />
      <ReportsStack.Screen name="ReportDetail" component={ReportDetailScreen} />
      <ReportsStack.Screen name="SubmitReport" component={SubmitReportScreen} />
    </ReportsStack.Navigator>
  );
};

const ProfileStackNavigator: React.FC = () => {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} />
      <ProfileStack.Screen name="Notifications" component={NotificationsScreen} />
    </ProfileStack.Navigator>
  );
};

const Tab = createBottomTabNavigator<CitizenTabParamList>();

export const CitizenTabNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();
  
  // Calculate proper bottom padding for gesture area
  const bottomPadding = Math.max(insets.bottom, 20); // At least 20px, or use safe area
  const tabBarHeight = 60 + bottomPadding; // Icon area + bottom padding
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1976D2',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingBottom: bottomPadding,
          paddingTop: 8,
          paddingHorizontal: 8,
          height: tabBarHeight,
          marginBottom: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 20,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginTop: 0,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={26}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsStackNavigator}
        options={{
          tabBarLabel: 'Reports',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'list' : 'list-outline'}
              size={26}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          tabBarLabel: 'Chat',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
              size={26}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={26}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  placeholderText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 16,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
  },
});
