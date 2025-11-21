/**
 * Application-wide constants and configuration
 */

/**
 * Portal Type Configuration
 * 
 * The CivicLens system has two portal types:
 * - 'citizen': For citizens, contributors, and moderators
 * - 'officer': For nodal officers, auditors, admins, and super admins
 * 
 * This admin dashboard is for the officer portal.
 */
export const PORTAL_CONFIG = {
  /** Portal type for this application (officer portal for admin dashboard) */
  PORTAL_TYPE: 'officer' as const,
  
  /** Allowed user roles for this portal - ONLY admin and super_admin for admin dashboard */
  ALLOWED_ROLES: [
    'admin',
    'super_admin'
  ] as const,
} as const;

/**
 * API Configuration
 */
export const API_CONFIG = {
  /** Base API URL */
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
  
  /** Request timeout in milliseconds */
  TIMEOUT: 30000,
  
  /** Retry configuration */
  RETRY: {
    MAX_ATTEMPTS: 3,
    DELAY_MS: 1000,
  },
} as const;

/**
 * Authentication Configuration
 */
export const AUTH_CONFIG = {
  /** Token storage keys */
  STORAGE_KEYS: {
    ACCESS_TOKEN: 'auth_token',
    REFRESH_TOKEN: 'refresh_token',
    USER_ROLE: 'user_role',
    USER_ID: 'user_id',
  },
  
  /** Token expiry buffer (refresh before actual expiry) */
  REFRESH_BUFFER_SECONDS: 300, // 5 minutes
} as const;

/**
 * Application Routes
 */
export const ROUTES = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
  },
  DASHBOARD: {
    HOME: '/dashboard',
    REPORTS: '/dashboard/reports',
    TASKS: '/dashboard/tasks',
  },
} as const;

/**
 * Validation Rules
 */
export const VALIDATION = {
  PHONE: {
    PATTERN: /^\+?[1-9]\d{1,14}$/,
    MIN_LENGTH: 10,
    MAX_LENGTH: 15,
  },
  PASSWORD: {
    MIN_LENGTH: 8,
    PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
  },
} as const;

// Type exports for TypeScript
export type PortalType = typeof PORTAL_CONFIG.PORTAL_TYPE;
export type AllowedRole = typeof PORTAL_CONFIG.ALLOWED_ROLES[number];
