import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { isOfficer, isCitizen } from '@/utils/authHelpers';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'citizen' | 'officer' | 'admin';
  redirectTo?: string;
}

/**
 * ProtectedRoute component that handles authentication and role-based access control
 * - Shows loading state while checking authentication
 * - Redirects to login if not authenticated
 * - Redirects to appropriate page if role doesn't match
 * - Works even when backend is down (uses local storage fallback)
 */
export const ProtectedRoute = ({ 
  children, 
  requiredRole,
  redirectTo 
}: ProtectedRouteProps) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();


  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated || !user) {
    // Store the attempted location for redirect after login
    const returnUrl = location.pathname + location.search;
    const loginPath = requiredRole === 'officer' ? '/officer/login' : '/citizen/login';
    return <Navigate to={loginPath} state={{ from: returnUrl }} replace />;
  }

  // Check role-based access
  if (requiredRole) {
    if (requiredRole === 'officer' && !isOfficer(user.role)) {
      // User is not an officer - redirect to citizen dashboard
      return <Navigate to="/citizen/dashboard" replace />;
    } else if (requiredRole === 'citizen' && isOfficer(user.role)) {
      // User is an officer trying to access citizen route - redirect to officer dashboard
      return <Navigate to="/officer/dashboard" replace />;
    } else if (requiredRole === 'admin' && user.role !== 'admin' && user.role !== 'super_admin') {
      // User is not an admin - redirect appropriately
      if (isOfficer(user.role)) {
        return <Navigate to="/officer/dashboard" replace />;
      } else {
        return <Navigate to="/citizen/dashboard" replace />;
      }
    }
  }

  // Authenticated and authorized - render children
  return <>{children}</>;
};

