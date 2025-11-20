import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, ScrollView } from 'react-native';
import { ENV } from '@shared/config/env';
import { authApi } from '@shared/services/api/authApi';

export const TestAPIScreen = () => {
  const [apiStatus, setApiStatus] = useState('Testing...');
  const [authApiStatus, setAuthApiStatus] = useState('Not tested');
  const [loginTest, setLoginTest] = useState('Not tested');

  useEffect(() => {
    // Test ENV configuration
    console.log('API Base URL:', ENV.API_BASE_URL);
    console.log('GraphQL Endpoint:', ENV.GRAPHQL_ENDPOINT);
    console.log('Logging Enabled:', ENV.ENABLE_LOGGING);
    
    setApiStatus(`Connected to: ${ENV.API_BASE_URL}`);
  }, []);

  const testAuthApi = () => {
    try {
      console.log('authApi object:', authApi);
      console.log('authApi.login:', authApi.login);
      console.log('authApi.requestOTP:', authApi.requestOTP);
      
      if (authApi && typeof authApi.login === 'function') {
        setAuthApiStatus('✅ authApi is properly loaded');
      } else {
        setAuthApiStatus('❌ authApi.login is not a function');
      }
    } catch (error: any) {
      setAuthApiStatus(`❌ Error: ${error.message}`);
    }
  };

  const testLogin = async () => {
    try {
      setLoginTest('Testing login...');
      const response = await authApi.login('9876543210', 'password123', 'citizen');
      setLoginTest(`✅ Login successful! User ID: ${response.user_id}`);
    } catch (error: any) {
      setLoginTest(`❌ Login failed: ${error.message}`);
    }
  };

  const testOTP = async () => {
    try {
      setLoginTest('Testing OTP request...');
      const response = await authApi.requestOTP('+919876543210');
      setLoginTest(`✅ OTP sent! ${response.otp ? `OTP: ${response.otp}` : ''}`);
    } catch (error: any) {
      setLoginTest(`❌ OTP failed: ${error.message}`);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>API Diagnostics</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Environment Config</Text>
        <Text style={styles.text}>{apiStatus}</Text>
        <Text style={styles.text}>Logging: {ENV.ENABLE_LOGGING ? 'Enabled' : 'Disabled'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Auth API Status</Text>
        <Text style={styles.text}>{authApiStatus}</Text>
        <Button title="Test Auth API Object" onPress={testAuthApi} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>API Calls</Text>
        <Text style={styles.text}>{loginTest}</Text>
        <View style={styles.buttonRow}>
          <Button title="Test Login" onPress={testLogin} />
          <Button title="Test OTP" onPress={testOTP} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Instructions</Text>
        <Text style={styles.text}>
          1. Check if API Base URL is correct{'\n'}
          2. Test if authApi object is loaded{'\n'}
          3. Try actual API calls{'\n'}
          4. Check console logs for details
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 30,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  text: {
    fontSize: 14,
    marginBottom: 10,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
});
