'use client';

import { useAuthStore } from '../store/authStore';

// Custom hook for auth with selectors for better performance
export function useAuth() {
  const auth = useAuthStore();
  
  return {
    user: auth.user,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    token: auth.token,
    setAuth: auth.setAuth,
    clearAuth: auth.clearAuth,
    setLoading: auth.setLoading,
  };
}

// Selector hooks for fine-grained subscriptions
export function useUser() {
  const auth = useAuthStore();
  return auth.user;
}

export function useIsAuthenticated() {
  const auth = useAuthStore();
  return auth.isAuthenticated;
}

export function useIsLoading() {
  const auth = useAuthStore();
  return auth.isLoading;
}
