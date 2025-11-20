# 🔍 Complete Diagnosis

## What We Know

### ✅ Backend is Working
- Running on `http://0.0.0.0:8000`
- Accessible at `http://192.168.1.34:8000`
- Test API call works:
  ```powershell
  Invoke-RestMethod -Uri "http://192.168.1.34:8000/api/v1/auth/request-otp" `
    -Method Post -ContentType "application/json" `
    -Body '{"phone": "+919876543210"}'
  # Returns: OTP sent successfully
  ```

### ✅ Mobile App Detects IP Correctly
From logs:
```
LOG  🔗 Auto-detected API host: 192.168.1.34
```

### ❌ The Problem
Error: "cannot read property 'login' of undefined"

This means `authApi` is `undefined`, not just the `login` method.

## Root Cause Analysis

### Theory 1: Module Loading Order Issue
The `authApi` module might not be loading before the component tries to use it.

**Evidence:**
- Web client works fine with same structure
- Mobile app has different module loading (React Native vs Web)

### Theory 2: Circular Dependency
There might be a circular dependency preventing `authApi` from being created.

**Check:**
- `authApi.ts` imports `apiClient`
- `apiClient.ts` imports `ENV`
- `ENV.ts` imports `Constants` from `expo-constants`

### Theory 3: TypeScript Path Alias Issue
The `@shared/services/api` path might not resolve correctly.

**Evidence:**
- We're using Babel module resolver
- TypeScript paths are configured
- But React Native might handle it differently

## Debugging Steps Added

### 1. Console Logs in authApi.ts
```typescript
console.log('🔍 authApi.ts is being loaded...');
console.log('✅ authApi instance created:', authApi);
console.log('✅ authApi.login:', typeof authApi.login);
```

### 2. Console Logs in apiClient.ts
```typescript
console.log('🔍 ApiClient constructor called');
console.log('🔍 ENV.API_BASE_URL:', ENV.API_BASE_URL);
```

### 3. Console Logs in CitizenLoginScreen.tsx
```typescript
console.log('🔍 CitizenLoginScreen loaded');
console.log('🔍 authApi in CitizenLoginScreen:', authApi);
```

## What to Check in Expo Logs

After restarting Expo, you should see this sequence:

```
1. 🔍 authApi.ts is being loaded...
2. 🔍 ApiClient constructor called
3. 🔍 ENV.API_BASE_URL: http://192.168.1.34:8000/api/v1
4. ✅ API Client initialized with base URL: http://192.168.1.34:8000/api/v1
5. ✅ authApi instance created: [Object object]
6. ✅ authApi.login: function
7. ✅ authApi.requestOTP: function
8. 🔍 CitizenLoginScreen loaded
9. 🔍 authApi in CitizenLoginScreen: [Object object]
```

**If you DON'T see this sequence, that's the problem!**

## Possible Solutions

### Solution 1: Use Direct Import Path
Instead of:
```typescript
import { authApi } from '@shared/services/api';
```

Try:
```typescript
import { authApi } from '../../shared/services/api/authApi';
```

### Solution 2: Lazy Load authApi
```typescript
const handleLogin = async () => {
  const { authApi } = await import('@shared/services/api');
  await authApi.login(phone, password);
};
```

### Solution 3: Create a Singleton Pattern
```typescript
// apiService.ts
class ApiService {
  private static instance: ApiService;
  public authApi: AuthApi;
  
  private constructor() {
    this.authApi = new AuthApi();
  }
  
  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }
}

export const apiService = ApiService.getInstance();
```

### Solution 4: Check Babel Config
Ensure `babel.config.js` has correct module resolution:
```javascript
module.exports = {
  presets: ['babel-preset-expo'],
  plugins: [
    ['module-resolver', {
      root: ['./src'],
      alias: {
        '@shared': './src/shared',
      },
    }],
  ],
};
```

## Next Steps

1. **Restart Expo with clear cache:**
   ```bash
   cd civiclens-mobile
   npm start -- --clear
   ```

2. **Check the console logs** - Look for the sequence above

3. **If authApi is undefined:**
   - The module isn't loading
   - Check for import errors
   - Try direct import path

4. **If authApi exists but login is undefined:**
   - The class isn't being instantiated correctly
   - Check the AuthApi class definition

5. **Test with TEST_IMPORT.tsx:**
   ```typescript
   // In App.tsx, temporarily replace with:
   import TestImport from './TEST_IMPORT';
   // ... in render:
   return <TestImport />;
   ```

## Web Client vs Mobile Client Comparison

### Web Client (WORKS)
```typescript
// authService.ts
export const authService = {
  async login(phone: string, password: string): Promise<AuthResponse> {
    const response = await apiClient.post('/auth/login', { phone, password });
    return response.data;
  },
};

// Usage
import { authService } from './services/authService';
await authService.login(phone, password);
```

### Mobile Client (NOT WORKING)
```typescript
// authApi.ts
class AuthApi {
  async login(phone: string, password: string): Promise<AuthTokens> {
    const response = await apiClient.post<AuthTokens>('/auth/login', {
      phone,
      password,
    });
    return response;
  }
}
export const authApi = new AuthApi();

// Usage
import { authApi } from '@shared/services/api';
await authApi.login(phone, password);
```

### Key Difference
- Web: Plain object with methods
- Mobile: Class instance

**Try converting mobile to plain object like web client!**

## Recommended Fix

Convert `authApi.ts` to match web client pattern:

```typescript
// authApi.ts
import { apiClient } from './apiClient';
import { AuthTokens, User } from '@shared/types/user';
import { SecureStorage } from '@shared/services/storage';

export const authApi = {
  async requestOTP(phone: string): Promise<OTPResponse> {
    try {
      const response = await apiClient.post<OTPResponse>('/auth/request-otp', {
        phone,
      });
      return response;
    } catch (error: any) {
      throw handleError(error);
    }
  },

  async login(phone: string, password: string): Promise<AuthTokens> {
    try {
      const response = await apiClient.post<AuthTokens>('/auth/login', {
        phone,
        password,
      });
      await storeAuthData(response);
      return response;
    } catch (error: any) {
      throw handleError(error);
    }
  },
  
  // ... other methods
};

// Helper functions
function handleError(error: any): Error {
  // ... error handling
}

async function storeAuthData(tokens: AuthTokens): Promise<void> {
  // ... store tokens
}
```

This eliminates the class instantiation issue!
