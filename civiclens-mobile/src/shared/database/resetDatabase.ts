/**
 * Database Reset Utility
 * Use this during development when schema changes require a fresh database
 */

import * as SQLite from 'expo-sqlite';
import { DATABASE_NAME } from './schema';

export async function resetDatabase(): Promise<void> {
  try {
    console.log('🔄 Resetting database...');
    
    // Close existing database connection
    const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
    await db.closeAsync();
    
    // Delete the database file
    await SQLite.deleteDatabaseAsync(DATABASE_NAME);
    
    console.log('✅ Database reset successfully');
    console.log('ℹ️  App will reinitialize database on next startup');
  } catch (error) {
    console.error('❌ Failed to reset database:', error);
    throw error;
  }
}

// For development use - call this function to reset database
export async function devResetDatabase(): Promise<void> {
  if (__DEV__) {
    await resetDatabase();
  } else {
    console.warn('⚠️  Database reset is only available in development mode');
  }
}
