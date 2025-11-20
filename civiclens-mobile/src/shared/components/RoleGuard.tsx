/**
 * RoleGuard Component - Production-ready role-based access control
 * Prevents unauthorized access to role-specific screens
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@shared/types/user';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallbackScreen?: string;
  showError?: boolean;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  allowedRoles,
  children,
  fallbackScreen = 'RoleSelection',
  showError = true,
}) => {
  const navigation = useNavigation();
  const { user, isAuthenticated, logout } = useAuthStore();

  // Check if user is authenticated
  if (!isAuthenticated || !user) {
    return (
      <View style={styles.container}>
        <View style={styles.errorCard}>
          <Ionicons name="lock-closed-outline" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Authentication Required</Text>
          <Text style={styles.errorMessage}>
            Please log in to access this feature.
          </Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => (navigation as any).navigate(fallbackScreen)}
          >
            <Text style={styles.actionButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Check if user has required role
  const hasRequiredRole = allowedRoles.some(role => 
    user.role.toUpperCase() === role.toUpperCase()
  );

  if (!hasRequiredRole) {
    if (!showError) {
      return null;
    }

    return (
      <View style={styles.container}>
        <View style={styles.errorCard}>
          <Ionicons name="shield-outline" size={64} color="#F59E0B" />
          <Text style={styles.errorTitle}>Access Denied</Text>
          <Text style={styles.errorMessage}>
            You don't have permission to access this feature.
          </Text>
          <Text style={styles.roleInfo}>
            Required roles: {allowedRoles.join(', ')}
          </Text>
          <Text style={styles.currentRole}>
            Your role: {user.role}
          </Text>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={() => (navigation as any).navigate('RoleSelection')}
            >
              <Text style={styles.secondaryButtonText}>Switch Account</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={async () => {
                await logout();
                (navigation as any).navigate('RoleSelection');
              }}
            >
              <Text style={styles.actionButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // User has required role - render children
  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    maxWidth: 400,
    width: '100%',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
  roleInfo: {
    fontSize: 14,
    color: '#F59E0B',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },
  currentRole: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#1976D2',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
  },
});
