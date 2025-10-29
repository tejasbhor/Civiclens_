import apiClient from './apiClient';

// Types matching backend
export interface User {
  id: number;
  phone: string;
  full_name?: string;
  email?: string;
  role: 'citizen' | 'officer' | 'admin';
  profile_completion: 'minimal' | 'basic' | 'complete';
  account_created_via: 'otp' | 'password';
  phone_verified: boolean;
  email_verified: boolean;
  reputation_score?: number;
  total_reports?: number;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user_id: number;
  role: string;
}

export interface OTPResponse {
  message: string;
  otp?: string; // Only in development mode
  expires_in_minutes: number;
}

export interface SignupResponse {
  message: string;
  user_id: number;
  otp?: string; // Only in development mode
  expires_in_minutes: number;
}

export const authService = {
  /**
   * Request OTP for phone number (Quick Login Path)
   */
  async requestOTP(phone: string): Promise<OTPResponse> {
    const response = await apiClient.post('/auth/request-otp', { phone });
    return response.data;
  },

  /**
   * Verify OTP and login (Quick Login Path)
   * Creates minimal account if user doesn't exist
   */
  async verifyOTP(phone: string, otp: string): Promise<AuthResponse> {
    const response = await apiClient.post('/auth/verify-otp', { phone, otp });
    return response.data;
  },

  /**
   * Full Signup with password (Full Registration Path)
   */
  async signup(data: {
    phone: string;
    full_name: string;
    email?: string;
    password: string;
  }): Promise<SignupResponse> {
    const response = await apiClient.post('/auth/signup', data);
    return response.data;
  },

  /**
   * Verify phone after signup (Full Registration Path)
   */
  async verifyPhone(phone: string, otp: string): Promise<AuthResponse> {
    const response = await apiClient.post('/auth/verify-phone', { phone, otp });
    return response.data;
  },

  /**
   * Login with password (for existing full accounts)
   */
  async login(phone: string, password: string): Promise<AuthResponse> {
    const response = await apiClient.post('/auth/login', { phone, password });
    return response.data;
  },

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get('/users/me');
    return response.data;
  },

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const response = await apiClient.post('/auth/refresh', {
      refresh_token: refreshToken,
    });
    return response.data;
  },

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage regardless of API call success
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  },

  /**
   * Update user profile
   */
  async updateProfile(data: {
    full_name?: string;
    email?: string;
  }): Promise<User> {
    const response = await apiClient.put('/users/me', data);
    return response.data;
  },

  /**
   * Change password
   */
  async changePassword(data: {
    old_password: string;
    new_password: string;
  }): Promise<{ message: string }> {
    const response = await apiClient.post('/auth/change-password', data);
    return response.data;
  },

  /**
   * Get user capabilities based on profile completion
   */
  getUserCapabilities(user: User) {
    const capabilities = {
      canFileReports: true,
      canTrackReports: true,
      canUploadMedia: true,
      canAccessFullProfile: false,
      canSeeReputationScore: false,
      canValidateReports: false,
      canReceiveEmailNotifications: false,
      canAccessReportHistory: false,
    };

    if (user.profile_completion === 'basic' || user.profile_completion === 'complete') {
      capabilities.canAccessFullProfile = true;
      capabilities.canAccessReportHistory = true;
    }

    if (user.profile_completion === 'complete') {
      capabilities.canSeeReputationScore = true;
      capabilities.canValidateReports = (user.reputation_score || 0) >= 50;
      capabilities.canReceiveEmailNotifications = !!user.email;
    }

    return capabilities;
  },
};
