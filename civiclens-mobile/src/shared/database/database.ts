/**
 * Production-Ready Database Service
 * Handles SQLite database operations with proper error handling and state management
 */
import * as SQLite from 'expo-sqlite';
import { DATABASE_NAME, CREATE_TABLES, CREATE_INDEXES } from './schema';

type DatabaseState = 'uninitialized' | 'initializing' | 'ready' | 'error';

class Database {
  private db: SQLite.SQLiteDatabase | null = null;
  private state: DatabaseState = 'uninitialized';
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize database with proper state management
   * Ensures only one initialization happens even with concurrent calls
   */
  async init(): Promise<void> {
    // If already initialized or initializing, return existing promise
    if (this.state === 'ready') {
      return Promise.resolve();
    }
    
    if (this.state === 'initializing' && this.initPromise) {
      return this.initPromise;
    }

    // Mark as initializing and create init promise
    this.state = 'initializing';
    this.initPromise = this.performInit();
    
    return this.initPromise;
  }

  /**
   * Perform actual database initialization
   */
  private async performInit(): Promise<void> {
    try {
      if (__DEV__) {
        console.log('[Database] Initializing SQLite database...');
      }
      
      // Open database
      this.db = await SQLite.openDatabaseAsync(DATABASE_NAME);
      
      if (__DEV__) {
        console.log('[Database] Database opened:', DATABASE_NAME);
      }

      // Enable foreign keys for referential integrity
      await this.db.execAsync('PRAGMA foreign_keys = ON;');
      
      // Enable WAL mode for better concurrency
      await this.db.execAsync('PRAGMA journal_mode = WAL;');
      
      // Set synchronous mode for better performance
      await this.db.execAsync('PRAGMA synchronous = NORMAL;');

      // Create tables (with migration support)
      for (const [tableName, createStatement] of Object.entries(CREATE_TABLES)) {
        try {
          await this.db.execAsync(createStatement);
          if (__DEV__) {
            console.log(`[Database] Table ready: ${tableName}`);
          }
        } catch (error) {
          console.error(`[Database] Error creating table ${tableName}:`, error);
          // Continue with other tables - don't fail entire initialization
        }
      }

      // Create indexes
      for (const [indexName, createStatement] of Object.entries(CREATE_INDEXES)) {
        await this.db.execAsync(createStatement);
        if (__DEV__) {
          console.log(`[Database] Index ready: ${indexName}`);
        }
      }

      this.state = 'ready';
      
      if (__DEV__) {
        console.log('[Database] Initialized successfully');
      }
    } catch (error) {
      this.state = 'error';
      this.db = null;
      console.error('[Database] Initialization failed:', error);
      throw new Error(`Database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get database instance
   * Throws error if not initialized
   */
  getDatabase(): SQLite.SQLiteDatabase {
    if (this.state !== 'ready' || !this.db) {
      throw new Error(
        `Database not ready. Current state: ${this.state}. ` +
        'Ensure init() is called and completed before using database.'
      );
    }
    return this.db;
  }

  /**
   * Check if database is ready
   */
  isReady(): boolean {
    return this.state === 'ready' && this.db !== null;
  }

  /**
   * Get current database state
   */
  getState(): DatabaseState {
    return this.state;
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.db && this.state === 'ready') {
      try {
        await this.db.closeAsync();
        this.db = null;
        this.state = 'uninitialized';
        this.initPromise = null;
        
        if (__DEV__) {
          console.log('[Database] Connection closed');
        }
      } catch (error) {
        console.error('[Database] Error closing connection:', error);
        throw error;
      }
    }
  }

  /**
   * Execute SQL statement with parameters
   * @throws Error if database not ready
   */
  async runAsync(sql: string, params?: any[]): Promise<SQLite.SQLiteRunResult> {
    const db = this.getDatabase();
    try {
      return await db.runAsync(sql, params || []);
    } catch (error) {
      console.error('SQL Error:', { sql, params, error });
      throw error;
    }
  }

  /**
   * Get all rows matching query
   * @throws Error if database not ready
   */
  async getAllAsync<T>(sql: string, params?: any[]): Promise<T[]> {
    const db = this.getDatabase();
    try {
      return await db.getAllAsync<T>(sql, params || []);
    } catch (error) {
      console.error('SQL Error:', { sql, params, error });
      throw error;
    }
  }

  /**
   * Get first row matching query
   * @throws Error if database not ready
   */
  async getFirstAsync<T>(sql: string, params?: any[]): Promise<T | null> {
    const db = this.getDatabase();
    try {
      return await db.getFirstAsync<T>(sql, params || []);
    } catch (error) {
      console.error('SQL Error:', { sql, params, error });
      throw error;
    }
  }

  /**
   * Execute operations in a transaction
   * Automatically commits on success, rolls back on error
   */
  async transaction(callback: (tx: SQLite.SQLiteDatabase) => Promise<void>): Promise<void> {
    const db = this.getDatabase();
    try {
      await db.execAsync('BEGIN TRANSACTION;');
      await callback(db);
      await db.execAsync('COMMIT;');
    } catch (error) {
      try {
        await db.execAsync('ROLLBACK;');
      } catch (rollbackError) {
        console.error('[Database] Transaction rollback failed:', rollbackError);
      }
      throw error;
    }
  }

  /**
   * Clear all data from database (for testing/reset)
   * WARNING: This deletes all data!
   */
  async clearAllData(): Promise<void> {
    const db = this.getDatabase();
    try {
      await db.execAsync('DELETE FROM sync_queue;');
      await db.execAsync('DELETE FROM tasks;');
      await db.execAsync('DELETE FROM reports;');
      
      if (__DEV__) {
        console.log('[Database] All data cleared');
      }
    } catch (error) {
      console.error('[Database] Error clearing data:', error);
      throw error;
    }
  }
}

export const database = new Database();
