/**
 * User API Service
 * Handles all user-related API calls
 */

import { apiClient } from './apiClient';

export interface UserStats {
  total_reports: number;
  resolved_reports: number;
  in_progress_reports: number;
  active_reports: number;
  avg_resolution_time_days?: number;
  reputation_score?: number;
  total_validations?: number;
  helpful_validations?: number;
  can_promote_to_contributor?: boolean;
  next_milestone?: string;
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

export const userApi = {
  /**
   * Get current user statistics
   */
  async getMyStats(): Promise<UserStats> {
    const response = await apiClient.get<UserStats>('/users/me/stats');
    return response;
  },

  /**
   * Update user profile
   */
  async updateProfile(data: UserProfileUpdate): Promise<any> {
    const response = await apiClient.put('/users/me/profile', data);
    return response;
  },

  /**
   * Get user preferences
   */
  async getPreferences(): Promise<UserPreferences> {
    const response = await apiClient.get<UserPreferences>('/users/me/preferences');
    return response;
  },

  /**
   * Update user preferences
   */
  async updatePreferences(prefs: UserPreferences): Promise<UserPreferences> {
    const response = await apiClient.put<UserPreferences>('/users/me/preferences', prefs);
    return response;
  },

  /**
   * Get verification status
   */
  async getVerificationStatus(): Promise<VerificationStatus> {
    const response = await apiClient.get<VerificationStatus>('/users/me/verification');
    return response;
  },

  /**
   * Send email verification
   */
  async sendEmailVerification(): Promise<{ message: string; debug_token?: string }> {
    const response = await apiClient.post<{ message: string; debug_token?: string }>(
      '/users/me/verification/email/send'
    );
    return response;
  },

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(
      '/users/me/verification/email/verify',
      { token }
    );
    return response;
  },

  /**
   * Send phone verification OTP
   */
  async sendPhoneVerification(): Promise<{ message: string; debug_otp?: string }> {
    const response = await apiClient.post<{ message: string; debug_otp?: string }>(
      '/users/me/verification/phone/send'
    );
    return response;
  },

  /**
   * Verify phone with OTP
   */
  async verifyPhone(otp: string): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(
      '/users/me/verification/phone/verify',
      { otp }
    );
    return response;
  },
};
