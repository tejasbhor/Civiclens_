// File storage service using expo-file-system (legacy API for SDK 54)
import * as FileSystem from 'expo-file-system/legacy';

export class FileStorage {
  // Base directories
  static readonly MEDIA_DIR = `${FileSystem.documentDirectory}media/`;
  static readonly REPORTS_DIR = `${FileStorage.MEDIA_DIR}reports/`;
  static readonly TASKS_DIR = `${FileStorage.MEDIA_DIR}tasks/`;
  static readonly TEMP_DIR = `${FileSystem.cacheDirectory}temp/`;

  /**
   * Initialize storage directories
   */
  static async init(): Promise<void> {
    try {
      await this.ensureDirectoryExists(this.MEDIA_DIR);
      await this.ensureDirectoryExists(this.REPORTS_DIR);
      await this.ensureDirectoryExists(this.TASKS_DIR);
      await this.ensureDirectoryExists(this.TEMP_DIR);
      console.log('✅ File storage initialized');
    } catch (error) {
      console.error('❌ File storage initialization failed:', error);
      throw error;
    }
  }

  /**
   * Ensure a directory exists, create if it doesn't
   */
  static async ensureDirectoryExists(directory: string): Promise<void> {
    const dirInfo = await FileSystem.getInfoAsync(directory);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    }
  }

  /**
   * Save a file
   */
  static async saveFile(uri: string, directory: string, filename: string): Promise<string> {
    await this.ensureDirectoryExists(directory);
    const destination = `${directory}${filename}`;
    
    try {
      await FileSystem.copyAsync({
        from: uri,
        to: destination,
      });
      return destination;
    } catch (error) {
      console.error('Error saving file:', error);
      throw error;
    }
  }

  /**
   * Read a file as base64
   */
  static async readFileAsBase64(uri: string): Promise<string> {
    try {
      return await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch (error) {
      console.error('Error reading file:', error);
      throw error;
    }
  }

  /**
   * Delete a file
   */
  static async deleteFile(uri: string): Promise<void> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(uri);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  /**
   * Get file info
   */
  static async getFileInfo(uri: string): Promise<FileSystem.FileInfo> {
    return await FileSystem.getInfoAsync(uri);
  }

  /**
   * Save report photo
   */
  static async saveReportPhoto(uri: string, reportId: string): Promise<string> {
    const filename = `report_${reportId}_${Date.now()}.jpg`;
    return await this.saveFile(uri, this.REPORTS_DIR, filename);
  }

  /**
   * Save task photo (before/after)
   */
  static async saveTaskPhoto(
    uri: string,
    taskId: string,
    type: 'before' | 'after'
  ): Promise<string> {
    const filename = `task_${taskId}_${type}_${Date.now()}.jpg`;
    return await this.saveFile(uri, this.TASKS_DIR, filename);
  }

  /**
   * Get directory size
   */
  static async getDirectorySize(directory: string): Promise<number> {
    try {
      const files = await FileSystem.readDirectoryAsync(directory);
      let totalSize = 0;

      for (const file of files) {
        const fileInfo = await FileSystem.getInfoAsync(`${directory}${file}`);
        if (fileInfo.exists && !fileInfo.isDirectory) {
          totalSize += fileInfo.size || 0;
        }
      }

      return totalSize;
    } catch (error) {
      console.error('Error calculating directory size:', error);
      return 0;
    }
  }

  /**
   * Clear old files (older than specified days)
   */
  static async clearOldFiles(directory: string, daysOld: number = 90): Promise<number> {
    try {
      const files = await FileSystem.readDirectoryAsync(directory);
      const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;
      let deletedCount = 0;

      for (const file of files) {
        const filePath = `${directory}${file}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);

        if (fileInfo.exists && fileInfo.modificationTime) {
          if (fileInfo.modificationTime * 1000 < cutoffTime) {
            await FileSystem.deleteAsync(filePath);
            deletedCount++;
          }
        }
      }

      console.log(`✅ Deleted ${deletedCount} old files from ${directory}`);
      return deletedCount;
    } catch (error) {
      console.error('Error clearing old files:', error);
      return 0;
    }
  }

  /**
   * Clear temp directory
   */
  static async clearTempDirectory(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.TEMP_DIR);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(this.TEMP_DIR, { idempotent: true });
        await this.ensureDirectoryExists(this.TEMP_DIR);
      }
      console.log('✅ Temp directory cleared');
    } catch (error) {
      console.error('Error clearing temp directory:', error);
    }
  }

  /**
   * Get storage usage statistics
   */
  static async getStorageStats(): Promise<{
    reportsSize: number;
    tasksSize: number;
    totalSize: number;
  }> {
    const reportsSize = await this.getDirectorySize(this.REPORTS_DIR);
    const tasksSize = await this.getDirectorySize(this.TASKS_DIR);

    return {
      reportsSize,
      tasksSize,
      totalSize: reportsSize + tasksSize,
    };
  }
}
