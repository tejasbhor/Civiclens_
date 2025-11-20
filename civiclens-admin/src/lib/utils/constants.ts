// API Constants
export const API_ENDPOINTS = {
  REPORTS: '/reports',
  TASKS: '/tasks',
  DEPARTMENTS: '/departments',
  OFFICERS: '/officers',
  ANALYTICS: '/analytics',
  AUTH: '/auth',
} as const;

// Pagination Constants
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// File Upload Constants
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.mp4'],
} as const;

// Map Constants
export const MAP = {
  DEFAULT_CENTER: { lat: 40.7128, lng: -74.0060 }, // New York
  DEFAULT_ZOOM: 10,
  MARKER_CLUSTER_RADIUS: 50,
} as const;

// Status Colors
export const STATUS_COLORS = {
  received: 'bg-indigo-100 text-indigo-800',
  classified: 'bg-purple-100 text-purple-800',
  assigned: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-amber-100 text-amber-800',
  resolved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
} as const;

// Priority Colors
export const PRIORITY_COLORS = {
  critical: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-gray-100 text-gray-800',
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_PREFERENCES: 'user_preferences',
  THEME: 'theme',
} as const;

// Breakpoints (for responsive design)
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;