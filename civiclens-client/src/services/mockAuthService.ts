// Mock Authentication Service - Production Ready
// This matches the backend API specification and will be replaced with actual API calls

export type ProfileCompletionLevel = 'minimal' | 'basic' | 'complete';
export type AccountCreatedVia = 'otp' | 'password';

export interface User {
  id: string;
  phone: string;
  phoneVerified: boolean;
  
  // Optional Profile (Progressive)
  fullName?: string;
  email?: string;
  emailVerified: boolean;
  
  // Profile Completion
  profileCompletion: ProfileCompletionLevel;
  
  // Metadata
  accountCreatedVia: AccountCreatedVia;
  reputationScore: number;
  totalReports: number;
  isActive: boolean;
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
  token?: string;
  requiresPhoneVerification?: boolean;
  userId?: string;
  otp?: string; // Only in development/mock mode
  expiresInMinutes?: number;
}

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock database
const mockUsers: User[] = [];
const mockOTPs = new Map<string, { otp: string; expiresAt: number }>();
const mockPendingSignups = new Map<string, Omit<User, 'id' | 'phoneVerified'>>();

export const mockAuthService = {
  // Request OTP for phone number (Quick Login Path)
  async requestOTP(phone: string): Promise<AuthResponse> {
    await delay(800);
    
    // Validate phone format
    if (!phone || phone.length !== 10) {
      return {
        success: false,
        message: 'Invalid phone number format',
      };
    }
    
    // Generate mock OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
    mockOTPs.set(phone, { otp, expiresAt });
    
    // Log OTP for testing (in real app, this would be sent via SMS)
    console.log(`🔐 Mock OTP for ${phone}: ${otp} (expires in 5 minutes)`);
    
    return {
      success: true,
      message: `OTP sent to +91-${phone}. Check console for mock OTP.`,
      otp, // Only in mock/dev mode
      expiresInMinutes: 5,
    };
  },

  // Verify OTP and create MINIMAL account (Quick Login Path)
  async verifyOTPQuick(phone: string, otp: string): Promise<AuthResponse> {
    await delay(600);
    
    // DEVELOPMENT MODE: Accept any 6-digit OTP for easier testing
    if (otp.length !== 6) {
      return {
        success: false,
        message: 'Please enter a valid 6-digit OTP.',
      };
    }

    // Clear any stored OTP for this phone
    mockOTPs.delete(phone);

    // Check if user already exists
    let user = mockUsers.find(u => u.phone === phone);
    
    if (!user) {
      // Create new MINIMAL profile account
      user = {
        id: `user_${Date.now()}`,
        phone,
        phoneVerified: true,
        emailVerified: false,
        profileCompletion: 'minimal',
        accountCreatedVia: 'otp',
        reputationScore: 0,
        totalReports: 0,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      mockUsers.push(user);
      console.log(`✅ Created MINIMAL account for ${phone}`);
    } else {
      // Update existing user
      user.phoneVerified = true;
    }
    
    return {
      success: true,
      message: 'Login successful! You can now file reports.',
      user,
      token: `mock_token_${user.id}`,
    };
  },

  // Check if phone exists and account type
  async checkPhoneExists(phone: string): Promise<{ exists: boolean; hasPassword: boolean; profileLevel?: ProfileCompletionLevel }> {
    await delay(400);
    
    const user = mockUsers.find(u => u.phone === phone);
    return {
      exists: !!user,
      hasPassword: user?.accountCreatedVia === 'password',
      profileLevel: user?.profileCompletion,
    };
  },

  // Full Account Signup (Step 1: Create account, send OTP)
  async signupFullAccount(data: {
    phone: string;
    fullName: string;
    email?: string;
    password: string;
  }): Promise<AuthResponse> {
    await delay(800);
    
    // Validate password strength
    if (data.password.length < 8) {
      return {
        success: false,
        message: 'Password must be at least 8 characters long',
      };
    }
    
    // Check if phone already exists with a full account
    const existingUser = mockUsers.find(u => u.phone === data.phone);
    if (existingUser && existingUser.profileCompletion !== 'minimal') {
      return {
        success: false,
        message: 'Phone number already registered. Please login instead.',
      };
    }
    
    // Check if email already exists
    if (data.email) {
      const emailExists = mockUsers.find(u => u.email === data.email);
      if (emailExists) {
        return {
          success: false,
          message: 'Email already registered. Please use a different email.',
        };
      }
    }
    
    // Store pending signup (will be completed after OTP verification)
    const userId = existingUser?.id || `user_${Date.now()}`;
    const pendingUser: Omit<User, 'id' | 'phoneVerified'> = {
      phone: data.phone,
      fullName: data.fullName,
      email: data.email,
      emailVerified: false,
      profileCompletion: data.email ? 'complete' : 'basic',
      accountCreatedVia: 'password',
      reputationScore: 0,
      totalReports: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    
    mockPendingSignups.set(data.phone, pendingUser);
    
    // Generate OTP for phone verification
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
    mockOTPs.set(data.phone, { otp, expiresAt });
    
    console.log(`🔐 Mock OTP for signup ${data.phone}: ${otp}`);
    console.log(`📝 Pending signup stored for ${data.phone} with profile level: ${pendingUser.profileCompletion}`);
    
    return {
      success: true,
      message: 'Account created! Please verify your phone number to continue.',
      requiresPhoneVerification: true,
      userId,
      otp, // Only in mock/dev mode
      expiresInMinutes: 5,
    };
  },

  // Verify Phone After Signup (Step 2: Complete registration)
  async verifyPhoneAfterSignup(phone: string, otp: string): Promise<AuthResponse> {
    await delay(600);
    
    const pendingUser = mockPendingSignups.get(phone);
    
    // Check if pending signup exists
    if (!pendingUser) {
      return {
        success: false,
        message: 'No pending signup found. Please sign up first.',
      };
    }
    
    // DEVELOPMENT MODE: Accept any 6-digit OTP
    if (otp.length !== 6) {
      return {
        success: false,
        message: 'Please enter a valid 6-digit OTP.',
      };
    }
    
    // Check if user exists (might be upgrading from minimal)
    let user = mockUsers.find(u => u.phone === phone);
    
    if (user) {
      // Upgrade existing minimal account to full
      user.fullName = pendingUser.fullName;
      user.email = pendingUser.email;
      user.phoneVerified = true;
      user.profileCompletion = pendingUser.profileCompletion;
      user.accountCreatedVia = 'password';
      console.log(`⬆️ Upgraded account ${phone} from minimal to ${user.profileCompletion}`);
    } else {
      // Create new full account
      user = {
        id: `user_${Date.now()}`,
        ...pendingUser,
        phoneVerified: true,
      };
      mockUsers.push(user);
      console.log(`✅ Created ${user.profileCompletion.toUpperCase()} account for ${phone}`);
    }
    
    // Cleanup
    mockOTPs.delete(phone);
    mockPendingSignups.delete(phone);
    
    return {
      success: true,
      message: 'Phone verified successfully! Your account is now active.',
      user,
      token: `mock_token_${user.id}`,
    };
  },

  // Login with password (for full accounts only)
  async loginWithPassword(phone: string, password: string): Promise<AuthResponse> {
    await delay(800);
    
    const user = mockUsers.find(u => u.phone === phone);
    
    if (!user) {
      return {
        success: false,
        message: 'Account not found. Please register first.',
      };
    }
    
    // Check if account was created with password
    if (user.accountCreatedVia !== 'password') {
      return {
        success: false,
        message: 'This account was created with OTP. Please use "Quick Login" instead.',
      };
    }
    
    // Check if phone is verified
    if (!user.phoneVerified) {
      return {
        success: false,
        message: 'Please verify your phone number first.',
      };
    }

    // Mock password validation (in real app, this would be hashed and checked)
    if (password.length < 8) {
      return {
        success: false,
        message: 'Invalid phone number or password.',
      };
    }

    return {
      success: true,
      message: 'Login successful! Welcome back.',
      user,
      token: `mock_token_${user.id}`,
    };
  },

  // Get current user by token
  async getCurrentUser(token: string): Promise<User | null> {
    await delay(300);
    
    if (!token || !token.startsWith('mock_token_')) {
      return null;
    }
    
    const userId = token.replace('mock_token_', '');
    return mockUsers.find(u => u.id === userId && u.isActive) || null;
  },
  
  // Check user capabilities based on profile completion
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
    
    if (user.profileCompletion === 'basic' || user.profileCompletion === 'complete') {
      capabilities.canAccessFullProfile = true;
      capabilities.canAccessReportHistory = true;
    }
    
    if (user.profileCompletion === 'complete') {
      capabilities.canSeeReputationScore = true;
      capabilities.canValidateReports = user.reputationScore >= 50;
      capabilities.canReceiveEmailNotifications = !!user.email;
    }
    
    return capabilities;
  },
};
