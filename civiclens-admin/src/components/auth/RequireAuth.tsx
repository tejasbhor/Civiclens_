'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { authApi } from '@/lib/api/auth';

// Government official roles allowed to access admin dashboard
const ALLOWED_ROLES = ['super_admin', 'admin', 'auditor', 'nodal_officer', 'moderator', 'contributor'];

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading, user, setAuth, clearAuth, setLoading } = useAuth();
  const hasChecked = useRef(false);
  const [isMounted, setIsMounted] = useState(false);

  // Fix hydration mismatch: only render after client mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Only run auth check once on mount
    if (hasChecked.current) return;
    hasChecked.current = true;

    const checkAuth = async () => {
      // If already authenticated with valid role, allow access
      if (isAuthenticated && user && ALLOWED_ROLES.includes(user.role)) {
        setLoading(false);
        return;
      }

      // If not authenticated, try refresh token
      if (!isAuthenticated) {
        try {
          const data = await authApi.refresh();
          if (data.role && ALLOWED_ROLES.includes(data.role)) {
            setAuth(data.access_token, data.refresh_token || '', {
              id: data.user_id,
              role: data.role,
              phone: '',
            });
            return;
          }
        } catch (e) {
          // Refresh failed
        }

        // No valid auth, redirect to login
        clearAuth();
        router.replace('/auth/login');
        return;
      }

      // Authenticated but invalid role
      if (user && !ALLOWED_ROLES.includes(user.role)) {
        clearAuth();
        router.replace('/auth/login');
      }
    };

    checkAuth();
  }, []); // Empty dependency array - only run once

  // Prevent hydration mismatch: show loading until mounted
  if (!isMounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent mx-auto mb-3" />
          <p className="text-sm text-gray-600">Verifying credentials...</p>
        </div>
      </div>
    );
  }

  // Show content if authenticated
  if (isAuthenticated && user && ALLOWED_ROLES.includes(user.role)) {
    return <>{children}</>;
  }

  // Otherwise show nothing (will redirect)
  return null;
}

