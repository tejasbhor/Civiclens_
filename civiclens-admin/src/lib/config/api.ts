/**
 * API Configuration and URL Building Utilities
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

/**
 * Build a complete API URL from a path
 * @param path - API endpoint path (e.g., 'media/upload/123')
 * @returns Full URL (e.g., 'http://localhost:8000/api/v1/media/upload/123')
 */
export function buildApiUrl(path: string): string {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // Remove trailing slash from base URL if present
  const cleanBase = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  
  return `${cleanBase}/${cleanPath}`;
}

/**
 * Get the API base URL
 */
export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

/**
 * API endpoint paths
 */
export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    REQUEST_OTP: '/auth/request-otp',
    VERIFY_OTP: '/auth/verify-otp',
    LOGIN: '/auth/login',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
  },
  // Media
  MEDIA: {
    UPLOAD: (reportId: number) => `/media/upload/${reportId}`,
    BULK_UPLOAD: (reportId: number) => `/media/upload/${reportId}/bulk`,
    GET_MEDIA: (reportId: number) => `/media/report/${reportId}`,
    DELETE_MEDIA: (mediaId: number) => `/media/${mediaId}`,
    LIMITS: '/media/limits',
    STORAGE_STATS: '/media/storage/stats',
  },
  // Reports
  REPORTS: {
    LIST: '/reports',
    CREATE: '/reports',
    GET: (id: number) => `/reports/${id}`,
    UPDATE: (id: number) => `/reports/${id}`,
    UPDATE_STATUS: (id: number) => `/reports/${id}/status`,
    DELETE: (id: number) => `/reports/${id}`,
  },
  // Users
  USERS: {
    LIST: '/users',
    ME: '/users/me',
    PROFILE: '/users/me/profile',
    PREFERENCES: '/users/me/preferences',
    VERIFICATION: '/users/me/verification',
    GET: (id: number) => `/users/${id}`,
  },
} as const;


