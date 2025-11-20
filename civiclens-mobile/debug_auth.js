/**
 * Debug Authentication Status
 * Run this in React Native debugger console to check auth status
 */

// Add this to your app temporarily to debug auth issues
export const debugAuth = async () => {
  const { SecureStorage } = require('./src/shared/services/storage/secureStorage');
  
  console.log('🔍 Debugging Authentication Status...');
  
  try {
    const token = await SecureStorage.getAuthToken();
    const refreshToken = await SecureStorage.getRefreshToken();
    const userData = await SecureStorage.getUserData();
    
    console.log('📋 Auth Debug Results:');
    console.log('  Access Token:', token ? `${token.substring(0, 30)}...` : 'MISSING');
    console.log('  Refresh Token:', refreshToken ? `${refreshToken.substring(0, 30)}...` : 'MISSING');
    console.log('  User Data:', userData ? JSON.stringify(userData, null, 2) : 'MISSING');
    
    if (!token) {
      console.log('❌ No access token found - user needs to login again');
    } else {
      // Try to decode JWT to check expiry
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const now = Date.now() / 1000;
        const isExpired = payload.exp < now;
        
        console.log('  Token Expiry:', new Date(payload.exp * 1000).toISOString());
        console.log('  Is Expired:', isExpired);
        console.log('  User ID:', payload.sub);
        console.log('  Role:', payload.role);
      } catch (e) {
        console.log('  Token Format:', 'Invalid JWT format');
      }
    }
    
  } catch (error) {
    console.error('❌ Auth debug failed:', error);
  }
};

// Call this function in your app
// debugAuth();
