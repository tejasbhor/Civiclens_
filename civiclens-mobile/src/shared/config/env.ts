import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Environment = 'development' | 'staging' | 'production';

interface EnvConfig {
  API_BASE_URL: string;
  GRAPHQL_ENDPOINT: string;
  ENABLE_LOGGING: boolean;
  ENVIRONMENT: Environment;
}

// Storage key for custom server URL
const CUSTOM_SERVER_URL_KEY = '@civiclens_custom_server_url';

// Automatically detect the correct API URL based on environment
const getApiBaseUrl = (): string => {
  // In production, use the production API
  if (__DEV__ === false) {
    return 'https://your-production-api.com/api/v1';
  }

  // For development, auto-detect the correct URL
  const debuggerHost = Constants.expoConfig?.hostUri?.split(':')[0];
  
  if (debuggerHost) {
    // Expo Go automatically provides the correct IP
    console.log('🔗 Auto-detected API host:', debuggerHost);
    return `http://${debuggerHost}:8000/api/v1`;
  }

  // Fallback for different environments
  if (Platform.OS === 'android') {
    // Android emulator
    return 'http://10.0.2.2:8000/api/v1';
  } else {
    // iOS simulator or web
    return 'http://localhost:8000/api/v1';
  }
};

const devConfig: EnvConfig = {
  API_BASE_URL: getApiBaseUrl(),
  GRAPHQL_ENDPOINT: getApiBaseUrl().replace('/api/v1', '/graphql'),
  ENABLE_LOGGING: true,
  ENVIRONMENT: 'development',
};

const stagingConfig: EnvConfig = {
  API_BASE_URL: 'https://staging-api.civiclens.com/api',
  GRAPHQL_ENDPOINT: 'https://staging-api.civiclens.com/graphql',
  ENABLE_LOGGING: true,
  ENVIRONMENT: 'staging',
};

const prodConfig: EnvConfig = {
  // Use .local hostname for automatic network discovery (works on any WiFi)
  API_BASE_URL: 'http://JARVIS.local:8000/api/v1',
  GRAPHQL_ENDPOINT: 'http://JARVIS.local:8000/graphql',
  ENABLE_LOGGING: true, // Enable for testing
  ENVIRONMENT: 'production',
};

const getEnvConfig = (): EnvConfig => {
  const env = process.env.EXPO_PUBLIC_ENV || 'development';

  switch (env) {
    case 'staging':
      return stagingConfig;
    case 'production':
      return prodConfig;
    default:
      return devConfig;
  }
};

export const ENV = getEnvConfig();

// Helper functions to manage custom server URL
export const getCustomServerUrl = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(CUSTOM_SERVER_URL_KEY);
  } catch (error) {
    console.error('Failed to get custom server URL:', error);
    return null;
  }
};

export const setCustomServerUrl = async (url: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(CUSTOM_SERVER_URL_KEY, url);
  } catch (error) {
    console.error('Failed to set custom server URL:', error);
    throw error;
  }
};

export const clearCustomServerUrl = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(CUSTOM_SERVER_URL_KEY);
  } catch (error) {
    console.error('Failed to clear custom server URL:', error);
  }
};

export const getActiveApiUrl = async (): Promise<string> => {
  const customUrl = await getCustomServerUrl();
  return customUrl || ENV.API_BASE_URL;
};
