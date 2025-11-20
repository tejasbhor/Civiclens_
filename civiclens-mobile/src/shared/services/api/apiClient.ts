// API Client with interceptors - Production Ready
import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig, AxiosError } from 'axios';
import { ENV } from '@shared/config/env';
import { SecureStorage } from '@shared/services/storage';
import { validateToken, cleanupInvalidAuthState } from '@shared/utils/authUtils';
import NetInfo from '@react-native-community/netinfo';

// Track if we're currently refreshing token to avoid multiple refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];
let consecutiveAuthFailures = 0;
const MAX_AUTH_FAILURES = 3;

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

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    console.log('🔍 ApiClient constructor called');
    console.log('🔍 ENV.API_BASE_URL:', ENV.API_BASE_URL);
    
    this.client = axios.create({
      baseURL: ENV.API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
      // Add retry configuration for network issues
      validateStatus: (status) => {
        // Accept 2xx and 3xx status codes
        return status >= 200 && status < 400;
      },
    });

    console.log('✅ API Client initialized with base URL:', ENV.API_BASE_URL);
    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - Add auth token
    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        // Check network connectivity
        const netInfo = await NetInfo.fetch();
        if (!netInfo.isConnected) {
          return Promise.reject({
            type: 'NETWORK_ERROR',
            isNetworkError: true,
            message: 'No internet connection',
            config,
          });
        }

        // Add auth token from storage with validation
        const token = await SecureStorage.getAuthToken();
        if (token && config.headers) {
          const validation = validateToken(token);
          
          if (!validation.isValid || validation.isExpired) {
            console.warn('🔑 Invalid or expired token, cleaning up auth state');
            await cleanupInvalidAuthState();
            
            // Don't add invalid token to request
            return Promise.reject({
              type: 'AUTH_ERROR',
              isAuthError: true,
              message: validation.isExpired ? 'Session expired. Please login again.' : 'Invalid session. Please login again.',
              config,
            });
          }
          
          config.headers.Authorization = `Bearer ${token}`;
        }

        if (ENV.ENABLE_LOGGING) {
          console.log('API Request:', config.method?.toUpperCase(), config.url);
        }

        return config;
      },
      error => {
        if (ENV.ENABLE_LOGGING) {
          console.error('API Request Error:', error);
        }
        return Promise.reject(error);
      }
    );

    // Response interceptor - Handle errors and token refresh
    this.client.interceptors.response.use(
      response => {
        if (ENV.ENABLE_LOGGING) {
          console.log('API Response:', response.status, response.config.url);
        }
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (ENV.ENABLE_LOGGING) {
          console.error('API Response Error:', error.response?.status, error.config?.url);
        }

        // Handle 401 Unauthorized - Token expired
        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
          // Don't refresh for auth endpoints
          if (originalRequest.url?.includes('/auth/')) {
            return Promise.reject(error);
          }

          // Circuit breaker: Stop if too many consecutive failures
          if (consecutiveAuthFailures >= MAX_AUTH_FAILURES) {
            console.log('🔐 Auth error detected, stopping retries');
            await SecureStorage.clearAuthTokens();
            await SecureStorage.clearUserData();
            return Promise.reject({
              ...error,
              isAuthError: true,
              message: 'Authentication failed. Please login again.',
            });
          }

          // If already refreshing, queue this request
          if (isRefreshing) {
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                }
                return this.client.request(originalRequest);
              })
              .catch((err) => Promise.reject(err));
          }

          originalRequest._retry = true;
          isRefreshing = true;

          const refreshToken = await SecureStorage.getRefreshToken();

          if (refreshToken) {
            try {
              // Try to refresh the token
              console.log('🔄 Refreshing access token...');
              const response = await axios.post(
                `${ENV.API_BASE_URL}/auth/refresh`,
                { refresh_token: refreshToken },
                { timeout: 10000 }
              );

              const { access_token, refresh_token: newRefreshToken } = response.data;

              if (!access_token) {
                throw new Error('No access_token in refresh response');
              }

              console.log('🔑 New access token received:', access_token.substring(0, 30) + '...');

              // Update access token
              await SecureStorage.setAuthToken(access_token);
              
              // Verify it was stored
              const storedToken = await SecureStorage.getAuthToken();
              console.log('🔑 Stored token verified:', storedToken?.substring(0, 30) + '...');
              
              // Update refresh token only if backend provides a new one
              // Note: Backend may not return new refresh token on every refresh
              if (newRefreshToken) {
                await SecureStorage.setRefreshToken(newRefreshToken);
              }

              console.log('✅ Token refreshed and stored successfully');

              // Reset failure counter on successful refresh
              consecutiveAuthFailures = 0;

              // Process queued requests
              processQueue(null, access_token);

              // Retry original request with new token
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${access_token}`;
              }
              isRefreshing = false;
              return this.client.request(originalRequest);
            } catch (refreshError: any) {
              // Refresh failed - increment failure counter
              consecutiveAuthFailures++;
              console.error(`❌ Token refresh failed (attempt ${consecutiveAuthFailures}/${MAX_AUTH_FAILURES})`);
              isRefreshing = false;
              processQueue(refreshError as AxiosError, null);

              // Clear all auth-related data
              await SecureStorage.clearAuthTokens();
              await SecureStorage.clearUserData();

              return Promise.reject({
                ...refreshError,
                isAuthError: true,
                message: 'Session expired. Please login again.',
              });
            }
          } else {
            // No refresh token - clear auth data
            await SecureStorage.clearAuthTokens();
            await SecureStorage.clearUserData();

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

          if (status === 403) {
            // 403 Forbidden - might be due to invalid token or insufficient permissions
            console.warn('🚫 403 Forbidden - checking auth state');
            
            // If we have a token but getting 403, it might be invalid
            const token = await SecureStorage.getAuthToken();
            if (token) {
              console.warn('🔑 Have token but got 403 - clearing potentially invalid auth state');
              await cleanupInvalidAuthState();
              
              return Promise.reject({
                ...error,
                isAuthError: true,
                message: 'Session invalid. Please login again.',
              });
            }
            
            return Promise.reject({
              ...error,
              isAuthError: false,
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
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete(url, config);
    return response.data;
  }

  getClient(): AxiosInstance {
    return this.client;
  }
}

export const apiClient = new ApiClient();
