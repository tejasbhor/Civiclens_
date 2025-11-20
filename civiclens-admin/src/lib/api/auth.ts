import apiClient, { apiClient as clientWrapper } from './client';

interface TokenResponse {
  access_token: string;
  token_type: string;
  user_id: number;
  role: string;
  refresh_token?: string;
}

export const authApi = {
  requestOtp: async (phone: string) => {
    const res = await apiClient.post('/auth/request-otp', { phone });
    return res.data as { message: string; otp?: string; expires_in_minutes: number };
  },

  verifyOtp: async (phone: string, otp: string) => {
    const res = await apiClient.post('/auth/verify-otp', { phone, otp });
    const data = res.data as TokenResponse;
    
    if (!data.access_token) {
      throw new Error('OTP verification succeeded but no access token received');
    }
    
    clientWrapper.setToken(data.access_token);
    if (data.refresh_token) {
      localStorage.setItem('refresh_token', data.refresh_token);
    }
    localStorage.setItem('user_role', data.role);
    localStorage.setItem('user_id', String(data.user_id));
    
    return data;
  },

  login: async (phone: string, password: string) => {
    const res = await apiClient.post('/auth/login', { phone, password });
    const data = res.data as TokenResponse;
    
    if (!data.access_token) {
      throw new Error('Login succeeded but no access token received');
    }
    
    clientWrapper.setToken(data.access_token);
    if (data.refresh_token) {
      localStorage.setItem('refresh_token', data.refresh_token);
    }
    localStorage.setItem('user_role', data.role);
    localStorage.setItem('user_id', String(data.user_id));
    
    return data;
  },

  refresh: async () => {
    const refresh_token = localStorage.getItem('refresh_token');
    if (!refresh_token) {
      throw new Error('No refresh token available');
    }
    
    const res = await apiClient.post('/auth/refresh', { refresh_token });
    const data = res.data as TokenResponse;
    
    if (!data.access_token) {
      throw new Error('Refresh succeeded but no access token received');
    }
    
    clientWrapper.setToken(data.access_token);
    // Note: refresh endpoint does NOT return a new refresh_token
    // The existing refresh_token remains valid until session expires
    
    return data;
  },

  logout: async () => {
    await apiClient.post('/auth/logout');
    clientWrapper.removeToken();
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_id');
  },

  logoutAll: async () => {
    await apiClient.post('/auth/logout-all');
    clientWrapper.removeToken();
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_id');
  },

  logoutOthers: async () => {
    await apiClient.post('/auth/logout-others');
  },

  requestPasswordReset: async (phone: string) => {
    const res = await apiClient.post('/auth/request-password-reset', { phone });
    return res.data as { message: string; reset_token?: string; expires_in_minutes: number };
  },

  resetPassword: async (phone: string, reset_token: string, new_password: string) => {
    const res = await apiClient.post('/auth/reset-password', { phone, reset_token, new_password });
    return res.data as { message: string };
  },

  changePassword: async (old_password: string, new_password: string) => {
    const res = await apiClient.post('/auth/change-password', { old_password, new_password });
    return res.data as { message: string };
  },

  getSessions: async (): Promise<{ sessions: any[]; total: number }> => {
    const res = await apiClient.get('/auth/sessions');
    return res.data as { sessions: any[]; total: number };
  },

  revokeSession: async (session_id: number) => {
    const res = await apiClient.delete(`/auth/sessions/${session_id}`);
    return res.data as { message: string };
  },

  verifyPassword: async (password: string): Promise<{ verified: boolean; message: string }> => {
    const res = await apiClient.post('/auth/verify-password', { password });
    return res.data as { verified: boolean; message: string };
  },
};
