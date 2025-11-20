/**
 * Authentication Error Boundary
 * Handles authentication errors gracefully and forces re-login when needed
 */

import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@shared/theme/colors';
import { useAuthStore } from '@/store/authStore';

interface AuthErrorBoundaryProps {
  children: React.ReactNode;
}

interface AuthErrorState {
  hasAuthError: boolean;
  errorMessage?: string;
}

export class AuthErrorBoundary extends React.Component<AuthErrorBoundaryProps, AuthErrorState> {
  constructor(props: AuthErrorBoundaryProps) {
    super(props);
    this.state = { hasAuthError: false };
  }

  static getDerivedStateFromError(error: any): AuthErrorState {
    // Check if this is an authentication error
    if (error?.isAuthError || error?.response?.status === 401 || error?.response?.status === 403) {
      return {
        hasAuthError: true,
        errorMessage: error?.message || 'Authentication failed. Please login again.',
      };
    }
    
    return { hasAuthError: false };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('AuthErrorBoundary caught an error:', error, errorInfo);
    
    // If it's an auth error, trigger logout
    if (this.state.hasAuthError) {
      this.handleAuthError();
    }
  }

  handleAuthError = async () => {
    try {
      // Import auth store dynamically to avoid circular dependencies
      const { useAuthStore } = await import('@/store/authStore');
      const { logout } = useAuthStore.getState();
      await logout();
    } catch (error) {
      console.error('Failed to logout after auth error:', error);
    }
  };

  handleRetry = () => {
    this.setState({ hasAuthError: false });
  };

  render() {
    if (this.state.hasAuthError) {
      return <AuthErrorFallback message={this.state.errorMessage} onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

interface AuthErrorFallbackProps {
  message?: string;
  onRetry: () => void;
}

const AuthErrorFallback: React.FC<AuthErrorFallbackProps> = ({ message, onRetry }) => {
  const { logout } = useAuthStore();

  const handleForceLogout = async () => {
    Alert.alert(
      'Session Expired',
      'Your session has expired. You will be redirected to the login screen.',
      [
        {
          text: 'Login Again',
          onPress: async () => {
            await logout();
            onRetry();
          },
        },
      ],
      { cancelable: false }
    );
  };

  useEffect(() => {
    // Auto-trigger logout after a short delay
    const timer = setTimeout(() => {
      handleForceLogout();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.errorCard}>
        <View style={styles.iconContainer}>
          <Ionicons name="lock-closed-outline" size={48} color={colors.error} />
        </View>
        
        <Text style={styles.title}>Authentication Required</Text>
        <Text style={styles.message}>
          {message || 'Your session has expired. Please login again to continue.'}
        </Text>
        
        <TouchableOpacity style={styles.button} onPress={handleForceLogout}>
          <Ionicons name="log-in-outline" size={18} color={colors.white} style={{ marginRight: 8 }} />
          <Text style={styles.buttonText}>Login Again</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorCard: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    maxWidth: 320,
    width: '100%',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${colors.error}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 12,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  retryText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
});
