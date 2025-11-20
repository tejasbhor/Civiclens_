// User types matching backend
export enum UserRole {
  CITIZEN = 'citizen',
  CONTRIBUTOR = 'contributor',
  MODERATOR = 'moderator',
  NODAL_OFFICER = 'nodal_officer',
  AUDITOR = 'auditor',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

export interface User {
  id: number;
  phone: string;
  email?: string;
  full_name?: string;
  role: UserRole;
  phone_verified: boolean;
  email_verified: boolean;
  reputation_score: number;
  avatar_url?: string;
  preferred_language: string;
  primary_address?: string;
  bio?: string;
  created_at: string;
  updated_at?: string;
}

export interface UserProfileDetails extends User {
  total_reports?: number;
  total_validations?: number;
  helpful_validations?: number;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  user_id: number;
  role: UserRole;
}
