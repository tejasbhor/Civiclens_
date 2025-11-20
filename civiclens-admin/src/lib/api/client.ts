import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { toast } from 'sonner';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Only set Content-Type to application/json if not already set and data is not FormData
        if (!config.headers['Content-Type'] && !(config.data instanceof FormData)) {
          config.headers['Content-Type'] = 'application/json';
        }
        
        // Remove Content-Type for FormData (axios will set it with boundary)
        if (config.data instanceof FormData) {
          delete config.headers['Content-Type'];
        }
        
        return config;
      },
      (error: any) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor with refresh logic
    this.client.interceptors.response.use(
      (response: any) => response,
      async (error: AxiosError) => {
        const originalRequest: any = error.config || {};
        const status = error.response?.status;

        if (status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            const newToken = await this.tryRefreshToken();
            if (newToken) {
              originalRequest.headers = originalRequest.headers || {};
              originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
              return this.client(originalRequest);
            }
          } catch (e) {
            // fallthrough to error handling
          }
        }

        this.handleError(error);
        return Promise.reject(error);
      }
    );
  }

  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  public setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  public removeToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  private handleError(error: AxiosError): void {
    if (error.response) {
      const status = error.response.status;
      const data: any = error.response.data;

      switch (status) {
        case 401:
          toast.error('Session expired. Please login again.');
          this.removeToken();
          window.location.href = '/auth/login';
          break;
        case 403:
          toast.error('You do not have permission to perform this action.');
          break;
        case 404:
          toast.error('Resource not found.');
          break;
        case 422:
          toast.error(data.detail || 'Validation error.');
          break;
        case 500:
          toast.error('Server error. Please try again later.');
          break;
        default:
          toast.error(data.detail || 'An error occurred.');
      }
    } else if (error.request) {
      toast.error('Network error. Please check your connection.');
    } else {
      toast.error('An unexpected error occurred.');
    }
  }

  private async tryRefreshToken(): Promise<string | null> {
    if (this.isRefreshing) return null;
    this.isRefreshing = true;
    try {
      const refresh_token = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;
      if (!refresh_token) return null;
      const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refresh_token });
      const access_token: string | undefined = (res.data && res.data.access_token) as string | undefined;
      if (access_token) {
        this.setToken(access_token);
        return access_token;
      }
      return null;
    } catch {
      return null;
    } finally {
      this.isRefreshing = false;
    }
  }

  public getClient(): AxiosInstance {
    return this.client;
  }

  // Expose HTTP methods
  public get(url: string, config?: any) {
    return this.client.get(url, config);
  }

  public post(url: string, data?: any, config?: any) {
    return this.client.post(url, data, config);
  }

  public put(url: string, data?: any, config?: any) {
    return this.client.put(url, data, config);
  }

  public delete(url: string, config?: any) {
    return this.client.delete(url, config);
  }

  public patch(url: string, data?: any, config?: any) {
    return this.client.patch(url, data, config);
  }
}

export const apiClient = new ApiClient();
export default apiClient.getClient();