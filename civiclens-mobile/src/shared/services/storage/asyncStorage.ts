// AsyncStorage wrapper for user preferences
import AsyncStorage from '@react-native-async-storage/async-storage';

export class AppStorage {
  /**
   * Store a value
   */
  static async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error(`Error storing item ${key}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve a value
   */
  static async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error(`Error retrieving item ${key}:`, error);
      return null;
    }
  }

  /**
   * Delete a value
   */
  static async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing item ${key}:`, error);
      throw error;
    }
  }

  /**
   * Store an object as JSON
   */
  static async setObject(key: string, value: any): Promise<void> {
    await this.setItem(key, JSON.stringify(value));
  }

  /**
   * Retrieve an object from JSON
   */
  static async getObject<T>(key: string): Promise<T | null> {
    const value = await this.getItem(key);
    return value ? JSON.parse(value) : null;
  }

  /**
   * Clear all storage
   */
  static async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  }

  // Convenience methods for common preferences
  static async setLanguage(language: string): Promise<void> {
    await this.setItem('language', language);
  }

  static async getLanguage(): Promise<string | null> {
    return await this.getItem('language');
  }

  static async setOnboardingCompleted(completed: boolean): Promise<void> {
    await this.setItem('onboarding_completed', completed.toString());
  }

  static async isOnboardingCompleted(): Promise<boolean> {
    const value = await this.getItem('onboarding_completed');
    return value === 'true';
  }

  static async setTheme(theme: 'light' | 'dark'): Promise<void> {
    await this.setItem('theme', theme);
  }

  static async getTheme(): Promise<'light' | 'dark'> {
    const theme = await this.getItem('theme');
    return (theme as 'light' | 'dark') || 'light';
  }

  static async setNotificationSettings(settings: any): Promise<void> {
    await this.setObject('notification_settings', settings);
  }

  static async getNotificationSettings(): Promise<any> {
    return await this.getObject('notification_settings');
  }

  static async setLastSyncTime(timestamp: number): Promise<void> {
    await this.setItem('last_sync', timestamp.toString());
  }

  static async getLastSyncTime(): Promise<number | null> {
    const value = await this.getItem('last_sync');
    return value ? parseInt(value, 10) : null;
  }
}
