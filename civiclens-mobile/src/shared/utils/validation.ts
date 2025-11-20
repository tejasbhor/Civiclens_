// Validation utilities matching backend requirements

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate phone number
 * Must be 10 digits, cannot start with 0
 */
export function validatePhone(phone: string): ValidationResult {
  if (!phone) {
    return { isValid: false, error: 'Phone number is required' };
  }

  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length !== 10) {
    return { isValid: false, error: 'Phone number must be 10 digits' };
  }

  if (cleaned[0] === '0') {
    return { isValid: false, error: 'Phone number cannot start with 0' };
  }

  return { isValid: true };
}

/**
 * Validate OTP
 * Must be exactly 6 digits
 */
export function validateOTP(otp: string): ValidationResult {
  if (!otp) {
    return { isValid: false, error: 'OTP is required' };
  }

  const cleaned = otp.replace(/\D/g, '');

  if (cleaned.length !== 6) {
    return { isValid: false, error: 'OTP must be 6 digits' };
  }

  return { isValid: true };
}

/**
 * Validate password
 * Must be at least 8 characters, contain uppercase and digit
 */
export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }

  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters' };
  }

  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter' };
  }

  if (!/\d/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one digit' };
  }

  return { isValid: true };
}

/**
 * Validate full name
 * Must be at least 2 characters, max 255
 */
export function validateFullName(name: string): ValidationResult {
  if (!name) {
    return { isValid: false, error: 'Full name is required' };
  }

  const trimmed = name.trim();

  if (trimmed.length < 2) {
    return { isValid: false, error: 'Full name must be at least 2 characters' };
  }

  if (trimmed.length > 255) {
    return { isValid: false, error: 'Full name must not exceed 255 characters' };
  }

  return { isValid: true };
}

/**
 * Validate email (optional)
 */
export function validateEmail(email: string): ValidationResult {
  if (!email) {
    return { isValid: true }; // Email is optional
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Invalid email format' };
  }

  return { isValid: true };
}

/**
 * Format phone number for display
 * Example: 9876543210 -> +91 98765 43210
 */
export function formatPhoneDisplay(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return phone;
}

/**
 * Normalize phone number for API
 * Example: 9876543210 -> +919876543210
 */
export function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10 && cleaned[0] !== '0') {
    return `+91${cleaned}`;
  }
  throw new Error('Invalid phone number format');
}
