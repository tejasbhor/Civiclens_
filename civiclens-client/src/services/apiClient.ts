import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// Track if we're currently refreshing token to avoid multiple refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

// Helper to check if error is a network error
const isNetworkError = (error: AxiosError): boolean => {
  return (
    !error.response &&
    (error.code === 'ECONNABORTED' ||
      error.code === 'ERR_NETWORK' ||
      error.code === 'ETIMEDOUT' ||
      error.message === 'Network Error' ||
      error.message.includes('timeout'))
  );
};

// Helper to check if backend is reachable
export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const response = await axios.get(`${API_BASE_URL.replace('/api/v1', '')}/health`, {
      timeout: 5000,
    });
    return response.status === 200;
  } catch {
    return false;
  }
};

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Process queued requests after token refresh
const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor - Handle errors and token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle network errors
    if (isNetworkError(error)) {
      // Emit custom event for network status
      window.dispatchEvent(new CustomEvent('backend-offline', { detail: { error } }));
      
      // Don't retry on network errors for non-auth endpoints
      if (!originalRequest.url?.includes('/auth/')) {
        return Promise.reject({
          ...error,
          isNetworkError: true,
          message: 'Unable to connect to server. Please check your internet connection.',
        });
      }
    }

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient.request(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;
      const refreshToken = localStorage.getItem('refresh_token');
      
      if (refreshToken) {
        try {
          // Try to refresh the token
          const response = await axios.post(
            `${API_BASE_URL}/auth/refresh`,
            { refresh_token: refreshToken },
            { timeout: 10000 }
          );
          
          const { access_token, refresh_token: newRefreshToken } = response.data;
          
          // Update tokens
          localStorage.setItem('access_token', access_token);
          if (newRefreshToken) {
            localStorage.setItem('refresh_token', newRefreshToken);
          }

          // Process queued requests
          processQueue(null, access_token);
          
          // Retry original request with new token
          if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          }
          isRefreshing = false;
          return apiClient.request(originalRequest);
        } catch (refreshError: any) {
          // Refresh failed - clear tokens and logout
          isRefreshing = false;
          processQueue(refreshError as AxiosError, null);

          // Clear all auth-related data
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');

          // Only redirect if not already on login page
          const currentPath = window.location.pathname;
          if (!currentPath.includes('/login') && !currentPath.includes('/citizen/login') && !currentPath.includes('/officer/login')) {
            // Emit logout event
            window.dispatchEvent(new CustomEvent('auth-logout-required'));
            // Use replace to avoid adding to history
            window.location.replace('/');
          }

          return Promise.reject({
            ...refreshError,
            isAuthError: true,
            message: 'Session expired. Please login again.',
          });
        }
      } else {
        // No refresh token - clear auth data
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');

        // Only redirect if not already on login page
        const currentPath = window.location.pathname;
        if (!currentPath.includes('/login') && !currentPath.includes('/citizen/login') && !currentPath.includes('/officer/login')) {
          window.dispatchEvent(new CustomEvent('auth-logout-required'));
          window.location.replace('/');
        }

        return Promise.reject({
          ...error,
          isAuthError: true,
          message: 'Authentication required. Please login.',
        });
      }
    }

    // Handle other HTTP errors
    if (error.response) {
      const status = error.response.status;
      
      // Emit backend online event on any successful response (even error responses)
      window.dispatchEvent(new CustomEvent('backend-online'));

      // Handle specific error codes
      if (status === 403) {
        return Promise.reject({
          ...error,
          message: 'You do not have permission to perform this action.',
        });
      } else if (status === 404) {
        return Promise.reject({
          ...error,
          message: 'The requested resource was not found.',
        });
      } else if (status === 429) {
        return Promise.reject({
          ...error,
          message: 'Too many requests. Please try again later.',
        });
      } else if (status >= 500) {
        return Promise.reject({
          ...error,
          message: 'Server error. Please try again later.',
        });
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
