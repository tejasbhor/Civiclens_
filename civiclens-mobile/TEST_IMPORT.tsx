// Simple test to verify imports work
import React from 'react';
import { View, Text, Button } from 'react-native';

console.log('=== TEST_IMPORT.tsx START ===');

// Test 1: Import ENV
import { ENV } from './src/shared/config/env';
console.log('TEST 1 - ENV:', ENV);
console.log('TEST 1 - ENV.API_BASE_URL:', ENV.API_BASE_URL);

// Test 2: Import apiClient
import { apiClient } from './src/shared/services/api/apiClient';
console.log('TEST 2 - apiClient:', apiClient);
console.log('TEST 2 - typeof apiClient.post:', typeof apiClient.post);

// Test 3: Import authApi
import { authApi } from './src/shared/services/api';
console.log('TEST 3 - authApi:', authApi);
console.log('TEST 3 - typeof authApi:', typeof authApi);
console.log('TEST 3 - typeof authApi.login:', typeof authApi?.login);
console.log('TEST 3 - typeof authApi.requestOTP:', typeof authApi?.requestOTP);
console.log('TEST 3 - authApi keys:', authApi ? Object.keys(authApi) : 'undefined');

console.log('=== TEST_IMPORT.tsx END ===');

export default function TestImport() {
  const testLogin = async () => {
    console.log('Testing login...');
    try {
      if (!authApi) {
        console.error('❌ authApi is undefined!');
        return;
      }
      if (typeof authApi.login !== 'function') {
        console.error('❌ authApi.login is not a function!', typeof authApi.login);
        return;
      }
      
      const result = await authApi.login('9876543210', 'password123', 'citizen');
      console.log('✅ Login successful:', result);
    } catch (error: any) {
      console.error('❌ Login failed:', error.message);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 20, marginBottom: 20 }}>Import Test</Text>
      <Text>Check console for import test results</Text>
      <Button title="Test Login" onPress={testLogin} />
    </View>
  );
}
