'use client';

import React, { createContext, useContext, useCallback, useMemo } from 'react';

export interface User {
  id: number;
  role: string;
  phone: string;
  email?: string;
  full_name?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (token: string, refreshToken: string, user: User) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<{
    user: User | null;
    token: string | null;
    refreshToken: string | null;
    isLoading: boolean;
  }>(() => {
    if (typeof window === 'undefined') {
      return { user: null, token: null, refreshToken: null, isLoading: true };
    }
    
    const token = localStorage.getItem('auth_token');
    const refreshToken = localStorage.getItem('refresh_token');
    const userRole = localStorage.getItem('user_role');
    const userId = localStorage.getItem('user_id');
    
    if (token && userRole && userId) {
      return {
        user: { id: parseInt(userId), role: userRole, phone: '' },
        token,
        refreshToken,
        isLoading: false,
      };
    }
    
    return { user: null, token: null, refreshToken: null, isLoading: false };
  });

  const setAuth = useCallback((token: string, refreshToken: string, user: User) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('user_role', user.role);
    localStorage.setItem('user_id', String(user.id));
    setState({ user, token, refreshToken, isLoading: false });
  }, []);

  const clearAuth = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_id');
    setState({ user: null, token: null, refreshToken: null, isLoading: false });
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  const value = useMemo(() => ({
    ...state,
    isAuthenticated: !!state.token && !!state.user,
    setAuth,
    clearAuth,
    setLoading,
  }), [state, setAuth, clearAuth, setLoading]);

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuthStore() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthStore must be used within AuthProvider');
  }
  return context;
}
