import { User } from '@/services/authService';

/**
 * Check if a user is an officer (nodal_officer, admin, auditor, super_admin)
 */
export const isOfficer = (role: string): boolean => {
  return role === 'nodal_officer' || role === 'admin' || role === 'auditor' || role === 'super_admin';
};

/**
 * Check if a user is a citizen
 */
export const isCitizen = (role: string): boolean => {
  return role === 'citizen' || role === 'contributor' || role === 'moderator';
};

/**
 * Get the appropriate dashboard path for a user based on their role
 */
export const getDashboardPath = (user: User | null): string => {
  if (!user) return '/';
  
  if (isOfficer(user.role)) {
    return '/officer/dashboard';
  } else if (isCitizen(user.role)) {
    return '/citizen/dashboard';
  }
  
  return '/';
};

/**
 * Get the appropriate login path based on user type
 */
export const getLoginPath = (isOfficerRoute: boolean): string => {
  return isOfficerRoute ? '/officer/login' : '/citizen/login';
};

