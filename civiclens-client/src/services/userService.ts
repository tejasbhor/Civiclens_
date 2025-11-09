import apiClient from './apiClient';

// Types matching backend
export interface UserStats {
  total_reports: number;
  resolved_reports: number;
  in_progress_reports: number;
  active_reports: number;
  avg_resolution_time_days?: number;
  reputation_score?: number;
  total_validations?: number;
  helpful_validations?: number;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  density: 'comfortable' | 'compact';
}

export interface VerificationStatus {
  email: {
    value: string | null;
    verified: boolean;
    last_sent_at: string | null;
  };
  phone: {
    value: string | null;
    verified: boolean;
    last_sent_at: string | null;
  };
}

export interface UserProfileUpdate {
  full_name?: string;
  email?: string;
  primary_address?: string;
  bio?: string;
}

export const userService = {
  /**
   * Get current user statistics
   */
  async getMyStats(): Promise<UserStats> {
    const response = await apiClient.get('/users/me/stats');
    return response.data;
  },

  /**
   * Update user profile
   */
  async updateProfile(data: UserProfileUpdate): Promise<any> {
    const response = await apiClient.put('/users/me/profile', data);
    return response.data;
  },

  /**
   * Get user preferences
   */
  async getPreferences(): Promise<UserPreferences> {
    const response = await apiClient.get('/users/me/preferences');
    return response.data;
  },

  /**
   * Update user preferences
   */
  async updatePreferences(prefs: UserPreferences): Promise<UserPreferences> {
    const response = await apiClient.put('/users/me/preferences', prefs);
    return response.data;
  },

  /**
   * Get verification status
   */
  async getVerificationStatus(): Promise<VerificationStatus> {
    const response = await apiClient.get('/users/me/verification');
    return response.data;
  },

  /**
   * Send email verification
   */
  async sendEmailVerification(): Promise<{ message: string; debug_token?: string }> {
    const response = await apiClient.post('/users/me/verification/email/send');
    return response.data;
  },

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<{ message: string }> {
    const response = await apiClient.post('/users/me/verification/email/verify', { token });
    return response.data;
  },

  /**
   * Send phone verification OTP
   */
  async sendPhoneVerification(): Promise<{ message: string; debug_otp?: string }> {
    const response = await apiClient.post('/users/me/verification/phone/send');
    return response.data;
  },

  /**
   * Verify phone with OTP
   */
  async verifyPhone(otp: string): Promise<{ message: string }> {
    const response = await apiClient.post('/users/me/verification/phone/verify', { otp });
    return response.data;
  },
};

export default userService;

