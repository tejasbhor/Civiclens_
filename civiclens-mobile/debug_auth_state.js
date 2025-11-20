/**
 * Debug Authentication State
 * Add this to your app temporarily to debug auth issues
 * 
 * Usage: Import and call debugAuthState() in your app
 */

export const debugAuthState = async () => {
  console.log('🔍 === DEBUGGING AUTHENTICATION STATE ===');
  
  try {
    // Import services
    const { SecureStorage } = await import('./src/shared/services/storage/secureStorage');
    const { useAuthStore } = await import('./src/store/authStore');
    const { validateToken } = await import('./src/shared/utils/authUtils');
    
    // Get stored data
    const accessToken = await SecureStorage.getAuthToken();
    const refreshToken = await SecureStorage.getRefreshToken();
    const userData = await SecureStorage.getUserData();
    
    // Get store state
    const authState = useAuthStore.getState();
    
    console.log('📱 STORED DATA:');
    console.log('  Access Token:', accessToken ? `${accessToken.substring(0, 30)}...` : '❌ MISSING');
    console.log('  Refresh Token:', refreshToken ? `${refreshToken.substring(0, 30)}...` : '❌ MISSING');
    console.log('  User Data:', userData ? '✅ Present' : '❌ MISSING');
    if (userData) {
      console.log('    User ID:', userData.id);
      console.log('    Role:', userData.role);
      console.log('    Phone:', userData.phone);
    }
    
    console.log('\n🏪 STORE STATE:');
    console.log('  Is Authenticated:', authState.isAuthenticated);
    console.log('  Is Loading:', authState.isLoading);
    console.log('  User:', authState.user ? '✅ Present' : '❌ MISSING');
    console.log('  Tokens:', authState.tokens ? '✅ Present' : '❌ MISSING');
    console.log('  Error:', authState.error || 'None');
    
    if (accessToken) {
      console.log('\n🔑 TOKEN VALIDATION:');
      const validation = validateToken(accessToken);
      console.log('  Is Valid:', validation.isValid ? '✅' : '❌');
      console.log('  Is Expired:', validation.isExpired ? '❌ EXPIRED' : '✅ Valid');
      
      if (validation.payload) {
        const expiryDate = new Date(validation.payload.exp * 1000);
        const now = new Date();
        console.log('  Expires At:', expiryDate.toISOString());
        console.log('  Current Time:', now.toISOString());
        console.log('  Time Until Expiry:', validation.isExpired ? 'EXPIRED' : `${Math.round((expiryDate - now) / 1000 / 60)} minutes`);
        console.log('  User ID in Token:', validation.payload.sub);
        console.log('  Role in Token:', validation.payload.role);
      }
    }
    
    console.log('\n🔧 RECOMMENDATIONS:');
    if (!accessToken && !refreshToken) {
      console.log('  ❌ No tokens found - User needs to login');
    } else if (accessToken && validateToken(accessToken).isExpired) {
      console.log('  ⚠️ Token expired - Should refresh or re-login');
    } else if (accessToken && !validateToken(accessToken).isValid) {
      console.log('  ❌ Invalid token format - Clear auth state');
    } else if (authState.isAuthenticated && !authState.user) {
      console.log('  ⚠️ Authenticated but no user data - Fetch user data');
    } else if (!authState.isAuthenticated && accessToken && validateToken(accessToken).isValid) {
      console.log('  ⚠️ Valid token but not authenticated - Initialize auth state');
    } else {
      console.log('  ✅ Auth state looks good');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
  
  console.log('🔍 === END DEBUG ===\n');
};

// Auto-run if this file is imported
// debugAuthState();
