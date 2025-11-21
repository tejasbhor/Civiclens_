/**
 * Officer Tab Navigator - Production Ready
 * Bottom tab navigation for officers with consistent styling
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Officer Screens
import { OfficerDashboardScreen } from '../features/officer/screens/OfficerDashboardScreen';
import { OfficerProfileScreen } from '../features/officer/screens/OfficerProfileScreen';
import { OfficerNotificationsScreen } from '../features/officer/screens/OfficerNotificationsScreen';
import { OfficerTasksScreen } from '../features/officer/screens/OfficerTasksScreen';
import { OfficerTaskDetailScreen } from '../features/officer/screens/OfficerTaskDetailScreen';
import SubmitVerificationScreen from '../features/officer/screens/SubmitVerificationScreen';
import { OfficerAnalyticsScreen } from '../features/officer/screens';

// Placeholder screens for now
const PlaceholderScreen = () => {
  return null; // Will be replaced with actual screens
};

// Stack param lists
export type OfficerStackParamList = {
  Dashboard: undefined;
  Tasks: undefined;
  Stats: undefined;
  Profile: undefined;
  Notifications: undefined;
};

export type DashboardStackParamList = {
  DashboardMain: undefined;
};

export type TasksStackParamList = {
  TasksList: undefined;
  TaskDetail: { taskId: number };
  SubmitVerification: { reportId: number; reportNumber: string; title: string };
};

export type StatsStackParamList = {
  StatsMain: undefined;
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  EditProfile: undefined;
};

export type NotificationsStackParamList = {
  NotificationsMain: undefined;
};

// Create navigators
const Tab = createBottomTabNavigator<OfficerStackParamList>();
const DashboardStack = createNativeStackNavigator<DashboardStackParamList>();
const TasksStack = createNativeStackNavigator<TasksStackParamList>();
const StatsStack = createNativeStackNavigator<StatsStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const NotificationsStack = createNativeStackNavigator<NotificationsStackParamList>();

// Stack Navigators
const DashboardStackNavigator = () => (
  <DashboardStack.Navigator screenOptions={{ headerShown: false }}>
    <DashboardStack.Screen name="DashboardMain" component={OfficerDashboardScreen} />
  </DashboardStack.Navigator>
);

const TasksStackNavigator = () => (
  <TasksStack.Navigator screenOptions={{ headerShown: false }}>
    <TasksStack.Screen name="TasksList" component={OfficerTasksScreen} />
    <TasksStack.Screen name="TaskDetail" component={OfficerTaskDetailScreen} />
    <TasksStack.Screen name="SubmitVerification" component={SubmitVerificationScreen} />
  </TasksStack.Navigator>
);

const StatsStackNavigator = () => (
  <StatsStack.Navigator screenOptions={{ headerShown: false }}>
    <StatsStack.Screen name="StatsMain" component={OfficerAnalyticsScreen} />
  </StatsStack.Navigator>
);

const ProfileStackNavigator = () => (
  <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
    <ProfileStack.Screen name="ProfileMain" component={OfficerProfileScreen} />
    <ProfileStack.Screen name="EditProfile" component={PlaceholderScreen} />
  </ProfileStack.Navigator>
);

const NotificationsStackNavigator = () => (
  <NotificationsStack.Navigator screenOptions={{ headerShown: false }}>
    <NotificationsStack.Screen name="NotificationsMain" component={OfficerNotificationsScreen} />
  </NotificationsStack.Navigator>
);

// Main Officer Tab Navigator
export const OfficerTabNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();
  
  // Calculate proper bottom padding for gesture area (same as citizen)
  const bottomPadding = Math.max(insets.bottom, 20); // At least 20px, or use safe area
  const tabBarHeight = 60 + bottomPadding; // Icon area + bottom padding
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1976D2', // Exact same as citizen
        tabBarInactiveTintColor: '#94A3B8', // Exact same as citizen
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
        name="Dashboard"
        component={DashboardStackNavigator}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'grid' : 'grid-outline'}
              size={26}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Tasks"
        component={TasksStackNavigator}
        options={{
          tabBarLabel: 'Tasks',
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
        name="Stats"
        component={StatsStackNavigator}
        options={{
          tabBarLabel: 'Analytics',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'analytics' : 'analytics-outline'}
              size={26}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsStackNavigator}
        options={{
          tabBarLabel: 'Notifications',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'notifications' : 'notifications-outline'}
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
