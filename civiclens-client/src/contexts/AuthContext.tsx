import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, User } from '@/services/authService';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isOffline: boolean;
  login: (accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const { toast } = useToast();

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
    
    // Listen for auth logout events
    const handleAuthLogout = () => {
      setUser(null);
      setIsOffline(false);
    };
    
    window.addEventListener('auth-logout-required', handleAuthLogout);
    
    return () => {
      window.removeEventListener('auth-logout-required', handleAuthLogout);
    };
  }, []);

  // Listen for backend status changes
  useEffect(() => {
    const handleBackendOffline = () => {
      setIsOffline(true);
    };
    
    const handleBackendOnline = () => {
      setIsOffline(false);
      // Try to refresh user if we have tokens but no user
      const token = localStorage.getItem('access_token');
      if (token && !user) {
        checkAuth();
      }
    };
    
    window.addEventListener('backend-offline', handleBackendOffline);
    window.addEventListener('backend-online', handleBackendOnline);
    
    return () => {
      window.removeEventListener('backend-offline', handleBackendOffline);
      window.removeEventListener('backend-online', handleBackendOnline);
    };
  }, [user]);

  const checkAuth = async () => {
    const token = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user');
    
    // If we have a stored user, use it immediately (offline mode)
    if (storedUser && !user) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (e) {
        console.error('Failed to parse stored user:', e);
      }
    }
    
    if (token) {
      try {
        await refreshUser();
        setIsOffline(false);
      } catch (error: any) {
        console.error('Auth check failed:', error);
        
        // Check if it's a network error
        const isNetworkError = !error.response && (
          error.code === 'ECONNABORTED' ||
          error.code === 'ERR_NETWORK' ||
          error.message === 'Network Error'
        );
        
        if (isNetworkError) {
          // Backend is down - use stored user if available
          setIsOffline(true);
          if (!user && storedUser) {
            try {
              const parsedUser = JSON.parse(storedUser);
              setUser(parsedUser);
            } catch (e) {
              console.error('Failed to parse stored user:', e);
            }
          }
        } else {
          // Auth error - clear invalid tokens
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          setUser(null);
        }
      }
    }
    
    setLoading(false);
  };

  const login = async (accessToken: string, refreshToken: string) => {
    try {
      // Store tokens
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      
      // Fetch user data
      await refreshUser();
      setIsOffline(false);
      
      // Don't show toast here - let the login pages handle their own success messages
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Check if it's a network error
      const isNetworkError = !error.response && (
        error.code === 'ECONNABORTED' ||
        error.code === 'ERR_NETWORK' ||
        error.message === 'Network Error'
      );
      
      if (isNetworkError) {
        // Backend is down - clear tokens since we can't verify
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        toast({
          title: "Connection Error",
          description: "Unable to connect to server. Please check your internet connection and try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Login Failed",
          description: error.response?.data?.detail || error.message || "Failed to fetch user data",
          variant: "destructive",
        });
      }
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Try to call logout API, but don't wait for it
      authService.logout().catch((error) => {
        console.error('Logout API call failed (backend may be down):', error);
        // Continue with local logout even if API fails
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local state, even if API call fails
      setUser(null);
      setIsOffline(false);
      
      // Clear all auth-related data
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      localStorage.removeItem('remember_me');
      
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      
      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('auth-logout-required'));
      
      // Redirect to landing page after logout
      window.location.href = '/';
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await authService.getCurrentUser();
      setUser(userData);
      
      // Store user data for offline access
      localStorage.setItem('user', JSON.stringify(userData));
      setIsOffline(false);
    } catch (error: any) {
      console.error('Failed to fetch user:', error);
      
      // Check if it's a network error
      const isNetworkError = !error.response && (
        error.code === 'ECONNABORTED' ||
        error.code === 'ERR_NETWORK' ||
        error.message === 'Network Error'
      );
      
      if (isNetworkError) {
        // Backend is down - try to use stored user
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            setIsOffline(true);
            return; // Don't throw error, use stored user
          } catch (e) {
            console.error('Failed to parse stored user:', e);
          }
        }
        setIsOffline(true);
      }
      
      throw error;
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    isOffline,
    login,
    logout,
    refreshUser,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
