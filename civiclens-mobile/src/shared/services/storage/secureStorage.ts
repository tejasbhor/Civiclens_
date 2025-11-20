// Secure storage service using expo-secure-store
import * as SecureStore from 'expo-secure-store';

export class SecureStorage {
  /**
   * Store a value securely
   * Uses hardware-backed encryption when available
   */
  static async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED,
      });
    } catch (error) {
      console.error(`Error storing secure item ${key}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve a securely stored value
   */
  static async getItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error(`Error retrieving secure item ${key}:`, error);
      return null;
    }
  }

  /**
   * Delete a securely stored value
   */
  static async deleteItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error(`Error deleting secure item ${key}:`, error);
      throw error;
    }
  }

  /**
   * Check if a key exists
   */
  static async hasItem(key: string): Promise<boolean> {
    const value = await this.getItem(key);
    return value !== null;
  }

  // Convenience methods for common storage keys
  static async setAuthToken(token: string): Promise<void> {
    await this.setItem('auth_token', token);
  }

  static async getAuthToken(): Promise<string | null> {
    return await this.getItem('auth_token');
  }

  static async setRefreshToken(token: string): Promise<void> {
    await this.setItem('refresh_token', token);
  }

  static async getRefreshToken(): Promise<string | null> {
    return await this.getItem('refresh_token');
  }

  static async clearAuthTokens(): Promise<void> {
    await this.deleteItem('auth_token');
    await this.deleteItem('refresh_token');
  }

  static async setUserData(userData: any): Promise<void> {
    await this.setItem('user_data', JSON.stringify(userData));
  }

  static async getUserData<T>(): Promise<T | null> {
    const data = await this.getItem('user_data');
    return data ? JSON.parse(data) : null;
  }

  static async clearUserData(): Promise<void> {
    await this.deleteItem('user_data');
  }
}
